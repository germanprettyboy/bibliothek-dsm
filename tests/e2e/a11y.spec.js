/*
 * Accessibility (axe-core, WCAG 2.1 A/AA) of every view: list in light, dark and high contrast, phone, all dialogs,
 * admin page locked and unlocked. A violation lists rule, impact and the first elements.
 */
const path = require("path");
const AxeBuilder = require("@axe-core/playwright").default;
const { test, expect, open, settled, PHONE, TMP } = require("./helpers.js");

async function violations(page) {
  await settled(page); // contrast is measured on the final colors, not in the middle of a fade-in
  // the list: only its first chunk (≤ 40 rows, all alike) – the whole catalog takes axe longer than the test timeout
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude("#list .rows > ul ~ ul").analyze();
  return r.violations.map(v => `${v.id} (${v.impact}): ${v.help} – ${v.nodes.slice(0, 3).map(n => n.target.join(" ")).join(" | ")}`);
}
const RECS = JSON.stringify({ want: true, group: "middle" });
const INFO = JSON.stringify({ updated: "2026-10-01", hours: { mon: [["08:00", "16:00"]], tue: [], wed: [["08:00", "16:00"]], thu: [], fri: [], sat: [] },
  notice: { de: "Hinweis", it: "Avviso" }, closures: [{ type: "holiday", from: "2026-12-21", to: "2027-01-06", de: "", it: "" }] });

test.describe("accessibility", () => {
  // axe checks DOM, ARIA and computed colors – the same in every engine; in Firefox/WebKit it only exceeds the timeout
  test.skip(({ browserName }) => browserName !== "chromium", "axe once, in Chromium");
  // axe takes 8–15 s per run on the shared 2-core runner, several tests run it twice: more than the default 30 s
  test.describe.configure({ timeout: 90000 });
  test.use({ storage: { "dsm-recs": RECS } });

  for (const [name, extra] of [["light", {}], ["dark", { "dsm-theme": "dark" }], ["high contrast", { "dsm-contrast": "high" }],
    ["larger text", { "dsm-font": "large" }], ["Italian", { "dsm-lang": "it" }]]) {
    test(`list with recommendations and info card: ${name}`, async ({ page }) => {
      await page.addInitScript(([e, i]) => {
        for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v);
        localStorage.setItem("dsm-preview-info", i);
      }, [extra, INFO]);
      await open(page, "index.html#preview");
      await expect(page.locator("#recs")).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
  }

  test("search with hits and highlighting", async ({ page }) => {
    await open(page);
    await page.fill("#q", "tschick");
    await expect(page.locator("#meta")).toHaveText(/Treffer$/);
    expect(await violations(page)).toEqual([]);
  });

  // one test per dialog: three axe runs next to the list did not fit into one test timeout on the 2-core runner
  for (const [name, show] of [
    ["detail", async page => { await page.locator("#list .row").nth(2).click(); await expect(page.locator("#detail")).toBeVisible(); }],
    ["settings", async page => { await page.click(".settings-btn"); await expect(page.locator(".settings[role=dialog]")).toBeVisible(); }],
    ["settings with the background controls", async page => {
      await page.click(".settings-btn");
      await page.locator("#s-bg").check();
      await expect(page.locator("#bg-preview")).toBeVisible();
    }],
    ["categories", async page => { await page.click("#cat-btn"); await expect(page.getByRole("dialog")).toBeVisible(); }],
  ]) {
    test(`dialog: ${name}`, async ({ page }) => {
      await open(page);
      await show(page);
      expect(await violations(page)).toEqual([]);
    });
  }

  test.describe("first visit", () => {
    test.use({ storage: {} });
    test("questions", async ({ page }) => {
      await open(page);
      await expect(page.locator(".ask[role=dialog]")).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
  });

  test.describe("phone", () => {
    test.use({ ...PHONE });
    test("list and detail sheet", async ({ page }) => {
      await open(page);
      expect(await violations(page), "list").toEqual([]);
      await page.locator("#list .row").nth(2).click();
      await expect(page.locator("#detail")).toBeVisible();
      expect(await violations(page), "detail").toEqual([]);
    });
  });

  test("admin page: locked and unlocked", async ({ page, context }) => {
    await context.route("**/assets/admin.enc.js", r => r.fulfill({ path: path.join(TMP, "admin.enc.js"), contentType: "text/javascript" }));
    await page.goto("admin.html");
    await expect(page.locator("#pw")).toBeVisible();
    expect(await violations(page), "lock").toEqual([]);
    await page.fill("#pw", "test-password");
    await page.click("#unlock");
    await expect(page.locator("#app")).toBeVisible({ timeout: 15000 });
    expect(await violations(page), "admin app").toEqual([]);
  });
});
