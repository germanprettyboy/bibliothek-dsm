/*
 * Langsame Verbindung: books.js wird zurückgehalten, bis der Test sie freigibt.
 * Solange stehen Lade-Platzhalter da (Liste, ggf. Empfehlungen), die Öffnungszeiten erscheinen schon.
 */
const { test, expect, AUS, daten } = require("./hilfen.js");

const { E } = daten();
const AN = JSON.stringify({ want: true, gruppe: "mittelstufe" });

// Datei (Standard books.js) erst nach freigeben() ausliefern
async function bremsen(page, muster = "**/books.js") {
  let frei;
  const tor = new Promise(r => { frei = r; });
  await page.route(muster, async route => { await tor; await route.continue(); });
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
    // Suchleiste steht schon bereit; Texte aus dem HTML bleiben stehen, obwohl info-panel.js schon lief
    await expect(page.locator("#q")).toBeVisible();
    await expect(page.locator("#q")).toHaveAttribute("placeholder", "Titel, Autor oder ISBN suchen");
    await expect(page.locator("h1")).toHaveText("Bibliothek");

    freigeben();
    await page.waitForLoadState("load");
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
    await page.waitForLoadState("load");
    await expect(page.locator("#meta")).toHaveText("Alphabetisch nach Titel");
  });

  test.describe("italienisch", () => {
    test.use({ speicher: { "dsm-empf": AUS, "dsm-lang": "it" } });
    test("Ladehinweis in der gewählten Sprache", async ({ page }) => {
      const freigeben = await bremsen(page);
      await page.goto("index.html", { waitUntil: "commit" });
      await expect(page.locator("#meta .ld:visible")).toHaveText("Caricamento dell'elenco …");
      freigeben();
      await page.waitForLoadState("load");
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
      await page.waitForLoadState("load");
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
    await page.waitForLoadState("load");
    await expect(page.locator("#list .row").first()).toBeVisible();
  });
});

test.describe("Platzhalter für Logo, Info-Karte und Verwaltung", () => {
  test.use({ speicher: { "dsm-empf": AUS } });
  const deckkraft = l => l.evaluate(el => getComputedStyle(el).opacity);

  test("Logo: Fläche mit Lichtband, Bild blendet ein, sobald es geladen ist", async ({ page }) => {
    const freigeben = await bremsen(page, "**/logo-hell.webp");
    await page.goto("index.html", { waitUntil: "commit" });
    await expect(page.locator("#list .row").first()).toBeVisible();
    await expect(page.locator(".logo")).not.toHaveClass(/\bda\b/);
    expect(await deckkraft(page.locator(".logo-l"))).toBe("0");
    freigeben();
    await expect(page.locator(".logo")).toHaveClass(/\bda\b/);
    await expect.poll(() => deckkraft(page.locator(".logo-l"))).toBe("1");
  });

  test("Logo nicht ladbar: Lichtband endet trotzdem", async ({ page }) => {
    await page.route("**/logo-hell.webp", r => r.abort());
    await page.goto("index.html", { waitUntil: "commit" });
    await expect(page.locator(".logo")).toHaveClass(/\bda\b/);
  });

  test("Logo in der Verwaltung ebenso", async ({ page }) => {
    const freigeben = await bremsen(page, "**/logo-hell.webp");
    await page.goto("admin.html", { waitUntil: "commit" });
    await expect(page.locator("#pw")).toBeVisible();
    await expect(page.locator(".logo")).not.toHaveClass(/\bda\b/);
    freigeben();
    await expect(page.locator(".logo")).toHaveClass(/\bda\b/);
  });

  test.describe("Info-Karte beim letzten Besuch gezeigt", () => {
    test.use({ speicher: { "dsm-empf": AUS, "dsm-info-karte": "1" } });
    test("Platzhalter, bis info-panel.js entscheidet; ohne Karte verschwindet er und wird vergessen", async ({ page }) => {
      const infoFrei = await bremsen(page, "**/info.js");
      const booksFrei = await bremsen(page);
      await page.goto("index.html", { waitUntil: "commit" });
      await expect(page.locator("#info .skel")).toBeVisible();
      infoFrei(); booksFrei();
      await page.waitForLoadState("load");
      await expect(page.locator("#info")).toBeHidden();
      expect(await page.evaluate(() => localStorage.getItem("dsm-info-karte"))).toBe("0");
    });
  });

  test("Info-Karte wird für den nächsten Besuch gemerkt", async ({ page }) => {
    const info = { stand: "2026-10-01", zeiten: { mo: [["08:00", "12:00"]], di: [], mi: [["08:00", "12:00"]], do: [], fr: [], sa: [] }, hinweis: { de: "", it: "" }, schliessungen: [] };
    await page.route("**/info.js", r => r.fulfill({ body: "window.DSM_INFO = " + JSON.stringify(info) + ";", contentType: "text/javascript" }));
    await page.goto("index.html");
    await expect(page.locator("#info .info-card")).toBeVisible();
    await expect(page.locator("#info .skel")).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("dsm-info-karte"))).toBe("1");
  });

  test("Verwaltung: Entsperren erst bereit, wenn das Skript geladen ist", async ({ page }) => {
    const freigeben = await bremsen(page);
    await page.goto("admin.html", { waitUntil: "commit" });
    const knopf = page.locator("#unlock");
    await expect(knopf).toBeDisabled();
    await expect(knopf).toHaveClass(/busy/);
    await expect(knopf.locator(".spin")).toBeVisible();
    freigeben();
    await expect(knopf).toBeEnabled({ timeout: 20000 });
    await expect(knopf).not.toHaveClass(/busy/);
    await expect(knopf.locator(".spin")).toBeHidden();
  });
});
