/* Admin encryption: round trip, wrong password, parameters. Optional: is admin.enc.js current? (DSM_ADMIN_PW) */
"use strict";
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");
const { webcrypto: crypto } = require("crypto");
const { ROOT, WEB, TMP } = require("../helpers/load.js");

const TOOL = path.join(ROOT, "tools", "encrypt-admin.js");
// Plaintext as in the tool: key for save.php + extract.js + built admin app (tools/source/admin/, React)
const { buildSource, plaintext, saveKey } = require(TOOL);
let sourceText = null;
const source = async () => (sourceText ??= await buildSource());
const keyLine = async pw => "var DSM_SAVE_KEY = " + JSON.stringify(await saveKey(pw)) + ";\n";

function read(file) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), ctx);
  return ctx.window.DSM_ADMIN_ENC;
}
// Same steps as the lock in the browser (src/admin/lock.jsx)
async function decrypt(enc, pw) {
  const dec = s => Uint8Array.from(Buffer.from(s, "base64"));
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: dec(enc.salt), iterations: enc.iter },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: dec(enc.iv) }, key, dec(enc.data)));
}

describe("encrypt-admin.js", () => {
  const out1 = path.join(TMP, "unit-enc-1.js"), out2 = path.join(TMP, "unit-enc-2.js");
  let a, b;
  before(() => {
    fs.mkdirSync(TMP, { recursive: true });
    execFileSync(process.execPath, [TOOL, "test-password", out1]);
    execFileSync(process.execPath, [TOOL, "test-password", out2]);
    a = read(out1); b = read(out2);
  });

  test("parameters: v1, PBKDF2 310,000, salt 16 bytes, IV 12 bytes", () => {
    assert.equal(a.v, 1);
    assert.equal(a.iter, 310000);
    assert.equal(Buffer.from(a.salt, "base64").length, 16);
    assert.equal(Buffer.from(a.iv, "base64").length, 12);
  });
  test("salt and IV new on every run", () => {
    assert.notEqual(a.salt, b.salt);
    assert.notEqual(a.iv, b.iv);
    assert.notEqual(a.data, b.data);
  });
  test("right password: yields key + extract.js + built admin app", async () => {
    const q = await source();
    assert.equal(await decrypt(a, "test-password"), (await keyLine("test-password")) + q);
    assert.ok(q.includes("window.DSMExtract") || q.includes("root.DSMExtract"));
    assert.match(q, /window\.DSM_ADMIN\s*=/);
  });
  test("admin app uses React and the building blocks of the page (no second copy of React)", async () => {
    const q = await source();
    assert.match(q, /DSM_SHARED\.react\b/);
    assert.ok(!/react\.dev\/errors/.test(q), "React is not inside the encrypted part");
    // the page provides every shared module that is used
    const shared = fs.readFileSync(path.join(ROOT, "src", "admin", "shared.js"), "utf8");
    for (const m of q.matchAll(/DSM_SHARED\[`([^`]+)`\]/g)) assert.ok(shared.includes(`"${m[1]}":`), m[1]);
  });
  test("key for save.php: fixed per password, independent of the AES salt, hash in save-access.php", async () => {
    const k = await saveKey("test-password");
    assert.match(k, /^[0-9a-f]{64}$/);
    assert.equal(await saveKey("test-password"), k);
    assert.notEqual(await saveKey("Test-password"), k);
    const access = fs.readFileSync(path.join(TMP, "save-access.php"), "utf8");
    const hash = require("crypto").createHash("sha256").update(k).digest("hex");
    assert.match(access, /^<\?php /);
    assert.ok(access.includes(`return '${hash}';`));
    assert.ok(!access.includes(k), "only the hash, not the key");
    assert.ok(!fs.readFileSync(out1, "utf8").includes(k), "key only encrypted");
  });
  test("wrong password: decryption fails", async () => {
    await assert.rejects(decrypt(a, "Test-password"));
    await assert.rejects(decrypt(a, ""));
  });
  test("the plaintext is not in the encrypted file", () => {
    const s = fs.readFileSync(out1, "utf8");
    for (const m of ["PERSONAL_TABLES", "dsm-recs-draft", "showDirectoryPicker", "verliehenan"]) assert.ok(!s.includes(m), m);
  });
  test("without a password: abort with an error code", () => {
    assert.throws(() => execFileSync(process.execPath, [TOOL], { stdio: "pipe" }));
  });
});

describe("published admin.enc.js", () => {
  const enc = read(path.join(WEB, "assets", "admin.enc.js"));
  test("format and parameters", () => {
    assert.equal(enc.v, 1);
    assert.equal(enc.iter, 310000);
    assert.ok(enc.data.length > 1000);
  });
  test("is current (equal to tools/source/*) – only with DSM_ADMIN_PW", { skip: !process.env.DSM_ADMIN_PW && "DSM_ADMIN_PW not set" }, async () => {
    const plain = await decrypt(enc, process.env.DSM_ADMIN_PW);
    assert.ok(plain === await plaintext(process.env.DSM_ADMIN_PW), "admin.enc.js is outdated: node tools/encrypt-admin.js");
  });
});
