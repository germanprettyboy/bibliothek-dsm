// Language DE/IT and settings (theme, larger text, high contrast)
const { test, expect, open, swipe, restingTop, data, hits } = require("./helpers.js");

const { B, C } = data();

test.describe("language", () => {
  test("switch to IT and back, the choice survives a reload", async ({ page }) => {
    await open(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await page.click('.seg [data-lang="it"]');
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    await expect(page.locator("h1")).toHaveText("Biblioteca");
    await expect(page.locator("#q")).toHaveAttribute("placeholder", "Cerca titolo, autore o ISBN");
    await expect(page.locator("#meta")).toHaveText(`${B.books.length.toLocaleString("it-IT")} libri`);
    await expect(page.locator('.seg [data-lang="it"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveTitle("Biblioteca – Scuola Germanica di Milano");
    await page.reload();
    await expect(page.locator("h1")).toHaveText("Biblioteca");
    await page.click('.seg [data-lang="de"]');
    await expect(page.locator("h1")).toHaveText("Bibliothek");
    expect(await page.evaluate(() => localStorage.getItem("dsm-lang"))).toBe("de");
  });

  test("IT: hit count in the singular", async ({ page }) => {
    const b = B.books.find(x => x.i && hits(B.books, x.i[0]).length === 1);
    await open(page);
    await page.click('.seg [data-lang="it"]');
    await page.fill("#q", b.i[0]);
    await expect(page.locator("#meta")).toHaveText("1 risultato");
  });

  test("IT: detail with translated category and location (Regal → scaffale, Brett → ripiano)", async ({ page }) => {
    const b = B.books.find(x => x.c && x.l && /Regal \d+ Brett \d+/.test(x.l[0]));
    await open(page);
    await page.click('.seg [data-lang="it"]');
    await page.fill("#q", b.i ? b.i[0] : b.t);
    await page.locator("#list .row").first().click();
    const dl = page.locator("#d-dl");
    await expect(dl.locator("dt")).toContainText(["Categoria", "Collocazione"]);
    await expect(dl).toContainText(C[b.c]);
    const [, r, br] = /Regal (\d+) Brett (\d+)/.exec(b.l[0]);
    await expect(dl).toContainText(`scaffale ${r}, ripiano ${br}`);
    // language switch with the dialog open (the button lies behind the modal dialog, hence via script)
    await page.evaluate(() => document.querySelector('.seg [data-lang="de"]').click());
    await expect(dl.locator("dt")).toContainText(["Kategorie", "Standort"]);
    await expect(dl).toContainText(`Regal ${r} Brett ${br}`);
  });

  test.describe("Italian browser", () => {
    test.use({ locale: "it-IT" });
    test("without a saved choice: Italian", async ({ page }) => {
      await open(page);
      await expect(page.locator("html")).toHaveAttribute("lang", "it");
      await expect(page.locator("h1")).toHaveText("Biblioteca");
    });
  });

  test("Italian text stays anthracite (no red)", async ({ page }) => {
    await open(page);
    await page.click('.seg [data-lang="it"]');
    const colors = await page.evaluate(() => [...document.querySelectorAll("h1, #meta, #list .t, #list .a")]
      .slice(0, 50).map(e => getComputedStyle(e).color));
    for (const c of new Set(colors)) expect(c).not.toBe("rgb(169, 58, 57)");
    expect(colors).toContain("rgb(51, 51, 51)");
  });
});

test.describe("settings", () => {
  const openSettings = async page => { await page.click(".settings-btn"); await expect(page.locator(".settings[role=dialog]")).toBeVisible(); };

  test("theme: automatic / light / dark, saved", async ({ page }) => {
    await open(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
    await openSettings(page);
    await expect(page.locator('#s-theme [data-v="auto"]')).toHaveAttribute("aria-checked", "true");
    await page.click('#s-theme [data-v="dark"]');
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.click('#s-theme [data-v="light"]');
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const light = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(dark).not.toBe(light);
    await page.click('#s-theme [data-v="dark"]');
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await openSettings(page);
    await page.click('#s-theme [data-v="auto"]');
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
    expect(await page.evaluate(() => localStorage.getItem("dsm-theme"))).toBe("auto");
  });

  test("the default follows the device (dark system → dark page, dark logo)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await open(page);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.emulateMedia({ colorScheme: "light" });
    const bg2 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe(bg2);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator(".logo-d")).toBeVisible();
    await expect(page.locator(".logo-l")).toBeHidden();
  });

  test("the device switching light/dark starts no component transitions (no patchy fade)", async ({ page }) => {
    await open(page);
    const running = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() =>
      r(document.getAnimations().filter(a => a instanceof CSSTransition).length))));
    await expect.poll(running).toBe(0); // logo fade-in after loading
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await running()).toBe(0);
    await page.emulateMedia({ colorScheme: "light" });
    expect(await running()).toBe(0);
    await expect.poll(() => page.evaluate(() => !!document.querySelector("head > style:last-child")?.textContent.includes("transition: none"))).toBe(false);
  });

  test('"light" wins against a dark system', async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => localStorage.setItem("dsm-theme", "light"));
    await open(page);
    await expect(page.locator(".logo-l")).toBeVisible();
  });

  test("larger text", async ({ page }) => {
    await open(page);
    const before = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#list .t")).fontSize));
    await openSettings(page);
    await page.locator("#s-font").check();
    await expect(page.locator("html")).toHaveAttribute("data-font", "large");
    const after = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#list .t")).fontSize));
    expect(after).toBeGreaterThan(before);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-font", "large");
  });

  test("high contrast", async ({ page }) => {
    await open(page);
    await openSettings(page);
    await page.locator("#s-contrast").check();
    await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
    expect(await page.evaluate(() => localStorage.getItem("dsm-contrast"))).toBe("high");
    await page.locator("#s-contrast").uncheck();
    await expect(page.locator("html")).not.toHaveAttribute("data-contrast", /.*/);
  });

  test("settings in Italian", async ({ page }) => {
    await open(page);
    await page.click('.seg [data-lang="it"]');
    await openSettings(page);
    await expect(page.locator("#s-title")).toHaveText("Impostazioni");
    await expect(page.locator('#s-theme [data-v="dark"]')).toHaveText("Scuro");
  });

  test("settings without localStorage (private mode): the page works", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
    });
    await page.goto("index.html");
    await expect(page.locator("#list .row").first()).toBeVisible();
    await page.keyboard.press("Escape"); // questions dialog, if any
    await page.click(".settings-btn");
    await page.click('#s-theme [data-v="dark"]');
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("settings sheet on the phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("swiping: half, up = full screen, down = half, further down = closed", async ({ page }) => {
    await open(page);
    await page.click(".settings-btn");
    const sheet = page.locator(".settings[role=dialog]");
    const half = await restingTop(sheet);
    expect(half).toBeGreaterThan(100);
    await swipe(page, half + 20, 120);
    expect(await restingTop(sheet)).toBeLessThan(40);
    await swipe(page, 200, 500);
    expect(await restingTop(sheet)).toBeGreaterThan(100);
    await swipe(page, half + 20, 800);
    await expect(sheet).toBeHidden();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the dialog closes immediately", async ({ page }) => {
    await open(page);
    await page.click(".settings-btn");
    await page.keyboard.press("Escape");
    // without the fade-out animation the dialog (Radix Dialog) is out of the DOM immediately
    await expect(page.locator(".settings[role=dialog]")).toHaveCount(0, { timeout: 300 });
  });
});
