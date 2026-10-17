/* Harte Regeln aus CLAUDE.md, die sich am Quelltext (src/, werkzeuge/quelle/) und an der gebauten Website prüfen lassen. */
"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { ROOT, WEB } = require("../helfer/laden.js");

const SRC = path.join(ROOT, "src");
const lies = rel => fs.readFileSync(path.join(WEB, rel), "utf8");
const liesSrc = rel => fs.readFileSync(path.join(SRC, rel), "utf8");
function alle(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) alle(p, out); else out.push(p);
  }
  return out;
}
const webDateien = alle(WEB);
const text = webDateien.filter(p => /\.(html|js|css|txt)$/.test(p) && !p.includes(path.join("vendor", "")));
const css = liesSrc("styles.css"); // Quelle; das gebaute assets/style.css enthält zusätzlich Tailwinds Grundstil
const gebautCss = lies("assets/style.css");
// Komponenten-Quellen (JSX/JS) der Seiten und der Verwaltung
const quellen = alle(SRC).concat(alle(path.join(ROOT, "werkzeuge", "quelle"))).filter(p => /\.(jsx?|html)$/.test(p));

describe("Datenschutz und Veröffentlichung", () => {
  test("website/ enthält keine Datenbank und keine Klartext-Verwaltung", () => {
    for (const p of webDateien) assert.ok(!/\.(winbook|sqlite3?|db)$/i.test(p), p);
    const marker = ["PERSONAL_TABLES", "LOAN_COLUMNS", "dsm-empf-entwurf", "dsm-info-entwurf", "showDirectoryPicker", "DSMExtract.extract"];
    for (const p of text) {
      const s = fs.readFileSync(p, "utf8");
      for (const m of marker) assert.ok(!s.includes(m), path.relative(ROOT, p) + " enthält " + m);
    }
  });
  test(".gitignore schützt daten/ und *.winbook, nichts davon eingecheckt", () => {
    const gi = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
    assert.match(gi, /^daten\/$/m);
    assert.match(gi, /^\*\.winbook$/m);
    let files = "";
    try { files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }); } catch (e) { return; }
    assert.ok(!/^daten\//m.test(files));
    assert.ok(!/\.winbook$/m.test(files));
  });
  test("kein Ausleihstatus in der öffentlichen Seite", () => {
    for (const f of ["assets/bibliothek.js", "index.html", "books.js"]) {
      assert.ok(!/verliehen|ausgeliehen|vorgemerkt|verfügbar|prestat/i.test(lies(f)), f);
    }
  });
  test("Admin-Sperre: PBKDF2-SHA-256 + AES-GCM 256, Iterationen aus der Datei, Passwort nicht im Quelltext", () => {
    const s = liesSrc("verwaltung/sperre.jsx");
    assert.match(s, /name: "PBKDF2", hash: "SHA-256"/);
    assert.match(s, /name: "AES-GCM", length: 256/);
    assert.match(s, /iterations: enc\.iter/);
    assert.ok(!/password\s*[=:]\s*["']|pw\s*===?\s*["']/i.test(s));
    assert.match(lies("assets/verwaltung.js"), /PBKDF2/);
  });
  test("keine Datenschutzhinweise auf der Admin-Seite", () => {
    assert.ok(!/datenschutz|dsgvo|privacy/i.test(lies("admin.html") + liesSrc("verwaltung/sperre.jsx") + liesSrc("verwaltung/main.jsx")));
  });
});

describe("externe Verbindungen", () => {
  test("Schriften lokal, kein Google Fonts, alle @font-face-Dateien vorhanden", () => {
    for (const p of text) assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(fs.readFileSync(p, "utf8")), p);
    const urls = [...gebautCss.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m => m[1]).filter(u => !u.startsWith("data:"));
    assert.ok(urls.length >= 3);
    for (const u of urls) {
      assert.ok(!/^https?:/.test(u), u);
      assert.ok(fs.existsSync(path.join(WEB, "assets", u)), u);
    }
  });
  test("nur ekz, Open Library und Google Books als externe Ziele", () => {
    // react.dev: Link in Reacts Fehlermeldungen, tailwindcss.com: Lizenzhinweis im CSS – beides wird nie geladen
    const erlaubt = new Set(["cover.ekz.de", "openlibrary.org", "covers.openlibrary.org", "books.google.com", "www.w3.org", "react.dev", "tailwindcss.com"]);
    for (const p of text.filter(f => !f.endsWith(".txt"))) {
      for (const m of fs.readFileSync(p, "utf8").matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
        assert.ok(erlaubt.has(m[1].toLowerCase()), path.relative(WEB, p) + ": " + m[1]);
      }
    }
    for (const m of (lies("assets/bibliothek.js") + lies("assets/verwaltung.js")).matchAll(/https:\/\/react\.dev[^\s"'`]*/g)) assert.match(m[0], /^https:\/\/react\.dev\/errors\//);
  });
  test("Open Library nie über /b/isbn/ (Ratenbegrenzung), sondern Sammelabfrage viewapi", () => {
    for (const p of text) assert.ok(!/\/b\/isbn\//.test(fs.readFileSync(p, "utf8")), p);
    assert.match(lies("assets/covers.js"), /openlibrary\.org\/api\/books\?format=json&jscmd=viewapi&bibkeys=/);
  });
  test("lokale Verweise in index.html und admin.html existieren", () => {
    for (const f of ["index.html", "admin.html"]) {
      for (const m of lies(f).matchAll(/(?:src|href)="([^"#:]+)"/g)) {
        if (m[1] === "./") continue;
        assert.ok(fs.existsSync(path.join(WEB, m[1])), f + ": " + m[1]);
      }
    }
  });
  test("Cover-Bilder ohne Referrer", () => {
    const c = lies("assets/covers.js"), a = liesSrc("bibliothek/cover.jsx");
    assert.match(c, /img\.referrerPolicy = "no-referrer"/);
    assert.match(a, /img\.referrerPolicy = "no-referrer"/);
    assert.equal((c.match(/referrerPolicy: "no-referrer"/g) || []).length, (c.match(/\bfetch\(/g) || []).length, "jedes fetch ohne Referrer");
  });
});

describe("Technik: React + Tailwind, gebaut zu klassischen Skripten", () => {
  test("keine Module im HTML: läuft auch per Doppelklick (file://)", () => {
    for (const f of ["index.html", "admin.html"]) {
      const s = lies(f);
      assert.ok(!/type="module"|<script[^>]*crossorigin/.test(s), f);
      assert.match(s, f === "index.html" ? /<script src="assets\/bibliothek\.js"><\/script>/ : /<script src="assets\/verwaltung\.js"><\/script>/);
    }
    for (const f of ["assets/bibliothek.js", "assets/verwaltung.js"]) assert.ok(!/^\s*import[\s{*]|\bimport\(/m.test(lies(f)), f);
  });
  test("Reihenfolge: Öffnungszeiten und Seite vor books.js; Entsperren erst nach books.js", () => {
    const i = lies("index.html"), a = lies("admin.html");
    assert.ok(i.indexOf('src="info.js"') < i.indexOf('src="assets/bibliothek.js"'));
    assert.ok(i.indexOf('src="assets/bibliothek.js"') < i.indexOf('src="books.js"'));
    assert.ok(a.indexOf('src="books.js"') < a.indexOf('src="assets/verwaltung.js"'));
  });
});

describe("Design", () => {
  const ohneFontFace = css.replace(/@font-face\s*\{[^}]*\}/g, "");
  test("kein Kursiv, keine Versalien, kein Unterstreichen (Stil und Klassen)", () => {
    assert.ok(!/italic|oblique/i.test(ohneFontFace));
    assert.ok(!/text-transform\s*:\s*(uppercase|capitalize)/i.test(css + gebautCss));
    assert.ok(!/font-variant(-caps)?\s*:\s*(small|all|petite)/i.test(css));
    for (const m of css.matchAll(/text-decoration(?:-line)?\s*:\s*([^;}]+)/g)) assert.equal(m[1].trim(), "none");
    for (const p of quellen) {
      const s = fs.readFileSync(p, "utf8");
      assert.ok(!/["'`\s](italic|uppercase|capitalize|underline|small-caps|font-bold|font-extrabold|font-black)["'`\s]/.test(s), path.relative(ROOT, p));
    }
    for (const k of [".italic", ".uppercase", ".capitalize", ".underline{", ".font-bold"]) assert.ok(!gebautCss.includes(k), k);
  });
  test("genau drei Schriftgrößen: Tailwind-Skala nur text-s/m/l, keine anderen Werte", () => {
    for (const p of quellen) {
      const s = fs.readFileSync(p, "utf8");
      assert.ok(!/\btext-(xs|sm|base|lg|[2-9]?xl)\b|\btext-\[\d/.test(s), path.relative(ROOT, p));
    }
    assert.match(css, /--text-\*: initial;/);
    // gebaut: nur die drei Größen (Tokens), dazu Tailwinds Grundstil (inherit, 1em, small/sub/sup) und „größere Schrift“
    const erlaubt = new Set(["var(--fs-s)", "var(--fs-m)", "var(--fs-l)", "var(--text-s)", "var(--text-m)", "var(--text-l)", "inherit", "1em", "75%", "80%", "118.75%"]);
    for (const m of gebautCss.matchAll(/font-size:([^;}]+)/g)) assert.ok(erlaubt.has(m[1].trim()), "font-size: " + m[1]);
    for (const m of css.matchAll(/--fs-[sml]:\s*([^;]+);/g)) assert.ok([".875rem", "1rem", "1.5rem"].includes(m[1].trim()), m[0]);
  });
  test("Schrift Fira Sans 400/500/600 lokal", () => {
    for (const w of [400, 500, 600]) assert.match(css, new RegExp(`font-family: "Fira Sans"; font-style: normal; font-weight: ${w}`));
    assert.ok(!/font-weight\s*:\s*(700|800|900|bold\b)/.test(css), "nur Regular/Medium/SemiBold");
    assert.match(css, /--font-weight-\*: initial;/);
    for (const m of gebautCss.matchAll(/--font-weight-([a-z]+):\s*(\d+)/g)) assert.ok(["400", "500", "600"].includes(m[2]), m[0]);
  });
  test("Anthrazit #333333 als Textfarbe", () => {
    assert.match(css, /--fg:\s*#333333/i);
  });
  test("Theme: Gerät (prefers-color-scheme) + data-theme hell/dunkel", () => {
    assert.match(css, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)/);
    assert.match(css, /:root\[data-theme="dark"\]/);
  });
  test("Barrierefreiheit: hoher Kontrast, größere Schrift, reduzierte Bewegung", () => {
    assert.match(css, /:root\[data-contrast="high"\]/);
    assert.match(css, /:root\[data-font="large"\]\s*\{\s*font-size/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  });
  test("A–Z-Leiste erst ab 48rem", () => {
    assert.match(css, /\.index \{ display: none; \}\s*@media \(min-width: 48rem\) \{\s*\.index \{ display: flex;/);
  });
  test("Glas-Fenster: backdrop-filter mit Unschärfe für Fenster (.glass) und Hintergrund (.schleier)", () => {
    assert.match(css, /\.glass \{[^}]*backdrop-filter: blur\(/);
    assert.match(css, /\.schleier \{[^}]*backdrop-filter: blur\(/);
    assert.match(liesSrc("components/ui/dialog.jsx"), /"glass sheet"/);
  });
  test("Logofarben als Tokens", () => {
    for (const [n, c] of [["mauve", "BA8EA7"], ["gelb", "DDD300"], ["orange", "DB9F00"], ["blau", "B5C9D0"], ["rot", "A93A39"], ["gruen", "B3CEA1"]]) {
      assert.match(css, new RegExp(`--${n}:\\s*#${c}`, "i"), n);
    }
  });
  test("keine Farbstreifen-Leiste unter dem Titel", () => {
    assert.ok(!/class="(stripe|streifen|colorbar|farbleiste)/i.test(lies("index.html")));
    assert.ok(!/\.intro[^{]*::after\s*\{[^}]*linear-gradient/.test(css));
  });
});

describe("Liste bleibt reiner Text", () => {
  test("Listenzeile ohne Bild", () => {
    const a = liesSrc("bibliothek/liste.jsx");
    const zeile = a.slice(a.indexOf("const Abschnitt"), a.indexOf("// Schneller animierter Sprung"));
    assert.ok(zeile.length > 100);
    assert.ok(!/<img|cover/i.test(zeile));
  });
});
