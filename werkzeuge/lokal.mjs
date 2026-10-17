/*
 * Lokale Entwicklung mit Online-Veröffentlichen wie auf dem Webspace:  npm run lokal  → http://127.0.0.1:8765/
 *
 * - PHP-Webserver (php-wasm über npx, keine PHP-Installation, nicht in package.json) mit website/ als Wurzel
 *   und werkzeuge/lokal-router.php: speichern.php läuft echt, schreibt books.js/empfehlungen.js/info.js aber nach
 *   tests/.tmp/lokal/daten/ (beim Start frisch aus website/ kopiert, Sicherungen daneben in sicherung/). So bleiben die
 *   eingecheckten Dateien in website/ beim Testen unberührt (vorher: main ständig mit geänderter info.js, Integration blockiert).
 * - Verwaltung: aktuelle werkzeuge/quelle/ mit dem lokalen Passwort verschlüsselt nach tests/.tmp/lokal/
 *   (Standard „lokal“, eigenes per DSM_LOKAL_PW). Echtes Passwort und echte admin.enc.js bleiben unberührt.
 *   Änderungen an werkzeuge/quelle/ → neu verschlüsseln (danach in der Verwaltung neu entsperren).
 * - npm run lokal -- --tunnel: zusätzlich öffentliche https-Adresse (Cloudflare Quick Tunnel, brew install cloudflared) davor,
 *   damit „Veröffentlichen“ auch vom Handy/Schul-PC aus echt schreibt. Weil die Adresse öffentlich ist, gilt dann ein
 *   zufälliges Passwort (wird angezeigt) statt „lokal“; Schreibziel bleibt tests/.tmp/lokal/daten/.
 * - src/ → website/ im Watch-Modus (wie npm run dev, ohne Live-Reload: Seite neu laden).
 */
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import readline from "node:readline";
import { tunnel, dnsBereit, erreichbar, aufraeumen } from "./tunnel.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOKAL = path.join(ROOT, "tests", ".tmp", "lokal");
const DATEN = path.join(LOKAL, "daten");
const DATEIEN = ["books.js", "empfehlungen.js", "info.js"];
const MIT_TUNNEL = process.argv.includes("--tunnel");
const PW = process.env.DSM_LOKAL_PW || (MIT_TUNNEL ? randomBytes(9).toString("base64url") : "lokal");
const PORT = process.env.PORT || "8765";
// Genau diese Schreibweise auch in tests/unit/speichern.test.js (DSM_PHP): npx legt je Paketangabe einen Cache-Ordner
// an (~/.npm/_npx/<hash>, php-wasm ≈470 MB mit allen PHP-Versionen). Ohne feste Version prüft npx bei jedem Start
// „latest“ und installiert bei jeder neuen php-wasm-Version (erscheinen fast täglich) alles neu. --prefer-offline: auch
// bei fester Version keine Registry-Abfrage (sonst ≈1 s, ohne Netz ENOTFOUND mit Wiederholungen statt sofortigem Start).
const PHP_WASM = "@php-wasm/cli@3.1.56";

function verschluesseln() {
  fs.mkdirSync(LOKAL, { recursive: true });
  // schreibt admin.enc.js und daneben speichern-zugang.php
  execFileSync(process.execPath, [path.join(ROOT, "werkzeuge", "admin-verschluesseln.js"), PW, path.join(LOKAL, "admin.enc.js")], { stdio: "ignore" });
}

// Antwortet auf dem Port schon etwas (meist npm run lokal / tunnel:php in einem anderen Fenster), stürzt php-wasm mit
// EADDRINUSE ab – und die Prüfung vor dem Tunnel fände den alten Server. Also vorher abbrechen.
const belegt = await new Promise(ok => {
  const s = net.connect({ host: "127.0.0.1", port: +PORT }, () => { s.destroy(); ok(true); }).on("error", () => ok(false));
});
if (belegt) {
  console.error(`Port ${PORT} ist belegt – läuft npm run lokal oder tunnel:php schon in einem anderen Fenster? Dort mit Strg+C beenden.
Welcher Prozess:  lsof -nP -iTCP:${PORT} -sTCP:LISTEN     Anderer Port:  PORT=${+PORT + 1} npm run ${MIT_TUNNEL ? "tunnel:php" : "lokal"}`);
  process.exit(1);
}

console.log("Verwaltung wird mit dem lokalen Passwort verschlüsselt …");
verschluesseln();
// jeder Start beginnt mit dem eingecheckten Stand; was beim letzten Mal veröffentlicht wurde, ist weg (nur Test)
fs.rmSync(DATEN, { recursive: true, force: true });
fs.mkdirSync(DATEN, { recursive: true });
for (const d of DATEIEN) fs.copyFileSync(path.join(ROOT, "website", d), path.join(DATEN, d));

// lokal-adresse.cjs: php-wasm lauscht sonst trotz „-S 127.0.0.1“ auf allen Schnittstellen (im WLAN erreichbar)
const NODE_OPTIONS = `${process.env.NODE_OPTIONS || ""} --require ${JSON.stringify(path.join(ROOT, "werkzeuge", "lokal-adresse.cjs"))}`.trim();
const php = spawn("npx", ["--yes", "--prefer-offline", PHP_WASM, "-S", `127.0.0.1:${PORT}`, "-t", "website", path.join("werkzeuge", "lokal-router.php")], { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, NODE_OPTIONS } });
// php-wasm meldet, solange eine Verbindung offen ist, dutzendfach „Failed to accept a client (reason: Invalid argument)“
// und „Failed to poll event“ (accept() im WASM-Socket; harmlos, Anfragen gehen durch, auch in 3.1.58 noch so).
// Ausgeblendet samt Accepted/Closing je Verbindung; Anfragen, PHP-Fehler und alles andere bleiben sichtbar.
const RAUSCHEN = /\] (Failed to accept a client \(reason: Invalid argument\)|Failed to poll event|\S+ (Accepted|Closing|Closed without sending a request\b.*))$/;
readline.createInterface({ input: php.stderr }).on("line", z => { if (!RAUSCHEN.test(z)) console.error(z); });

const kinder = [
  spawn(process.execPath, [path.join(ROOT, "werkzeuge", "bauen.mjs"), "--watch"], { cwd: ROOT, stdio: "inherit" }),
  php,
];
console.log(`
Bücherliste:  http://127.0.0.1:${PORT}/
Verwaltung:   http://127.0.0.1:${PORT}/admin.html   Passwort: ${PW}
„Veröffentlichen“ schreibt nach tests/.tmp/lokal/daten/ (nicht nach website/, beim nächsten Start zurückgesetzt). Beenden: Strg+C
(Nur beim allerersten Start lädt npx PHP herunter (≈470 MB), danach aus dem Cache.)
`);

if (MIT_TUNNEL) {
  console.log("Tunnel wird geöffnet …");
  try {
    const lokal = await erreichbar(`http://127.0.0.1:${PORT}/index.html`, 120);
    if (lokal !== true) throw new Error(`PHP-Server antwortet nicht (${lokal})`);
    const adresse = await tunnel(PORT);
    await dnsBereit(adresse, 60);
    const da = await erreichbar(adresse + "index.html", 120);
    if (da !== true) throw new Error(`${adresse} ist nach 120 s nicht erreichbar (${da})`);
    console.log(`
Öffentlich (https), speichern.php läuft echt:
  Bücherliste:  ${adresse}
  Verwaltung:   ${adresse}admin.html   Passwort: ${PW}
Öffentlich erreichbar, solange dieses Fenster läuft – Passwort nicht weitergeben.
`);
  } catch (e) { console.error(e.message); ende(); }
}

let takt = null;
fs.watch(path.join(ROOT, "werkzeuge", "quelle"), { recursive: true }, () => {
  clearTimeout(takt);
  takt = setTimeout(() => {
    try { verschluesseln(); console.log("Verwaltung neu verschlüsselt – Seite neu laden und entsperren."); }
    catch (e) { console.error("Verschlüsseln fehlgeschlagen:", e.message); }
  }, 300);
});

function ende() { kinder.forEach(k => k.kill()); aufraeumen(); process.exit(0); }
process.on("SIGINT", ende);
process.on("SIGTERM", ende);
kinder.forEach(k => k.on("exit", code => { if (code) { console.error(`Beendet mit Fehler (${code}).`); ende(); } }));
