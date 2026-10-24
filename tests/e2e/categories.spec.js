// Filter by category: dialog with groups (parent term before " - "/": "), filter pill [filter | ×] next to the search, together with the search.
const { test, expect, PHONE, open, swipe, restingTop, data, hits, OFF } = require("./helpers.js");

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
  test("the parent term selects the whole group, the filter button names the choice, × clears it", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    const fantasy = inGroup("Fantasy");
    expect(fantasy.length).toBeGreaterThan(inCat("Fantasy").length);
    await choose(page, "g:Fantasy");
    await expect(page.locator("#list .row")).toHaveCount(fantasy.length);
    await expect(page.locator("#meta")).toHaveText(`${num(fantasy.length)} Treffer`);
    await expect(page.locator("#cat-btn")).toHaveAttribute("aria-label", "Nach Kategorie filtern: Fantasy");
    await expect(page.locator("#cat-btn .cat-label")).toHaveText("Fantasy");
    await expect(page.locator("#cat-btn")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".cat-pill")).toHaveClass(/\bon\b/);
    await page.click("#cat-clear");
    await expect(page.locator(".cat-pill")).not.toHaveClass(/\bon\b/);
    await expect(page.locator("#cat-btn")).toBeFocused();
    await expect.poll(() => page.locator(".cat-x").evaluate(e => e.offsetWidth)).toBe(0);
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
    await expect(page.locator("#cat-btn")).toHaveAttribute("aria-label", /: Fantasy - Magie$/);
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

  test("together with the search; nothing found → note about the category", { tag: "@smoke" }, async ({ page }) => {
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

  test("desktop: hovering the filter reveals the category in one word, the search gives way", async ({ page }) => {
    await open(page);
    await choose(page, "c:Wichtige Herrschergeschlechter im Mittelalter");
    await page.mouse.move(0, 0);
    const label = page.locator("#cat-btn .cat-label");
    await expect(label).toHaveText("Herrschergeschlechter");
    await expect.poll(async () => (await label.boundingBox() || { width: 0 }).width).toBe(0);
    const before = await page.locator("#q").boundingBox();
    await page.hover("#cat-btn");
    await expect.poll(async () => (await label.boundingBox() || { width: 0 }).width).toBeGreaterThan(60);
    expect((await page.locator("#q").boundingBox()).width).toBeLessThan(before.width - 60);
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
      await expect(page.locator("#cat-btn")).toHaveAttribute("aria-label", "Filtra per categoria: Avventura – Viaggi");
    });
  });

  test.describe("phone", () => {
    test.use({ ...PHONE });
    test("button next to the search without text, × beside it in the same size, no horizontal scrolling", async ({ page }) => {
      await open(page);
      const button = await page.locator(".cat-pill").boundingBox();
      const search = await page.locator("#q").boundingBox();
      expect(Math.abs(button.y - search.y)).toBeLessThan(1);
      expect(button.height).toBeGreaterThanOrEqual(44);
      expect(button.width).toBeGreaterThanOrEqual(44);
      const before = await page.locator("#q").boundingBox();
      await choose(page, "g:Historische Romane");
      await expect(page.locator("#cat-clear")).toBeVisible();
      await expect(page.locator("#cat-btn .cat-label")).not.toBeVisible();
      // × as large as the filter: both 46 px inside the 48 px pill, with a divider between them
      await expect.poll(() => page.locator(".cat-x").evaluate(e => e.offsetWidth)).toBe(47);
      expect((await page.locator("#cat-clear").boundingBox()).width).toBeCloseTo((await page.locator("#cat-btn").boundingBox()).width, 0);
      const x = await page.locator("#cat-clear").boundingBox(), after = await page.locator("#q").boundingBox();
      expect(Math.abs(x.y - button.y - 1)).toBeLessThan(1);
      expect(after.width).toBeLessThan(before.width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    // A swipe up from the half-high sheet must not stop when the sheet reaches the top: the content scrolls on
    // in the same gesture (slow drag) or takes over the momentum (fast swipe) – lib/swipe.js
    test("swipe up: the content scrolls on once the sheet is at the top", { tag: "@smoke" }, async ({ page }) => {
      await open(page);
      const d = page.locator(".categories[role=dialog]"), pane = () => d.evaluate(e => e.querySelector(":scope > .pane").scrollTop);
      await page.click("#cat-btn");
      const half = await restingTop(d);
      expect(await d.evaluate(e => { const p = e.querySelector(":scope > .pane"); return p.scrollHeight > p.clientHeight + 300; })).toBe(true);
      // slowly (5 px per step), 250 px further than the way to the top
      await swipe(page, half + 300, 50, Math.ceil((half + 250) / 5));
      expect(await restingTop(d)).toBeLessThan(20);
      expect(await d.evaluate(e => e.dataset.stage)).toBe("full");
      await expect.poll(pane).toBeGreaterThan(200);
      await page.keyboard.press("Escape");
      await expect(d).toBeHidden();
      // fast: the finger travels only 100 px, the sheet goes to the top and the content glides on
      await page.click("#cat-btn");
      const half2 = await restingTop(d);
      await swipe(page, half2 + 400, half2 + 300);
      expect(await restingTop(d)).toBeLessThan(20);
      await expect.poll(pane).toBeGreaterThan(50);
    });
  });
});
