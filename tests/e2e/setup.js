// Einmal vor den Browser-Tests: Verwaltung mit Test-Passwort verschlüsseln, Test-Datenbanken schreiben.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const T = require("../helfer/testdb.js");
const { ROOT, TMP } = require("../helfer/laden.js");

module.exports = async () => {
  fs.mkdirSync(TMP, { recursive: true });
  execFileSync(process.execPath, [path.join(ROOT, "werkzeuge", "admin-verschluesseln.js"), "test-passwort", path.join(TMP, "admin.enc.js")]);
  fs.writeFileSync(path.join(TMP, "test.winbook"), await T.bytes());
  fs.writeFileSync(path.join(TMP, "keine-bibliothek.sqlite"), await T.bytes(T.keineBibliothek));
  fs.writeFileSync(path.join(TMP, "kein-sqlite.winbook"), "Das ist keine Datenbank, nur Text.");
};
