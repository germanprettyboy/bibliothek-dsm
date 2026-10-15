/* Harte Regeln aus CLAUDE.md, die sich am Quelltext prüfen lassen. */
"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { ROOT, WEB } = require("../helfer/laden.js");

const lies = rel => fs.readFileSync(path.join(WEB, rel), "utf8");
function alle(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) alle(p, out); else out.push(p);
  }
  return out;
}
const webDateien = alle(WEB);
const text = webDateien.filter(p => /\.(html|js|css|txt)$/.test(p) && !p.includes(path.join("vendor", "")));
const css = lies("assets/style.css");

describe("Datenschutz und Veröffentlichung", () => {
  test("website/ enthält keine Datenbank und keine Klartext-Verwaltung", () => {
    for (const p of webDateien) assert.ok(!/\.(winbook|sqlite3?|db)$/i.test(p), p);
    const marker = ["PERSONAL_TABLES", "LOAN_COLUMNS", "dsm-empf-entwurf", "function renderEditor"];
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
    for (const f of ["assets/app.js", "index.html", "books.js"]) {
      assert.ok(!/verliehen|ausgeliehen|vorgemerkt|verfügbar|prestat/i.test(lies(f)), f);
    }
  });
  test("Admin-Sperre: PBKDF2-SHA-256 + AES-GCM 256, Iterationen aus der Datei, Passwort nicht im Quelltext", () => {
    const s = lies("assets/admin-lock.js");
    assert.match(s, /name: "PBKDF2", hash: "SHA-256"/);
    assert.match(s, /name: "AES-GCM", length: 256/);
    assert.match(s, /iterations: enc\.iter/);
    assert.ok(!/password\s*[=:]\s*["']|pw\s*===?\s*["']/i.test(s));
  });
  test("keine Datenschutzhinweise auf der Admin-Seite", () => {
    assert.ok(!/datenschutz|dsgvo|privacy/i.test(lies("admin.html")));
  });
});

describe("externe Verbindungen", () => {
  test("Schriften lokal, kein Google Fonts, alle @font-face-Dateien vorhanden", () => {
    for (const p of text) assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(fs.readFileSync(p, "utf8")), p);
    const urls = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m => m[1]);
    assert.ok(urls.length >= 3);
    for (const u of urls) {
      assert.ok(!/^https?:/.test(u), u);
      assert.ok(fs.existsSync(path.join(WEB, "assets", u)), u);
    }
  });
  test("nur Open Library und Google Books als externe Ziele", () => {
    const erlaubt = new Set(["openlibrary.org", "covers.openlibrary.org", "www.googleapis.com", "www.w3.org"]);
    for (const p of text.filter(f => !f.endsWith(".txt"))) {
      for (const m of fs.readFileSync(p, "utf8").matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
        assert.ok(erlaubt.has(m[1].toLowerCase()), path.relative(WEB, p) + ": " + m[1]);
      }
    }
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
    const c = lies("assets/covers.js"), a = lies("assets/app.js");
    assert.match(c, /img\.referrerPolicy = "no-referrer"/);
    assert.match(a, /img\.referrerPolicy = "no-referrer"/);
    assert.ok((c.match(/referrerPolicy: "no-referrer"/g) || []).length >= 2, "fetch ohne Referrer");
  });
});

describe("Design (style.css)", () => {
  const ohneFontFace = css.replace(/@font-face\s*\{[^}]*\}/g, "");
  test("kein Kursiv, keine Versalien, kein Unterstreichen", () => {
    assert.ok(!/italic|oblique/i.test(ohneFontFace));
    assert.ok(!/text-transform\s*:\s*(uppercase|capitalize)/i.test(css));
    assert.ok(!/font-variant(-caps)?\s*:\s*(small|all|petite)/i.test(css));
    for (const m of css.matchAll(/text-decoration(?:-line)?\s*:\s*([^;}]+)/g)) assert.equal(m[1].trim(), "none");
  });
  test("Schrift Fira Sans 400/500/600 lokal", () => {
    for (const w of [400, 500, 600]) assert.match(css, new RegExp(`font-family: "Fira Sans"; font-style: normal; font-weight: ${w}`));
    assert.ok(!/font-weight\s*:\s*(700|800|900|bold)/.test(css), "nur Regular/Medium/SemiBold");
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
  test("Glas-Fenster: backdrop-filter mit Unschärfe für Fenster und Hintergrund", () => {
    assert.match(css, /dialog\.sheet[^{]*\{[^}]*backdrop-filter: blur\(/);
    assert.match(css, /::backdrop[^{]*\{[^}]*backdrop-filter: blur\(/);
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
    const a = lies("assets/app.js");
    const zeile = a.slice(a.indexOf("function render("), a.indexOf("list.innerHTML"));
    assert.ok(zeile.length > 100);
    assert.ok(!/<img|cover/i.test(zeile));
  });
});
