/* website/save.php: access, only three files, only the admin page's format, backup, atomic replacement.
   Needs PHP: "php" in the PATH or DSM_PHP (e.g. DSM_PHP="npx --yes --prefer-offline @php-wasm/cli@3.1.56" npm test – same cache
   as npm run local), otherwise skipped. */
"use strict";
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const net = require("net");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, execSync, spawn } = require("child_process");
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
  $out[] = dsm_save($c['method'], $c['file'], $c['key'], function () use ($c) { return $c['text']; }, $c['folder'], $c['query'] ?? []);
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
  const infoV = u => HEAD["info.js"] + `{"updated":"${u}","hours":{}};\n`;
  const [CUR, INFO_A, INFO_B, INFO_C] = ["2026-10-20", "2026-01-01", "2026-01-02", "2026-01-02b"].map(infoV);
  const BOOKS_OLD = HEAD["books.js"] + '{"updated":"2026-10-20","books":[]};\n';
  const BOOKS_A = HEAD["books.js"] + '{"updated":"2026-01-05","books":[]};\n';
  const q = (query, extra = {}) => ({ folder: o.bk, query, text: "", ...extra });
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
    o.bk = folder("bk", { files: {
      "info.js": CUR, "books.js": BOOKS_OLD,
      "backup/info-20200101-100000.js": INFO_A, "backup/info-20200102-100000.js": INFO_B, "backup/info-20200102-100000b.js": INFO_C,
      "backup/info-20200102.js": INFO_A, "backup/info-20200101-100000.js.bak": INFO_A, "backup/infox-20260101-100000.js": INFO_A,
      "backup/books-20200105-090000.js": BOOKS_A, "backup/books-20200106-090000.js": INFO_A, // second one: wrong format for books.js
    } });
    o.rot = folder("rot", { files: Object.fromEntries([["info.js", CUR]].concat(
      Array.from({ length: 10 }, (_, i) => [`backup/info-20200101-0000${String(i).padStart(2, "0")}.js`, i === 5 ? INFO_A : INFO_B]))) });
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
      q({ backups: "" }, { method: "GET" }),                                // 21 list
      q({ backups: "" }, { method: "GET", key: "b".repeat(64) }),           // 22 list, wrong key
      q({ backups: "" }, { method: "GET", key: "" }),                       // 23 list, no key
      q({ backups: "" }, { method: "GET", folder: o.none }),                // 24 list, no save-access.php
      q({ restore: "info-20200101-100000.js" }),                            // 25 restore
      q({ restore: "../info.js" }),                                         // 26 traversal
      q({ restore: "../backup/info-20200101-100000.js" }),                  // 27 traversal with a valid ending
      q({ restore: "x-20260101-100000.js" }),                               // 28 wrong prefix
      q({ restore: "info-20200101-100000.js\n" }),                          // 29 trailing newline
      q({ restore: "info-20990101-000000.js" }),                            // 30 not there
      q({ restore: "books-20200106-090000.js" }),                           // 31 content does not fit the file
      q({ restore: "info-20200102-100000.js" }, { key: "b".repeat(64) }),   // 32 wrong key
      q({ restore: "" }),                                                   // 33 empty name
      q({ restore: "books-20200105-090000.js" }, { method: "PUT" }),        // 34 wrong method
      { folder: o.rot, query: { restore: "info-20200101-000005.js" } },     // 35 restore with 10 backups present
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
  test("backup list: key required, only the exact naming of each file, newest first", () => {
    const e = n => ({ name: n, size: Buffer.byteLength(n.startsWith("books") ? BOOKS_A : INFO_A) });
    assert.equal(r[21][0], 200);
    assert.equal(r[21][1].ok, true);
    const b = r[21][1].backups;
    assert.deepEqual(Object.keys(b), ["books.js", "recommendations.js", "info.js"]);
    assert.deepEqual(b["info.js"].map(x => x.name), ["info-20200102-100000b.js", "info-20200102-100000.js", "info-20200101-100000.js"]);
    assert.deepEqual(b["info.js"][2], { name: "info-20200101-100000.js", size: Buffer.byteLength(INFO_A), time: "2020-01-01T10:00:00" });
    assert.deepEqual(b["books.js"].map(x => x.name), ["books-20200106-090000.js", "books-20200105-090000.js"]);
    assert.equal(b["books.js"][1].size, e("books-20200105-090000.js").size);
    assert.deepEqual(b["recommendations.js"], []);
    assert.deepEqual(r[22], [403, { error: "key" }]);
    assert.deepEqual(r[23], [403, { error: "key" }]);
    assert.deepEqual(r[24], [503, { error: "access" }]);
  });
  test("restore: strict name check, key, method; rejected requests change nothing", () => {
    assert.deepEqual(r[26], [400, { error: "name" }]);
    assert.deepEqual(r[27], [400, { error: "name" }]);
    assert.deepEqual(r[28], [400, { error: "name" }]);
    assert.deepEqual(r[29], [400, { error: "name" }]);
    assert.deepEqual(r[30], [404, { error: "missing" }]);
    assert.deepEqual(r[31], [422, { error: "format" }]);
    assert.deepEqual(r[32], [403, { error: "key" }]);
    assert.deepEqual(r[33], [400, { error: "name" }]);
    assert.equal(r[34][0], 405);
    assert.equal(fs.readFileSync(path.join(o.bk, "books.js"), "utf8"), BOOKS_OLD);
  });
  test("restore: content restored, the current version lands in backup/ first", () => {
    assert.deepEqual(r[25], [200, { ok: true, file: "info.js" }]);
    assert.equal(fs.readFileSync(path.join(o.bk, "info.js"), "utf8"), INFO_A);
    const s = fs.readdirSync(path.join(o.bk, "backup")).filter(n => /^info-\d{8}-\d{6}[a-z]?\.js$/.test(n)).sort();
    assert.equal(s.length, 4);
    assert.equal(fs.readFileSync(path.join(o.bk, "backup", s[s.length - 1]), "utf8"), CUR);
    assert.deepEqual(fs.readdirSync(o.bk).filter(n => n.endsWith(".new")), []);
  });
  test("restore: at most 10 backups, the oldest goes", () => {
    assert.deepEqual(r[35], [200, { ok: true, file: "info.js" }]);
    assert.equal(fs.readFileSync(path.join(o.rot, "info.js"), "utf8"), INFO_A);
    const s = fs.readdirSync(path.join(o.rot, "backup")).filter(n => n.endsWith(".js")).sort();
    assert.equal(s.length, 10);
    assert.ok(!s.includes("info-20200101-000000.js"));
    assert.equal(fs.readFileSync(path.join(o.rot, "backup", s[9]), "utf8"), CUR);
  });
  test("updated not a string: saved, response without an error", () => {
    assert.deepEqual(r[20][1], { ok: true, file: "info.js", bytes: Buffer.byteLength(OBJECT), updated: "" });
    assert.equal(fs.readFileSync(path.join(o.object, "info.js"), "utf8"), OBJECT);
  });
});

// The answer as the admin page gets it, through PHP's web server with display_errors on (php-wasm in npm run local and
// many webspaces): a PHP warning printed before the JSON sent the headers early – status 200, no JSON, "HTTP 200".
describe("save.php over HTTP", { skip: !PHP && "no PHP (php in the PATH or DSM_PHP)" }, () => {
  const info = HEAD["info.js"] + '{"updated":"2026-10-18","hours":{}};\n';
  let server, base, o;

  before(async () => {
    fs.mkdirSync(path.join(TMP, "save"), { recursive: true });
    o = folder("http", { files: { "info.js/x": "" } }); // info.js is a folder: rename() fails with a warning
    const router = path.join(TMP, "save", "router.php");
    fs.writeFileSync(router, `<?php
ini_set('display_errors', '1');
define('DSM_DATA_FOLDER', ${JSON.stringify(o)});
require ${JSON.stringify(path.join(WEB, "save.php"))};
`);
    const port = await new Promise(ok => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
    base = `http://127.0.0.1:${port}/`;
    // own process group: kill() also reaches php-wasm behind npx
    const [cmd, ...args] = PHP.split(" ");
    server = spawn(cmd, [...args, "-S", `127.0.0.1:${port}`, router], { cwd: o, stdio: "ignore", detached: true });
    for (let i = 0; i < 600; i++) {
      try { await fetch(base + "save.php"); return; } catch (e) { await new Promise(ok => setTimeout(ok, 100)); }
    }
    throw new Error("PHP web server does not answer");
  });
  after(() => { try { process.kill(-server.pid); } catch (e) { /* already gone */ } });

  const post = (file, text) => fetch(base + "save.php?file=" + file, { method: "POST", headers: { "X-DSM-Key": KEY }, body: text });

  test("a PHP warning stays out of the answer: real status, JSON", async () => {
    const r = await post("info.js", info);
    assert.equal(r.status, 500);
    assert.match(r.headers.get("content-type"), /^application\/json/);
    assert.deepEqual(await r.json(), { dsm: "save", v: 3, error: "not-writable" });
  });
  test("valid: 200 with ok", async () => {
    const text = HEAD["books.js"] + '{"updated":"2026-10-18","books":[]};\n';
    const r = await post("books.js", text);
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { dsm: "save", v: 3, ok: true, file: "books.js", bytes: Buffer.byteLength(text), updated: "2026-10-18" });
    assert.equal(fs.readFileSync(path.join(o, "books.js"), "utf8"), text);
  });
});
