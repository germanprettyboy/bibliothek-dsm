/*
 * extract.js – reads a WinBIAP library database (SQLite) and produces
 * the public book list. Works on the whitelist principle:
 * only core bibliographic data is read. Reader, loan, fee, user and
 * session data are never read, only counted, so the report can show
 * what was discarded.
 *
 * Runs in the browser (window.DSMExtract) and in Node (module.exports).
 * Expects an sql.js database (db.exec).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DSMExtract = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Tables with personal or transaction data: only counted, never read (WinBIAP table name, report key).
  const PERSONAL_TABLES = [
    ["leiher", "readers"],
    ["leihergruppen_leiher", "readerGroups"],
    ["vorgaenge", "loans"],
    ["history", "loanHistory"],
    ["vormerkungen", "reservations"],
    ["gebuehren", "fees"],
    ["gebuehren_history", "fees"],
    ["ausgabe_books", "issues"],
    ["umlauf_leiher", "circulation"],
    ["umlauf_medium", "circulation"],
    ["users", "users"],
    ["sessions", "sessions"],
    ["termine", "appointments"],
    ["klient", "clients"],
    ["rechnungen", "invoices"],
    ["besucher", "visitors"],
    ["filelinks", "files"],
    ["bewertungen", "ratings"],
    ["favoriten", "favorites"],
  ];

  // Columns of the books table with loan status or a link to readers: never read.
  const LOAN_COLUMNS = [
    "bverliehen", "bvorgemerkt", "bverfuegbar", "bausleihhinweis", "verltime", "rucktime",
    "verliehenan", "verliehenanklasse", "vormerkungvon", "vormerkungbis", "vorgemerktan",
    "exemplarverliehen", "exemplarvorgemerkt", "banzahlausleihen", "bdonatedby", "klient",
  ];
  // Columns with reader names (counted for the report).
  const NAME_COLUMNS = ["verliehenan", "vorgemerktan", "bdonatedby"];

  // Media types that count as a book (WinBIAP values).
  const BOOK_TYPES = ["buch", "graphic novel", "comic", "manga", "taschenbuch", "sachbuch"];
  const EMPTY = /^\s*(keine angabe|k\.\s*a\.|unbekannt|-+|\?+)?\s*$/i;

  function rows(db, sql) {
    const r = db.exec(sql);
    if (!r.length) return [];
    const cols = r[0].columns;
    return r[0].values.map(v => {
      const o = {};
      cols.forEach((c, i) => (o[c] = v[i]));
      return o;
    });
  }
  const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  const clean = s => {
    if (s == null) return "";
    const t = String(s).replace(/\s+/g, " ").trim();
    return EMPTY.test(t) ? "" : t;
  };
  const norm = s => clean(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();

  function authorDisplay(name) {
    const n = clean(name);
    if (!n) return "";
    const parts = n.split(",").map(p => p.trim()).filter(Boolean);
    return parts.length === 2 ? parts[1] + " " + parts[0] : n;
  }

  function isbn13(raw) {
    if (!raw) return "";
    const s = String(raw).toUpperCase().replace(/[^0-9X]/g, "");
    if (s.length === 13 && /^\d{13}$/.test(s)) {
      let sum = 0;
      for (let i = 0; i < 12; i++) sum += +s[i] * (i % 2 ? 3 : 1);
      return (10 - (sum % 10)) % 10 === +s[12] ? s : "";
    }
    if (s.length === 10 && /^\d{9}[\dX]$/.test(s)) {
      let sum = 0;
      for (let i = 0; i < 10; i++) sum += (s[i] === "X" ? 10 : +s[i]) * (10 - i);
      if (sum % 11) return "";
      const base = "978" + s.slice(0, 9);
      let t = 0;
      for (let i = 0; i < 12; i++) t += +base[i] * (i % 2 ? 3 : 1);
      return base + ((10 - (t % 10)) % 10);
    }
    return "";
  }

  function year(raw) {
    const m = String(raw || "").match(/\b(1[5-9]\d\d|20\d\d)\b/);
    return m ? m[1] : "";
  }

  function extract(db, opts = {}) {
    const tables = new Set(rows(db, "SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name.toLowerCase()));
    const colsOf = t => tables.has(t) ? new Set(rows(db, "PRAGMA table_info(" + q(t) + ")").map(r => r.name.toLowerCase())) : new Set();
    const bcols = colsOf("books");
    if (!bcols.has("btitel")) {
      const e = new Error("Not a library database: table books with column btitel is missing.");
      e.code = "not_library_db";
      throw e;
    }
    const has = c => bcols.has(c);

    // Report: what personal data does the file contain?
    const removed = [];
    for (const [t, key] of PERSONAL_TABLES) {
      if (!tables.has(t)) continue;
      const n = rows(db, "SELECT COUNT(*) AS n FROM " + q(t))[0].n;
      if (n) removed.push({ table: t, key, rows: n });
    }
    const loanCols = LOAN_COLUMNS.filter(has);
    let namedLoans = 0;
    for (const c of NAME_COLUMNS.filter(has)) {
      namedLoans += rows(db, `SELECT COUNT(*) AS n FROM books WHERE TRIM(COALESCE(${q(c)},''))<>''`)[0].n;
    }

    // Lookup tables (names only)
    const lookup = (t, id, name) => {
      const m = new Map();
      const c = colsOf(t);
      if (c.has(id) && c.has(name)) for (const r of rows(db, `SELECT ${q(id)} AS i, ${q(name)} AS n FROM ${q(t)}`)) m.set(r.i, clean(r.n));
      return m;
    };
    const author = lookup("autor", "aid", "aname");
    const publisher = lookup("verlage", "vid", "vname");
    const category = lookup("bereiche", "bid", "bname");
    const location = lookup("standorte", "stid", "stname");
    const mediaType = lookup("medientyp", "typid", "typname");

    // Whitelist of the book columns that are read
    const want = ["bid", "btitel", "butitel", "bautor", "bautor2", "bautor3", "bverlag", "bisbn", "bisbn13",
      "bjahr", "bbereich", "bstandort", "bmedientyp", "deleted", "abgang", "verlust", "verkauft"].filter(has);
    const src = rows(db, "SELECT " + want.map(q).join(",") + " FROM books");

    const stats = { records: src.length, nonBook: 0, gone: 0, untitled: 0 };
    const byKey = new Map();
    for (const r of src) {
      if (r.deleted == 1 || r.abgang == 1 || r.verlust == 1 || r.verkauft == 1) { stats.gone++; continue; }
      if (has("bmedientyp")) {
        const type = (mediaType.get(r.bmedientyp) || "").toLowerCase();
        if (!BOOK_TYPES.includes(type)) { stats.nonBook++; continue; }
      }
      const t = clean(r.btitel);
      if (!t) { stats.untitled++; continue; }
      const authors = [r.bautor, r.bautor2, r.bautor3].map(id => authorDisplay(author.get(id)))
        .filter((a, i, arr) => a && arr.indexOf(a) === i);
      const isbns = [r.bisbn13, r.bisbn].map(isbn13).filter((x, i, arr) => x && arr.indexOf(x) === i);
      // t title, s subtitle, a authors, p publisher, y year, i ISBNs, c category, l locations
      const b = {
        t,
        s: clean(r.butitel),
        a: authors,
        p: clean(publisher.get(r.bverlag)),
        y: year(r.bjahr),
        i: isbns,
        c: clean(category.get(r.bbereich)),
        l: [clean(location.get(r.bstandort))].filter(Boolean),
      };
      const key = norm(t) + "|" + norm(authors[0] || "");
      const prev = byKey.get(key);
      if (!prev) { byKey.set(key, b); continue; }
      for (const f of ["s", "p", "y", "c"]) if (!prev[f] && b[f]) prev[f] = b[f];
      for (const f of ["a", "i", "l"]) for (const x of b[f]) if (!prev[f].includes(x)) prev[f].push(x);
    }

    // Cross-check: do full reader names occur in the public fields?
    // Only counted in the report; category and location names with a hit are removed.
    let nameHits = 0, nameRemoved = 0;
    const lc = colsOf("leiher");
    if (lc.has("lname") && lc.has("lvorname")) {
      const names = [];
      for (const r of rows(db, "SELECT lname AS n, lvorname AS v FROM leiher")) {
        const n = norm(r.n), v = norm(r.v);
        if (n.length >= 2 && v.length >= 2) names.push(v + " " + n, n + " " + v);
      }
      if (names.length) {
        const contains = s => { const x = " " + norm(s) + " "; return names.some(nm => x.includes(" " + nm + " ")); };
        for (const b of byKey.values()) {
          if (contains(b.c)) { b.c = ""; nameRemoved++; }
          const l0 = b.l.length; b.l = b.l.filter(s => !contains(s)); nameRemoved += l0 - b.l.length;
          if ([b.t, b.s, b.p, ...b.a].some(contains)) nameHits++;
        }
      }
    }

    const coll = new Intl.Collator("de", { sensitivity: "base", numeric: true });
    const sortKey = s => s.replace(/^[^\p{L}\p{N}]+/u, "");
    const books = [...byKey.values()].sort((x, y) => coll.compare(sortKey(x.t), sortKey(y.t)) || coll.compare(x.a[0] || "", y.a[0] || ""));
    // leave out empty fields (smaller file)
    for (const b of books) for (const f of Object.keys(b)) if (!b[f] || (Array.isArray(b[f]) && !b[f].length)) delete b[f];

    return {
      books,
      report: {
        records: stats.records, books: books.length, nonBook: stats.nonBook, gone: stats.gone, untitled: stats.untitled,
        merged: stats.records - stats.nonBook - stats.gone - stats.untitled - books.length,
        withIsbn: books.filter(b => b.i).length,
        removedTables: removed, loanColumns: loanCols, namedLoans, nameHits, nameRemoved,
      },
    };
  }

  // Produces the content of books.js
  function toScript(result, meta = {}) {
    const data = { updated: meta.updated || new Date().toISOString().slice(0, 10), count: result.books.length };
    if (meta.coverage) data.coverage = meta.coverage;
    if (meta.history) data.history = meta.history;
    data.books = result.books;
    return "/* Book list of the library of the Deutsche Schule Mailand. Generated by admin.html – do not edit by hand. */\n" +
      "window.DSM_LIBRARY = " + JSON.stringify(data).replace(/</g, "\\u003c") + ";\n";
  }

  return { extract, toScript, isbn13, norm };
});
