---
paths:
  - "src/admin/**"
  - "src/admin.html"
  - "tools/source/**"
  - "tools/encrypt-admin.js"
  - "tools/check-admin.cjs"
  - "tools/local.mjs"
  - "tools/local-router.php"
  - "website/save.php"
  - "website/.htaccess"
  - "tests/e2e/admin*.js"
  - "tests/e2e/publish.spec.js"
  - "tests/unit/{save,encryption}.test.js"
  - "tests/apache/**"
---

# Admin page (admin.html) and save.php

- Lock: `src/admin/lock.jsx` decrypts `admin.enc.js`, `new Function(src)()` sets `window.DSM_ADMIN.App`; React and `@/…` come from
  `window.DSM_SHARED`: whatever the admin app imports from `@/…` must be in `src/admin/shared.js`. `App` only gets `lock`.
- Lock only "student-proof": PBKDF2-SHA-256 (310,000) + AES-GCM 256. admin.enc.js and the repo are public, so the password's strength
  is the only barrier: long passphrase. Session key in sessionStorage expires 4 h after the page was last left.
- `tools/source/*` changed → `npm run encrypt` (password from Johann, never written down); compile check without password:
  `node tools/check-admin.cjs`.
- No "Aktuell veröffentlicht …", no draft notice, no privacy notices (import: no "Nicht übernommen" card, success = "Upload
  erfolgreich"; only the reader-name warning stays).
- Floating sticky nav bar (`nav.jsx`): tabs Bestand | Pflege | Cover | Empfehlungen | Info | Statistik (column 54rem, `body.adm`),
  then help (`?`, `help.jsx`) and lock. Charts only in tab Statistik.
- Destructive actions = two clicks within 4 s. Automatic corrections (`fixes.jsx`) only change the public list, never the WinBook
  file. Every publish keeps a local version (IndexedDB `dsm-admin`, `versions.js`). Print without `:has()` (Firefox ESR 115).
- Recommendations switch `#rec-on` "Empfehlungen auf der Website" (`off: true`): the book list shows nothing of them; data stays.
- "Publish": (1) online save.php; (2) Chrome/Edge folder access (must contain index.html, handle in IndexedDB); (3) else download.
- save.php: PHP ≥ 7.1 (no str_starts_with/array_is_list/match); protocol and backups in its header comment. Warnings never in the
  answer. Key = PBKDF2(password, salt "dsm-library/save.php", 310,000), only in the encrypted plaintext (`var DSM_SAVE_KEY`).
- `.htaccess`: only `IfModule` blocks.
