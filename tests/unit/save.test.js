/* website/save.php: access, only three files, only the admin page's format, backup, atomic replacement.
   Needs PHP: "php" in the PATH or DSM_PHP (e.g. DSM_PHP="npx --yes --prefer-offline @php-wasm/cli@3.1.56" npm test – same cache
   as npm run local), otherwise skipped. */
"use strict";
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, execSync } = require("child_process");
const { WEB, TMP } = require("../helpers/load.js");

function phpCommand() {
  if (process.env.DSM_PHP) return process.env.DSM_PHP;
  try { execFileSync("php", ["-v"], { stdio: "ignore" }); return "php"; } catch (e) { return null; }
}
const PHP = phpCommand();
const KEY = "a".repeat(64);
const HASH = crypto.createHash("sha256").update(KEY).digest("hex");
// Header line of info.js from save.php itself (website/info.js is not committed)
const INFO_HEAD = JSON.parse('"' + fs.readFileSync(path.join(WEB, "save.php"), "utf8").match(/'info\.js' => \["(.*?)", 'hours'\]/)[1] + '"');
const HEAD = {
  "info.js": INFO_HEAD,
  "books.js": fs.readFileSync(path.join(WEB, "books.js"), "utf8").slice(0, 200).split("= ")[0] + "= ",
};

// All cases in one PHP run (php-wasm starts slowly): case = {method, file, key, text, folder}
function php(cases) {
  const dir = path.join(TMP, "save");
  const driver = path.join(dir, "driver.php"), input = path.join(dir, "cases.json");
  fs.writeFileSync(driver, `<?php
define('DSM_SAVE_TEST', true);
require ${JSON.stringify(path.join(WEB, "save.php"))};
$out = [];
foreach (json_decode(file_get_contents(${JSON.stringify(input)}), true) as $c) {
  $out[] = dsm_save($c['method'], $c['file'], $c['key'], function () use ($c) { return $c['text']; }, $c['folder']);
}
echo json_encode($out);
`);
  fs.writeFileSync(input, JSON.stringify(cases.map(c => ({ method: "POST", file: "info.js", key: KEY, text: "", ...c }))));
  const out = execSync(`${PHP} ${JSON.stringify(driver)}`, { encoding: "utf8", maxBuffer: 1 << 26 });
  return JSON.parse(out.slice(out.indexOf("[")));
}
function folder(name, { access = true, files = {} } = {}) {
  const o = path.join(TMP, "save", name);
  fs.rmSync(o, { recursive: true, force: true });
  fs.mkdirSync(o, { recursive: true });
  if (access) fs.writeFileSync(path.join(o, "save-access.php"), `<?php return '${HASH}';\n`);
  for (const [d, t] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(o, d)), { recursive: true });
    fs.writeFileSync(path.join(o, d), t);
  }
  return o;
}

describe("save.php", { skip: !PHP && "no PHP (php in the PATH or DSM_PHP)" }, () => {
  const info = INFO_HEAD + JSON.stringify({ updated: "2026-10-01", hours: { mon: [["08:00", "13:00"]] }, notice: { de: "", it: "" }, closures: [] }, null, 1) + ";\n";
  const books = fs.readFileSync(path.join(WEB, "books.js"), "utf8");
  const OLD = HEAD["info.js"] + '{"updated":"2020-01-01","hours":{}};\n';
  const OBJECT = HEAD["info.js"] + '{"updated":{"x":1},"hours":{}};\n';
  let o = {}, r = [];

  before(() => {
    fs.mkdirSync(path.join(TMP, "save"), { recursive: true });
    o.none = folder("none", { access: false, files: { "info.js": OLD } });
    o.wrong = folder("wrong", { files: { "info.js": OLD } });
    o.good = folder("good", { files: { "info.js": OLD } });
    o.full = folder("full", { files: Object.fromEntries([["info.js", OLD]].concat(
      Array.from({ length: 12 }, (_, i) => [`backup/info-20200101-0000${String(i).padStart(2, "0")}.js`, "old"]))) });
    o.twice = folder("twice", { files: { "info.js": OLD } });
    o.object = folder("object", { files: { "info.js": OLD } });
    const cases = [
      { method: "GET", folder: o.none },                                    // 0
      { folder: o.none, text: info },                                       // 1
      { method: "GET", folder: o.good },                                    // 2
      { method: "PUT", folder: o.good },                                    // 3
      { folder: o.wrong, text: info, key: "b".repeat(64) },                 // 4
      { folder: o.wrong, text: info, key: "" },                             // 5
      { folder: o.wrong, text: info, file: "../info.js" },                  // 6
      { folder: o.wrong, text: info, file: "admin.html" },                  // 7
      { folder: o.wrong, text: HEAD["info.js"] + '{"hours":{}};alert(1);\n' },          // 8 foreign code
      { folder: o.wrong, text: HEAD["info.js"] + '{"updated":"x"};\n' },                // 9 required field missing
      { folder: o.wrong, text: HEAD["info.js"] + '[{"hours":{}}];\n' },                 // 10 not an object
      { folder: o.wrong, text: info.replace(/;\n$/, "\n") },                             // 11 end missing
      { folder: o.wrong, text: "window.DSM_INFO = " + info.split("= ").slice(1).join("= ") }, // 12 header line missing
      { folder: o.wrong, text: info, file: "books.js" },                    // 13 wrong header line for the file
      { folder: o.wrong, text: "" },                                        // 14 empty
      { folder: o.good, text: info },                                       // 15 good
      { folder: o.good, text: books, file: "books.js" },                    // 16 books.js (new, without a predecessor)
      { folder: o.full, text: info },                                       // 17 thin out backups
      { folder: o.twice, text: HEAD["info.js"] + '{"updated":"2020-02-02","hours":{}};\n' }, // 18 twice in the same second
      { folder: o.twice, text: info },                                      // 19
      { folder: o.object, text: OBJECT },                                   // 20 updated not a string
    ];
    r = php(cases);
  });

  test("without save-access.php: not ready, accepts nothing", () => {
    assert.deepEqual(r[0], [200, { ready: false, reason: "access" }]);
    assert.deepEqual(r[1], [503, { error: "access" }]);
    assert.equal(fs.readFileSync(path.join(o.none, "info.js"), "utf8"), OLD);
  });
  test("with access: ready; only GET and POST", () => {
    assert.deepEqual(r[2], [200, { ready: true }]);
    assert.equal(r[3][0], 405);
  });
  test("wrong or missing key: 403", () => {
    assert.deepEqual(r[4], [403, { error: "key" }]);
    assert.deepEqual(r[5], [403, { error: "key" }]);
  });
  test("only books.js, recommendations.js, info.js", () => {
    assert.deepEqual(r[6], [400, { error: "file" }]);
    assert.deepEqual(r[7], [400, { error: "file" }]);
  });
  test('only the admin page\'s format (header line + JSON object with the required field + ";")', () => {
    for (const i of [8, 9, 10, 11, 12, 13]) assert.deepEqual(r[i], [422, { error: "format" }], `case ${i}`);
    assert.deepEqual(r[14], [400, { error: "empty" }]);
  });
  test("rejected requests change nothing", () => {
    assert.equal(fs.readFileSync(path.join(o.wrong, "info.js"), "utf8"), OLD);
    assert.ok(!fs.existsSync(path.join(o.wrong, "books.js")));
    assert.ok(!fs.existsSync(path.join(o.wrong, "backup")));
  });
  test("valid: file replaced byte for byte, old version in backup/, no leftovers", () => {
    assert.equal(r[15][0], 200);
    assert.deepEqual(r[15][1], { ok: true, file: "info.js", bytes: Buffer.byteLength(info), updated: JSON.parse(info.split("= ").slice(1).join("= ").slice(0, -2)).updated });
    assert.equal(fs.readFileSync(path.join(o.good, "info.js"), "utf8"), info);
    const s = fs.readdirSync(path.join(o.good, "backup")).filter(n => n.endsWith(".js"));
    assert.equal(s.length, 1);
    assert.match(s[0], /^info-\d{8}-\d{6}\.js$/);
    assert.equal(fs.readFileSync(path.join(o.good, "backup", s[0]), "utf8"), OLD);
    assert.equal(r[16][0], 200);
    assert.equal(fs.readFileSync(path.join(o.good, "books.js"), "utf8"), books);
    assert.deepEqual(fs.readdirSync(o.good).filter(n => n.endsWith(".new")), []);
  });
  test("at most 10 backups per file, the newest stays", () => {
    assert.equal(r[17][0], 200);
    const s = fs.readdirSync(path.join(o.full, "backup")).filter(n => n.endsWith(".js")).sort();
    assert.equal(s.length, 10);
    assert.equal(fs.readFileSync(path.join(o.full, "backup", s[9]), "utf8"), OLD);
    assert.ok(!s.includes("info-20200101-000000.js"));
  });
  test("backup/ locked for visitors (new and already existing folder)", () => {
    for (const f of [o.good, o.full]) assert.match(fs.readFileSync(path.join(f, "backup", ".htaccess"), "utf8"), /Require all denied[\s\S]*Deny from all/);
  });
  test("twice in the same second: no backup overwritten, the newest sorts last", () => {
    assert.equal(r[18][0], 200);
    assert.equal(r[19][0], 200);
    const s = fs.readdirSync(path.join(o.twice, "backup")).filter(n => n.endsWith(".js")).sort();
    assert.equal(s.length, 2);
    assert.equal(fs.readFileSync(path.join(o.twice, "backup", s[0]), "utf8"), OLD);
    assert.match(fs.readFileSync(path.join(o.twice, "backup", s[1]), "utf8"), /2020-02-02/);
  });
  test("updated not a string: saved, response without an error", () => {
    assert.deepEqual(r[20][1], { ok: true, file: "info.js", bytes: Buffer.byteLength(OBJECT), updated: "" });
    assert.equal(fs.readFileSync(path.join(o.object, "info.js"), "utf8"), OBJECT);
  });
});
