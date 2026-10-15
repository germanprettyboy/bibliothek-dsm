/* Extraktion aus der WinBIAP-Datenbank: Whitelist, keine Personendaten, Zusammenfassen, Sortierung, Ausgabeformat. */
"use strict";
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const X = require("../../werkzeuge/quelle/extract.js");
const T = require("../helfer/testdb.js");

const ERLAUBT = new Set(["t", "u", "a", "v", "j", "i", "k", "s"]);
const AUSLEIH = ["bverliehen", "bvorgemerkt", "bverfuegbar", "bausleihhinweis", "verltime", "rucktime", "verliehenan",
  "verliehenanklasse", "vormerkungvon", "vormerkungbis", "vorgemerktan", "exemplarverliehen", "exemplarvorgemerkt",
  "banzahlausleihen", "bdonatedby", "klient"];
const PERSONEN = ["leiher", "vorgaenge", "history", "vormerkungen", "gebuehren", "users", "sessions", "rechnungen", "besucher"];

// Datenbank, die jede SQL-Anweisung mitschreibt
function spion(db) {
  const log = [];
  const exec = db.exec.bind(db);
  db.exec = s => { log.push(s); return exec(s); };
  return log;
}

describe("isbn13", () => {
  test("gültige ISBN-13 bleibt, Trennzeichen fallen weg", () => {
    assert.equal(X.isbn13("9783522202107"), "9783522202107");
    assert.equal(X.isbn13("978-3-87134-710-8"), "9783871347108");
    assert.equal(X.isbn13(" 978 3 522 17650 7 "), "9783522176507");
  });
  test("falsche Prüfziffer wird verworfen (keine Ergänzung, keine Reparatur)", () => {
    assert.equal(X.isbn13("9783522202100"), "");
    assert.equal(X.isbn13("0804429571"), "");
  });
  test("ISBN-10 wird nach ISBN-13 umgerechnet, auch mit X", () => {
    assert.equal(X.isbn13("0-8044-2957-X"), "9780804429573");
    assert.equal(X.isbn13("080442957x"), "9780804429573");
    assert.equal(X.isbn13("3-87134-710-8"), "9783871347108");
  });
  test("Unsinn, leer, falsche Länge", () => {
    for (const v of [null, undefined, "", "abc", "12345", "97835222021070", "X783522202107"]) assert.equal(X.isbn13(v), "", String(v));
  });
});

describe("extract mit synthetischer Datenbank", () => {
  let r, log;
  before(async () => {
    const db = await T.bibliothek();
    log = spion(db);
    try { r = X.extract(db); } finally { db.close(); }
  });

  test("nur Bücher und Graphic Novels, Reihenfolge alphabetisch (Satzzeichen am Anfang ignoriert)", () => {
    assert.deepEqual(r.books.map(b => b.t), T.ERWARTET);
  });

  test("nur Whitelist-Felder in der Ausgabe", () => {
    for (const b of r.books) for (const k of Object.keys(b)) assert.ok(ERLAUBT.has(k), "Feld " + k);
  });

  test("leere Felder werden weggelassen", () => {
    for (const b of r.books) for (const [k, v] of Object.entries(b)) {
      assert.ok(v !== "" && v != null && !(Array.isArray(v) && !v.length), b.t + "." + k);
    }
  });

  test("keine Personen- oder Ausleihdaten im Ergebnis", () => {
    const json = JSON.stringify(r.books);
    for (const s of ["Erika", "Musterfrau", "7a", "GEHEIME-NOTIZ", "geheim", "10.0.0.1", "example.org", "DE00"]) {
      assert.ok(!json.includes(s), "enthält " + s);
    }
  });

  test("Ausleihspalten werden nie gelesen, nur gezählt", () => {
    for (const s of log) {
      const lc = s.toLowerCase();
      const treffer = AUSLEIH.filter(c => new RegExp('"' + c + '"|\\b' + c + "\\b").test(lc));
      if (treffer.length) assert.match(s, /^SELECT COUNT\(\*\) AS n FROM books WHERE TRIM\(COALESCE\("(verliehenan|vorgemerktan|bdonatedby)",''\)\)<>''$/, s);
    }
  });

  test("Spalten außerhalb der Whitelist (z. B. bnotiz) werden nicht abgefragt", () => {
    const sel = log.find(s => /^SELECT .* FROM books$/.test(s));
    assert.ok(sel, "Abfrage der Büchertabelle");
    const cols = sel.slice(7, sel.indexOf(" FROM")).split(",").map(c => c.replace(/"/g, ""));
    const whitelist = ["bid", "btitel", "butitel", "bautor", "bautor2", "bautor3", "bverlag", "bisbn", "bisbn13",
      "bjahr", "bbereich", "bstandort", "bmedientyp", "deleted", "abgang", "verlust", "verkauft"];
    for (const c of cols) assert.ok(whitelist.includes(c), "Spalte " + c);
    assert.ok(!log.some(s => /SELECT \*/i.test(s)), "kein SELECT *");
  });

  test("Personentabellen: nur Zählung, einzige Ausnahme Namensabgleich (lname, lvorname)", () => {
    for (const s of log) {
      const m = /FROM "?(\w+)"?/i.exec(s);
      if (!m || !PERSONEN.includes(m[1].toLowerCase())) continue;
      const ok = /^SELECT COUNT\(\*\) AS n FROM /.test(s) || s === "SELECT lname AS n, lvorname AS v FROM leiher";
      assert.ok(ok, s);
    }
    // Andere Leserspalten nie gelesen
    assert.ok(!log.some(s => /lemail|lgebtag|lpassword|upass|\bip\b/i.test(s)));
  });

  test("Mehrfachexemplare (Titel + Erstautor) zusammengefasst, Standorte und ISBN vereint", () => {
    const k = r.books.filter(b => b.t === "Krabat");
    assert.equal(k.length, 1);
    assert.deepEqual(k[0].i, ["9783522202107", "9783522176507"]);
    assert.deepEqual(k[0].s, ["Jugendbücher 6 Brett 5", "Geschichte Regal 2 Brett 4"]);
    assert.equal(k[0].u, "Roman");
    assert.equal(k[0].v, "Thienemann");
  });

  test("Autor „Nachname, Vorname“ → „Vorname Nachname“, doppelte Autoren nur einmal", () => {
    assert.deepEqual(r.books.find(b => b.t === "Krabat").a, ["Otfried Preußler"]);
    assert.deepEqual(r.books.find(b => b.t === "Gemeinsames Buch").a, ["Otfried Preußler", "Erich Kästner"]);
    assert.deepEqual(r.books.find(b => b.t === "Ätherische Tage").a, ["Max Mustermann"]);
  });

  test("Platzhalter wie „keine Angabe“ / „k. A.“ / „o. J.“ werden leer", () => {
    const b = r.books.find(x => x.t === "Anonyme Gedichte");
    assert.deepEqual(Object.keys(b), ["t"]);
  });

  test("Jahr aus Freitext, ISBN geprüft", () => {
    const t = r.books.find(b => b.t === "Tschick");
    assert.equal(t.j, "2010");
    assert.deepEqual(t.i, ["9783871347108"]);
    assert.equal(r.books.find(b => b.t === "Émile und die Detektive").j, "1929");
    assert.deepEqual(r.books.find(b => b.t === "Émile und die Detektive").i, ["9780804429573"]);
    assert.equal(r.books.find(b => b.t === "Das doppelte Lottchen").i, undefined, "falsche Prüfziffer → keine ISBN");
  });

  test("Standort- und Kategorienamen mit Leser-Namen werden entfernt", () => {
    const t = r.books.find(b => b.t === "Tschick");
    assert.equal(t.k, undefined);
    assert.equal(t.s, undefined);
    assert.equal(r.report.nameRemoved, 2);
  });

  test("Autor mit Leser-Namen bleibt, wird aber als Treffer gemeldet", () => {
    assert.equal(r.report.nameHits, 1);
  });

  test("Bericht: Zählungen", () => {
    const p = r.report;
    assert.equal(p.records, 16);
    assert.equal(p.nonBook, 2);
    assert.equal(p.gone, 4);
    assert.equal(p.untitled, 1);
    assert.equal(p.books, 8);
    assert.equal(p.merged, 1);
    assert.equal(p.withIsbn, 3);
    assert.equal(p.namedLoans, 3);
    assert.deepEqual(p.loanColumns.sort(), ["bdonatedby", "bverliehen", "verliehenan", "verliehenanklasse", "vorgemerktan"]);
    assert.deepEqual(p.removedTables, [
      { table: "leiher", key: "leser", rows: 3 },
      { table: "vorgaenge", key: "ausleihen", rows: 2 },
      { table: "users", key: "benutzer", rows: 1 },
      { table: "sessions", key: "sitzungen", rows: 1 },
    ]);
  });
});

describe("extract: Fehlerfälle", () => {
  test("SQLite ohne Büchertabelle → not_library_db", async () => {
    const db = await T.keineBibliothek();
    try { assert.throws(() => X.extract(db), e => e.code === "not_library_db"); } finally { db.close(); }
  });
  test("Datenbank ohne Leser-Tabelle: kein Abgleich, keine Fehler", async () => {
    const db = await T.bibliothek();
    db.run("DROP TABLE leiher");
    try {
      const r = X.extract(db);
      assert.equal(r.report.nameHits, 0);
      assert.equal(r.report.nameRemoved, 0);
      // Ohne Abgleich bleiben die Namen in Kategorie/Standort – deshalb ist der Abgleich wichtig
      assert.equal(r.books.find(b => b.t === "Tschick").k, "Sammlung Erika Musterfrau");
    } finally { db.close(); }
  });
});

describe("toScript", () => {
  const res = { books: [{ t: "A</script><b>", a: ["X"] }, { t: "B" }] };
  test("Format window.DSM_BIBLIOTHEK, Stand, Anzahl", () => {
    const s = X.toScript(res, { stand: "2026-01-02" });
    assert.match(s, /^\/\*.*nicht von Hand bearbeiten\. \*\/\nwindow\.DSM_BIBLIOTHEK = \{.*\};\n$/s);
    const w = {}; new Function("window", s)(w);
    assert.deepEqual(w.DSM_BIBLIOTHEK, { stand: "2026-01-02", anzahl: 2, buecher: res.books });
  });
  test("„<“ wird maskiert (kein </script> in der Datei)", () => {
    const s = X.toScript(res, { stand: "2026-01-02" });
    assert.ok(!s.includes("<"));
    assert.ok(s.includes("\\u003c/script>"));
  });
  test("Abdeckung und Verlauf vor buecher, Reihenfolge der Schlüssel fest", () => {
    const s = X.toScript(res, { stand: "2026-01-02", abdeckung: { isbn: 1 }, verlauf: [{ stand: "2025-01-01" }] });
    const w = {}; new Function("window", s)(w);
    assert.deepEqual(Object.keys(w.DSM_BIBLIOTHEK), ["stand", "anzahl", "abdeckung", "verlauf", "buecher"]);
  });
  test("ohne Stand: heutiges Datum", () => {
    const w = {}; new Function("window", X.toScript(res))(w);
    assert.match(w.DSM_BIBLIOTHEK.stand, /^\d{4}-\d{2}-\d{2}$/);
  });
});
