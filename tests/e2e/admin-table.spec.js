/*
 * Admin page, table viewer (tools/source/admin/table-view.jsx): opened from tab "Pflege" (#m-table) after an import of the
 * synthetic test database (10 copies, 8 public books). Dataset switch, search (accents ignored), sorting with aria-sort,
 * list filter, details with the hint of a list, column toggles, CSV/Excel of the current view; several problems of one
 * copy stacked (variable row heights), the detail panel flying out (data-state "closed") before it unmounts, fullscreen;
 * phone: cards, folded filters, no horizontal scroll, no fullscreen button, swipe stages.
 */
const { test, expect, PHONE, settled, swipeStages } = require("./helpers.js");
const { adminSetup, unlock, importTest, tab, downloadFile, menusClosed } = require("./admin-helpers.js");

adminSetup();

const rows = text => text.replace(/^﻿/, "").trim().split("\r\n").map(l => l.split(";"));
async function openTable(page) {
  await unlock(page);
  await importTest(page);
  await tab(page, "care");
  await page.click("#m-table");
  await expect(page.locator("#table-view")).toBeVisible();
  await settled(page);
}
const count = page => page.locator("#tv-count");
const firstCell = page => page.locator('.tv-row[data-i="0"] [role="cell"]').first();

test.describe("table viewer", () => {
  test("copies: search, sorting, list filter, details, public list", { tag: "@smoke" }, async ({ page }) => {
    await openTable(page);
    const dlg = page.locator("#table-view");
    await expect(dlg.locator("#tv-title")).toHaveText("Datentabelle");
    await expect(page.locator("#tv-hint")).toHaveCount(0);
    await expect(dlg).not.toContainText("nichts davon wird veröffentlicht");
    await expect(page.locator('#tv-set [data-set="records"]')).toHaveAttribute("aria-checked", "true");
    await expect(count(page)).toHaveText("10 von 10");
    await expect(dlg.locator('[role="table"]')).toBeVisible();

    // search: all terms, accents and case ignored
    await page.fill("#tv-search", "emile DETEKTIVE");
    await expect(count(page)).toHaveText("1 von 10");
    await expect(page.locator(".tv-row")).toHaveCount(1);
    await expect(page.locator(".tv-row").first()).toContainText("Émile und die Detektive");
    await page.fill("#tv-search", "krabat");
    await expect(count(page)).toHaveText("2 von 10");
    await page.fill("#tv-search", "gibt es nicht");
    await expect(page.locator("#tv-none")).toContainText("Keine Treffer");
    await page.click("#tv-reset");
    await expect(count(page)).toHaveText("10 von 10");

    // sorting: none → ascending → descending → none
    const th = page.locator('.tv-th[data-col="id"]');
    await expect(th).toHaveAttribute("aria-sort", "none");
    await th.locator("button").click();
    await expect(th).toHaveAttribute("aria-sort", "ascending");
    await expect(firstCell(page)).toHaveText("1");
    await th.locator("button").click();
    await expect(th).toHaveAttribute("aria-sort", "descending");
    await expect(firstCell(page)).toHaveText("14");
    await th.locator("button").click();
    await expect(th).toHaveAttribute("aria-sort", "none");

    // list filter, chip, details with the hint; Escape closes only the details
    await page.click("#tv-list");
    await page.getByRole("option", { name: /Ungültige ISBN/ }).click();
    await expect(count(page)).toHaveText("1 von 10");
    const row = page.locator('.tv-row[data-i="0"]');
    await expect(row).toContainText("Das doppelte Lottchen");
    await expect(row.locator('.tv-chip[data-list="isbnBad"]')).toBeVisible();
    await row.click();
    const detail = page.locator("#tv-detail");
    await expect(detail).toContainText("Prüfziffer oder Länge stimmt nicht");
    await expect(detail).toContainText("9783522202100");
    await page.keyboard.press("Escape");
    await expect(detail).toHaveCount(0);
    await expect(dlg).toBeVisible();

    // public list: the filter stays (the book inherits the lists of its copies), ISBN column
    await page.click('#tv-set [data-set="books"]');
    await expect(page.locator('#tv-set [data-set="books"]')).toHaveAttribute("aria-checked", "true");
    await expect(count(page)).toHaveText("1 von 8");
    await page.click("#tv-reset");
    await expect(count(page)).toHaveText("8 von 8");
    await expect(page.locator('.tv-th[data-col="i"]')).toBeVisible();
    await page.fill("#tv-search", "lottchen");
    await expect(count(page)).toHaveText("1 von 8");
    await expect(page.locator("#table-view")).not.toContainText("Musterfrau");

    // Escape: details, then the dialog
    await page.keyboard.press("Escape"); // clears the search (focus in it)
    await expect(count(page)).toHaveText("8 von 8");
    await page.keyboard.press("Escape");
    await expect(dlg).toBeHidden();
  });

  test("keyboard: arrows move between rows, Enter opens the details", async ({ page }) => {
    await openTable(page);
    await page.locator('.tv-row[data-i="0"]').focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator('.tv-row[data-i="1"]')).toBeFocused();
    await expect(page.locator('.tv-row[data-i="1"]')).toHaveAttribute("tabindex", "0");
    await page.keyboard.press("End");
    await expect(page.locator('.tv-row[data-i="9"]')).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#tv-detail")).toBeVisible();
    await page.click("#tv-detail-x");
    await expect(page.locator("#tv-detail")).toHaveCount(0);
    await expect(page.locator('.tv-row[data-i="9"]')).toBeFocused();
  });

  test("columns can be hidden; CSV and Excel of the current view", async ({ page }) => {
    await openTable(page);
    await page.click("#tv-cols");
    await page.click('[role="menuitemcheckbox"][data-col="p"]');
    await expect(page.locator('.tv-th[data-col="p"]')).toHaveCount(0);
    await page.keyboard.press("Escape"); // only the menu
    await expect(page.locator("#table-view")).toBeVisible();

    await page.click("#tv-list");
    await page.getByRole("option", { name: /Ungültige ISBN/ }).click();
    await menusClosed(page);
    await page.click("#tv-export");
    const { name, text } = await downloadFile(page, "#tv-csv");
    expect(name).toMatch(/^exemplare-winbook-\d{4}-\d\d-\d\d\.csv$/);
    expect(text.startsWith("﻿")).toBe(true);
    const r = rows(text);
    expect(r).toHaveLength(2);
    expect(r[0][0]).toBe("Nr.");
    expect(r[0]).not.toContain("Verlag");
    expect(r[1][0]).toBe("4");
    expect(r[1][1]).toBe("Das doppelte Lottchen");
    expect(r[1][r[1].length - 1]).toBe("Ungültige ISBN (9783522202100)");

    await menusClosed(page);
    await page.click("#tv-export");
    const x = await downloadFile(page, "#tv-xlsx");
    expect(x.name).toMatch(/^exemplare-winbook-\d{4}-\d\d-\d\d\.xlsx$/);
    expect(x.text.startsWith("PK")).toBe(true);
  });

  test("several problems stacked, details fly out before they go, fullscreen", async ({ page }) => {
    await openTable(page);
    const dlg = page.locator("#table-view");

    // one chip per line: same left edge, different tops, all inside a row that is taller than a row with fewer chips
    const many = page.locator(".tv-row", { hasText: "Anonyme Gedichte" });
    const few = page.locator(".tv-row", { hasText: "Das doppelte Lottchen" });
    const chips = many.locator(".tv-chip");
    expect(await chips.count()).toBeGreaterThan(1);
    expect(await few.locator(".tv-chip").count()).toBeLessThan(await chips.count());
    const boxes = await chips.evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, b: r.bottom }; }));
    expect(new Set(boxes.map(b => Math.round(b.y))).size).toBe(boxes.length);
    expect(new Set(boxes.map(b => Math.round(b.x))).size).toBe(1);
    const row = await many.boundingBox();
    expect(Math.max(...boxes.map(b => b.b))).toBeLessThanOrEqual(row.y + row.height + 0.5);
    expect(Math.min(...boxes.map(b => b.y))).toBeGreaterThanOrEqual(row.y - 0.5);
    expect(row.height).toBeGreaterThan((await few.boundingBox()).height);
    // the chip text never wraps; the full list name is in its title
    for (const el of await chips.all()) {
      expect((await el.boundingBox()).height).toBeLessThanOrEqual(25);
      await expect(el).toHaveAttribute("title", /\S/);
    }

    // details: open (data-state "open"), close = data-state "closed" while flying out, then gone
    await few.click();
    const detail = page.locator("#tv-detail");
    await expect(detail).toHaveAttribute("data-state", "open");
    await page.evaluate(() => {
      const d = document.getElementById("tv-detail");
      window.__tvClosed = false;
      new MutationObserver(() => { if (d.getAttribute("data-state") === "closed") window.__tvClosed = true; })
        .observe(d, { attributes: true, attributeFilter: ["data-state"] });
    });
    await page.click("#tv-detail-x");
    await expect(detail).toHaveCount(0);
    expect(await page.evaluate(() => window.__tvClosed)).toBe(true);

    // fullscreen: round button directly left of ×, toggles class "full" and aria-pressed, the sheet fills the viewport
    const full = dlg.locator("[data-fullscreen]");
    await expect(full).toHaveAttribute("aria-pressed", "false");
    await expect(full).toHaveAttribute("aria-label", "Vollbild");
    const b = await full.boundingBox(), x = await dlg.locator(".close").boundingBox();
    expect(Math.abs(b.y - x.y)).toBeLessThan(1);
    expect(b.x + b.width).toBeLessThanOrEqual(x.x + 0.5);
    expect(x.x - (b.x + b.width)).toBeLessThan(12);
    const vp = page.viewportSize();
    const rect = async () => { const r = await dlg.boundingBox(); return [r.x, r.y, r.width, r.height].map(Math.round); };
    await full.click();
    await expect(dlg).toHaveClass(/\bfull\b/);
    await expect(full).toHaveAttribute("aria-pressed", "true");
    await expect(full).toHaveAttribute("aria-label", "Vollbild beenden");
    await expect.poll(rect).toEqual([0, 0, vp.width, vp.height]);
    await expect(page.locator('.tv-row[data-i="0"]')).toBeVisible();
    await expect(page.locator(".tv-row")).toHaveCount(10);
    await full.click();
    await expect(dlg).not.toHaveClass(/\bfull\b/);
    await expect(full).toHaveAttribute("aria-pressed", "false");
    await expect.poll(async () => (await rect())[2]).toBeLessThan(vp.width);
    await page.keyboard.press("Escape");
    await expect(dlg).toBeHidden();
  });
});

test.describe("table viewer on the phone", () => {
  test.use({ ...PHONE });
  test("cards, folded filters, no horizontal scroll, swipe stages", async ({ page }) => {
    await openTable(page);
    const sheet = page.locator("#table-view");
    await expect(page.locator(".tv-card").first()).toBeVisible();
    await expect(page.locator(".tv-row")).toHaveCount(0);
    await expect(page.locator('[role="table"]')).toHaveCount(0);
    await expect(page.locator("[data-fullscreen]")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await sheet.evaluate(d => { const p = d.querySelector(":scope > .pane"); return p.scrollWidth <= p.clientWidth; })).toBe(true);
    const box = await sheet.boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);

    await expect(page.locator("#tv-filters")).toHaveCount(0);
    await page.click("#tv-filter");
    await expect(page.locator("#tv-filters")).toBeVisible();
    await page.click("#tv-filter");
    await expect(page.locator("#tv-filters")).toHaveCount(0);
    await settled(page);
    await swipeStages(page, sheet);
  });
});
