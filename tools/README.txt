Tools – do NOT upload to the webspace
=====================================

build.mjs           Builds the website from ../src (React, Tailwind CSS, shadcn/ui) into ../website:
                    index.html, admin.html, assets/library.js, admin.js, style.css, head.js.
                    Run in the project folder: npm run build   (once beforehand: npm install)

source/extract.js   Plaintext: reads the WinBIAP database, removes personal data
source/admin/       Plaintext: admin user interface (React: catalog, cover coverage, recommendations, info)
encrypt-admin.js    Builds source/admin/ and encrypts it together with extract.js
                    into ../website/assets/admin.enc.js; also writes ../website/save-access.php
                    (access for save.php, derived from the password)

After every change to source/ or to change the password (Node.js 18+, in the project folder):
  node tools/encrypt-admin.js   (asks for the password without echo, doesn't end up in the shell history)
Then upload assets/admin.enc.js to the webspace – with a new password also save-access.php
(the same password yields the same access file). Whoever knows the old password can no longer get in with the
new file; open browser sessions have to unlock again.

local.mjs + local-router.php + local-address.cjs
                    Local development as on the webspace: npm run local
                    -> http://127.0.0.1:8765/admin.html, password "local" (another one: DSM_LOCAL_PW=… npm run local).
                    PHP comes as php-wasm via npx (no installation). "Publish" writes to
                    ../tests/.tmp/local/data/ (copy of ../website, fresh on every start; website/ stays untouched). The admin app is encrypted again on start and on
                    changes to source/ (only for local use, the real admin.enc.js stays untouched).
                    src/ is built in watch mode; reload the page after changes.
                    Server only reachable at 127.0.0.1 (local-address.cjs), not from the Wi-Fi.

guide/template.html + build-guide.js
                    Guide for colleagues (admin page, copying the WinBook file), in German.
                    node tools/build-guide.js  ->  anleitung/Anleitung_Verwaltung.html
                    (standalone file with embedded font and logo, offline and printable)
