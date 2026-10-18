/*
 * Against the original database (data/BIBLIOTHEK_DSM_2024.winbook, not committed).
 * Skipped if the file is missing. Failure messages only state counts, never names.
 */
"use strict";
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");
const X = require("../../tools/source/extract.js");
const { WEB, realDb, browserFile, norm } = require("../helpers/load.js");

const DB = realDb();

describe("original database", { skip: !DB && "data/BIBLIOTHEK_DSM_2024.winbook is missing" }, () => {
  let db, r;
  before(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database(fs.readFileSync(DB));
    r = X.extract(db);
  });

  test("books.js matches the database (otherwise: npm run books)", () => {
    const B = browserFile("books.js").DSM_LIBRARY;
    const fresh = X.toScript(r, { updated: B.updated, coverage: B.coverage, history: B.history });
    const old = fs.readFileSync(path.join(WEB, "books.js"), "utf8");
    assert.ok(fresh === old, `books.js differs (${B.books.length} published, ${r.books.length} from the database)`);
  });

  test("personal data present and discarded", () => {
    assert.ok(r.report.removedTables.some(t => t.key === "readers"), "readers table detected");
    assert.ok(r.report.records > r.report.books);
  });

  test("no full reader name in category or location", () => {
    const names = new Set();
    for (const [n, v] of db.exec("SELECT lname, lvorname FROM leiher")[0].values) {
      const a = norm(n), b = norm(v);
      if (a.length >= 2 && b.length >= 2) { names.add(b + " " + a); names.add(a + " " + b); }
    }
    let hits = 0;
    for (const b of r.books) for (const f of [b.c, ...(b.l || [])]) {
      if (!f) continue;
      const x = " " + norm(f) + " ";
      for (const nm of names) if (x.includes(" " + nm + " ")) hits++;
    }
    assert.equal(hits, 0, hits + " fields with reader names");
  });

  test("names from loan columns don't appear in category, location, publisher", () => {
    const cols = db.exec("PRAGMA table_info(books)")[0].values.map(v => v[1].toLowerCase());
    const nc = ["verliehenan", "vorgemerktan"].filter(c => cols.includes(c));
    const names = new Set();
    for (const c of nc) for (const [v] of (db.exec(`SELECT DISTINCT "${c}" FROM books WHERE TRIM(COALESCE("${c}",''))<>''`)[0] || { values: [] }).values) {
      const n = norm(v); if (n.split(" ").length >= 2) names.add(n);
    }
    let hits = 0;
    for (const b of r.books) for (const f of [b.c, b.p, ...(b.l || [])]) {
      if (f && [...names].some(n => (" " + norm(f) + " ").includes(" " + n + " "))) hits++;
    }
    assert.equal(hits, 0, hits + " hits");
  });

  test("total size plausible (books.js < 2 MB)", () => {
    assert.ok(fs.statSync(path.join(WEB, "books.js")).size < 2e6);
  });
});
