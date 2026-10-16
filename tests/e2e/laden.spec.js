/*
 * Langsame Verbindung: books.js wird zurückgehalten, bis der Test sie freigibt.
 * Solange stehen Lade-Platzhalter da (Liste, ggf. Empfehlungen), die Öffnungszeiten erscheinen schon.
 */
const { test, expect, AUS, daten } = require("./hilfen.js");

const { E } = daten;
const AN = JSON.stringify({ want: true, gruppe: "mittelstufe" });

// books.js erst nach freigeben() ausliefern
async function bremsen(page) {
  let frei;
  const tor = new Promise(r => { frei = r; });
  await page.route("**/books.js", async route => { await tor; await route.continue(); });
  return frei;
}

test.describe("Laden bei langsamer Verbindung", () => {
  test.use({ speicher: { "dsm-empf": AUS } });

  test("Platzhalter für die Liste, danach die echte Liste", async ({ page }) => {
    const freigeben = await bremsen(page);
    await page.goto("index.html", { waitUntil: "commit" });
    await expect(page.locator("#list .skel")).toBeVisible();
    await expect(page.locator("#list .skel-row")).toHaveCount(14);
    await expect(page.locator("main.books")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#meta .ld:visible")).toHaveText("Bücherliste wird geladen …");
    await expect(page.locator("#recs")).toBeHidden();
    // Suchleiste steht schon bereit
    await expect(page.locator("#q")).toBeVisible();

    freigeben();
    await expect(page.locator("#list .row").first()).toBeVisible();
    await expect(page.locator("#list .skel")).toHaveCount(0);
    await expect(page.locator("main.books")).not.toHaveAttribute("aria-busy");
    await expect(page.locator("#meta")).toHaveText("Alphabetisch nach Titel");
  });

  test("nach 6 s Hinweis auf langsame Verbindung", async ({ page }) => {
    const freigeben = await bremsen(page);
    await page.goto("index.html", { waitUntil: "commit" });
    await expect(page.locator("#meta .ld:visible")).toHaveText("Bücherliste wird geladen …");
    // CSS-Animationen vorspulen statt 6 s zu warten
    await page.evaluate(() => document.querySelectorAll("#meta .ld").forEach(el => el.getAnimations().forEach(a => { a.currentTime = 7000; })));
    await expect(page.locator("#meta .ld:visible")).toHaveText("Langsame Verbindung – die Liste lädt noch …");
    freigeben();
    await expect(page.locator("#meta")).toHaveText("Alphabetisch nach Titel");
  });

  test.describe("italienisch", () => {
    test.use({ speicher: { "dsm-empf": AUS, "dsm-lang": "it" } });
    test("Ladehinweis in der gewählten Sprache", async ({ page }) => {
      const freigeben = await bremsen(page);
      await page.goto("index.html", { waitUntil: "commit" });
      await expect(page.locator("#meta .ld:visible")).toHaveText("Caricamento dell'elenco …");
      freigeben();
      await expect(page.locator("#meta")).toHaveText("In ordine alfabetico per titolo");
    });
  });

  test.describe("mit Empfehlungen", () => {
    test.use({ speicher: { "dsm-empf": AN } });
    test("Platzhalter an der Stelle der Empfehlungen, dann die Bücher", async ({ page }) => {
      const freigeben = await bremsen(page);
      await page.goto("index.html", { waitUntil: "commit" });
      await expect(page.locator("#recs .skel")).toBeVisible();
      await expect(page.locator("#recs .rec")).toHaveCount(4);
      freigeben();
      await expect(page.locator("#recs .skel")).toHaveCount(0);
      await expect(page.locator("#recs .rec .rt b")).toHaveText(E.gruppen.mittelstufe.map(r => r.t));
    });
  });

  test("Öffnungszeiten erscheinen, bevor books.js da ist", async ({ page }) => {
    const info = { stand: "2026-10-01", zeiten: { mo: [], di: [], mi: [["08:00", "12:00"]], do: [], fr: [], sa: [] }, hinweis: { de: "", it: "" }, schliessungen: [] };
    await page.addInitScript(d => localStorage.setItem("dsm-vorschau-info", d), JSON.stringify(info));
    await page.clock.setFixedTime(new Date("2026-10-14T10:00:00+02:00"));
    const freigeben = await bremsen(page);
    await page.goto("index.html#vorschau", { waitUntil: "commit" });
    await expect(page.locator("#info .info-card")).toContainText("Jetzt geöffnet");
    await expect(page.locator("#list .skel")).toBeVisible();
    freigeben();
    await expect(page.locator("#list .row").first()).toBeVisible();
  });
});
