/* docs/sitemap.md (Claude's file map, CLAUDE.md "Token economy"): every tracked file has an entry, every entry exists. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { ROOT } = require("../helpers/load.js");

let files = null;
try {
  files = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" }).split("\0").filter(Boolean);
} catch (e) { /* no git (downloaded archive): nothing to compare */ }

// Entry = first `code` of a list item: a file, "dir/" (everything below) or a pattern ("*" = within one path segment)
const entries = fs.readFileSync(path.join(ROOT, "docs", "sitemap.md"), "utf8").split("\n")
  .map(l => /^- `([^`]+)`/.exec(l)).filter(Boolean).map(m => m[1]);
const escape = s => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
const matcher = e => {
  if (e.endsWith("/")) return f => f.startsWith(e);
  if (e.includes("*")) {
    const re = new RegExp("^" + e.split("*").map(escape).join("[^/]*") + "$");
    return f => re.test(f);
  }
  return f => f === e;
};
const matchers = entries.map(matcher);

test("every tracked file has an entry in docs/sitemap.md", { skip: !files }, () => {
  const missing = files.filter(f => !matchers.some(m => m(f)));
  assert.deepEqual(missing, [], "new file → add a line to docs/sitemap.md");
});

test("every entry of docs/sitemap.md matches a tracked file, none twice", { skip: !files }, () => {
  const stale = entries.filter((e, i) => !files.some(matchers[i]));
  assert.deepEqual(stale, [], "renamed or deleted file → change its line in docs/sitemap.md");
  assert.deepEqual(entries.filter((e, i) => entries.indexOf(e) !== i), [], "entry listed twice");
});
