/*
 * Admin page, help page (#help, tools/source/admin/help.jsx, content in help-content.js): opened via #help-btn in the
 * navigation bar; sections with navigation, search (case/accent-insensitive, marks, no-hit state), accordion articles,
 * "Zum Tab" buttons (close the help and switch the tab), "/" focuses the search, Escape closes, Italian content,
 * phone sheet with section chips and without horizontal scrolling.
 */
const { test, expect, PHONE, settled, swipeStages } = require("./helpers.js");
const { adminSetup, unlock } = require("./admin-helpers.js");

adminSetup();

const help = page => page.locator("#help");
async function openHelp(page) {
  await page.click("#help-btn");
  await expect(help(page)).toBeVisible();
  await settled(page);
}

test.describe("help page", () => {
  test("sections, search with marks, accordion, Zum Tab, Escape", { tag: "@smoke" }, async ({ page }) => {
    await unlock(page);
    await openHelp(page);
    await expect(page.locator("#help-t")).toHaveText("Hilfe");
    await expect(page.locator("[data-help-nav]")).toHaveCount(7);
    await expect(page.locator('[data-help-section="start"]')).toContainText("Die monatliche Routine");
    for (const id of ["howto", "problems", "faq", "practice", "terms", "about", "start"]) {
      await page.click(`[data-help-nav="${id}"]`);
      await expect(page.locator(`[data-help-section="${id}"]`)).toBeVisible();
      await expect(page.locator(`[data-help-nav="${id}"]`)).toHaveAttribute("aria-current", "true");
    }

    // "/" jumps into the search
    await page.click('[data-help-section="start"] .help-intro');
    await page.keyboard.press("/");
    await expect(page.locator("#help-q")).toBeFocused();

    // FAQ: at least 12 questions, an answer opens
    await page.click('[data-help-nav="faq"]');
    expect(await page.locator('[data-help-section="faq"] [data-help-item]').count()).toBeGreaterThanOrEqual(12);
    const q = page.locator('[data-help-section="faq"] [data-help-item="students"]');
    await q.locator("[data-slot=accordion-trigger]").click();
    await expect(q.locator("[data-slot=accordion-content]")).toContainText("Ausleihstatus");

    // Search across all sections: hits open and marked, the rest filtered out
    await page.fill("#help-q", "Cover");
    await expect(page.locator("#help-count")).toHaveText(/^\d+ Treffer$/);
    await expect(page.locator('[data-help-section="howto"] [data-help-item="covers"] [data-slot=accordion-content]')).toBeVisible();
    await expect(page.locator('[data-help-section="faq"] [data-help-item="loan"]')).toHaveCount(0);
    await expect(help(page).locator("mark").first()).toHaveText(/^cover$/i);
    // case and accents don't matter
    await page.fill("#help-q", "OFFNUNGSZEITEN");
    await expect(help(page).locator("mark").first()).toHaveText(/^Öffnungszeiten$/i);
    // no hit: a way back into the sections
    await page.fill("#help-q", "xyzxyz");
    await expect(page.locator("#help-empty")).toContainText("Keine Treffer für „xyzxyz“");
    await page.click('[data-help-browse="start"]');
    await expect(page.locator("#help-q")).toHaveValue("");
    await expect(page.locator('[data-help-section="start"]')).toBeVisible();

    // "Zum Tab": closes the help and shows the tab
    await page.click('[data-help-section="start"] [data-help-tab="care"]');
    await expect(help(page)).toBeHidden();
    await expect(page.locator("#tab-care")).toBeVisible();

    // Escape closes
    await openHelp(page);
    await page.keyboard.press("Escape");
    await expect(help(page)).toBeHidden();
  });

  test("Italian: content and search follow the language", async ({ page }) => {
    await unlock(page);
    await page.click('.seg [data-lang="it"]');
    await openHelp(page);
    await expect(page.locator("#help-t")).toHaveText("Aiuto");
    await expect(page.locator('[data-help-nav="start"]')).toHaveText("Primi passi");
    await expect(page.locator('[data-help-section="start"]')).toContainText("La routine mensile");
    await expect(page.locator('[data-help-section="start"] [data-help-tab="catalog"]').first()).toContainText("Vai alla scheda «Catalogo»");
    await page.fill("#help-q", "copertine");
    await expect(page.locator("#help-count")).toHaveText(/^(\d+ risultati|1 risultato)$/);
    await expect(help(page).locator("mark").first()).toHaveText(/^copertine$/i);
    // switch back with the help open (the button lies behind the modal dialog, hence via script)
    await page.evaluate(() => document.querySelector('.seg [data-lang="de"]').click());
    await expect(page.locator("#help-t")).toHaveText("Hilfe");
    await expect(page.locator("#help-count")).toBeEmpty();
  });

  test.describe("phone", () => {
    test.use({ ...PHONE });

    test("sheet with section chips, no horizontal scrolling, swipe stages", async ({ page }) => {
      await unlock(page);
      await openHelp(page);
      const sheet = help(page);
      // the chips scroll inside their row; page, sheet and content don't scroll sideways
      expect(await page.locator(".help-nav").evaluate(n => n.scrollWidth > n.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      expect(await sheet.evaluate(d => d.scrollWidth <= d.clientWidth + 1)).toBe(true);
      expect(await sheet.evaluate(d => { const p = d.querySelector(".pane"); return p.scrollWidth <= p.clientWidth + 1; })).toBe(true);
      await page.click('[data-help-nav="terms"]');
      await expect(page.locator('[data-help-section="terms"]')).toBeVisible();
      await expect(page.locator('[data-help-nav="terms"]')).toHaveAttribute("aria-current", "true");
      await settled(page);
      await swipeStages(page, sheet);
    });
  });
});
