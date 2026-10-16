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
// Download als Text
async function herunterladen(page, knopf) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click(knopf)]);
  return fs.readFileSync(await dl.path(), "utf8");
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
    await expect(page.locator("#current")).toHaveText("");
  });

  test("nach dem Entsperren: aktueller Stand der Liste", async ({ page }) => {
    await entsperren(page);
    await expect(page.locator("#current")).toHaveText(`Aktuell veröffentlicht: ${B.buecher.length.toLocaleString("de-DE")} Bücher, Stand ${B.stand.split("-").reverse().join(".")}`);
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
    await expect(page.locator("#pw")).toHaveValue("");
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

  test("books.js herunterladen: byte-gleich zur Node-Erzeugung (npm run books)", async ({ page }) => {
    await entsperren(page);
    await laden(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    const s = await herunterladen(page, "#dl");
    const d = auswerten(s, "DSM_BIBLIOTHEK");
    expect(d.anzahl).toBe(8);
    expect(d.abdeckung).toMatchObject({ stand: d.stand, buecher: 8, isbn: 3 });
    expect(d.verlauf.at(-1)).toEqual(d.abdeckung);
    const node = await nodeSkript(fs.readFileSync(path.join(TMP, "test.winbook")), { stand: d.stand, abdeckung: d.abdeckung, verlauf: d.verlauf });
    expect(s === node, "Download weicht von Node-Erzeugung ab").toBe(true);
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
    netz.gb = i => (i === "9783871347108" ? { items: [{ volumeInfo: { imageLinks: { thumbnail: "https://books.google.com/books/content?id=t" } } }] } : {});
    await entsperren(page);
    await laden(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("#c-big")).toHaveText("37,5 %");
    await page.click("#c-run");
    await expect(page.locator("#c-stop")).toBeVisible();
    await expect(page.locator("#c-run")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#c-big")).toHaveText("66,7 %");
    await expect(page.locator("#c-sub")).toHaveText("2 von 3 Büchern mit ISBN haben ein Cover · 25 % aller Bücher");
    await expect(page.locator("#c-lines")).toContainText("Open Library1");
    await expect(page.locator("#c-lines")).toContainText("Google Books1");
    await expect(page.locator("#c-lines")).toContainText("Kein Cover gefunden1");
    expect(netz.anfragen.filter(u => u.includes("/b/isbn/"))).toEqual([]);
    const d = auswerten(await herunterladen(page, "#dl"), "DSM_BIBLIOTHEK");
    expect(d.abdeckung).toMatchObject({ cover: 2, ol: 1, gb: 1, ohne: 1, geprueft: 3, vollstaendig: true });
  });

  test("Original-Datenbank: Download byte-gleich zur Node-Erzeugung", async ({ page }) => {
    const db = echteDb();
    test.skip(!db, "daten/BIBLIOTHEK_DSM_2024.winbook fehlt");
    test.setTimeout(120000);
    await entsperren(page);
    await laden(page, db);
    await expect(page.locator("#report")).toBeVisible({ timeout: 90000 });
    await expect(page.locator("#r-books")).toHaveText(B.buecher.length.toLocaleString("de-DE"));
    const s = await herunterladen(page, "#dl");
    const d = auswerten(s, "DSM_BIBLIOTHEK");
    const node = await nodeSkript(fs.readFileSync(db), { stand: d.stand, abdeckung: d.abdeckung, verlauf: d.verlauf });
    expect(s === node, "Download weicht von npm run books ab").toBe(true);
    expect(JSON.stringify(d.buecher)).toBe(JSON.stringify(B.buecher));
  });
});

test.describe("Empfehlungen bearbeiten", () => {
  const tab = async page => { await page.click('.tabs [data-tab="empf"]'); await expect(page.locator("#tab-empf")).toBeVisible(); };
  const entwurf = page => page.evaluate(() => JSON.parse(localStorage.getItem("dsm-empf-entwurf") || "null"));

  test("Gruppen mit Anzahl, aktueller Stand geladen", async ({ page }) => {
    await entsperren(page);
    await tab(page);
    await expect(page.locator("#e-groups button")).toHaveText([
      `Mittelstufe (${E.gruppen.mittelstufe.length})`, `Oberstufe (${E.gruppen.oberstufe.length})`,
      `Erwachsene · Romane (${E.gruppen["erw-roman"].length})`, `Erwachsene · Sachbücher (${E.gruppen["erw-sach"].length})`,
      `Erwachsene · Biografien & Geschichte (${E.gruppen["erw-bio"].length})`]);
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
    await expect(page.locator("#e-state")).toHaveText(/Entwurf im Browser gespeichert · \d+ Bücher in 5 Gruppen/);
    // Entwurf bleibt nach Neuladen
    await page.reload();
    await expect(page.locator("#app")).toBeVisible({ timeout: 10000 });
    await tab(page);
    await expect(page.locator("#e-list .rec-ed b").nth(2)).toHaveText(titel);
  });

  test("empfehlungen.js herunterladen: Format, Schlüssel, getrimmte Texte", async ({ page }) => {
    await entsperren(page);
    await tab(page);
    await page.locator('#e-list .rec-ed[data-n="0"] textarea[data-f=de]').fill("  Neuer Text mit Leerzeichen.  ");
    const s = await herunterladen(page, "#e-dl");
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
