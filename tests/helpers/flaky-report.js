/*
 * Lists flaky tests from Playwright's JSON report (passed only on the retry): as warning annotations in the
 * Actions run and in the job summary. Never fails the run – the retry is allowed, hiding it is not.
 *   node tests/helpers/flaky-report.js tests/.tmp/report.json
 */
"use strict";
const fs = require("fs");

const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.log("no report (the run stopped before the tests)"); process.exit(0); }
const report = JSON.parse(fs.readFileSync(file, "utf8"));

const flaky = [];
(function walk(suite, titles) {
  for (const s of suite.suites || []) walk(s, s.title ? titles.concat(s.title) : titles);
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      if (t.status === "flaky") flaky.push({ file: spec.file, line: spec.line, title: titles.concat(spec.title).join(" › "), project: t.projectName });
    }
  }
})(report, []);

const lines = flaky.map(f => `${f.project}: ${f.file}:${f.line} – ${f.title}`);
for (const f of flaky) console.log(`::warning file=tests/e2e/${f.file},line=${f.line}::flaky (passed only on the retry): ${f.title}`);
console.log(flaky.length ? `${flaky.length} flaky test(s):\n` + lines.join("\n") : "no flaky tests");
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, flaky.length
    ? `### ${flaky.length} flaky test(s) (passed only on the retry)\n\n` + lines.map(l => "- " + l).join("\n") + "\n"
    : "### No flaky tests\n");
}
