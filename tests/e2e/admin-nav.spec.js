/*
 * Admin page, navigation bar (tools/source/admin/nav.jsx): six tabs with icons and names, a pill that glides behind the
 * active tab, search, help and lock with sliding labels; the bar floats sticky 12 px below the top edge; phones: one row,
 * icons only.
 */
const { test, expect, PHONE, settled } = require("./helpers.js");
const { adminSetup, unlock, tab } = require("./admin-helpers.js");

adminSetup();

const NAMES = ["Bestand", "Pflege", "Cover", "Empfehlungen", "Info", "Statistik"];
const nav = page => page.locator(".adm-nav");
// Left edge of the pill (current transform)
const pillX = page => page.locator(".adm-pill").evaluate(p => new DOMMatrix(getComputedStyle(p).transform).m41);
// Largest distance between the pill's box and the active tab's box (left edge, width)
const pillOff = page => page.evaluate(() => {
  const p = document.querySelector(".adm-pill").getBoundingClientRect();
  const a = document.querySelector('.tabs [data-tab][data-state="active"]').getBoundingClientRect();
  return Math.max(Math.abs(p.left - a.left), Math.abs(p.width - a.width));
});
const tops = page => page.locator(".tabs [data-tab], #cmd-btn, #help-btn, #lock-btn")
  .evaluateAll(t => t.map(e => Math.round(e.getBoundingClientRect().top)));
const noSideScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
// Tall tab content, so the page can scroll far below the bar
const tall = page => page.evaluate(() => { document.querySelector("#tab-catalog").style.minHeight = "3000px"; });

test.describe("admin navigation", () => {
  test("six named tabs; switching moves the pill under the active tab", { tag: "@smoke" }, async ({ page }) => {
    await unlock(page);
    await expect(page.getByRole("tab")).toHaveCount(6);
    for (const [i, n] of NAMES.entries()) await expect(page.getByRole("tab").nth(i)).toHaveAccessibleName(n);
    await expect(nav(page)).toHaveAttribute("data-active", "catalog");
    await expect.poll(() => pillOff(page)).toBeLessThan(2);
    const x0 = await pillX(page);
    await tab(page, "recs");
    await expect(nav(page)).toHaveAttribute("data-active", "recs");
    await expect(page.locator('.tabs [data-tab="recs"]')).toHaveAttribute("aria-selected", "true");
    await expect.poll(() => pillX(page)).toBeGreaterThan(x0 + 100);
    await expect.poll(() => pillOff(page)).toBeLessThan(2);
    // help and lock in the same row as the tabs
    expect(new Set(await tops(page)).size).toBe(1);
  });

  test("keyboard: arrows move between the tabs", async ({ page }) => {
    await unlock(page);
    await page.locator('.tabs [data-tab="catalog"]').focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#tab-care")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#tab-catalog")).toBeVisible();
  });

  test("desktop: bar over the full content width, labels slide out on hover", async ({ page }) => {
    await unlock(page);
    await expect(nav(page)).not.toHaveAttribute("data-fit", "none");
    const [bar, col] = await page.evaluate(() => {
      const m = document.querySelector("main.wrap"), s = getComputedStyle(m);
      return [document.querySelector(".adm-nav").getBoundingClientRect().width, m.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)];
    });
    expect(Math.abs(bar - col)).toBeLessThan(1);
    const label = sel => page.locator(`${sel} .adm-lbl`).evaluate(e => e.getBoundingClientRect().width);
    expect(await label("#lock-btn")).toBeLessThan(1);
    await page.hover("#lock-btn");
    await expect.poll(() => label("#lock-btn")).toBeGreaterThan(30);
    // the active tab shows its name; with the room of a computer (1280 px) the first five tabs keep theirs written out
    expect(await label('.tabs [data-state="active"]')).toBeGreaterThan(30);
    await expect(nav(page)).toHaveAttribute("data-fit", /^(lead|all)$/);
    await page.mouse.move(0, 0);
    await expect.poll(() => label('.tabs [data-tab="recs"]')).toBeGreaterThan(30);
    // every item is at least 44 px high
    const heights = await page.locator(".tabs [data-tab], #cmd-btn, #help-btn, #lock-btn").evaluateAll(t => t.map(e => e.getBoundingClientRect().height));
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
  });

  test("search button opens the command palette; its name says the shortcut", async ({ page }) => {
    await unlock(page);
    await expect(page.locator("#cmd-btn")).toHaveAccessibleName("Suchen");
    await expect(page.locator("#cmd-btn")).toHaveAttribute("aria-keyshortcuts", /^(Control|Meta)\+K$/);
    await page.click("#cmd-btn");
    await expect(page.locator("#cmd")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#cmd")).toBeHidden();
  });

  test("help button opens the help page", async ({ page }) => {
    await unlock(page);
    await expect(page.locator("#help-btn")).toHaveAccessibleName("Hilfe");
    await page.click("#help-btn");
    await expect(page.locator("#help")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#help")).toBeHidden();
  });

  test("lock button locks", async ({ page }) => {
    await unlock(page);
    await expect(page.locator("#lock-btn")).toHaveAccessibleName("Sperren");
    await page.click("#lock-btn");
    await expect(page.locator("#lock")).toBeVisible();
    await expect(page.locator("#app")).toBeHidden();
  });
});

test.describe("admin navigation on the phone", () => {
  test.use({ ...PHONE });

  test("one row of icons without horizontal scrolling; the bar floats 12 px below the top", async ({ page }) => {
    await unlock(page);
    await expect(nav(page)).toHaveAttribute("data-fit", "none");
    expect(await noSideScroll(page)).toBe(true);
    expect(new Set(await tops(page)).size).toBe(1);
    await tab(page, "info");
    await settled(page);
    expect(await noSideScroll(page)).toBe(true);
    await expect.poll(() => pillOff(page)).toBeLessThan(2);
    await tab(page, "catalog");
    await tall(page);
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" }));
    await expect.poll(() => nav(page).evaluate(e => Math.round(e.getBoundingClientRect().top))).toBe(12);
  });

  test("320 px: still one row without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await unlock(page);
    expect(await noSideScroll(page)).toBe(true);
    expect(new Set(await tops(page)).size).toBe(1);
    const right = await page.locator("#lock-btn").evaluate(e => e.getBoundingClientRect().right);
    expect(right).toBeLessThanOrEqual(320);
  });
});
