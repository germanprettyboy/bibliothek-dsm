/* website/speichern.php: Zugang, nur drei Dateien, nur das Format der Verwaltung, Sicherung, atomares Ersetzen.
   Braucht PHP: „php“ im PATH oder DSM_PHP (z. B. DSM_PHP="npx --yes --prefer-offline @php-wasm/cli@3.1.56" npm test – gleicher Cache wie npm run lokal), sonst übersprungen. */
"use strict";
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, execSync } = require("child_process");
const { WEB, TMP } = require("../helfer/laden.js");

function phpBefehl() {
  if (process.env.DSM_PHP) return process.env.DSM_PHP;
  try { execFileSync("php", ["-v"], { stdio: "ignore" }); return "php"; } catch (e) { return null; }
}
const PHP = phpBefehl();
const SCHLUESSEL = "a".repeat(64);
const HASH = crypto.createHash("sha256").update(SCHLUESSEL).digest("hex");
const KOPF = {
  "info.js": fs.readFileSync(path.join(WEB, "info.js"), "utf8").split("= ")[0] + "= ",
  "books.js": fs.readFileSync(path.join(WEB, "books.js"), "utf8").slice(0, 200).split("= ")[0] + "= ",
};

// Alle Fälle in einem PHP-Lauf (php-wasm startet langsam): Fall = {methode, datei, schluessel, text, ordner}
function php(faelle) {
  const dir = path.join(TMP, "speichern");
  const treiber = path.join(dir, "treiber.php"), eingabe = path.join(dir, "faelle.json");
  fs.writeFileSync(treiber, `<?php
define('DSM_SPEICHERN_TEST', true);
require ${JSON.stringify(path.join(WEB, "speichern.php"))};
$aus = [];
foreach (json_decode(file_get_contents(${JSON.stringify(eingabe)}), true) as $f) {
  $aus[] = dsm_speichern($f['methode'], $f['datei'], $f['schluessel'], function () use ($f) { return $f['text']; }, $f['ordner']);
}
echo json_encode($aus);
`);
  fs.writeFileSync(eingabe, JSON.stringify(faelle.map(f => ({ methode: "POST", datei: "info.js", schluessel: SCHLUESSEL, text: "", ...f }))));
  const out = execSync(`${PHP} ${JSON.stringify(treiber)}`, { encoding: "utf8", maxBuffer: 1 << 26 });
  return JSON.parse(out.slice(out.indexOf("[")));
}
function ordner(name, { zugang = true, dateien = {} } = {}) {
  const o = path.join(TMP, "speichern", name);
  fs.rmSync(o, { recursive: true, force: true });
  fs.mkdirSync(o, { recursive: true });
  if (zugang) fs.writeFileSync(path.join(o, "speichern-zugang.php"), `<?php return '${HASH}';\n`);
  for (const [d, t] of Object.entries(dateien)) {
    fs.mkdirSync(path.dirname(path.join(o, d)), { recursive: true });
    fs.writeFileSync(path.join(o, d), t);
  }
  return o;
}

describe("speichern.php", { skip: !PHP && "kein PHP (php im PATH oder DSM_PHP)" }, () => {
  const info = fs.readFileSync(path.join(WEB, "info.js"), "utf8");
  const books = fs.readFileSync(path.join(WEB, "books.js"), "utf8");
  const ALT = KOPF["info.js"] + '{"stand":"2020-01-01","zeiten":{}};\n';
  const OBJEKT = KOPF["info.js"] + '{"stand":{"x":1},"zeiten":{}};\n';
  let o = {}, r = [];

  before(() => {
    fs.mkdirSync(path.join(TMP, "speichern"), { recursive: true });
    o.ohne = ordner("ohne", { zugang: false, dateien: { "info.js": ALT } });
    o.falsch = ordner("falsch", { dateien: { "info.js": ALT } });
    o.gut = ordner("gut", { dateien: { "info.js": ALT } });
    o.voll = ordner("voll", { dateien: Object.fromEntries([["info.js", ALT]].concat(
      Array.from({ length: 12 }, (_, i) => [`sicherung/info-20200101-0000${String(i).padStart(2, "0")}.js`, "alt"]))) });
    o.zweimal = ordner("zweimal", { dateien: { "info.js": ALT } });
    o.objekt = ordner("objekt", { dateien: { "info.js": ALT } });
    const faelle = [
      { methode: "GET", ordner: o.ohne },                                   // 0
      { ordner: o.ohne, text: info },                                       // 1
      { methode: "GET", ordner: o.gut },                                    // 2
      { methode: "PUT", ordner: o.gut },                                    // 3
      { ordner: o.falsch, text: info, schluessel: "b".repeat(64) },         // 4
      { ordner: o.falsch, text: info, schluessel: "" },                     // 5
      { ordner: o.falsch, text: info, datei: "../info.js" },                // 6
      { ordner: o.falsch, text: info, datei: "admin.html" },                // 7
      { ordner: o.falsch, text: KOPF["info.js"] + '{"zeiten":{}};alert(1);\n' },        // 8 fremder Code
      { ordner: o.falsch, text: KOPF["info.js"] + '{"stand":"x"};\n' },                 // 9 Pflichtfeld fehlt
      { ordner: o.falsch, text: KOPF["info.js"] + '[{"zeiten":{}}];\n' },               // 10 kein Objekt
      { ordner: o.falsch, text: info.replace(/;\n$/, "\n") },                            // 11 Ende fehlt
      { ordner: o.falsch, text: "window.DSM_INFO = " + info.split("= ").slice(1).join("= ") }, // 12 Kopfzeile fehlt
      { ordner: o.falsch, text: info, datei: "books.js" },                  // 13 falsche Kopfzeile für die Datei
      { ordner: o.falsch, text: "" },                                       // 14 leer
      { ordner: o.gut, text: info },                                        // 15 gut
      { ordner: o.gut, text: books, datei: "books.js" },                    // 16 books.js (neu, ohne Vorgänger)
      { ordner: o.voll, text: info },                                       // 17 Sicherungen ausdünnen
      { ordner: o.zweimal, text: KOPF["info.js"] + '{"stand":"2020-02-02","zeiten":{}};\n' }, // 18 zweimal in derselben Sekunde
      { ordner: o.zweimal, text: info },                                    // 19
      { ordner: o.objekt, text: OBJEKT },                                   // 20 stand kein Text
    ];
    r = php(faelle);
  });

  test("ohne speichern-zugang.php: nicht bereit, nimmt nichts an", () => {
    assert.deepEqual(r[0], [200, { bereit: false, grund: "zugang" }]);
    assert.deepEqual(r[1], [503, { fehler: "zugang" }]);
    assert.equal(fs.readFileSync(path.join(o.ohne, "info.js"), "utf8"), ALT);
  });
  test("mit Zugang: bereit; nur GET und POST", () => {
    assert.deepEqual(r[2], [200, { bereit: true }]);
    assert.equal(r[3][0], 405);
  });
  test("falscher oder fehlender Schlüssel: 403", () => {
    assert.deepEqual(r[4], [403, { fehler: "schluessel" }]);
    assert.deepEqual(r[5], [403, { fehler: "schluessel" }]);
  });
  test("nur books.js, empfehlungen.js, info.js", () => {
    assert.deepEqual(r[6], [400, { fehler: "datei" }]);
    assert.deepEqual(r[7], [400, { fehler: "datei" }]);
  });
  test("nur das Format der Verwaltung (Kopfzeile + JSON-Objekt mit Pflichtfeld + „;“)", () => {
    for (const i of [8, 9, 10, 11, 12, 13]) assert.deepEqual(r[i], [422, { fehler: "format" }], `Fall ${i}`);
    assert.deepEqual(r[14], [400, { fehler: "leer" }]);
  });
  test("abgelehnte Anfragen ändern nichts", () => {
    assert.equal(fs.readFileSync(path.join(o.falsch, "info.js"), "utf8"), ALT);
    assert.ok(!fs.existsSync(path.join(o.falsch, "books.js")));
    assert.ok(!fs.existsSync(path.join(o.falsch, "sicherung")));
  });
  test("gültig: Datei byte-gleich ersetzt, alte Fassung in sicherung/, keine Reste", () => {
    assert.equal(r[15][0], 200);
    assert.deepEqual(r[15][1], { ok: true, datei: "info.js", bytes: Buffer.byteLength(info), stand: JSON.parse(info.split("= ").slice(1).join("= ").slice(0, -2)).stand });
    assert.equal(fs.readFileSync(path.join(o.gut, "info.js"), "utf8"), info);
    const s = fs.readdirSync(path.join(o.gut, "sicherung")).filter(n => n.endsWith(".js"));
    assert.equal(s.length, 1);
    assert.match(s[0], /^info-\d{8}-\d{6}\.js$/);
    assert.equal(fs.readFileSync(path.join(o.gut, "sicherung", s[0]), "utf8"), ALT);
    assert.equal(r[16][0], 200);
    assert.equal(fs.readFileSync(path.join(o.gut, "books.js"), "utf8"), books);
    assert.deepEqual(fs.readdirSync(o.gut).filter(n => n.endsWith(".neu")), []);
  });
  test("höchstens 10 Sicherungen je Datei, die neueste bleibt", () => {
    assert.equal(r[17][0], 200);
    const s = fs.readdirSync(path.join(o.voll, "sicherung")).filter(n => n.endsWith(".js")).sort();
    assert.equal(s.length, 10);
    assert.equal(fs.readFileSync(path.join(o.voll, "sicherung", s[9]), "utf8"), ALT);
    assert.ok(!s.includes("info-20200101-000000.js"));
  });
  test("zweimal in derselben Sekunde: keine Sicherung überschrieben, neueste sortiert zuletzt", () => {
    assert.equal(r[18][0], 200);
    assert.equal(r[19][0], 200);
    const s = fs.readdirSync(path.join(o.zweimal, "sicherung")).filter(n => n.endsWith(".js")).sort();
    assert.equal(s.length, 2);
    assert.equal(fs.readFileSync(path.join(o.zweimal, "sicherung", s[0]), "utf8"), ALT);
    assert.match(fs.readFileSync(path.join(o.zweimal, "sicherung", s[1]), "utf8"), /2020-02-02/);
  });
  test("stand kein Text: gespeichert, Antwort ohne Fehler", () => {
    assert.deepEqual(r[20][1], { ok: true, datei: "info.js", bytes: Buffer.byteLength(OBJEKT), stand: "" });
    assert.equal(fs.readFileSync(path.join(o.objekt, "info.js"), "utf8"), OBJEKT);
  });
});
