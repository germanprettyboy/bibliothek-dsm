/*
 * Slow connection: books.js is held back until the test releases it.
 * Meanwhile loading placeholders stand there (list, recommendations if chosen), the opening hours already appear.
 */
const { test, expect, OFF, data } = require("./helpers.js");

const { B, R } = data();
const ON = JSON.stringify({ want: true, group: "middle" });

// Serve the file (default books.js) only after release()
async function throttle(page, pattern = "**/books.js") {
  let release;
  const gate = new Promise(r => { release = r; });
  await page.route(pattern, async route => { await gate; await route.continue(); });
  return release;
}

test.describe("loading on a slow connection", () => {
  test.use({ storage: { "dsm-recs": OFF } });

  test("placeholder for the list, then the real list", async ({ page }) => {
    const release = await throttle(page);
    await page.goto("index.html", { waitUntil: "commit" });
    await expect(page.locator("#list .skel")).toBeVisible();
    await expect(page.locator("#list .skel-row")).toHaveCount(14);
    await expect(page.locator("main.books")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#meta .ld:visible")).toHaveText("Bücherliste wird geladen …");
    await expect(page.locator("#recs")).toBeHidden();
    // the search bar is ready already; texts from the HTML stay although the page script has already run
    await expect(page.locator("#q")).toBeVisible();
    await expect(page.locator("#q")).toHaveAttribute("placeholder", "Titel, Autor oder ISBN suchen");
    await expect(page.locator("h1")).toHaveText("Bibliothek");

    release();
    await page.waitForLoadState("load");
    await expect(page.locator("#list .row").first()).toBeVisible();
    await expect(page.locator("#list .skel")).toHaveCount(0);
    await expect(page.locator("main.books")).not.toHaveAttribute("aria-busy");
    await expect(page.locator("#meta")).toHaveText(`${B.books.length.toLocaleString("de-DE")} Bücher`);
  });

  test("after 6 s a note about the slow connection", async ({ page }) => {
    const release = await throttle(page);
    await page.goto("index.html", { waitUntil: "commit" });
    await expect(page.locator("#meta .ld:visible")).toHaveText("Bücherliste wird geladen …");
    // Fast-forward the CSS animations instead of waiting 6 s. Repeatedly: when React then replaces the static skeleton,
    // the animations of the new notes start from zero again.
    await expect(async () => {
      await page.evaluate(() => document.querySelectorAll("#meta .ld").forEach(el => el.getAnimations().forEach(a => { a.currentTime = 7000; })));
      await expect(page.locator("#meta .ld:visible")).toHaveText("Langsame Verbindung – die Liste lädt noch …", { timeout: 500 });
    }).toPass();
    release();
    await page.waitForLoadState("load");
    await expect(page.locator("#meta")).toHaveText(`${B.books.length.toLocaleString("de-DE")} Bücher`);
  });

  test.describe("Italian", () => {
    test.use({ storage: { "dsm-recs": OFF, "dsm-lang": "it" } });
    test("loading note in the chosen language", async ({ page }) => {
      const release = await throttle(page);
      await page.goto("index.html", { waitUntil: "commit" });
      await expect(page.locator("#meta .ld:visible")).toHaveText("Caricamento dell'elenco …");
      release();
      await page.waitForLoadState("load");
      await expect(page.locator("#meta")).toHaveText(`${B.books.length.toLocaleString("it-IT")} libri`);
    });
  });

  test.describe("with recommendations", () => {
    test.use({ storage: { "dsm-recs": ON } });
    test("placeholder in place of the recommendations, then the books", async ({ page }) => {
      const release = await throttle(page);
      await page.goto("index.html", { waitUntil: "commit" });
      await expect(page.locator("#recs .skel")).toBeVisible();
      await expect(page.locator("#recs .rec")).toHaveCount(4);
      release();
      await page.waitForLoadState("load");
      await expect(page.locator("#recs .skel")).toHaveCount(0);
      await expect(page.locator("#recs .rec .rt b")).toHaveText(R.groups.middle.map(r => r.t));
    });
  });

  test("opening hours appear before books.js is there", async ({ page }) => {
    const info = { updated: "2026-10-01", hours: { mon: [], tue: [], wed: [["08:00", "12:00"]], thu: [], fri: [], sat: [] }, notice: { de: "", it: "" }, closures: [] };
    await page.addInitScript(d => localStorage.setItem("dsm-preview-info", d), JSON.stringify(info));
    await page.clock.setFixedTime(new Date("2026-10-14T10:00:00+02:00"));
    const release = await throttle(page);
    await page.goto("index.html#preview", { waitUntil: "commit" });
    await expect(page.locator("#info .info-card")).toContainText("Jetzt geöffnet");
    await expect(page.locator("#list .skel")).toBeVisible();
    release();
    await page.waitForLoadState("load");
    await expect(page.locator("#list .row").first()).toBeVisible();
  });
});

test.describe("placeholders for logo, info card and admin page", () => {
  test.use({ storage: { "dsm-recs": OFF } });
  const opacity = l => l.evaluate(el => getComputedStyle(el).opacity);

  test("logo: surface with shimmer, the image fades in as soon as it has loaded", async ({ page }) => {
    const release = await throttle(page, "**/logo-light.webp");
    await page.goto("index.html", { waitUntil: "commit" });
    await expect(page.locator("#list .row").first()).toBeVisible();
    await expect(page.locator(".logo")).not.toHaveClass(/\bloaded\b/);
    expect(await opacity(page.locator(".logo-l"))).toBe("0");
    release();
    await expect(page.locator(".logo")).toHaveClass(/\bloaded\b/);
    await expect.poll(() => opacity(page.locator(".logo-l"))).toBe("1");
  });

  test("logo can't be loaded: the shimmer ends anyway", async ({ page }) => {
    await page.route("**/logo-light.webp", r => r.abort());
    await page.goto("index.html", { waitUntil: "commit" });
    await expect(page.locator(".logo")).toHaveClass(/\bloaded\b/);
  });

  test("logo on the admin page likewise", async ({ page }) => {
    const release = await throttle(page, "**/logo-light.webp");
    await page.goto("admin.html", { waitUntil: "commit" });
    await expect(page.locator("#pw")).toBeVisible();
    await expect(page.locator(".logo")).not.toHaveClass(/\bloaded\b/);
    release();
    await expect(page.locator(".logo")).toHaveClass(/\bloaded\b/);
  });

  test.describe("info card shown on the last visit", () => {
    test.use({ storage: { "dsm-recs": OFF, "dsm-info-card": "1" } });
    test("placeholder until the page decides; without a card it disappears and is forgotten", async ({ page }) => {
      const infoRelease = await throttle(page, "**/info.js");
      const booksRelease = await throttle(page);
      await page.goto("index.html", { waitUntil: "commit" });
      await expect(page.locator("#info .skel")).toBeVisible();
      infoRelease(); booksRelease();
      await page.waitForLoadState("load");
      await expect(page.locator("#info")).toBeHidden();
      expect(await page.evaluate(() => localStorage.getItem("dsm-info-card"))).toBe("0");
    });
  });

  test("the info card is remembered for the next visit", async ({ page }) => {
    const info = { updated: "2026-10-01", hours: { mon: [["08:00", "12:00"]], tue: [], wed: [["08:00", "12:00"]], thu: [], fri: [], sat: [] }, notice: { de: "", it: "" }, closures: [] };
    await page.route("**/info.js", r => r.fulfill({ body: "window.DSM_INFO = " + JSON.stringify(info) + ";", contentType: "text/javascript" }));
    await page.goto("index.html");
    await expect(page.locator("#info .info-card")).toBeVisible();
    await expect(page.locator("#info .skel")).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("dsm-info-card"))).toBe("1");
  });

  test("admin page: unlock only ready once the script has loaded", async ({ page }) => {
    const release = await throttle(page);
    await page.goto("admin.html", { waitUntil: "commit" });
    const button = page.locator("#unlock");
    await expect(button).toBeDisabled();
    await expect(button).toHaveClass(/busy/);
    await expect(button.locator(".spin")).toBeVisible();
    release();
    await expect(button).toBeEnabled({ timeout: 20000 });
    await expect(button).not.toHaveClass(/busy/);
    await expect(button.locator(".spin")).toBeHidden();
  });
});

test.describe("migration of the old German-named settings (until October 2026)", () => {
  test.use({ storage: { "dsm-empf": JSON.stringify({ want: true, gruppe: "oberstufe" }), "dsm-info-karte": "1", "dsm-protokoll": "aus" } });
  test("recommendation choice, info card flag and switched-off log are carried over", async ({ page }) => {
    const release = await throttle(page);
    await page.goto("index.html", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-recs", "");
    await expect(page.locator("#recs .skel")).toBeVisible();
    release();
    await page.waitForLoadState("load");
    await expect(page.locator("#recs .rec .rt b")).toHaveText(R.groups.upper.map(r => r.t));
    const ls = await page.evaluate(() => Object.fromEntries(["dsm-empf", "dsm-recs", "dsm-info-karte", "dsm-protokoll", "dsm-log"].map(k => [k, localStorage.getItem(k)])));
    expect(ls).toEqual({ "dsm-empf": null, "dsm-recs": JSON.stringify({ want: true, group: "upper" }), "dsm-info-karte": null, "dsm-protokoll": null, "dsm-log": "off" });
  });
});
