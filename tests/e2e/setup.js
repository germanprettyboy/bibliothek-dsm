// Once before the browser tests: encrypt the admin app with the test password, write the test databases.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const T = require("../helpers/testdb.js");
const { ROOT, TMP } = require("../helpers/load.js");

module.exports = async () => {
  fs.mkdirSync(TMP, { recursive: true });
  execFileSync(process.execPath, [path.join(ROOT, "tools", "encrypt-admin.js"), "test-password", path.join(TMP, "admin.enc.js")]);
  fs.writeFileSync(path.join(TMP, "test.winbook"), await T.bytes());
  fs.writeFileSync(path.join(TMP, "no-library.sqlite"), await T.bytes(T.noLibrary));
  fs.writeFileSync(path.join(TMP, "no-sqlite.winbook"), "Das ist keine Datenbank, nur Text.");
};
