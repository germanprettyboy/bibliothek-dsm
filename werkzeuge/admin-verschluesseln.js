/*
 * Verschlüsselt die Verwaltungslogik für admin.html.
 *
 *   node admin-verschluesseln.js "<Passwort>" [Zieldatei]
 *
 * Liest quelle/extract.js und quelle/admin.js, verschlüsselt beide zusammen mit AES-GCM 256
 * (Schlüssel per PBKDF2-SHA-256, 310.000 Durchläufe, zufälliges Salz) und schreibt
 * ../website/assets/admin.enc.js. Das Passwort wird nirgends gespeichert.
 * Benötigt Node.js 18 oder neuer.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { webcrypto: crypto } = require("crypto");

// Passwort verdeckt im Terminal abfragen (landet so nicht in der Shell-History)
function frage(text) {
  return new Promise(res => {
    const rl = require("readline").createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.startsWith(text)) process.stdout.write(s); };
    rl.question(text, a => { rl.close(); process.stdout.write("\n"); res(a); });
  });
}

(async () => {
  let pw = process.argv[2];
  const out = process.argv[3] || path.join(__dirname, "..", "website", "assets", "admin.enc.js");
  if (!pw && process.stdin.isTTY) {
    pw = await frage("Passwort: ");
    if (pw && (await frage("Passwort wiederholen: ")) !== pw) { console.error("Die Passwörter stimmen nicht überein."); process.exit(1); }
  }
  if (!pw) { console.error('Aufruf: node admin-verschluesseln.js "<Passwort>" [Zieldatei]  (ohne Passwort: verdeckte Abfrage im Terminal)'); process.exit(1); }
  const src = ["extract.js", "admin.js"].map(f => fs.readFileSync(path.join(__dirname, "quelle", f), "utf8")).join("\n;\n");
  const iter = 310000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(src)));
  const b64 = u => Buffer.from(u).toString("base64");
  fs.writeFileSync(out, "/* Verwaltung der Bibliothek, verschlüsselt. Erzeugt mit werkzeuge/admin-verschluesseln.js. */\n" +
    "window.DSM_ADMIN_ENC = " + JSON.stringify({ v: 1, iter, salt: b64(salt), iv: b64(iv), data: b64(data) }) + ";\n");
  console.log("geschrieben:", out, "(" + data.length + " Bytes verschlüsselt)");
})();
