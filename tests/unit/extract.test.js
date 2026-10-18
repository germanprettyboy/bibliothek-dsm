/* Extraction from the WinBIAP database: whitelist, no personal data, merging, sort order, output format. */
"use strict";
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const X = require("../../tools/source/extract.js");
const T = require("../helpers/testdb.js");

const ALLOWED = new Set(["t", "s", "a", "p", "y", "i", "c", "l"]);
const LOAN = ["bverliehen", "bvorgemerkt", "bverfuegbar", "bausleihhinweis", "verltime", "rucktime", "verliehenan",
  "verliehenanklasse", "vormerkungvon", "vormerkungbis", "vorgemerktan", "exemplarverliehen", "exemplarvorgemerkt",
  "banzahlausleihen", "bdonatedby", "klient"];
const PERSONAL = ["leiher", "vorgaenge", "history", "vormerkungen", "gebuehren", "users", "sessions", "rechnungen", "besucher"];

// Database that records every SQL statement
function spy(db) {
  const log = [];
  const exec = db.exec.bind(db);
  db.exec = s => { log.push(s); return exec(s); };
  return log;
}

describe("isbn13", () => {
  test("a valid ISBN-13 stays, separators are dropped", () => {
    assert.equal(X.isbn13("9783522202107"), "9783522202107");
    assert.equal(X.isbn13("978-3-87134-710-8"), "9783871347108");
    assert.equal(X.isbn13(" 978 3 522 17650 7 "), "9783522176507");
  });
  test("a wrong check digit is discarded (no completion, no repair)", () => {
    assert.equal(X.isbn13("9783522202100"), "");
    assert.equal(X.isbn13("0804429571"), "");
  });
  test("ISBN-10 is converted to ISBN-13, also with X", () => {
    assert.equal(X.isbn13("0-8044-2957-X"), "9780804429573");
    assert.equal(X.isbn13("080442957x"), "9780804429573");
    assert.equal(X.isbn13("3-87134-710-8"), "9783871347108");
  });
  test("nonsense, empty, wrong length", () => {
    for (const v of [null, undefined, "", "abc", "12345", "97835222021070", "X783522202107"]) assert.equal(X.isbn13(v), "", String(v));
  });
});

describe("extract with a synthetic database", () => {
  let r, log;
  before(async () => {
    const db = await T.library();
    log = spy(db);
    try { r = X.extract(db); } finally { db.close(); }
  });

  test("only books and graphic novels, alphabetical order (punctuation at the start ignored)", () => {
    assert.deepEqual(r.books.map(b => b.t), T.EXPECTED);
  });

  test("only whitelist fields in the output", () => {
    for (const b of r.books) for (const k of Object.keys(b)) assert.ok(ALLOWED.has(k), "field " + k);
  });

  test("empty fields are left out", () => {
    for (const b of r.books) for (const [k, v] of Object.entries(b)) {
      assert.ok(v !== "" && v != null && !(Array.isArray(v) && !v.length), b.t + "." + k);
    }
  });

  test("no personal or loan data in the result", () => {
    const json = JSON.stringify(r.books);
    for (const s of ["Erika", "Musterfrau", "7a", "GEHEIME-NOTIZ", "geheim", "10.0.0.1", "example.org", "DE00"]) {
      assert.ok(!json.includes(s), "contains " + s);
    }
  });

  test("loan columns are never read, only counted", () => {
    for (const s of log) {
      const lc = s.toLowerCase();
      const hits = LOAN.filter(c => new RegExp('"' + c + '"|\\b' + c + "\\b").test(lc));
      if (hits.length) assert.match(s, /^SELECT COUNT\(\*\) AS n FROM books WHERE TRIM\(COALESCE\("(verliehenan|vorgemerktan|bdonatedby)",''\)\)<>''$/, s);
    }
  });

  test("columns outside the whitelist (e.g. bnotiz) are not queried", () => {
    const sel = log.find(s => /^SELECT .* FROM books$/.test(s));
    assert.ok(sel, "query of the books table");
    const cols = sel.slice(7, sel.indexOf(" FROM")).split(",").map(c => c.replace(/"/g, ""));
    const whitelist = ["bid", "btitel", "butitel", "bautor", "bautor2", "bautor3", "bverlag", "bisbn", "bisbn13",
      "bjahr", "bbereich", "bstandort", "bmedientyp", "deleted", "abgang", "verlust", "verkauft"];
    for (const c of cols) assert.ok(whitelist.includes(c), "column " + c);
    assert.ok(!log.some(s => /SELECT \*/i.test(s)), "no SELECT *");
  });

  test("personal tables: only counted, the only exception is the name check (lname, lvorname)", () => {
    for (const s of log) {
      const m = /FROM "?(\w+)"?/i.exec(s);
      if (!m || !PERSONAL.includes(m[1].toLowerCase())) continue;
      const ok = /^SELECT COUNT\(\*\) AS n FROM /.test(s) || s === "SELECT lname AS n, lvorname AS v FROM leiher";
      assert.ok(ok, s);
    }
    // other reader columns never read
    assert.ok(!log.some(s => /lemail|lgebtag|lpassword|upass|\bip\b/i.test(s)));
  });

  test("multiple copies (title + first author) merged, locations and ISBNs combined", () => {
    const k = r.books.filter(b => b.t === "Krabat");
    assert.equal(k.length, 1);
    assert.deepEqual(k[0].i, ["9783522202107", "9783522176507"]);
    assert.deepEqual(k[0].l, ["Jugendbücher 6 Brett 5", "Geschichte Regal 2 Brett 4"]);
    assert.equal(k[0].s, "Roman");
    assert.equal(k[0].p, "Thienemann");
  });

  test('author "Last, First" → "First Last", duplicate authors only once', () => {
    assert.deepEqual(r.books.find(b => b.t === "Krabat").a, ["Otfried Preußler"]);
    assert.deepEqual(r.books.find(b => b.t === "Gemeinsames Buch").a, ["Otfried Preußler", "Erich Kästner"]);
    assert.deepEqual(r.books.find(b => b.t === "Ätherische Tage").a, ["Max Mustermann"]);
  });

  test('placeholders like "keine Angabe" / "k. A." / "o. J." become empty', () => {
    const b = r.books.find(x => x.t === "Anonyme Gedichte");
    assert.deepEqual(Object.keys(b), ["t"]);
  });

  test("year from free text, ISBN checked", () => {
    const t = r.books.find(b => b.t === "Tschick");
    assert.equal(t.y, "2010");
    assert.deepEqual(t.i, ["9783871347108"]);
    assert.equal(r.books.find(b => b.t === "Émile und die Detektive").y, "1929");
    assert.deepEqual(r.books.find(b => b.t === "Émile und die Detektive").i, ["9780804429573"]);
    assert.equal(r.books.find(b => b.t === "Das doppelte Lottchen").i, undefined, "wrong check digit → no ISBN");
  });

  test("location and category names with reader names are removed", () => {
    const t = r.books.find(b => b.t === "Tschick");
    assert.equal(t.c, undefined);
    assert.equal(t.l, undefined);
    assert.equal(r.report.nameRemoved, 2);
  });

  test("an author with a reader's name stays but is reported as a hit", () => {
    assert.equal(r.report.nameHits, 1);
  });

  test("report: counts", () => {
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
      { table: "leiher", key: "readers", rows: 3 },
      { table: "vorgaenge", key: "loans", rows: 2 },
      { table: "users", key: "users", rows: 1 },
      { table: "sessions", key: "sessions", rows: 1 },
    ]);
  });
});

describe("extract: error cases", () => {
  test("SQLite without a books table → not_library_db", async () => {
    const db = await T.noLibrary();
    try { assert.throws(() => X.extract(db), e => e.code === "not_library_db"); } finally { db.close(); }
  });
  test("database without a readers table: no check, no errors", async () => {
    const db = await T.library();
    db.run("DROP TABLE leiher");
    try {
      const r = X.extract(db);
      assert.equal(r.report.nameHits, 0);
      assert.equal(r.report.nameRemoved, 0);
      // without the check the names stay in category/location – that's why the check matters
      assert.equal(r.books.find(b => b.t === "Tschick").c, "Sammlung Erika Musterfrau");
    } finally { db.close(); }
  });
});

describe("toScript", () => {
  const res = { books: [{ t: "A</script><b>", a: ["X"] }, { t: "B" }] };
  test("format window.DSM_LIBRARY, date, count", () => {
    const s = X.toScript(res, { updated: "2026-01-02" });
    assert.match(s, /^\/\*.*do not edit by hand\. \*\/\nwindow\.DSM_LIBRARY = \{.*\};\n$/s);
    const w = {}; new Function("window", s)(w);
    assert.deepEqual(w.DSM_LIBRARY, { updated: "2026-01-02", count: 2, books: res.books });
  });
  test('"<" is escaped (no </script> in the file)', () => {
    const s = X.toScript(res, { updated: "2026-01-02" });
    assert.ok(!s.includes("<"));
    assert.ok(s.includes("\\u003c/script>"));
  });
  test("coverage and history before books, fixed key order", () => {
    const s = X.toScript(res, { updated: "2026-01-02", coverage: { isbn: 1 }, history: [{ updated: "2025-01-01" }] });
    const w = {}; new Function("window", s)(w);
    assert.deepEqual(Object.keys(w.DSM_LIBRARY), ["updated", "count", "coverage", "history", "books"]);
  });
  test("without a date: today's date", () => {
    const w = {}; new Function("window", X.toScript(res))(w);
    assert.match(w.DSM_LIBRARY.updated, /^\d{4}-\d{2}-\d{2}$/);
  });
});
