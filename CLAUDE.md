# Library DSM – book list of the Deutsche Schule Mailand

Static website: public book list of the school library + password-protected admin page. Bilingual DE/IT, mobile first.
React API on Preact 11 (`preact/compat`, alias `preactAlias` in `tools/build.mjs`) + Tailwind CSS v4 + shadcn/ui; Vite builds fixed
files into `website/` (plain HTML/CSS/JS). Only server file: `save.php`. Client: Johann Bucher (volunteer at the DSM).
Replies in German, no filler, no emojis. Code, comments, identifiers, data formats, docs: English; UI texts German/Italian.

**NEVER RUN TESTS LOCALLY (Johann, absolute).** No `npm test`, `test:e2e`, `test:all`, `test:live`, `npx playwright …`, `node --test …`
on Johann's Mac – not a single spec. Tests run ONLY on GitHub Actions: commit, `git push` the branch, `gh run watch <id> --exit-status`
/ `gh run view <id> --log-failed`. `npm run build`, `books`, `encrypt`, `pack` stay local (they produce files, no tests).

## Folders

- `website/` – ONLY this goes onto the webspace (via `npm run pack`). Built files are committed.
  - BUILT from `src/`: `index.html`, `admin.html`, `assets/{library,admin}.js`, `assets/style.css`, `assets/head.js`.
  - Generated, never by hand: `books.js`, `recommendations.js`, `info.js` (`window.DSM_LIBRARY/DSM_RECOMMENDATIONS/DSM_INFO`),
    `save-access.php` (SHA-256 of the save key, by encrypt-admin.js). `info.js` is NOT committed (`.gitignore`); missing = no info card.
  - By hand: `save.php`, `assets/logger.js` (DSM_LOG, loaded first), `assets/covers.js`, `assets/categories-it.js`, `LIESMICH.txt`
    (German guide), `.htaccess` (gzip, cache, security headers via IfModule, no listings, HSTS only via https, admin.html/save.php → https).
  - `assets/admin.enc.js` ENCRYPTED (tools/source/extract.js + built tools/source/admin/). `vendor/sql-asm.js` = sql.js 1.10.3 (asm.js).
    `fonts/` = Fira Sans 400/500/600 local. `backup/` only on the server.
- `src/` – page templates with loading skeleton (`#page`); `head.js` (classic, theme/language before first paint, old-key migration);
  `styles.css` (tokens, building blocks); `library/`, `admin/` (main, lock, shared = `window.DSM_SHARED`), `lib/` (utils `cn`, storage
  `log`, language `t()`, appearance, notice, swipe, environment `reduced`/`C()`), `components/` (glass-dialog, header, settings, `ui/`).
- `tools/` – `build.mjs`, `source/` (extract.js + admin UI, PLAINTEXT), `encrypt-admin.js`, `generate-books.js`, `pack.mjs`,
  `migrate-data.mjs` (old German files), `tunnel.mjs`, `branches.sh`, `build-guide.js` + `guide/template.html` (→ `anleitung/`),
  `local.mjs` + router (php-wasm only on 127.0.0.1, own `sys_temp_dir` or POSTs > 16 KB fail, data in `tests/.tmp/local/data/`).
  npx (php-wasm, browser-sync, shadcn) always with exact version + `--prefer-offline`; deliberately not in package.json.
- `tests/`, `docs/`: never uploaded. `data/` (`*.winbook`, reader names + classes): NEVER commit/upload. `docs/entwuerfe/` = UI variants
  as private artifact https://claude.ai/artifact/EuCPm1eKryK64A8YD5ywNP (picks: `ArtifactData get`, collection `picks`, doc `main`).
- Worktrees have no `node_modules`: `ln -s <main checkout>/node_modules node_modules` (ignored, never commit the link).

## Commands

```bash
npm run build          # src/ → website/ (after EVERY change to src/, commit the result)
npm run books          # data/*.winbook → website/books.js; exit 2 on a reader name in a public field → check, then -- --names-checked
npm run pack           # upload/website/ = committed website/ (git archive); aborts on a stale admin.enc.js. Upload THIS
npm run serve          # :8765; dev = live reload; tunnel(:dev|:php) = public https://….trycloudflare.com (only website/, no dot/php files)
npm run local          # like the webspace: PHP + real save.php, password "local" → http://127.0.0.1:8765/admin.html; ui:add -- <n> = shadcn
npm run encrypt        # after EVERY change to tools/source/* (asks for the password without echo – only Johann can run it)
```

The admin password is in no file: never guess or write it down. Whatever the admin app imports from `@/…` must be in `src/admin/shared.js`.

## Hard rules (client)

- **No student data, no loan status in public.** Extraction = whitelist: title, subtitle, author, publisher, year, ISBN, category,
  location. Reader/loan/fee/user/session tables only counted; loan columns of `books` never read. Name check reader file ↔ public
  fields (generate-books.js stops on a hit or without name columns). Maintenance (`inspect()`, tab Pflege) reads `INSPECT_COLUMNS` =
  public columns + `bsignatur`, `bzugang` (SQL spy test); nothing published; category/location names containing a reader name only as `#id`.
- Only media type Buch/Graphic Novel; copies merged (title + first author). **No ISBN completion.** Privacy policy and imprint come
  from the school's main website (it links here): no footer, no own privacy page.
- List = plain text (title + author); covers only in detail/recommendations. No "as of" date in public. `#meta` "4.545 Bücher"/"n Treffer".
- Recommendations: phone = vertical list (small cover left, text right), NO carousel; from 40rem four large covers. Card head opens
  "Bisherige Empfehlungen" (timeline newest first, "Aktuell", topic; books of the chosen round; click → detail on top).
- Search bar sticks opaquely; hits start right below it (`main.books` ≥ screen height, `lvh`). A–Z bar from 48rem FILTERS by initial
  (`#index button[data-l]`, `aria-pressed`/`.on`, same letter lifts it, absent letters disabled, combines with search/category, not
  saved); below 48rem a letter floater while scrolling.
- Category filter (`categories.jsx`): `#cat-btn` (phone icon only, from 40rem "Kategorie") → glass dialog, search `#cat-q`, counts,
  `[data-cat]` = `all` | `g:<parent>` | `c:<category>`. ≥2 categories sharing the part before " - "/": " = group (parent selects all,
  subcategories indented, bare parent term = "allgemein"). Choice: `.cat-pill.on` [filter | divider | × `#cat-clear`]; × slides out
  (grid 0fr→1fr); from 40rem hover/focus shows `.cat-label` (≤18 chars, else `oneWord`). Not saved. No category → only "Alle Bücher".
- Admin page: no "Aktuell veröffentlicht …", no draft notice (only `#i-state` for incomplete info), no counters, no privacy notices.
  Tabs Bestand | Pflege | Empfehlungen | Info (`data-tab` catalog/care/recs/info), ≤420 px two rows, no transition on `TabsTrigger`.
  `#lock-btn` padlock, text slides out on hover/focus, `aria-label` always. `App` only gets `lock`. `#rec-groups` = `ToggleGroup` `surface`.
  - Recs editor: group full (4) → search disabled; contained hits greyed out; `.warn-de`/`.warn-it` for empty texts. `#rec-archive`:
    open a round (`.arc-h` aria-expanded), edit, remove books, delete; archive[0] `[data-op=restore]` = undo an accidental new round;
    destructive actions = two clicks within 4 s.
  - Bestand: import → report (+ `#r-diff`), coverage, `#cat-it` Italian category names, `#nocover` hide a wrong cover, publish.
    Without import (`#current`) same cards for the published list; publish card once something changed. Draft `dsm-books-draft`.
  - Pflege (`maintenance.jsx`, after an import): `#m-sum`, `#m-checks` (`.check[data-check]`, WinBIAP `bid`, first 100, `[data-csv]`),
    `#m-all`, `#m-types`, `#m-shelf` (`#m-loc`, `#m-print`/`[data-print]`, `#m-shelf-csv`, `#m-shelf-all`). CSV: BOM, `;`, CRLF, `'`=+-@.
- Only HTML/CSS/JS, no deploy services/database/server code except `save.php`; double-click (file://) works: classic scripts, no modules.
  "Publish": (1) online save.php; (2) Chrome/Edge folder access (must contain index.html, handle in IndexedDB); (3) else download.
- save.php (PHP ≥ 7.1: no str_starts_with/array_is_list/match): GET → `{dsm:"save",v:3,ready,reason?}`; POST `?file=` + `X-DSM-Key`,
  body = header comment + `window.DSM_… = ` + JSON object with required field (books/groups/hours) + `;\n`; GET `?backups`; POST
  `?restore=<name>` (strict regex, checked like an upload). `dsm_write`: old → `backup/` (10 per file, `.htaccess` deny), flock, temp +
  rename. Warnings never in the answer (output buffer). Admin "Frühere Versionen" (`data-pub-backups`) only online, v ≥ 3. Key =
  PBKDF2(password, salt "dsm-library/save.php", 310,000), only in the encrypted plaintext (`var DSM_SAVE_KEY`, function scope).
- Admin lock only "student-proof": PBKDF2-SHA-256 (310,000) + AES-GCM 256. admin.enc.js and the repo are public, so the password's
  strength is the only barrier: long passphrase. Session key in sessionStorage expires 4 h after the page was last left (`dsm-admin-seen`).
- Opening hours (`info.jsx`) in Milan time (`Intl` Europe/Rome). Blur always on except "reduce transparency"/high contrast.
- **Covers only via existing ISBN, NO Google** (Johann, 2026-10-23: visitor IPs not to Google): (1) ekz `cover.ekz.de/<ISBN>.jpg`;
  substitute "leider kein aktuelles Bild" = 170×270, 9977 bytes → check via `fetch` (CORS) length + FNV-1a, uncheckable = substitute.
  (2) Open Library only for ekz misses, always `/api/books?jscmd=viewapi` → cover ID, NEVER `/b/isbn/` (rate limit, school = one IP).
  Not DNB (bot protection). `noCover` ISBNs skipped everywhere (`usable()`), also from cache; old `coverGB` cache hits dropped on load.
  Survey `miss` = books without cover. Background staggered for books in view; otherwise placeholder (without author).
- Zoom: tap a real, shown (`onShown`) cover → `#zoom` (2nd Radix dialog), FLIP (transform, `--snap`, 240/180 ms) into the center of the
  VISIBLE section (`visualViewport`), max 27rem; only then OL "L"; small images at most 2.5×. Placeholders can't be enlarged.
- Every dialog (detail, settings, questions, opening hours, archive, categories) = `Dialog` `.glass.sheet`, scrim `.scrim`; phone bottom
  sheet, centered from 40rem. Phone (<40rem, `lib/swipe.js`, `useSwipe(scrimSel, onClose)`, class `swipe`): parked half-high, flies in
  (spring `linear()`), finger leads 1:1, up = content height (max full screen), down = half, further/fast = close. Content ≤ 80 % =
  ONE stage (`data-fit`), rubber band up. Categories: constant height, full screen on search focus. Swiping questions away = "no".
  `data-gone` disables Radix' closing animation. New dialogs the same; `swipeStages` in every dialog spec.
- Announcement (`components/` + `library/announcement.jsx`): `aside#announce` above the header, 1–2 lines (max 140), logo color or
  neutral; floats in 300 ms after the list; × (44 px)/Esc collapses; closed = `dsm-announce` hash; `#preview` ignores it. Admin card
  `#i-ann` first in Info (`#i-ann-de/-it`, `#i-ann-color [data-color]`, `#i-ann-until`, `#i-ann-preview`, `#i-ann-clear`).
- Slow connection: `.skel` placeholders (list, recs if `data-recs`), after 6 s "Langsame Verbindung". library.js loads BEFORE books.js
  (setter on `window.DSM_LIBRARY`). Placeholders for covers, logo (`.ld-img` `.loaded`), info card (`dsm-info-card`), unlock spinner.
- First visit: overlay "Möchten Sie Buchempfehlungen sehen?" → Mittelstufe / Oberstufe / Erwachsenenliteratur → Romane / Sachbücher /
  Biografien & Geschichte (`dsm-recs`); no language question, no progress bar; focus on `.pane` (tabIndex -1). Settings: same choice.

## Design

- DSM corporate design: Fira Sans 400/500/600, text anthracite #333333. Three font sizes (`--fs-s` .875rem, `--fs-m` 1rem, `--fs-l`
  1.5rem). Logo colors only for lines/accents: mauve #BA8EA7, yellow #DDD300, orange #DB9F00, blue #B5C9D0, red #A93A39, green #B3CEA1.
  No all caps, italics, underlining. Little animation, `prefers-reduced-motion`.
- Colors only as tokens in `src/styles.css` (`:root`, `prefers-color-scheme` + `[data-theme]`, `[data-contrast="high"]`,
  `[data-font="large"]`). Tailwind theme reset: only `text-s/m/l`, `font-normal/medium/semibold`, shadcn color names, logo colors +
  `anthracite`. `--spacing: 4px`. No `dark:`, no `text-sm`/`text-xs`, no `underline` (rules.test checks); `cn()` knows the custom sizes.
- `.card` = 16 px radius, `surface`, inner line, `p-4`; blocks above the list `pb-4`; search 48 px, radius 12; logo 44/60 px, square.
- Header index.html: `h1` next to the logo behind a 1 px divider ("DSM | Bibliothek", `.hd`/`.hd-row`), container query
  `calc(260px + 4.7em)` (one row from 375 px), otherwise title below; admin.html title below. Test: header.spec.
- Accessible: targets ≥ 44 px (`size="icon"` 44, `icon-sm` 40), focus 2 px (`--focus`), skip link `a[href="#q"]`, `#list-t` invisible.
  Theme default = device; settings auto/light/dark, larger text, high contrast. Italian stays anthracite. No stripe under the title.

## Technology and performance

- `react` → `preact/compat` (Preact 10 fails with Radix; Preact/Radix update = full CI). One IIFE per page, fixed names (FTP, no hash).
  Mount into `#page` via `flushSync`; stores via `useSyncExternalStore`; texts per module via `addStrings({de, it})`.
- Admin: the lock decrypts `admin.enc.js`, `new Function(src)()` sets `window.DSM_ADMIN.App`; React and `@/…` from `window.DSM_SHARED`.
- Sonner CSS is unlayered: toast position/width in `styles.css` `.toaster[data-sonner-toaster]`; `notify(msg, onClick)` = `.toast-btn`.
- Test hooks (`#list .row`, `#d-cover`, `.ask`, `.settings`, `#rec-res` …) must survive refactorings. Closed Radix dialog = not in DOM.
- List (~17,000 elements): `#list > .rows > ul` chunks ≤ 40, each letter starts one (`ul[data-l] id="L-X"`), `content-visibility`
  only in `@supports (overflow-anchor: auto)`. Renders 2 chunks, then 20 per setTimeout, `Chunk` = `memo`. NO `startTransition`.
  One click listener. covers.js: tick timers only while work is pending. Nothing inherited animated on `<html>`/`<body>`.
- Color switch (`lib/appearance.js`): EVERY change adds `<style>` `still` (`transition: none !important` except `.seg3` marker);
  with View Transition API: marker 150 ms, then `startViewTransition` (`--t-color` 350 ms), `still` removed on `finished`. NO View
  Transition in WebKit (UA check) → instant. Never switch `meta[name=theme-color]` by script. Language: marker first, `setLang` after.
- Blur: scrim `blur(8px) saturate(1.15)`, glass `blur(18px) saturate(1.8)` – don't increase, don't remove, never measure.
- Durations: `--t-fast` 150, `--t-base` 200, `--t-slow` 250, out `--t-out` 160 ms; detail from 40rem 140/110, scrim 120/110.
  Reference (390 px, CPU 4×): DOMContentLoaded ≈ 0.5 s, largest block ≈ 0.9 s = parsing books.js.

## Data formats

- `books.js`: `{updated, count, coverage?, history?, catIt?, noCover?, books:[{t,s?,a?[],p?,y?,i?[],c?,l?[]}]}`; coverage/history =
  `{updated, books, isbn, cover?, ekz?, ol?, none?, checked?, complete?}` (old entries may carry `gb`); catIt = `{German: Italian}`;
  noCover = ISBNs with a wrong cover; both kept by `npm run books`.
- `recommendations.js`: `{updated, topic?:{de,it}, groups:{middle|upper|adult-fiction|adult-nonfiction|adult-bio:[{k,t,a,de,it}]},
  archive?:[{updated, topic?, groups}]}` (newest first, max 40). Other books = new round (old one to archive); only texts → same round.
  `k` = norm(title)|norm(first author) (lower case, no accents, ß→ss, a–z0–9 and spaces).
- `info.js`: `{updated, hours:{mon..sun:[["HH:MM","HH:MM"]]}, notice:{de,it,from?,to?}, contact?:{email?,phone?,de?,it?},
  closures:[{type:"holiday"|"absent"|"special",from,to,de,it,hours?}], announcement?:{de,it,color,until?}}` (YYYY-MM-DD; `special` with
  1–2 hours = open ONLY then, holiday/absence wins; empty text → "Ferien" / "Bibliothek geschlossen" / "Geänderte Öffnungszeiten").
- localStorage `dsm-lang|theme|font|contrast|recs|cover-v3|info-card|announce|log`; admin `dsm-recs-draft` (+ `archive`, `restored`),
  `dsm-info-draft`, `dsm-books-draft`, `dsm-preview(-recs|-info)`, IndexedDB `dsm-admin`/`kv`/`website`; session `dsm-log-history`.
- logger.js: own entries `log(area, text, data?)`; `/key|pass|pw|token/` never in plaintext; console `DSM_LOG.history()`/`.asText()`/`.off()`.

## Checking (CI only)

After every change: `npm run build`, commit, push, CI green (`.github/workflows/test.yml`: every push except docs/anleitung/`*.md`/
LIESMICH only; Mondays 06:00 UTC full on `origin/main`). `TZ=Europe/Rome`, 2 workers, 1 retry, flaky tests reported, traces as artifact,
`npm audit --audit-level=high`, actions pinned to SHAs. Stress: `gh workflow run stress.yml -f repeat=5 -f workers=4 [-f grep=…]`.
- **CI suites** (each agent decides per push): trailer line in the pushed HEAD commit (own line before `Co-Authored-By:`; merge commit
  `-m "CI-Suite: …"`; by hand `gh workflow run test.yml --ref <branch> -f suite="smoke detail"`). Unknown area/misplaced trailer = fail.
  - **full** (no trailer): unit (runner PHP + PHP 7.1) + every spec in Chromium (2 shards) and Firefox (2), WebKit + iPhone
    `engines.spec`, Apache (`php:7.1-apache`). ≈4–5 min, 7 jobs.
  - **`CI-Suite: smoke [area,…]`**: unit + `@smoke` core tests of every area + every test of the named areas, one Chromium job,
    ≈1.5 min. Areas in `tests/suites.js` (`node tests/suites.js ["smoke x,y"]` prints the plan, runs no test, allowed locally): `list`,
    `loading`, `announcement`, `categories`, `detail`, `recommendations`, `info`, `settings`, `admin`, `admin-care`, `admin-recs`,
    `admin-info`; only when named: `engines`, `a11y`, `performance`. Core test = `{ tag: "@smoke" }`, main path, few per area; a new
    spec needs an area, every area ≥ 1 `@smoke` (suites.test).
  - full for shared ground: `src/styles.css`, `head.js`, `lib/*`, `components/{glass-dialog,header,ui/*}`, `library/{main,app,data}`,
    `src/admin/*`, `tools/build.mjs`, dependencies (Preact/Radix!), Playwright config/helpers/setup, `tests/suites.js`, workflows,
    `save.php`, `.htaccess`, `covers.js`, `logger.js`, `extract.js`, `generate-books.js`, data formats; engine-specific behavior (blur,
    `lvh`, container queries, touch, animation, View Transition, Safari/Firefox); > 3 areas; a conflicting merge of `main`; unsure.
    Smoke + areas for changes inside sections (component, its CSS/texts/spec, data it shows: books.js → `list`, recommendations.js →
    `recommendations`, categories-it.js → `categories`); bare smoke only for tools, unit tests, `tests/apache/`.
  - Before integrating: one green run covering ALL changes since `main` (full, or smoke naming every touched area). In doubt: full.
- Unit (`tests/unit/`): whitelist via SQL spy, covers, encryption, save.php, build byte-exact against website/, data formats, migration,
  hard rules (`rules.test.js`, external hosts only ekz + Open Library), tunnel, pack. `build.test` gzip budget per file, `data.test`
  books.js budget (1000 KB / 250 KB gzip) – raise deliberately only. `DSM_ADMIN_PW` secret / `real-db` / `test:live` don't run.
- E2E: admin tests encrypt sources with "test-password"; import byte-identical to `npm run books`; cover APIs mocked. WebKit only
  `engines.spec.js` (also file://), publishes via download (`save()`/`FOLDER` in `admin-helpers.js`). Phone: `test.use({ ...PHONE })`.
  performance + a11y (axe) only Chromium. Wait with `settled(page)`, not `waitForTimeout`. publish.spec = real save.php via `php -S`.

## Integrating branches (mandatory at the end of every task)

Every task in its own worktree (`.claude/worktrees/<name>`, branch `worktree-<name>`), merged `--no-ff` into local `main` (always uploadable).
1. Commit in the worktree, `git merge main`, resolve conflicts there (built files: `npm run build`; `admin.enc.js`: encrypt again;
   `books.js`: `npm run books`; others by content).
2. `tools/source/*` changed → `npm run encrypt` (Johann). Push the branch, CI green (see CI suites).
3. ExitWorktree (`keep`), in the main checkout `npm run integrate -- worktree-<name>` (aborts on unclean main/conflict/syntax error;
   adopts changed data files in main via a `data-<time>` branch – never discard data files in `main`).
4. `git worktree remove <path>`, `git branch -d` (never `-D`). Report merge commit and warnings.
- `npm run branches` / SessionStart hook list local branches only; also check `git branch -r --no-merged main` (remote `claude/*`).
  Never touch foreign worktrees with uncommitted changes. `main` only via merge commits: no rebase, `--force`, `reset --hard`.

## Open

- **NO WEBSPACE YET.** Nothing uploaded, no live data. Don't plan migrations or tell Johann to change anything on a server. Once
  one exists (likely Aruba, see docs/): upload `upload/website/` from `npm run pack` once; from then on the server copies of the data
  files and `backup/` are the original – a later code upload must not overwrite them. Unknown: PHP version, write permissions, WAF.
- GitHub repo `germanprettyboy/bibliothek-dsm` is PUBLIC on purpose (Johann, 2026-10-23: free Actions minutes; private would use up
  the free quota in days). So never commit secrets, the password, student data or `data/`. Plaintext admin source is public.
- Covers: run "Cover-Abdeckung prüfen" completely; terms of use of cover.ekz.de. Proofread the 20 recommendation texts and Italian UI.
- Untested on real devices: iPhone Safari; school PC Windows 7 (Chrome 109 / Firefox ESR 115; `@supports` fallbacks, es2020).
  `docs/dsmailand-techstack.md` (school website): adopt nothing (no GTM, no Google Fonts); Aruba `.htaccess` → `IfModule`.
