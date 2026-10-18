/*
 * Generates website/books.js directly from a WinBIAP database (same logic as admin.html).
 *
 *   npm install            (once, installs sql.js)
 *   node tools/generate-books.js data/BIBLIOTHEK_DSM_2024.winbook [YYYY-MM-DD]
 *
 * Prints the report (discarded personal data, counts) to the console.
 * Coverage and history are taken over from the existing books.js, not measured again.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");
const X = require("./source/extract.js");

(async () => {
  const dbFile = process.argv[2];
  if (!dbFile) { console.error("Usage: node tools/generate-books.js <file.winbook> [YYYY-MM-DD]"); process.exit(1); }
  const updated = process.argv[3] || new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local date as in admin.html
  const out = path.join(__dirname, "..", "website", "books.js");
  let prev = null;
  try { global.window = {}; require(out); prev = global.window.DSM_LIBRARY; } catch (e) { /* no old file */ }
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(dbFile));
  let r;
  try { r = X.extract(db); } finally { db.close(); }
  const meta = { updated };
  if (prev && prev.history) meta.history = prev.history;
  if (prev && prev.coverage) meta.coverage = prev.coverage;
  fs.writeFileSync(out, X.toScript(r, meta));
  console.log(JSON.stringify(r.report, null, 1));
  console.log("written:", out, "–", r.books.length, "books");
})();
