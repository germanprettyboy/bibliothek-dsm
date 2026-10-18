/*
 * Public test address for website/ via a Cloudflare Quick Tunnel (https://….trycloudflare.com).
 * For checking on real devices (phone, tablet, school PC) and for the browser tests over real https.
 *
 *   npm run tunnel                 website/ as it is (own server, Cache-Control: no-store)
 *   npm run tunnel:dev             build in watch mode + live reload (browser-sync), changes appear on the phone immediately
 *   npm run test:live [-- <args>]  open the tunnel, Playwright against the tunnel address, close the tunnel
 *   DSM_LIVE_URL=https://… npm run test:live   Playwright against an address that is already running (no new tunnel)
 *
 * Requirement: cloudflared (brew install cloudflared). No Cloudflare account needed, the address is new on every start.
 * Only website/ is served (the same that becomes public via FTP), without dot files (.htaccess), without *.php
 * and backup/ (also the old name sicherung/) – PHP doesn't run here, so through the tunnel the admin page publishes as it does locally (folder/download).
 * With real "Publish" (save.php running): npm run local -- --tunnel (tools/local.mjs, uses tunnel() from here).
 * The address is also written to tests/.tmp/tunnel-url.txt.
 */
import dns from "node:dns/promises";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "website");
const TMP = path.join(ROOT, "tests", ".tmp");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".png": "image/png", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff",
};

// Static server for dir: no-store (otherwise Cloudflare holds on to .js/.css at the edge), no dot files, no listing
export function staticServer(dir) {
  return http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { p = ""; }
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(dir, path.normalize(p));
    const parts = path.relative(dir, file).split(path.sep);
    const fail = code => { res.writeHead(code, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }); res.end(String(code)); };
    if (!["GET", "HEAD"].includes(req.method)) return fail(405);
    if (!p || parts[0] === ".." || path.isAbsolute(parts[0]) || parts.some(t => t.startsWith("."))) return fail(404);
    // PHP would not run here but be served as source (save-access.php = hash of the save key);
    // backups: backup/, sicherung/ = its name until October 2026
    if (/^(backup|sicherung)$/i.test(parts[0]) || parts.some(t => /\.php$/i.test(t))) return fail(404);
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return fail(404);
      res.writeHead(200, {
        "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
        "content-length": st.size,
        "cache-control": "no-store",
      });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(file).pipe(res);
    });
  });
}

// Address from a log line of cloudflared (it sits in a box on stderr)
export function tunnelAddress(line) {
  const m = /https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/.exec(line);
  return m ? m[0] + "/" : null;
}

const freePort = () => new Promise((ok, no) => {
  const s = http.createServer().listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => ok(port)); }).on("error", no);
});

const wait = ms => new Promise(r => setTimeout(r, ms));

// true or the last reason (status/error code) why url does not answer
export async function reachable(url, seconds) {
  let reason = "";
  for (let i = 0; i < seconds; i++) {
    try {
      const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (r.ok) return true;
      reason = "HTTP " + r.status;
    } catch (e) { reason = e.cause?.code || e.name; }
    await wait(1000);
  }
  return reason;
}

// Wait for the new name at the authoritative name server first (it doesn't cache). Asking via the system too early
// yields NXDOMAIN, and macOS remembers that for ≈90 s – also for Chromium and the phone in the same Wi-Fi.
export async function dnsReady(address, seconds) {
  const host = new URL(address).hostname;
  const auth = new dns.Resolver();
  try {
    const ns = await dns.resolveNs(host.split(".").slice(-2).join("."));
    auth.setServers((await Promise.all(ns.map(n => dns.resolve4(n).catch(() => [])))).flat());
  } catch { return; } // without name server information simply go on, reachable() waits anyway
  for (let i = 0; i < seconds * 2; i++) {
    if (await auth.resolve4(host).then(a => a.length > 0, () => false)) return;
    await wait(500);
  }
}

const children = [];
function start(command, args, opt = {}) {
  const k = spawn(command, args, { cwd: ROOT, ...opt });
  children.push(k);
  return k;
}
export function cleanup() {
  for (const k of children) if (k.exitCode === null) k.kill("SIGTERM");
}

// Start cloudflared, wait for the address and the first connection
export function tunnel(port) {
  return new Promise((ok, no) => {
    const cf = start("cloudflared", ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${port}`], { stdio: ["ignore", "pipe", "pipe"] });
    const log = [];
    let address = null;
    const timer = setTimeout(() => no(new Error("cloudflared reports no connection after 45 s:\n" + log.slice(-15).join("\n"))), 45000);
    cf.on("error", e => {
      clearTimeout(timer);
      no(e.code === "ENOENT" ? new Error("cloudflared is missing – install with: brew install cloudflared") : e);
    });
    cf.on("exit", code => { clearTimeout(timer); no(new Error(`cloudflared exited (code ${code}):\n` + log.slice(-15).join("\n"))); });
    let rest = "";
    cf.stderr.on("data", d => {
      const lines = (rest + d).split("\n");
      rest = lines.pop();
      for (const z of lines) {
        log.push(z);
        address ||= tunnelAddress(z);
        if (address && /Registered tunnel connection/.test(z)) { clearTimeout(timer); ok(address); }
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
  middleware: [(req, res, next) => {
    res.setHeader("cache-control", "no-store");
    if (/\\.php(\\?|$)|^\\/(backup|sicherung)\\//i.test(decodeURIComponent(req.url.split("?")[0]))) { res.statusCode = 404; return res.end("404"); }
    next();
  }],
};\n`);
  start(process.execPath, [path.join(ROOT, "tools", "build.mjs"), "--watch"], { stdio: "inherit" });
  // fixed version + --prefer-offline: npx takes its own cache without a registry request (see local.mjs)
  start("npx", ["--yes", "--prefer-offline", "browser-sync@3.0.4", "start", "--config", cfg], { stdio: "inherit" });
  const up = await reachable(`http://127.0.0.1:${port}/index.html`, 120); // first start: npx downloads browser-sync
  if (up !== true) throw new Error(`browser-sync does not answer (${up})`);
}

async function main() {
  const args = process.argv.slice(2);
  const dev = args.includes("--dev");
  const test = args.includes("--test");
  const rest = args.filter(a => a !== "--dev" && a !== "--test");

  process.on("SIGINT", () => { cleanup(); process.exit(130); });
  process.on("SIGTERM", () => { cleanup(); process.exit(143); });
  process.on("exit", cleanup);

  let address = test && process.env.DSM_LIVE_URL;
  if (!address) {
    const port = await freePort();
    if (dev) await devServer(port);
    else await new Promise(ok => staticServer(WEB).listen(port, "127.0.0.1", ok));
    console.log(`local:  http://127.0.0.1:${port}/  (${dev ? "live reload" : "website/"})`);
    console.log("Opening the tunnel …");
    address = await tunnel(port);
    await dnsReady(address, 60);
    const up = await reachable(address + "index.html", 120);
    if (up !== true) throw new Error(`${address} is not reachable after 120 s (${up})`);
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(path.join(TMP, "tunnel-url.txt"), address + "\n");
  }

  if (test) {
    console.log(`Browser tests against ${address}`);
    const pw = start("npx", ["playwright", "test", ...rest], { stdio: "inherit", env: { ...process.env, DSM_LIVE_URL: address } });
    pw.on("exit", code => { cleanup(); process.exit(code ?? 1); });
    return;
  }
  console.log(`\n  Book list:   ${address}\n  Admin page:  ${address}admin.html\n`);
  console.log("Publicly reachable as long as this window runs. Stop with Ctrl+C.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e.message); cleanup(); process.exit(1); });
}
