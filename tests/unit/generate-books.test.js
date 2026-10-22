/* npm run books (tools/generate-books.js): privacy stop when a reader's full name occurs in a public field. */
"use strict";
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const T = require("../helpers/testdb.js");

const TMP = path.join(__dirname, "..", ".tmp", "generate-books");
const SCRIPT = path.join(__dirname, "..", "..", "tools", "generate-books.js");
const run = (db, out, ...flags) => spawnSync(process.execPath, [SCRIPT, db, "2026-01-01", ...flags],
  { env: { ...process.env, DSM_BOOKS_OUT: out }, encoding: "utf8" });

describe("generate-books.js", () => {
  let withHit, withoutNames;
  before(async () => {
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });
    // the test database: reader "Max Mustermann" is also an author
    withHit = path.join(TMP, "hit.winbook");
    fs.writeFileSync(withHit, await T.bytes());
    // reader table without name columns: the check is impossible
    withoutNames = path.join(TMP, "no-names.winbook");
    fs.writeFileSync(withoutNames, await T.bytes(async () => {
      const db = await T.library();
      db.run("DROP TABLE leiher; CREATE TABLE leiher (lid INTEGER, lemail TEXT);");
      return db;
    }));
  });

  test("a reader name in a public field: stop, titles listed, reader names not, nothing written", () => {
    const out = path.join(TMP, "a.js");
    const r = run(withHit, out);
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr, /STOP: 1 book/);
    assert.ok(!/Musterfrau|Erika/.test(r.stdout + r.stderr), "a reader name in the output");
    assert.ok(!fs.existsSync(out));
  });
  test("without name columns: stop", () => {
    const out = path.join(TMP, "b.js");
    const r = run(withoutNames, out);
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr, /name check was not possible/);
    assert.ok(!fs.existsSync(out));
  });
  test("--names-checked: written after the manual check", () => {
    const out = path.join(TMP, "c.js");
    const r = run(withHit, out, "--names-checked");
    assert.equal(r.status, 0, r.stderr);
    assert.match(fs.readFileSync(out, "utf8"), /^\/\* Book list .*\nwindow\.DSM_LIBRARY = \{"updated":"2026-01-01"/);
  });
});
