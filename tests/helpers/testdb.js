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

module.exports = { library, noLibrary, bytes, sql, ISBN, READERS, EXPECTED };
