/*
 * Lokale Entwicklung mit Online-Veröffentlichen wie auf dem Webspace:  npm run lokal  → http://127.0.0.1:8765/
 *
 * - PHP-Webserver (php-wasm über npx, keine PHP-Installation, nicht in package.json) mit website/ als Wurzel
 *   und werkzeuge/lokal-router.php: speichern.php läuft echt und schreibt books.js/empfehlungen.js/info.js nach website/.
 * - Verwaltung: aktuelle werkzeuge/quelle/ mit dem lokalen Passwort verschlüsselt nach tests/.tmp/lokal/
 *   (Standard „lokal“, eigenes per DSM_LOKAL_PW). Echtes Passwort und echte admin.enc.js bleiben unberührt.
 *   Änderungen an werkzeuge/quelle/ → neu verschlüsseln (danach in der Verwaltung neu entsperren).
 * - src/ → website/ im Watch-Modus (wie npm run dev, ohne Live-Reload: Seite neu laden).
 */
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOKAL = path.join(ROOT, "tests", ".tmp", "lokal");
const PW = process.env.DSM_LOKAL_PW || "lokal";
const PORT = process.env.PORT || "8765";
const PHP_WASM = "@php-wasm/cli@3.1.56";

function verschluesseln() {
  fs.mkdirSync(LOKAL, { recursive: true });
  // schreibt admin.enc.js und daneben speichern-zugang.php
  execFileSync(process.execPath, [path.join(ROOT, "werkzeuge", "admin-verschluesseln.js"), PW, path.join(LOKAL, "admin.enc.js")], { stdio: "ignore" });
}

console.log("Verwaltung wird mit dem lokalen Passwort verschlüsselt …");
verschluesseln();

const kinder = [
  spawn(process.execPath, [path.join(ROOT, "werkzeuge", "bauen.mjs"), "--watch"], { cwd: ROOT, stdio: "inherit" }),
  spawn("npx", ["--yes", PHP_WASM, "-S", `127.0.0.1:${PORT}`, "-t", "website", path.join("werkzeuge", "lokal-router.php")], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] }),
];
console.log(`
Bücherliste:  http://127.0.0.1:${PORT}/
Verwaltung:   http://127.0.0.1:${PORT}/admin.html   Passwort: ${PW}
„Veröffentlichen“ schreibt direkt nach website/ (alte Fassung in website/sicherung/). Beenden: Strg+C
(Beim ersten Start lädt npx PHP herunter, das dauert einen Moment.)
`);

let takt = null;
fs.watch(path.join(ROOT, "werkzeuge", "quelle"), { recursive: true }, () => {
  clearTimeout(takt);
  takt = setTimeout(() => {
    try { verschluesseln(); console.log("Verwaltung neu verschlüsselt – Seite neu laden und entsperren."); }
    catch (e) { console.error("Verschlüsseln fehlgeschlagen:", e.message); }
  }, 300);
});

const ende = () => { kinder.forEach(k => k.kill()); process.exit(0); };
process.on("SIGINT", ende);
process.on("SIGTERM", ende);
kinder.forEach(k => k.on("exit", code => { if (code) { console.error(`Beendet mit Fehler (${code}).`); ende(); } }));
