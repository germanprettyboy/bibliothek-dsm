/*
 * Local development with online publishing as on the webspace:  npm run local  → http://127.0.0.1:8765/
 *
 * - PHP web server (php-wasm via npx, no PHP installation, not in package.json) with website/ as its root
 *   and tools/local-router.php: save.php runs for real and writes books.js/recommendations.js/info.js to website/.
 * - Admin app: current tools/source/ encrypted with the local password into tests/.tmp/local/
 *   (default "local", your own via DSM_LOCAL_PW). The real password and the real admin.enc.js stay untouched.
 *   Changes to tools/source/ → encrypted again (then unlock again in the admin page).
 * - npm run local -- --tunnel: additionally a public https address in front (Cloudflare Quick Tunnel, brew install cloudflared),
 *   so that "Publish" also really writes from the phone/school PC. Because the address is public, a random
 *   password (shown) applies instead of "local"; the write target stays website/ of this checkout.
 * - src/ → website/ in watch mode (like npm run dev, without live reload: reload the page).
 */
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import readline from "node:readline";
import { tunnel, dnsReady, reachable, cleanup } from "./tunnel.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL = path.join(ROOT, "tests", ".tmp", "local");
const WITH_TUNNEL = process.argv.includes("--tunnel");
const PW = process.env.DSM_LOCAL_PW || (WITH_TUNNEL ? randomBytes(9).toString("base64url") : "local");
const PORT = process.env.PORT || "8765";
const PHP_WASM = "@php-wasm/cli@3.1.56";

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

// local-address.cjs: otherwise php-wasm listens on all interfaces despite "-S 127.0.0.1" (reachable in the Wi-Fi)
const NODE_OPTIONS = `${process.env.NODE_OPTIONS || ""} --require ${JSON.stringify(path.join(ROOT, "tools", "local-address.cjs"))}`.trim();
const php = spawn("npx", ["--yes", PHP_WASM, "-S", `127.0.0.1:${PORT}`, "-t", "website", path.join("tools", "local-router.php")], { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, NODE_OPTIONS } });
// While a connection is open, php-wasm reports "Failed to accept a client (reason: Invalid argument)" dozens of times
// and "Failed to poll event" (accept() in the WASM socket; harmless, requests go through, still so in 3.1.58).
// Hidden together with Accepted/Closing per connection; requests, PHP errors and everything else stay visible.
const NOISE = /\] (Failed to accept a client \(reason: Invalid argument\)|Failed to poll event|\S+ (Accepted|Closing|Closed without sending a request\b.*))$/;
readline.createInterface({ input: php.stderr }).on("line", z => { if (!NOISE.test(z)) console.error(z); });

const children = [
  spawn(process.execPath, [path.join(ROOT, "tools", "build.mjs"), "--watch"], { cwd: ROOT, stdio: "inherit" }),
  php,
];
console.log(`
Book list:   http://127.0.0.1:${PORT}/
Admin page:  http://127.0.0.1:${PORT}/admin.html   Password: ${PW}
"Publish" writes directly to website/ (old version in website/backup/). Stop: Ctrl+C
(On the first start npx downloads PHP, that takes a moment.)
`);

if (WITH_TUNNEL) {
  console.log("Opening the tunnel …");
  try {
    const local = await reachable(`http://127.0.0.1:${PORT}/index.html`, 120);
    if (local !== true) throw new Error(`PHP server does not answer (${local})`);
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
