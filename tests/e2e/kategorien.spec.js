// Filter nach Kategorie: Fenster mit Gruppen (Oberbegriff vor „ - “/„: “), Chip über der Liste, zusammen mit der Suche.
const { test, expect, oeffnen, daten, treffer, AUS } = require("./hilfen.js");

const { B, K } = daten();
const ober = k => (/^(.+?)(?: - |: )(.+)$/.exec(k) || [, k])[1];
const inGruppe = o => B.buecher.filter(b => b.k && ober(b.k) === o);
const inKat = k => B.buecher.filter(b => b.k === k);
const zahl = n => n.toLocaleString("de-DE");

async function waehlen(page, id) {
  await page.click("#k-btn");
  const fenster = page.getByRole("dialog");
  await expect(fenster).toBeVisible();
  await fenster.locator(`[data-kat="${id}"]`).click();
  await expect(fenster).toHaveCount(0);
}

test.describe("Kategorien", () => {
  test("Oberbegriff wählt die ganze Gruppe, Chip zeigt die Wahl, × hebt sie auf", async ({ page }) => {
    await oeffnen(page);
    const fantasy = inGruppe("Fantasy");
    expect(fantasy.length).toBeGreaterThan(inKat("Fantasy").length);
    await waehlen(page, "g:Fantasy");
    await expect(page.locator("#list .row")).toHaveCount(fantasy.length);
    await expect(page.locator("#meta")).toHaveText(`${zahl(fantasy.length)} Treffer`);
    await expect(page.locator(".k-chip")).toContainText("Fantasy");
    await expect(page.locator("#k-btn")).toHaveAttribute("aria-pressed", "true");
    await page.click("#k-weg");
    await expect(page.locator(".k-chip")).toHaveCount(0);
    await expect(page.locator("#list .row")).toHaveCount(B.buecher.length);
    await expect(page.locator("#meta")).toHaveText(`${zahl(B.buecher.length)} Bücher`);
  });

  test("Fenster: Anzahl je Eintrag, Unterkategorien eingerückt, gewählte markiert", async ({ page }) => {
    await oeffnen(page);
    await page.click("#k-btn");
    const f = page.getByRole("dialog");
    await expect(f.locator('[data-kat="alle"]')).toHaveAttribute("aria-pressed", "true");
    await expect(f.locator('[data-kat="alle"]')).toContainText(zahl(B.buecher.length));
    await expect(f.locator('[data-kat="g:Fantasy"]')).toContainText(String(inGruppe("Fantasy").length));
    const magie = f.locator('[data-kat="k:Fantasy - Magie"]');
    await expect(magie).toHaveClass(/unter/);
    await expect(magie.locator("span").first()).toHaveText("Magie");
    // Kategorie, die nur aus dem Oberbegriff besteht, heißt in der Gruppe „allgemein“
    await expect(f.locator('[data-kat="k:Fantasy"] span').first()).toHaveText("allgemein");
    await magie.click();
    await expect(page.locator("#list .row")).toHaveCount(inKat("Fantasy - Magie").length);
    await expect(page.locator(".k-chip")).toContainText("Fantasy - Magie");
    await page.click("#k-btn");
    await expect(page.getByRole("dialog").locator('[data-kat="k:Fantasy - Magie"]')).toHaveAttribute("aria-pressed", "true");
  });

  test("Suche im Fenster: Unterkategorie findet sich unter ihrem Oberbegriff, nichts → Hinweis", async ({ page }) => {
    await oeffnen(page);
    await page.click("#k-btn");
    const f = page.getByRole("dialog");
    await f.locator("#k-q").fill("magie");
    await expect(f.locator('[data-kat="g:Fantasy"]')).toBeVisible();
    await expect(f.locator('[data-kat="k:Fantasy - Magie"]')).toBeVisible();
    await expect(f.locator('[data-kat="k:Fantasy - Drachen"]')).toHaveCount(0);
    await expect(f.locator('[data-kat="alle"]')).toHaveCount(0);
    await f.locator("#k-q").fill("xqzw");
    await expect(f).toContainText("Keine Kategorie gefunden.");
    // Escape leert erst die Suche, schließt nicht
    await f.locator("#k-q").press("Escape");
    await expect(f.locator("#k-q")).toHaveValue("");
    await expect(f).toBeVisible();
  });

  test("zusammen mit der Suche; nichts gefunden → Hinweis auf die Kategorie", async ({ page }) => {
    await oeffnen(page);
    await waehlen(page, "g:Fantasy");
    await page.fill("#q", "drache");
    const erwartet = treffer(inGruppe("Fantasy"), "drache");
    expect(erwartet.length).toBeGreaterThan(0);
    await expect(page.locator("#list .row")).toHaveCount(erwartet.length);
    await page.fill("#q", "xqzwxqzw");
    await expect(page.locator("#list .empty")).toContainText("In dieser Kategorie nichts gefunden");
  });

  test("Buch aus der gefilterten Liste öffnet das richtige Detail", async ({ page }) => {
    await oeffnen(page);
    await waehlen(page, "g:Fantasy");
    const zeile = page.locator("#list .row").nth(2);
    const titel = await zeile.locator(".t").textContent();
    await zeile.click();
    await expect(page.locator("#d-title")).toHaveText(titel);
    await expect(page.getByRole("dialog")).toContainText(/Fantasy/);
  });

  test.describe("italienisch", () => {
    test.use({ speicher: { "dsm-empf": AUS, "dsm-lang": "it" } });
    test("Namen aus kategorien-it.js, auch für Oberbegriff und Unterkategorie", async ({ page }) => {
      await oeffnen(page);
      await page.click("#k-btn");
      const f = page.getByRole("dialog");
      await expect(f.getByRole("heading")).toHaveText("Categorie");
      expect(K["Abenteuer - Reise"]).toBe("Avventura – Viaggi");
      await expect(f.locator('[data-kat="g:Abenteuer"] span').first()).toHaveText("Avventura");
      await expect(f.locator('[data-kat="k:Abenteuer - Reise"] span').first()).toHaveText("Viaggi");
      await f.locator('[data-kat="k:Abenteuer - Reise"]').click();
      await expect(page.locator(".k-chip")).toContainText("Avventura – Viaggi");
    });
  });

  test.describe("Handy", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    test("Knopf neben der Suche ohne Text, kein waagrechtes Scrollen mit Chip", async ({ page }) => {
      await oeffnen(page);
      const knopf = await page.locator("#k-btn").boundingBox();
      const suche = await page.locator("#q").boundingBox();
      expect(Math.abs(knopf.y - suche.y)).toBeLessThan(1);
      expect(knopf.height).toBeGreaterThanOrEqual(44);
      expect(knopf.width).toBeGreaterThanOrEqual(44);
      await waehlen(page, "g:Historische Romane");
      await expect(page.locator(".k-chip")).toBeVisible();
      const breit = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(breit).toBeLessThanOrEqual(0);
    });
  });
});
