// Blur always stays on: also at 30 fps (iPhone in low power mode) and very slow frames, no switching off by measuring.
const { test, expect, open, OFF } = require("./helpers.js");

const frames = (page, ms) => page.addInitScript(ms => {
  const real = window.requestAnimationFrame.bind(window);
  let t = 0;
  window.requestAnimationFrame = cb => real(() => { t += ms; cb(t); });
}, ms);
const filter = (page, sel) => page.evaluate(sel => getComputedStyle(document.querySelector(sel)).backdropFilter, sel);

test.describe("blur", () => {
  test.use({ storage: { "dsm-recs": OFF, "dsm-blur": JSON.stringify({ stufe: "aus", t: Date.now() }) } });
  for (const ms of [33, 60]) {
    test(`stays on at ${ms} ms between frames, the old flag is deleted`, async ({ page }) => {
      test.slow();
      await frames(page, ms);
      await open(page);
      for (let i = 0; i < 4; i++) {
        await page.locator("#list .row").nth(2).click();
        await expect(page.locator("#detail")).toBeVisible();
        await page.waitForTimeout(600);
        await page.keyboard.press("Escape");
        await expect(page.locator("#detail")).toHaveCount(0);
      }
      await page.locator("#list .row").nth(2).click();
      await expect(page.locator("html")).not.toHaveAttribute("data-blur", /.*/);
      expect(await filter(page, ".scrim")).toContain("blur(8px)");
      expect(await filter(page, "#detail")).toContain("blur(18px)");
      expect(await page.evaluate(() => localStorage.getItem("dsm-blur"))).toBeNull();
    });
  }
});
