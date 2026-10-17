/* Shared helpers: paths, loading browser data files (window.X = …) in Node, normalization as in the page. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const WEB = path.join(ROOT, "website");
const TMP = path.join(ROOT, "tests", ".tmp");

// Loads a file of the form "window.NAME = {...};" and returns window (missing: an empty window)
function browserFile(rel) {
  const ctx = { window: {} };
  if (rel === "info.js" && !fs.existsSync(path.join(WEB, rel))) return ctx.window; // info.js is not committed
  vm.runInNewContext(fs.readFileSync(path.join(WEB, rel), "utf8"), ctx, { filename: rel });
  return ctx.window;
}
const data = () => ({
  B: browserFile("books.js").DSM_LIBRARY,
  R: browserFile("recommendations.js").DSM_RECOMMENDATIONS,
  I: browserFile("info.js").DSM_INFO,
  C: browserFile("assets/categories-it.js").DSM_CATEGORIES_IT,
});

// norm() as in src/library/data.js / extract.js
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();
const keyOf = b => norm(b.t) + "|" + norm((b.a && b.a[0]) || "");

// Search as in the page (all terms in title, subtitle, authors, ISBN, publisher)
function hits(books, q) {
  const terms = norm(q).split(" ").filter(Boolean);
  return books.filter(b => {
    const s = norm([b.t, b.s, (b.a || []).join(" "), (b.i || []).join(" "), b.p].join(" "));
    return terms.every(t => s.includes(t));
  });
}

// Original database (data/ is not committed). Also found from inside a git worktree.
function realDb() {
  const name = "BIBLIOTHEK_DSM_2024.winbook";
  const candidates = [process.env.DSM_DB, path.join(ROOT, "data", name)];
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: ROOT, encoding: "utf8" }).trim();
    candidates.push(path.join(path.dirname(common), "data", name));
  } catch (e) { /* no git */ }
  return candidates.find(p => p && fs.existsSync(p)) || null;
}

module.exports = { ROOT, WEB, TMP, browserFile, data, norm, keyOf, hits, realDb };
