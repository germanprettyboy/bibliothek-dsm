# Library DSM – book list of the Deutsche Schule Mailand

Static website: public book list of the school library + password-protected admin page. Bilingual DE/IT, mobile first.
React API on Preact 11 (`preact/compat`, alias `preactAlias` in `tools/build.mjs`) + Tailwind CSS v4 + shadcn/ui; Vite builds fixed
files into `website/` (plain HTML/CSS/JS). Only server file: `save.php`. Client: Johann Bucher (volunteer at the DSM).
Replies in German, no filler, no emojis. Code, comments, identifiers, data formats, docs: English; UI texts German/Italian.

**NEVER RUN TESTS LOCALLY (Johann, absolute).** No `npm test`, `test:e2e`, `test:all`, `test:live`, `npx playwright …`, `node --test …`
on Johann's Mac – not a single spec. Tests run ONLY on GitHub Actions: commit, `git push` the branch, `gh run watch <id> --exit-status`
/ `gh run view <id> --log-failed`. `npm run build`, `books`, `encrypt`, `pack` stay local (they produce files, no tests).

Where the details live (read before changing that part): a component's behavior and selectors = its e2e spec (`tests/suites.js`
maps area → spec) and the comment at the top of its file; tools = `tools/README.txt`; CI = header of `.github/workflows/test.yml`
and `tests/suites.js`; integration = `tools/branches.sh`. This file keeps the decisions, traps and rules.

## Folders

- `website/` – ONLY this goes onto the webspace (via `npm run pack`). Built files are committed.
  - BUILT from `src/`: `index.html`, `admin.html`, `assets/{library,admin}.js`, `assets/style.css`, `assets/head.js`.
  - Generated, never by hand: `books.js`, `recommendations.js`, `info.js` (`window.DSM_LIBRARY/DSM_RECOMMENDATIONS/DSM_INFO`),
    `save-access.php` (by encrypt-admin.js). `info.js` is NOT committed (`.gitignore`); missing = no info card.
  - By hand: `save.php`, `assets/{logger,covers,categories-it}.js`, `LIESMICH.txt` (German guide), `.htaccess` (only `IfModule`).
  - `assets/admin.enc.js` ENCRYPTED (`tools/source/`). `vendor/sql-asm.js` = sql.js 1.10.3. `fonts/` = Fira Sans local.
- `src/` – page templates with loading skeleton (`#page`), `head.js` (classic, before first paint), `styles.css` (tokens),
  `library/`, `admin/` (`shared.js` = `window.DSM_SHARED`), `lib/`, `components/` (`ui/` = shadcn).
- `tools/` – see `tools/README.txt`; `source/` = admin app PLAINTEXT. npx (php-wasm, browser-sync, shadcn) always with exact
  version + `--prefer-offline`; deliberately not in package.json.
- `tests/`, `docs/`: never uploaded. `data/` (`*.winbook`, reader names + classes): NEVER commit/upload. `docs/entwuerfe/` = UI variants
  as private artifact https://claude.ai/artifact/EuCPm1eKryK64A8YD5ywNP (picks: `ArtifactData get`, collection `picks`, doc `main`).

## Commands

```bash
npm run build          # src/ → website/ (after EVERY change to src/, commit the result)
npm run books          # data/*.winbook → website/books.js; exit 2 on a reader name in a public field → check, then -- --names-checked
npm run pack           # upload/website/ = committed website/ (git archive); aborts on a stale admin.enc.js. Upload THIS
npm run serve          # :8765; dev = live reload; tunnel(:dev|:php) = public https://….trycloudflare.com (only website/, no dot/php files)
npm run local          # like the webspace: PHP + real save.php, password "local" → http://127.0.0.1:8765/admin.html; ui:add -- <n> = shadcn
npm run encrypt        # after EVERY change to tools/source/* (asks for the password without echo – only Johann can run it)
npm run integrate -- <branch>   # end of every task, see "Integrating branches"; branches (-- sync | cleanup) = overview
```

The admin password is in no file: never guess or write it down. Whatever the admin app imports from `@/…` must be in `src/admin/shared.js`.

## Hard rules (client)

- **No student data, no loan status in public.** Extraction = whitelist: title, subtitle, author, publisher, year, ISBN, category,
  location. Reader/loan/fee/user/session tables only counted; loan columns of `books` never read. Name check reader file ↔ public
  fields (generate-books.js stops on a hit or without name columns). Maintenance (`inspect()`, tab Pflege) reads `INSPECT_COLUMNS` =
  public columns + `bsignatur`, `bzugang` (SQL spy test); nothing published; category/location names containing a reader name only as `#id`.
  Its records `{id,t,a,p,y,c,l,sig,z,i}` carry the valid ISBNs (`i`, ISBN-13) for the inventory.
- Only media type Buch/Graphic Novel; copies merged (title + first author). **No ISBN completion.** Privacy policy and imprint come
  from the school's main website (it links here): no footer, no own privacy page.
- List = plain text (title + author); covers only in detail/recommendations. No "as of" date in public. `#meta` "4.545 Bücher"/"n Treffer".
- Recommendations: phone = vertical list (small cover left), NO carousel; from 40rem four large covers. Card head opens "Bisherige
  Empfehlungen" (timeline newest first). Chosen group without books in the catalog = empty state in the card (`#recs-none`:
  shelf, "Gerade keine Empfehlungen", button to the settings); no recommendation at all = no first-visit questions. Admin switch
  `#rec-on` "Empfehlungen auf der Website" (`off: true`): no card, archive, settings section or questions; data stays.
- Search bar sticks opaquely, hits start right below it. A–Z bar from 48rem FILTERS by initial (doesn't jump); below 48rem a letter
  floater. Category filter = glass dialog with search and groups (`categories.jsx`). Neither filter is saved.
- Admin page: no "Aktuell veröffentlicht …", no draft notice, no privacy notices (import: no "Nicht übernommen" card, success =
  "Upload erfolgreich"; only the reader-name warning stays). Floating sticky nav bar (`nav.jsx`): tabs Bestand | Pflege | Cover |
  Empfehlungen | Info | Statistik (column 54rem, `body.adm`), then search (`#cmd-btn`), help (`?`, `help.jsx`) and lock. Charts only in tab Statistik. Destructive actions = two
  clicks within 4 s. `App` only gets `lock`. Automatic corrections (`fixes.jsx`) only change the public list, never the WinBook
  file. Every publish keeps a local version (IndexedDB `dsm-admin`, `versions.js`). Print without `:has()` (Firefox ESR 115).
- Command palette `#cmd` (`palette.jsx`; Ctrl/⌘+K anywhere, "/" outside a field): one search over tabs, actions, help articles and
  books (an ISBN with hyphens or scanned finds its book). Empty = "Anstehend" (`todos.js`: only what needs doing – never a draft or
  "currently published" line), recent books (`dsm-cmd-recent`), tabs, actions. Book card (`book-card.jsx`): cover hide/show, Italian
  category, recommend into a group (`recommend()`, saved at once), after an import copies + maintenance entries (`buildData`).
- Inventory (`inventory.jsx`, tab Pflege, needs an import): a USB scanner types code + Enter into `#inv-code`; keys typed elsewhere in
  the sheet go there too (a scanner's Enter must never press a focused button); camera only with `BarcodeDetector`. Match ISBN →
  WinBook number → shelf mark. State `dsm-inventory` (ids + times only), nothing published; missing ≠ lost (loan status never read).
- Maintenance progress (`care-history.js`, `dsm-care-history`, counts per list and import day): Pflege shows each list's change since
  an earlier day, Statistik its course – the only history chart (no list history or accessions charts, Johann 2026-10-24).
- Only HTML/CSS/JS, no deploy services/database/server code except `save.php`; double-click (file://) works: classic scripts, no modules.
  "Publish": (1) online save.php; (2) Chrome/Edge folder access (must contain index.html, handle in IndexedDB); (3) else download.
- save.php: PHP ≥ 7.1 (no str_starts_with/array_is_list/match); protocol and backups in its header comment. Warnings never in the
  answer. Key = PBKDF2(password, salt "dsm-library/save.php", 310,000), only in the encrypted plaintext (`var DSM_SAVE_KEY`).
- Admin lock only "student-proof": PBKDF2-SHA-256 (310,000) + AES-GCM 256. admin.enc.js and the repo are public, so the password's
  strength is the only barrier: long passphrase. Session key in sessionStorage expires 4 h after the page was last left.
- No marking/copying of text on both pages (Johann, 2026-10-27): `user-select: none` on body (fields stay selectable,
  `styles.css`), `head.js` refuses `copy`/`cut` outside fields.
- Opening hours in Milan time (`Intl` Europe/Rome). Blur always on except "reduce transparency"/high contrast.
- **Covers only via existing ISBN, NO Google** (Johann, 2026-10-23: visitor IPs not to Google): (1) ekz `cover.ekz.de/<ISBN>.jpg`
  (its "kein Bild" substitute detected by size + hash); (2) Open Library only for ekz misses, always `/api/books?jscmd=viewapi`,
  NEVER `/b/isbn/` (rate limit, school = one IP). Not DNB (bot protection). `noCover` ISBNs skipped everywhere, also from cache.
- Zoom only for real, shown covers (placeholders never): FLIP into the center of the VISIBLE section, small images at most 2.5×.
- Every dialog = `Dialog` `.glass.sheet` + `.scrim`; phone bottom sheet with swipe stages (`lib/swipe.js`), centered from 40rem.
  New dialogs the same, `swipeStages` in every dialog spec. Swiping the questions away = "no". A swipe up past
  the top stage never stops: taller content scrolls on in the same gesture / takes the momentum (not when dragging the head).
- Announcement: `aside#announce` above the header, 1–2 lines (max 140), × / Esc closes (remembered by hash); edited in admin Info.
- Slow connection: placeholders, after 6 s "Langsame Verbindung". library.js loads BEFORE books.js (setter on `window.DSM_LIBRARY`).
- First visit: overlay "Möchten Sie Buchempfehlungen sehen?" → Mittelstufe / Oberstufe / Erwachsenenliteratur → Romane / Sachbücher /
  Biografien & Geschichte (`dsm-recs`); no language question, no progress bar. Settings: same choice.
- Interactive background (`library/backdrop.jsx` engine + settings "Hintergrund", `library/scenes.js` canvas 2D drawing;
  `dsm-bg` = `{on}`): opt-in, OFF by default, only on the book list. ONE scene since 2026-10-27 (Johann: Linien and all
  tweaks removed, keep the preview): Punkte (halftone dot grid, the pointer a lens showing the logo colors) on the GPU
  (`library/dots-gl.js`, WebGL, full device resolution; canvas 2D only without WebGL). Settings = switch + live preview,
  nothing to tweak. Ring wave only for a click on free space, never on a book/button/field/link, never for a click that
  began under a dialog (closing a book beside it). Fixed `#bg` behind the page, under the column
  only `--fx-col`; none with high contrast/print; one still frame with reduced motion; while interacting 60 fps (WebGL) /
  30 (2D), else 20, 10 after 30 s idle, none under a dialog or in a hidden tab; input listeners only while on. Search bar
  transparent until `.stuck`. Test hook `window.DSM_BG` {frames, gl, waves}.

## Design

- DSM corporate design: Fira Sans 400/500/600, text anthracite #333333. Three font sizes (`--fs-s` .875rem, `--fs-m` 1rem, `--fs-l`
  1.5rem). Logo colors only for lines/accents: mauve #BA8EA7, yellow #DDD300, orange #DB9F00, blue #B5C9D0, red #A93A39, green #B3CEA1.
  No all caps, italics, underlining. Little animation, `prefers-reduced-motion`.
- Colors only as tokens in `src/styles.css` (`:root`, `prefers-color-scheme` + `[data-theme]`, `[data-contrast="high"]`,
  `[data-font="large"]`). Tailwind theme reset: only `text-s/m/l`, `font-normal/medium/semibold`, shadcn color names, logo colors +
  `anthracite`. `--spacing: 4px`. No `dark:`, no `text-sm`/`text-xs`, no `underline` (rules.test checks); `cn()` knows the custom sizes.
- `.card` = 16 px radius, `surface`, inner line, `p-4`; search 48 px, radius 12; logo 44/60 px, square. Header: "DSM | Bibliothek"
  next to the logo when it fits (container query, header.spec), otherwise title below. No stripe under the title.
- Accessible: targets ≥ 44 px, focus 2 px (`--focus`), skip link to the search. Theme default = device; settings auto/light/dark,
  larger text, high contrast. Italian stays anthracite.

## Technology and performance

- `react` → `preact/compat` (Preact 10 fails with Radix; Preact/Radix update = full CI). One IIFE per page, fixed names (FTP, no hash).
  Mount into `#page` via `flushSync`; stores via `useSyncExternalStore`; texts per module via `addStrings({de, it})`.
- Admin: the lock decrypts `admin.enc.js`, `new Function(src)()` sets `window.DSM_ADMIN.App`; React and `@/…` from `window.DSM_SHARED`.
- Sonner CSS is unlayered: toast position/width in `styles.css` `.toaster[data-sonner-toaster]`.
- Test hooks (ids, classes, data attributes the specs use) must survive refactorings. Closed Radix dialog = not in DOM.
- List (~17,000 elements): chunks ≤ 40 (`list.jsx`), `content-visibility` only in `@supports (overflow-anchor: auto)`, `Chunk` =
  `memo`, NO `startTransition`, one click listener. covers.js: tick timers only while work is pending. Nothing inherited animated on
  `<html>`/`<body>`.
- Color switch (`lib/appearance.js`): every change freezes transitions; View Transition only outside WebKit (UA check). Never switch
  `meta[name=theme-color]` by script.
- Blur: scrim `blur(8px) saturate(1.15)`, glass `blur(18px) saturate(1.8)` – don't increase, don't remove, never measure.
- Durations only via tokens `--t-fast/base/slow/out` (`styles.css`). Reference (390 px, CPU 4×): DOMContentLoaded ≈ 0.5 s, largest
  block ≈ 0.9 s = parsing books.js.

## Data formats

- `books.js`: `{updated, count, coverage?, history?, catIt?, noCover?, books:[{t,s?,a?[],p?,y?,i?[],c?,l?[]}]}`; coverage/history =
  `{updated, books, isbn, cover?, ekz?, ol?, none?, checked?, complete?}` (old entries may carry `gb`); catIt = `{German: Italian}`;
  noCover = ISBNs with a wrong cover; both kept by `npm run books`.
- `recommendations.js`: `{updated, off?:true, topic?:{de,it}, groups:{middle|upper|adult-fiction|adult-nonfiction|adult-bio:[{k,t,a,de,it}]},
  archive?:[{updated, topic?, groups}]}` (newest first, max 40). Other books = new round (old one to archive); only texts → same round.
  `k` = norm(title)|norm(first author) (lower case, no accents, ß→ss, a–z0–9 and spaces).
- `info.js`: `{updated, hours:{mon..sun:[["HH:MM","HH:MM"]]}, notice:{de,it,from?,to?}, contact?:{email?,phone?,de?,it?},
  closures:[{type:"holiday"|"absent"|"special",from,to,de,it,hours?}], announcement?:{de,it,color,until?}}` (YYYY-MM-DD; `special` with
  1–2 hours = open ONLY then, holiday/absence wins).
- Storage keys all start with `dsm-` (`lib/storage.js`, admin drafts `dsm-*-draft`). logger.js: `/key|pass|pw|token/` never in plaintext.

## Checking (CI only)

After every change: `npm run build`, commit, push, CI green. Triggers, retries, caches, audit: header of `.github/workflows/test.yml`
(third-party and official actions pinned to commit SHAs). Stress: `gh workflow run stress.yml -f repeat=5 -f workers=4 [-f grep=…]`.
- **CI suites**, chosen per push by each agent: no trailer = **full** (≈4–5 min, 7 jobs); trailer line `CI-Suite: smoke [area,…]` in
  the pushed HEAD commit (own line before `Co-Authored-By:`; merge commit `-m`) = unit + Chromium core tests (≈1.5 min). Syntax,
  areas, by-hand runs: `tests/suites.js` (`node tests/suites.js "smoke x,y"` prints the plan, allowed locally).
  - full for shared ground: `src/styles.css`, `head.js`, `lib/*`, `components/{glass-dialog,header,ui/*}`, `library/{main,app,data}`,
    `src/admin/*`, `tools/build.mjs`, dependencies, Playwright config/helpers, `tests/suites.js`, workflows, `save.php`, `.htaccess`,
    `covers.js`, `logger.js`, `extract.js`, `generate-books.js`, data formats; engine-specific behavior (blur, `lvh`, container
    queries, touch, animation, View Transition); > 3 areas; a conflicting merge of `main` (conflicts only in build output don't count); unsure.
  - smoke + areas for changes inside a section (component, its CSS/texts/spec, the data it shows); bare smoke only for tools, unit
    tests, `tests/apache/`. A new spec needs an area and ≥ 1 `@smoke` test.
  - Before integrating: one green run covering ALL changes since `main`. In doubt: full.
- Budgets (`build.test` gzip per file, `data.test` books.js 1000 KB / 250 KB gzip): raise deliberately only.
- E2E: wait with `settled(page)`, not `waitForTimeout`; phone `test.use({ ...PHONE })`; WebKit only `engines.spec.js`; cover APIs mocked.

## Integrating branches (mandatory at the end of every task)

Every task in its own worktree (`EnterWorktree` → `.claude/worktrees/<name>`, branch `worktree-<name>`). `.claude/settings.json`
links `node_modules` from the main checkout and branches from local `main`. Never `npm install`/`ci` through the link (changes main's
packages); dependency change: `rm node_modules && npm ci --prefer-offline`. Old worktree without link: `ln -s <main>/node_modules`.
`tools/main-guard.cjs` refuses Edit/Write in the main checkout (replaces Claude Code's background guard, `bgIsolation: none`, which
also refused plain shell commands); the shell is not guarded: no `npm run build`, commits or `git -C` into the main checkout or
another session's worktree.
1. Commit in the worktree, `git merge main`, resolve conflicts there (built files: `npm run build`; `admin.enc.js`: encrypt again;
   `books.js`: `npm run books`; others by content).
2. `tools/source/*` changed → encrypt again (Claude, password from Johann in chat). Push the branch, CI green.
3. ExitWorktree (`keep`), in the main checkout `npm run integrate -- worktree-<name>`. It takes over admin data in main, merges
   `origin/main`, merges the branch (`--no-ff`, syntax check), pushes `main` and removes worktree + branch (local and on origin).
   Report merge commit and warnings.
- Build output (`website/{index,admin}.html`, `assets/{head,library,admin}.js`, `assets/style.css`) never blocks: changed in the
  main checkout (a running `dev`/`local`/`tunnel:php` watch build, may contain classes of the worktrees) `integrate`, `sync` and
  the hook reset it to main; a conflict ONLY in build output `integrate` resolves itself in the branch worktree (merge `main`,
  build, commit, push) – that counts as a clean merge, no extra CI run. Never resolve it by hand, never stop for it.
- `main` = `origin/main` always: cloud sessions merge `claude/*` branches into `origin/main`; `integrate` and the SessionStart hook
  (`tools/branches.sh --hook`) take those over and push. The hook also removes finished worktrees no process uses any more.
- Never touch foreign worktrees with uncommitted changes. `main` only via merge commits: no rebase, `--force`, `reset --hard`.

## Open

- **NO WEBSPACE YET.** Nothing uploaded, no live data. Don't plan migrations or tell Johann to change anything on a server. Once
  one exists (likely Aruba): upload `upload/website/` from `npm run pack` once; from then on the server copies of the data
  files and `backup/` are the original – a later code upload must not overwrite them. Unknown: PHP version, write permissions, WAF.
- GitHub repo `germanprettyboy/bibliothek-dsm` is PUBLIC on purpose (free Actions minutes). So never commit secrets, the password,
  student data or `data/`. Plaintext admin source is public.
- Covers: run "Cover-Abdeckung prüfen" completely; terms of use of cover.ekz.de. Proofread the 20 recommendation texts and Italian UI.
- Untested on real devices: iPhone Safari; school PC Windows 7 (Chrome 109 / Firefox ESR 115; `@supports` fallbacks, es2020).
  School website: adopt nothing (no GTM, no Google Fonts). No analyses of school systems here (public).
