/*
 * Admin page, card "Veröffentlichen" → "Frühere Versionen": local version history (versions.js, IndexedDB) in folder mode.
 * Every publish is a version, the published state on opening the admin page too; restoring = two clicks within 4 s,
 * writes the old text again and puts it into the form. Shared helpers: admin-helpers.js (folder = OPFS stub).
 */
const { test, expect } = require("./helpers.js");
const { FOLDER, adminSetup, unlock, tab, importTest, folderData } = require("./admin-helpers.js");

adminSetup();

const card = page => page.locator("#tab-info");
const local = (page, file) => page.locator(`[data-local-versions="${file}"]`);

// Publish info.js with this notice and wait until the folder holds it
async function publishNotice(page, text) {
  await page.fill("#i-note-de", text);
  await page.click("#i-dl");
  await expect.poll(async () => { const d = await folderData(page, "info.js", "DSM_INFO"); return d && d.notice.de; }).toBe(text);
}

test.describe("local versions", () => {
  test.skip(({ browserName }) => !FOLDER({ browserName }), "publishing is a download without folder access");

  test("info.js: two publishes are two versions, the older one comes back with two clicks", { tag: "@smoke" }, async ({ page }) => {
    await unlock(page);
    await tab(page, "info");
    await publishNotice(page, "Erster Hinweis");
    await publishNotice(page, "Zweiter Hinweis");

    const opener = card(page).locator("[data-versions-open]");
    await expect(opener).toHaveText("Frühere Versionen");
    await expect(card(page).locator("[data-pub-backups]")).toHaveCount(0); // no save.php: no server backups
    await opener.click();
    await expect(opener).toHaveAttribute("aria-expanded", "true");
    // (info.js is not served in the tests, so there is no "opened" version; only published ones counted anyway)
    const rows = local(page, "info.js").locator('[data-version][data-source="published"]');
    await expect(rows).toHaveCount(2);
    // newest first: the current one without a restore button
    await expect(rows.nth(0)).toHaveAttribute("data-current", "");
    await expect(rows.nth(0)).toContainText("veröffentlicht");
    await expect(rows.nth(0)).toContainText("aktuell");
    await expect(rows.nth(0).locator("[data-version-summary]")).toContainText("Hinweis: Zweiter Hinweis");
    await expect(rows.nth(0).locator("[data-local-restore]")).toHaveCount(0);
    await expect(rows.nth(1).locator("[data-version-summary]")).toContainText("Hinweis: Erster Hinweis");
    await expect(rows.nth(1)).toContainText(/\d\d\.\d\d\.\d{4}.*\d\d:\d\d.*KB/);

    // first click only asks, the second restores
    const id = await rows.nth(1).getAttribute("data-version");
    const button = local(page, "info.js").locator(`[data-version="${id}"] [data-local-restore]`);
    await expect(button).toHaveText("Wiederherstellen");
    await button.click();
    await expect(button).toHaveText("Wirklich wiederherstellen?");
    expect((await folderData(page, "info.js", "DSM_INFO")).notice.de).toBe("Zweiter Hinweis");
    await button.click();

    await expect.poll(async () => { const d = await folderData(page, "info.js", "DSM_INFO"); return d && d.notice.de; }).toBe("Erster Hinweis");
    await expect(page.locator("#i-note-de")).toHaveValue("Erster Hinweis");
    expect(await page.evaluate(() => window.DSM_INFO.notice.de)).toBe("Erster Hinweis");
    expect(await page.evaluate(() => localStorage.getItem("dsm-info-draft"))).toBeNull();
    await expect(card(page).locator('.pub[data-file="info.js"] .flag')).toHaveText(/^Version vom \d\d\.\d\d\.\d{4}, \d\d:\d\d wiederhergestellt – info\.js im Ordner „website“ gespeichert\.$/);
    // the restore is a version of its own (undo): newest, current, marked as restored
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toHaveAttribute("data-current", "");
    await expect(rows.nth(0)).toContainText("wiederhergestellt");
    await expect(rows.nth(0).locator("[data-version-summary]")).toContainText("Erster Hinweis");
    await expect(rows.nth(1).locator("[data-local-restore]")).toHaveCount(1);
  });

  test("the confirmation question expires after 4 seconds", async ({ page }) => {
    await unlock(page);
    await tab(page, "info");
    await publishNotice(page, "Eins");
    await publishNotice(page, "Zwei");
    await card(page).locator("[data-versions-open]").click();
    const button = local(page, "info.js").locator("[data-local-restore]").first();
    await button.click();
    await expect(button).toHaveText("Wirklich wiederherstellen?");
    await expect(button).toHaveText("Wiederherstellen", { timeout: 7000 });
    expect((await folderData(page, "info.js", "DSM_INFO")).notice.de).toBe("Zwei");
  });

  test("books.js: the published list is recorded on opening", async ({ page }) => {
    await unlock(page);
    await importTest(page);
    const versions = page.locator('#tab-catalog [data-versions="books.js"]');
    await versions.locator("[data-versions-open]").click();
    const opened = local(page, "books.js").locator('[data-version][data-source="opened"]');
    await expect(opened).toHaveCount(1);
    await expect(opened).toHaveAttribute("data-current", "");
    await expect(opened).toContainText("beim Öffnen");
    const count = await page.evaluate(() => window.DSM_LIBRARY.count);
    await expect(opened.locator("[data-version-summary]")).toContainText(new Intl.NumberFormat("de-DE").format(count) + " Bücher");
  });

  test("a reload does not record the same state again", async ({ page }) => {
    const opened = () => local(page, "recommendations.js").locator('[data-version][data-source="opened"]');
    await unlock(page);
    await tab(page, "recs");
    await page.locator("#tab-recs [data-versions-open]").click();
    await expect(opened()).toHaveCount(1);
    await expect(opened().locator("[data-version-summary]")).toHaveText(/^Runde vom \d\d\.\d\d\.\d{4}, \d+ Bücher$/);
    // still unlocked in this tab after the reload
    await page.reload();
    await expect(page.locator("#app")).toBeVisible({ timeout: 15000 });
    await tab(page, "recs");
    await page.locator("#tab-recs [data-versions-open]").click();
    await expect(opened()).toHaveCount(1);
    await expect(local(page, "recommendations.js").locator("[data-version]")).toHaveCount(1);
  });
});
