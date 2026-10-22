/*
 * Upload folder for the webspace:  npm run pack  → upload/website/  (copy THIS folder via FTP, not website/)
 *
 * Contains exactly the committed state of website/ (git archive HEAD), nothing that only exists locally:
 * no .DS_Store, no backup/ or sicherung/, no info.js from testing (once online, the original lives on the webspace).
 * Aborts if admin.enc.js is older than tools/source/ (admin.html would run an old state) – encrypt first.
 *
 *   node tools/pack.mjs [target folder] [--ignore-encryption]   (the flag only for the test)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const OUT = path.resolve(args[0] || path.join(ROOT, "upload"));
const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8" }).trim();

// same check as tools/branches.sh check_encryption
const enc = git("log", "-1", "--format=%H", "HEAD", "--", "website/assets/admin.enc.js");
const stale = enc && git("diff", "--name-only", enc, "HEAD", "--", "tools/source");
if (stale && !process.argv.includes("--ignore-encryption")) {
  console.error(`STOP: website/assets/admin.enc.js is older than tools/source/ (changed since: ${stale.split("\n").join(", ")}).
Encrypt first (npm run encrypt), commit, then npm run pack again.`);
  process.exit(1);
}

const dirty = git("status", "--porcelain", "--", "website");
if (dirty) console.warn("Note: uncommitted changes in website/ are NOT included (only the last commit):\n" + dirty);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const tar = path.join(OUT, ".website.tar");
git("archive", "--format=tar", "-o", tar, "HEAD", "website");
execFileSync("tar", ["-xf", tar, "-C", OUT]);
fs.rmSync(tar);

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else files.push(p);
  }
})(path.join(OUT, "website"));
console.log(`${path.join(OUT, "website")}: ${files.length} files from commit ${git("rev-parse", "--short", "HEAD")}.`);
console.log("Upload the CONTENT of this folder. Once save.php is in use online: do not overwrite books.js,");
console.log("recommendations.js and the backup folder on the webspace (see LIESMICH.txt). info.js is not included on purpose.");
