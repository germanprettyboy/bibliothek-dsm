/*
 * extract.js – liest eine WinBIAP-Bibliotheksdatenbank (SQLite) und erzeugt
 * die öffentliche Bücherliste. Arbeitet nach dem Whitelist-Prinzip:
 * Es werden ausschließlich bibliografische Kerndaten gelesen. Leser-, Ausleih-,
 * Gebühren-, Benutzer- und Sitzungsdaten werden nie ausgelesen, nur gezählt,
 * damit der Bericht zeigen kann, was verworfen wurde.
 *
 * Läuft im Browser (window.DSMExtract) und in Node (module.exports).
 * Erwartet eine sql.js-Datenbank (db.exec).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DSMExtract = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Tabellen mit Personen- oder Vorgangsdaten: werden nur gezählt, nie gelesen.
  const PERSONAL_TABLES = [
    ["leiher", "leser"],
    ["leihergruppen_leiher", "lesergruppen"],
    ["vorgaenge", "ausleihen"],
    ["history", "historie"],
    ["vormerkungen", "vormerkungen"],
    ["gebuehren", "gebuehren"],
    ["gebuehren_history", "gebuehren"],
    ["ausgabe_books", "ausgaben"],
    ["umlauf_leiher", "umlauf"],
    ["umlauf_medium", "umlauf"],
    ["users", "benutzer"],
    ["sessions", "sitzungen"],
    ["termine", "termine"],
    ["klient", "klienten"],
    ["rechnungen", "rechnungen"],
    ["besucher", "besucher"],
    ["filelinks", "dateien"],
    ["bewertungen", "bewertungen"],
    ["favoriten", "favoriten"],
  ];

  // Spalten der Büchertabelle mit Ausleihstatus oder Leserbezug: werden nie gelesen.
  const LOAN_COLUMNS = [
    "bverliehen", "bvorgemerkt", "bverfuegbar", "bausleihhinweis", "verltime", "rucktime",
    "verliehenan", "verliehenanklasse", "vormerkungvon", "vormerkungbis", "vorgemerktan",
    "exemplarverliehen", "exemplarvorgemerkt", "banzahlausleihen", "bdonatedby", "klient",
  ];
  // Spalten mit Leser-Namen (für den Bericht gezählt).
  const NAME_COLUMNS = ["verliehenan", "vorgemerktan", "bdonatedby"];

  // Medientypen, die als Buch gelten.
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
      const e = new Error("Keine Bibliotheksdatenbank: Tabelle books mit Spalte btitel fehlt.");
      e.code = "not_library_db";
      throw e;
    }
    const has = c => bcols.has(c);

    // Bericht: was enthält die Datei an Personendaten?
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

    // Nachschlagetabellen (nur Namen)
    const lookup = (t, id, name) => {
      const m = new Map();
      const c = colsOf(t);
      if (c.has(id) && c.has(name)) for (const r of rows(db, `SELECT ${q(id)} AS i, ${q(name)} AS n FROM ${q(t)}`)) m.set(r.i, clean(r.n));
      return m;
    };
    const autor = lookup("autor", "aid", "aname");
    const verlag = lookup("verlage", "vid", "vname");
    const bereich = lookup("bereiche", "bid", "bname");
    const standort = lookup("standorte", "stid", "stname");
    const medientyp = lookup("medientyp", "typid", "typname");

    // Whitelist der gelesenen Buchspalten
    const want = ["bid", "btitel", "butitel", "bautor", "bautor2", "bautor3", "bverlag", "bisbn", "bisbn13",
      "bjahr", "bbereich", "bstandort", "bmedientyp", "deleted", "abgang", "verlust", "verkauft"].filter(has);
    const src = rows(db, "SELECT " + want.map(q).join(",") + " FROM books");

    const stats = { records: src.length, nonBook: 0, gone: 0, untitled: 0 };
    const byKey = new Map();
    for (const r of src) {
      if (r.deleted == 1 || r.abgang == 1 || r.verlust == 1 || r.verkauft == 1) { stats.gone++; continue; }
      if (has("bmedientyp")) {
        const typ = (medientyp.get(r.bmedientyp) || "").toLowerCase();
        if (!BOOK_TYPES.includes(typ)) { stats.nonBook++; continue; }
      }
      const t = clean(r.btitel);
      if (!t) { stats.untitled++; continue; }
      const authors = [r.bautor, r.bautor2, r.bautor3].map(id => authorDisplay(autor.get(id)))
        .filter((a, i, arr) => a && arr.indexOf(a) === i);
      const isbns = [r.bisbn13, r.bisbn].map(isbn13).filter((x, i, arr) => x && arr.indexOf(x) === i);
      const b = {
        t,
        u: clean(r.butitel),
        a: authors,
        v: clean(verlag.get(r.bverlag)),
        j: year(r.bjahr),
        i: isbns,
        k: clean(bereich.get(r.bbereich)),
        s: [clean(standort.get(r.bstandort))].filter(Boolean),
      };
      const key = norm(t) + "|" + norm(authors[0] || "");
      const prev = byKey.get(key);
      if (!prev) { byKey.set(key, b); continue; }
      for (const f of ["u", "v", "j", "k"]) if (!prev[f] && b[f]) prev[f] = b[f];
      for (const f of ["a", "i", "s"]) for (const x of b[f]) if (!prev[f].includes(x)) prev[f].push(x);
    }

    // Abgleich: kommen vollständige Leser-Namen in den öffentlichen Feldern vor?
    // Nur Zählung im Bericht; Kategorie- und Standortnamen mit Treffer werden entfernt.
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
          if (contains(b.k)) { b.k = ""; nameRemoved++; }
          const s0 = b.s.length; b.s = b.s.filter(s => !contains(s)); nameRemoved += s0 - b.s.length;
          if ([b.t, b.u, b.v, ...b.a].some(contains)) nameHits++;
        }
      }
    }

    const coll = new Intl.Collator("de", { sensitivity: "base", numeric: true });
    const sortKey = s => s.replace(/^[^\p{L}\p{N}]+/u, "");
    const books = [...byKey.values()].sort((x, y) => coll.compare(sortKey(x.t), sortKey(y.t)) || coll.compare(x.a[0] || "", y.a[0] || ""));
    // leere Felder weglassen (kleinere Datei)
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

  // Erzeugt den Inhalt von books.js
  function toScript(result, meta = {}) {
    const data = { stand: meta.stand || new Date().toISOString().slice(0, 10), anzahl: result.books.length };
    if (meta.abdeckung) data.abdeckung = meta.abdeckung;
    if (meta.verlauf) data.verlauf = meta.verlauf;
    data.buecher = result.books;
    return "/* Bücherliste der Bibliothek der Deutschen Schule Mailand. Erzeugt mit admin.html – nicht von Hand bearbeiten. */\n" +
      "window.DSM_BIBLIOTHEK = " + JSON.stringify(data).replace(/</g, "\\u003c") + ";\n";
  }

  return { extract, toScript, isbn13 };
});
