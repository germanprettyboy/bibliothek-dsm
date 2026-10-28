# Sitemap – every tracked file in one line

For Claude: look here first, then open the file (its header comment explains it) instead of searching the tree.
New, renamed or deleted file → change this list in the same commit (`tests/unit/sitemap.test.js` checks it on CI).
Entry = first `code` of a line: a file, `dir/` (everything below) or a pattern (`*` = within one path segment).
B = built by `npm run build` from src/ (never edit), G = generated (never by hand). Grep skips both (`.ignore`).

## Root and config

- `CLAUDE.md` – Claude's standing instructions (loaded every session); area rules in `.claude/rules/`
- `.claude/settings.json` – hooks (branches.sh at start, main-guard.cjs on Edit/Write), worktree node_modules link, env
- `.claude/rules/` – area rules, each loads only when Claude reads a file matching its `paths:` (library, admin, data, covers, ui, backdrop, tests)
- `.claude/skills/integrate/SKILL.md` – end-of-task procedure: commit, merge main, CI, integrate the branch
- `README.md` – overview for people (German)
- `package.json` – npm scripts, exact dependency versions
- `package-lock.json` – lockfile (Grep skips)
- `vite.config.js` – Vite for tools/build.mjs (Preact alias, Tailwind)
- `jsconfig.json` – `@/` → `src/`
- `components.json` – shadcn/ui config
- `playwright.config.js` – E2E projects (browsers, shards, smoke plan from tests/suites.js), own server per checkout
- `.gitignore` – data/, node_modules, upload/, tests/.tmp/, website/info.js, worktrees
- `.ignore` – files ripgrep (Claude's Grep) skips: build output, generated data, vendor, guide
- `.github/workflows/test.yml` – CI: unit, E2E (Chromium/Firefox sharded, WebKit), Apache, audit; suite trailer
- `.github/workflows/stress.yml` – flake hunt by hand (`--repeat-each`, no retries)

## src/ – sources of both pages

- `src/index.html` – template of the book list (skeleton in `#page`; head.js, library.js, then books.js)
- `src/admin.html` – template of the admin page
- `src/head.js` – classic script before the first paint: theme/size/contrast/motion/language, placeholders, copy guard
- `src/styles.css` – tokens (colors per theme/contrast, sizes, durations), Tailwind theme, component classes; 1,200 lines: grep, read a range
- `src/lib/appearance.js` – theme, larger text, contrast, no animations (attributes on `<html>`, transition freeze)
- `src/lib/environment.js` – reduced motion (system or setting), access to covers.js
- `src/lib/language.jsx` – DE/IT: `addStrings()`, `useLanguage()` → `t()`
- `src/lib/notice.js` – toast notice (Sonner), one at a time
- `src/lib/storage.js` – safe localStorage `store` (keys `dsm-*`), `log()`
- `src/lib/swipe.js` – phone bottom sheet with swipe stages (every dialog)
- `src/lib/utils.js` – `cn()` (tailwind-merge that knows text-s/m/l)
- `src/components/header.jsx` – header of both pages: logo, title (container query), language, settings
- `src/components/glass-dialog.jsx` – glass dialog (`.glass.sheet` + `.scrim`) under every dialog
- `src/components/settings.jsx` – settings dialog: theme, larger text, contrast, motion; pages append sections
- `src/components/announcement.jsx` – announcement strip (book list + admin preview), `ColorDots`
- `src/components/ui/` – shadcn/ui primitives (`npm run ui:add -- <name>`); changes = full CI
- `src/library/main.jsx` – entry of the book list: first render via flushSync before books.js
- `src/library/app.jsx` – book list layout: header, info, recommendations, search + list, dialogs, background
- `src/library/data.js` – data stores: books.js setter, recommendations.js, info.js, admin preview `#preview`
- `src/library/list.jsx` – search, category pill, A–Z filter bar, letter floater, chunked plain-text list (performance-critical)
- `src/library/categories.jsx` – category filter dialog (search, groups from "A - B" names)
- `src/library/detail.jsx` – book detail dialog, cover zoom (FLIP), "Why this book?"
- `src/library/cover.jsx` – cover image over a designed placeholder, shimmer
- `src/library/recommendations.jsx` – recommendation card, archive, settings section, first-visit questions, empty state
- `src/library/choice.js` – recommendation choice store (`dsm-recs`)
- `src/library/info.jsx` – opening hours card and dialog, closures, notice, contact (Milan time)
- `src/library/announcement.jsx` – announcement above the header (× / Esc, remembered by hash)
- `src/library/backdrop.jsx` – interactive background engine + settings section "Hintergrund", `window.DSM_BG`
- `src/library/dots-gl.js` – background "Punkte" on WebGL
- `src/library/scenes.js` – background "Punkte" on canvas 2D (fallback without WebGL)
- `src/admin/main.jsx` – entry of the admin page: header + lock
- `src/admin/lock.jsx` – password lock: PBKDF2 + AES-GCM decrypts admin.enc.js, session key
- `src/admin/shared.js` – `window.DSM_SHARED`: React + every `@/…` module the admin app imports

## tools/ – build, data, admin source (never uploaded; `tools/README.txt`)

- `tools/README.txt` – what each tool does, how to run it
- `tools/build.mjs` – `npm run build` (`--watch`): src/ → website/, one IIFE per page, fixed names; `preactAlias`
- `tools/source/extract.js` – WinBook SQLite → public list (whitelist, name check, `inspect()`); encrypted with the admin app
- `tools/source/admin/app.jsx` – admin app root: tabs, nav, help, lock; sets `window.DSM_ADMIN`
- `tools/source/admin/nav.jsx` – floating tab bar Bestand … Statistik, help, lock
- `tools/source/admin/catalog.jsx` – tab Bestand: import WinBook file, loader, report, Italian categories, publish books.js
- `tools/source/admin/maintenance.jsx` – tab Pflege: maintenance lists, Excel/CSV/print/PDF
- `tools/source/admin/fixes.jsx` – tab Pflege: automatic corrections (public list only)
- `tools/source/admin/fixes-core.js` – correction logic (pure, also runs in Node)
- `tools/source/admin/table-view.jsx` – table viewer dialog (search, filter, sort, export)
- `tools/source/admin/table-data.js` – rows, columns, filters of the table viewer
- `tools/source/admin/print.jsx` – print documents of tab Pflege
- `tools/source/admin/xlsx.js` – tiny XLSX writer
- `tools/source/admin/covers.jsx` – tab Cover: coverage check, hide wrong covers (`noCover`)
- `tools/source/admin/recommendations.jsx` – tab Empfehlungen: groups, texts, rounds, archive, switch `#rec-on`
- `tools/source/admin/info.jsx` – tab Info: announcement, opening hours, notice, contact, closures → info.js
- `tools/source/admin/stats.jsx` – tab Statistik: charts about the collection
- `tools/source/admin/charts.jsx` – hand-built SVG charts
- `tools/source/admin/publish.jsx` – publishing: save.php / folder access / download
- `tools/source/admin/versions.js` – local version history (IndexedDB `dsm-admin`)
- `tools/source/admin/help.jsx` – help page dialog (sidebar, search)
- `tools/source/admin/help-content.js` – help content DE/IT as data; 1,100 lines: grep the id
- `tools/source/admin/strings.js` – shared admin texts DE/IT (tab, list and column names)
- `tools/source/admin/strings-*.js` – texts per area: care, fixes, help, import, nav, stats, table, versions
- `tools/encrypt-admin.js` – `npm run encrypt`: bundle admin app + extract.js, encrypt → admin.enc.js + save-access.php
- `tools/check-admin.cjs` – compile check of the admin app (no password, writes nothing)
- `tools/generate-books.js` – `npm run books`: data/*.winbook → website/books.js (name check, exit 2)
- `tools/migrate-data.mjs` – one-time migration of the old German data files
- `tools/pack.mjs` – `npm run pack`: upload/website/ from the committed website/
- `tools/local.mjs` – `npm run local`: php-wasm server, real save.php, password "local", watch build
- `tools/local-router.php` – router of the local PHP server
- `tools/local-address.cjs` – binds the local PHP server to 127.0.0.1
- `tools/tunnel.mjs` – `npm run tunnel(:dev|:php)`, `test:live`: public https URL
- `tools/branches.sh` – worktrees ↔ main: overview, `--hook`, `integrate`, `sync`, `cleanup`
- `tools/main-guard.cjs` – PreToolUse hook: no Edit/Write in the main checkout
- `tools/build-guide.js` – builds anleitung/ from the guide template
- `tools/guide/template.html` – colleagues' guide (German), source of anleitung/

## website/ – exactly what goes onto the webspace

- `website/index.html` – B: book list page
- `website/admin.html` – B: admin page
- `website/assets/library.js` – B: book list bundle
- `website/assets/admin.js` – B: admin page shell (lock + shared modules)
- `website/assets/head.js` – B: from src/head.js
- `website/assets/style.css` – B: from src/styles.css
- `website/assets/admin.enc.js` – G: encrypted admin app (`npm run encrypt`, only Johann)
- `website/save-access.php` – G: save.php access (encrypt-admin.js)
- `website/books.js` – G: `window.DSM_LIBRARY`, ≈720 KB in one line: inspect with `node -e`, never cat
- `website/recommendations.js` – G: `window.DSM_RECOMMENDATIONS` (admin page)
- `website/assets/covers.js` – by hand: cover loader ekz → Open Library, `window.DSMCovers`
- `website/assets/logger.js` – by hand: interaction log in the console
- `website/assets/categories-it.js` – by hand: Italian category names
- `website/save.php` – by hand: the only server file (publish, backups, restore)
- `website/.htaccess` – by hand: Apache compression, headers, https (only IfModule)
- `website/LIESMICH.txt` – by hand: German guide for the webspace
- `website/assets/vendor/` – sql.js 1.10.3 + license (Grep skips)
- `website/assets/fonts/` – Fira Sans 400/500/600 + OFL
- `website/assets/favicon.png` – favicon
- `website/assets/logo-*` – logo light/dark, png + webp

## tests/ – CI only, never locally

- `tests/suites.js` – CI suites: area → specs, trailer parsing (`node tests/suites.js` lists the areas, allowed locally)
- `tests/e2e/*.spec.js` – Playwright, one spec per area (`node tests/suites.js`): behavior and selectors of each component
- `tests/e2e/helpers.js` – fixture: cover services mocked, request log, `settled(page)`, `PHONE`, swipe helpers
- `tests/e2e/admin-helpers.js` – admin spec helpers (test-password encryption, unlock, import)
- `tests/e2e/setup.js` – global setup: encrypt the admin app with the test password, write test databases
- `tests/unit/*.test.js` – node --test: build (gzip budgets), covers, data (books.js budget, formats), encryption, extract, generate-books, migrate, pack, real-db (needs data/), rules (hard rules on the source), save, sitemap, suites, tunnel
- `tests/apache/apache.test.js` – upload folder on a real Apache + PHP 7.1 (CI job only)
- `tests/helpers/load.js` – paths, loading `window.X` data files in Node, norm()/search as in the page
- `tests/helpers/testdb.js` – synthetic WinBook database (invented readers and loans)
- `tests/helpers/flaky-report.js` – flaky tests from the Playwright report → Actions annotations
- `tests/helpers/stress-report.js` – failure rate per test of a stress run
- `tests/helpers/ekz-placeholder.jpg` – ekz "kein Bild" substitute image for the cover tests

## Not code

- `docs/sitemap.md` – this file
- `docs/entwuerfe/` – UI variants, also as private artifact https://claude.ai/artifact/EuCPm1eKryK64A8YD5ywNP (picks: `ArtifactData get`, collection `picks`, doc `main`)
- `anleitung/Anleitung_Verwaltung.html` – G: built guide (tools/build-guide.js), 340 KB
