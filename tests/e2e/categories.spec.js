// Filter by category: dialog with groups (parent term before " - "/": "), chip above the list, together with the search.
const { test, expect, open, data, hits, OFF } = require("./helpers.js");

const { B, C } = data();
const parent = k => (/^(.+?)(?: - |: )(.+)$/.exec(k) || [, k])[1];
const inGroup = p => B.books.filter(b => b.c && parent(b.c) === p);
const inCat = k => B.books.filter(b => b.c === k);
const num = n => n.toLocaleString("de-DE");

async function choose(page, id) {
  await page.click("#cat-btn");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator(`[data-cat="${id}"]`).click();
  await expect(dialog).toHaveCount(0);
}

test.describe("categories", () => {
  test("the parent term selects the whole group, the chip shows the choice, × clears it", async ({ page }) => {
    await open(page);
    const fantasy = inGroup("Fantasy");
    expect(fantasy.length).toBeGreaterThan(inCat("Fantasy").length);
    await choose(page, "g:Fantasy");
    await expect(page.locator("#list .row")).toHaveCount(fantasy.length);
    await expect(page.locator("#meta")).toHaveText(`${num(fantasy.length)} Treffer`);
    await expect(page.locator(".cat-chip")).toContainText("Fantasy");
    await expect(page.locator("#cat-btn")).toHaveAttribute("aria-pressed", "true");
    await page.click("#cat-clear");
    await expect(page.locator(".cat-chip")).toHaveCount(0);
    await expect(page.locator("#list .row")).toHaveCount(B.books.length);
    await expect(page.locator("#meta")).toHaveText(`${num(B.books.length)} Bücher`);
  });

  test("dialog: count per entry, subcategories indented, the chosen one marked", async ({ page }) => {
    await open(page);
    await page.click("#cat-btn");
    const d = page.getByRole("dialog");
    await expect(d.locator('[data-cat="all"]')).toHaveAttribute("aria-pressed", "true");
    await expect(d.locator('[data-cat="all"]')).toContainText(num(B.books.length));
    await expect(d.locator('[data-cat="g:Fantasy"]')).toContainText(String(inGroup("Fantasy").length));
    const magic = d.locator('[data-cat="c:Fantasy - Magie"]');
    await expect(magic).toHaveClass(/sub/);
    await expect(magic.locator("span").first()).toHaveText("Magie");
    // the category consisting only of the parent term is called "allgemein" inside the group
    await expect(d.locator('[data-cat="c:Fantasy"] span').first()).toHaveText("allgemein");
    await magic.click();
    await expect(page.locator("#list .row")).toHaveCount(inCat("Fantasy - Magie").length);
    await expect(page.locator(".cat-chip")).toContainText("Fantasy - Magie");
    await page.click("#cat-btn");
    await expect(page.getByRole("dialog").locator('[data-cat="c:Fantasy - Magie"]')).toHaveAttribute("aria-pressed", "true");
  });

  test("search in the dialog: a subcategory is found under its parent term, nothing → note", async ({ page }) => {
    await open(page);
    await page.click("#cat-btn");
    const d = page.getByRole("dialog");
    await d.locator("#cat-q").fill("magie");
    await expect(d.locator('[data-cat="g:Fantasy"]')).toBeVisible();
    await expect(d.locator('[data-cat="c:Fantasy - Magie"]')).toBeVisible();
    await expect(d.locator('[data-cat="c:Fantasy - Drachen"]')).toHaveCount(0);
    await expect(d.locator('[data-cat="all"]')).toHaveCount(0);
    await d.locator("#cat-q").fill("xqzw");
    await expect(d).toContainText("Keine Kategorie gefunden.");
    // Escape first clears the search, doesn't close
    await d.locator("#cat-q").press("Escape");
    await expect(d.locator("#cat-q")).toHaveValue("");
    await expect(d).toBeVisible();
  });

  test("together with the search; nothing found → note about the category", async ({ page }) => {
    await open(page);
    await choose(page, "g:Fantasy");
    await page.fill("#q", "drache");
    const expected = hits(inGroup("Fantasy"), "drache");
    expect(expected.length).toBeGreaterThan(0);
    await expect(page.locator("#list .row")).toHaveCount(expected.length);
    await page.fill("#q", "xqzwxqzw");
    await expect(page.locator("#list .empty")).toContainText("In dieser Kategorie nichts gefunden");
  });

  test("a book from the filtered list opens the right detail", async ({ page }) => {
    await open(page);
    await choose(page, "g:Fantasy");
    const row = page.locator("#list .row").nth(2);
    const title = await row.locator(".t").textContent();
    await row.click();
    await expect(page.locator("#d-title")).toHaveText(title);
    await expect(page.getByRole("dialog")).toContainText(/Fantasy/);
  });

  test.describe("Italian", () => {
    test.use({ storage: { "dsm-recs": OFF, "dsm-lang": "it" } });
    test("names from categories-it.js, also for the parent term and the subcategory", async ({ page }) => {
      await open(page);
      await page.click("#cat-btn");
      const d = page.getByRole("dialog");
      await expect(d.getByRole("heading")).toHaveText("Categorie");
      expect(C["Abenteuer - Reise"]).toBe("Avventura – Viaggi");
      await expect(d.locator('[data-cat="g:Abenteuer"] span').first()).toHaveText("Avventura");
      await expect(d.locator('[data-cat="c:Abenteuer - Reise"] span').first()).toHaveText("Viaggi");
      await d.locator('[data-cat="c:Abenteuer - Reise"]').click();
      await expect(page.locator(".cat-chip")).toContainText("Avventura – Viaggi");
    });
  });

  test.describe("phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    test("button next to the search without text, no horizontal scrolling with a chip", async ({ page }) => {
      await open(page);
      const button = await page.locator("#cat-btn").boundingBox();
      const search = await page.locator("#q").boundingBox();
      expect(Math.abs(button.y - search.y)).toBeLessThan(1);
      expect(button.height).toBeGreaterThanOrEqual(44);
      expect(button.width).toBeGreaterThanOrEqual(44);
      await choose(page, "g:Historische Romane");
      await expect(page.locator(".cat-chip")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});
