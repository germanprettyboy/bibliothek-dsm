/*
 * Announcement banner at the top of the book list (info.js "announcement"): floats in, pushes the page down,
 * × / Esc collapses it, closed stays closed for the same text, a new text shows again.
 */
const { test, expect, open } = require("./helpers.js");

const HOURS = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] };
const info = a => `window.DSM_INFO = ${JSON.stringify({ updated: "2026-10-01", hours: HOURS, notice: { de: "", it: "" }, closures: [], announcement: a })};\n`;
const ANN = { de: "Heute ab 12 Uhr geschlossen.", it: "Oggi chiusa dalle 12.", color: "yellow" };
const withInfo = (page, a) => page.route("**/info.js", r => r.fulfill({ body: info(a), contentType: "text/javascript" }));
const banner = page => page.locator("#announce");
const top = page => page.locator(".bar").evaluate(e => Math.round(e.getBoundingClientRect().top + scrollY));

test.describe("announcement", () => {
  test("floats in at the top, pushes the search bar down, × collapses it and it stays closed", async ({ page }) => {
    await withInfo(page, ANN);
    await open(page);
    await expect(banner(page)).toHaveClass(/\bopen\b/);
    await expect(banner(page)).toHaveAttribute("aria-label", "Mitteilung");
    const bar = banner(page).locator(".announce-bar");
    await expect(bar).toHaveAttribute("data-color", "yellow");
    await expect(bar).toContainText("Heute ab 12 Uhr geschlossen.");
    // first element on the page (above the header), the search bar sits lower by its height
    expect(await banner(page).evaluate(e => Math.round(e.getBoundingClientRect().top))).toBe(0);
    await expect.poll(() => banner(page).evaluate(e => Math.round(e.getBoundingClientRect().height))).toBeGreaterThan(40);
    const h = await banner(page).evaluate(e => Math.round(e.getBoundingClientRect().height));
    const pushed = await top(page);
    await bar.getByRole("button", { name: "Mitteilung schließen" }).click();
    await expect(banner(page)).toHaveCount(0);
    expect(pushed - await top(page)).toBe(h);
    expect(await page.evaluate(() => localStorage.getItem("dsm-announce"))).toBeTruthy();
    await page.reload();
    await page.locator("#list .row").first().waitFor();
    await page.waitForTimeout(600);
    await expect(banner(page)).toHaveCount(0);
  });

  test("closing animates: collapsing state before it is removed", async ({ page }) => {
    await withInfo(page, ANN);
    await open(page);
    await expect(banner(page)).toHaveClass(/\bopen\b/);
    await page.locator("#announce .announce-x").click();
    await expect(banner(page)).not.toHaveClass(/\bopen\b/);
    await expect(banner(page)).toHaveCount(0);
  });

  test("Esc closes it on the computer – not while a dialog is open, not in the search field", async ({ page }) => {
    await withInfo(page, ANN);
    await open(page);
    await expect(banner(page)).toHaveClass(/\bopen\b/);
    // search field: Esc belongs to the search
    await page.fill("#q", "a");
    await page.locator("#q").press("Escape");
    await page.waitForTimeout(400);
    await expect(banner(page)).toHaveClass(/\bopen\b/);
    // dialog: Esc only closes the dialog
    await page.click(".settings-btn");
    const d = page.locator("[role=dialog]");
    await expect(d).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(d).toHaveCount(0);
    await expect(banner(page)).toHaveClass(/\bopen\b/);
    // otherwise Esc closes the banner
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press("Escape");
    await expect(banner(page)).toHaveCount(0);
  });

  test("a new text shows again after the old one was closed", async ({ page }) => {
    await withInfo(page, ANN);
    await open(page);
    await page.locator("#announce .announce-x").click();
    await expect(banner(page)).toHaveCount(0);
    await page.unroute("**/info.js");
    await withInfo(page, { ...ANN, de: "Neue Bücher sind da!" });
    await page.reload();
    await expect(banner(page)).toHaveClass(/\bopen\b/);
    await expect(banner(page)).toContainText("Neue Bücher sind da!");
  });

  test("Italian text; unknown color = neutral", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("dsm-lang", "it"));
    await withInfo(page, { ...ANN, color: "nonsense" });
    await open(page);
    await expect(banner(page)).toContainText("Oggi chiusa dalle 12.");
    await expect(banner(page).locator(".announce-bar")).toHaveAttribute("data-color", "neutral");
    await expect(banner(page).locator(".announce-x")).toHaveAttribute("aria-label", "Chiudi l'avviso");
  });

  test("red: white text", async ({ page }) => {
    await withInfo(page, { ...ANN, color: "red" });
    await open(page);
    await expect(banner(page).locator(".announce-bar")).toHaveCSS("color", "rgb(255, 255, 255)");
  });

  test("past end date or empty text: no banner", async ({ page }) => {
    await withInfo(page, { ...ANN, until: "2020-01-01" });
    await open(page);
    await page.waitForTimeout(600);
    await expect(banner(page)).toHaveCount(0);
    await page.unroute("**/info.js");
    await withInfo(page, { de: " ", it: "", color: "red" });
    await page.reload();
    await page.locator("#list .row").first().waitFor();
    await page.waitForTimeout(600);
    await expect(banner(page)).toHaveCount(0);
  });

  test("preview from the admin page: shown although closed before", async ({ page }) => {
    await page.addInitScript(i => {
      localStorage.setItem("dsm-preview-info", JSON.stringify({ updated: "2026-10-01", hours: {}, closures: [], announcement: i }));
    }, ANN);
    await open(page, "index.html#preview");
    await expect(banner(page)).toHaveClass(/\bopen\b/);
    await page.locator("#announce .announce-x").click();
    await expect(banner(page)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("dsm-announce"))).toBeNull();
  });
});

test.describe("announcement with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("there at once, no transition", async ({ page }) => {
    await withInfo(page, ANN);
    await open(page);
    await expect(banner(page)).toHaveClass(/\bopen\b/);
    const d = await banner(page).evaluate(e => getComputedStyle(e).transitionDuration);
    expect(parseFloat(d)).toBeLessThan(0.01);
  });
});
