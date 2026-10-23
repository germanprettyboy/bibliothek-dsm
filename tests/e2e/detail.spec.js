// Detail view with cover (ekz / Open Library mocked, never Google), placeholder, closing.
const fs = require("fs");
const path = require("path");
const { test, expect, PHONE, open, settled, swipeStages, data } = require("./helpers.js");

const { B } = data();
const WITH_ISBN = B.books.find(b => b.i && b.p && b.y && b.c && b.l && b.a);
const WITHOUT_ISBN = B.books.find(b => !b.i);
const row = (page, b) => page.locator("#list .row").filter({ has: page.locator(".t", { hasText: b.t }) }).first();

async function openBook(page, b) {
  await page.fill("#q", b.i ? b.i[0] : b.t);
  await row(page, b).click();
  await expect(page.locator("#detail")).toBeVisible();
}

test.describe("detail", () => {
  test("shows all details", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    await openBook(page, WITH_ISBN);
    const d = page.locator("#detail");
    await expect(d.locator("#d-title")).toHaveText(WITH_ISBN.t);
    await expect(d.locator("#d-by")).toHaveText(WITH_ISBN.a.join(", "));
    const dl = d.locator("#d-dl");
    await expect(dl.locator("dt")).toHaveText(["Verlag", "Jahr", "ISBN", "Kategorie", "Standort"]);
    await expect(dl).toContainText(WITH_ISBN.p);
    await expect(dl).toContainText(WITH_ISBN.y);
    await expect(dl).toContainText(WITH_ISBN.i[0]);
    await expect(dl).toContainText(WITH_ISBN.c);
    await expect(d.locator("#d-teaser")).toBeHidden();
  });

  test("without ISBN: designed placeholder with the title, no loading", async ({ page }) => {
    await open(page);
    await openBook(page, WITHOUT_ISBN);
    await expect(page.locator("#d-cover .ph b")).toHaveText(WITHOUT_ISBN.t);
    await expect(page.locator("#d-cover img")).toHaveCount(0);
    await expect(page.locator("#d-cover")).not.toHaveClass(/loading/);
    await expect(page.locator("#d-src")).toHaveText("");
  });

  for (const [how, act] of [
    ["close button", page => page.click("#detail .close")],
    ["Escape", page => page.keyboard.press("Escape")],
    ["click on the background", page => page.mouse.click(5, 5)],
  ]) {
    test("close: " + how, async ({ page }) => {
      await open(page);
      await openBook(page, WITHOUT_ISBN);
      await act(page);
      await expect(page.locator("#detail")).toBeHidden();
    });
  }

  test("glass effect: dialog and background blurred, background dimmed", async ({ page }) => {
    await open(page);
    await openBook(page, WITHOUT_ISBN);
    // measure the dialog and the scrim (overlay of the shadcn dialog) only after the fade-in animation
    await settled(page);
    const st = await page.locator("#detail").evaluate(d => {
      const a = getComputedStyle(d), b = getComputedStyle(document.querySelector(".scrim.detail"));
      return { dialog: a.backdropFilter, behind: b.backdropFilter, color: b.backgroundColor };
    });
    expect(st.dialog).toContain("blur");
    expect(st.behind).toContain("blur");
    expect(st.color).toMatch(/rgba\(.*, 0\.\d+\)/);
  });

  test("high contrast: no translucent surfaces", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("dsm-contrast", "high"));
    await open(page);
    await openBook(page, WITHOUT_ISBN);
    const bg = await page.locator("#detail").evaluate(d => getComputedStyle(d).backgroundColor);
    expect(bg).not.toMatch(/rgba\(.*, 0\.\d+\)/);
  });
});

test.describe("cover", () => {
  test("ekz first: image directly via the ISBN, source named", { tag: "@smoke" }, async ({ page, net }) => {
    net.ol = keys => ({ [keys[0]]: { thumbnail_url: "http://covers.openlibrary.org/b/id/123-S.jpg" } });
    net.image = url => url.includes("cover.ekz.de");
    await open(page);
    await openBook(page, WITH_ISBN);
    const img = page.locator("#d-cover img");
    await expect(img).toHaveAttribute("src", "https://cover.ekz.de/" + WITH_ISBN.i[0] + ".jpg");
    await expect(img).toHaveClass(/in/);
    await expect(page.locator("#d-src")).toHaveText("Cover: ekz-Bibliotheksservice");
  });

  // instead of a 404 ekz often returns "leider kein aktuelles Bild vorhanden" (170×270, HTTP 200) – never show it
  const substitute = page => page.route(/cover\.ekz\.de/, route => route.fulfill({
    body: fs.readFileSync(path.join(__dirname, "..", "helpers", "ekz-placeholder.jpg")),
    contentType: "image/jpeg", headers: { "access-control-allow-origin": "*" },
  }));

  test('ekz substitute image "leider kein aktuelles Bild vorhanden": on to Open Library', async ({ page, net }) => {
    net.ol = keys => ({ [keys[0]]: { thumbnail_url: "http://covers.openlibrary.org/b/id/123-S.jpg" } });
    await substitute(page);
    await open(page);
    await openBook(page, WITH_ISBN);
    const img = page.locator("#d-cover img");
    await expect(img).toHaveAttribute("src", "https://covers.openlibrary.org/b/id/123-M.jpg");
    await expect(page.locator("#d-src")).toHaveText("Cover: Open Library");
  });

  test("ekz substitute image without another source: designed placeholder", async ({ page, net }) => {
    net.ol = () => ({});
    await substitute(page);
    await open(page);
    await openBook(page, WITH_ISBN);
    await expect(page.locator("#d-cover .ph")).toHaveCount(1);
    await expect.poll(() => page.evaluate(k => (JSON.parse(localStorage.getItem("dsm-cover-v3") || "{}")[k] || {}).u, WITH_ISBN.i.join(","))).toBe("");
    await expect(page.locator("#d-cover img")).toHaveCount(0);
    await expect(page.locator("#d-src")).toBeHidden();
  });

  test("Open Library: batch request, size M, source named, never /b/isbn/", async ({ page, net }) => {
    net.ol = keys => ({ [keys[0]]: { thumbnail_url: "http://covers.openlibrary.org/b/id/123-S.jpg" } });
    await open(page);
    await openBook(page, WITH_ISBN);
    const img = page.locator("#d-cover img");
    await expect(img).toHaveAttribute("src", "https://covers.openlibrary.org/b/id/123-M.jpg");
    await expect(img).toHaveClass(/in/);
    await expect(page.locator("#d-cover .ph")).toHaveCount(1); // the placeholder stays underneath
    await expect(page.locator("#d-src")).toHaveText("Cover: Open Library");
    expect(net.requests.some(u => u.includes("jscmd=viewapi"))).toBe(true);
    expect(net.requests.filter(u => u.includes("/b/isbn/"))).toEqual([]);
  });

  test("tap the cover: large in its own dialog, size L reloaded, back via tap/Escape", { tag: "@smoke" }, async ({ page, net }) => {
    net.ol = keys => ({ [keys[0]]: { thumbnail_url: "http://covers.openlibrary.org/b/id/123-S.jpg" } });
    await open(page);
    await openBook(page, WITH_ISBN);
    const box = page.locator("#d-cover"), zoom = page.locator("#zoom");
    await expect(box).toHaveClass(/zoomable/);
    await expect(box).toHaveAttribute("aria-label", "Cover vergrößern");
    await box.click();
    await expect(zoom).toBeVisible();
    await expect(box).toHaveClass(/lifted/);
    await expect(zoom.locator("img")).toHaveAttribute("src", "https://covers.openlibrary.org/b/id/123-L.jpg");
    const small = (await box.boundingBox()).width;
    await expect.poll(async () => (await zoom.locator("img").boundingBox()).width).toBeGreaterThan(small * 1.5);
    expect(net.requests.filter(u => u.includes("/b/isbn/"))).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(zoom).toBeHidden();
    await expect(box).not.toHaveClass(/lifted/);
    await expect(page.locator("#detail")).toBeVisible(); // the detail stays open
    await box.focus();
    await page.keyboard.press("Enter");
    await expect(zoom).toBeVisible();
    await zoom.click();
    await expect(zoom).toBeHidden();
  });

  test("a placeholder can't be enlarged", async ({ page }) => {
    await open(page);
    await openBook(page, WITHOUT_ISBN);
    const box = page.locator("#d-cover");
    await expect(box).not.toHaveClass(/zoomable/);
    await box.click();
    await expect(page.locator("#zoom")).toBeHidden();
  });

  test("a tap the moment the cover becomes enlargeable shows the large cover (never an empty one)", async ({ page, net }) => {
    net.ol = keys => ({ [keys[0]]: { thumbnail_url: "http://covers.openlibrary.org/b/id/123-S.jpg" } });
    await open(page);
    // click in the very task that makes the cover enlargeable (before it got "in" from the next frame)
    await page.evaluate(() => {
      const mo = new MutationObserver(() => {
        const c = document.querySelector("#d-cover.zoomable");
        if (c) { mo.disconnect(); c.click(); }
      });
      mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    });
    await openBook(page, WITH_ISBN);
    await expect(page.locator("#zoom img")).toHaveAttribute("src", /123-(M|L)\.jpg$/);
    await settled(page);
    const r = await page.locator("#zoom img").boundingBox();
    expect(r.width).toBeGreaterThan(200);
    expect(Math.abs(r.x + r.width / 2 - 640)).toBeLessThan(2);
  });

  test("pinch zoom: the large cover lands in the middle of the visible section", async ({ page, net, browserName }) => {
    test.skip(browserName !== "chromium", "pinch gesture via CDP");
    net.ol = keys => ({ [keys[0]]: { thumbnail_url: "http://covers.openlibrary.org/b/id/123-S.jpg" } });
    await open(page);
    await page.fill("#q", WITH_ISBN.i[0]);
    // zoomed in 2× (trackpad / two fingers), looking at the left part of the page
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.synthesizePinchGesture", { x: 100, y: 250, scaleFactor: 2, gestureSourceType: "mouse" });
    await expect.poll(() => page.evaluate(() => visualViewport.scale)).toBeGreaterThan(1.5);
    // clicks by script: the elements may lie outside the zoomed section
    await row(page, WITH_ISBN).evaluate(e => e.click());
    await page.locator("#d-cover.zoomable").evaluate(e => e.click());
    await expect(page.locator("#zoom img")).toHaveAttribute("src", /123-L\.jpg$/);
    await settled(page);
    const r = await page.locator("#zoom img").evaluate(e => {
      const a = e.getBoundingClientRect(), v = visualViewport;
      return { x: a.left + a.width / 2 - (v.offsetLeft + v.width / 2), y: a.top + a.height / 2 - (v.offsetTop + v.height / 2),
        inside: a.left >= v.offsetLeft && a.top >= v.offsetTop && a.right <= v.offsetLeft + v.width && a.bottom <= v.offsetTop + v.height };
    });
    expect(Math.abs(r.x), JSON.stringify(r)).toBeLessThan(2);
    expect(Math.abs(r.y), JSON.stringify(r)).toBeLessThan(2);
    expect(r.inside, JSON.stringify(r)).toBe(true);
  });

  test("another book: the previous cover never appears in its detail", async ({ page, net }) => {
    net.ol = keys => ({ [keys[0]]: { thumbnail_url: "http://covers.openlibrary.org/b/id/123-S.jpg" } });
    await open(page);
    await openBook(page, WITH_ISBN);
    await expect(page.locator("#d-cover")).toHaveClass(/zoomable/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#detail")).toHaveCount(0);
    // every image ever hung into the new detail's cover, and whether it was offered for enlarging
    await page.evaluate(() => {
      window.__seen = [];
      const mo = new MutationObserver(() => {
        const c = document.querySelector("#d-cover");
        if (c && (c.querySelector("img") || c.classList.contains("zoomable"))) window.__seen.push(c.innerHTML.includes("<img") ? "img" : "zoomable");
      });
      mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    });
    await openBook(page, WITHOUT_ISBN);
    await expect(page.locator("#d-cover .ph b")).toHaveText(WITHOUT_ISBN.t);
    await settled(page);
    expect(await page.evaluate(() => window.__seen)).toEqual([]);
  });

  test("never Google: without ekz/Open Library the placeholder, no request to Google", async ({ page, net }) => {
    net.ol = () => ({});
    net.image = url => url.includes("books.google.com");
    await open(page);
    await openBook(page, WITH_ISBN);
    await expect(page.locator("#d-cover")).not.toHaveClass(/loading/, { timeout: 10000 });
    await expect(page.locator("#d-cover img")).toHaveCount(0);
    expect(net.requests.filter(u => u.includes("google"))).toEqual([]);
  });

  test("services not reachable: the placeholder stays, no errors", async ({ page }) => {
    await open(page);
    await openBook(page, WITH_ISBN);
    await expect(page.locator("#d-cover")).not.toHaveClass(/loading/, { timeout: 10000 });
    await expect(page.locator("#d-cover img")).toHaveCount(0);
    await expect(page.locator("#d-cover .ph b")).toHaveText(WITH_ISBN.t);
  });

  test("the cover is remembered in the browser (dsm-cover-v3)", async ({ page, net }) => {
    net.ol = keys => ({ [keys[0]]: { thumbnail_url: "https://covers.openlibrary.org/b/id/9-S.jpg" } });
    await open(page);
    await openBook(page, WITH_ISBN);
    await expect(page.locator("#d-cover img")).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("dsm-cover-v3"))).toContain("9-M.jpg");
  });

  test("background: books in view are requested in batches, not all of them", async ({ page, net }) => {
    net.ol = () => ({});
    await open(page);
    await page.waitForTimeout(3500);
    const ol = net.requests.filter(u => u.includes("api/books"));
    expect(ol.length).toBeGreaterThan(0);
    expect(ol.length).toBeLessThanOrEqual(3);
    for (const u of ol) expect(decodeURIComponent(u).match(/ISBN:\d{13}/g).length).toBeLessThanOrEqual(20);
    const ekz = net.requests.filter(u => u.includes("cover.ekz.de"));
    expect(ekz.length).toBeGreaterThan(0); // ekz before Open Library, only for books in view
    expect(ekz.length).toBeLessThan(40);
  });
});

test.describe("detail on the phone", () => {
  test.use({ ...PHONE });
  test("the dialog fits the width", async ({ page }) => {
    await open(page);
    await openBook(page, WITH_ISBN);
    const box = await page.locator("#detail").boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);
    expect(box.x).toBeGreaterThanOrEqual(0);
  });

  // Sheet half-high, up = as high as the content (or springs back), down = half, further down = close
  test("swiping: half, up = content-high, down = half, further down = closed", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    await openBook(page, WITH_ISBN);
    await swipeStages(page, page.locator("#detail"));
  });
});
