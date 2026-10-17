/* Gemeinsame Hilfen: Pfade, Browser-Datendateien (window.X = …) in Node laden, Normalisierung wie in app.js. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const WEB = path.join(ROOT, "website");
const TMP = path.join(ROOT, "tests", ".tmp");

// Lädt eine Datei der Form „window.NAME = {...};“ und gibt window zurück (fehlt sie: leeres window)
function browserDatei(rel) {
  const ctx = { window: {} };
  if (rel === "info.js" && !fs.existsSync(path.join(WEB, rel))) return ctx.window; // info.js ist nicht eingecheckt
  vm.runInNewContext(fs.readFileSync(path.join(WEB, rel), "utf8"), ctx, { filename: rel });
  return ctx.window;
}
const daten = () => ({
  B: browserDatei("books.js").DSM_BIBLIOTHEK,
  E: browserDatei("empfehlungen.js").DSM_EMPFEHLUNGEN,
  I: browserDatei("info.js").DSM_INFO,
  K: browserDatei("assets/kategorien-it.js").DSM_KATEGORIEN_IT,
});

// norm() wie in app.js / extract.js
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();
const schluessel = b => norm(b.t) + "|" + norm((b.a && b.a[0]) || "");

// Suche wie in app.js (alle Begriffe in Titel, Untertitel, Autoren, ISBN, Verlag)
function treffer(books, q) {
  const terms = norm(q).split(" ").filter(Boolean);
  return books.filter(b => {
    const s = norm([b.t, b.u, (b.a || []).join(" "), (b.i || []).join(" "), b.v].join(" "));
    return terms.every(t => s.includes(t));
  });
}

// Original-Datenbank (daten/ ist nicht eingecheckt). Auch aus einem Git-Worktree heraus finden.
function echteDb() {
  const name = "BIBLIOTHEK_DSM_2024.winbook";
  const kandidaten = [process.env.DSM_DB, path.join(ROOT, "daten", name)];
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: ROOT, encoding: "utf8" }).trim();
    kandidaten.push(path.join(path.dirname(common), "daten", name));
  } catch (e) { /* kein Git */ }
  return kandidaten.find(p => p && fs.existsSync(p)) || null;
}

module.exports = { ROOT, WEB, TMP, browserDatei, daten, norm, schluessel, treffer, echteDb };
