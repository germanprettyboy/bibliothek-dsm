/* Is the built website current? Builds src/ into a test folder and compares with website/ (index.html, admin.html,
   assets/library.js, admin.js, style.css, head.js). Outdated → npm run build. */
"use strict";
const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
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

// Size budget (gzip, as the webspace delivers via .htaccess): catches a dependency that silently doubles the bundle.
// Raise deliberately when a feature needs it (as of 2026-10-18: library.js 71 KB, style.css 13 KB, admin.enc.js 60 KB;
// 2026-10-23: admin.enc.js 114 KB – maintenance tab, announcement, archive editing, backups doubled the admin sources;
// encrypted data does not compress; 2026-10-23: admin.enc.js 300 KB, style.css 20 KB – admin overhaul: tabs Cover and
// Statistik, help page DE/IT, table viewer, Excel export, print, corrections, local versions; 2026-10-25: library.js 86 KB,
// style.css 22 KB – 15 experimental backgrounds with their DE/IT texts, library/backdrop.jsx; backgrounds.js 150 KB – the
// gallery of 500 more, loaded only on demand).
test("built files stay within the size budget (gzip)", () => {
  const BUDGET = { "assets/library.js": 86, "assets/style.css": 22, "assets/backgrounds.js": 150, "assets/head.js": 2, "assets/admin.enc.js": 320 };
  for (const [f, kb] of Object.entries(BUDGET)) {
    const size = zlib.gzipSync(fs.readFileSync(path.join(WEB, f)), { level: 9 }).length / 1024;
    assert.ok(size <= kb, `${f}: ${size.toFixed(1)} KB gzip > budget ${kb} KB`);
  }
});
