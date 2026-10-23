/*
 * Admin page, tab "Pflege": automatic corrections of the public list (tools/source/admin/fixes.jsx, fixes-core.js).
 * Uses the synthetic test database plus a few spelling variants (VARIANTS, written per worker into TMP), so the other
 * specs keep their counts. Expected fixes: punct ("Carlsen," and the subtitle ": Lyrik /"), subtitle (equal to the
 * title), category ("jugendbuch" → "Jugendbuch"), publisher ("thienemann" → "Thienemann") = 4 books changed.
 */
const fs = require("fs");
const path = require("path");
const { test, expect, TMP } = require("./helpers.js");
const { adminSetup, unlock, load, importTest, tab, save, evaluate } = require("./admin-helpers.js");
const T = require("../helpers/testdb.js");

adminSetup();

const VARIANTS = `
  INSERT INTO verlage VALUES (5,'Carlsen,','');
  INSERT INTO bereiche VALUES (5,'jugendbuch');
  UPDATE books SET bverlag=4, butitel='Das doppelte Lottchen' WHERE bid=4;
  UPDATE books SET bverlag=5 WHERE bid=10;
  UPDATE books SET bbereich=5 WHERE bid=11;
  UPDATE books SET butitel=': Lyrik /' WHERE bid=13;
`;
const FILE = path.join(TMP, `fixes-${process.pid}.winbook`);
test.beforeAll(async () => {
  const db = await T.library();
  try {
    db.run(VARIANTS);
    fs.writeFileSync(FILE + ".part", Buffer.from(db.export()));
    fs.renameSync(FILE + ".part", FILE);
  } finally { db.close(); }
});

async function importVariants(page) {
  await load(page, FILE);
  await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
  await tab(page, "care");
  await expect(page.locator("#fixes")).toBeVisible();
}
const preview = page => page.evaluate(() => JSON.parse(localStorage.getItem("dsm-preview")).books);
const find = (books, title) => books.find(b => b.t === title);

test.describe("automatic corrections", () => {
  test("applicable fixes with examples, run: Play → running → done, the public list unified, undo", { tag: "@smoke" }, async ({ page }) => {
    await unlock(page);
    await importVariants(page);
    const rows = page.locator("#fixes [data-fix]");
    await expect(rows).toHaveCount(4);
    expect(await rows.evaluateAll(l => l.map(e => e.dataset.fix))).toEqual(["punct", "subtitle", "category", "publisher"]);
    const n = key => page.locator(`[data-fix="${key}"] [data-n]`);
    await expect(n("punct")).toHaveText("2");
    await expect(n("subtitle")).toHaveText("1");
    await expect(page.locator('[data-fix="category"]')).toContainText("jugendbuch");
    await expect(page.locator('[data-fix="category"]')).toContainText("Jugendbuch");
    await expect(page.locator('[data-fix="punct"]')).toContainText("Carlsen,");
    // Already cleaned by the import itself: shown with their counts
    await expect(page.locator('[data-auto="yearOdd"] [data-n]')).toHaveText("2");
    await expect(page.locator('[data-auto="titleSpaces"] [data-n]')).toHaveText("1");
    expect(find(await preview(page), "Émile und die Detektive").c).toBe("jugendbuch");

    const run = page.locator("#fix-run");
    await expect(run).toHaveAttribute("data-state", "idle");
    await run.click();
    await expect(run).toHaveAttribute("data-state", "running");
    await expect(page.locator("#fixes [role=progressbar]")).toBeVisible();
    await expect(run).toHaveAttribute("data-state", "done");
    await expect(run).toHaveText("Korrekturen angewendet");
    await expect(page.locator("#fix-sum")).toContainText("4 Einträge in der öffentlichen Liste vereinheitlicht");
    await expect(page.locator("#fix-on-category")).toBeDisabled();

    let books = await preview(page);
    expect(find(books, "Émile und die Detektive").c).toBe("Jugendbuch");
    expect(find(books, "Das doppelte Lottchen").p).toBe("Thienemann");
    expect(find(books, "Das doppelte Lottchen").s).toBeUndefined();
    expect(find(books, "„Zitat am Anfang“").p).toBe("Carlsen");
    expect(find(books, "Anonyme Gedichte").s).toBe("Lyrik");
    expect(JSON.stringify(books)).not.toContain("jugendbuch");

    // Switching tabs keeps the result
    await tab(page, "catalog");
    await tab(page, "care");
    await expect(page.locator("#fix-run")).toHaveAttribute("data-state", "done");

    await page.click("#fix-undo");
    await expect(page.locator("#fix-run")).toHaveAttribute("data-state", "idle");
    await expect(page.locator("#fix-undo")).toHaveCount(0);
    books = await preview(page);
    expect(find(books, "Émile und die Detektive").c).toBe("jugendbuch");
    expect(find(books, "Das doppelte Lottchen").s).toBe("Das doppelte Lottchen");
  });

  test("a deselected fix stays out; the corrected list is published with books.js", async ({ page }) => {
    await unlock(page);
    await importVariants(page);
    await page.click("#fix-on-category");
    await expect(page.locator("#fix-on-category")).toHaveAttribute("data-state", "unchecked");
    await page.click("#fix-run");
    await expect(page.locator("#fix-run")).toHaveAttribute("data-state", "done");
    await expect(page.locator("#fix-sum")).toContainText("3 Einträge");
    const books = await preview(page);
    expect(find(books, "Émile und die Detektive").c).toBe("jugendbuch");
    expect(find(books, "Das doppelte Lottchen").p).toBe("Thienemann");

    await page.click("#fix-to-catalog");
    await expect(page.locator("#tab-catalog")).toBeVisible();
    const lib = evaluate(await save(page, "#dl"), "DSM_LIBRARY");
    expect(find(lib.books, "„Zitat am Anfang“").p).toBe("Carlsen");
    expect(find(lib.books, "Das doppelte Lottchen").s).toBeUndefined();
    expect(find(lib.books, "Émile und die Detektive").c).toBe("jugendbuch");
    // Published: the corrected list is the new base, only the deselected fix is left
    await tab(page, "care");
    await expect(page.locator("#fixes [data-fix]")).toHaveCount(1);
    await expect(page.locator('#fixes [data-fix="category"]')).toBeVisible();
    await expect(page.locator("#fix-run")).toHaveAttribute("data-state", "idle");
  });

  test("nothing to fix: note instead of the button, the cleaned rows lead to their correction list", async ({ page }) => {
    await unlock(page);
    await importTest(page);
    await tab(page, "care");
    await expect(page.locator("#fix-none")).toBeVisible();
    await expect(page.locator("#fix-run")).toHaveCount(0);
    await expect(page.locator("#fixes [data-fix]")).toHaveCount(0);
    await page.click('[data-list="yearOdd"]');
    await expect(page.locator('[data-check="yearOdd"] button[aria-expanded]')).toHaveAttribute("aria-expanded", "true");
  });

  test("reduced motion: no spin, straight to done", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await unlock(page);
    await importVariants(page);
    await page.click("#fix-run");
    await expect(page.locator("#fix-run")).toHaveAttribute("data-state", "done");
    await expect(page.locator("#fix-sum")).toContainText("4 Einträge");
  });
});
