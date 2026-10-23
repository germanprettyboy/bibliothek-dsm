# Library DSM – book list of the Deutsche Schule Mailand

Static website: public book list of the school library + password-protected admin page. Bilingual DE/IT, mobile first.
React API on Preact 11 (`preact/compat`, alias `preactAlias` in `tools/build.mjs`) + Tailwind CSS v4 + shadcn/ui, Vite builds
fixed files into `website/` (plain HTML/CSS/JS). Only server file: `save.php`.
Client/user: Johann Bucher (volunteer at the DSM). Replies in German, no filler phrases, no emojis.
Code, comments, identifiers, data formats and docs are English (since 2026-10-17); UI texts stay German/Italian.

**NEVER RUN TESTS LOCALLY (Johann, 2026-10-18, absolute).** No `npm test`, `npm run test:e2e`, `test:all`, `test:live`,
`npx playwright …`, `node --test …` on Johann's Mac – not even a single spec, not "just quickly", not to compare. It overloads the
Mac. Tests run ONLY on GitHub Actions: commit, `git push` the branch, then `gh run watch <id> --exit-status` /
`gh run view <id> --log-failed`. `npm run build`, `npm run books`, `encrypt` stay local (they produce committed files, they are no tests).

## Folders

- `website/` – ONLY this folder will go onto the webspace (https, FTP; no webspace exists yet). Built files are committed.
  - BUILT from `src/`: `index.html`, `admin.html`, `assets/{library,admin}.js`, `assets/style.css`, `assets/head.js`.
  - Generated, never by hand: `books.js`, `recommendations.js`, `info.js` (`window.DSM_LIBRARY/DSM_RECOMMENDATIONS/DSM_INFO`),
    `save-access.php` (SHA-256 of the save key, written by encrypt-admin.js).
  - `info.js` NOT committed (`.gitignore`, since 2026-10-17, client): once a webspace exists, the original lives only there. If it is missing,
    the page loads without an info card and the admin page starts empty; tests supply their own info.js or skip the check.
  - By hand: `save.php`, `assets/logger.js` (DSM_LOG, loaded before everything else), `assets/covers.js` (covers, cache,
    coverage survey), `assets/categories-it.js`, `LIESMICH.txt` (German guide), `.htaccess` (gzip + cache + security headers via IfModule, no full CSP, no listings, HSTS only via https,
    admin.html/save.php → https; delete on Error 500).
  - `assets/admin.enc.js` ENCRYPTED (source/extract.js + built source/admin/). `vendor/sql-asm.js` = sql.js 1.10.3
    (asm.js, no WASM). `fonts/` = Fira Sans 400/500/600 local (GDPR). `backup/` only on the server (save.php).
- `src/` – source. `index.html`/`admin.html` = templates with a static loading skeleton (`#page`), only copied. `head.js` = classic
  script in `<head>` (theme/language before the first paint, placeholder flags, one-time migration of the old German
  localStorage keys). `styles.css` = tokens/theme/building blocks. `library/`: main, app, data, list, detail (+zoom), cover,
  recommendations (+archive, questions), categories, info, choice. `admin/`: main, lock, shared (`window.DSM_SHARED`); admin.html also loads categories-it.js (`#cat-it`).
  `lib/`: utils (`cn`), storage (localStorage, `log`), language (`t()`), appearance, notice (toast), swipe,
  environment (`reduced` = reduced motion, `C()` = covers.js). `components/`: glass-dialog, header, settings, `ui/` (shadcn).
- `tools/` – `build.mjs` (Vite, one IIFE per page, fixed names), `source/` (extract.js + admin UI, PLAINTEXT),
  `encrypt-admin.js`, `generate-books.js` (same logic as admin.html), `migrate-data.mjs` (old German data files → English,
  one-time), `tunnel.mjs`, `branches.sh`, `build-guide.js` + `guide/template.html` (German staff guide),
  `local.mjs`/`local-router.php`/`local-address.cjs` (php-wasm only on 127.0.0.1 – otherwise it ignores "-S" and listens on the whole network;
  it runs on a free internal port, browser-sync on PORT proxies it with live reload + `no-store`, watches website/ + local admin.enc.js, not the data files;
  `-d sys_temp_dir=tests/.tmp/local/tmp`: php-wasm's own TMPDIR under /var/folders isn't writable in WASM, POST bodies > 16 KB
  were discarded → "HTTP 200: Unable to create temporary file" on publishing recommendations/books, 2026-10-23).
  local: data files from/to `tests/.tmp/local/data/` (`DSM_DATA_FOLDER`, freshly copied from website/ on every start) – testing
  never changes the committed books.js/recommendations.js/info.js (before, a changed info.js constantly blocked integration).
  npx (php-wasm, browser-sync, shadcn) always with an exact version + `--prefer-offline` (one cache per package spec in
  ~/.npm/_npx, otherwise a registry request per start or a reinstall, php-wasm ≈470 MB). Deliberately not in package.json.
- `tests/`, `docs/`: don't upload. `data/` (`*.winbook` with student data): NEVER commit/upload. `anleitung/` = generated German guide.
  `docs/entwuerfe/` = five UI variants (2026-10-18) as a private claude.ai artifact https://claude.ai/artifact/EuCPm1eKryK64A8YD5ywNP;
  Johann's picks per section live in its db (`ArtifactData get`, collection `picks`, doc `main`). Mockup only, no part of website/.

## Commands

```bash
npm run build          # src/ → website/ (after EVERY change to src/, commit the result)
npm run books          # data/*.winbook → website/books.js; STOP (exit 2, titles listed) on a reader name in a public field → check, then -- --names-checked
npm run pack           # upload/website/ = committed website/ only (git archive); aborts on a stale admin.enc.js. Upload THIS, not website/
npm run serve          # :8765;  dev = watch + live reload (browser-sync);  tunnel(:dev) = https://….trycloudflare.com for phone/school PC
npm run local          # like the webspace: PHP + real save.php, watch, password "local" → http://127.0.0.1:8765/admin.html
npm run tunnel:php     # local + public https address, writes to tests/.tmp/local/data/, random password; both live reload
npm run ui:add -- <n>  # new shadcn component (adapt it to DSM afterwards!)
node tools/encrypt-admin.js   # after EVERY change to tools/source/* (asks for the password without echo); = npm run encrypt
git push && gh run watch <id> --exit-status   # the ONLY way to test (GitHub Actions); npm test / test:e2e / test:all only run there
```

The admin password is deliberately in no file: ask Johann, don't guess, don't write it down. Whatever the admin app imports
from the page (`@/…`) must be in `src/admin/shared.js` (a test checks this).

## Hard rules (from the client)

- **No student data, no loan status in public.** Extraction = whitelist: title, subtitle, author, publisher, year, ISBN,
  category, location. Reader/loan/fee/user/session tables only counted; loan columns of the `books` table
  (verliehenan, verliehenanklasse, bverliehen, …) never read. Additionally a name check reader file ↔ public fields
  (generate-books.js stops on a hit or without name columns, 2026-10-22).
  Maintenance analysis (`inspect()` in extract.js, admin tab "Pflege", 2026-10-22, client: "the website as a tool to keep the
  real stock and WinBIAP up to date") reads its own whitelist `INSPECT_COLUMNS` = public columns + `bsignatur`, `bzugang`
  (no loan/price/note columns, SQL spy test); nothing of it is published; category/location names with a reader name only as `#id`.
- Only books (media type Buch/Graphic Novel), multiple copies merged (title + first author).
- **No ISBN completion.** Covers only via an existing ISBN, otherwise a designed placeholder (without author).
- List = plain text (title + author); covers only in the detail and recommendations. No "as of" date in public (admin only), no footer.
  `#meta` above the list: "4.545 Bücher" (allowed since 2026-10-17), while searching "n Treffer".
- Recommendations: phone = vertical list (small cover left, title/author right, dividers), NO carousel; from 40rem four
  large covers. The card's head opens "Bisherige Empfehlungen": timeline newest round first (date, "Aktuell", topic),
  below it the books of the chosen group with text; click → detail on top.
- The search bar sticks opaquely at the top; while searching, hits start right below it (`main.books` at least screen-high).
  A–Z bar only from 48rem, below that a letter floater on the right (only while scrolling). The A–Z bar FILTERS by initial
  letter (2026-10-18, client; no jump): `#index button[data-l]`, `aria-pressed`/`.on`, the same letter again lifts it; works
  together with search and category ("n Treffer"), letters absent under them disabled, not saved.
- Category filter (`src/library/categories.jsx`): `#cat-btn` next to the search (phone icon only, from 40rem "Kategorie") →
  glass dialog with search field `#cat-q`, all categories with counts (`[data-cat]` = `all` | `g:<parent>` | `c:<category>`).
  ≥2 categories sharing the part before " - "/": " = group (the parent selects all, subcategories indented, a category that is
  only the parent term = "allgemein"). One choice: `.cat-pill.on` = dark pill [filter | divider | × `#cat-clear`], same size each; the × slides out
  (grid 0fr→1fr, after the dialog's fade-out), the search gives way; from 40rem hover/focus on the filter reveals the category
  (`.cat-label`, ≤18 characters, otherwise one word via `oneWord`), full name only in `aria-label`. Works together
  with the search ("n Treffer"), not saved. Books without a category (≈1,500) only under "Alle Bücher".
- Admin page: no line "Aktuell veröffentlicht …", no "Entwurf im Browser gespeichert" (only `#i-state` for incomplete info
  data), no counters "(4)", no privacy notices. `#rec-groups` = `ToggleGroup` variant `surface` (wraps);
  four tabs Bestand | Pflege | Empfehlungen | Info (`data-tab` catalog/care/recs/info), ≤420 px full width in two rows, switching without a transition (no `transition-*` on `TabsTrigger`). `#lock-btn` = padlock, the text
  slides out on hover/focus (grid 0fr→1fr, without under `motion-reduce`), `aria-label` always. `App` only gets `lock`.
  Editor: group full (4) → search disabled, note centered; already contained hits greyed out; red notes `.warn-de`/`.warn-it`
  for empty texts. `#rec-archive` "Bisherige Runden": open a round (`.arc-h` aria-expanded), edit topic/texts, remove books,
  delete the round; archive[0] "Als aktuelle Runde zurückholen" (`[data-op=restore]`) = undo an accidental new round (the
  current one is discarded); both two clicks within 4 s.
  Tab Bestand: import → report (+ "Titel anzeigen": new/dropped titles `#r-diff`), coverage, `#cat-it` Italian names of
  categories missing in categories-it.js (only shown if any), `#nocover` hide a wrong cover (search, "Cover ansehen",
  "Ausblenden"), publish. Without an import (`#current`) the same cards for the published list; the publish card appears
  once something changed (keeps date/books, refreshes coverage) and then stays. Draft `dsm-books-draft` = `{catIt, noCover}`.
  Tab Pflege (`tools/source/admin/maintenance.jsx`, only after an import): `#m-sum`, `#m-checks` lists by group
  (`.check[data-check]`, rows with WinBIAP number `bid`, first 100 shown, `[data-csv]`), `#m-all` everything as CSV,
  `#m-types` media types, `#m-shelf` location list for the inventory (`#m-loc`, `#m-print` prints only the list via
  `[data-print]` in styles.css, `#m-shelf-csv`, `#m-shelf-all`). CSV = UTF-8 BOM, `;`, CRLF, cells starting with = + - @ get `'`.
- Only HTML/CSS/JS: no push/deploy services, no database, no further server code. Exception `save.php` (2026-10-17,
  "one button, change content directly"): one file, no framework, writes only the three data files. Vite build locally allowed.
  Pages run via double-click (file://): classic scripts, no `type="module"`.
- "Publish" in this order: (1) online with save.php → POST, live at once; (2) Chrome/Edge: File System Access
  into the website folder (chosen once, must contain index.html, handle in IndexedDB); (3) otherwise download = the main button
  (no separate "Stattdessen herunterladen" link). Locally without PHP, FTP stays manual work.
- save.php: GET → `{dsm:"save",v:3,ready,reason?}` (no JSON → old route). GET `?backups` (X-DSM-Key) → `{ok,backups:{file:
  [{name,size,time}]}}` newest first; POST `?restore=<backup name>` (key, no body): strict name regex per data file, content
  checked like an upload (`dsm_check`), written like one (`dsm_write`: current → backup/, rotation, flock, atomic) → `{ok,file}`.
  Admin: "Frühere Versionen" (`data-pub-backups`) per publish card only online with key and v ≥ 3, restore two clicks. POST `?file=` with `X-DSM-Key`, body = the finished
  file; only exactly header comment + `window.DSM_… = ` + JSON object with the required field (books/groups/hours) + `;\n`.
  Old version → `backup/` (10 per file, `backup/.htaccess` denies access, written if missing), atomic (temp + rename, flock). PHP ≥7.1 (no str_starts_with/array_is_list/match).
  PHP warnings never into the answer (`display_errors` off, `log_errors` on, output buffer): php-wasm and many webspaces display
  them, printed before the JSON they force status 200 + text/html = "HTTP 200" in the admin page (2026-10-18). The admin page
  shows status + start of an answer without an error code.
  Key = PBKDF2(password, salt "dsm-library/save.php", 310,000), only in the encrypted plaintext
  (`var DSM_SAVE_KEY`, function scope, not window).
- Admin lock only "student-proof": PBKDF2-SHA-256 (310,000) + AES-GCM 256, logic only encrypted. admin.enc.js is public, so
  the password's strength is the only barrier (offline guessing; the save key comes from it too): long passphrase.
  Session key in sessionStorage expires 4 h after the page was last left (`dsm-admin-seen`, set on `pagehide`):
  Chrome restores sessionStorage with "continue where you left off" (shared school PC).
- Opening hours status (`src/library/info.jsx`) in Milan time (`Intl` Europe/Rome), also on devices in another time zone.
- Cover sources in this order: (1) ekz `cover.ekz.de/<ISBN>.jpg` (404 = none). Substitute image "leider kein aktuelles Bild"
  = 170×270, always 9977 bytes: check such images via `fetch` (CORS `*`), length + FNV-1a; can't be checked = substitute; real
  170×270 covers stay. (2) Open Library only for ekz misses, always `/api/books?jscmd=viewapi` → cover ID, NEVER `/b/isbn/`
  (100 requests/5 min/IP, school network = one IP). (3) `books.google.com/books/content?vid=ISBN…`, discard substitute images
  128×184/128×170 (no CORS, dimensions only). NOT the Google Books API (429), NOT portal.dnb.de (Anubis → ERR_BLOCKED_BY_ORB).
  ISBNs in books.js `noCover` (hidden in admin.html because the image is wrong) are skipped everywhere (`usable()` in covers.js),
  also from the cache; survey's `miss` = books without any cover (Pflege list).
  Staggered in the background for books in view, small (OL "M" ≈180 px, Google ≈128 px, ekz fixed 170–440 px).
- Tap a real cover in the detail → `#zoom` (second Radix dialog, glass scrim), FLIP flight (transform only, `--snap`, 240/180 ms)
  into the center of the VISIBLE section (`visualViewport`, not innerWidth/innerHeight: with pinch zoom the window center lay
  bottom right, 2026-10-23), max. 27rem. Only then OL "L"; Google at most 2.5×. Placeholders can't be enlarged.
  Enlargeable only once the image is shown (`onShown` in the frame that adds `.in`); a new book resets found/zoomable in render.
- Detail on the phone (<40rem, `lib/swipe.js`): screen-high sheet, parked half-high (transform), flies in from below
  (spring as `linear()`), the finger leads 1:1; up = as high as the content, at most full screen (content scrolls), down = half,
  further/fast = close, the scrim follows. Content that fits half-high (≤ 80 %) = ONE stage like an iOS sheet sized to its
  content (`data-fit`, 2026-10-20, client: no empty glass, mainly the questions): no 40 % minimum, upwards a rubber band
  (iOS formula), springs back. From 40rem / reduced motion unchanged. Tests: `swipeStages` (helpers.js) in every dialog spec. EVERY dialog behaves the same (2026-10-20, client:
  settings, categories, questions, opening hours, archive; `useSwipe(scrimSel, onClose)`, class `swipe` on dialog + scrim;
  a new dialog gets it too; categories keep a constant height and go to full screen when the search field gets focus; content
  changing its height at half glides to the new position; swiping the questions away = "no"). After a swipe away `data-gone` switches off Radix' closing animation (otherwise a flash on iOS).
  `main.books` uses `lvh` (not `dvh`) so the iOS toolbar/keyboard does not move the text while searching.
- Announcement banner (2026-10-18, client; `src/components/announcement.jsx` view + `ColorDots`, `src/library/announcement.jsx`
  logic): `aside#announce` above the header, full width, 1–2 lines (admin `maxLength` 140) on a cover-placeholder logo color
  (anthracite text, on red white) or neutral (`surface` + line). Floats in 300 ms after the list arrived (grid 0fr→1fr + strip
  from `translateY(-100%)`, .32 s `--snap`), pushes the page down; × (44 px, right) or Esc (not in a dialog/text field) collapses it
  (`--t-base`, `--ease-in`), then removed; keyboard focus → `#q`. Closed = `dsm-announce`; new text shows again; `#preview` ignores it.
  Admin: card `#i-ann` first in the info tab (`#i-ann-de/-it`, dots `#i-ann-color [data-color]`, `#i-ann-until`, live preview
  `#i-ann-preview`, `#i-ann-clear`), published with info.js. Test: announcement.spec.
- Dialogs (detail, settings, questions, opening hours, archive, categories): `Dialog` as `.glass.sheet`, scrim `.scrim` blurred +
  darker; phone bottom sheet, centered from 40rem. Blur always on, except "reduce transparency" and glass in high contrast.
- Theme: default = device; settings automatic/light/dark, larger text, high contrast. Italian stays
  anthracite (no red). No color stripe bar under the title.
- Slow connection: `.skel` placeholders for the list and (if `data-recs` from head.js) recommendations until books.js (≈700 KB) is
  there; after 6 s "Langsame Verbindung". library.js loads BEFORE books.js; books.js reports via a setter on `window.DSM_LIBRARY`.
  Placeholders for everything that loads later: covers (until loaded), logo (`.ld-img`, `.loaded` on load/error), info card (if
  shown last time, `dsm-info-card`), unlock button (spinner until admin.js has loaded, while checking). Fonts `font-display: swap`.
- First visit: overlay, no language question (removed 2026-10-18; language = device, switch top right; shelf `.shelf` in logo
  colors, without a baseline) "Möchten Sie Buchempfehlungen sehen?" (yes/no stacked on the phone; from the next step "Zurück" at the top) → Mittelstufe / Oberstufe / Erwachsenenliteratur → Romane / Sachbücher / Biografien & Geschichte.
  Saved in `dsm-recs`. No progress bar (removed 2026-10-17). On opening focus goes to the dialog (`.pane`, tabIndex -1), not to a
  button – Chrome would otherwise show the focus ring right on load. Settings: the same choice as a list, blocks with spacing,
  the adult areas in one block.

## Design

- DSM corporate design: Fira Sans 400/500/600, text anthracite #333333. Exactly three font sizes (`--fs-s` .875rem, `--fs-m`
  1rem, `--fs-l` 1.5rem). Logo colors only for lines/accents: mauve #BA8EA7, yellow #DDD300, orange #DB9F00, blue #B5C9D0,
  red #A93A39, green #B3CEA1. No all caps, no italics, no underlining. Little animation, `prefers-reduced-motion`.
- Colors only as tokens in `src/styles.css` (`:root`, `prefers-color-scheme` + `[data-theme]`, `[data-contrast="high"]`,
  `[data-font="large"]`). Tailwind theme reset to DSM: only `text-s/m/l`, `font-normal/medium/semibold`,
  shadcn color names (`background`, `foreground`, `muted-foreground`, `border`, `primary`, `surface` …) and logo colors (`mauve`,
  `yellow`, `orange`, `blue`, `red`, `green`; plus `anthracite`). `--spacing: 4px` (`p-3` = 12 px). No `dark:`.
- Grid: cards (info, recommendations also on the phone, settings blocks, detail text) = `.card` (16 px radius, `surface`,
  inner line, `p-4`); blocks above the list `pb-4`; search field 48 px, radius 12 px; logo 44 px / 60 px, square corners (no radius on `.ld-img`, client 2026-10-18).
- Header index.html (2026-10-20, client, variant A from `docs/entwuerfe/`): title `h1` next to the logo behind a 1 px divider
  ("DSM | Bibliothek", `Header title=…`, `.hd`/`.hd-row` in styles.css). Container query `calc(260px + 4.7em)`: one row from
  375 px phones (larger text from 390 px), otherwise the title drops below the logo as before. admin.html keeps the title below.
  Test: header.spec.
- Accessible: targets ≥44 px (`size="icon"` 44, `icon-sm` 40), focus 2 px in the text color (`--focus`), skip link `a[href="#q"]`,
  info card without `aria-label`, invisible list heading `#list-t`.
- shadcn after `ui:add`: `cn` from `@/lib/utils`, no `text-sm`/`text-xs`, no `underline`, no `dark:` (rules.test checks).
  `cn()` knows the custom sizes (tailwind-merge extended), otherwise it swallows `text-s text-muted-foreground`.

## Technology

- `react`/`react-dom` → `preact/compat` (bundle halved, ≈205 KB / 68 KB gzip). Preact 10 fails with Radix (ref as a prop →
  getComputedStyle error). On a Preact/Radix update push and let CI run all tests.
- One entry per page (`src/{library,admin}/main.jsx`) as an IIFE, fixed name (no hash: FTP replaces files).
  Mounting into `#page` replaces the skeleton, first render via `flushSync`. Stores via `useSyncExternalStore` (`lib/language`,
  `lib/appearance`, `library/choice`); texts per module via `addStrings({de, it})`.
- Admin page: the lock decrypts `admin.enc.js`, `new Function(src)()` sets `window.DSM_ADMIN.App`; the app takes React and
  `@/…` from `window.DSM_SHARED` (one React). covers/logger/categories-it and the data stay classic scripts.
- Notices (Sonner, `lib/notice.js`): Sonner injects its CSS unlayered at runtime, so Tailwind classes on the toast lose
  (position, width, `.glass::before`). Position/width live in `styles.css` `.toaster[data-sonner-toaster] …` (unlayered, more
  specific); list `right: var(--removed-body-scroll-bar-size)` so it doesn't jump when a dialog's scroll lock ends.
  `notify(msg, onClick)` = the whole notice is a button `.toast-btn` (no swipe); the recommendation notices open the settings (2026-10-22, client).
- Test hooks (`#list .row`, `#d-cover`, `.ask`, `.settings`, `#rec-res` …) must survive refactorings. Radix dialogs `[role=dialog]`,
  closed = not in the DOM.

## Performance

- List (~17,000 elements): `#list > .rows > ul` chunks ≤40 books, every letter starts a new one (`ul[data-l] id="L-X"`).
  `content-visibility: auto` + `contain-intrinsic-size` only in `@supports (overflow-anchor: auto)`. Arrow via CSS mask.
  Cover observation: first chunks, then rows (register chunks once).
- A new list renders step by step (2 chunks at once, then 20 each via setTimeout), `Chunk` = `memo`. NO `startTransition`
  (stayed pending, tests hung). Rows are short classes (`.row`, `.t`, `.a`), one click listener for all.
- covers.js: no permanent intervals; tick timers (300/350/600/1500 ms) only while work is pending.
- Inherited properties on `<html>`/`<body>` hit everything: NO transitions on `body`, animate nothing inherited, no class on
  `<html>` to switch off transitions. `.list { pointer-events: auto }` catches Radix' `body { pointer-events: none }`.
- Theme/contrast (`lib/appearance.js`, simplified 2026-10-20 after repeated breakage): EVERY color change (settings, device
  switching light/dark under "auto", no View Transition API, reduced motion) adds the `<style>` `still`
  (`transition: none !important`, except the `.seg3` marker): otherwise each component fades at its own speed while the rest
  jumps, and under the cross-fade it runs on the main thread (300–700 ms frames at CPU 4×). Not a class on `<html>`.
  With the API: marker glides 150 ms, then `document.startViewTransition` (`--t-color` 350 ms, `--ease-color`), `still`
  goes on `finished`; otherwise instant, `still` goes after two frames. Quick clicks: only the last switch runs; a font
  change while a switch waits does not apply early. The other logo is loaded when the settings open (no waiting before the fade).
  NO own layer for `.seg3`. NO View Transition in WebKit (Safari, every iPhone browser; UA check, 2026-10-22, client: on the
  iPhone parts switched one after another and the glass lost its blur during the cross-fade; Playwright's WebKit hung):
  there instant (as without the API). Don't switch `meta[name=theme-color]` by script: Playwright's WebKit froze on it.
  Language (`components/header.jsx`): marker first (`.seg[data-on]`, `will-change: transform`), `setLang` after the frame
  (rAF + setTimeout). Sonner toaster with `dir="ltr"` (otherwise `getComputedStyle(html)` per render).
- Blur: scrim `blur(8px) saturate(1.15)`, glass `blur(18px) saturate(1.8)` – don't increase; glass without backdrop-filter looked
  worse, don't repeat. NO measuring of the blur (`lib/leistung.js` deleted, never per session either): iOS throttles
  rAF to 30 fps in low power mode (WebKit bug 215745), rAF doesn't measure backdrop-filter. head.js deletes the old `dsm-blur`.
- Durations: `--t-fast` 150 (with `--snap`), in `--t-base` 200 / `--t-slow` 250, out `--t-out` 160 ms; detail from 40rem
  140/110, scrim 120/110 ms. logger.js prints via `requestIdleCallback` (entry/time immediately).
- Logos WebP 360 px, the dark one `loading="lazy"`. Reference values (390 px, CPU 4×, CDP `setCPUThrottlingRate`): DOMContentLoaded
  ≈0.5 s, long tasks ≈0.2 s, largest block ≈0.9 s = parsing books.js.

## Data formats

- `books.js`: `{updated, count, coverage?, history?, catIt?, noCover?, books:[{t,s?,a?[],p?,y?,i?[],c?,l?[]}]}` (t title, s subtitle, a authors,
  p publisher, y year, i = checked ISBN-13, c category, l locations; coverage/history = cover coverage from admin.html:
  `{updated, books, isbn, cover?, ekz?, ol?, gb?, none?, checked?, complete?}`; catIt = `{German: Italian}` for categories
  missing in categories-it.js (merged in `prepare()`); noCover = ISBNs with a wrong cover; both kept by `npm run books`).
- `recommendations.js`: `{updated, topic?:{de,it}, groups:{middle|upper|adult-fiction|adult-nonfiction|adult-bio:[{k,t,a,de,it}]},
  archive?:[{updated, topic?, groups}]}` (newest first, max. 40). Other books than published = new round (old one to the front
  of the archive, updated = today); only texts/topic → updated stays. `k` = norm(title)|norm(first author), norm: lower case,
  no accents, ß→ss, only a–z0–9 and spaces.
- `info.js`: `{updated, hours:{mon..sun:[["HH:MM","HH:MM"]]}, notice:{de,it,from?,to?}, contact?:{email?,phone?,de?,it?},
  closures:[{type:"holiday"|"absent"|"special",from,to,de,it,hours?}],
  announcement?:{de,it,color:"neutral"|"mauve"|"yellow"|"orange"|"blue"|"red"|"green",until?}}` (YYYY-MM-DD, to ≥ from; notice only within from..to,
  a missing bound = open; contact only if filled in, e-mail → `mailto:`, phone → `tel:`, shown in the opening hours dialog
  `#info-contact`; `special` + 1–2 valid `hours`: on those days open ONLY then, a holiday/absence on the same day wins;
  empty text → "Ferien", "Bibliothek geschlossen" or "Geänderte Öffnungszeiten"; announcement only with a text, past `until` = hidden).
- localStorage: `dsm-lang`, `dsm-theme`, `dsm-font`, `dsm-contrast`, `dsm-recs` (`{want, group}`), `dsm-cover-v3` (v2 is deleted),
  `dsm-info-card`, `dsm-announce` (FNV-1a hash of the closed announcement's de|it texts); admin: `dsm-recs-draft` (+ `archive` = edited archive, `restored` = round taken back as the base of the
  new-round comparison; both dropped after publishing), `dsm-info-draft`, `dsm-books-draft`, `dsm-preview(-recs|-info)` (index.html#preview), IndexedDB
  `dsm-admin`/`kv`/`website` = folder handle. Log: `dsm-log` ("off"), sessionStorage `dsm-log-history` (500).
  head.js/logger.js migrate the old keys once (`dsm-empf` with group ids, `dsm-info-karte`, `dsm-protokoll`) and drop old drafts/previews.
- logger.js captures interactions, dialogs (reported by `components/glass-dialog.jsx`), network, storage, errors. Own entries:
  `log(area, text, data?)` from `@/lib/storage`. `/key|pass|pw|token/` never in plaintext; `data-log="own"` = the page logs itself.
  Console: `DSM_LOG.history()`, `.asText()`, `.off()`, `.on()`, `.clear()`.

## Checking

After every change `npm run build` (local), commit, push, CI green (tests never locally, see top). `tests/unit/`: whitelist via SQL spy (`helpers/testdb.js`), covers,
encryption, save.php, build byte-exact against website/, data formats, data migration, hard rules (`rules.test.js`), tunnel.
- The save test needs `php` in the PATH or `DSM_PHP="npx --yes --prefer-offline @php-wasm/cli@3.1.56"`, otherwise skipped.
- With `DSM_ADMIN_PW` (CI: repository secret) the unit tests additionally check admin.enc.js. `real-db.test` only with `data/*.winbook` (or `DSM_DB=…`; states only counts).
- E2E: the admin tests encrypt the sources with "test-password"; admin import byte-identical to `npm run books`; cover APIs mocked.
  Every spec runs in Chromium (Chrome/Edge) and Firefox; WebKit (≈ Safari) desktop and an iPhone viewport only
  `engines.spec.js` (2026-10-22: the full suite hung in Playwright's Linux WebKit – the page stopped answering after color
  switches, dialogs vanished – which Safari doesn't do; the admin/phone specs are WebKit-ready, see below). Phone describes use `test.use({ ...PHONE })` (Firefox knows no `isMobile`); `swipe()` uses CDP
  touch in Chromium, in-page touch events elsewhere; performance.spec (CDP, Chromium budgets) and axe (a11y.spec) only in Chromium. WebKit has no folder
  access (as Safari): the admin specs publish via the download there (`save()`/`FOLDER` in admin-helpers.js), folder-only tests skip; a download does not
  count as published (checks of the published state only with FOLDER). WebKit switches colors without a View Transition (lib/appearance.js):
  the instant switch is tested there, the cross-fade in Chromium/Firefox. Safari itself stays untested on real devices.
  `a11y.spec` (axe WCAG 2.1 AA, every view), `performance.spec` (CPU 4× budgets, 3× catalog stress; values as annotations),
  `publish.spec` (REAL save.php via a second webServer `php -S` + local-router.php, `DSM_LOCAL_DIR=tests/.tmp`, only if php
  exists), `engines.spec` also file:// (double-click). Wait for animations with `settled(page)`, not `waitForTimeout`
  (a fixed wait only to prove that something does NOT happen). `books.js` size budget in data.test (1000 KB / 250 KB gzip).
  Shared admin helpers in `tests/e2e/admin-helpers.js` (`adminSetup()`, `unlock`, `importTest`, `tab`, `save`, `server`, …);
  specs `admin.spec` (lock, import, publish), `admin-care` (Pflege, names, covers), `admin-recs`, `admin-info`, `admin-backups`.
- Live: `brew install cloudflared`, a foreign address via `DSM_LIVE_URL=https://…`. The tunnel is public: only website/ without
  dot files, `*.php`, `backup/`; own Node server with `no-store` (Cloudflare caches `.js`/`.css` otherwise).
- GitHub Actions (`.github/workflows/test.yml`, since 2026-10-18): every push (any branch, not for docs/anleitung/`*.md` only)
  runs `npm test` (with the runner's PHP, so save.test really runs) and `npm run test:e2e` sharded over 5 parallel jobs
  (`--shard`: chromium 2, firefox 2, webkit + iphone 1; `CI` = 2 workers, 1 retry, traces as artifact
  `playwright-results-<browser>-<job>` on failure). Browser + its apt .deb files cached per browser/Playwright version/runner
  image, saved right after the install (uncached WebKit = 117 MB from a sometimes very slow mirror); apt timeouts/retries,
  8 min per install attempt, 3 attempts – apt on the runner sometimes stalls. More shards = shorter, but more billed minutes
  (every job ≥ 1 min plus ≈1 min setup)., `npm audit --audit-level=high` and save.test once more on PHP 7.1
  (promised minimum). Also Mondays 06:00 UTC (only from `origin/main`). Tests only, NO deploy. `build.test` has a gzip size
  budget per built file – raise it deliberately, not to silence it. Results: `gh run list`, `gh run watch`,
  `gh run view --log-failed`. Optional repository secret `DSM_ADMIN_PW` (only Johann sets it) enables the admin.enc.js check.
  CI is the ONLY test run (no local tests, see top). `DSM_ADMIN_PW`/`real-db`/`test:live` checks therefore do not run for now.
  E2E (sharded) takes ≈4–5 min on the 2-core runners; under heavy parallel load the swipe/close tests can flake (retry 1 catches it).
  Since 2026-10-22: `TZ=Europe/Rome` in CI; flaky tests (passed on the retry) listed as warnings + job summary
  (`tests/helpers/flaky-report.js`); job `apache`: the pack folder on Docker `php:7.1-apache` (`tests/apache/`, only with
  `DSM_APACHE=1`): .htaccess, save.php end to end, backup/ locked, 16 parallel POSTs. Flakiness under load on demand:
  `gh workflow run stress.yml -f repeat=5 -f workers=4 [-f grep=…]` (no retry, failure rate per test in the summary).
  Third-party actions pinned to a commit SHA.

## Integrating branches (mandatory at the end of every task)

Every task in its own worktree (`.claude/worktrees/<name>`, branch `worktree-<name>`), at the end of the same session via a
`--no-ff` merge into the local `main` (main checkout). `main` is always uploadable, i.e. working.
1. Commit in the worktree, `git merge main`, resolve conflicts **there** (never in `main`): source/CLAUDE.md/LIESMICH by content;
   `admin.enc.js` encrypt again, built files `npm run build`, `books.js` `npm run books`, `recommendations.js` by content.
2. `tools/source/*` changed → encrypt again. Commit, `git push` the branch, GitHub Actions run green (`gh run watch`; never test
   locally). Look at visible changes via `npm run serve`.
3. ExitWorktree (`keep`), in the main checkout `npm run integrate -- worktree-<name>`. Aborts on an unclean main checkout,
   uncommitted changes, a conflict, a syntax error in `website/**.js`/`tools/**.js` → fix in the worktree, again. If ONLY the
   three data files are changed in the main checkout (admin page via folder access = intended content), it takes them over
   beforehand via a branch `data-<time>` + merge. Never discard/reset data files in `main`.
4. `git worktree remove <path>` (foreign ones `git worktree unlock` first), `git branch -d` (never `-D`). Report: merge commit, warnings.
- `npm run branches` or the hook (`.claude/settings.json` → `branches.sh --hook`) reports open branches: integrate "fully committed,
  not in main" at the start if clearly finished, otherwise ask Johann.
- Branches with uncommitted changes belong to a running session: don't touch; never commit/stash/reset/merge in foreign
  worktrees. A foreign finished branch with a conflict: own worktree from `main`, merge it in, resolve, test, integrate.
- `main` only via merge commits: no rebase, no `--force`, no `reset --hard`. Worktree sessions only touch their own worktree
  (`git -C <path> …`); the merge into `main` only after ExitWorktree.

## Open

- **THERE IS NO WEBSPACE YET (as of 2026-10-18).** Nothing has ever been uploaded; no live data exists anywhere. The site
  only runs locally (`npm run serve` / `npm run local` / tunnel). Don't plan migrations of live data, don't assume a server
  copy is "the original", don't tell Johann to download or delete anything on a server. When a webspace exists (likely
  Aruba, see docs/), upload `upload/website/` from `npm run pack` once (never the working folder website/: it holds a test
  info.js, .DS_Store, sicherung/) and set up save.php: admin.enc.js, save.php, save-access.php are current
  (encrypted 2026-10-23). Unknown then: PHP version, write permissions, WAF. Only from that moment on the server copies of
  books.js/recommendations.js/info.js and backup/ become the original.
- `tools/migrate-data.mjs` (old German data format → English) only matters for stray old local files; nothing live to migrate.
- `website/info.js` is not committed and currently doesn't exist: the page shows no opening hours until the admin page publishes one.
- Covers: run "Cover-Abdeckung prüfen" completely in admin.html; clarify the terms of use of cover.ekz.de.
- Untested on real devices: iPhone Safari (CI only has Playwright WebKit on Linux); school PC with Windows 7 (last versions
  Chrome 109 / Firefox ESR 115; style.css has `@supports` fallbacks for color-mix and old Firefox, build target es2020) – check by hand.
- Covers load directly from Google/Open Library/ekz (visitor IP + ISBN to third parties): clarify with the school's data protection officer.
- 20 initial recommendation texts (DE/IT) by Claude – Johann should proofread them. Remote `origin` (GitHub) must stay private (plaintext).
- School website: `docs/dsmailand-techstack.md`. Adopt nothing (no GTM, no Google Fonts); Aruba `.htaccess` unclear → `IfModule`.
