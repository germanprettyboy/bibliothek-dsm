/*
 * Gegen die Original-Datenbank (daten/BIBLIOTHEK_DSM_2024.winbook, nicht eingecheckt).
 * Wird übersprungen, wenn die Datei fehlt. Fehlermeldungen nennen nur Anzahlen, nie Namen.
 */
"use strict";
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");
const X = require("../../werkzeuge/quelle/extract.js");
const { WEB, echteDb, browserDatei, norm } = require("../helfer/laden.js");

const DB = echteDb();

describe("Original-Datenbank", { skip: !DB && "daten/BIBLIOTHEK_DSM_2024.winbook fehlt" }, () => {
  let db, r;
  before(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database(fs.readFileSync(DB));
    r = X.extract(db);
  });

  test("books.js entspricht der Datenbank (sonst: npm run books)", () => {
    const B = browserDatei("books.js").DSM_BIBLIOTHEK;
    const neu = X.toScript(r, { stand: B.stand, abdeckung: B.abdeckung, verlauf: B.verlauf });
    const alt = fs.readFileSync(path.join(WEB, "books.js"), "utf8");
    assert.ok(neu === alt, `books.js weicht ab (${B.buecher.length} veröffentlicht, ${r.books.length} aus der Datenbank)`);
  });

  test("Personendaten vorhanden und werden verworfen", () => {
    assert.ok(r.report.removedTables.some(t => t.key === "leser"), "Lesertabelle erkannt");
    assert.ok(r.report.records > r.report.books);
  });

  test("kein vollständiger Leser-Name in Kategorie oder Standort", () => {
    const namen = new Set();
    for (const [n, v] of db.exec("SELECT lname, lvorname FROM leiher")[0].values) {
      const a = norm(n), b = norm(v);
      if (a.length >= 2 && b.length >= 2) { namen.add(b + " " + a); namen.add(a + " " + b); }
    }
    let treffer = 0;
    for (const b of r.books) for (const f of [b.k, ...(b.s || [])]) {
      if (!f) continue;
      const x = " " + norm(f) + " ";
      for (const nm of namen) if (x.includes(" " + nm + " ")) treffer++;
    }
    assert.equal(treffer, 0, treffer + " Felder mit Leser-Namen");
  });

  test("Namen aus Ausleihspalten erscheinen nicht in Kategorie, Standort, Verlag", () => {
    const cols = db.exec("PRAGMA table_info(books)")[0].values.map(v => v[1].toLowerCase());
    const nc = ["verliehenan", "vorgemerktan"].filter(c => cols.includes(c));
    const namen = new Set();
    for (const c of nc) for (const [v] of (db.exec(`SELECT DISTINCT "${c}" FROM books WHERE TRIM(COALESCE("${c}",''))<>''`)[0] || { values: [] }).values) {
      const n = norm(v); if (n.split(" ").length >= 2) namen.add(n);
    }
    let treffer = 0;
    for (const b of r.books) for (const f of [b.k, b.v, ...(b.s || [])]) {
      if (f && [...namen].some(n => (" " + norm(f) + " ").includes(" " + n + " "))) treffer++;
    }
    assert.equal(treffer, 0, treffer + " Treffer");
  });

  test("Gesamtgröße plausibel (books.js < 2 MB)", () => {
    assert.ok(fs.statSync(path.join(WEB, "books.js")).size < 2e6);
  });
});
