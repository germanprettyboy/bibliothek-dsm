/*
 * Baut und verschlüsselt die Verwaltungslogik für admin.html.
 *
 *   node werkzeuge/admin-verschluesseln.js                       Passwort verdeckt abfragen
 *   node werkzeuge/admin-verschluesseln.js "<Passwort>" [Zieldatei]
 *
 * Baut quelle/verwaltung/app.jsx (React, mit Vite) zu einem klassischen Skript. React, react-dom und alle
 * Module unter src/ („@/…“) bleiben draußen: die Seite stellt sie als window.DSM_GEMEINSAM bereit
 * (src/verwaltung/gemeinsam.js). Davor kommt quelle/extract.js (auch von Node genutzt, siehe books-erzeugen.js).
 * Beides zusammen wird mit AES-GCM 256 verschlüsselt (Schlüssel per PBKDF2-SHA-256, 310.000 Durchläufe,
 * zufälliges Salz) und als ../website/assets/admin.enc.js geschrieben. Das Passwort wird nirgends gespeichert.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { webcrypto: crypto } = require("crypto");

const ROOT = path.join(__dirname, "..");
const extern = id => id === "react" || id.startsWith("react/") || id === "react-dom" || id.startsWith("@/");

// Klartext der Verwaltung: extract.js + gebaute App (gleiche Quellen ergeben byte-gleichen Text)
async function quelleBauen() {
  const { build } = await import("vite");
  const react = (await import("@vitejs/plugin-react")).default;
  const out = await build({
    configFile: false,
    root: ROOT,
    logLevel: "warn",
    plugins: [react()],
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      write: false,
      target: "es2020",
      reportCompressedSize: false,
      lib: { entry: path.join(__dirname, "quelle", "verwaltung", "app.jsx"), formats: ["iife"], name: "DSM_VERWALTUNG_QUELLE", fileName: () => "verwaltung.js" },
      rollupOptions: { external: extern, output: { globals: id => `DSM_GEMEINSAM[${JSON.stringify(id)}]` } },
    },
  });
  const chunk = (Array.isArray(out) ? out[0] : out).output.find(o => o.type === "chunk");
  return fs.readFileSync(path.join(__dirname, "quelle", "extract.js"), "utf8") + "\n;\n" + chunk.code;
}

// Passwort verdeckt im Terminal abfragen (landet so nicht in der Shell-History)
function frage(text) {
  return new Promise(res => {
    const rl = require("readline").createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.startsWith(text)) process.stdout.write(s); };
    rl.question(text, a => { rl.close(); process.stdout.write("\n"); res(a); });
  });
}

async function verschluesseln(pw, src) {
  const iter = 310000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(src)));
  const b64 = u => Buffer.from(u).toString("base64");
  return "/* Verwaltung der Bibliothek, verschlüsselt. Erzeugt mit werkzeuge/admin-verschluesseln.js. */\n" +
    "window.DSM_ADMIN_ENC = " + JSON.stringify({ v: 1, iter, salt: b64(salt), iv: b64(iv), data: b64(data) }) + ";\n";
}

if (require.main === module) {
  (async () => {
    let pw = process.argv[2];
    const out = process.argv[3] || path.join(ROOT, "website", "assets", "admin.enc.js");
    if (!pw && process.stdin.isTTY) {
      pw = await frage("Passwort: ");
      if (pw && (await frage("Passwort wiederholen: ")) !== pw) { console.error("Die Passwörter stimmen nicht überein."); process.exit(1); }
    }
    if (!pw) { console.error('Aufruf: node werkzeuge/admin-verschluesseln.js "<Passwort>" [Zieldatei]  (ohne Passwort: verdeckte Abfrage im Terminal)'); process.exit(1); }
    const src = await quelleBauen();
    const text = await verschluesseln(pw, src);
    fs.writeFileSync(out, text);
    console.log("geschrieben:", out, "(" + src.length + " Zeichen Klartext, verschlüsselt)");
  })().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { quelleBauen };
