/*
 * Admin page, command palette (tools/source/admin/palette.jsx, book-card.jsx, todos.js): Ctrl+K, "/" and the search
 * button open it; empty search = to-dos, tabs, actions; typing filters tabs, actions, help articles and books (title,
 * ISBN with hyphens); ↑/↓/Enter; Escape goes back from a book card, then clears the query, then closes. The book card
 * shows copies and maintenance entries after an import, recommends into a group and hides a cover. Phone: swipe sheet.
 */
const { test, expect, PHONE, settled, swipeStages } = require("./helpers.js");
const { adminSetup, unlock, importTest, tab } = require("./admin-helpers.js");

adminSetup();

const TODAY = new Date().toLocaleDateString("sv-SE");
const ago = days => new Date(Date.now() - days * 864e5).toLocaleDateString("sv-SE");
// Small published list: Krabat with its ISBN, a category without an Italian name
const LIB = {
  updated: TODAY, count: 3, coverage: { updated: TODAY, books: 3, isbn: 1 },
  books: [
    { t: "Krabat", a: ["Otfried Preußler"], i: ["9783522202107"], c: "Unbekannte Kategorie XY", l: ["Jugendbücher 6 Brett 5"] },
    { t: "Momo", a: ["Michael Ende"], y: "1973" },
    { t: "Tschick", a: ["Wolfgang Herrndorf"] },
  ],
};
const libScript = d => "window.DSM_LIBRARY = " + JSON.stringify(d) + ";\n";
const recsScript = groups => "window.DSM_RECOMMENDATIONS = " + JSON.stringify({ updated: TODAY, groups }) + ";\n";
const infoScript = d => "window.DSM_INFO = " + JSON.stringify(d) + ";\n";
async function files(page, { lib = LIB, groups = {}, info = null } = {}) {
  await page.route("**/books.js", r => r.fulfill({ body: libScript(lib), contentType: "text/javascript" }));
  await page.route("**/recommendations.js", r => r.fulfill({ body: recsScript(groups), contentType: "text/javascript" }));
  if (info) await page.route("**/info.js", r => r.fulfill({ body: infoScript(info), contentType: "text/javascript" }));
}

const cmd = page => page.locator("#cmd");
const q = page => page.locator("#cmd-q");
const selected = page => page.locator('#cmd-list [role="option"][aria-selected="true"]');
async function openPalette(page) {
  await page.keyboard.press("Control+k");
  await expect(cmd(page)).toBeVisible();
  await settled(page);
}

test.describe("command palette", () => {
  test("Ctrl+K: to-dos, tabs and actions; typing filters, Enter opens a tab; Escape clears, then closes", { tag: "@smoke" }, async ({ page }) => {
    await files(page);
    await unlock(page);
    await openPalette(page);
    await expect(q(page)).toBeFocused();
    await expect(page.locator('[data-cmd-group="tabs"] [role="option"]')).toHaveCount(6);
    await expect(page.locator('[data-cmd-group="actions"] [data-cmd="act:import"]')).toBeVisible();
    // to-do: the category without an Italian name, one per category
    await expect(page.locator('[data-cmd="todo:catIt"]')).toContainText("Kategorien ohne italienischen Namen");
    await expect(page.locator('[data-cmd="todo:catIt"] .cmd-n')).toHaveText("1");
    // the first option is chosen; ↓ moves the choice
    await expect(selected(page)).toHaveCount(1);
    const first = await selected(page).getAttribute("data-cmd");
    await page.keyboard.press("ArrowDown");
    expect(await selected(page).getAttribute("data-cmd")).not.toBe(first);
    await expect(q(page)).toHaveAttribute("aria-activedescendant", await selected(page).getAttribute("id"));

    // a keyword of a tab ("Ferien" → Info) finds it first, Enter opens it
    await q(page).fill("ferien");
    await expect(selected(page)).toHaveAttribute("data-cmd", "tab:info");
    await page.keyboard.press("Enter");
    await expect(cmd(page)).toBeHidden();
    await expect(page.locator("#tab-info")).toBeVisible();

    // the search button opens it as well; nothing found: a way out; Escape clears the query first
    await page.click("#cmd-btn");
    await expect(cmd(page)).toBeVisible();
    await q(page).fill("xyzxyz");
    await expect(page.locator("#cmd-empty")).toContainText("Nichts gefunden für „xyzxyz“");
    await page.keyboard.press("Escape");
    await expect(q(page)).toHaveValue("");
    await expect(cmd(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(cmd(page)).toBeHidden();

    // "/" outside a field opens it, inside a field it is a character
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press("/");
    await expect(cmd(page)).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(cmd(page)).toBeHidden();
  });

  test("books: title and ISBN with hyphens; the card after an import shows copies and maintenance entries", async ({ page }) => {
    await unlock(page);
    await importTest(page);
    await openPalette(page);
    await q(page).fill("krabat");
    await expect(page.locator('[data-cmd-group="books"] [role="option"]')).toHaveCount(1);
    await expect(selected(page)).toContainText("Krabat");
    await expect(selected(page).locator("mark").first()).toHaveText(/^krabat$/i);
    await q(page).fill("978-3-522-20210-7");
    await expect(page.locator('[data-cmd-group="books"] [role="option"]')).toHaveCount(1);
    await expect(selected(page)).toContainText("Krabat");
    await page.keyboard.press("Enter");
    const card = page.locator("#cmd-book");
    await expect(card).toBeVisible();
    await expect(card.locator("#bk-t")).toHaveText("Krabat");
    await expect(page.locator("#cmd-back")).toBeFocused();
    // two copies (numbers 1 and 2) at different locations, so both are in that maintenance list
    await expect(card.locator("#bk-copies [data-id]")).toHaveCount(2);
    await expect(card.locator('#bk-copies [data-id="1"]')).toContainText("JB 6 Pre");
    await expect(card.locator('#bk-probs [data-prob="copiesLocation"]')).toBeVisible();
    await expect(card).not.toContainText("Musterfrau");
    // Escape: back to the search with the query, then clear, then close
    await page.keyboard.press("Escape");
    await expect(card).toBeHidden();
    await expect(q(page)).toHaveValue("978-3-522-20210-7");
    await expect(q(page)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(q(page)).toHaveValue("");
    // the book opened last is offered on the empty search
    await expect(page.locator('[data-cmd-group="recent"]')).toContainText("Krabat");
    await page.keyboard.press("Escape");
    await expect(cmd(page)).toBeHidden();
  });

  test("book card: recommend into a group (saved as draft at once), hide the cover", async ({ page }) => {
    await files(page);
    await unlock(page);
    await openPalette(page);
    await q(page).fill("krabat");
    await page.keyboard.press("Enter");
    const rec = page.locator('[data-bk-rec="middle"]');
    await expect(rec).toHaveAttribute("aria-pressed", "false");
    await rec.click();
    await expect(rec).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-sonner-toast]")).toContainText("In „Mittelstufe“ aufgenommen");
    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem("dsm-recs-draft")));
    expect(draft.groups.middle.map(r => r.t)).toEqual(["Krabat"]);
    // hide the cover: the ISBN goes into the hidden covers of tab "Cover"
    await page.click("#bk-hide");
    await expect(page.locator("#bk-show")).toBeVisible();
    await expect(page.locator("#bk-cover")).toHaveAttribute("data-state", "hidden");
    // Escape: back to the search, clear "krabat", close
    for (let i = 0; i < 3; i++) await page.keyboard.press("Escape");
    await expect(cmd(page)).toBeHidden();
    await tab(page, "covers");
    await expect(page.locator('#nc-list [data-isbn="9783522202107"]')).toBeVisible();
    await tab(page, "recs");
    await expect(page.locator("#rec-list")).toContainText("Krabat");
  });

  test("to-dos: recommended book gone, expired announcement, due import; a to-do opens its tab", async ({ page }) => {
    await files(page, {
      lib: { ...LIB, updated: ago(50) },
      groups: { middle: [{ k: "verschwunden|niemand", t: "Verschwunden", a: "Niemand", de: "Text", it: "Testo" }] },
      info: {
        updated: TODAY, hours: { mon: [["08:00", "12:00"]] }, notice: { de: "", it: "" }, closures: [],
        announcement: { de: "Alte Nachricht", it: "Vecchio", color: "blue", until: ago(3) },
      },
    });
    await unlock(page);
    await openPalette(page);
    const todos = page.locator('[data-cmd-group="todo"] [role="option"]');
    // most important first: the recommendation that the website can no longer show
    await expect(todos.first()).toHaveAttribute("data-cmd", "todo:recsMissing");
    await expect(page.locator('[data-cmd="todo:import"]')).toContainText("Bestand seit 50 Tagen nicht eingelesen");
    await expect(page.locator('[data-cmd="todo:annOld"]')).toContainText("Ankündigung seit");
    await page.click('[data-cmd="todo:recsMissing"]');
    await expect(cmd(page)).toBeHidden();
    await expect(page.locator("#tab-recs")).toBeVisible();
  });

  test("help hit: opens the help on that article", async ({ page }) => {
    await files(page);
    await unlock(page);
    await openPalette(page);
    await q(page).fill("inventur barcode");
    const hit = page.locator('[data-cmd="help:howto:inventory"]');
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(page.locator("#help")).toBeVisible();
    await expect(page.locator('[data-help-section="howto"] [data-help-item="inventory"] [data-slot=accordion-content]')).toBeVisible();
  });

  test.describe("on the phone", () => {
    test.use({ ...PHONE });
    test("search button in the bar, swipe sheet with its stages", async ({ page }) => {
      await files(page);
      await unlock(page);
      await page.click("#cmd-btn");
      await expect(cmd(page)).toBeVisible();
      await settled(page);
      await swipeStages(page, cmd(page));
    });
  });
});
