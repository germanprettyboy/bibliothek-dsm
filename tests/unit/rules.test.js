/* Hard rules from CLAUDE.md that can be checked on the source (src/, tools/source/) and on the built website. */
"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { ROOT, WEB } = require("../helpers/load.js");

const SRC = path.join(ROOT, "src");
const read = rel => fs.readFileSync(path.join(WEB, rel), "utf8");
const readSrc = rel => fs.readFileSync(path.join(SRC, rel), "utf8");
function all(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) all(p, out); else out.push(p);
  }
  return out;
}
const webFiles = all(WEB);
const text = webFiles.filter(p => /\.(html|js|css|txt)$/.test(p) && !p.includes(path.join("vendor", "")));
const css = readSrc("styles.css"); // source; the built assets/style.css additionally contains Tailwind's base styles
const builtCss = read("assets/style.css");
// Component sources (JSX/JS) of the pages and the admin app
const sources = all(SRC).concat(all(path.join(ROOT, "tools", "source"))).filter(p => /\.(jsx?|html)$/.test(p));

describe("privacy and publishing", () => {
  test("website/ contains no database and no plaintext admin app", () => {
    for (const p of webFiles) assert.ok(!/\.(winbook|sqlite3?|db)$/i.test(p), p);
    const markers = ["PERSONAL_TABLES", "LOAN_COLUMNS", "dsm-recs-draft", "dsm-info-draft", "showDirectoryPicker", "DSMExtract.extract"];
    for (const p of text) {
      const s = fs.readFileSync(p, "utf8");
      for (const m of markers) assert.ok(!s.includes(m), path.relative(ROOT, p) + " contains " + m);
    }
  });
  test(".gitignore protects data/ and *.winbook, none of it committed", () => {
    const gi = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
    assert.match(gi, /^data\/$/m);
    assert.match(gi, /^daten\/$/m);
    assert.match(gi, /^\*\.winbook$/m);
    let files = "";
    try { files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }); } catch (e) { return; }
    assert.ok(!/^(data|daten)\//m.test(files));
    assert.ok(!/\.winbook$/m.test(files));
  });
  test("no loan status on the public page", () => {
    for (const f of ["assets/library.js", "index.html", "books.js"]) {
      assert.ok(!/verliehen|ausgeliehen|vorgemerkt|verfügbar|prestat/i.test(read(f)), f);
    }
  });
  test("admin lock: PBKDF2-SHA-256 + AES-GCM 256, iterations from the file, password not in the source", () => {
    const s = readSrc("admin/lock.jsx");
    assert.match(s, /name: "PBKDF2", hash: "SHA-256"/);
    assert.match(s, /name: "AES-GCM", length: 256/);
    assert.match(s, /iterations: enc\.iter/);
    assert.ok(!/password\s*[=:]\s*["']|pw\s*===?\s*["']/i.test(s));
    assert.match(read("assets/admin.js"), /PBKDF2/);
  });
  test("no privacy notices on the admin page", () => {
    assert.ok(!/datenschutz|dsgvo|privacy/i.test(read("admin.html") + readSrc("admin/lock.jsx") + readSrc("admin/main.jsx")));
  });
});

describe("external connections", () => {
  test("fonts local, no Google Fonts, all @font-face files present", () => {
    for (const p of text) assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(fs.readFileSync(p, "utf8")), p);
    const urls = [...builtCss.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m => m[1]).filter(u => !u.startsWith("data:"));
    assert.ok(urls.length >= 3);
    for (const u of urls) {
      assert.ok(!/^https?:/.test(u), u);
      assert.ok(fs.existsSync(path.join(WEB, "assets", u)), u);
    }
  });
  test("only ekz, Open Library and Google Books as external targets", () => {
    // react.dev: link in React's error messages, tailwindcss.com: license note in the CSS – neither is ever loaded
    const allowed = new Set(["cover.ekz.de", "openlibrary.org", "covers.openlibrary.org", "books.google.com", "www.w3.org", "react.dev", "tailwindcss.com"]);
    for (const p of text.filter(f => !f.endsWith(".txt"))) {
      for (const m of fs.readFileSync(p, "utf8").matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
        assert.ok(allowed.has(m[1].toLowerCase()), path.relative(WEB, p) + ": " + m[1]);
      }
    }
    for (const m of (read("assets/library.js") + read("assets/admin.js")).matchAll(/https:\/\/react\.dev[^\s"'`]*/g)) assert.match(m[0], /^https:\/\/react\.dev\/errors\//);
  });
  test("Open Library never via /b/isbn/ (rate limit), but via the viewapi batch request", () => {
    for (const p of text) assert.ok(!/\/b\/isbn\//.test(fs.readFileSync(p, "utf8")), p);
    assert.match(read("assets/covers.js"), /openlibrary\.org\/api\/books\?format=json&jscmd=viewapi&bibkeys=/);
  });
  test("local references in index.html and admin.html exist", () => {
    for (const f of ["index.html", "admin.html"]) {
      for (const m of read(f).matchAll(/(?:src|href)="([^"#:]+)"/g)) {
        if (m[1] === "./" || m[1] === "info.js") continue; // info.js only lives on the webspace (not committed)
        assert.ok(fs.existsSync(path.join(WEB, m[1])), f + ": " + m[1]);
      }
    }
  });
  test("cover images without a referrer", () => {
    const c = read("assets/covers.js"), a = readSrc("library/cover.jsx");
    assert.match(c, /img\.referrerPolicy = "no-referrer"/);
    assert.match(a, /img\.referrerPolicy = "no-referrer"/);
    assert.equal((c.match(/referrerPolicy: "no-referrer"/g) || []).length, (c.match(/\bfetch\(/g) || []).length, "every fetch without a referrer");
  });
});

describe("technology: React + Tailwind, built into classic scripts", () => {
  test("no modules in the HTML: also runs via double-click (file://)", () => {
    for (const f of ["index.html", "admin.html"]) {
      const s = read(f);
      assert.ok(!/type="module"|<script[^>]*crossorigin/.test(s), f);
      assert.match(s, f === "index.html" ? /<script src="assets\/library\.js"><\/script>/ : /<script src="assets\/admin\.js"><\/script>/);
    }
    for (const f of ["assets/library.js", "assets/admin.js"]) assert.ok(!/^\s*import[\s{*]|\bimport\(/m.test(read(f)), f);
  });
  test("order: opening hours and page before books.js; unlocking only after books.js", () => {
    const i = read("index.html"), a = read("admin.html");
    assert.ok(i.indexOf('src="info.js"') < i.indexOf('src="assets/library.js"'));
    assert.ok(i.indexOf('src="assets/library.js"') < i.indexOf('src="books.js"'));
    assert.ok(a.indexOf('src="books.js"') < a.indexOf('src="assets/admin.js"'));
  });
});

describe("design", () => {
  const withoutFontFace = css.replace(/@font-face\s*\{[^}]*\}/g, "");
  test("no italics, no all caps, no underlining (styles and classes)", () => {
    assert.ok(!/italic|oblique/i.test(withoutFontFace));
    assert.ok(!/text-transform\s*:\s*(uppercase|capitalize)/i.test(css + builtCss));
    assert.ok(!/font-variant(-caps)?\s*:\s*(small|all|petite)/i.test(css));
    for (const m of css.matchAll(/text-decoration(?:-line)?\s*:\s*([^;}]+)/g)) assert.equal(m[1].trim(), "none");
    for (const p of sources) {
      const s = fs.readFileSync(p, "utf8");
      assert.ok(!/["'`\s](italic|uppercase|capitalize|underline|small-caps|font-bold|font-extrabold|font-black)["'`\s]/.test(s), path.relative(ROOT, p));
    }
    for (const k of [".italic", ".uppercase", ".capitalize", ".underline{", ".font-bold"]) assert.ok(!builtCss.includes(k), k);
  });
  test("exactly three font sizes: Tailwind scale only text-s/m/l, no other values", () => {
    for (const p of sources) {
      const s = fs.readFileSync(p, "utf8");
      assert.ok(!/\btext-(xs|sm|base|lg|[2-9]?xl)\b|\btext-\[\d/.test(s), path.relative(ROOT, p));
    }
    assert.match(css, /--text-\*: initial;/);
    // built: only the three sizes (tokens), plus Tailwind's base styles (inherit, 1em, small/sub/sup) and "larger text"
    const allowed = new Set(["var(--fs-s)", "var(--fs-m)", "var(--fs-l)", "var(--text-s)", "var(--text-m)", "var(--text-l)", "inherit", "1em", "75%", "80%", "118.75%"]);
    for (const m of builtCss.matchAll(/font-size:([^;}]+)/g)) assert.ok(allowed.has(m[1].trim()), "font-size: " + m[1]);
    for (const m of css.matchAll(/--fs-[sml]:\s*([^;]+);/g)) assert.ok([".875rem", "1rem", "1.5rem"].includes(m[1].trim()), m[0]);
  });
  test("font Fira Sans 400/500/600 local", () => {
    for (const w of [400, 500, 600]) assert.match(css, new RegExp(`font-family: "Fira Sans"; font-style: normal; font-weight: ${w}`));
    assert.ok(!/font-weight\s*:\s*(700|800|900|bold\b)/.test(css), "only Regular/Medium/SemiBold");
    assert.match(css, /--font-weight-\*: initial;/);
    for (const m of builtCss.matchAll(/--font-weight-([a-z]+):\s*(\d+)/g)) assert.ok(["400", "500", "600"].includes(m[2]), m[0]);
  });
  test("anthracite #333333 as the text color", () => {
    assert.match(css, /--fg:\s*#333333/i);
  });
  test("theme: device (prefers-color-scheme) + data-theme light/dark", () => {
    assert.match(css, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)/);
    assert.match(css, /:root\[data-theme="dark"\]/);
  });
  test("accessibility: high contrast, larger text, reduced motion", () => {
    assert.match(css, /:root\[data-contrast="high"\]/);
    assert.match(css, /:root\[data-font="large"\]\s*\{\s*font-size/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  });
  test("A–Z bar only from 48rem", () => {
    assert.match(css, /\.index \{ display: none; \}\s*@media \(min-width: 48rem\) \{\s*\.index \{ display: flex;/);
  });
  test("glass dialogs: backdrop-filter with blur for the dialog (.glass) and the background (.scrim)", () => {
    assert.match(css, /\.glass \{[^}]*backdrop-filter: blur\(/);
    assert.match(css, /\.scrim \{[^}]*backdrop-filter: blur\(/);
    assert.match(readSrc("components/ui/dialog.jsx"), /"glass sheet"/);
  });
  test("logo colors as tokens", () => {
    for (const [n, c] of [["mauve", "BA8EA7"], ["yellow", "DDD300"], ["orange", "DB9F00"], ["blue", "B5C9D0"], ["red", "A93A39"], ["green", "B3CEA1"]]) {
      assert.match(css, new RegExp(`--${n}:\\s*#${c}`, "i"), n);
    }
  });
  test("no color stripe bar under the title", () => {
    assert.ok(!/class="(stripe|streifen|colorbar|farbleiste)/i.test(read("index.html")));
    assert.ok(!/\.intro[^{]*::after\s*\{[^}]*linear-gradient/.test(css));
  });
});

describe("the list stays plain text", () => {
  test("list row without an image", () => {
    const a = readSrc("library/list.jsx");
    const row = a.slice(a.indexOf("const Chunk"), a.indexOf("// Covers: open connections"));
    assert.ok(row.length > 100);
    assert.ok(!/<img|cover/i.test(row));
  });
});
