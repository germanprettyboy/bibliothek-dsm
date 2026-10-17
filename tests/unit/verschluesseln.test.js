/* Admin-Verschlüsselung: Roundtrip, falsches Passwort, Parameter. Optional: ist admin.enc.js aktuell? (DSM_ADMIN_PW) */
"use strict";
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");
const { webcrypto: crypto } = require("crypto");
const { ROOT, WEB, TMP } = require("../helfer/laden.js");

const TOOL = path.join(ROOT, "werkzeuge", "admin-verschluesseln.js");
// Klartext wie im Werkzeug: Schlüssel für speichern.php + extract.js + gebaute Verwaltung (werkzeuge/quelle/verwaltung/, React)
const { quelleBauen, klartext, speicherSchluessel } = require(TOOL);
let quelleText = null;
const quelle = async () => (quelleText ??= await quelleBauen());
const zeile = async pw => "var DSM_SPEICHERN_SCHLUESSEL = " + JSON.stringify(await speicherSchluessel(pw)) + ";\n";

function lesen(datei) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(datei, "utf8"), ctx);
  return ctx.window.DSM_ADMIN_ENC;
}
// Gleiche Schritte wie admin-lock.js im Browser
async function entschluesseln(enc, pw) {
  const dec = s => Uint8Array.from(Buffer.from(s, "base64"));
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: dec(enc.salt), iterations: enc.iter },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: dec(enc.iv) }, key, dec(enc.data)));
}

describe("admin-verschluesseln.js", () => {
  const out1 = path.join(TMP, "unit-enc-1.js"), out2 = path.join(TMP, "unit-enc-2.js");
  let a, b;
  before(() => {
    fs.mkdirSync(TMP, { recursive: true });
    execFileSync(process.execPath, [TOOL, "test-passwort", out1]);
    execFileSync(process.execPath, [TOOL, "test-passwort", out2]);
    a = lesen(out1); b = lesen(out2);
  });

  test("Parameter: v1, PBKDF2 310.000, Salz 16 Byte, IV 12 Byte", () => {
    assert.equal(a.v, 1);
    assert.equal(a.iter, 310000);
    assert.equal(Buffer.from(a.salt, "base64").length, 16);
    assert.equal(Buffer.from(a.iv, "base64").length, 12);
  });
  test("Salz und IV bei jedem Lauf neu", () => {
    assert.notEqual(a.salt, b.salt);
    assert.notEqual(a.iv, b.iv);
    assert.notEqual(a.data, b.data);
  });
  test("richtiges Passwort: ergibt Schlüssel + extract.js + gebaute Verwaltung", async () => {
    const q = await quelle();
    assert.equal(await entschluesseln(a, "test-passwort"), (await zeile("test-passwort")) + q);
    assert.ok(q.includes("window.DSMExtract") || q.includes("root.DSMExtract"));
    assert.match(q, /window\.DSM_VERWALTUNG\s*=/);
  });
  test("Verwaltung nutzt React und Bausteine der Seite (keine zweite React-Kopie)", async () => {
    const q = await quelle();
    assert.match(q, /DSM_GEMEINSAM\.react\b/);
    assert.ok(!/react\.dev\/errors/.test(q), "React steckt nicht im verschlüsselten Teil");
    // jedes benutzte gemeinsame Modul stellt die Seite bereit
    const gem = fs.readFileSync(path.join(ROOT, "src", "verwaltung", "gemeinsam.js"), "utf8");
    for (const m of q.matchAll(/DSM_GEMEINSAM\[`([^`]+)`\]/g)) assert.ok(gem.includes(`"${m[1]}":`), m[1]);
  });
  test("Schlüssel für speichern.php: fest je Passwort, unabhängig vom AES-Salz, Hash in speichern-zugang.php", async () => {
    const k = await speicherSchluessel("test-passwort");
    assert.match(k, /^[0-9a-f]{64}$/);
    assert.equal(await speicherSchluessel("test-passwort"), k);
    assert.notEqual(await speicherSchluessel("Test-passwort"), k);
    const zu = fs.readFileSync(path.join(TMP, "speichern-zugang.php"), "utf8");
    const hash = require("crypto").createHash("sha256").update(k).digest("hex");
    assert.match(zu, /^<\?php /);
    assert.ok(zu.includes(`return '${hash}';`));
    assert.ok(!zu.includes(k), "nur der Hash, nicht der Schlüssel");
    assert.ok(!fs.readFileSync(out1, "utf8").includes(k), "Schlüssel nur verschlüsselt");
  });
  test("falsches Passwort: Entschlüsselung schlägt fehl", async () => {
    await assert.rejects(entschluesseln(a, "Test-passwort"));
    await assert.rejects(entschluesseln(a, ""));
  });
  test("Klartext steht nicht in der verschlüsselten Datei", () => {
    const s = fs.readFileSync(out1, "utf8");
    for (const m of ["PERSONAL_TABLES", "dsm-empf-entwurf", "showDirectoryPicker", "verliehenan"]) assert.ok(!s.includes(m), m);
  });
  test("ohne Passwort: Abbruch mit Fehlercode", () => {
    assert.throws(() => execFileSync(process.execPath, [TOOL], { stdio: "pipe" }));
  });
});

describe("veröffentlichte admin.enc.js", () => {
  const enc = lesen(path.join(WEB, "assets", "admin.enc.js"));
  test("Format und Parameter", () => {
    assert.equal(enc.v, 1);
    assert.equal(enc.iter, 310000);
    assert.ok(enc.data.length > 1000);
  });
  test("ist aktuell (gleich werkzeuge/quelle/*) – nur mit DSM_ADMIN_PW", { skip: !process.env.DSM_ADMIN_PW && "DSM_ADMIN_PW nicht gesetzt" }, async () => {
    const plain = await entschluesseln(enc, process.env.DSM_ADMIN_PW);
    assert.ok(plain === await klartext(process.env.DSM_ADMIN_PW), "admin.enc.js ist veraltet: node werkzeuge/admin-verschluesseln.js");
  });
});
