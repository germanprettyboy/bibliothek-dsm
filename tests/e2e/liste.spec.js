// Bücherliste: Anzeige, Suche, A–Z-Leiste (ab 768 px), Buchstaben-Floater (darunter), Vorschau.
const { test, expect, oeffnen, daten, treffer } = require("./hilfen.js");

const { B } = daten();

test.describe("Liste", () => {
  test("zeigt alle Bücher als reinen Text (Titel + Autor), keine Bilder", async ({ page }) => {
    await oeffnen(page);
    await expect(page.locator("#list .row")).toHaveCount(B.buecher.length);
    await expect(page.locator("#list img")).toHaveCount(0);
    await expect(page.locator("#list .cover")).toHaveCount(0);
    await expect(page.locator("#meta")).toHaveText("Alphabetisch nach Titel");
    const erste = page.locator("#list .row").first();
    await expect(erste.locator(".t")).toHaveText(B.buecher[0].t);
    await expect(erste.locator(".a")).toHaveText(B.buecher[0].a.join(", "));
  });

  test("Buchstaben-Abschnitte mit Ankern", async ({ page }) => {
    await oeffnen(page);
    await expect(page.locator("#L-K")).toHaveAttribute("data-l", "K");
    const n = await page.locator("#list ul[data-l]").count();
    expect(n).toBeGreaterThan(20);
  });

  test("keine Ausleihinformation sichtbar", async ({ page }) => {
    await oeffnen(page);
    await expect(page.locator("body")).not.toContainText(/verliehen|ausgeliehen|verfügbar|vorgemerkt/i);
  });

  test("ohne books.js: verständliche Meldung statt leerer Seite", async ({ page }) => {
    await page.route("**/books.js", r => r.fulfill({ body: "", contentType: "text/javascript" }));
    await oeffnen(page);
    await expect(page.locator("#list .empty")).toContainText("books.js fehlt");
  });
});

test.describe("Suche", () => {
  const suche = async (page, q) => { await page.fill("#q", q); await expect(page.locator("#list")).toHaveClass(/live/); };

  test("Treffer nach Titel, Zählung und Markierung", async ({ page }) => {
    await oeffnen(page);
    await suche(page, "tschick");
    const n = treffer(B.buecher, "tschick").length;
    await expect(page.locator("#meta")).toHaveText(`${n} Treffer`);
    await expect(page.locator("#list .row")).toHaveCount(n);
    await expect(page.locator("#list mark").first()).toHaveText(/tschick/i);
  });

  test("Akzente und ß egal: „preussler“ findet Preußler", async ({ page }) => {
    await oeffnen(page);
    await suche(page, "krabat preussler");
    await expect(page.locator("#list .row .t").first()).toHaveText(/Krabat/);
    await suche(page, "Kästner");
    await expect(page.locator("#meta")).toHaveText(`${treffer(B.buecher, "kastner").length} Treffer`);
  });

  test("ISBN-Suche", async ({ page }) => {
    const b = B.buecher.find(x => x.i);
    await oeffnen(page);
    await suche(page, b.i[0]);
    await expect(page.locator("#list .row .t").first()).toHaveText(b.t);
  });

  test("mehrere Begriffe: alle müssen passen", async ({ page }) => {
    await oeffnen(page);
    await suche(page, "harry potter");
    const n = treffer(B.buecher, "harry potter").length;
    await expect(page.locator("#list .row")).toHaveCount(n);
  });

  test("nichts gefunden → Hinweis, A–Z-Buchstaben deaktiviert", async ({ page }) => {
    await oeffnen(page);
    await suche(page, "qqqxyzzz");
    await expect(page.locator("#list .empty strong")).toHaveText("Kein Buch gefunden");
    await expect(page.locator("#meta")).toHaveText("0 Treffer");
    await expect(page.locator('#index a[aria-disabled="false"]')).toHaveCount(0);
  });

  test("Löschen-Knopf und Escape setzen zurück", async ({ page }) => {
    // Zurück zur vollen Liste dauert in Chromium ~3 s: die Einblend-Animation .list.live > * über alle Zeilen
    // kostet Compositing-Zeit (Layerize). Bis das behoben ist, mehr Zeit geben.
    test.slow();
    await oeffnen(page);
    await expect(page.locator(".search .clear")).toBeHidden();
    await suche(page, "tschick");
    await expect(page.locator(".search .clear")).toBeVisible();
    await page.click(".search .clear");
    await expect(page.locator("#q")).toHaveValue("");
    await expect(page.locator("#list .row")).toHaveCount(B.buecher.length);
    await suche(page, "tschick");
    await page.locator("#q").press("Escape");
    await expect(page.locator("#meta")).toHaveText("Alphabetisch nach Titel");
  });

  test("HTML in der Suche wird nicht ausgeführt", async ({ page }) => {
    await oeffnen(page);
    await suche(page, "<img src=x onerror=alert(1)>");
    await expect(page.locator("#list img")).toHaveCount(0);
  });
});

test.describe("A–Z-Leiste (ab 768 px)", () => {
  test("Desktop: sichtbar, Sprung zu Buchstabe, aktueller Buchstabe markiert", async ({ page }) => {
    await oeffnen(page);
    await expect(page.locator("#index")).toBeVisible();
    await expect(page.locator("#index a")).toHaveCount(27);
    await page.click('#index a[data-l="M"]');
    await expect(page.locator('#index a[data-l="M"]')).toHaveClass(/on/);
    const top = await page.locator("#L-M").evaluate(el => el.getBoundingClientRect().top);
    const bar = await page.locator("#bar").evaluate(el => el.getBoundingClientRect().bottom);
    expect(Math.abs(top - bar)).toBeLessThan(60);
  });

  test("bei 768 px sichtbar, bei 767 px nicht", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await oeffnen(page);
    await expect(page.locator("#index")).toBeVisible();
    await page.setViewportSize({ width: 767, height: 900 });
    await expect(page.locator("#index")).toBeHidden();
  });

  test("Desktop: kein Floater beim Scrollen", async ({ page }) => {
    await oeffnen(page);
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(300);
    await expect(page.locator("#floater")).not.toHaveClass(/show/);
  });
});

test.describe("Handy (390 px)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("keine A–Z-Leiste, nur Suche", async ({ page }) => {
    await oeffnen(page);
    await expect(page.locator("#index")).toBeHidden();
    await expect(page.locator("#q")).toBeVisible();
  });

  test("Buchstaben-Floater nur beim Scrollen, verschwindet danach", async ({ page }) => {
    await oeffnen(page);
    await expect(page.locator("#floater")).not.toHaveClass(/show/);
    await page.evaluate(() => scrollTo({ top: document.getElementById("L-K").offsetTop, behavior: "instant" }));
    await expect(page.locator("#floater")).toHaveClass(/show/);
    await expect(page.locator("#floater")).toHaveText(/^[J-L]$/);
    await expect(page.locator("#floater")).not.toHaveClass(/show/, { timeout: 2500 });
  });

  test("kein waagrechtes Scrollen", async ({ page }) => {
    await oeffnen(page);
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(w).toBeLessThanOrEqual(390);
  });

  test("Suchleiste klebt oben", async ({ page }) => {
    await oeffnen(page);
    await page.evaluate(() => scrollTo({ top: 5000, behavior: "instant" }));
    await expect(page.locator("#bar")).toHaveClass(/stuck/);
    const top = await page.locator("#bar").evaluate(el => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(5);
  });
});

test.describe("Vorschau aus der Verwaltung", () => {
  const vorschau = { stand: "2026-01-01", anzahl: 2, buecher: [{ t: "Vorschau Eins", a: ["A B"] }, { t: "Vorschau Zwei" }] };
  test.use({ speicher: { "dsm-empf": JSON.stringify({ want: false, gruppe: null }), "dsm-vorschau": JSON.stringify(vorschau) } });

  test("index.html#vorschau zeigt neue Liste mit Hinweis", async ({ page }) => {
    await oeffnen(page, "index.html#vorschau");
    await expect(page.locator("#preview")).toBeVisible();
    await expect(page.locator("#list .row")).toHaveCount(2);
  });

  test("ohne #vorschau: veröffentlichte Liste", async ({ page }) => {
    await oeffnen(page);
    await expect(page.locator("#preview")).toBeHidden();
    await expect(page.locator("#list .row")).toHaveCount(B.buecher.length);
  });
});
