// Detailansicht mit Cover (Open Library / Google Books gemockt), Platzhalter, Schließen.
const fs = require("fs");
const path = require("path");
const { test, expect, oeffnen, daten } = require("./hilfen.js");

const { B } = daten();
const MIT_ISBN = B.buecher.find(b => b.i && b.v && b.j && b.k && b.s && b.a);
const OHNE_ISBN = B.buecher.find(b => !b.i);
const zeile = (page, b) => page.locator("#list .row").filter({ has: page.locator(".t", { hasText: b.t }) }).first();

async function oeffneBuch(page, b) {
  await page.fill("#q", b.i ? b.i[0] : b.t);
  await zeile(page, b).click();
  await expect(page.locator("#detail")).toBeVisible();
}

test.describe("Detail", () => {
  test("zeigt alle Angaben", async ({ page }) => {
    await oeffnen(page);
    await oeffneBuch(page, MIT_ISBN);
    const d = page.locator("#detail");
    await expect(d.locator("#d-title")).toHaveText(MIT_ISBN.t);
    await expect(d.locator("#d-by")).toHaveText(MIT_ISBN.a.join(", "));
    const dl = d.locator("#d-dl");
    await expect(dl.locator("dt")).toHaveText(["Verlag", "Jahr", "ISBN", "Kategorie", "Standort"]);
    await expect(dl).toContainText(MIT_ISBN.v);
    await expect(dl).toContainText(MIT_ISBN.j);
    await expect(dl).toContainText(MIT_ISBN.i[0]);
    await expect(dl).toContainText(MIT_ISBN.k);
    await expect(d.locator("#d-teaser")).toBeHidden();
  });

  test("ohne ISBN: gestalteter Platzhalter mit Titel, kein Laden", async ({ page }) => {
    await oeffnen(page);
    await oeffneBuch(page, OHNE_ISBN);
    await expect(page.locator("#d-cover .ph b")).toHaveText(OHNE_ISBN.t);
    await expect(page.locator("#d-cover img")).toHaveCount(0);
    await expect(page.locator("#d-cover")).not.toHaveClass(/loading/);
    await expect(page.locator("#d-src")).toHaveText("");
  });

  for (const [wie, tun] of [
    ["Schließen-Knopf", page => page.click("#detail .close")],
    ["Escape", page => page.keyboard.press("Escape")],
    ["Klick auf den Hintergrund", page => page.mouse.click(5, 5)],
  ]) {
    test("schließen: " + wie, async ({ page }) => {
      await oeffnen(page);
      await oeffneBuch(page, OHNE_ISBN);
      await tun(page);
      await expect(page.locator("#detail")).toBeHidden();
    });
  }

  test("Glas-Effekt: Fenster und Hintergrund unscharf, Hintergrund abgedunkelt", async ({ page }) => {
    await oeffnen(page);
    await oeffneBuch(page, OHNE_ISBN);
    // Fenster und Schleier (Overlay des shadcn-Dialogs) erst nach der Einblend-Animation messen
    await page.waitForTimeout(300);
    const st = await page.locator("#detail").evaluate(d => {
      const a = getComputedStyle(d), b = getComputedStyle(document.querySelector(".schleier.detail"));
      return { fenster: a.backdropFilter, hinten: b.backdropFilter, farbe: b.backgroundColor };
    });
    expect(st.fenster).toContain("blur");
    expect(st.hinten).toContain("blur");
    expect(st.farbe).toMatch(/rgba\(.*, 0\.\d+\)/);
  });

  test("hoher Kontrast: keine durchscheinenden Flächen", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("dsm-contrast", "high"));
    await oeffnen(page);
    await oeffneBuch(page, OHNE_ISBN);
    const bg = await page.locator("#detail").evaluate(d => getComputedStyle(d).backgroundColor);
    expect(bg).not.toMatch(/rgba\(.*, 0\.\d+\)/);
  });
});

test.describe("Cover", () => {
  test("ekz zuerst: Bild direkt über die ISBN, Quelle genannt", async ({ page, netz }) => {
    netz.ol = keys => ({ [keys[0]]: { thumbnail_url: "http://covers.openlibrary.org/b/id/123-S.jpg" } });
    netz.bild = url => url.includes("cover.ekz.de");
    await oeffnen(page);
    await oeffneBuch(page, MIT_ISBN);
    const img = page.locator("#d-cover img");
    await expect(img).toHaveAttribute("src", "https://cover.ekz.de/" + MIT_ISBN.i[0] + ".jpg");
    await expect(img).toHaveClass(/in/);
    await expect(page.locator("#d-src")).toHaveText("Cover: ekz-Bibliotheksservice");
  });

  // ekz liefert statt 404 oft „leider kein aktuelles Bild vorhanden“ (170×270, HTTP 200) – nie zeigen
  const ersatzbild = page => page.route(/cover\.ekz\.de/, route => route.fulfill({
    body: fs.readFileSync(path.join(__dirname, "..", "helfer", "ekz-ersatzbild.jpg")),
    contentType: "image/jpeg", headers: { "access-control-allow-origin": "*" },
  }));

  test("ekz-Ersatzbild „leider kein aktuelles Bild vorhanden“: weiter zu Open Library", async ({ page, netz }) => {
    netz.ol = keys => ({ [keys[0]]: { thumbnail_url: "http://covers.openlibrary.org/b/id/123-S.jpg" } });
    await ersatzbild(page);
    await oeffnen(page);
    await oeffneBuch(page, MIT_ISBN);
    const img = page.locator("#d-cover img");
    await expect(img).toHaveAttribute("src", "https://covers.openlibrary.org/b/id/123-M.jpg");
    await expect(page.locator("#d-src")).toHaveText("Cover: Open Library");
  });

  test("ekz-Ersatzbild ohne andere Quelle: gestalteter Platzhalter", async ({ page, netz }) => {
    netz.ol = () => ({});
    await ersatzbild(page);
    await oeffnen(page);
    await oeffneBuch(page, MIT_ISBN);
    await expect(page.locator("#d-cover .ph")).toHaveCount(1);
    await expect.poll(() => page.evaluate(k => (JSON.parse(localStorage.getItem("dsm-cover-v3") || "{}")[k] || {}).u, MIT_ISBN.i.join(","))).toBe("");
    await expect(page.locator("#d-cover img")).toHaveCount(0);
    await expect(page.locator("#d-src")).toBeHidden();
  });

  test("Open Library: Sammelabfrage, Größe M, Quelle genannt, nie /b/isbn/", async ({ page, netz }) => {
    netz.ol = keys => ({ [keys[0]]: { thumbnail_url: "http://covers.openlibrary.org/b/id/123-S.jpg" } });
    await oeffnen(page);
    await oeffneBuch(page, MIT_ISBN);
    const img = page.locator("#d-cover img");
    await expect(img).toHaveAttribute("src", "https://covers.openlibrary.org/b/id/123-M.jpg");
    await expect(img).toHaveClass(/in/);
    await expect(page.locator("#d-cover .ph")).toHaveCount(1); // Platzhalter bleibt darunter
    await expect(page.locator("#d-src")).toHaveText("Cover: Open Library");
    expect(netz.anfragen.some(u => u.includes("jscmd=viewapi"))).toBe(true);
    expect(netz.anfragen.filter(u => u.includes("/b/isbn/"))).toEqual([]);
  });

  test("Cover antippen: groß in eigenem Fenster, Größe L nachgeladen, zurück per Antippen/Escape", async ({ page, netz }) => {
    netz.ol = keys => ({ [keys[0]]: { thumbnail_url: "http://covers.openlibrary.org/b/id/123-S.jpg" } });
    await oeffnen(page);
    await oeffneBuch(page, MIT_ISBN);
    const box = page.locator("#d-cover"), zoom = page.locator("#zoom");
    await expect(box).toHaveClass(/zoomable/);
    await expect(box).toHaveAttribute("aria-label", "Cover vergrößern");
    await box.click();
    await expect(zoom).toBeVisible();
    await expect(box).toHaveClass(/lifted/);
    await expect(zoom.locator("img")).toHaveAttribute("src", "https://covers.openlibrary.org/b/id/123-L.jpg");
    const klein = (await box.boundingBox()).width;
    await expect.poll(async () => (await zoom.locator("img").boundingBox()).width).toBeGreaterThan(klein * 1.5);
    expect(netz.anfragen.filter(u => u.includes("/b/isbn/"))).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(zoom).toBeHidden();
    await expect(box).not.toHaveClass(/lifted/);
    await expect(page.locator("#detail")).toBeVisible(); // Detail bleibt offen
    await box.focus();
    await page.keyboard.press("Enter");
    await expect(zoom).toBeVisible();
    await zoom.click();
    await expect(zoom).toBeHidden();
  });

  test("Platzhalter lässt sich nicht vergrößern", async ({ page }) => {
    await oeffnen(page);
    await oeffneBuch(page, OHNE_ISBN);
    const box = page.locator("#d-cover");
    await expect(box).not.toHaveClass(/zoomable/);
    await box.click();
    await expect(page.locator("#zoom")).toBeHidden();
  });

  test("Rückfall Google: Bild direkt über die ISBN, keine Google-API", async ({ page, netz }) => {
    netz.ol = () => ({});
    netz.bild = url => url.includes("books.google.com");
    await oeffnen(page);
    await oeffneBuch(page, MIT_ISBN);
    await expect(page.locator("#d-cover img")).toHaveAttribute("src", "https://books.google.com/books/content?vid=ISBN" + MIT_ISBN.i[0] + "&printsec=frontcover&img=1&zoom=1");
    expect(netz.anfragen.filter(u => u.includes("googleapis"))).toEqual([]);
    await expect(page.locator("#d-src")).toHaveText("Cover: Google Books");
  });

  test("Dienste nicht erreichbar: Platzhalter bleibt, keine Fehler", async ({ page }) => {
    await oeffnen(page);
    await oeffneBuch(page, MIT_ISBN);
    await expect(page.locator("#d-cover")).not.toHaveClass(/loading/, { timeout: 10000 });
    await expect(page.locator("#d-cover img")).toHaveCount(0);
    await expect(page.locator("#d-cover .ph b")).toHaveText(MIT_ISBN.t);
  });

  test("Cover wird im Browser gemerkt (dsm-cover-v3)", async ({ page, netz }) => {
    netz.ol = keys => ({ [keys[0]]: { thumbnail_url: "https://covers.openlibrary.org/b/id/9-S.jpg" } });
    await oeffnen(page);
    await oeffneBuch(page, MIT_ISBN);
    await expect(page.locator("#d-cover img")).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("dsm-cover-v3"))).toContain("9-M.jpg");
  });

  test("Hintergrund: Bücher in Sichtweite werden gesammelt abgefragt, nicht alle", async ({ page, netz }) => {
    netz.ol = () => ({});
    await oeffnen(page);
    await page.waitForTimeout(3500);
    const ol = netz.anfragen.filter(u => u.includes("api/books"));
    expect(ol.length).toBeGreaterThan(0);
    expect(ol.length).toBeLessThanOrEqual(3);
    for (const u of ol) expect(decodeURIComponent(u).match(/ISBN:\d{13}/g).length).toBeLessThanOrEqual(20);
    const ekz = netz.anfragen.filter(u => u.includes("cover.ekz.de"));
    expect(ekz.length).toBeGreaterThan(0); // ekz vor Open Library, nur für Bücher in Sichtweite
    expect(ekz.length).toBeLessThan(40);
  });
});

test.describe("Detail auf dem Handy", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("Fenster passt in die Breite", async ({ page }) => {
    await oeffnen(page);
    await oeffneBuch(page, MIT_ISBN);
    const box = await page.locator("#detail").boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);
    expect(box.x).toBeGreaterThanOrEqual(0);
  });

  // Wischen per CDP-Touch: Sheet halbhoch, hoch = Vollbild, runter = halb, weiter runter = schließen
  async function wische(page, von, bis, schritte = 8) {
    const cdp = await page.context().newCDPSession(page);
    const punkt = y => [{ x: 195, y }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: punkt(von) });
    for (let i = 1; i <= schritte; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: punkt(von + (bis - von) * i / schritte) });
      await page.waitForTimeout(12);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }
  const oben = page => page.locator("#detail").evaluate(d => Math.round(d.getBoundingClientRect().top));
  test("Wischen: halb, hoch = Vollbild, runter = halb, weiter runter = zu", async ({ page }) => {
    await oeffnen(page);
    await oeffneBuch(page, MIT_ISBN);
    await page.waitForTimeout(700);
    const halb = await oben(page);
    expect(halb).toBeGreaterThan(150);
    await wische(page, halb + 20, 120);
    await page.waitForTimeout(700);
    const voll = await oben(page);
    expect(voll).toBeLessThan(40);
    await wische(page, 200, 500);
    await page.waitForTimeout(700);
    expect(await oben(page)).toBeGreaterThan(150);
    await wische(page, halb + 20, 800);
    await expect(page.locator("#detail")).toBeHidden();
  });
});
