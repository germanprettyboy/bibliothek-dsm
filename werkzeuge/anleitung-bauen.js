/*
 * Baut die eigenständige Anleitung anleitung/Anleitung_Verwaltung.html aus werkzeuge/anleitung/vorlage.html.
 * Schrift (Fira Sans 400/500/600) und Logo werden eingebettet, damit die Datei offline,
 * per Doppelklick, auf Windows 7 und ausgedruckt gleich aussieht.
 *   node werkzeuge/anleitung-bauen.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const assets = path.join(root, "website", "assets");
const b64 = f => fs.readFileSync(path.join(assets, f)).toString("base64");

const teile = {
  FONT400: b64("fonts/fira-sans-latin-400-normal.woff2"),
  FONT500: b64("fonts/fira-sans-latin-500-normal.woff2"),
  FONT600: b64("fonts/fira-sans-latin-600-normal.woff2"),
  LOGO_HELL: b64("logo-hell.png"),
  LOGO_DUNKEL: b64("logo-dunkel.png"),
};

let html = fs.readFileSync(path.join(__dirname, "anleitung", "vorlage.html"), "utf8");
html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => {
  if (!(k in teile)) throw new Error("Unbekannter Platzhalter " + m);
  return teile[k];
});

const ziel = path.join(root, "anleitung", "Anleitung_Verwaltung.html");
fs.mkdirSync(path.dirname(ziel), { recursive: true });
fs.writeFileSync(ziel, html);
console.log(path.relative(root, ziel), Math.round(html.length / 1024) + " KB");
