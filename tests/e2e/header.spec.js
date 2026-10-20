/*
 * Header: the page title sits next to the logo ("DSM | Bibliothek") when the row fits,
 * otherwise (narrow phone, larger text) below the logo. Never clipped.
 */
const { test, expect, OFF } = require("./helpers.js");

// true when the title shares the logo's row (right of the logo, above its bottom edge)
const nextToLogo = page => page.evaluate(() => {
  const l = document.querySelector("header .logo").getBoundingClientRect();
  const t = document.querySelector("header h1").getBoundingClientRect();
  return t.top < l.bottom && t.left > l.right;
});

const CASES = [
  // width, larger text, title next to the logo
  [1024, false, true], [390, false, true], [375, false, true], [360, false, false],
  [1024, true, true], [390, true, true], [375, true, false],
];

for (const [width, large, beside] of CASES) {
  test.describe(`header ${width}px${large ? ", larger text" : ""}`, () => {
    test.use({ storage: large ? { "dsm-recs": OFF, "dsm-font": "large" } : { "dsm-recs": OFF }, viewport: { width, height: 800 } });

    test(`title ${beside ? "next to" : "below"} the logo`, async ({ page }) => {
      await page.goto("index.html");
      const h1 = page.locator("header h1");
      await expect(h1).toHaveText("Bibliothek");
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("header .logo")).toHaveClass(/\bloaded\b/);
      await page.evaluate(() => document.fonts.ready); // the title width depends on Fira Sans
      expect(await nextToLogo(page)).toBe(beside);
      expect(await h1.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
    });
  });
}
