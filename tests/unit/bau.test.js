/* Gebaute Website aktuell? Baut src/ in einen Testordner und vergleicht mit website/ (index.html, admin.html,
   assets/bibliothek.js, verwaltung.js, style.css, kopf.js). Veraltet → npm run build. */
"use strict";
const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { ROOT, WEB, TMP } = require("../helfer/laden.js");

const ZIEL = path.join(TMP, "bau");
let ERZEUGT = [];
before(async () => {
  fs.rmSync(ZIEL, { recursive: true, force: true });
  const b = await import(path.join(ROOT, "werkzeuge", "bauen.mjs"));
  ERZEUGT = b.ERZEUGT;
  await b.bauen(ZIEL);
});

test("website/ entspricht dem Build aus src/ (sonst: npm run build)", () => {
  assert.ok(ERZEUGT.length >= 6);
  for (const f of ERZEUGT) {
    const neu = fs.readFileSync(path.join(ZIEL, f)), alt = fs.readFileSync(path.join(WEB, f));
    assert.ok(neu.equals(alt), `${f} ist veraltet: npm run build`);
  }
});
