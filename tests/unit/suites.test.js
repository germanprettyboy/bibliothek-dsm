/* CI suites (tests/suites.js, CLAUDE.md "CI suites"): every spec in one area, core tests tagged, trailer parsing. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { ROOT } = require("../helpers/load.js");
const { AREAS, ALIASES, parse, projects } = require("../suites.js");

const E2E = path.join(ROOT, "tests", "e2e");
const specs = fs.readdirSync(E2E).filter(f => f.endsWith(".spec.js")).sort();

test("every e2e spec belongs to exactly one area, every listed spec exists", () => {
  const listed = Object.values(AREAS).flatMap(a => a.specs).map(s => s + ".spec.js");
  assert.deepEqual([...listed].sort(), specs, "new spec → add it to an area in tests/suites.js");
  assert.equal(new Set(listed).size, listed.length, "a spec in two areas");
  for (const a of Object.values(ALIASES)) assert.ok(AREAS[a], a);
});

test("every area with core tests has at least one @smoke test, the others none", () => {
  for (const [name, a] of Object.entries(AREAS)) {
    const n = a.specs.map(s => fs.readFileSync(path.join(E2E, s + ".spec.js"), "utf8").split('tag: "@smoke"').length - 1)
      .reduce((x, y) => x + y, 0);
    if (a.smoke === false) assert.equal(n, 0, name + ": smoke: false, but tagged");
    else assert.ok(n > 0, name + ": no @smoke test");
  }
});

test("trailer and input: full by default, smoke with areas and aliases", () => {
  assert.deepEqual(parse(""), { mode: "full" });
  assert.deepEqual(parse(undefined), { mode: "full" });
  assert.deepEqual(parse("full"), { mode: "full" });
  assert.deepEqual(parse("Merge main\n\nCI-Suite: full"), { mode: "full" });
  assert.deepEqual(parse("smoke"), { mode: "smoke", areas: [] });
  assert.deepEqual(parse("Pill wider\n\nCI-Suite: smoke categories, search\nCo-Authored-By: x"),
    { mode: "smoke", areas: ["categories", "list"] });
  assert.deepEqual(parse("smoke detail cover"), { mode: "smoke", areas: ["detail"] });
  assert.throws(() => parse("CI-Suite: smoke nonsense"), /unknown area "nonsense"/);
  assert.throws(() => parse("mentions CI-Suite: smoke only in a sentence"), /expected "full", "smoke"/);
  assert.throws(() => parse("CI-Suite: quick"), /expected/);
});

test("smoke projects: named areas complete, the rest only @smoke, Chromium only", () => {
  const [area, smoke] = projects(parse("smoke categories"));
  assert.deepEqual(area.testMatch, ["categories.spec.js"]);
  assert.ok(!smoke.testMatch.includes("categories.spec.js") && smoke.testMatch.includes("detail.spec.js"));
  assert.ok(smoke.grep.test("title @smoke"));
  for (const p of [area, smoke]) assert.equal(p.use.browserName, "chromium");
  const only = projects(parse("smoke"));
  assert.equal(only.length, 1);
  assert.equal(only[0].testMatch.length, specs.length);
});

test("the workflow reacts to the same trailer", () => {
  const yml = fs.readFileSync(path.join(ROOT, ".github", "workflows", "test.yml"), "utf8");
  assert.ok(yml.includes("contains(github.event.head_commit.message, 'CI-Suite: smoke')"));
  assert.ok(yml.includes("startsWith(inputs.suite, 'smoke')"));
});
