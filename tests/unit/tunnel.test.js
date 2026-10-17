/* tools/tunnel.mjs: the server behind the public Cloudflare tunnel only serves the chosen folder
   (no escape, no dot files), always with no-store; the tunnel address is recognized in the cloudflared log. */
"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { ROOT, TMP } = require("../helpers/load.js");

const BASE = path.join(TMP, "tunnel");
const SITE = path.join(BASE, "site");
let T, server, port;

before(async () => {
  fs.rmSync(BASE, { recursive: true, force: true });
  fs.mkdirSync(path.join(SITE, "assets"), { recursive: true });
  fs.mkdirSync(path.join(SITE, ".git"), { recursive: true });
  fs.writeFileSync(path.join(SITE, "index.html"), "<!doctype html><title>x</title>");
  fs.writeFileSync(path.join(SITE, "assets", "a.js"), "window.A = 1;");
  fs.writeFileSync(path.join(SITE, ".htaccess"), "secret");
  fs.writeFileSync(path.join(SITE, ".git", "config"), "secret");
  fs.writeFileSync(path.join(BASE, "secret.txt"), "secret");
  fs.writeFileSync(path.join(SITE, "save-access.php"), "<?php return 'secret';");
  fs.mkdirSync(path.join(SITE, "backup"), { recursive: true });
  fs.writeFileSync(path.join(SITE, "backup", "info.js"), "secret");
  T = await import(path.join(ROOT, "tools", "tunnel.mjs"));
  server = T.staticServer(SITE);
  await new Promise(ok => server.listen(0, "127.0.0.1", ok));
  port = server.address().port;
});
after(() => server.close());

// Raw request: the path is sent unchanged (fetch would resolve ../ beforehand)
const fetchRaw = (p, method = "GET") => new Promise((ok, no) => {
  const req = http.request({ host: "127.0.0.1", port, path: p, method }, res => {
    let body = "";
    res.on("data", d => body += d);
    res.on("end", () => ok({ status: res.statusCode, headers: res.headers, body }));
  });
  req.on("error", no);
  req.end();
});

test("serves files with the right type and always no-store (Cloudflare caches .js/.css otherwise)", async () => {
  const start = await fetchRaw("/");
  assert.equal(start.status, 200);
  assert.match(start.headers["content-type"], /^text\/html/);
  assert.equal(start.headers["cache-control"], "no-store");
  const js = await fetchRaw("/assets/a.js?v=1");
  assert.equal(js.body, "window.A = 1;");
  assert.match(js.headers["content-type"], /^text\/javascript/);
  assert.equal(js.headers["cache-control"], "no-store");
});

test("nothing outside the folder, no dot files, no PHP source, no directory listing", async () => {
  for (const p of ["/../secret.txt", "/%2e%2e/secret.txt", "/..%2fsecret.txt", "/assets/../../secret.txt",
    "/.htaccess", "/.git/config", "/assets/%2e%2e/.htaccess", "/save-access.php", "/SAVE-ACCESS.PHP",
    "/backup/info.js", "/assets/", "/missing.js", "/%E0%A4%A"]) {
    const r = await fetchRaw(p);
    assert.equal(r.status, 404, p);
    assert.doesNotMatch(r.body, /secret/, p);
  }
});

test("only GET and HEAD", async () => {
  assert.equal((await fetchRaw("/index.html", "POST")).status, 405);
  const head = await fetchRaw("/index.html", "HEAD");
  assert.equal(head.status, 200);
  assert.equal(head.body, "");
});

test("tunnel address from the cloudflared log", () => {
  assert.equal(T.tunnelAddress("2026-10-17T10:00:00Z INF |  https://pieces-patrick-platforms.trycloudflare.com  |"),
    "https://pieces-patrick-platforms.trycloudflare.com/");
  assert.equal(T.tunnelAddress("INF Requesting new quick Tunnel on trycloudflare.com..."), null);
  assert.equal(T.tunnelAddress("ERR Error unmarshaling QuickTunnel response from https://api.trycloudflare.com/tunnel"), null);
});
