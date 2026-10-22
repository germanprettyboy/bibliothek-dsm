// Blur always stays on: also at 30 fps (iPhone in low power mode) and very slow frames, no switching off by measuring.
const { test, expect, open, settled, OFF } = require("./helpers.js");

const frames = (page, ms) => page.addInitScript(ms => {
  const real = window.requestAnimationFrame.bind(window);
  let t = 0;
  window.requestAnimationFrame = cb => real(() => { t += ms; cb(t); });
}, ms);
const filter = (page, sel) => page.evaluate(sel => getComputedStyle(document.querySelector(sel)).backdropFilter, sel);

test.describe("blur", () => {
  test.use({ storage: { "dsm-recs": OFF, "dsm-blur": JSON.stringify({ stufe: "aus", t: Date.now() }) } });
  // 60 ms covers 30 fps as well: whatever switches off at 33 ms switches off at 60 ms
  test("stays on at 60 ms between frames, the old flag is deleted", async ({ page }) => {
    await frames(page, 60);
    await open(page);
    for (let i = 0; i < 2; i++) {
      await page.locator("#list .row").nth(2).click();
      await expect(page.locator("#detail")).toBeVisible();
      await settled(page);
      await page.keyboard.press("Escape");
      await expect(page.locator("#detail")).toHaveCount(0);
    }
    await page.locator("#list .row").nth(2).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-blur", /.*/);
    expect(await filter(page, ".scrim")).toContain("blur(8px)");
    expect(await filter(page, "#detail")).toContain("blur(18px)");
    expect(await page.evaluate(() => localStorage.getItem("dsm-blur"))).toBeNull();
  });
});
