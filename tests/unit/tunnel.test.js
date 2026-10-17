/* werkzeuge/tunnel.mjs: der Server hinter dem öffentlichen Cloudflare-Tunnel liefert nur den gewählten Ordner aus
   (kein Ausbruch, keine Punktdateien), immer mit no-store; Tunnel-Adresse wird aus dem cloudflared-Log erkannt. */
"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { ROOT, TMP } = require("../helfer/laden.js");

const BASIS = path.join(TMP, "tunnel");
const SEITE = path.join(BASIS, "seite");
let T, server, port;

before(async () => {
  fs.rmSync(BASIS, { recursive: true, force: true });
  fs.mkdirSync(path.join(SEITE, "assets"), { recursive: true });
  fs.mkdirSync(path.join(SEITE, ".git"), { recursive: true });
  fs.writeFileSync(path.join(SEITE, "index.html"), "<!doctype html><title>x</title>");
  fs.writeFileSync(path.join(SEITE, "assets", "a.js"), "window.A = 1;");
  fs.writeFileSync(path.join(SEITE, ".htaccess"), "geheim");
  fs.writeFileSync(path.join(SEITE, ".git", "config"), "geheim");
  fs.writeFileSync(path.join(BASIS, "geheim.txt"), "geheim");
  T = await import(path.join(ROOT, "werkzeuge", "tunnel.mjs"));
  server = T.statischerServer(SEITE);
  await new Promise(ok => server.listen(0, "127.0.0.1", ok));
  port = server.address().port;
});
after(() => server.close());

// Rohe Anfrage: Pfad wird unverändert gesendet (fetch würde ../ vorher auflösen)
const holen = (pfad, method = "GET") => new Promise((ok, nein) => {
  const req = http.request({ host: "127.0.0.1", port, path: pfad, method }, res => {
    let body = "";
    res.on("data", d => body += d);
    res.on("end", () => ok({ status: res.statusCode, kopf: res.headers, body }));
  });
  req.on("error", nein);
  req.end();
});

test("liefert Dateien mit passendem Typ und immer no-store (Cloudflare cacht sonst .js/.css)", async () => {
  const start = await holen("/");
  assert.equal(start.status, 200);
  assert.match(start.kopf["content-type"], /^text\/html/);
  assert.equal(start.kopf["cache-control"], "no-store");
  const js = await holen("/assets/a.js?v=1");
  assert.equal(js.body, "window.A = 1;");
  assert.match(js.kopf["content-type"], /^text\/javascript/);
  assert.equal(js.kopf["cache-control"], "no-store");
});

test("nichts außerhalb des Ordners, keine Punktdateien, kein Verzeichnis-Listing", async () => {
  for (const p of ["/../geheim.txt", "/%2e%2e/geheim.txt", "/..%2fgeheim.txt", "/assets/../../geheim.txt",
    "/.htaccess", "/.git/config", "/assets/%2e%2e/.htaccess", "/assets/", "/fehlt.js", "/%E0%A4%A"]) {
    const r = await holen(p);
    assert.equal(r.status, 404, p);
    assert.doesNotMatch(r.body, /geheim/, p);
  }
});

test("nur GET und HEAD", async () => {
  assert.equal((await holen("/index.html", "POST")).status, 405);
  const kopf = await holen("/index.html", "HEAD");
  assert.equal(kopf.status, 200);
  assert.equal(kopf.body, "");
});

test("Tunnel-Adresse aus dem cloudflared-Log", () => {
  assert.equal(T.tunnelAdresse("2026-10-17T10:00:00Z INF |  https://pieces-patrick-platforms.trycloudflare.com  |"),
    "https://pieces-patrick-platforms.trycloudflare.com/");
  assert.equal(T.tunnelAdresse("INF Requesting new quick Tunnel on trycloudflare.com..."), null);
  assert.equal(T.tunnelAdresse("ERR Error unmarshaling QuickTunnel response from https://api.trycloudflare.com/tunnel"), null);
});
