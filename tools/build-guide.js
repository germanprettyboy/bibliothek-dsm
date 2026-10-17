/*
 * Builds the standalone guide anleitung/Anleitung_Verwaltung.html from tools/guide/template.html.
 * Font (Fira Sans 400/500/600) and logo are embedded so the file looks the same offline,
 * via double-click, on Windows 7 and printed.
 *   node tools/build-guide.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const assets = path.join(root, "website", "assets");
const b64 = f => fs.readFileSync(path.join(assets, f)).toString("base64");

const parts = {
  FONT400: b64("fonts/fira-sans-latin-400-normal.woff2"),
  FONT500: b64("fonts/fira-sans-latin-500-normal.woff2"),
  FONT600: b64("fonts/fira-sans-latin-600-normal.woff2"),
  LOGO_LIGHT: b64("logo-light.png"),
  LOGO_DARK: b64("logo-dark.png"),
};

let html = fs.readFileSync(path.join(__dirname, "guide", "template.html"), "utf8");
html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => {
  if (!(k in parts)) throw new Error("Unknown placeholder " + m);
  return parts[k];
});

const target = path.join(root, "anleitung", "Anleitung_Verwaltung.html");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, html);
console.log(path.relative(root, target), Math.round(html.length / 1024) + " KB");
