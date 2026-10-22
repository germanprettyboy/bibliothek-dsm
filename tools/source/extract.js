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

  // Tables and columns of the database; throws not_library_db without books.btitel
  function schema(db) {
    const tables = new Set(rows(db, "SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name.toLowerCase()));
    const colsOf = t => tables.has(t) ? new Set(rows(db, "PRAGMA table_info(" + q(t) + ")").map(r => r.name.toLowerCase())) : new Set();
    const bcols = colsOf("books");
    if (!bcols.has("btitel")) {
      const e = new Error("Not a library database: table books with column btitel is missing.");
      e.code = "not_library_db";
      throw e;
    }
    // Lookup tables (names only)
    const lookup = (t, id, name) => {
      const m = new Map();
      const c = colsOf(t);
      if (c.has(id) && c.has(name)) for (const r of rows(db, `SELECT ${q(id)} AS i, ${q(name)} AS n FROM ${q(t)}`)) m.set(r.i, clean(r.n));
      return m;
    };
    return { tables, colsOf, has: c => bcols.has(c), lookup };
  }

  // Full reader names (both orders, normalized) for the cross-check; the only statement that reads the readers table
  function readerNames(db, colsOf) {
    const names = [];
    const lc = colsOf("leiher");
    if (lc.has("lname") && lc.has("lvorname")) {
      for (const r of rows(db, "SELECT lname AS n, lvorname AS v FROM leiher")) {
        const n = norm(r.n), v = norm(r.v);
        if (n.length >= 2 && v.length >= 2) names.push(v + " " + n, n + " " + v);
      }
    }
    return names;
  }
  const containsName = names => s => { const x = " " + norm(s) + " "; return names.some(nm => x.includes(" " + nm + " ")); };

  function extract(db, opts = {}) {
    const { tables, colsOf, has, lookup } = schema(db);

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
    const nameHitTitles = [];
    const names = readerNames(db, colsOf);
    if (names.length) {
      const contains = containsName(names);
      for (const b of byKey.values()) {
        if (contains(b.c)) { b.c = ""; nameRemoved++; }
        const l0 = b.l.length; b.l = b.l.filter(s => !contains(s)); nameRemoved += l0 - b.l.length;
        if ([b.t, b.s, b.p, ...b.a].some(contains)) { nameHits++; nameHitTitles.push(b.t); }
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
        removedTables: removed, loanColumns: loanCols, namedLoans, nameHits, nameRemoved, nameHitTitles,
      },
    };
  }

  // Columns read for the maintenance lists (admin page only, never published): the public ones plus shelf mark
  // and accession date. No loan, reader, price or note columns.
  const INSPECT_COLUMNS = ["bid", "btitel", "bautor", "bautor2", "bautor3", "bverlag", "bisbn", "bisbn13", "bjahr",
    "bbereich", "bstandort", "bmedientyp", "bsignatur", "bzugang", "deleted", "abgang", "verlust", "verkauft"];
  // Order of the checks in the admin page
  const CHECKS = ["isbnBad", "isbnShared", "isbnNone", "yearOdd", "yearNone", "authorNone", "authorFormat", "titleNone",
    "titleSpaces", "titleCaps", "categoryNone", "locationNone", "copiesCategory", "copiesLocation", "authorDup",
    "publisherDup", "categoryDup", "locationDup", "categoryUnused", "locationUnused", "namedCategory", "namedLocation"];

  /*
   * Maintenance analysis for the admin page (tab "Pflege"): every copy that the public list is built from (same
   * rules as extract, but not merged) and what should be fixed in WinBIAP. Never published, only shown and
   * exported as CSV. Returns { records, checks: [{ key, rows }], types, latest }:
   *   records: one per copy { id, t, a, p, y, c, l, sig, z } (id = WinBIAP number, z = accession date YYYY-MM-DD)
   *   rows: { r: record, v? } for a copy (v = the value to fix) or { v, n } for a master data entry (n = copies)
   * Category and location names that contain a reader name are never shown, only their number (#id).
   */
  function inspect(db) {
    const { colsOf, has, lookup } = schema(db);
    const author = lookup("autor", "aid", "aname");
    const publisher = lookup("verlage", "vid", "vname");
    const category = lookup("bereiche", "bid", "bname");
    const location = lookup("standorte", "stid", "stname");
    const mediaType = lookup("medientyp", "typid", "typname");
    const contains = containsName(readerNames(db, colsOf));
    const namedCat = new Set(), namedLoc = new Set();
    const safe = (map, id, named) => { const s = map.get(id) || ""; if (s && contains(s)) { named.add(id); return ""; } return s; };

    const src = rows(db, "SELECT " + INSPECT_COLUMNS.filter(has).map(q).join(",") + " FROM books");
    const C = {};
    const add = (key, row) => (C[key] || (C[key] = [])).push(row);
    const count = (m, k) => m.set(k, (m.get(k) || 0) + 1);
    const types = new Map(), used = { c: new Set(), l: new Set() }, refs = { a: new Map(), p: new Map(), c: new Map(), l: new Map() };
    const records = [], byIsbn = new Map(), byKey = new Map(), authorFormat = new Map();
    let latest = "";
    for (const r of src) {
      used.c.add(r.bbereich); used.l.add(r.bstandort);
      if (r.deleted == 1 || r.abgang == 1 || r.verlust == 1 || r.verkauft == 1) continue;
      if (has("bmedientyp")) {
        const type = mediaType.get(r.bmedientyp) || "";
        count(types, type);
        if (!BOOK_TYPES.includes(type.toLowerCase())) continue;
      }
      const raw = r.btitel == null ? "" : String(r.btitel);
      const ids = [r.bautor, r.bautor2, r.bautor3].filter((id, i, arr) => author.get(id) && arr.indexOf(id) === i);
      const a = ids.map(id => authorDisplay(author.get(id))).filter((x, i, arr) => arr.indexOf(x) === i);
      const zugang = String(r.bzugang || "");
      const rec = {
        id: r.bid, t: clean(raw), a: a.join(", "), p: clean(publisher.get(r.bverlag)), y: year(r.bjahr),
        c: safe(category, r.bbereich, namedCat), l: safe(location, r.bstandort, namedLoc),
        sig: clean(r.bsignatur), z: /^\d{4}-\d{2}-\d{2}/.test(zugang) ? zugang.slice(0, 10) : "",
      };
      records.push(rec);
      if (rec.z > latest) latest = rec.z;
      ids.forEach(id => count(refs.a, id));
      count(refs.p, r.bverlag); count(refs.c, r.bbereich); count(refs.l, r.bstandort);
      const row = v => (v === undefined ? { r: rec } : { r: rec, v });

      if (!rec.t) add("titleNone", row());
      else {
        if (raw !== raw.replace(/\s+/g, " ").trim()) add("titleSpaces", row("„" + raw + "“"));
        const letters = rec.t.replace(/[^\p{L}]/gu, "");
        if (letters.length >= 4 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) add("titleCaps", row());
        const key = norm(rec.t) + "|" + norm(a[0] || "");
        (byKey.get(key) || byKey.set(key, []).get(key)).push(rec);
      }
      if (!a.length) add("authorNone", row());
      for (const id of ids) {
        const n = author.get(id);
        if (!n.includes(",") && n.split(" ").length >= 2) count(authorFormat, n);
      }
      const isbns = [r.bisbn13, r.bisbn].map(x => (x == null ? "" : String(x).trim())).filter(Boolean);
      if (!isbns.length) add("isbnNone", row());
      for (const x of isbns) {
        const i = isbn13(x);
        if (!i) add("isbnBad", row(x));
        else if (rec.t) { const l = byIsbn.get(i) || byIsbn.set(i, []).get(i); if (!l.includes(rec)) l.push(rec); }
      }
      const y = clean(r.bjahr);
      if (!rec.y) add("yearNone", y ? row(y) : row());
      else if (y !== rec.y) add("yearOdd", row(y));
      if (!category.get(r.bbereich)) add("categoryNone", row());
      if (!location.get(r.bstandort)) add("locationNone", row());
    }

    // Same ISBN on different titles (often volumes of a series with the ISBN of the whole set)
    for (const [i, list] of byIsbn) if (new Set(list.map(r => norm(r.t))).size > 1) list.forEach(r => add("isbnShared", { r, v: i }));
    // Copies of one book (title + first author) with different category or location
    for (const list of byKey.values()) {
      if (list.length < 2) continue;
      if (new Set(list.map(r => r.c)).size > 1) list.forEach(r => add("copiesCategory", { r, v: r.c }));
      if (new Set(list.map(r => r.l)).size > 1) list.forEach(r => add("copiesLocation", { r, v: r.l }));
    }
    for (const [v, n] of authorFormat) add("authorFormat", { v, n });
    // Master data entries that only differ in spelling (case, spaces, accents): one row per group
    const dups = (key, map, ref, hide) => {
      const groups = new Map();
      for (const [id, name] of map) if (name) { const k = norm(name); (groups.get(k) || groups.set(k, []).get(k)).push(id); }
      for (const ids of groups.values()) {
        if (ids.length < 2) continue;
        add(key, { v: ids.map(id => (hide && contains(map.get(id)) ? "#" + id : map.get(id))).join(" · "), n: ids.reduce((s, id) => s + (ref.get(id) || 0), 0) });
      }
    };
    dups("authorDup", author, refs.a);
    dups("publisherDup", publisher, refs.p);
    dups("categoryDup", category, refs.c, true);
    dups("locationDup", location, refs.l, true);
    // Never used by any record (also not by other media or withdrawn copies): can be deleted in WinBIAP
    for (const [id, name] of category) if (name && !used.c.has(id)) add("categoryUnused", { v: contains(name) ? "#" + id : name });
    for (const [id, name] of location) if (name && !used.l.has(id)) add("locationUnused", { v: contains(name) ? "#" + id : name });
    namedCat.forEach(id => add("namedCategory", { v: "#" + id, n: refs.c.get(id) || 0 }));
    namedLoc.forEach(id => add("namedLocation", { v: "#" + id, n: refs.l.get(id) || 0 }));

    const coll = new Intl.Collator("de", { sensitivity: "base", numeric: true });
    const byTitle = (x, y) => coll.compare(x.r.t, y.r.t) || coll.compare(x.r.a, y.r.a) || (x.r.id > y.r.id ? 1 : -1);
    const checks = CHECKS.map(key => {
      const list = C[key] || [];
      if (list.length && list[0].r) {
        // groups (shared ISBN) stay together, sorted by their value
        list.sort(key === "isbnShared" ? (x, y) => (x.v < y.v ? -1 : x.v > y.v ? 1 : byTitle(x, y)) : byTitle);
      } else list.sort((x, y) => coll.compare(x.v, y.v));
      return { key, rows: list };
    });
    return {
      records, checks, latest,
      types: [...types].map(([name, n]) => ({ name, n, book: BOOK_TYPES.includes(name.toLowerCase()) })).sort((x, y) => y.n - x.n),
    };
  }

  // Produces the content of books.js (catIt: Italian names of new categories, noCover: ISBNs with a wrong cover; both from admin.html)
  function toScript(result, meta = {}) {
    const data = { updated: meta.updated || new Date().toISOString().slice(0, 10), count: result.books.length };
    if (meta.coverage) data.coverage = meta.coverage;
    if (meta.history) data.history = meta.history;
    if (meta.catIt && Object.keys(meta.catIt).length) data.catIt = meta.catIt;
    if (meta.noCover && meta.noCover.length) data.noCover = meta.noCover;
    data.books = result.books;
    return "/* Book list of the library of the Deutsche Schule Mailand. Generated by admin.html – do not edit by hand. */\n" +
      "window.DSM_LIBRARY = " + JSON.stringify(data).replace(/</g, "\\u003c") + ";\n";
  }

  return { extract, inspect, toScript, isbn13 };
});
