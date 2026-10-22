/*
 * Publishing end to end with the REAL save.php (no mock): admin page → POST → file replaced → the list page loads it.
 * Server: php -S + tools/local-router.php (second webServer in playwright.config.js, only if php exists – on GitHub
 * Actions it does). admin.enc.js and save-access.php with "test-password", data files in tests/.tmp/data/.
 */
const fs = require("fs");
const path = require("path");
const { test, expect, TMP } = require("./helpers.js");

const URL_ = process.env.DSM_PHP_URL;
const DATA = path.join(TMP, "data");
const backups = name => (fs.existsSync(path.join(DATA, "backup")) ? fs.readdirSync(path.join(DATA, "backup")) : [])
  .filter(f => f.startsWith(name + "-"));

test.describe("publishing via the real save.php", () => {
  test.skip(!URL_, "no php in the PATH");
  test.describe.configure({ mode: "serial" }); // one shared data folder
  test.use({ baseURL: URL_ });

  async function unlock(page) {
    await page.goto("admin.html");
    await page.locator("#app").or(page.locator("#pw")).waitFor();
    if (await page.locator("#pw").isVisible()) { // later rounds: still unlocked in this tab
      await page.fill("#pw", "test-password");
      await page.click("#unlock");
    }
    await expect(page.locator("#app")).toBeVisible({ timeout: 15000 });
  }

  test("info.js: online in one click, the list page loads it, the old version goes to backup/", async ({ page }) => {
    for (const text of ["Erster Hinweis", "Zweiter Hinweis"]) {
      await unlock(page);
      await page.click('.tabs [data-tab="info"]');
      await expect(page.locator("#i-how")).toHaveText("Ein Klick speichert info.js direkt auf der Website – sofort online, nichts hochladen.");
      await page.fill("#i-note-de", text);
      await page.click("#i-dl");
      await expect(page.locator('.pub[data-file="info.js"] .flag')).toHaveText(/^info\.js ist online, \d\d:\d\d Uhr\.$/);
      await page.goto("index.html");
      await page.locator("#list .row").first().waitFor();
      expect(await page.evaluate(() => window.DSM_INFO && window.DSM_INFO.notice.de)).toBe(text);
    }
    // the newest backup = the version replaced by the second click (names sort by time)
    const newest = backups("info").sort().pop();
    expect(fs.readFileSync(path.join(DATA, "backup", newest), "utf8")).toContain("Erster Hinweis");
    expect(fs.readdirSync(DATA).filter(f => f.endsWith(".new"))).toEqual([]);
  });

  test("recommendations.js: a removed book is gone on the list page", async ({ page }) => {
    await unlock(page);
    await page.click('.tabs [data-tab="recs"]');
    const first = page.locator('#rec-list .rec-ed[data-n="0"]');
    await expect(first).toBeVisible();
    const count = () => page.evaluate(() => Object.values(window.DSM_RECOMMENDATIONS.groups).reduce((n, g) => n + g.length, 0));
    const before = await count();
    await first.locator('[data-op="del"]').click();
    await page.click("#rec-dl");
    await expect(page.locator('.pub[data-file="recommendations.js"] .flag')).toHaveText(/^recommendations\.js ist online/);
    await page.goto("index.html");
    await page.locator("#list .row").first().waitFor();
    expect(await count()).toBe(before - 1);
    expect(backups("recommendations").length).toBeGreaterThan(0);
  });

  test("wrong key: 403 from the real save.php, nothing changed", async ({ request }) => {
    const before = fs.readFileSync(path.join(DATA, "info.js"), "utf8");
    const r = await request.post("save.php?file=info.js", { headers: { "X-DSM-Key": "wrong" }, data: before });
    expect(r.status()).toBe(403);
    expect(await r.json()).toEqual({ dsm: "save", v: 3, error: "key" });
    expect(fs.readFileSync(path.join(DATA, "info.js"), "utf8")).toBe(before);
  });
});
