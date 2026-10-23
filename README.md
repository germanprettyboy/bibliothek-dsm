# Library DSM

Public book list of the school library of the Deutsche Schule Mailand (DSM) with a password-protected admin page.
Bilingual German/Italian, mobile first.

- **Book list** (`index.html`): alphabetical, search, category filter, A–Z jump, detail view with cover, book recommendations, opening hours/holidays.
- **Admin page** (`admin.html`): import the catalog from the WinBIAP database, maintain recommendations, enter opening hours, publish.
- **Technology**: React API on Preact, Tailwind CSS v4, shadcn/ui, built with Vite. The result in `website/` is plain HTML/CSS/JS and also runs via double-click (`file://`).
  Only server file: `website/save.php` (online saving from the admin page).

## Privacy

No student data and no loan status in public. The extraction works with a whitelist (title, subtitle, author, publisher, year, ISBN, category, location);
reader, loan and fee tables are only counted. `data/` (original database) is in `.gitignore` and never committed.
The repository is public on purpose (free GitHub Actions): `tools/source/` is plaintext, so the admin password is the only
protection. Never commit the password, secrets or anything from `data/`. Privacy policy and imprint: the school's main website.

## Folders

| Folder | Content | Upload? |
| --- | --- | --- |
| `website/` | built site, data (`books.js`, `recommendations.js`; `info.js` only on the webspace), `save.php`, assets | yes, only this folder |
| `src/` | source of the pages (React, Tailwind, shadcn/ui) | no |
| `tools/` | build, encryption of the admin app, extraction, data migration, local server, tunnel | no |
| `tests/` | unit tests (`node:test`) and browser tests (Playwright) | no |
| `docs/`, `anleitung/` | UI drafts, German staff guide | no |
| `data/` | original database with student data | never |

## Getting started

```bash
npm install
npm run build        # src/ → website/ (after every change to src/, commit the result)
npm run serve        # http://localhost:8765
npm run dev          # build in watch mode with live reload
npm run local        # like the webspace: PHP + real save.php, admin page at /admin.html (password "local")
npm run books        # data/*.winbook → website/books.js
```

After changes to `tools/source/**` encrypt the admin app again (asks for the password without echo):

```bash
node tools/encrypt-admin.js
```

The admin password is in no file.

## Tests

Tests run only on GitHub Actions (every push, see `.github/workflows/test.yml`), never on the development Mac:

```bash
git push && gh run watch <id> --exit-status   # unit tests (node:test) + browser tests (Playwright), about 5 min
gh run view <id> --log-failed
```

## Publishing

Upload the folder `website/` to the webspace (https). Once online saving is set up, `books.js`, `recommendations.js`, `info.js`
and `backup/` on the server are the original: don't overwrite them with old local versions when uploading.
Details in `website/LIESMICH.txt` (German).

## Way of working

Every task runs in its own git worktree and is merged into `main` with `--no-ff` at the end via `npm run integrate -- worktree-<name>`.
`main` is always working and may be uploaded. Overview of open branches: `npm run branches`.
All rules, design requirements and data formats are in `CLAUDE.md`.

## Client

Johann Bucher (volunteer at the DSM).
