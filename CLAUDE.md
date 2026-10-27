# Library DSM – book list of the Deutsche Schule Mailand

Static website: public book list of the school library + password-protected admin page. Bilingual DE/IT, mobile first.
React API on Preact 11 (`preact/compat`, alias `preactAlias` in `tools/build.mjs`) + Tailwind CSS v4 + shadcn/ui; Vite builds fixed
files into `website/` (plain HTML/CSS/JS). Only server file: `save.php`. Client: Johann Bucher (volunteer at the DSM).
Replies in German, no filler, no emojis. Code, comments, identifiers, data formats, docs: English; UI texts German/Italian.

**NEVER RUN TESTS LOCALLY (Johann, absolute).** No `npm test`, `test:e2e`, `test:all`, `test:live`, `npx playwright …`, `node --test …`
on Johann's Mac – not a single spec. Tests run ONLY on GitHub Actions: commit, `git push` the branch, `gh run watch <id> --exit-status`
/ `gh run view <id> --log-failed`. `npm run build`, `books`, `encrypt`, `pack` stay local (they produce files, no tests).

## Where things are

- **File map `docs/sitemap.md`**: one line per tracked file. Read it before Glob/Grep. New, renamed or deleted file → update its
  line in the same commit (`tests/unit/sitemap.test.js` checks).
- **Area rules** load by themselves from `.claude/rules/` once you open a matching file: `library`, `backdrop`, `covers`, `ui`
  (design, dialogs, technology), `admin` (+ save.php), `data` (privacy extraction, file formats), `tests`. Area details go there,
  not here; this file keeps what every task needs.
- A component's behavior and selectors = its e2e spec (`tests/suites.js` maps area → spec) and its header comment; tools =
  `tools/README.txt`; CI = header of `.github/workflows/test.yml`; integration = skill `integrate` (`tools/branches.sh`).

## Folders

- `website/` – ONLY this goes onto the webspace (via `npm run pack`). Built files are committed.
  - BUILT from `src/`, never edit: `index.html`, `admin.html`, `assets/{library,admin,head}.js`, `assets/style.css`.
  - Generated, never by hand: `books.js`, `recommendations.js`, `info.js` (not committed), `save-access.php`, `assets/admin.enc.js`
    (ENCRYPTED from `tools/source/`).
  - By hand: `save.php`, `assets/{logger,covers,categories-it}.js`, `LIESMICH.txt` (German guide), `.htaccess`.
- `src/` – page sources. `tools/` – build and data tools; `tools/source/` = admin app PLAINTEXT. npx (php-wasm, browser-sync,
  shadcn) always with exact version + `--prefer-offline`; deliberately not in package.json.
- `tests/`, `docs/`: never uploaded. `data/` (`*.winbook`, reader names + classes): NEVER commit/upload.

## Commands

```bash
npm run build          # src/ → website/ (after EVERY change to src/, commit the result)
npm run books          # data/*.winbook → website/books.js; exit 2 on a reader name in a public field → check, then -- --names-checked
npm run pack           # upload/website/ = committed website/ (git archive); aborts on a stale admin.enc.js. Upload THIS
npm run serve          # :8765; dev = live reload; tunnel(:dev|:php) = public https://….trycloudflare.com (only website/, no dot/php files)
npm run local          # like the webspace: PHP + real save.php, password "local" → http://127.0.0.1:8765/admin.html; ui:add -- <n> = shadcn
npm run encrypt        # after EVERY change to tools/source/* (asks for the password without echo – only Johann can run it)
npm run integrate -- <branch>   # end of every task (skill integrate); branches (-- sync | cleanup) = overview
```

The admin password is in no file: never guess or write it down.

## Hard rules (client)

- **No student data, no loan status in public** (whitelist extraction + reader-name check, `.claude/rules/data.md`).
- Only HTML/CSS/JS, no deploy services/database/server code except `save.php`; double-click (file://) works: classic scripts, no
  modules.
- **Nothing to Google** (Johann, 2026-10-23: visitor IPs not to Google): covers only ekz → Open Library (`.claude/rules/covers.md`).
  From the school website adopt nothing (no GTM, no Google Fonts; fonts are local).
- Privacy policy and imprint come from the school's main website (it links here): no footer, no own privacy page or notices.
- **NO WEBSPACE YET.** Nothing uploaded, no live data. Don't plan migrations or tell Johann to change anything on a server. Once one
  exists (likely Aruba): upload `upload/website/` once; from then on the server copies of the data files and `backup/` are the
  original – a later code upload must not overwrite them. Unknown: PHP version, write permissions, WAF.
- The GitHub repo `germanprettyboy/bibliothek-dsm` is PUBLIC on purpose (free Actions minutes): never commit secrets, the
  password, student data or `data/`; the plaintext admin source is public. No analyses of school systems here.

## Checking (CI only)

After every change: `npm run build` (src/ changed), commit, push, CI green. **CI suites**, chosen per push: no trailer = **full**
(≈4–5 min, 7 jobs); trailer line `CI-Suite: smoke [area,…]` in the pushed HEAD commit (own line before `Co-Authored-By:`; merge
commit `-m`) = unit + Chromium core tests (≈1.5 min). Areas and plan: `node tests/suites.js ["smoke x,y"]` (allowed locally).
- full for shared ground: `src/styles.css`, `head.js`, `lib/*`, `components/{glass-dialog,header,ui/*}`, `library/{main,app,data}`,
  `src/admin/*`, `tools/build.mjs`, dependencies, Playwright config/helpers, `tests/suites.js`, workflows, `save.php`, `.htaccess`,
  `covers.js`, `logger.js`, `extract.js`, `generate-books.js`, data formats; engine-specific behavior (blur, `lvh`, container
  queries, touch, animation, View Transition); > 3 areas; a conflicting merge of `main` (conflicts only in build output don't
  count); unsure.
- smoke + areas for changes inside a section (component, its CSS/texts/spec, the data it shows); bare smoke only for tools, unit
  tests, `tests/apache/`, Claude config (`.claude/`, `.ignore`). Changes only to `*.md`/`docs/` run no CI.
- Before integrating: one green run covering ALL changes since `main`. In doubt: full.

## Integrating branches (mandatory at the end of every task)

Every task in its own worktree (`EnterWorktree` → `.claude/worktrees/<name>`). `tools/main-guard.cjs` refuses Edit/Write in the
main checkout; the shell must not build, commit or `git -C` there or in another session's worktree. Never `npm install`/`ci`
through the `node_modules` link (it changes main's packages); dependency change: `rm node_modules && npm ci --prefer-offline`.
**At the end: skill `integrate`** (merge main, encrypt/build, push, CI green, `npm run integrate -- worktree-<name>`; cloud
session: merge the `claude/*` branch into `origin/main`). `main` only via merge commits: no rebase, `--force`, `reset --hard`.

## Token economy

- Open the files the sitemap names and read only the part you need (header comment, `offset`/`limit` for long files); don't
  re-read a file after editing it.
- Grep skips build output, generated data and vendor code (`.ignore`); Glob skips gitignored files (`node_modules`). In Bash never
  `cat`, `grep -r` or unscoped `git grep` over `website/`, `anleitung/` or `package-lock.json` (single lines of 100–720 KB): use
  `rg` (honors `.ignore`) or `git grep -n <x> -- src tools tests`. Inspect `books.js` with `node -e`.
- Long outputs only filtered: CI logs `| tail -n 150` or `| grep -E "✘|Error"`; `git log --oneline -n 20`; `git diff --stat` first.

## Compact instructions

When compacting keep: the task, Johann's decisions, changed files, branch and CI state. Drop file contents and logs.

<!-- Open (Johann's to-dos; HTML comments are not loaded into Claude's context):
- Covers: run "Cover-Abdeckung prüfen" completely; terms of use of cover.ekz.de.
- Proofread the 20 recommendation texts and the Italian UI.
- Untested on real devices: iPhone Safari; school PC Windows 7 (Chrome 109 / Firefox ESR 115).
-->
