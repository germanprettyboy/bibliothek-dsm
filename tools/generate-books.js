/*
 * Erzeugt website/books.js direkt aus einer WinBIAP-Datenbank (gleiche Logik wie admin.html).
 *
 *   npm install            (einmalig, installiert sql.js)
 *   node werkzeuge/books-erzeugen.js daten/BIBLIOTHEK_DSM_2024.winbook [JJJJ-MM-TT]
 *
 * Gibt den Bericht (verworfene Personendaten, Zählungen) auf der Konsole aus.
 * Abdeckung und Verlauf werden aus der bestehenden books.js übernommen, nicht neu gemessen.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");
const X = require("./quelle/extract.js");

(async () => {
  const dbFile = process.argv[2];
  if (!dbFile) { console.error("Aufruf: node werkzeuge/books-erzeugen.js <datei.winbook> [JJJJ-MM-TT]"); process.exit(1); }
  const stand = process.argv[3] || new Date().toLocaleDateString("sv-SE"); // JJJJ-MM-TT, lokales Datum wie in admin.html
  const out = path.join(__dirname, "..", "website", "books.js");
  let prev = null;
  try { global.window = {}; require(out); prev = global.window.DSM_BIBLIOTHEK; } catch (e) { /* keine alte Datei */ }
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(dbFile));
  let r;
  try { r = X.extract(db); } finally { db.close(); }
  const meta = { stand };
  if (prev && prev.verlauf) meta.verlauf = prev.verlauf;
  if (prev && prev.abdeckung) meta.abdeckung = prev.abdeckung;
  fs.writeFileSync(out, X.toScript(r, meta));
  console.log(JSON.stringify(r.report, null, 1));
  console.log("geschrieben:", out, "–", r.books.length, "Bücher");
})();
