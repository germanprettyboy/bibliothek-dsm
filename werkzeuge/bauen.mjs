/*
 * Baut die Website aus src/ (React, Tailwind CSS, shadcn/ui) nach website/.
 *
 *   npm run build            einmal bauen
 *   npm run build -- --watch bei jeder Änderung neu bauen (npm run dev)
 *
 * Ergebnis (feste Namen, keine Hashes – FTP-Upload ersetzt einfach die alten Dateien):
 *   website/index.html, website/admin.html   aus src/index.html, src/admin.html (unverändert kopiert)
 *   website/assets/kopf.js                   aus src/kopf.js (vor dem ersten Zeichnen: Theme, Sprache)
 *   website/assets/bibliothek.js             Bücherliste (src/bibliothek/main.jsx)
 *   website/assets/verwaltung.js             Sperre der Verwaltung (src/verwaltung/main.jsx)
 *   website/assets/style.css                 Tailwind-CSS beider Seiten
 * Skripte als IIFE (klassisches <script>, kein type="module"): so läuft die Seite auch per Doppelklick (file://).
 * Die Verwaltung selbst (werkzeuge/quelle/) baut und verschlüsselt werkzeuge/admin-verschluesseln.js.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, createLogger } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const WEB = path.join(ROOT, "website");
const watch = process.argv.includes("--watch");

// Schriften liegen in website/assets/fonts/ und werden relativ zu style.css geladen – Vite muss sie nicht finden
const logger = createLogger("warn");
for (const art of ["warn", "warnOnce"]) {
  const orig = logger[art];
  logger[art] = (msg, o) => { if (!/fonts\/fira-sans.*didn't resolve at build time/.test(msg)) orig(msg, o); };
}

// React-API von Preact (preact/compat): gleiche Imports im Quelltext, Bundle ca. halb so groß
export function preactAlias(root) {
  const P = path.join(root, "node_modules", "preact");
  return [
    { find: /^react-dom\/client$/, replacement: P + "/compat/client" },
    { find: /^react-dom$/, replacement: P + "/compat" },
    { find: /^react\/jsx-runtime$/, replacement: P + "/jsx-runtime" },
    { find: /^react$/, replacement: P + "/compat" },
    { find: "@", replacement: path.join(root, "src") },
  ];
}

// Gemeinsame Vite-Einstellungen, auch für die verschlüsselte Verwaltung (admin-verschluesseln.js)
export function viteBasis() {
  return {
    configFile: false,
    root: ROOT,
    customLogger: logger,
    logLevel: "warn",
    plugins: [react(), tailwindcss()],
    resolve: { alias: preactAlias(ROOT) },
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
  };
}

const SEITEN = [
  { entry: "bibliothek/main.jsx", datei: "bibliothek.js", name: "DSM_SEITE_BIBLIOTHEK" },
  { entry: "verwaltung/main.jsx", datei: "verwaltung.js", name: "DSM_SEITE_VERWALTUNG" },
];

function kopieren(ziel) {
  fs.mkdirSync(path.join(ziel, "assets"), { recursive: true });
  for (const f of ["index.html", "admin.html"]) fs.copyFileSync(path.join(SRC, f), path.join(ziel, f));
  fs.copyFileSync(path.join(SRC, "kopf.js"), path.join(ziel, "assets", "kopf.js"));
}

async function seite(s, ziel) {
  const basis = viteBasis();
  return build({
    ...basis,
    build: {
      outDir: path.join(ziel, "assets"),
      emptyOutDir: false,
      copyPublicDir: false,
      target: "es2020",
      reportCompressedSize: false,
      watch: watch ? {} : null,
      lib: { entry: path.join(SRC, s.entry), formats: ["iife"], name: s.name, fileName: () => s.datei, cssFileName: "style" },
    },
  });
}

// ziel: Ordner wie website/ (Tests bauen in einen eigenen Ordner und vergleichen)
export async function bauen(ziel = WEB) {
  kopieren(ziel);
  for (const s of SEITEN) await seite(s, ziel);
}
export const ERZEUGT = ["index.html", "admin.html", "assets/kopf.js", "assets/bibliothek.js", "assets/verwaltung.js", "assets/style.css"];

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await bauen();
  if (watch) {
    for (const f of ["index.html", "admin.html", "kopf.js"]) fs.watch(path.join(SRC, f), () => { kopieren(WEB); console.log("kopiert:", f); });
    console.log("Baue bei Änderungen neu …");
  } else {
    console.log("gebaut: website/index.html, admin.html, assets/{bibliothek.js, verwaltung.js, style.css, kopf.js}");
  }
}
