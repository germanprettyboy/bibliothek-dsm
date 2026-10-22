/*
 * Admin page, card "Veröffentlichen": earlier versions from save.php (v3) – list, restore with a second click.
 * Shared helpers: admin-helpers.js. save.php is simulated (server()).
 */
const { test, expect } = require("./helpers.js");
const { PW, adminSetup, unlock, tab, server } = require("./admin-helpers.js");

adminSetup();

const LIST = {
  "books.js": [],
  "recommendations.js": [],
  "info.js": [
    { name: "info-20261020-143005b.js", size: 2048, time: "2026-10-20T14:30:05" },
    { name: "info-20261020-143005.js", size: 1536, time: "2026-10-20T14:30:05" },
  ],
};
const open = async page => { await tab(page, "info"); };
const card = page => page.locator("#tab-info");

// handler for ?backups / ?restore=: records the requests
function handler(calls, { restore = { json: { dsm: "save", v: 3, ok: true, file: "info.js" } } } = {}) {
  return async (route, request, url) => {
    calls.push({ method: request.method(), query: url.search, key: request.headers()["x-dsm-key"] });
    if (url.searchParams.has("backups")) return route.fulfill({ json: { dsm: "save", v: 3, ok: true, backups: LIST } });
    return route.fulfill(restore);
  };
}

test("save.php v2: no button for earlier versions", async ({ page }) => {
  await server(page, { backups: handler([]) });
  await unlock(page);
  await open(page);
  await expect(page.locator("#i-how")).toContainText("direkt auf der Website");
  await expect(card(page).locator("[data-pub-backups]")).toHaveCount(0);
});

test("without save.php (folder access): no button", async ({ page }) => {
  await server(page, { get: { ready: false, reason: "access", v: 3 }, backups: handler([]) });
  await unlock(page);
  await open(page);
  await expect(card(page).locator("[data-pub-backups]")).toHaveCount(0);
});

test("v3: button loads the list of this file, newest first, with date and size", async ({ page }) => {
  const calls = [];
  await server(page, { get: { ready: true, v: 3 }, backups: handler(calls) });
  await unlock(page);
  await open(page);
  const button = card(page).locator("[data-pub-backups]");
  await expect(button).toHaveText("Frühere Versionen");
  await button.click();
  const rows = card(page).locator("[data-backup]");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveAttribute("data-backup", "info-20261020-143005b.js");
  await expect(rows.nth(0)).toContainText(/20\.10\.2026.*14:30.*2 KB/);
  await expect(rows.nth(1)).toContainText("2 KB");
  await expect(rows.nth(0).locator("[data-restore]")).toHaveText("Wiederherstellen");
  expect(calls).toHaveLength(1);
  expect(calls[0].method).toBe("GET");
  expect(calls[0].query).toBe("?backups");
  expect(calls[0].key).toBe(await require("../../tools/encrypt-admin.js").saveKey(PW));
  // second click on the button closes the list
  await button.click();
  await expect(rows).toHaveCount(0);
});

test("other files: empty list shows a note", async ({ page }) => {
  await server(page, { get: { ready: true, v: 3 }, backups: handler([]) });
  await unlock(page);
  await tab(page, "recs");
  await page.locator("#tab-recs [data-pub-backups]").click();
  await expect(page.locator("#tab-recs [data-pub-backups-none]")).toHaveText("Noch keine früheren Versionen.");
});

test("restore needs a second click, sends name and key, then message and reload button", async ({ page }) => {
  const calls = [];
  await server(page, { get: { ready: true, v: 3 }, backups: handler(calls) });
  await unlock(page);
  await open(page);
  await card(page).locator("[data-pub-backups]").click();
  const first = card(page).locator("[data-restore]").nth(1);
  await first.click();
  await expect(first).toHaveText("Wirklich wiederherstellen?");
  expect(calls.filter(c => c.method === "POST")).toHaveLength(0);
  await first.click();
  const flag = card(page).locator('.pub[data-file="info.js"] .flag');
  await expect(flag).toContainText("Version vom 20.10.2026");
  await expect(flag).toContainText("Bitte die Seite neu laden.");
  const posts = calls.filter(c => c.method === "POST");
  expect(posts).toHaveLength(1);
  expect(posts[0].query).toBe("?restore=info-20261020-143005.js");
  expect(posts[0].key).toBe(await require("../../tools/encrypt-admin.js").saveKey(PW));
  const [reloaded] = await Promise.all([page.waitForEvent("load"), card(page).locator("[data-pub-reload]").click()]);
  expect(reloaded).toBeTruthy();
});

test("the confirmation question expires after 4 seconds", async ({ page }) => {
  await server(page, { get: { ready: true, v: 3 }, backups: handler([]) });
  await unlock(page);
  await open(page);
  await card(page).locator("[data-pub-backups]").click();
  const b = card(page).locator("[data-restore]").first();
  await b.click();
  await expect(b).toHaveText("Wirklich wiederherstellen?");
  await expect(b).toHaveText("Wiederherstellen", { timeout: 7000 });
});

test("restore rejected: warning, no reload button", async ({ page }) => {
  await server(page, { get: { ready: true, v: 3 }, backups: handler([], { restore: { status: 422, json: { dsm: "save", v: 3, error: "format" } } }) });
  await unlock(page);
  await open(page);
  await card(page).locator("[data-pub-backups]").click();
  const b = card(page).locator("[data-restore]").first();
  await b.click();
  await b.click();
  await expect(card(page).locator('.pub[data-file="info.js"] .flag.warn')).toContainText("Wiederherstellen hat nicht geklappt (format)");
  await expect(card(page).locator("[data-pub-reload]")).toHaveCount(0);
});
