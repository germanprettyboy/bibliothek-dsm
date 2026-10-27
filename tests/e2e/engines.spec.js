/*
 * The basics in every browser engine: Chromium, Firefox, WebKit (≈ Safari) on the desktop and in an iPhone viewport
 * (projects in playwright.config.js). The other specs run in the three desktop engines, this one also as iPhone and file://.
 */
const path = require("path");
const { pathToFileURL } = require("url");
const base = require("@playwright/test");
const { test, expect, open, settled, data, TMP } = require("./helpers.js");
const { WEB } = require("../helpers/load.js");

const { B } = data();
// with a searchable title (the catalog also has titles like "/", which the search ignores)
const BOOK = B.books.find(b => b.i && b.a && b.p && /\p{L}{4}/u.test(b.t));
const row = (page, b) => page.locator("#list .row").filter({ has: page.locator(".t", { hasText: b.t }) }).first();

test.describe("every engine", () => {
  test("list, search, detail, Escape closes", async ({ page }) => {
    await open(page);
    await expect(page.locator("#list .row").first()).toBeVisible();
    await page.fill("#q", BOOK.i[0]);
    await expect(page.locator("#meta")).toHaveText(/Treffer$/);
    await row(page, BOOK).click();
    await expect(page.locator("#detail")).toBeVisible();
    await expect(page.locator("#d-title")).toHaveText(BOOK.t);
    await expect(page.locator("#d-by")).toHaveText(BOOK.a.join(", "));
    await page.keyboard.press("Escape");
    await expect(page.locator("#detail")).toHaveCount(0);
  });

  test("large cover: grows out of the small cover, stays centered when size L arrives", async ({ page, net }) => {
    // BOOK (2nd row) gets its cover in whichever request asks for it: answering only keys[0], a background batch of the
    // rows in view that came first (slow Firefox) marked it as without a cover before the click
    const bib = "ISBN:" + BOOK.i[0];
    net.ol = keys => (keys.includes(bib) ? { [bib]: { thumbnail_url: "http://covers.openlibrary.org/b/id/123-S.jpg" } } : {});
    await open(page);
    await page.fill("#q", BOOK.i[0]);
    await row(page, BOOK).click();
    const box = page.locator("#d-cover.zoomable");
    await expect(box).toBeVisible();
    await settled(page);
    // first frame of the flight as the engine draws it: the grow animation held at 0 for one measurement
    await page.evaluate(() => {
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (...args) {
        const a = animate.apply(this, args);
        if (this.matches("#zoom img") && !window.__start) {
          a.pause(); a.currentTime = 0;
          const r = this.getBoundingClientRect();
          window.__start = [r.left, r.top, r.width, r.height];
          a.play();
        }
        return a;
      };
    });
    const cover = await box.evaluate(e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
    await box.click();
    const img = page.locator("#zoom img");
    await expect(img).toHaveAttribute("src", /123-L\.jpg$/);
    await settled(page);
    const start = await page.evaluate(() => window.__start);
    start.forEach((v, n) => expect(Math.abs(v - cover[n]), `start ${start} on the cover ${cover}`).toBeLessThan(2));
    const end = await img.evaluate(e => {
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight };
    });
    expect(Math.abs(end.x - end.w / 2), `centered horizontally ${JSON.stringify(end)}`).toBeLessThan(2);
    expect(Math.abs(end.y - end.h / 2), `centered vertically ${JSON.stringify(end)}`).toBeLessThan(2);
    expect(end.l >= 0 && end.t >= 0 && end.r <= end.w && end.b <= end.h, `inside the window ${JSON.stringify(end)}`).toBe(true);
  });

  test("glass: sheet and scrim blurred", async ({ page }) => {
    await open(page);
    await page.locator("#list .row").nth(2).click();
    await expect(page.locator("#detail")).toBeVisible();
    const blur = sel => page.evaluate(s => {
      const st = getComputedStyle(document.querySelector(s));
      return st.backdropFilter || st.webkitBackdropFilter || "";
    }, sel);
    expect(await blur("#detail")).toContain("blur");
    expect(await blur(".scrim")).toContain("blur");
  });

  test("category filter", async ({ page }) => {
    await open(page);
    await page.click("#cat-btn");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-cat^="g:"]').first().click();
    await expect(page.locator("#meta")).toHaveText(/Treffer$/);
    expect(await page.locator("#list .row").count()).toBeLessThan(B.books.length);
    await page.click("#cat-clear");
    await expect(page.locator("#list .row")).toHaveCount(B.books.length);
  });

  test("settings: dark theme, saved", async ({ page }) => {
    await open(page);
    await page.click(".settings-btn");
    await expect(page.locator(".settings[role=dialog]")).toBeVisible();
    await page.click('#s-theme [data-v="dark"]');
    // switch finished (view transition over, `still` removed); then reload without waiting for "load":
    // after a view transition WebKit sometimes never fires it on the reloaded page
    await page.waitForFunction(() => document.documentElement.dataset.theme === "dark" &&
      ![...document.head.querySelectorAll("style")].some(s => s.textContent.includes("transition: none !important")));
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("admin page: unlocks (Web Crypto PBKDF2 + AES-GCM)", async ({ page, context }) => {
    await context.route("**/assets/admin.enc.js", r => r.fulfill({ path: path.join(TMP, "admin.enc.js"), contentType: "text/javascript" }));
    await page.goto("admin.html");
    await page.fill("#pw", "test-password");
    await page.click("#unlock");
    await expect(page.locator("#app")).toBeVisible({ timeout: 20000 });
  });
});

// Double-click on index.html: file://, classic scripts. Without the fixture (its localStorage setup), all network blocked.
base.test.describe("double-click (file://)", () => {
  base.test("the list loads, search works, no script errors", async ({ page, context }) => {
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await context.route(/^https?:/, r => r.abort());
    // questions of the first visit already answered (storage may be blocked on file:// – then they simply appear later)
    await page.addInitScript(() => { try { localStorage.setItem("dsm-recs", JSON.stringify({ want: false, group: null })); } catch (e) { /* */ } });
    await page.goto(pathToFileURL(path.join(WEB, "index.html")).href);
    await base.expect(page.locator("#list .row").first()).toBeVisible();
    await page.fill("#q", BOOK.t);
    await base.expect(page.locator("#meta")).toHaveText(/Treffer$/);
    base.expect(errors).toEqual([]);
  });
});
