/*
 * The basics in every browser engine: Chromium, Firefox, WebKit (≈ Safari) on the desktop and in an iPhone viewport
 * (projects in playwright.config.js). The other specs run only in Chromium: they use CDP (touch swiping, CPU throttling).
 */
const path = require("path");
const { pathToFileURL } = require("url");
const base = require("@playwright/test");
const { test, expect, open, data, TMP } = require("./helpers.js");
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
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
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
