/*
 * Synthetic WinBook database for tests. Deliberately contains invented readers,
 * loans, users and loan columns so the whitelist extraction can be checked.
 * No real data.
 */
"use strict";
const initSqlJs = require("sql.js");

// Valid ISBNs (check digits recomputed by hand)
const ISBN = {
  krabat1: "9783522202107",
  krabat2: "978-3-522-17650-7",       // with hyphens, valid
  tschick: "978-3-87134-710-8",
  wrong: "9783522202100",              // wrong check digit
  isbn10x: "0-8044-2957-X",            // ISBN-10 with X → 9780804429573
};

// Invented readers. "Erika Musterfrau" deliberately appears in a location and a category name,
// "Max Mustermann" is also an author (same name → warning, no removal).
const READERS = [[1, "Musterfrau", "Erika"], [2, "Mustermann", "Max"], [3, "Li", "X"]];

async function sql() { return initSqlJs(); }

async function library() {
  const SQL = await sql();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE medientyp (typid INTEGER, typname TEXT, ausleihdauer INT);
    INSERT INTO medientyp VALUES (1,'Buch',28),(2,'DVD',7),(3,'Graphic Novel',28),(4,'Hörbuch',14);
    CREATE TABLE autor (aid INTEGER, aname TEXT, email TEXT);
    INSERT INTO autor VALUES (1,'Preußler, Otfried',''),(2,'Herrndorf, Wolfgang',''),(3,'Kästner, Erich',''),
      (4,'Max Mustermann',''),(5,'keine Angabe',''),(6,' preussler,  Otfried','');
    CREATE TABLE verlage (vid INTEGER, vname TEXT, iban TEXT);
    INSERT INTO verlage VALUES (1,'Thienemann','DE00 GEHEIM'),(2,'Rowohlt',''),(3,'  k. A. ',''),(4,'thienemann','');
    CREATE TABLE bereiche (bid INTEGER, bname TEXT);
    INSERT INTO bereiche VALUES (1,'Jugendbuch'),(2,'Sammlung Erika Musterfrau'),(3,'Sachbuch'),(4,'Ungenutzt');
    CREATE TABLE standorte (stid INTEGER, stname TEXT);
    INSERT INTO standorte VALUES (1,'Jugendbücher 6 Brett 5'),(2,'Regal von Erika Musterfrau'),(3,'Geschichte Regal 2 Brett 4'),(4,'Leeres Regal');
    CREATE TABLE leiher (lid INTEGER, lname TEXT, lvorname TEXT, lemail TEXT, lgebtag TEXT, lpassword TEXT);
    CREATE TABLE vorgaenge (vid INTEGER, lid INTEGER, bid INTEGER);
    INSERT INTO vorgaenge VALUES (1,1,1),(2,2,3);
    CREATE TABLE users (uid INTEGER, uname TEXT, upass TEXT);
    INSERT INTO users VALUES (1,'admin','geheim-hash');
    CREATE TABLE sessions (sid INTEGER, ip TEXT);
    INSERT INTO sessions VALUES (1,'10.0.0.1');
    CREATE TABLE gebuehren (gid INTEGER);
    CREATE TABLE books (
      bid INTEGER, btitel TEXT, butitel TEXT, bautor INT, bautor2 INT, bautor3 INT, bverlag INT,
      bisbn TEXT, bisbn13 TEXT, bjahr TEXT, bbereich INT, bstandort INT, bmedientyp INT,
      deleted INT, abgang INT, verlust INT, verkauft INT,
      bverliehen INT, verliehenan TEXT, verliehenanklasse TEXT, vorgemerktan TEXT, bdonatedby TEXT, bnotiz TEXT, bsignatur TEXT, bzugang TEXT, bpreis TEXT
    );
  `);
  const ins = db.prepare("INSERT INTO leiher VALUES (?,?,?,?,?,?)");
  for (const [id, n, v] of READERS) ins.run([id, n, v, v.toLowerCase() + "@example.org", "2012-01-01", "pw"]);
  ins.free();
  const B = db.prepare(`INSERT INTO books (bid,btitel,butitel,bautor,bautor2,bautor3,bverlag,bisbn,bisbn13,bjahr,bbereich,bstandort,bmedientyp,
    deleted,abgang,verlust,verkauft,bverliehen,verliehenan,verliehenanklasse,vorgemerktan,bdonatedby,bnotiz)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const book = (o) => B.run([o.bid, o.t ?? null, o.u ?? null, o.a1 ?? null, o.a2 ?? null, o.a3 ?? null, o.v ?? null,
    o.isbn ?? null, o.isbn13 ?? null, o.j ?? null, o.k ?? null, o.s ?? null, o.typ ?? 1,
    o.del ?? 0, o.abg ?? 0, o.verl ?? 0, o.verk ?? 0, o.ausg ? 1 : 0, o.an ?? null, o.kl ?? null, o.vm ?? null, o.don ?? null, o.notiz ?? null]);
  book({ bid: 1, t: "Krabat", u: "Roman", a1: 1, v: 1, isbn13: ISBN.krabat1, j: "1981", k: 1, s: 1,
    ausg: true, an: "Erika Musterfrau", kl: "7a", notiz: "GEHEIME-NOTIZ" });
  book({ bid: 2, t: "  Krabat ", a1: 1, isbn13: ISBN.krabat2, s: 3, vm: "Max Mustermann" });
  book({ bid: 3, t: "Tschick", a1: 2, v: 2, isbn: ISBN.tschick, j: "2010 (1. Aufl.)", k: 2, s: 2, don: "Familie Musterfrau" });
  book({ bid: 4, t: "Das doppelte Lottchen", a1: 3, isbn13: ISBN.wrong, j: "1949", k: 3, s: 1 });
  book({ bid: 5, t: "Tschick – Der Film", a1: 2, typ: 2, isbn13: ISBN.tschick });
  book({ bid: 6, t: "Gelöschtes Buch", a1: 3, del: 1 });
  book({ bid: 7, t: "Ausgeschiedenes Buch", a1: 3, abg: 1 });
  book({ bid: 8, t: "   ", a1: 3 });
  book({ bid: 9, t: "Ätherische Tage", a1: 4, typ: 3, k: 3, s: 3 });
  book({ bid: 10, t: "„Zitat am Anfang“", a1: 3, s: 1 });
  book({ bid: 11, t: "Émile und die Detektive", a1: 3, isbn: ISBN.isbn10x, j: "um 1929", k: 1 });
  book({ bid: 12, t: "Krabat (Hörbuch)", a1: 1, typ: 4 });
  book({ bid: 13, t: "Anonyme Gedichte", a1: 5, v: 3, j: "o. J." });
  book({ bid: 14, t: "Gemeinsames Buch", a1: 1, a2: 3, a3: 1, verl: 0, verk: 0 });
  book({ bid: 15, t: "Verlorenes Buch", a1: 1, verl: 1 });
  book({ bid: 16, t: "Verkauftes Buch", a1: 1, verk: 1 });
  B.free();
  // Shelf mark and accession date (maintenance lists only), a price that is never read
  db.run(`UPDATE books SET bsignatur='JB 6 Pre', bzugang='2025-09-01 10:00:00.123', bpreis='12,90' WHERE bid=1;
    UPDATE books SET bzugang='2026-03-15 08:30:00' WHERE bid=3;`);
  return db;
}

// Expected public titles in sort order
const EXPECTED = ["Anonyme Gedichte", "Ätherische Tage", "Das doppelte Lottchen", "Émile und die Detektive",
  "Gemeinsames Buch", "Krabat", "Tschick", "„Zitat am Anfang“"];

async function bytes(make = library) {
  const db = await make();
  try { return Buffer.from(db.export()); } finally { db.close(); }
}

// SQLite without a books table
async function noLibrary() {
  const SQL = await sql();
  const db = new SQL.Database();
  db.run("CREATE TABLE notizen (id INTEGER, text TEXT); INSERT INTO notizen VALUES (1,'x');");
  return db;
}

/* Library with an order on the shelves (tab "Regale", shelves-core.js): a novel section sorted A–Z by author over four
   boards (Romane 1 Brett 1 – Romane 2 Brett 2), youth books with one category per board, a non-fiction board, the
   section without a board ("Romane") and the desk. Placed wrong on purpose (SHELF_WRONG):
     placeCategory  "Drachenherz" (Fantasy) on the Liebe board, "Tatort Hafen" (Krimi) on the non-fiction board,
                    "Liegengeblieben" (Roman) on the desk
     placeOrder     "Der Steppenwolf" (Hesse) on the A–D board, "Der Zauberberg" (Mann) on the S–Z board
     placeVague     "Ohne Brett 1" and "Ohne Brett 2" in "Romane" */
const SHELF_LOCS = ["Romane 1 Brett 1", "Romane 1 Brett 2", "Romane 2 Brett 1", "Romane 2 Brett 2", "Jugendbücher 1 Brett 1",
  "Jugendbücher 1 Brett 2", "Jugendbücher 1 Brett 3", "Romane", "Schreibtisch", "Sachbuch Brett 1"];
const SHELF_CATS = ["Roman", "Fantasy", "Krimi", "Liebe", "Natur"];
const SHELF_NOVELS = [ // [surname, first name, board (1–4), copies of different titles]
  ["Adler", "Anna", 1, 2], ["Arndt", "Paul", 1, 1], ["Bauer", "Lisa", 1, 1], ["Brecht", "Bertolt", 1, 2], ["Böll", "Heinrich", 1, 1],
  ["Celan", "Paul", 1, 1], ["Dürrenmatt", "Friedrich", 1, 1], ["Droste", "Annette", 1, 1],
  ["Eich", "Günter", 2, 1], ["Ende", "Michael", 2, 2], ["Fontane", "Theodor", 2, 1], ["Frisch", "Max", 2, 1], ["Grass", "Günter", 2, 1],
  ["Goethe", "Johann Wolfgang", 2, 1], ["Hesse", "Hermann", 2, 1], ["Heine", "Heinrich", 2, 1], ["Kafka", "Franz", 2, 1],
  ["Kästner", "Erich", 2, 1], ["Kehlmann", "Daniel", 2, 1],
  ["Lenz", "Siegfried", 3, 1], ["Lessing", "Gotthold", 3, 1], ["Mann", "Thomas", 3, 2], ["Musil", "Robert", 3, 1], ["Rilke", "Rainer Maria", 3, 1],
  ["Roth", "Joseph", 3, 1],
  ["Schiller", "Friedrich", 4, 1], ["Storm", "Theodor", 4, 1], ["Süskind", "Patrick", 4, 1], ["Tucholsky", "Kurt", 4, 1], ["Timm", "Uwe", 4, 1],
  ["Walser", "Martin", 4, 1], ["Wolf", "Christa", 4, 1], ["Zweig", "Stefan", 4, 1], ["Zeh", "Juli", 4, 1],
];
const SHELF_WRONG = {
  placeCategory: ["Drachenherz", "Tatort Hafen", "Liegengeblieben"],
  placeOrder: ["Der Steppenwolf", "Der Zauberberg"],
  placeVague: ["Ohne Brett 1", "Ohne Brett 2"],
};

async function shelves() {
  const SQL = await sql();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE medientyp (typid INTEGER, typname TEXT);
    INSERT INTO medientyp VALUES (1,'Buch');
    CREATE TABLE autor (aid INTEGER, aname TEXT);
    CREATE TABLE verlage (vid INTEGER, vname TEXT);
    CREATE TABLE bereiche (bid INTEGER, bname TEXT);
    CREATE TABLE standorte (stid INTEGER, stname TEXT);
    CREATE TABLE leiher (lid INTEGER, lname TEXT, lvorname TEXT);
    INSERT INTO leiher VALUES (1,'Musterfrau','Erika');
    CREATE TABLE books (bid INTEGER, btitel TEXT, bautor INT, bjahr TEXT, bbereich INT, bstandort INT, bmedientyp INT, bsignatur TEXT, bzugang TEXT);
  `);
  const run = (sqlText, rows) => { const s = db.prepare(sqlText); for (const r of rows) s.run(r); s.free(); };
  run("INSERT INTO standorte VALUES (?,?)", SHELF_LOCS.map((n, i) => [i + 1, n]));
  run("INSERT INTO bereiche VALUES (?,?)", SHELF_CATS.map((n, i) => [i + 1, n]));
  const loc = n => SHELF_LOCS.indexOf(n) + 1, cat = n => SHELF_CATS.indexOf(n) + 1;
  const authors = [], books = [];
  const author = name => { let i = authors.indexOf(name); if (i < 0) { authors.push(name); i = authors.length - 1; } return i + 1; };
  const book = (t, a, c, l, y) => books.push([books.length + 1, t, author(a), String(y || 2000 + (books.length % 20)), cat(c), loc(l), 1, null, null]);
  for (const [sn, fn, board, n] of SHELF_NOVELS) {
    for (let k = 1; k <= n; k++) book(`Roman von ${fn} ${sn}${n > 1 ? " " + k : ""}`, `${sn}, ${fn}`, "Roman", SHELF_LOCS[board - 1]);
  }
  book("Der Steppenwolf", "Hesse, Hermann", "Roman", "Romane 1 Brett 1", 1927);
  book("Der Zauberberg", "Mann, Thomas", "Roman", "Romane 2 Brett 2", 1924);
  book("Ohne Brett 1", "Adler, Anna", "Roman", "Romane");
  book("Ohne Brett 2", "Zweig, Stefan", "Roman", "Romane");
  book("Liegengeblieben", "Bauer, Lisa", "Roman", "Schreibtisch");
  for (let k = 1; k <= 8; k++) book(`Fantasy-Band ${k}`, `Funke, Cornelia`, "Fantasy", "Jugendbücher 1 Brett 1");
  book("Drachenherz", "Funke, Cornelia", "Fantasy", "Jugendbücher 1 Brett 3");
  for (let k = 1; k <= 6; k++) book(`Krimi ${k}`, `Kommissar, Klara`, "Krimi", "Jugendbücher 1 Brett 2");
  book("Tatort Hafen", "Kommissar, Klara", "Krimi", "Sachbuch Brett 1");
  for (let k = 1; k <= 5; k++) book(`Liebesroman ${k}`, `Herz, Hanna`, "Liebe", "Jugendbücher 1 Brett 3");
  for (let k = 1; k <= 6; k++) book(`Naturbuch ${k}`, `Grün, Gustav`, "Natur", "Sachbuch Brett 1");
  run("INSERT INTO autor VALUES (?,?)", authors.map((n, i) => [i + 1, n]));
  run("INSERT INTO books VALUES (?,?,?,?,?,?,?,?,?)", books);
  return db;
}

module.exports = { library, noLibrary, shelves, bytes, sql, ISBN, READERS, EXPECTED, SHELF_WRONG, SHELF_LOCS };
