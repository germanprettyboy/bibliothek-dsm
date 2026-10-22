/*
 * Shared helpers of the admin specs (admin*.spec.js). The real admin.enc.js needs the real password, which is
 * written nowhere: it is replaced by a version of the current sources encrypted with "test-password" (setup.js).
 */
const fs = require("fs");
const path = require("path");
const { test, expect, TMP } = require("./helpers.js");

const PW = "test-password";

// Call once per spec file: encrypted test app, folder dialog replaced by the private browser storage (OPFS).
// localStorage "__test-folder": name of the chosen folder; only "website" contains index.html; "cancel" = dialog cancelled.
function adminSetup() {
  test.beforeEach(async ({ context }) => {
    await context.route("**/assets/admin.enc.js", r => r.fulfill({ path: path.join(TMP, "admin.enc.js"), contentType: "text/javascript" }));
    await context.addInitScript(() => {
      window.__picks = 0;
      window.showDirectoryPicker = async () => {
        window.__picks++;
        const name = localStorage.getItem("__test-folder") || "website";
        if (name === "cancel") throw new DOMException("Selection cancelled", "AbortError");
        const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(name, { create: true });
        if (name === "website") await (await (await dir.getFileHandle("index.html", { create: true })).createWritable()).close();
        return dir;
      };
    });
  });
}

async function unlock(page) {
  await page.goto("admin.html");
  await page.fill("#pw", PW);
  await page.click("#unlock");
  await expect(page.locator("#app")).toBeVisible({ timeout: 15000 });
}
async function load(page, file) {
  await page.setInputFiles("#file", file);
}
// Import the synthetic test database and wait for the report
async function importTest(page) {
  await load(page, path.join(TMP, "test.winbook"));
  await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
}
async function tab(page, name) {
  await page.click(`.tabs [data-tab="${name}"]`);
  await expect(page.locator("#tab-" + name)).toBeVisible();
}
// Download as text (browser without folder access, CSV exports)
async function download(page, button) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click(button)]);
  return fs.readFileSync(await dl.path(), "utf8");
}
// Download with its file name
async function downloadFile(page, button) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click(button)]);
  return { name: dl.suggestedFilename(), text: fs.readFileSync(await dl.path(), "utf8") };
}
// Read a file in the (test) website folder, null = not present
const folderFile = (page, file, folder = "website") => page.evaluate(async ([f, o]) => {
  try {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(o);
    return await (await (await dir.getFileHandle(f)).getFile()).text();
  } catch (e) { return null; }
}, [file, folder]);
const evaluate = (s, name) => { const w = {}; new Function("window", s)(w); return w[name]; };
// Content as data; null while the file is missing or being written
const folderData = async (page, file, name) => { try { return evaluate(await folderFile(page, file), name) || null; } catch (e) { return null; } };
const FILE = { "#dl": "books.js", "#rec-dl": "recommendations.js", "#i-dl": "info.js" };
const okText = file => new RegExp(`^${file.replace(".", "\\.")} im Ordner „website“ gespeichert, \\d\\d:\\d\\d Uhr\\.$`);
// Publish: click, success message, written file as text
async function save(page, button) {
  const file = FILE[button];
  await page.click(button);
  await expect(page.locator(`.pub[data-file="${file}"] .flag`)).toHaveText(okText(file));
  return folderFile(page, file);
}
// save.php simulated: GET reports the state, POST answers as wished and records the requests.
// backups: optional handler for the backup list/restore requests (?backups / ?restore=…).
async function server(page, { get = { ready: true }, post = null, backups = null } = {}) {
  const requests = [];
  await page.route("**/save.php*", async r => {
    const q = r.request(), u = new URL(q.url());
    if (backups && (u.searchParams.has("backups") || u.searchParams.has("restore"))) return backups(r, q, u);
    if (q.method() === "GET") return r.fulfill({ json: { dsm: "save", v: 2, ...get } });
    requests.push({ file: u.searchParams.get("file"), key: q.headers()["x-dsm-key"], text: q.postData() });
    if (post) return r.fulfill(post);
    return r.fulfill({ json: { dsm: "save", v: 2, ok: true } });
  });
  return requests;
}

module.exports = { PW, adminSetup, unlock, load, importTest, tab, download, downloadFile, folderFile, folderData, evaluate, FILE, okText, save, server };
