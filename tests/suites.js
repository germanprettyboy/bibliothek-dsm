/*
 * Test suites on GitHub Actions (CLAUDE.md "CI suites"): full (default) or smoke, chosen per push by a trailer line in the
 * head commit message, or by hand (Actions → Tests → Run workflow, input "suite"):
 *   (no trailer)                    full: unit, every spec in Chromium + Firefox (sharded), WebKit/iPhone engines.spec, Apache
 *   CI-Suite: smoke                 unit + the @smoke core tests of every area, Chromium only, one job
 *   CI-Suite: smoke detail,info     unit + EVERY test of the named areas + the @smoke core tests of all other areas, Chromium
 * Shows what a trailer would run (runs no test):  node tests/suites.js "smoke detail,info"
 */
"use strict";

// Every e2e spec belongs to exactly one area (tests/unit/suites.test.js checks it; a new spec needs an entry here).
// smoke: false = no @smoke core tests (cross-cutting checks), they only run when named or in the full suite.
const AREAS = {
  list: { specs: ["list", "header"], about: "list, search, A–Z bar, letter floater, header, #preview" },
  loading: { specs: ["loading"], about: "slow connection, placeholders, migration of old settings" },
  announcement: { specs: ["announcement"], about: "banner above the header" },
  categories: { specs: ["categories"], about: "category filter, dialog, pill" },
  detail: { specs: ["detail", "blur"], about: "detail dialog, covers, zoom, phone sheet, glass" },
  recommendations: { specs: ["recommendations"], about: "first-visit questions, recommendation card, archive" },
  info: { specs: ["info"], about: "opening hours card and dialog, closures, contact" },
  settings: { specs: ["language-settings"], about: "language, theme, larger text, high contrast, reduced motion" },
  admin: { specs: ["admin", "admin-backups", "publish"], about: "lock, import, publishing (folder, save.php, backups)" },
  "admin-care": { specs: ["admin-care"], about: "tab Pflege, new/dropped titles, Italian categories, hidden covers" },
  "admin-recs": { specs: ["admin-recs"], about: "recommendation archive in the admin page" },
  "admin-info": { specs: ["admin-info"], about: "opening hours editor: Sunday, special hours, notice, contact" },
  engines: { specs: ["engines"], smoke: false, about: "basics in every engine (in a smoke run: Chromium only)" },
  a11y: { specs: ["a11y"], smoke: false, about: "axe WCAG 2.1 AA, every view" },
  performance: { specs: ["performance"], smoke: false, about: "CPU 4× budgets, 3× catalog" },
};
const ALIASES = { search: "list", cover: "detail", covers: "detail", language: "settings", hours: "info", recs: "recommendations" };

const file = spec => `${spec}.spec.js`;

/*
 * "CI-Suite: smoke a,b" as its own line in a commit message, or the bare value ("smoke a,b", input of a run by hand).
 * → { mode: "full" } | { mode: "smoke", areas: [...] }. Unknown area, or "CI-Suite: smoke" not as its own line → Error
 * (the workflow only checks "contains", so the run fails instead of silently testing the wrong suite).
 */
function parse(text) {
  const line = /^CI-Suite:[ \t]*(.*)$/m.exec(text || "");
  const value = (line ? line[1] : text || "").trim();
  if (!value || value === "full") return { mode: "full" };
  const m = /^smoke(?:\s+(.*))?$/.exec(value);
  if (!m) throw new Error(`CI suite "${value}": expected "full", "smoke" or "smoke <area>[,<area>…]" (as its own line "CI-Suite: …")`);
  const areas = [];
  for (const raw of (m[1] || "").split(/[\s,]+/).filter(Boolean)) {
    const a = ALIASES[raw] || raw;
    if (!AREAS[a]) throw new Error(`CI suite: unknown area "${raw}". Areas: ${Object.keys(AREAS).join(", ")}`);
    if (!areas.includes(a)) areas.push(a);
  }
  return { mode: "smoke", areas };
}

// Playwright projects of a smoke run (all Chromium): "area" = every test of the named areas, "smoke" = @smoke of the rest
function projects(plan) {
  const named = plan.areas.flatMap(a => AREAS[a].specs).map(file);
  const rest = Object.values(AREAS).flatMap(a => a.specs).map(file).filter(f => !named.includes(f));
  const list = [];
  if (named.length) list.push({ name: "area", use: { browserName: "chromium" }, testMatch: named });
  list.push({ name: "smoke", use: { browserName: "chromium" }, testMatch: rest, grep: /@smoke/ });
  return list;
}

function describe(plan) {
  if (plan.mode === "full") return "full suite";
  return "smoke (Chromium): " + (plan.areas.length ? `every test of ${plan.areas.join(", ")} + ` : "") + "@smoke core tests"
    + (plan.areas.length ? " of the other areas" : " of every area");
}

module.exports = { AREAS, ALIASES, parse, projects, describe };

if (require.main === module) {
  const arg = process.argv.slice(2).join(" ");
  if (!arg) {
    for (const [name, a] of Object.entries(AREAS)) console.log(`${name.padEnd(16)}${a.specs.map(file).join(" ").padEnd(56)}${a.about}`);
    console.log("aliases: " + Object.entries(ALIASES).map(([k, v]) => `${k} → ${v}`).join(", "));
  } else {
    let plan;
    try { plan = parse(arg); } catch (e) { console.error(e.message); process.exit(1); }
    console.log(describe(plan));
    if (plan.mode === "smoke") for (const p of projects(plan)) console.log(`  ${p.name}: ${p.testMatch.join(" ")}${p.grep ? " (only @smoke)" : ""}`);
  }
}
