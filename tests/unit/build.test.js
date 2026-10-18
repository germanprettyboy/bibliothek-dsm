/* Is the built website current? Builds src/ into a test folder and compares with website/ (index.html, admin.html,
   assets/library.js, admin.js, style.css, head.js). Outdated → npm run build. */
"use strict";
const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { ROOT, WEB, TMP } = require("../helpers/load.js");

const TARGET = path.join(TMP, "build");
let GENERATED = [];
before(async () => {
  fs.rmSync(TARGET, { recursive: true, force: true });
  const b = await import(path.join(ROOT, "tools", "build.mjs"));
  GENERATED = b.GENERATED;
  await b.buildSite(TARGET);
});

test("website/ matches the build from src/ (otherwise: npm run build)", () => {
  assert.ok(GENERATED.length >= 6);
  for (const f of GENERATED) {
    const fresh = fs.readFileSync(path.join(TARGET, f)), old = fs.readFileSync(path.join(WEB, f));
    assert.ok(fresh.equals(old), `${f} is outdated: npm run build`);
  }
});
