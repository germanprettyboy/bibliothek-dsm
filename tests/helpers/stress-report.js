/*
 * Failure rate per test from a stress run (.github/workflows/stress.yml, --repeat-each, no retry).
 *   node tests/helpers/stress-report.js tests/.tmp/stress.json
 */
"use strict";
const fs = require("fs");

const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.log("no report"); process.exit(0); }
const report = JSON.parse(fs.readFileSync(file, "utf8"));

const runs = new Map(); // "file:line title" -> {n, failed, errors}
(function walk(suite, titles) {
  for (const s of suite.suites || []) walk(s, s.title ? titles.concat(s.title) : titles);
  for (const spec of suite.specs || []) {
    const key = `${spec.file}:${spec.line} ${titles.concat(spec.title).join(" › ")}`;
    const r = runs.get(key) || { n: 0, failed: 0, errors: new Set() };
    for (const t of spec.tests || []) for (const res of t.results || []) {
      if (res.status === "skipped") continue;
      r.n++;
      if (res.status !== "passed") {
        r.failed++;
        if (res.error && res.error.message) r.errors.add(res.error.message.split("\n")[0].slice(0, 160));
      }
    }
    runs.set(key, r);
  }
})(report, []);

const bad = [...runs].filter(([, r]) => r.failed).sort((a, b) => b[1].failed / b[1].n - a[1].failed / a[1].n);
const total = [...runs.values()].reduce((s, r) => s + r.n, 0);
const lines = bad.map(([k, r]) => `${r.failed}/${r.n} failed – ${k}` + [...r.errors].map(e => "\n    " + e).join(""));
console.log(`${total} test runs, ${bad.length} test(s) failed at least once` + (lines.length ? ":\n" + lines.join("\n") : ""));
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Stress: ${total} test runs, ${bad.length} unstable test(s)\n\n` +
    (lines.length ? "```\n" + lines.join("\n") + "\n```\n" : "Every test passed every time.\n"));
}
