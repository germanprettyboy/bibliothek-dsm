/*
 * Verwaltung (admin.html). Die echte admin.enc.js braucht das echte Passwort, das nirgends steht.
 * Darum wird sie hier durch eine mit „test-passwort“ verschlüsselte Fassung der aktuellen Quellen ersetzt.
 */
const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");
const { test, expect, daten, TMP } = require("./hilfen.js");
const X = require("../../werkzeuge/quelle/extract.js");
const T = require("../helfer/testdb.js");
const { echteDb } = require("../helfer/laden.js");

const PW = "test-passwort";
const { B, E } = daten();

test.beforeEach(async ({ context }) => {
  await context.route("**/assets/admin.enc.js", r => r.fulfill({ path: path.join(TMP, "admin.enc.js"), contentType: "text/javascript" }));
  // Ordnerdialog des Browsers (nativ, nicht steuerbar) ersetzt durch einen Ordner im privaten Browser-Speicher (OPFS).
  // localStorage „__test-ordner“: Name des gewählten Ordners; nur „website“ enthält index.html; „abbrechen“ = Dialog abgebrochen.
  await context.addInitScript(() => {
    window.__picks = 0;
    window.showDirectoryPicker = async () => {
      window.__picks++;
      const name = localStorage.getItem("__test-ordner") || "website";
      if (name === "abbrechen") throw new DOMException("Auswahl abgebrochen", "AbortError");
      const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(name, { create: true });
      if (name === "website") await (await (await dir.getFileHandle("index.html", { create: true })).createWritable()).close();
      return dir;
    };
  });
});

async function entsperren(page) {
  await page.goto("admin.html");
  await page.fill("#pw", PW);
  await page.click("#unlock");
  await expect(page.locator("#app")).toBeVisible({ timeout: 15000 });
}
async function laden(page, datei) {
  await page.setInputFiles("#file", datei);
}
// Download als Text (Browser ohne Ordnerzugriff)
async function herunterladen(page, knopf) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click(knopf)]);
  return fs.readFileSync(await dl.path(), "utf8");
}
// Datei im (Test-)Website-Ordner lesen, null = nicht vorhanden
const ordnerDatei = (page, datei, ordner = "website") => page.evaluate(async ([d, o]) => {
  try {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(o);
    return await (await (await dir.getFileHandle(d)).getFile()).text();
  } catch (e) { return null; }
}, [datei, ordner]);
// Inhalt als Daten; null, solange die Datei fehlt oder gerade geschrieben wird
const ordnerDaten = async (page, datei, name) => { try { return auswerten(await ordnerDatei(page, datei), name) || null; } catch (e) { return null; } };
const DATEI = { "#dl": "books.js", "#e-dl": "empfehlungen.js", "#i-dl": "info.js" };
const okText = datei => new RegExp(`^${datei.replace(".", "\\.")} im Ordner „website“ gespeichert, \\d\\d:\\d\\d Uhr\\.$`);
// Veröffentlichen: Klick, Erfolgsmeldung, geschriebene Datei als Text
async function speichern(page, knopf) {
  const datei = DATEI[knopf];
  await page.click(knopf);
  await expect(page.locator(`.pub[data-datei="${datei}"] .flag`)).toHaveText(okText(datei));
  return ordnerDatei(page, datei);
}
const auswerten = (s, name) => { const w = {}; new Function("window", s)(w); return w[name]; };
// Gleiche Erzeugung wie npm run books / books-erzeugen.js
// Bücher der Test-Datenbank (wie nach dem Einlesen)
async function testKatalog() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(path.join(TMP, "test.winbook")));
  try { return X.extract(db).books; } finally { db.close(); }
}
const { schluessel } = require("../helfer/laden.js");
async function nodeSkript(dbBytes, meta) {
  const SQL = await initSqlJs();
  const db = new SQL.Database(dbBytes);
  try { return X.toScript(X.extract(db), meta); } finally { db.close(); }
}

test.describe("Sperre", () => {
  test("gesperrt: nur Passwortfeld, Verwaltung verborgen", async ({ page }) => {
    await page.goto("admin.html");
    await expect(page.locator("#lock")).toBeVisible();
    await expect(page.locator("#app")).toBeHidden();
    await expect(page.locator("#pw")).toBeFocused();
  });

  test("falsches Passwort: Meldung, Wartezeit, Zähler", async ({ page }) => {
    await page.goto("admin.html");
    await page.fill("#pw", "falsch");
    await page.click("#unlock");
    await expect(page.locator("#lock-msg")).toHaveText("Das Passwort stimmt nicht.", { timeout: 10000 });
    await expect(page.locator("#lock-form")).toHaveClass(/shake/);
    expect(await page.evaluate(() => sessionStorage.getItem("dsm-admin-fails"))).toBe("1");
    await page.click("#unlock");
    await expect(page.locator("#lock-msg")).toHaveText(/^Bitte \d+ Sekunden warten\.$/);
    await expect(page.locator("#app")).toBeHidden();
  });

  test("Wartezeit wächst mit weiteren Fehlversuchen (höchstens 30 s)", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("dsm-admin-fails", "9"));
    await page.goto("admin.html");
    await page.fill("#pw", "falsch");
    await page.click("#unlock");
    await expect(page.locator("#lock-msg")).toHaveText("Das Passwort stimmt nicht.", { timeout: 10000 });
    await page.click("#unlock");
    await expect(page.locator("#lock-msg")).toHaveText(/^Bitte (29|30) Sekunden warten\.$/);
  });

  test("richtiges Passwort: Verwaltung startet, bleibt bei Neuladen offen, Sperren schließt", async ({ page }) => {
    await entsperren(page);
    await expect(page.locator("#lock")).toBeHidden();
    expect(await page.evaluate(() => sessionStorage.getItem("dsm-admin-fails"))).toBe("0");
    expect(await page.evaluate(() => sessionStorage.getItem("dsm-admin-key"))).toBeTruthy();
    await page.reload();
    await expect(page.locator("#app")).toBeVisible({ timeout: 10000 });
    await page.click("#lock-btn");
    await expect(page.locator("#lock")).toBeVisible();
    await expect(page.locator("#app")).toBeHidden();
    expect(await page.evaluate(() => sessionStorage.getItem("dsm-admin-key"))).toBeNull();
  });

  test("Passwort steht nach dem Entsperren nicht mehr im Feld und nirgends im Speicher", async ({ page }) => {
    await entsperren(page);
    // Sperre samt Passwortfeld ist nach dem Entsperren nicht mehr auf der Seite
    await expect(page.locator("#pw")).toHaveCount(0);
    expect(await page.content()).not.toContain(PW);
    const alles = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(alles).not.toContain(PW);
  });

  test("neuer Tab ist wieder gesperrt", async ({ page, context }) => {
    await entsperren(page);
    const p2 = await context.newPage();
    await p2.goto("admin.html");
    await expect(p2.locator("#lock")).toBeVisible();
    await expect(p2.locator("#app")).toBeHidden();
  });

  test("manipulierter Sitzungsschlüssel: wird verworfen, Seite gesperrt", async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("__manip")) { sessionStorage.setItem("__manip", "1"); sessionStorage.setItem("dsm-admin-key", btoa("x".repeat(32))); }
    });
    await page.goto("admin.html");
    await expect(page.locator("#lock")).toBeVisible();
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem("dsm-admin-key"))).toBeNull();
    await expect(page.locator("#app")).toBeHidden();
  });

  test("admin.enc.js fehlt: verständliche Meldung", async ({ page }) => {
    await page.route("**/assets/admin.enc.js", r => r.fulfill({ status: 404, body: "" }));
    await page.goto("admin.html");
    await page.fill("#pw", PW);
    await page.click("#unlock");
    await expect(page.locator("#lock-msg")).toContainText("admin.enc.js fehlt");
  });

  test("Italienisch", async ({ page }) => {
    await page.goto("admin.html");
    await page.click('.seg [data-lang="it"]');
    await expect(page.locator("#lock-msg")).toHaveText("");
    await expect(page.locator("#unlock")).toHaveText("Sblocca");
  });
});

test.describe("Datenbank einlesen", () => {
  test("Test-Datenbank: Bericht, Personendaten verworfen, Abgleich", async ({ page }) => {
    await entsperren(page);
    await laden(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("#r-books")).toHaveText("8");
    const taken = page.locator("#r-taken");
    await expect(taken).toContainText("Datensätze in der Datenbank16");
    await expect(taken).toContainText("Andere Medien ausgelassen (DVD, CD, Hörbuch …)2");
    await expect(taken).toContainText("Gelöschte oder ausgeschiedene Titel4");
    await expect(taken).toContainText("Mehrfachexemplare zusammengefasst1");
    await expect(taken).toContainText("Titel mit ISBN (Cover möglich)3");
    // Vergleich wie in admin.js: Titel|Erstautor, klein geschrieben
    const k = b => (b.t + "|" + ((b.a && b.a[0]) || "")).toLowerCase();
    const neu = await testKatalog(), alt = new Set(B.buecher.map(k)), jetzt = new Set(neu.map(k));
    const a = [...jetzt].filter(x => !alt.has(x)).length, r = [...alt].filter(x => !jetzt.has(x)).length;
    await expect(taken).toContainText(`Gegenüber der aktuellen Liste+${a} neu · −${r.toLocaleString("de-DE")} entfallen`);
    const rm = page.locator("#r-removed");
    await expect(rm).toContainText("Leserinnen und Leser3");
    await expect(rm).toContainText("Laufende Ausleihen2");
    await expect(rm).toContainText("Programm-Benutzer (mit Passwörtern)1");
    await expect(rm).toContainText("Anmeldesitzungen (IP-Adressen)1");
    await expect(rm).toContainText("5 Felder");
    await expect(rm).toContainText("Bucheinträge mit Leser-Namen3");
    await expect(page.locator("#r-check")).toHaveText(/^1 Titel enthalten einen Namen.*2 Standort- oder Kategoriebezeichnungen/);
    await expect(page.locator("#r-check")).toHaveClass(/mid/);
    // keine Namen in der Seite
    await expect(page.locator("#report")).not.toContainText("Musterfrau");
  });

  test("books.js veröffentlichen: byte-gleich zur Node-Erzeugung (npm run books)", async ({ page }) => {
    await entsperren(page);
    await laden(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    const s = await speichern(page, "#dl");
    const d = auswerten(s, "DSM_BIBLIOTHEK");
    expect(d.anzahl).toBe(8);
    expect(d.abdeckung).toMatchObject({ stand: d.stand, buecher: 8, isbn: 3 });
    expect(d.verlauf.at(-1)).toEqual(d.abdeckung);
    const node = await nodeSkript(fs.readFileSync(path.join(TMP, "test.winbook")), { stand: d.stand, abdeckung: d.abdeckung, verlauf: d.verlauf });
    expect(s === node, "books.js weicht von Node-Erzeugung ab").toBe(true);
    await expect(page.locator("#r-taken")).toContainText("Gegenüber der aktuellen Liste+0 neu · −0 entfallen");
  });

  test("Vorschau: index.html#vorschau zeigt die eingelesene Liste", async ({ page, context }) => {
    await entsperren(page);
    await laden(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    const [p2] = await Promise.all([context.waitForEvent("page"), page.click("#preview")]);
    await p2.waitForLoadState();
    await expect(p2.locator("#preview")).toBeVisible();
    await expect(p2.locator("#list .row .t")).toHaveText(T.ERWARTET);
  });

  test("keine SQLite-Datei → Meldung, erneut wählbar", async ({ page }) => {
    await entsperren(page);
    await laden(page, path.join(TMP, "kein-sqlite.winbook"));
    await expect(page.locator("#error")).toHaveText(/keine SQLite-Datenbank/);
    await expect(page.locator("#drop")).toBeVisible();
    await expect(page.locator("#report")).toBeHidden();
    await laden(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("#error")).toBeHidden();
  });

  test("SQLite ohne Büchertabelle → Meldung", async ({ page }) => {
    await entsperren(page);
    await laden(page, path.join(TMP, "keine-bibliothek.sqlite"));
    await expect(page.locator("#error")).toHaveText(/keine Bibliotheksdatenbank/, { timeout: 20000 });
  });

  test("Meldungen und Bericht folgen der Sprache", async ({ page }) => {
    await entsperren(page);
    await laden(page, path.join(TMP, "kein-sqlite.winbook"));
    await page.click('.seg [data-lang="it"]');
    await expect(page.locator("#error")).toHaveText(/Non è un database SQLite|SQLite/);
    await laden(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#r-removed")).toContainText("Lettrici e lettori", { timeout: 20000 });
  });

  test("Cover-Abdeckung prüfen (Dienste gemockt)", async ({ page, netz }) => {
    netz.ol = keys => (keys.includes("ISBN:9783522202107") ? { "ISBN:9783522202107": { thumbnail_url: "https://covers.openlibrary.org/b/id/3-S.jpg" } } : {});
    netz.bild = url => url.includes("covers.openlibrary.org/b/id/") || url.includes("cover.ekz.de/9783871347108");
    await entsperren(page);
    await laden(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("#c-big")).toHaveText("37,5 %");
    await page.click("#c-run");
    await expect(page.locator("#c-stop")).toBeVisible();
    await expect(page.locator("#c-run")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#c-big")).toHaveText("66,7 %");
    await expect(page.locator("#c-sub")).toHaveText("2 von 3 Büchern mit ISBN haben ein Cover · 25 % aller Bücher");
    await expect(page.locator("#c-lines")).toContainText("ekz-Bibliotheksservice1");
    await expect(page.locator("#c-lines")).toContainText("Open Library1");
    await expect(page.locator("#c-lines")).toContainText("Google Books0");
    await expect(page.locator("#c-lines")).toContainText("Kein Cover gefunden1");
    expect(netz.anfragen.filter(u => u.includes("/b/isbn/"))).toEqual([]);
    const d = auswerten(await speichern(page, "#dl"), "DSM_BIBLIOTHEK");
    expect(d.abdeckung).toMatchObject({ cover: 2, ekz: 1, ol: 1, gb: 0, ohne: 1, geprueft: 3, vollstaendig: true });
    expect(netz.anfragen.filter(u => u.includes("api/books")).join()).not.toContain("9783871347108"); // ekz-Treffer nicht an Open Library
  });

  test("Original-Datenbank: books.js byte-gleich zur Node-Erzeugung", async ({ page }) => {
    const db = echteDb();
    test.skip(!db, "daten/BIBLIOTHEK_DSM_2024.winbook fehlt");
    test.setTimeout(120000);
    await entsperren(page);
    await laden(page, db);
    await expect(page.locator("#report")).toBeVisible({ timeout: 90000 });
    await expect(page.locator("#r-books")).toHaveText(B.buecher.length.toLocaleString("de-DE"));
    const s = await speichern(page, "#dl");
    const d = auswerten(s, "DSM_BIBLIOTHEK");
    const node = await nodeSkript(fs.readFileSync(db), { stand: d.stand, abdeckung: d.abdeckung, verlauf: d.verlauf });
    expect(s === node, "books.js weicht von npm run books ab").toBe(true);
    expect(JSON.stringify(d.buecher)).toBe(JSON.stringify(B.buecher));
  });
});

test.describe("Empfehlungen bearbeiten", () => {
  const tab = async page => { await page.click('.tabs [data-tab="empf"]'); await expect(page.locator("#tab-empf")).toBeVisible(); };
  const entwurf = page => page.evaluate(() => JSON.parse(localStorage.getItem("dsm-empf-entwurf") || "null"));

  test("Gruppen, aktueller Stand geladen", async ({ page }) => {
    await entsperren(page);
    await tab(page);
    await expect(page.locator("#e-groups button")).toHaveText([
      "Mittelstufe", "Oberstufe", "Erwachsene · Romane", "Erwachsene · Sachbücher", "Erwachsene · Biografien & Geschichte"]);
    await expect(page.locator("#e-list .rec-ed b")).toHaveText(E.gruppen.mittelstufe.map(r => r.t));
    await expect(page.locator("#e-list .warn")).toHaveCount(0);
  });

  test("volle Gruppe: Hinzufügen gesperrt; entfernen, hinzufügen, sortieren, Text – Entwurf gespeichert", async ({ page }) => {
    await entsperren(page);
    await tab(page);
    // Gruppe voll: Suchfeld gesperrt, Hinweis mittig
    await expect(page.locator("#e-q")).toBeDisabled();
    await expect(page.locator("#e-full")).toBeVisible();
    await expect(page.locator("#e-full")).toHaveText("Gruppe voll (4)");
    // entfernen
    await page.locator('#e-list .rec-ed[data-n="3"] [data-op="del"]').click();
    await expect(page.locator("#e-list .rec-ed")).toHaveCount(3);
    await expect(page.locator("#e-q")).toBeEnabled();
    await expect(page.locator("#e-full")).toBeHidden();
    // hinzufügen
    await page.fill("#e-q", "verwandlung kafka");
    const add = page.locator("#e-res button:not([disabled])").first();
    const titel = (await page.locator("#e-res li b").first().textContent()).trim();
    await add.click();
    await expect(page.locator("#e-list .rec-ed")).toHaveCount(4);
    await expect(page.locator("#e-list .rec-ed b").nth(3)).toHaveText(titel);
    await expect(page.locator("#e-list .rec-ed:last-child textarea").first()).toBeFocused();
    // Text
    await page.locator("#e-list .rec-ed:last-child textarea[data-f=de]").fill("Ein kurzer deutscher Text.");
    await page.locator("#e-list .rec-ed:last-child textarea[data-f=it]").fill("Un breve testo italiano.");
    // nach oben
    await page.locator('#e-list .rec-ed[data-n="3"] [data-op="up"]').click();
    await expect(page.locator("#e-list .rec-ed b").nth(2)).toHaveText(titel);
    await expect(page.locator('#e-list .rec-ed[data-n="0"] [data-op="up"]')).toBeDisabled();
    await expect(page.locator('#e-list .rec-ed[data-n="3"] [data-op="down"]')).toBeDisabled();
    await expect.poll(async () => (await entwurf(page))?.gruppen.mittelstufe[2]?.it).toBe("Un breve testo italiano.");
    await expect(page.locator("#e-state")).toHaveCount(0);
    // Entwurf bleibt nach Neuladen
    await page.reload();
    await expect(page.locator("#app")).toBeVisible({ timeout: 10000 });
    await tab(page);
    await expect(page.locator("#e-list .rec-ed b").nth(2)).toHaveText(titel);
  });

  test("empfehlungen.js veröffentlichen: Format, Schlüssel, getrimmte Texte", async ({ page }) => {
    await entsperren(page);
    await tab(page);
    await page.locator('#e-list .rec-ed[data-n="0"] textarea[data-f=de]').fill("  Neuer Text mit Leerzeichen.  ");
    const s = await speichern(page, "#e-dl");
    expect(s).toMatch(/^\/\*.*\*\/\nwindow\.DSM_EMPFEHLUNGEN = \{/);
    expect(s).not.toContain("<");
    const d = auswerten(s, "DSM_EMPFEHLUNGEN");
    expect(Object.keys(d.gruppen)).toEqual(["mittelstufe", "oberstufe", "erw-roman", "erw-sach", "erw-bio"]);
    expect(d.gruppen.mittelstufe[0].de).toBe("Neuer Text mit Leerzeichen.");
    expect(d.gruppen.oberstufe).toEqual(E.gruppen.oberstufe);
    for (const r of d.gruppen.mittelstufe) expect(Object.keys(r)).toEqual(["k", "t", "a", "de", "it"]);
  });

  test("Vorschau der Empfehlungen auf index.html#vorschau", async ({ page, context }) => {
    await entsperren(page);
    await tab(page);
    await page.locator('#e-list .rec-ed[data-n="0"] [data-op="del"]').click();
    const [p2] = await Promise.all([context.waitForEvent("page"), page.click("#e-prev")]);
    await p2.evaluate(() => localStorage.setItem("dsm-empf", JSON.stringify({ want: true, gruppe: "mittelstufe" })));
    await p2.reload();
    await expect(p2.locator("#preview")).toBeVisible();
    await expect(p2.locator("#recs .rec .rt b")).toHaveText(E.gruppen.mittelstufe.slice(1).map(r => r.t));
  });

  test("Entwurf verwerfen: zweiter Klick nötig", async ({ page }) => {
    await entsperren(page);
    await tab(page);
    await page.locator('#e-list .rec-ed[data-n="0"] [data-op="del"]').click();
    await expect(page.locator("#e-list .rec-ed")).toHaveCount(E.gruppen.mittelstufe.length - 1);
    // Entwurf wird verzögert gespeichert (300 ms) – erst danach verwerfen
    await expect.poll(async () => (await entwurf(page))?.gruppen.mittelstufe.length).toBe(E.gruppen.mittelstufe.length - 1);
    await page.click("#e-reset");
    await expect(page.locator("#e-reset")).toHaveText("Wirklich verwerfen?");
    await expect(page.locator("#e-list .rec-ed")).toHaveCount(E.gruppen.mittelstufe.length - 1);
    await page.click("#e-reset");
    await expect(page.locator("#e-list .rec-ed")).toHaveCount(E.gruppen.mittelstufe.length);
    expect(await entwurf(page)).toBeNull();
  });

  test("Empfehlung, die nach dem Einlesen fehlt, wird markiert", async ({ page }) => {
    await entsperren(page);
    await laden(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    await tab(page);
    const da = new Set((await testKatalog()).map(schluessel));
    const fehlen = E.gruppen.mittelstufe.filter(r => !da.has(r.k)).length;
    expect(fehlen).toBeGreaterThan(0);
    await expect(page.locator("#e-list .warn")).toHaveCount(fehlen);
    await expect(page.locator("#e-list .warn").first()).toHaveText("Nicht im aktuellen Bestand – wird nicht angezeigt.");
  });
});

test.describe("Verwaltung auf dem Handy", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("kein waagrechtes Scrollen", async ({ page }) => {
    await entsperren(page);
    await laden(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test.describe("Veröffentlichen direkt in den Website-Ordner", () => {
  const info = async page => { await page.click('.tabs [data-tab="info"]'); await expect(page.locator("#tab-info")).toBeVisible(); };
  const picks = page => page.evaluate(() => window.__picks);
  const ordnerZeile = "Website-Ordner: website · Anderen Ordner wählen";

  test("erster Klick fragt nach dem Ordner und schreibt info.js; danach ohne Rückfrage, auch nach Neuladen", async ({ page }) => {
    await entsperren(page);
    await info(page);
    await expect(page.locator("#i-dl")).toHaveText("Veröffentlichen");
    await expect(page.locator("#i-how")).toContainText("nichts herunterladen, nichts verschieben");
    await page.fill("#i-note-de", "Erster Hinweis");
    const d = auswerten(await speichern(page, "#i-dl"), "DSM_INFO");
    expect(d.hinweis.de).toBe("Erster Hinweis");
    expect(await picks(page)).toBe(1);
    await expect(page.locator('.pub[data-datei="info.js"] .note')).toHaveText(ordnerZeile);
    await expect(page.locator("#i-how")).toHaveText("Ein Klick schreibt info.js direkt in den Website-Ordner „website“.");
    // zweites Mal: kein Dialog
    await page.fill("#i-note-de", "Zweiter Hinweis");
    await page.click("#i-dl");
    await expect.poll(async () => (await ordnerDaten(page, "info.js", "DSM_INFO"))?.hinweis.de).toBe("Zweiter Hinweis");
    expect(await picks(page)).toBe(1);
    // Ordner bleibt nach Neuladen gemerkt (IndexedDB)
    await page.reload();
    await expect(page.locator("#app")).toBeVisible({ timeout: 10000 });
    await info(page);
    await expect(page.locator("#i-how")).toHaveText("Ein Klick schreibt info.js direkt in den Website-Ordner „website“.");
    await page.fill("#i-note-de", "Dritter Hinweis");
    await page.click("#i-dl");
    await expect.poll(async () => (await ordnerDaten(page, "info.js", "DSM_INFO"))?.hinweis.de).toBe("Dritter Hinweis");
    expect(await picks(page)).toBe(0);
  });

  test("falscher Ordner (ohne index.html): Meldung, nichts geschrieben; danach richtiger Ordner", async ({ page }) => {
    await entsperren(page);
    await info(page);
    await page.evaluate(() => localStorage.setItem("__test-ordner", "Downloads"));
    await page.click("#i-dl");
    const flag = page.locator('.pub[data-datei="info.js"] .flag');
    await expect(flag).toHaveText("Im Ordner „Downloads“ liegt keine index.html. Bitte den Website-Ordner wählen – den Ordner mit index.html und admin.html.");
    await expect(flag).toHaveClass(/warn/);
    expect(await ordnerDatei(page, "info.js", "Downloads")).toBeNull();
    await expect(page.locator('.pub[data-datei="info.js"] .note')).toHaveCount(0);
    await page.evaluate(() => localStorage.setItem("__test-ordner", "website"));
    await speichern(page, "#i-dl");
    expect(await picks(page)).toBe(2);
  });

  test("Dialog abgebrochen: keine Meldung, nichts geschrieben", async ({ page }) => {
    await entsperren(page);
    await info(page);
    await page.evaluate(() => localStorage.setItem("__test-ordner", "abbrechen"));
    await page.click("#i-dl");
    await expect.poll(() => picks(page)).toBe(1);
    await expect(page.locator("#i-dl")).toBeEnabled();
    await expect(page.locator('.pub[data-datei="info.js"]')).toHaveText("");
  });

  test("anderen Ordner wählen", async ({ page }) => {
    await entsperren(page);
    await info(page);
    await speichern(page, "#i-dl");
    await page.evaluate(() => localStorage.setItem("__test-ordner", "Downloads"));
    await page.click('.pub[data-datei="info.js"] [data-pub-wechseln]');
    await expect(page.locator('.pub[data-datei="info.js"] .flag')).toHaveText(/^Im Ordner „Downloads“ liegt keine index\.html/);
    // bisheriger Ordner bleibt
    await expect(page.locator('.pub[data-datei="info.js"] .note')).toHaveText(ordnerZeile);
  });

  test("Empfehlungen zweimal veröffentlichen: neue Runde nur einmal im Archiv", async ({ page }) => {
    await entsperren(page);
    await page.click('.tabs [data-tab="empf"]');
    await page.locator('#e-list .rec-ed[data-n="0"] [data-op="del"]').click();
    const a = auswerten(await speichern(page, "#e-dl"), "DSM_EMPFEHLUNGEN");
    const vorher = (E.archiv || []).length;
    expect(a.archiv.length).toBe(vorher + 1);
    expect(a.stand).toBe(new Date().toLocaleDateString("sv-SE"));
    await page.locator('#e-list .rec-ed[data-n="0"] textarea[data-f=de]').fill("Nur der Text ist neu.");
    await page.click("#e-dl");
    await expect.poll(async () => (await ordnerDaten(page, "empfehlungen.js", "DSM_EMPFEHLUNGEN"))?.gruppen.mittelstufe[0].de).toBe("Nur der Text ist neu.");
    const b = auswerten(await ordnerDatei(page, "empfehlungen.js"), "DSM_EMPFEHLUNGEN");
    expect(b.archiv.length).toBe(vorher + 1);
    expect(b.stand).toBe(a.stand);
  });

  test("Italienisch", async ({ page }) => {
    await entsperren(page);
    await info(page);
    await page.click('.seg [data-lang="it"]');
    await expect(page.locator("#i-dl")).toHaveText("Pubblica");
    await page.click("#i-dl");
    await expect(page.locator('.pub[data-datei="info.js"] .flag')).toHaveText(/^info\.js salvato nella cartella «website» alle \d\d:\d\d\.$/);
    await expect(page.locator('.pub[data-datei="info.js"] .note')).toHaveText("Cartella del sito: website · Scegli un'altra cartella");
  });
});

test.describe("Direkt online veröffentlichen (speichern.php)", () => {
  // speichern.php gespielt: GET meldet den Zustand, POST antwortet nach Wunsch und merkt sich die Anfragen
  async function server(page, { get = { bereit: true }, post = null } = {}) {
    const anfragen = [];
    await page.route("**/speichern.php*", async r => {
      const q = r.request();
      if (q.method() === "GET") return r.fulfill({ json: { dsm: "speichern", v: 1, ...get } });
      anfragen.push({ datei: new URL(q.url()).searchParams.get("datei"), schluessel: q.headers()["x-dsm-schluessel"], text: q.postData() });
      if (post) return r.fulfill(post);
      return r.fulfill({ json: { dsm: "speichern", v: 1, ok: true } });
    });
    return anfragen;
  }
  const info = async page => { await page.click('.tabs [data-tab="info"]'); await expect(page.locator("#tab-info")).toBeVisible(); };
  const flag = page => page.locator('.pub[data-datei="info.js"] .flag');
  const ONLINE = "Ein Klick speichert info.js direkt auf der Website – sofort online, nichts hochladen.";

  test("ein Klick: info.js geht mit Schlüssel an speichern.php, kein Ordnerdialog, Meldung „online“", async ({ page }) => {
    const { speicherSchluessel } = require("../../werkzeuge/admin-verschluesseln.js");
    const anfragen = await server(page);
    await entsperren(page);
    await info(page);
    await expect(page.locator("#i-how")).toHaveText(ONLINE);
    await expect(page.locator("#i-dl")).toHaveText("Veröffentlichen");
    await expect(page.locator('.pub[data-datei="info.js"] .note')).toHaveCount(0);
    await page.fill("#i-note-de", "Online-Hinweis");
    await page.click("#i-dl");
    await expect(flag(page)).toHaveText(/^info\.js ist online, \d\d:\d\d Uhr\.$/);
    expect(anfragen.length).toBe(1);
    expect(anfragen[0].datei).toBe("info.js");
    expect(anfragen[0].schluessel).toBe(await speicherSchluessel(PW));
    expect(auswerten(anfragen[0].text, "DSM_INFO").hinweis.de).toBe("Online-Hinweis");
    expect(await page.evaluate(() => window.__picks)).toBe(0);
    // gilt danach als veröffentlicht
    expect(await page.evaluate(() => window.DSM_INFO.hinweis.de)).toBe("Online-Hinweis");
  });

  test("books.js geht mit Schlüssel an speichern.php", async ({ page }) => {
    const anfragen = await server(page);
    await entsperren(page);
    await laden(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    await page.click("#dl");
    await expect(page.locator('.pub[data-datei="books.js"] .flag')).toHaveText(/^books\.js ist online/);
    expect(anfragen[0].datei).toBe("books.js");
    expect(auswerten(anfragen[0].text, "DSM_BIBLIOTHEK").buecher.length).toBe(8);
  });

  test("Zugang abgelehnt (403): Warnung, Stand bleibt unveröffentlicht", async ({ page }) => {
    await server(page, { post: { status: 403, json: { dsm: "speichern", v: 1, fehler: "schluessel" } } });
    await entsperren(page);
    await info(page);
    await expect(page.locator("#i-how")).toHaveText(ONLINE);
    const vorher = await page.evaluate(() => JSON.stringify(window.DSM_INFO));
    await page.fill("#i-note-de", "Abgelehnt");
    await page.click("#i-dl");
    await expect(flag(page)).toHaveText(/^Die Website hat das Speichern abgelehnt/);
    await expect(flag(page)).toHaveClass(/warn/);
    expect(await page.evaluate(() => JSON.stringify(window.DSM_INFO))).toBe(vorher);
  });

  test("Server-Fehler ohne JSON: Meldung mit Status", async ({ page }) => {
    await server(page, { post: { status: 500, body: "Internal Server Error" } });
    await entsperren(page);
    await info(page);
    await expect(page.locator("#i-how")).toHaveText(ONLINE);
    await page.click("#i-dl");
    await expect(flag(page)).toHaveText("Speichern auf der Website hat nicht geklappt (HTTP 500). Bitte noch einmal versuchen.");
  });

  test("speichern.php ohne Zugangsdatei: Hinweis, Ordner-Weg wie bisher", async ({ page }) => {
    const anfragen = await server(page, { get: { bereit: false, grund: "zugang" } });
    await entsperren(page);
    await info(page);
    await expect(page.locator('.pub[data-datei="info.js"] [data-pub-einrichten]')).toHaveText("Direkt online speichern ist noch nicht eingerichtet: speichern-zugang.php fehlt auf der Website.");
    await expect(page.locator("#i-how")).toContainText("nichts herunterladen, nichts verschieben");
    await speichern(page, "#i-dl");
    expect(anfragen.length).toBe(0);
  });

  test("Italienisch", async ({ page }) => {
    await server(page);
    await entsperren(page);
    await info(page);
    await page.click('.seg [data-lang="it"]');
    await expect(page.locator("#i-how")).toHaveText("Un clic salva info.js direttamente sul sito – subito online, senza caricare nulla.");
    await page.click("#i-dl");
    await expect(flag(page)).toHaveText(/^info\.js è online dalle \d\d:\d\d\.$/);
  });
});

test.describe("Browser ohne Ordnerzugriff (Safari, Firefox, Handy)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { delete window.showDirectoryPicker; delete Window.prototype.showDirectoryPicker; });
  });

  test("info.js wird wie bisher heruntergeladen, Hinweis nennt Chrome/Edge", async ({ page }) => {
    await entsperren(page);
    expect(await page.evaluate(() => typeof window.showDirectoryPicker)).toBe("undefined");
    await page.click('.tabs [data-tab="info"]');
    await expect(page.locator("#i-dl")).toHaveText("info.js herunterladen");
    await expect(page.locator("#i-how")).toHaveText("Direkt speichern geht in Chrome oder Edge am Computer. Die heruntergeladene Datei info.js im Website-Ordner ersetzen (neben index.html).");
    await page.fill("#i-note-de", "Per Download");
    const d = auswerten(await herunterladen(page, "#i-dl"), "DSM_INFO");
    expect(d.hinweis.de).toBe("Per Download");
    await expect(page.locator('.pub[data-datei="info.js"]')).toHaveText("");
  });

  test("books.js wird heruntergeladen", async ({ page }) => {
    await entsperren(page);
    await laden(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("#dl")).toHaveText("books.js herunterladen");
    expect(auswerten(await herunterladen(page, "#dl"), "DSM_BIBLIOTHEK").anzahl).toBe(8);
  });
});
