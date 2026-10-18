/*
 * Admin page (admin.html). The real admin.enc.js needs the real password, which is written nowhere.
 * So here it is replaced by a version of the current sources encrypted with "test-password".
 */
const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");
const { test, expect, data, TMP } = require("./helpers.js");
const X = require("../../tools/source/extract.js");
const T = require("../helpers/testdb.js");
const { realDb, keyOf } = require("../helpers/load.js");

const PW = "test-password";
const { B, R } = data();

test.beforeEach(async ({ context }) => {
  await context.route("**/assets/admin.enc.js", r => r.fulfill({ path: path.join(TMP, "admin.enc.js"), contentType: "text/javascript" }));
  // The browser's folder dialog (native, not controllable) replaced by a folder in the private browser storage (OPFS).
  // localStorage "__test-folder": name of the chosen folder; only "website" contains index.html; "cancel" = dialog cancelled.
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

async function unlock(page) {
  await page.goto("admin.html");
  await page.fill("#pw", PW);
  await page.click("#unlock");
  await expect(page.locator("#app")).toBeVisible({ timeout: 15000 });
}
async function load(page, file) {
  await page.setInputFiles("#file", file);
}
// Download as text (browser without folder access)
async function download(page, button) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click(button)]);
  return fs.readFileSync(await dl.path(), "utf8");
}
// Read a file in the (test) website folder, null = not present
const folderFile = (page, file, folder = "website") => page.evaluate(async ([f, o]) => {
  try {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(o);
    return await (await (await dir.getFileHandle(f)).getFile()).text();
  } catch (e) { return null; }
}, [file, folder]);
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
const evaluate = (s, name) => { const w = {}; new Function("window", s)(w); return w[name]; };
// Books of the test database (as after importing)
async function testCatalog() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(path.join(TMP, "test.winbook")));
  try { return X.extract(db).books; } finally { db.close(); }
}
// Same generation as npm run books / generate-books.js
async function nodeScript(dbBytes, meta) {
  const SQL = await initSqlJs();
  const db = new SQL.Database(dbBytes);
  try { return X.toScript(X.extract(db), meta); } finally { db.close(); }
}

test.describe("lock", () => {
  test("locked: only the password field, admin app hidden", async ({ page }) => {
    await page.goto("admin.html");
    await expect(page.locator("#lock")).toBeVisible();
    await expect(page.locator("#app")).toBeHidden();
    await expect(page.locator("#pw")).toBeFocused();
  });

  test("wrong password: message, waiting time, counter", async ({ page }) => {
    await page.goto("admin.html");
    await page.fill("#pw", "wrong");
    await page.click("#unlock");
    await expect(page.locator("#lock-msg")).toHaveText("Das Passwort stimmt nicht.", { timeout: 10000 });
    await expect(page.locator("#lock-form")).toHaveClass(/shake/);
    expect(await page.evaluate(() => sessionStorage.getItem("dsm-admin-fails"))).toBe("1");
    await page.click("#unlock");
    await expect(page.locator("#lock-msg")).toHaveText(/^Bitte \d+ Sekunden warten\.$/);
    await expect(page.locator("#app")).toBeHidden();
  });

  test("the waiting time grows with further failed attempts (at most 30 s)", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("dsm-admin-fails", "9"));
    await page.goto("admin.html");
    await page.fill("#pw", "wrong");
    await page.click("#unlock");
    await expect(page.locator("#lock-msg")).toHaveText("Das Passwort stimmt nicht.", { timeout: 10000 });
    await page.click("#unlock");
    await expect(page.locator("#lock-msg")).toHaveText(/^Bitte (29|30) Sekunden warten\.$/);
  });

  test("right password: the admin app starts, stays open on reload, lock closes it", async ({ page }) => {
    await unlock(page);
    await expect(page.locator("#lock")).toBeHidden();
    expect(await page.evaluate(() => sessionStorage.getItem("dsm-admin-fails"))).toBe("0");
    expect(await page.evaluate(() => sessionStorage.getItem("dsm-admin-key"))).toBeTruthy();
    await page.reload();
    await expect(page.locator("#app")).toBeVisible({ timeout: 10000 });
    await page.click("#lock-btn");
    await expect(page.locator("#lock")).toBeVisible();
    await expect(page.locator("#app")).toBeHidden();
    expect(await page.evaluate(() => sessionStorage.getItem("dsm-admin-key"))).toBeNull();
  });

  test("after unlocking the password is no longer in the field and nowhere in storage", async ({ page }) => {
    await unlock(page);
    // after unlocking the lock including the password field is no longer on the page
    await expect(page.locator("#pw")).toHaveCount(0);
    expect(await page.content()).not.toContain(PW);
    const everything = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(everything).not.toContain(PW);
  });

  test("a new tab is locked again", async ({ page, context }) => {
    await unlock(page);
    const p2 = await context.newPage();
    await p2.goto("admin.html");
    await expect(p2.locator("#lock")).toBeVisible();
    await expect(p2.locator("#app")).toBeHidden();
  });

  test("manipulated session key: discarded, page locked", async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("__manip")) { sessionStorage.setItem("__manip", "1"); sessionStorage.setItem("dsm-admin-key", btoa("x".repeat(32))); }
    });
    await page.goto("admin.html");
    await expect(page.locator("#lock")).toBeVisible();
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem("dsm-admin-key"))).toBeNull();
    await expect(page.locator("#app")).toBeHidden();
  });

  test("admin.enc.js missing: understandable message", async ({ page }) => {
    await page.route("**/assets/admin.enc.js", r => r.fulfill({ status: 404, body: "" }));
    await page.goto("admin.html");
    await page.fill("#pw", PW);
    await page.click("#unlock");
    await expect(page.locator("#lock-msg")).toContainText("admin.enc.js fehlt");
  });

  test("Italian", async ({ page }) => {
    await page.goto("admin.html");
    await page.click('.seg [data-lang="it"]');
    await expect(page.locator("#lock-msg")).toHaveText("");
    await expect(page.locator("#unlock")).toHaveText("Sblocca");
  });
});

test.describe("importing the database", () => {
  test("test database: report, personal data discarded, cross-check", async ({ page }) => {
    await unlock(page);
    await load(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("#r-books")).toHaveText("8");
    const taken = page.locator("#r-taken");
    await expect(taken).toContainText("Datensätze in der Datenbank16");
    await expect(taken).toContainText("Andere Medien ausgelassen (DVD, CD, Hörbuch …)2");
    await expect(taken).toContainText("Gelöschte oder ausgeschiedene Titel4");
    await expect(taken).toContainText("Mehrfachexemplare zusammengefasst1");
    await expect(taken).toContainText("Titel mit ISBN (Cover möglich)3");
    // comparison as in the admin app: title|first author, lower case
    const k = b => (b.t + "|" + ((b.a && b.a[0]) || "")).toLowerCase();
    const fresh = await testCatalog(), old = new Set(B.books.map(k)), now = new Set(fresh.map(k));
    const a = [...now].filter(x => !old.has(x)).length, r = [...old].filter(x => !now.has(x)).length;
    await expect(taken).toContainText(`Gegenüber der aktuellen Liste+${a} neu · −${r.toLocaleString("de-DE")} entfallen`);
    const rm = page.locator("#r-removed");
    await expect(rm).toContainText("Leserinnen und Leser3");
    await expect(rm).toContainText("Laufende Ausleihen2");
    await expect(rm).toContainText("Programm-Benutzer (mit Passwörtern)1");
    await expect(rm).toContainText("Anmeldesitzungen (IP-Adressen)1");
    await expect(rm).toContainText("5 Felder");
    await expect(rm).toContainText("Bucheinträge mit Leser-Namen3");
    await expect(page.locator("#r-check")).toHaveText(/^1 Titel enthalten einen Namen.*2 Standort- oder Kategoriebezeichnungen/);
    await expect(page.locator("#r-check")).toHaveClass(/mid/);
    // no names on the page
    await expect(page.locator("#report")).not.toContainText("Musterfrau");
  });

  test("publish books.js: byte-identical to the Node generation (npm run books)", async ({ page }) => {
    await unlock(page);
    await load(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    const s = await save(page, "#dl");
    const d = evaluate(s, "DSM_LIBRARY");
    expect(d.count).toBe(8);
    expect(d.coverage).toMatchObject({ updated: d.updated, books: 8, isbn: 3 });
    expect(d.history.at(-1)).toEqual(d.coverage);
    const node = await nodeScript(fs.readFileSync(path.join(TMP, "test.winbook")), { updated: d.updated, coverage: d.coverage, history: d.history });
    expect(s === node, "books.js differs from the Node generation").toBe(true);
    await expect(page.locator("#r-taken")).toContainText("Gegenüber der aktuellen Liste+0 neu · −0 entfallen");
  });

  test("preview: index.html#preview shows the imported list", async ({ page, context }) => {
    await unlock(page);
    await load(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    const [p2] = await Promise.all([context.waitForEvent("page"), page.click("#preview")]);
    await p2.waitForLoadState();
    await expect(p2.locator("#preview")).toBeVisible();
    await expect(p2.locator("#list .row .t")).toHaveText(T.EXPECTED);
  });

  test("not an SQLite file → message, can be chosen again", async ({ page }) => {
    await unlock(page);
    await load(page, path.join(TMP, "no-sqlite.winbook"));
    await expect(page.locator("#error")).toHaveText(/keine SQLite-Datenbank/);
    await expect(page.locator("#drop")).toBeVisible();
    await expect(page.locator("#report")).toBeHidden();
    await load(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("#error")).toBeHidden();
  });

  test("SQLite without a books table → message", async ({ page }) => {
    await unlock(page);
    await load(page, path.join(TMP, "no-library.sqlite"));
    await expect(page.locator("#error")).toHaveText(/keine Bibliotheksdatenbank/, { timeout: 20000 });
  });

  test("messages and report follow the language", async ({ page }) => {
    await unlock(page);
    await load(page, path.join(TMP, "no-sqlite.winbook"));
    await page.click('.seg [data-lang="it"]');
    await expect(page.locator("#error")).toHaveText(/Non è un database SQLite|SQLite/);
    await load(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#r-removed")).toContainText("Lettrici e lettori", { timeout: 20000 });
  });

  test("check cover coverage (services mocked)", async ({ page, net }) => {
    net.ol = keys => (keys.includes("ISBN:9783522202107") ? { "ISBN:9783522202107": { thumbnail_url: "https://covers.openlibrary.org/b/id/3-S.jpg" } } : {});
    net.image = url => url.includes("covers.openlibrary.org/b/id/") || url.includes("cover.ekz.de/9783871347108");
    await unlock(page);
    await load(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("#c-big")).toHaveText("37,5 %");
    await page.click("#c-run");
    await expect(page.locator("#c-stop")).toBeVisible();
    await expect(page.locator("#c-run")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#c-big")).toHaveText("66,7 %");
    await expect(page.locator("#c-sub")).toHaveText("2 von 3 Büchern mit ISBN haben ein Cover · 25 % aller Bücher");
    await expect(page.locator("#c-lines")).toContainText("ekz-Bibliotheksservice1");
    await expect(page.locator("#c-lines")).toContainText("Open Library1");
    await expect(page.locator("#c-lines")).toContainText("Google Books0");
    await expect(page.locator("#c-lines")).toContainText("Kein Cover gefunden1");
    expect(net.requests.filter(u => u.includes("/b/isbn/"))).toEqual([]);
    const d = evaluate(await save(page, "#dl"), "DSM_LIBRARY");
    expect(d.coverage).toMatchObject({ cover: 2, ekz: 1, ol: 1, gb: 0, none: 1, checked: 3, complete: true });
    expect(net.requests.filter(u => u.includes("api/books")).join()).not.toContain("9783871347108"); // ekz hits not sent to Open Library
  });

  test("original database: books.js byte-identical to the Node generation", async ({ page }) => {
    const db = realDb();
    test.skip(!db, "data/BIBLIOTHEK_DSM_2024.winbook is missing");
    test.setTimeout(120000);
    await unlock(page);
    await load(page, db);
    await expect(page.locator("#report")).toBeVisible({ timeout: 90000 });
    await expect(page.locator("#r-books")).toHaveText(B.books.length.toLocaleString("de-DE"));
    const s = await save(page, "#dl");
    const d = evaluate(s, "DSM_LIBRARY");
    const node = await nodeScript(fs.readFileSync(db), { updated: d.updated, coverage: d.coverage, history: d.history });
    expect(s === node, "books.js differs from npm run books").toBe(true);
    expect(JSON.stringify(d.books)).toBe(JSON.stringify(B.books));
  });
});

test.describe("editing recommendations", () => {
  const tab = async page => { await page.click('.tabs [data-tab="recs"]'); await expect(page.locator("#tab-recs")).toBeVisible(); };
  const draft = page => page.evaluate(() => JSON.parse(localStorage.getItem("dsm-recs-draft") || "null"));

  test("groups, current state loaded", async ({ page }) => {
    await unlock(page);
    await tab(page);
    await expect(page.locator("#rec-groups button")).toHaveText([
      "Mittelstufe", "Oberstufe", "Erwachsene · Romane", "Erwachsene · Sachbücher", "Erwachsene · Biografien & Geschichte"]);
    await expect(page.locator("#rec-list .rec-ed b")).toHaveText(R.groups.middle.map(r => r.t));
    await expect(page.locator("#rec-list .warn")).toHaveCount(0);
  });

  test("switching tabs without a transition", async ({ page }) => {
    await unlock(page);
    const duration = await page.locator(".tabs [data-tab]").evaluateAll(t => t.map(e => getComputedStyle(e).transitionDuration));
    expect(duration).toEqual(["0s", "0s", "0s"]);
  });

  test("full group: adding disabled; remove, add, sort, text – draft saved", async ({ page }) => {
    await unlock(page);
    await tab(page);
    // group full: search field disabled, note centered
    await expect(page.locator("#rec-q")).toBeDisabled();
    await expect(page.locator("#rec-full")).toBeVisible();
    await expect(page.locator("#rec-full")).toHaveText("Gruppe voll (4)");
    // remove
    await page.locator('#rec-list .rec-ed[data-n="3"] [data-op="del"]').click();
    await expect(page.locator("#rec-list .rec-ed")).toHaveCount(3);
    await expect(page.locator("#rec-q")).toBeEnabled();
    await expect(page.locator("#rec-full")).toBeHidden();
    // add
    await page.fill("#rec-q", "verwandlung kafka");
    const add = page.locator("#rec-res button:not([disabled])").first();
    const title = (await page.locator("#rec-res li b").first().textContent()).trim();
    await add.click();
    await expect(page.locator("#rec-list .rec-ed")).toHaveCount(4);
    await expect(page.locator("#rec-list .rec-ed b").nth(3)).toHaveText(title);
    await expect(page.locator("#rec-list .rec-ed:last-child textarea").first()).toBeFocused();
    // text
    await page.locator("#rec-list .rec-ed:last-child textarea[data-f=de]").fill("Ein kurzer deutscher Text.");
    await page.locator("#rec-list .rec-ed:last-child textarea[data-f=it]").fill("Un breve testo italiano.");
    // up
    await page.locator('#rec-list .rec-ed[data-n="3"] [data-op="up"]').click();
    await expect(page.locator("#rec-list .rec-ed b").nth(2)).toHaveText(title);
    await expect(page.locator('#rec-list .rec-ed[data-n="0"] [data-op="up"]')).toBeDisabled();
    await expect(page.locator('#rec-list .rec-ed[data-n="3"] [data-op="down"]')).toBeDisabled();
    await expect.poll(async () => (await draft(page))?.groups.middle[2]?.it).toBe("Un breve testo italiano.");
    await expect(page.locator("#rec-state")).toHaveCount(0);
    // the draft survives a reload
    await page.reload();
    await expect(page.locator("#app")).toBeVisible({ timeout: 10000 });
    await tab(page);
    await expect(page.locator("#rec-list .rec-ed b").nth(2)).toHaveText(title);
  });

  test("publish recommendations.js: format, keys, trimmed texts", async ({ page }) => {
    await unlock(page);
    await tab(page);
    await page.locator('#rec-list .rec-ed[data-n="0"] textarea[data-f=de]').fill("  Neuer Text mit Leerzeichen.  ");
    const s = await save(page, "#rec-dl");
    expect(s).toMatch(/^\/\*.*\*\/\nwindow\.DSM_RECOMMENDATIONS = \{/);
    expect(s).not.toContain("<");
    const d = evaluate(s, "DSM_RECOMMENDATIONS");
    expect(Object.keys(d.groups)).toEqual(["middle", "upper", "adult-fiction", "adult-nonfiction", "adult-bio"]);
    expect(d.groups.middle[0].de).toBe("Neuer Text mit Leerzeichen.");
    expect(d.groups.upper).toEqual(R.groups.upper);
    for (const r of d.groups.middle) expect(Object.keys(r)).toEqual(["k", "t", "a", "de", "it"]);
  });

  test("preview of the recommendations on index.html#preview", async ({ page, context }) => {
    await unlock(page);
    await tab(page);
    await page.locator('#rec-list .rec-ed[data-n="0"] [data-op="del"]').click();
    const [p2] = await Promise.all([context.waitForEvent("page"), page.click("#rec-prev")]);
    await p2.evaluate(() => localStorage.setItem("dsm-recs", JSON.stringify({ want: true, group: "middle" })));
    await p2.reload();
    await expect(p2.locator("#preview")).toBeVisible();
    await expect(p2.locator("#recs .rec .rt b")).toHaveText(R.groups.middle.slice(1).map(r => r.t));
  });

  test("discard the draft: a second click is needed", async ({ page }) => {
    await unlock(page);
    await tab(page);
    await page.locator('#rec-list .rec-ed[data-n="0"] [data-op="del"]').click();
    await expect(page.locator("#rec-list .rec-ed")).toHaveCount(R.groups.middle.length - 1);
    // the draft is saved with a delay (300 ms) – only discard afterwards
    await expect.poll(async () => (await draft(page))?.groups.middle.length).toBe(R.groups.middle.length - 1);
    await page.click("#rec-reset");
    await expect(page.locator("#rec-reset")).toHaveText("Wirklich verwerfen?");
    await expect(page.locator("#rec-list .rec-ed")).toHaveCount(R.groups.middle.length - 1);
    await page.click("#rec-reset");
    await expect(page.locator("#rec-list .rec-ed")).toHaveCount(R.groups.middle.length);
    expect(await draft(page)).toBeNull();
  });

  test("a recommendation missing after an import is marked", async ({ page }) => {
    await unlock(page);
    await load(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    await tab(page);
    const present = new Set((await testCatalog()).map(keyOf));
    const missing = R.groups.middle.filter(r => !present.has(r.k)).length;
    expect(missing).toBeGreaterThan(0);
    await expect(page.locator("#rec-list .warn")).toHaveCount(missing);
    await expect(page.locator("#rec-list .warn").first()).toHaveText("Nicht im aktuellen Bestand – wird nicht angezeigt.");
  });
});

test.describe("admin page on the phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("no horizontal scrolling", async ({ page }) => {
    await unlock(page);
    await load(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test.describe("publishing directly into the website folder", () => {
  const info = async page => { await page.click('.tabs [data-tab="info"]'); await expect(page.locator("#tab-info")).toBeVisible(); };
  const picks = page => page.evaluate(() => window.__picks);
  const folderLine = "Website-Ordner: website · Anderen Ordner wählen";

  test("the first click asks for the folder and writes info.js; afterwards without asking, also after a reload", async ({ page }) => {
    await unlock(page);
    await info(page);
    await expect(page.locator("#i-dl")).toHaveText("Veröffentlichen");
    await expect(page.locator("#i-how")).toContainText("nichts herunterladen, nichts verschieben");
    await page.fill("#i-note-de", "Erster Hinweis");
    const d = evaluate(await save(page, "#i-dl"), "DSM_INFO");
    expect(d.notice.de).toBe("Erster Hinweis");
    expect(await picks(page)).toBe(1);
    await expect(page.locator('.pub[data-file="info.js"] .note')).toHaveText(folderLine);
    await expect(page.locator("#i-how")).toHaveText("Ein Klick schreibt info.js direkt in den Website-Ordner „website“.");
    // second time: no dialog
    await page.fill("#i-note-de", "Zweiter Hinweis");
    await page.click("#i-dl");
    await expect.poll(async () => (await folderData(page, "info.js", "DSM_INFO"))?.notice.de).toBe("Zweiter Hinweis");
    expect(await picks(page)).toBe(1);
    // the folder stays remembered after a reload (IndexedDB)
    await page.reload();
    await expect(page.locator("#app")).toBeVisible({ timeout: 10000 });
    await info(page);
    await expect(page.locator("#i-how")).toHaveText("Ein Klick schreibt info.js direkt in den Website-Ordner „website“.");
    await page.fill("#i-note-de", "Dritter Hinweis");
    await page.click("#i-dl");
    await expect.poll(async () => (await folderData(page, "info.js", "DSM_INFO"))?.notice.de).toBe("Dritter Hinweis");
    expect(await picks(page)).toBe(0);
  });

  test("wrong folder (without index.html): message, nothing written; then the right folder", async ({ page }) => {
    await unlock(page);
    await info(page);
    await page.evaluate(() => localStorage.setItem("__test-folder", "Downloads"));
    await page.click("#i-dl");
    const flag = page.locator('.pub[data-file="info.js"] .flag');
    await expect(flag).toHaveText("Im Ordner „Downloads“ liegt keine index.html. Bitte den Website-Ordner wählen – den Ordner mit index.html und admin.html.");
    await expect(flag).toHaveClass(/warn/);
    expect(await folderFile(page, "info.js", "Downloads")).toBeNull();
    await expect(page.locator('.pub[data-file="info.js"] .note')).toHaveCount(0);
    await page.evaluate(() => localStorage.setItem("__test-folder", "website"));
    await save(page, "#i-dl");
    expect(await picks(page)).toBe(2);
  });

  test("dialog cancelled: no message, nothing written", async ({ page }) => {
    await unlock(page);
    await info(page);
    await page.evaluate(() => localStorage.setItem("__test-folder", "cancel"));
    await page.click("#i-dl");
    await expect.poll(() => picks(page)).toBe(1);
    await expect(page.locator("#i-dl")).toBeEnabled();
    await expect(page.locator('.pub[data-file="info.js"]')).toHaveText("");
  });

  test("choose another folder", async ({ page }) => {
    await unlock(page);
    await info(page);
    await save(page, "#i-dl");
    await page.evaluate(() => localStorage.setItem("__test-folder", "Downloads"));
    await page.click('.pub[data-file="info.js"] [data-pub-change]');
    await expect(page.locator('.pub[data-file="info.js"] .flag')).toHaveText(/^Im Ordner „Downloads“ liegt keine index\.html/);
    // the previous folder stays
    await expect(page.locator('.pub[data-file="info.js"] .note')).toHaveText(folderLine);
  });

  test("publish recommendations twice: the new round only once in the archive", async ({ page }) => {
    await unlock(page);
    await page.click('.tabs [data-tab="recs"]');
    await page.locator('#rec-list .rec-ed[data-n="0"] [data-op="del"]').click();
    const a = evaluate(await save(page, "#rec-dl"), "DSM_RECOMMENDATIONS");
    const before = (R.archive || []).length;
    expect(a.archive.length).toBe(before + 1);
    expect(a.updated).toBe(new Date().toLocaleDateString("sv-SE"));
    await page.locator('#rec-list .rec-ed[data-n="0"] textarea[data-f=de]').fill("Nur der Text ist neu.");
    await page.click("#rec-dl");
    await expect.poll(async () => (await folderData(page, "recommendations.js", "DSM_RECOMMENDATIONS"))?.groups.middle[0].de).toBe("Nur der Text ist neu.");
    const b = evaluate(await folderFile(page, "recommendations.js"), "DSM_RECOMMENDATIONS");
    expect(b.archive.length).toBe(before + 1);
    expect(b.updated).toBe(a.updated);
  });

  test("announcement: text, color dot, end date, live preview → info.js; removing it drops the field", async ({ page }) => {
    await unlock(page);
    await info(page);
    await expect(page.locator("#i-ann-preview")).toHaveCount(0);
    await expect(page.locator("#i-ann .note")).toHaveText("Ohne Text erscheint kein Banner.");
    await page.fill("#i-ann-de", "  Heute ab 12 Uhr geschlossen.  ");
    await page.fill("#i-ann-it", "Oggi chiusa dalle 12.");
    // dots (radio group): neutral chosen at first
    await expect(page.locator('#i-ann-color [role="radio"]')).toHaveCount(7);
    await expect(page.locator('#i-ann-color [data-color="neutral"]')).toHaveAttribute("aria-checked", "true");
    await page.locator('#i-ann-color [data-color="red"]').click();
    await expect(page.locator('#i-ann-color [data-color="red"]')).toHaveAttribute("aria-checked", "true");
    await page.locator('#i-ann-color [data-color="green"]').click();
    await expect(page.locator('#i-ann-color [data-color="green"]')).toHaveAttribute("aria-checked", "true");
    await expect(page.locator('#i-ann-color [data-color="red"]')).toHaveAttribute("aria-checked", "false");
    await expect(page.locator("#i-ann-color-t")).toContainText("Grün");
    const bar = page.locator("#i-ann-preview .announce-bar");
    await expect(bar).toHaveAttribute("data-color", "green");
    await expect(bar).toContainText("Heute ab 12 Uhr geschlossen.");
    await page.fill("#i-ann-until", "2099-12-31");
    let d = evaluate(await save(page, "#i-dl"), "DSM_INFO");
    expect(d.announcement).toEqual({ de: "Heute ab 12 Uhr geschlossen.", it: "Oggi chiusa dalle 12.", color: "green", until: "2099-12-31" });
    // a past date is flagged
    await page.fill("#i-ann-until", "2020-01-01");
    await expect(page.locator("#i-ann .warn")).toHaveText("Datum vorbei – der Banner wird nicht mehr angezeigt.");
    // remove: no announcement in info.js any more
    await page.click("#i-ann-clear");
    await expect(page.locator("#i-ann-de")).toHaveValue("");
    await page.click("#i-dl");
    await expect.poll(async () => { const x = await folderData(page, "info.js", "DSM_INFO"); return x && !("announcement" in x); }).toBe(true);
  });

  test("Italian", async ({ page }) => {
    await unlock(page);
    await info(page);
    await page.click('.seg [data-lang="it"]');
    await expect(page.locator("#i-dl")).toHaveText("Pubblica");
    await page.click("#i-dl");
    await expect(page.locator('.pub[data-file="info.js"] .flag')).toHaveText(/^info\.js salvato nella cartella «website» alle \d\d:\d\d\.$/);
    await expect(page.locator('.pub[data-file="info.js"] .note')).toHaveText("Cartella del sito: website · Scegli un'altra cartella");
  });
});

test.describe("publishing directly online (save.php)", () => {
  // save.php simulated: GET reports the state, POST answers as wished and records the requests
  async function server(page, { get = { ready: true }, post = null } = {}) {
    const requests = [];
    await page.route("**/save.php*", async r => {
      const q = r.request();
      if (q.method() === "GET") return r.fulfill({ json: { dsm: "save", v: 2, ...get } });
      requests.push({ file: new URL(q.url()).searchParams.get("file"), key: q.headers()["x-dsm-key"], text: q.postData() });
      if (post) return r.fulfill(post);
      return r.fulfill({ json: { dsm: "save", v: 2, ok: true } });
    });
    return requests;
  }
  const info = async page => { await page.click('.tabs [data-tab="info"]'); await expect(page.locator("#tab-info")).toBeVisible(); };
  const flag = page => page.locator('.pub[data-file="info.js"] .flag');
  const ONLINE = "Ein Klick speichert info.js direkt auf der Website – sofort online, nichts hochladen.";

  test('one click: info.js goes to save.php with the key, no folder dialog, message "online"', async ({ page }) => {
    const { saveKey } = require("../../tools/encrypt-admin.js");
    const requests = await server(page);
    await unlock(page);
    await info(page);
    await expect(page.locator("#i-how")).toHaveText(ONLINE);
    await expect(page.locator("#i-dl")).toHaveText("Veröffentlichen");
    await expect(page.locator('.pub[data-file="info.js"] .note')).toHaveCount(0);
    await page.fill("#i-note-de", "Online-Hinweis");
    await page.click("#i-dl");
    await expect(flag(page)).toHaveText(/^info\.js ist online, \d\d:\d\d Uhr\.$/);
    expect(requests.length).toBe(1);
    expect(requests[0].file).toBe("info.js");
    expect(requests[0].key).toBe(await saveKey(PW));
    expect(evaluate(requests[0].text, "DSM_INFO").notice.de).toBe("Online-Hinweis");
    expect(await page.evaluate(() => window.__picks)).toBe(0);
    // counts as published afterwards
    expect(await page.evaluate(() => window.DSM_INFO.notice.de)).toBe("Online-Hinweis");
  });

  test("books.js goes to save.php with the key", async ({ page }) => {
    const requests = await server(page);
    await unlock(page);
    await load(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    await page.click("#dl");
    await expect(page.locator('.pub[data-file="books.js"] .flag')).toHaveText(/^books\.js ist online/);
    expect(requests[0].file).toBe("books.js");
    expect(evaluate(requests[0].text, "DSM_LIBRARY").books.length).toBe(8);
  });

  test("access denied (403): warning, the state stays unpublished", async ({ page }) => {
    await server(page, { post: { status: 403, json: { dsm: "save", v: 2, error: "key" } } });
    await unlock(page);
    await info(page);
    await expect(page.locator("#i-how")).toHaveText(ONLINE);
    const before = await page.evaluate(() => JSON.stringify(window.DSM_INFO));
    await page.fill("#i-note-de", "Abgelehnt");
    await page.click("#i-dl");
    await expect(flag(page)).toHaveText(/^Die Website hat das Speichern abgelehnt/);
    await expect(flag(page)).toHaveClass(/warn/);
    expect(await page.evaluate(() => JSON.stringify(window.DSM_INFO))).toBe(before);
  });

  test("server error without JSON: message with the status", async ({ page }) => {
    await server(page, { post: { status: 500, body: "Internal Server Error" } });
    await unlock(page);
    await info(page);
    await expect(page.locator("#i-how")).toHaveText(ONLINE);
    await page.click("#i-dl");
    await expect(flag(page)).toHaveText("Speichern auf der Website hat nicht geklappt (HTTP 500). Bitte noch einmal versuchen.");
  });

  test("save.php without the access file: note, folder route as before", async ({ page }) => {
    const requests = await server(page, { get: { ready: false, reason: "access" } });
    await unlock(page);
    await info(page);
    await expect(page.locator('.pub[data-file="info.js"] [data-pub-setup]')).toHaveText("Direkt online speichern ist noch nicht eingerichtet: save-access.php fehlt auf der Website.");
    await expect(page.locator("#i-how")).toContainText("nichts herunterladen, nichts verschieben");
    await save(page, "#i-dl");
    expect(requests.length).toBe(0);
  });

  test("Italian", async ({ page }) => {
    await server(page);
    await unlock(page);
    await info(page);
    await page.click('.seg [data-lang="it"]');
    await expect(page.locator("#i-how")).toHaveText("Un clic salva info.js direttamente sul sito – subito online, senza caricare nulla.");
    await page.click("#i-dl");
    await expect(flag(page)).toHaveText(/^info\.js è online dalle \d\d:\d\d\.$/);
  });
});

test.describe("browser without folder access (Safari, Firefox, phone)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { delete window.showDirectoryPicker; delete Window.prototype.showDirectoryPicker; });
  });

  test("info.js is downloaded as before, the note names Chrome/Edge", async ({ page }) => {
    await unlock(page);
    expect(await page.evaluate(() => typeof window.showDirectoryPicker)).toBe("undefined");
    await page.click('.tabs [data-tab="info"]');
    await expect(page.locator("#i-dl")).toHaveText("info.js herunterladen");
    await expect(page.locator("#i-how")).toHaveText("Direkt speichern geht in Chrome oder Edge am Computer. Die heruntergeladene Datei info.js im Website-Ordner ersetzen (neben index.html).");
    await page.fill("#i-note-de", "Per Download");
    const d = evaluate(await download(page, "#i-dl"), "DSM_INFO");
    expect(d.notice.de).toBe("Per Download");
    await expect(page.locator('.pub[data-file="info.js"]')).toHaveText("");
  });

  test("books.js is downloaded", async ({ page }) => {
    await unlock(page);
    await load(page, path.join(TMP, "test.winbook"));
    await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("#dl")).toHaveText("books.js herunterladen");
    expect(evaluate(await download(page, "#dl"), "DSM_LIBRARY").count).toBe(8);
  });
});
