/* npm run pack (tools/pack.mjs): the upload folder contains exactly the committed website/, nothing local. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(__dirname, "..", ".tmp", "pack");

test("upload folder = git ls-files website/, without local files", () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "pack.mjs"), OUT, "--ignore-encryption"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else files.push(path.relative(OUT, p).split(path.sep).join("/"));
    }
  })(path.join(OUT, "website"));
  const committed = execFileSync("git", ["-C", ROOT, "ls-files", "website"], { encoding: "utf8" }).trim().split("\n");
  assert.deepEqual(files.sort(), committed.sort());
  for (const f of files) assert.ok(!/(^|\/)(\.DS_Store|info\.js|backup\/|sicherung\/)/.test(f.replace(/^website\//, "")), f);
  assert.ok(files.includes("website/.htaccess") && files.includes("website/save.php") && files.includes("website/index.html"));
});
