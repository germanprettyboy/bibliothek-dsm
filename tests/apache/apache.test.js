/*
 * The upload folder (npm run pack) on a real Apache with PHP 7.1, as on a typical webspace: .htaccess (headers,
 * compression, no listings, https redirect), save.php end to end, backup/ locked for visitors.
 * Only on GitHub Actions (job "apache", DSM_APACHE=1, Docker image php:7.1-apache) – never locally.
 */
"use strict";
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(ROOT, "tests", ".tmp", "apache");
const WEB = path.join(OUT, "website");
const IMAGE = "php:7.1-apache";
const NAME = "dsm-apache-test";
const BASE = "http://127.0.0.1:8088";
const KEY = "apache-test-key";
const HTTPS = { "X-Forwarded-Proto": "https" }; // as behind a TLS proxy: no redirect for save.php

const get = (p, headers = {}) => fetch(BASE + p, { headers, redirect: "manual" });
const post = (p, body, headers = {}) => fetch(BASE + p, { method: "POST", body, headers: { ...HTTPS, ...headers }, redirect: "manual" });
const INFO_HEAD = "/* Opening hours, holidays and absences of the library of the Deutsche Schule Mailand. Maintained via admin.html – do not edit by hand. */\nwindow.DSM_INFO = ";
const info = notice => INFO_HEAD + JSON.stringify({ updated: "2026-10-22", hours: { mon: [["08:00", "12:00"]] }, notice: { de: notice, it: notice }, closures: [] }) + ";\n";

describe("Apache + PHP 7.1", { skip: !process.env.DSM_APACHE && "only on GitHub Actions (DSM_APACHE=1)" }, () => {
  before(async () => {
    execFileSync(process.execPath, [path.join(ROOT, "tools", "pack.mjs"), OUT, "--ignore-encryption"], { stdio: "inherit" });
    // own key instead of the real one (its password is in no file)
    fs.writeFileSync(path.join(WEB, "save-access.php"), `<?php return '${crypto.createHash("sha256").update(KEY).digest("hex")}';\n`);
    execFileSync("chmod", ["-R", "a+rwX", WEB]); // Apache runs as www-data and must write here
    spawnSync("docker", ["rm", "-f", NAME]);
    execFileSync("docker", ["run", "-d", "--name", NAME, "-p", "127.0.0.1:8088:80", "-v", WEB + ":/var/www/html", IMAGE, "bash", "-c",
      "a2enmod rewrite headers deflate >/dev/null && sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf && exec apache2-foreground"]);
    for (let i = 0; i < 60; i++) {
      try { if ((await get("/index.html")).status === 200) return; } catch (e) { /* not up yet */ }
      await new Promise(r => setTimeout(r, 500));
    }
    throw new Error("Apache did not start:\n" + spawnSync("docker", ["logs", NAME], { encoding: "utf8" }).stderr);
  });
  after(() => {
    const logs = spawnSync("docker", ["logs", NAME], { encoding: "utf8" });
    if (/PHP (Warning|Notice|Fatal)|\[core:alert\]/.test(logs.stdout + logs.stderr)) console.log(logs.stdout + logs.stderr);
    spawnSync("docker", ["rm", "-f", NAME]);
  });

  test(".htaccess is accepted (no 500) and sets the security headers", async () => {
    const r = await get("/index.html");
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("x-frame-options"), "DENY");
    assert.equal(r.headers.get("content-security-policy"), "frame-ancestors 'none'");
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.equal(r.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.equal(r.headers.get("cache-control"), "no-cache");
    assert.equal(r.headers.get("strict-transport-security"), null, "HSTS only via https");
  });
  test("books.js compressed, images cached for long", async () => {
    const b = await get("/books.js", { "Accept-Encoding": "gzip" });
    assert.equal(b.headers.get("content-encoding"), "gzip");
    assert.equal(b.headers.get("cache-control"), "no-cache");
    const img = await get("/assets/logo-light.webp");
    assert.equal(img.headers.get("cache-control"), "public, max-age=2592000");
  });
  test("no directory listing, no dot files", async () => {
    assert.equal((await get("/assets/")).status, 403);
    assert.equal((await get("/.htaccess")).status, 403);
  });
  test("admin page and save.php only via https, the list also via http", async () => {
    for (const p of ["/admin.html", "/save.php"]) {
      const r = await get(p);
      assert.equal(r.status, 301, p);
      assert.equal(r.headers.get("location"), "https://127.0.0.1:8088" + p);
    }
    assert.equal((await get("/admin.html", HTTPS)).status, 200, "no loop behind a TLS proxy");
    assert.equal((await get("/index.html")).status, 200);
  });
  test("save-access.php reveals nothing", async () => {
    const r = await get("/save-access.php");
    assert.equal(r.status, 200);
    assert.equal(await r.text(), "");
  });
  test("save.php: ready, wrong key 403, wrong format 422", async () => {
    const g = await (await get("/save.php", HTTPS)).json();
    assert.deepEqual(g, { dsm: "save", v: 3, ready: true });
    assert.equal((await post("/save.php?file=info.js", info("x"), { "X-DSM-Key": "wrong" })).status, 403);
    assert.equal((await post("/save.php?file=info.js", "window.DSM_INFO = {};\n", { "X-DSM-Key": KEY })).status, 422);
    assert.equal((await post("/save.php?file=evil.php", info("x"), { "X-DSM-Key": KEY })).status, 400);
  });
  test("save.php publishes, the old version goes to backup/, which visitors cannot read", async () => {
    for (const n of ["Erste Fassung", "Zweite Fassung"]) {
      const r = await post("/save.php?file=info.js", info(n), { "X-DSM-Key": KEY });
      const j = await r.json();
      assert.equal(r.status, 200, JSON.stringify(j));
      assert.equal(r.headers.get("content-type"), "application/json; charset=utf-8");
      assert.equal(j.ok, true);
    }
    assert.equal(await (await get("/info.js")).text(), info("Zweite Fassung"));
    const backups = fs.readdirSync(path.join(WEB, "backup")).filter(f => /^info-.*\.js$/.test(f));
    assert.equal(backups.length, 1);
    assert.equal(fs.readFileSync(path.join(WEB, "backup", backups[0]), "utf8"), info("Erste Fassung"));
    for (const p of ["/backup/", "/backup/" + backups[0], "/backup/.htaccess"]) assert.equal((await get(p)).status, 403, p);
    assert.deepEqual(fs.readdirSync(WEB).filter(f => f.endsWith(".new")), []);
  });
  test("parallel publishing: every request answered, the file whole, at most 10 backups", async () => {
    const texts = Array.from({ length: 16 }, (_, i) => info("Parallel " + i + " " + "x".repeat(20000)));
    const rs = await Promise.all(texts.map(t => post("/save.php?file=info.js", t, { "X-DSM-Key": KEY })));
    assert.deepEqual(rs.map(r => r.status), texts.map(() => 200));
    const now = await (await get("/info.js")).text();
    assert.ok(texts.includes(now), "info.js is one of the sent versions, not a mix");
    const backups = fs.readdirSync(path.join(WEB, "backup")).filter(f => /^info-.*\.js$/.test(f));
    assert.ok(backups.length <= 10, backups.length + " backups");
    for (const b of backups) assert.match(fs.readFileSync(path.join(WEB, "backup", b), "utf8"), /^\/\* Opening hours[\s\S]*;\n$/);
  });
});
