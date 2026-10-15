// Sprache DE/IT und Einstellungen (Theme, größere Schrift, hoher Kontrast)
const { test, expect, oeffnen, daten, treffer } = require("./hilfen.js");

const { B, K } = daten();

test.describe("Sprache", () => {
  test("Umschalten auf IT und zurück, Wahl bleibt nach Neuladen", async ({ page }) => {
    await oeffnen(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await page.click('.seg [data-lang="it"]');
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    await expect(page.locator("h1")).toHaveText("Biblioteca");
    await expect(page.locator("#q")).toHaveAttribute("placeholder", "Cerca titolo, autore o ISBN");
    await expect(page.locator("#meta")).toHaveText("In ordine alfabetico per titolo");
    await expect(page.locator('.seg [data-lang="it"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveTitle("Biblioteca – Scuola Germanica di Milano");
    await page.reload();
    await expect(page.locator("h1")).toHaveText("Biblioteca");
    await page.click('.seg [data-lang="de"]');
    await expect(page.locator("h1")).toHaveText("Bibliothek");
    expect(await page.evaluate(() => localStorage.getItem("dsm-lang"))).toBe("de");
  });

  test("IT: Trefferzahl im Singular", async ({ page }) => {
    const b = B.buecher.find(x => x.i && treffer(B.buecher, x.i[0]).length === 1);
    await oeffnen(page);
    await page.click('.seg [data-lang="it"]');
    await page.fill("#q", b.i[0]);
    await expect(page.locator("#meta")).toHaveText("1 risultato");
  });

  test("IT: Detail mit übersetzter Kategorie und Standort (Regal → scaffale, Brett → ripiano)", async ({ page }) => {
    const b = B.buecher.find(x => x.k && x.s && /Regal \d+ Brett \d+/.test(x.s[0]));
    await oeffnen(page);
    await page.click('.seg [data-lang="it"]');
    await page.fill("#q", b.i ? b.i[0] : b.t);
    await page.locator("#list .row").first().click();
    const dl = page.locator("#d-dl");
    await expect(dl.locator("dt")).toContainText(["Categoria", "Collocazione"]);
    await expect(dl).toContainText(K[b.k]);
    const [, r, br] = /Regal (\d+) Brett (\d+)/.exec(b.s[0]);
    await expect(dl).toContainText(`scaffale ${r}, ripiano ${br}`);
    // Sprachwechsel bei offenem Fenster (Knopf liegt hinter dem modalen Fenster, daher per Skript)
    await page.evaluate(() => document.querySelector('.seg [data-lang="de"]').click());
    await expect(dl.locator("dt")).toContainText(["Kategorie", "Standort"]);
    await expect(dl).toContainText(`Regal ${r} Brett ${br}`);
  });

  test.describe("italienischer Browser", () => {
    test.use({ locale: "it-IT" });
    test("ohne gespeicherte Wahl: Italienisch", async ({ page }) => {
      await oeffnen(page);
      await expect(page.locator("html")).toHaveAttribute("lang", "it");
      await expect(page.locator("h1")).toHaveText("Biblioteca");
    });
  });

  test("italienischer Text bleibt Anthrazit (kein Rot)", async ({ page }) => {
    await oeffnen(page);
    await page.click('.seg [data-lang="it"]');
    const farben = await page.evaluate(() => [...document.querySelectorAll("h1, #meta, #list .t, #list .a, .foot span")]
      .slice(0, 50).map(e => getComputedStyle(e).color));
    for (const c of new Set(farben)) expect(c).not.toBe("rgb(169, 58, 57)");
    expect(farben).toContain("rgb(51, 51, 51)");
  });
});

test.describe("Einstellungen", () => {
  const oeffneEinst = async page => { await page.click(".settings-btn"); await expect(page.locator("dialog.settings")).toBeVisible(); };

  test("Theme: Automatisch / Hell / Dunkel, gespeichert", async ({ page }) => {
    await oeffnen(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
    await oeffneEinst(page);
    await expect(page.locator('#s-theme [data-v="auto"]')).toHaveAttribute("aria-checked", "true");
    await page.click('#s-theme [data-v="dark"]');
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const dunkel = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.click('#s-theme [data-v="light"]');
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const hell = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(dunkel).not.toBe(hell);
    await page.click('#s-theme [data-v="dark"]');
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await oeffneEinst(page);
    await page.click('#s-theme [data-v="auto"]');
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
    expect(await page.evaluate(() => localStorage.getItem("dsm-theme"))).toBe("auto");
  });

  test("Standard folgt dem Gerät (dunkles System → dunkle Seite, dunkles Logo)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await oeffnen(page);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.emulateMedia({ colorScheme: "light" });
    const bg2 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe(bg2);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator(".logo-d")).toBeVisible();
    await expect(page.locator(".logo-l")).toBeHidden();
  });

  test("„Hell“ gewinnt gegen dunkles System", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => localStorage.setItem("dsm-theme", "light"));
    await oeffnen(page);
    await expect(page.locator(".logo-l")).toBeVisible();
  });

  test("größere Schrift", async ({ page }) => {
    await oeffnen(page);
    const vorher = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#list .t")).fontSize));
    await oeffneEinst(page);
    await page.locator("#s-font").check();
    await expect(page.locator("html")).toHaveAttribute("data-font", "large");
    const nachher = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#list .t")).fontSize));
    expect(nachher).toBeGreaterThan(vorher);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-font", "large");
  });

  test("hoher Kontrast", async ({ page }) => {
    await oeffnen(page);
    await oeffneEinst(page);
    await page.locator("#s-contrast").check();
    await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
    expect(await page.evaluate(() => localStorage.getItem("dsm-contrast"))).toBe("high");
    await page.locator("#s-contrast").uncheck();
    await expect(page.locator("html")).not.toHaveAttribute("data-contrast", /.*/);
  });

  test("Einstellungen auf Italienisch", async ({ page }) => {
    await oeffnen(page);
    await page.click('.seg [data-lang="it"]');
    await oeffneEinst(page);
    await expect(page.locator("#s-title")).toHaveText("Impostazioni");
    await expect(page.locator('#s-theme [data-v="dark"]')).toHaveText("Scuro");
  });

  test("Einstellungen ohne localStorage (privater Modus): Seite funktioniert", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new Error("gesperrt"); } });
    });
    await page.goto("index.html");
    await expect(page.locator("#list .row").first()).toBeVisible();
    await page.keyboard.press("Escape"); // ggf. Fragen-Fenster
    await page.click(".settings-btn");
    await page.click('#s-theme [data-v="dark"]');
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("reduzierte Bewegung", () => {
  test.use({ reducedMotion: "reduce" });
  test("Fenster schließt sofort", async ({ page }) => {
    await oeffnen(page);
    await page.click(".settings-btn");
    await page.keyboard.press("Escape");
    expect(await page.locator("dialog.settings").evaluate(d => d.open)).toBe(false);
  });
});
