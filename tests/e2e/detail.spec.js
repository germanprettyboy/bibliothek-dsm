// Detail view with cover (Open Library / Google Books mocked), placeholder, closing.
const fs = require("fs");
const path = require("path");
const { test, expect, open, swipeStages, data } = require("./helpers.js");

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
  test("shows all details", async ({ page }) => {
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
    await page.waitForTimeout(300);
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
  test("ekz first: image directly via the ISBN, source named", async ({ page, net }) => {
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

  test("tap the cover: large in its own dialog, size L reloaded, back via tap/Escape", async ({ page, net }) => {
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

  test("fallback Google: image directly via the ISBN, no Google API", async ({ page, net }) => {
    net.ol = () => ({});
    net.image = url => url.includes("books.google.com");
    await open(page);
    await openBook(page, WITH_ISBN);
    await expect(page.locator("#d-cover img")).toHaveAttribute("src", "https://books.google.com/books/content?vid=ISBN" + WITH_ISBN.i[0] + "&printsec=frontcover&img=1&zoom=1");
    expect(net.requests.filter(u => u.includes("googleapis"))).toEqual([]);
    await expect(page.locator("#d-src")).toHaveText("Cover: Google Books");
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
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("the dialog fits the width", async ({ page }) => {
    await open(page);
    await openBook(page, WITH_ISBN);
    const box = await page.locator("#detail").boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);
    expect(box.x).toBeGreaterThanOrEqual(0);
  });

  // Sheet half-high, up = as high as the content (or springs back), down = half, further down = close
  test("swiping: half, up = content-high, down = half, further down = closed", async ({ page }) => {
    await open(page);
    await openBook(page, WITH_ISBN);
    await swipeStages(page, page.locator("#detail"));
  });
});
