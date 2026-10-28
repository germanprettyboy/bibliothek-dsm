/* Extraction from the WinBook database: whitelist, no personal data, merging, sort order, output format. */
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
  test("Italian category names and blocked covers: after history, only when not empty", () => {
    const w = {};
    new Function("window", X.toScript(res, { updated: "2026-01-02", history: [], catIt: { Krimi: "Gialli" }, noCover: ["9783522202107"] }))(w);
    assert.deepEqual(Object.keys(w.DSM_LIBRARY), ["updated", "count", "history", "catIt", "noCover", "books"]);
    const v = {};
    new Function("window", X.toScript(res, { updated: "2026-01-02", catIt: {}, noCover: [] }))(v);
    assert.deepEqual(Object.keys(v.DSM_LIBRARY), ["updated", "count", "books"]);
  });
});

describe("inspect: maintenance lists (admin page only)", () => {
  let r, log;
  const INSPECT = ["bid", "btitel", "bautor", "bautor2", "bautor3", "bverlag", "bisbn", "bisbn13", "bjahr", "bbereich",
    "bstandort", "bmedientyp", "bsignatur", "bzugang", "deleted", "abgang", "verlust", "verkauft"];
  const check = key => r.checks.find(c => c.key === key).rows;
  const ids = key => check(key).map(x => x.r.id);
  before(async () => {
    const db = await T.library();
    log = spy(db);
    try { r = X.inspect(db); } finally { db.close(); }
  });

  test("reads only maintenance columns of the books table: no loan, reader, price or note columns", () => {
    const sel = log.filter(s => /^SELECT .* FROM books$/.test(s));
    assert.equal(sel.length, 1);
    const cols = sel[0].slice(7, sel[0].indexOf(" FROM")).split(",").map(c => c.replace(/"/g, ""));
    for (const c of cols) assert.ok(INSPECT.includes(c), "column " + c);
    for (const s of log) {
      const lc = s.toLowerCase();
      assert.ok(!LOAN.some(c => new RegExp('"' + c + '"|\\b' + c + "\\b").test(lc)), s);
      assert.ok(!/bnotiz|bpreis|SELECT \*/i.test(s), s);
      const m = /FROM "?(\w+)"?/i.exec(s);
      if (m && PERSONAL.includes(m[1].toLowerCase())) assert.equal(s, "SELECT lname AS n, lvorname AS v FROM leiher");
    }
  });

  test("one record per copy that the public list is built from (books and graphic novels, not withdrawn)", () => {
    assert.deepEqual(r.records.map(x => x.id).sort((a, b) => a - b), [1, 2, 3, 4, 8, 9, 10, 11, 13, 14]);
    assert.deepEqual(r.records.find(x => x.id === 1), { id: 1, t: "Krabat", a: "Otfried Preußler", p: "Thienemann", y: "1981",
      c: "Jugendbuch", l: "Jugendbücher 6 Brett 5", sig: "JB 6 Pre", z: "2025-09-01", i: ["9783522202107"] });
    assert.deepEqual(r.records.find(x => x.id === 11).i, ["9780804429573"], "ISBN-10 as ISBN-13");
    assert.deepEqual(r.records.find(x => x.id === 4).i, [], "an invalid ISBN is no ISBN");
    assert.equal(r.latest, "2026-03-15");
    assert.deepEqual(r.types, [{ name: "Buch", n: 9, book: true }, { name: "DVD", n: 1, book: false },
      { name: "Graphic Novel", n: 1, book: true }, { name: "Hörbuch", n: 1, book: false }]);
  });

  test("no reader names: category and location names with a name only as their number", () => {
    const json = JSON.stringify(r);
    for (const s of ["Erika", "Musterfrau", "7a", "GEHEIME-NOTIZ", "geheim", "12,90", "DE00"]) assert.ok(!json.includes(s), "contains " + s);
    const t = r.records.find(x => x.id === 3);
    assert.equal(t.c, "");
    assert.equal(t.l, "");
    assert.deepEqual(check("namedCategory"), [{ v: "#2", n: 1 }]);
    assert.deepEqual(check("namedLocation"), [{ v: "#2", n: 1 }]);
  });

  test("ISBN: invalid value reported as it is, missing ISBN, no completion", () => {
    assert.deepEqual(check("isbnBad").map(x => [x.r.id, x.v]), [[4, "9783522202100"]]);
    assert.deepEqual(ids("isbnNone").sort((a, b) => a - b), [8, 9, 10, 13, 14]);
    assert.deepEqual(check("isbnShared"), []);
  });

  test('year: missing (also "o. J.") or not written as a plain year', () => {
    assert.deepEqual(check("yearOdd").map(x => [x.r.id, x.v]), [[11, "um 1929"], [3, "2010 (1. Aufl.)"]]);
    assert.equal(check("yearNone").find(x => x.r.id === 13).v, "o. J.");
    assert.ok(!ids("yearNone").includes(1));
  });

  test("authors, titles, category, location", () => {
    assert.deepEqual(ids("authorNone"), [13]);
    assert.deepEqual(check("authorFormat"), [{ v: "Max Mustermann", n: 1 }]);
    assert.deepEqual(ids("titleNone"), [8]);
    assert.deepEqual(check("titleSpaces").map(x => [x.r.id, x.v]), [[2, "„  Krabat “"]]);
    assert.deepEqual(check("titleCaps"), []);
    assert.ok(ids("categoryNone").includes(2));
    assert.ok(!ids("categoryNone").includes(3), "a category hidden by the name check still exists in WinBook");
    assert.ok(ids("locationNone").includes(11));
  });

  test("copies of one book with different category or location", () => {
    assert.deepEqual(check("copiesCategory").map(x => [x.r.id, x.v]), [[1, "Jugendbuch"], [2, ""]]);
    assert.deepEqual(check("copiesLocation").map(x => [x.r.id, x.v]), [[1, "Jugendbücher 6 Brett 5"], [2, "Geschichte Regal 2 Brett 4"]]);
  });

  test("master data: spelling duplicates with their copies, unused entries", () => {
    assert.deepEqual(check("authorDup"), [{ v: "Preußler, Otfried · preussler, Otfried", n: 3 }]);
    assert.deepEqual(check("publisherDup"), [{ v: "Thienemann · thienemann", n: 1 }]);
    assert.deepEqual(check("categoryDup"), []);
    assert.deepEqual(check("categoryUnused"), [{ v: "Ungenutzt" }]);
    assert.deepEqual(check("locationUnused"), [{ v: "Leeres Regal" }]);
  });

  test("every check present, in a fixed order", () => {
    assert.equal(r.checks.length, 22);
    assert.equal(r.checks[0].key, "isbnBad");
  });

  test("not a library database → not_library_db", async () => {
    const db = await T.noLibrary();
    try { assert.throws(() => X.inspect(db), e => e.code === "not_library_db"); } finally { db.close(); }
  });
});
