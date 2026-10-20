/*
 * Local development with online publishing as on the webspace:  npm run local  → http://127.0.0.1:8765/
 *
 * - PHP web server (php-wasm via npx, no PHP installation, not in package.json) with website/ as its root
 *   and tools/local-router.php: save.php runs for real, but writes books.js/recommendations.js/info.js to
 *   tests/.tmp/local/data/ (freshly copied from website/ on start, backups next to them in backup/). That way the
 *   committed files in website/ stay untouched while testing (before: main constantly had a changed info.js, integration blocked).
 * - Admin app: current tools/source/ encrypted with the local password into tests/.tmp/local/
 *   (default "local", your own via DSM_LOCAL_PW). The real password and the real admin.enc.js stay untouched.
 *   Changes to tools/source/ → encrypted again (then unlock again in the admin page).
 * - npm run local -- --tunnel: additionally a public https address in front (Cloudflare Quick Tunnel, brew install cloudflared),
 *   so that "Publish" also really writes from the phone/school PC. Because the address is public, a random
 *   password (shown) applies instead of "local"; the write target stays tests/.tmp/local/data/.
 * - src/ → website/ in watch mode with live reload: browser-sync (as in npm run dev) sits on PORT as a proxy in front of
 *   PHP (internal free port) and reloads every open page (also through the tunnel) when website/ or the local
 *   admin.enc.js changes; style.css alone is swapped without a reload. Published data files do not trigger it
 *   (the admin page would lock again right after "Publish"). After a reload the admin page has to be unlocked again.
 */
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import readline from "node:readline";
import { tunnel, dnsReady, reachable, cleanup, freePort } from "./tunnel.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL = path.join(ROOT, "tests", ".tmp", "local");
const DATA = path.join(LOCAL, "data");
const FILES = ["books.js", "recommendations.js", "info.js"];
const WITH_TUNNEL = process.argv.includes("--tunnel");
const PW = process.env.DSM_LOCAL_PW || (WITH_TUNNEL ? randomBytes(9).toString("base64url") : "local");
const PORT = process.env.PORT || "8765";
// Exactly this spelling also in tests/unit/save.test.js (DSM_PHP): npx creates one cache folder per package spec
// (~/.npm/_npx/<hash>, php-wasm ≈470 MB with all PHP versions). Without a fixed version npx checks "latest" on every
// start and reinstalls everything for every new php-wasm version (they appear almost daily). --prefer-offline: no
// registry request even with a fixed version (otherwise ≈1 s, without network ENOTFOUND with retries instead of starting at once).
const PHP_WASM = "@php-wasm/cli@3.1.56";
const BROWSER_SYNC = "browser-sync@3.0.4"; // same spelling as in package.json "dev" and tunnel.mjs (one npx cache)

function encrypt() {
  fs.mkdirSync(LOCAL, { recursive: true });
  // writes admin.enc.js and save-access.php next to it
  execFileSync(process.execPath, [path.join(ROOT, "tools", "encrypt-admin.js"), PW, path.join(LOCAL, "admin.enc.js")], { stdio: "ignore" });
}

// If something already answers on the port (usually npm run local / tunnel:php in another window), php-wasm crashes with
// EADDRINUSE – and the check before the tunnel would find the old server. So abort beforehand.
const busy = await new Promise(ok => {
  const s = net.connect({ host: "127.0.0.1", port: +PORT }, () => { s.destroy(); ok(true); }).on("error", () => ok(false));
});
if (busy) {
  console.error(`Port ${PORT} is in use – is npm run local or tunnel:php already running in another window? Stop it there with Ctrl+C.
Which process:  lsof -nP -iTCP:${PORT} -sTCP:LISTEN     Other port:  PORT=${+PORT + 1} npm run ${WITH_TUNNEL ? "tunnel:php" : "local"}`);
  process.exit(1);
}

console.log("Encrypting the admin app with the local password …");
encrypt();
// every start begins with the committed state; whatever was published last time is gone (test only)
fs.rmSync(DATA, { recursive: true, force: true });
fs.mkdirSync(DATA, { recursive: true });
for (const f of FILES) if (fs.existsSync(path.join(ROOT, "website", f))) fs.copyFileSync(path.join(ROOT, "website", f), path.join(DATA, f));

// local-address.cjs: otherwise php-wasm listens on all interfaces despite "-S 127.0.0.1" (reachable in the Wi-Fi)
const NODE_OPTIONS = `${process.env.NODE_OPTIONS || ""} --require ${JSON.stringify(path.join(ROOT, "tools", "local-address.cjs"))}`.trim();
const PHP_PORT = await freePort();
const php = spawn("npx", ["--yes", "--prefer-offline", PHP_WASM, "-S", `127.0.0.1:${PHP_PORT}`, "-t", "website", path.join("tools", "local-router.php")], { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, NODE_OPTIONS } });
// While a connection is open, php-wasm reports "Failed to accept a client (reason: Invalid argument)" dozens of times
// and "Failed to poll event" (accept() in the WASM socket; harmless, requests go through, still so in 3.1.58).
// Hidden together with Accepted/Closing per connection; requests, PHP errors and everything else stay visible.
const NOISE = /\] (Failed to accept a client \(reason: Invalid argument\)|Failed to poll event|\S+ (Accepted|Closing|Closed without sending a request\b.*))$/;
readline.createInterface({ input: php.stderr }).on("line", z => { if (!NOISE.test(z)) console.error(z); });

// Live reload: browser-sync as a proxy on PORT. no-store, otherwise Cloudflare holds on to .js/.css at the edge (PHP's
// built-in server sends no Cache-Control) and the reload through the tunnel would show the old build.
const BS_CONFIG = path.join(LOCAL, "browser-sync.cjs");
fs.writeFileSync(BS_CONFIG, `module.exports = {
  proxy: { target: "http://127.0.0.1:${PHP_PORT}", proxyRes: [res => { res.headers["cache-control"] = "no-store"; }] },
  files: ${JSON.stringify([path.join(ROOT, "website"), path.join(LOCAL, "admin.enc.js")])},
  port: ${+PORT}, listen: "127.0.0.1", reloadDebounce: 300,
  open: false, notify: false, ui: false, ghostMode: false, logLevel: "silent",
};\n`);

const children = [
  spawn(process.execPath, [path.join(ROOT, "tools", "build.mjs"), "--watch"], { cwd: ROOT, stdio: "inherit" }),
  php,
  // --no-deprecation: http-proxy in browser-sync warns about util._extend (DEP0060) on the first request
  spawn("npx", ["--yes", "--prefer-offline", BROWSER_SYNC, "start", "--config", BS_CONFIG], { cwd: ROOT, stdio: "inherit", env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --no-deprecation`.trim() } }),
];
console.log(`
Book list:   http://127.0.0.1:${PORT}/
Admin page:  http://127.0.0.1:${PORT}/admin.html   Password: ${PW}
"Publish" writes to tests/.tmp/local/data/ (not to website/, reset on the next start). Stop: Ctrl+C
Live reload: open pages reload on every build (admin page: unlock again).
(Only on the very first start npx downloads PHP (≈470 MB), afterwards from the cache.)
`);

if (WITH_TUNNEL) {
  console.log("Opening the tunnel …");
  try {
    // PHP first: until it answers, the proxy would hold every request open
    const local = await reachable(`http://127.0.0.1:${PHP_PORT}/index.html`, 120);
    if (local !== true) throw new Error(`PHP server does not answer (${local})`);
    const proxy = await reachable(`http://127.0.0.1:${PORT}/index.html`, 60);
    if (proxy !== true) throw new Error(`browser-sync does not answer (${proxy})`);
    const address = await tunnel(PORT);
    await dnsReady(address, 60);
    const up = await reachable(address + "index.html", 120);
    if (up !== true) throw new Error(`${address} is not reachable after 120 s (${up})`);
    console.log(`
Public (https), save.php runs for real:
  Book list:   ${address}
  Admin page:  ${address}admin.html   Password: ${PW}
Publicly reachable as long as this window runs – do not pass on the password.
`);
  } catch (e) { console.error(e.message); stop(); }
}

let tick = null;
fs.watch(path.join(ROOT, "tools", "source"), { recursive: true }, () => {
  clearTimeout(tick);
  tick = setTimeout(() => {
    try { encrypt(); console.log("Admin app encrypted again – reload the page and unlock."); }
    catch (e) { console.error("Encryption failed:", e.message); }
  }, 300);
});

function stop() { children.forEach(k => k.kill()); cleanup(); process.exit(0); }
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
children.forEach(k => k.on("exit", code => { if (code) { console.error(`Exited with an error (${code}).`); stop(); } }));
