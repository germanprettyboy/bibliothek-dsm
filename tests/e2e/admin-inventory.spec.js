/*
 * Admin page, tab "Pflege": inventory (tools/source/admin/inventory.jsx, inventory-core.js) and the change of each list
 * since the import of an earlier day (care-history.js). Inventory: scan by ISBN (with hyphens), WinBook number (leading
 * zeros) and shelf mark; found / belongs elsewhere / already counted / unknown; lists missing, found, misplaced, unknown;
 * tick by hand and take back; a key typed outside the field goes into it; kept over a reload; start over needs two
 * clicks; CSV of the missing ones; phone: swipe sheet. Test database (tests/helpers/testdb.js): location
 * "Jugendbücher 6 Brett 5" = copies 1 (Krabat, ISBN 9783522202107, shelf mark "JB 6 Pre"), 4, 10; copy 2 (Krabat, ISBN
 * 9783522176507) stands in "Geschichte Regal 2 Brett 4".
 */
const { test, expect, PHONE, OFF, settled, swipeStages } = require("./helpers.js");
const { adminSetup, unlock, importTest, tab, downloadFile, menusClosed } = require("./admin-helpers.js");

adminSetup();

const LOC = "Jugendbücher 6 Brett 5";
const ago = days => new Date(Date.now() - days * 864e5).toLocaleDateString("sv-SE");
const de = iso => iso.split("-").reverse().join(".");
const ring = page => page.locator("#inv-ring");
const last = page => page.locator("#inv-last");
async function openInventory(page) {
  await unlock(page);
  await importTest(page);
  await tab(page, "care");
  await page.click("#inv-open");
  await expect(page.locator("#inventory")).toBeVisible();
  await settled(page);
}
async function scan(page, code) {
  await page.fill("#inv-code", code);
  await page.keyboard.press("Enter");
  await expect(page.locator("#inv-code")).toHaveValue("");
}
const view = async (page, v) => { await page.click(`#inv-view [data-v="${v}"]`); await expect(page.locator("#inv-list")).toHaveAttribute("data-view", v); };

test.describe("inventory", () => {
  test("scan by ISBN, WinBook number and shelf mark: found, belongs elsewhere, again, unknown; lists and ring", { tag: "@smoke" }, async ({ page }) => {
    await openInventory(page);
    await expect(page.locator("#inv-code")).toBeFocused();
    await expect(ring(page)).toHaveAttribute("data-total", "10");
    await page.selectOption("#inv-loc", LOC);
    await expect(ring(page)).toHaveAttribute("data-total", "3");
    await expect(ring(page)).toHaveAttribute("data-found", "0");

    await scan(page, "9783522202107");
    await expect(last(page)).toHaveAttribute("data-kind", "found");
    await expect(last(page)).toContainText("Krabat");
    await scan(page, "978-3-522-17650-7");
    await expect(last(page)).toHaveAttribute("data-kind", "odd");
    await expect(last(page)).toContainText("Zurückstellen nach: Geschichte Regal 2 Brett 4");
    await scan(page, "9783522202107");
    await expect(last(page)).toHaveAttribute("data-kind", "again");
    await scan(page, "0004");
    await expect(last(page)).toHaveAttribute("data-kind", "found");
    await expect(last(page)).toContainText("Das doppelte Lottchen");
    await scan(page, "jb 6 pre");
    await expect(last(page)).toHaveAttribute("data-kind", "again");
    await scan(page, "12345");
    await expect(last(page)).toHaveAttribute("data-kind", "unknown");
    await expect(ring(page)).toHaveAttribute("data-found", "2");

    await expect(page.locator('#inv-view [data-v="missing"]')).toContainText("1");
    await expect(page.locator("#inv-list [data-id]")).toHaveCount(1);
    await expect(page.locator('#inv-list [data-id="10"]')).toBeVisible();
    await view(page, "odd");
    await expect(page.locator('#inv-list [data-id="2"]')).toContainText("Geschichte Regal 2 Brett 4");
    await view(page, "unknown");
    await expect(page.locator('#inv-list [data-code="12345"]')).toBeVisible();

    // by hand: tick the last missing one, take one back
    await view(page, "missing");
    await page.click('#inv-list [data-id="10"] [data-mark]');
    await expect(ring(page)).toHaveAttribute("data-found", "3");
    await expect(page.locator("#inv-list [data-empty]")).toHaveText("Alles gefunden.");
    await view(page, "found");
    await expect(page.locator("#inv-list [data-id]")).toHaveCount(3);
    await page.click('#inv-list [data-id="4"] [data-undo]');
    await expect(ring(page)).toHaveAttribute("data-found", "2");
  });

  test("a key typed outside the field goes into it (a scanner after a click on a button)", async ({ page }) => {
    await openInventory(page);
    await page.selectOption("#inv-loc", LOC);
    await page.click('#inv-view [data-v="found"]');
    await expect(page.locator('#inv-view [data-v="found"]')).toBeFocused();
    await page.keyboard.type("10");
    await expect(page.locator("#inv-code")).toHaveValue("10");
    await page.keyboard.press("Enter");
    await expect(last(page)).toHaveAttribute("data-kind", "found");
    await expect(page.locator('#inv-view [data-v="found"]')).toHaveAttribute("data-state", "on");
    await expect(page.locator('#inv-list [data-id="10"]')).toBeVisible();
  });

  test("kept over a reload; start over needs a second click; CSV of the missing ones", async ({ page }) => {
    await openInventory(page);
    await page.selectOption("#inv-loc", LOC);
    await scan(page, "9783522202107");
    await expect(ring(page)).toHaveAttribute("data-found", "1");
    const csv = (await (async () => {
      await page.click("#inv-dl");
      return downloadFile(page, "#inv-csv");
    })());
    await menusClosed(page);
    expect(csv.name).toMatch(/^inventur-jugendbucher-6-brett-5-\d{4}-\d{2}-\d{2}\.csv$/);
    const rows = csv.text.replace(/^﻿/, "").trim().split("\r\n").map(l => l.split(";"));
    expect(rows[0]).toEqual(["Nr.", "Titel", "Autor", "Standort", "Signatur", "Jahr"]);
    expect(rows.slice(1).map(r => r[0]).sort()).toEqual(["10", "4"]);

    await page.reload();
    await expect(page.locator("#app")).toBeVisible({ timeout: 15000 });
    await importTest(page);
    await tab(page, "care");
    await expect(page.locator("#inv-state")).toContainText("1 von 3 gefunden");
    await expect(page.locator("#inv-state")).toContainText(LOC);
    await expect(page.locator("#inv-open")).toHaveText("Inventur fortsetzen");
    await page.click("#inv-reset");
    await expect(page.locator("#inv-reset")).toHaveText("Wirklich alles verwerfen?");
    await expect(page.locator("#inv-state")).toBeVisible();
    await page.click("#inv-reset");
    await expect(page.locator("#inv-state")).toHaveCount(0);
    await expect(page.locator("#inv-open")).toHaveText("Inventur starten");
    expect(await page.evaluate(() => localStorage.getItem("dsm-inventory"))).toBeNull();
  });

  test.describe("on the phone", () => {
    test.use({ ...PHONE });
    test("swipe sheet with its stages", async ({ page }) => {
      await openInventory(page);
      await swipeStages(page, page.locator("#inventory"));
    });
  });
});

test.describe("progress since an earlier import", () => {
  // The import of 30 days ago had other counts in three lists
  const BEFORE = ago(30);
  test.use({ storage: { "dsm-recs": OFF, "dsm-care-history": JSON.stringify([{ d: BEFORE, n: 9, c: { isbnBad: 2, isbnNone: 7, yearOdd: 1 } }]) } });

  test("each list shows its change (fewer = green), the summary the sum; the statistics the course", async ({ page }) => {
    await unlock(page);
    await importTest(page);
    await tab(page, "care");
    const delta = key => page.locator(`.check[data-check="${key}"] .cd-delta`);
    await expect(delta("isbnBad")).toHaveAttribute("data-dir", "down");
    await expect(delta("isbnBad")).toContainText("−1");
    await expect(delta("isbnNone")).toContainText("−2");
    await expect(delta("yearOdd")).toHaveAttribute("data-dir", "up");
    await expect(delta("yearOdd")).toContainText("+1");
    await expect(delta("authorNone")).toHaveCount(0);
    await expect(page.locator("#m-lines")).toContainText(`Seit dem Einlesen am ${de(BEFORE)}−2`);
    // today's counts are kept: one entry per day
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("dsm-care-history")));
    expect(kept.map(e => e.d)).toEqual([BEFORE, new Date().toLocaleDateString("sv-SE")]);
    expect(kept[1].c.isbnNone).toBe(5);

    await tab(page, "stats");
    const chart = page.locator('#tab-stats [data-chart="care"]');
    await expect(chart).toBeVisible();
    await expect(chart.locator("[data-point]")).toHaveCount(2);
    await chart.locator("[data-table-toggle]").click();
    await expect(chart.locator("tbody tr")).toHaveCount(2);
  });
});
