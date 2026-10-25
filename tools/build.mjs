/*
 * Builds the website from src/ (React, Tailwind CSS, shadcn/ui) into website/.
 *
 *   npm run build            build once
 *   npm run build -- --watch rebuild on every change (npm run dev)
 *
 * Result (fixed names, no hashes – an FTP upload simply replaces the old files):
 *   website/index.html, website/admin.html   from src/index.html, src/admin.html (copied unchanged)
 *   website/assets/head.js                   from src/head.js (before the first paint: theme, language)
 *   website/assets/library.js                book list (src/library/main.jsx)
 *   website/assets/admin.js                  lock of the admin page (src/admin/main.jsx)
 *   website/assets/backgrounds.js            500 extra backgrounds, loaded only when chosen (src/backgrounds/index.js)
 *   website/assets/style.css                 Tailwind CSS of both pages
 * Scripts as IIFE (classic <script>, no type="module"): that way the page also runs via double-click (file://).
 * The admin app itself (tools/source/) is built and encrypted by tools/encrypt-admin.js.
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

// Fonts live in website/assets/fonts/ and are loaded relative to style.css – Vite doesn't need to find them
const logger = createLogger("warn");
for (const kind of ["warn", "warnOnce"]) {
  const orig = logger[kind];
  logger[kind] = (msg, o) => { if (!/fonts\/fira-sans.*didn't resolve at build time/.test(msg)) orig(msg, o); };
}

// React API from Preact (preact/compat): same imports in the source, bundle about half the size
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

// Shared Vite settings, also for the encrypted admin app (encrypt-admin.js)
export function viteBase() {
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

const PAGES = [
  { entry: "library/main.jsx", file: "library.js", name: "DSM_PAGE_LIBRARY" },
  { entry: "admin/main.jsx", file: "admin.js", name: "DSM_PAGE_ADMIN" },
  { entry: "backgrounds/index.js", file: "backgrounds.js", name: "DSM_PAGE_BACKGROUNDS" },
];

function copy(target) {
  fs.mkdirSync(path.join(target, "assets"), { recursive: true });
  for (const f of ["index.html", "admin.html"]) fs.copyFileSync(path.join(SRC, f), path.join(target, f));
  fs.copyFileSync(path.join(SRC, "head.js"), path.join(target, "assets", "head.js"));
}

async function page(s, target) {
  const base = viteBase();
  return build({
    ...base,
    build: {
      outDir: path.join(target, "assets"),
      emptyOutDir: false,
      copyPublicDir: false,
      target: "es2020",
      reportCompressedSize: false,
      watch: watch ? {} : null,
      lib: { entry: path.join(SRC, s.entry), formats: ["iife"], name: s.name, fileName: () => s.file, cssFileName: "style" },
    },
  });
}

// target: a folder like website/ (tests build into their own folder and compare)
export async function buildSite(target = WEB) {
  copy(target);
  for (const s of PAGES) await page(s, target);
}
export const GENERATED = ["index.html", "admin.html", "assets/head.js", "assets/library.js", "assets/admin.js", "assets/backgrounds.js", "assets/style.css"];

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await buildSite();
  if (watch) {
    for (const f of ["index.html", "admin.html", "head.js"]) fs.watch(path.join(SRC, f), () => { copy(WEB); console.log("copied:", f); });
    console.log("Rebuilding on changes …");
  } else {
    console.log("built: website/index.html, admin.html, assets/{library.js, admin.js, backgrounds.js, style.css, head.js}");
  }
}
