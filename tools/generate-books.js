/*
 * Generates website/books.js directly from a WinBook database (same logic as admin.html).
 *
 *   npm install            (once, installs sql.js)
 *   node tools/generate-books.js data/BIBLIOTHEK_DSM_2024.winbook [YYYY-MM-DD] [--names-checked]
 *
 * Prints the report (discarded personal data, counts) to the console.
 * Privacy stop: if a full reader name occurs in a title, subtitle, publisher or author (or the reader table has no name
 * columns, so nothing could be checked), nothing is written and the titles are listed. After looking at them
 * (homonyms like a reader "Thomas Mann" are possible): run again with --names-checked.
 * Coverage, history, Italian category names and hidden covers are taken over from the existing books.js.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");
const X = require("./source/extract.js");

(async () => {
  const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
  const namesChecked = process.argv.includes("--names-checked");
  const dbFile = args[0];
  if (!dbFile) { console.error("Usage: node tools/generate-books.js <file.winbook> [YYYY-MM-DD] [--names-checked]"); process.exit(1); }
  const updated = args[1] || new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local date as in admin.html
  const out = process.env.DSM_BOOKS_OUT || path.join(__dirname, "..", "website", "books.js"); // DSM_BOOKS_OUT: tests only
  let prev = null;
  try { global.window = {}; require(out); prev = global.window.DSM_LIBRARY; } catch (e) { /* no old file */ }
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(dbFile));
  let r, names;
  try { r = X.extract(db); names = nameCheck(db, r.books); } finally { db.close(); }
  if (!namesChecked && (!names.possible || names.titles.length)) {
    console.error(names.possible
      ? `STOP: ${names.titles.length} book(s) contain the full name of a reader – look at them before publishing:\n  ` + names.titles.join("\n  ")
      : "STOP: the reader table has no name columns (lname, lvorname) – the name check was not possible.");
    console.error("Nothing written. After checking: npm run books -- --names-checked");
    process.exit(2);
  }
  const meta = { updated };
  if (prev && prev.history) meta.history = prev.history;
  if (prev && prev.coverage) meta.coverage = prev.coverage;
  if (prev && prev.catIt) meta.catIt = prev.catIt;
  if (prev && prev.noCover) meta.noCover = prev.noCover;
  fs.writeFileSync(out, X.toScript(r, meta));
  console.log(JSON.stringify(r.report, null, 1));
  console.log("written:", out, "–", r.books.length, "books");
})();

// Same comparison as extract.js (full reader names, both orders, whole words), but returns the titles instead of a count.
// The reader names stay in memory, only book titles are printed.
function nameCheck(db, books) {
  const all = sql => (db.exec(sql)[0] || { values: [] }).values;
  const cols = new Set(all("PRAGMA table_info(leiher)").map(v => v[1]));
  if (!cols.has("lname") || !cols.has("lvorname")) return { possible: false, titles: [] };
  const names = [];
  for (const [n, v] of all("SELECT lname, lvorname FROM leiher")) {
    const a = X.norm(n), b = X.norm(v);
    if (a.length >= 2 && b.length >= 2) names.push(" " + b + " " + a + " ", " " + a + " " + b + " ");
  }
  const has = s => { const x = " " + X.norm(s) + " "; return names.some(nm => x.includes(nm)); };
  return { possible: true, titles: books.filter(b => [b.t, b.s, b.p, ...(b.a || [])].some(has)).map(b => b.t) };
}
