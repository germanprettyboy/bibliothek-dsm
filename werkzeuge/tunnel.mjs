/*
 * Öffentliche Test-Adresse für website/ über einen Cloudflare Quick Tunnel (https://….trycloudflare.com).
 * Zum Prüfen auf echten Geräten (Handy, Tablet, Schul-PC) und für die Browser-Tests über echtes https.
 *
 *   npm run tunnel                 website/ wie sie ist (eigener Server, Cache-Control: no-store)
 *   npm run tunnel:dev             Build im Watch-Modus + Live-Reload (browser-sync), Änderungen sofort auf dem Handy
 *   npm run test:live [-- <args>]  Tunnel öffnen, Playwright gegen die Tunnel-Adresse, Tunnel schließen
 *   DSM_LIVE_URL=https://… npm run test:live   Playwright gegen eine schon laufende Adresse (kein neuer Tunnel)
 *
 * Voraussetzung: cloudflared (brew install cloudflared). Kein Cloudflare-Konto nötig, Adresse ist bei jedem Start neu.
 * Ausgeliefert wird nur website/ (dasselbe, was per FTP öffentlich wird), ohne Punktdateien (.htaccess).
 * Die Adresse steht zusätzlich in tests/.tmp/tunnel-url.txt.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "website");
const TMP = path.join(ROOT, "tests", ".tmp");

const TYPEN = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".png": "image/png", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff",
};

// Statischer Server für dir: no-store (sonst hält Cloudflare .js/.css am Rand fest), keine Punktdateien, kein Listing
export function statischerServer(dir) {
  return http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { p = ""; }
    if (p.endsWith("/")) p += "index.html";
    const datei = path.join(dir, path.normalize(p));
    const teile = path.relative(dir, datei).split(path.sep);
    const fehler = code => { res.writeHead(code, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }); res.end(String(code)); };
    if (!["GET", "HEAD"].includes(req.method)) return fehler(405);
    if (!p || teile[0] === ".." || path.isAbsolute(teile[0]) || teile.some(t => t.startsWith("."))) return fehler(404);
    fs.stat(datei, (err, st) => {
      if (err || !st.isFile()) return fehler(404);
      res.writeHead(200, {
        "content-type": TYPEN[path.extname(datei).toLowerCase()] || "application/octet-stream",
        "content-length": st.size,
        "cache-control": "no-store",
      });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(datei).pipe(res);
    });
  });
}

// Adresse aus einer Log-Zeile von cloudflared (steht in einem Kasten auf stderr)
export function tunnelAdresse(zeile) {
  const m = /https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/.exec(zeile);
  return m ? m[0] + "/" : null;
}

const freierPort = () => new Promise((ok, nein) => {
  const s = http.createServer().listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => ok(port)); }).on("error", nein);
});

const warte = ms => new Promise(r => setTimeout(r, ms));

async function erreichbar(url, sekunden) {
  for (let i = 0; i < sekunden; i++) {
    try { if ((await fetch(url, { cache: "no-store" })).ok) return true; } catch { /* noch nicht da */ }
    await warte(1000);
  }
  return false;
}

const kinder = [];
function starte(befehl, args, opt = {}) {
  const k = spawn(befehl, args, { cwd: ROOT, ...opt });
  kinder.push(k);
  return k;
}
function aufraeumen() {
  for (const k of kinder) if (k.exitCode === null) k.kill("SIGTERM");
}

// cloudflared starten, auf Adresse und erste Verbindung warten
function tunnel(port) {
  return new Promise((ok, nein) => {
    const cf = starte("cloudflared", ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${port}`], { stdio: ["ignore", "pipe", "pipe"] });
    const log = [];
    let adresse = null;
    const zeit = setTimeout(() => nein(new Error("cloudflared meldet nach 45 s keine Verbindung:\n" + log.slice(-15).join("\n"))), 45000);
    cf.on("error", e => {
      clearTimeout(zeit);
      nein(e.code === "ENOENT" ? new Error("cloudflared fehlt – installieren mit: brew install cloudflared") : e);
    });
    cf.on("exit", code => { clearTimeout(zeit); nein(new Error(`cloudflared beendet (Code ${code}):\n` + log.slice(-15).join("\n"))); });
    let rest = "";
    cf.stderr.on("data", d => {
      const zeilen = (rest + d).split("\n");
      rest = zeilen.pop();
      for (const z of zeilen) {
        log.push(z);
        adresse ||= tunnelAdresse(z);
        // erst nach registrierter Verbindung nachschlagen – sonst merkt sich der Resolver „gibt es nicht“
        if (adresse && /Registered tunnel connection/.test(z)) { clearTimeout(zeit); ok(adresse); }
      }
    });
  });
}

async function devServer(port) {
  const cfg = path.join(TMP, "browser-sync.cjs");
  fs.mkdirSync(TMP, { recursive: true });
  fs.writeFileSync(cfg, `module.exports = {
  server: ${JSON.stringify(WEB)}, files: ${JSON.stringify(WEB)}, port: ${port}, listen: "127.0.0.1",
  open: false, notify: false, ui: false, ghostMode: false, logLevel: "silent",
  middleware: [(req, res, next) => { res.setHeader("cache-control", "no-store"); next(); }],
};\n`);
  starte(process.execPath, [path.join(ROOT, "werkzeuge", "bauen.mjs"), "--watch"], { stdio: "inherit" });
  starte("npx", ["--yes", "browser-sync@3", "start", "--config", cfg], { stdio: "inherit" });
  if (!(await erreichbar(`http://127.0.0.1:${port}/index.html`, 60))) throw new Error("browser-sync antwortet nicht");
}

async function main() {
  const args = process.argv.slice(2);
  const dev = args.includes("--dev");
  const test = args.includes("--test");
  const weiter = args.filter(a => a !== "--dev" && a !== "--test");

  process.on("SIGINT", () => { aufraeumen(); process.exit(130); });
  process.on("SIGTERM", () => { aufraeumen(); process.exit(143); });
  process.on("exit", aufraeumen);

  let adresse = test && process.env.DSM_LIVE_URL;
  if (!adresse) {
    const port = await freierPort();
    if (dev) await devServer(port);
    else await new Promise(ok => statischerServer(WEB).listen(port, "127.0.0.1", ok));
    console.log(`lokal:  http://127.0.0.1:${port}/  (${dev ? "Live-Reload" : "website/"})`);
    console.log("Tunnel wird geöffnet …");
    adresse = await tunnel(port);
    if (!(await erreichbar(adresse + "index.html", 60))) throw new Error(`${adresse} ist nach 60 s nicht erreichbar`);
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(path.join(TMP, "tunnel-url.txt"), adresse + "\n");
  }

  if (test) {
    console.log(`Browser-Tests gegen ${adresse}`);
    const pw = starte("npx", ["playwright", "test", ...weiter], { stdio: "inherit", env: { ...process.env, DSM_LIVE_URL: adresse } });
    pw.on("exit", code => { aufraeumen(); process.exit(code ?? 1); });
    return;
  }
  console.log(`\n  Bücherliste:  ${adresse}\n  Verwaltung:   ${adresse}admin.html\n`);
  console.log("Öffentlich erreichbar, solange dieses Fenster läuft. Beenden mit Ctrl+C.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e.message); aufraeumen(); process.exit(1); });
}
