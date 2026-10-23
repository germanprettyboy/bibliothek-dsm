/* Compile check of the admin app without encrypting (no password, writes nothing): node tools/check-admin.cjs
   Builds source/admin/app.jsx like encrypt-admin.js and prints the plaintext size, or the build error. */
"use strict";
require("./encrypt-admin.js").buildSource()
  .then(s => console.log(`admin app builds: ${(s.length / 1024).toFixed(0)} KB plaintext`))
  .catch(e => { console.error(e.message); process.exit(1); });
