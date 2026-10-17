// Unschärfe bleibt immer an: auch bei 30 fps (iPhone im Stromsparmodus) und sehr langsamen Bildern, kein Abschalten durch Messung.
const { test, expect, oeffnen, AUS } = require("./hilfen.js");

const bilder = (page, ms) => page.addInitScript(ms => {
  const echt = window.requestAnimationFrame.bind(window);
  let t = 0;
  window.requestAnimationFrame = cb => echt(() => { t += ms; cb(t); });
}, ms);
const filter = (page, sel) => page.evaluate(sel => getComputedStyle(document.querySelector(sel)).backdropFilter, sel);

test.describe("Unschärfe", () => {
  test.use({ speicher: { "dsm-empf": AUS, "dsm-blur": JSON.stringify({ stufe: "aus", t: Date.now() }) } });
  for (const ms of [33, 60]) {
    test(`bleibt an bei ${ms} ms Bildabstand, alter Merker wird gelöscht`, async ({ page }) => {
      test.slow();
      await bilder(page, ms);
      await oeffnen(page);
      for (let i = 0; i < 4; i++) {
        await page.locator("#list .row").nth(2).click();
        await expect(page.locator("#detail")).toBeVisible();
        await page.waitForTimeout(600);
        await page.keyboard.press("Escape");
        await expect(page.locator("#detail")).toHaveCount(0);
      }
      await page.locator("#list .row").nth(2).click();
      await expect(page.locator("html")).not.toHaveAttribute("data-blur", /.*/);
      expect(await filter(page, ".schleier")).toContain("blur(8px)");
      expect(await filter(page, "#detail")).toContain("blur(18px)");
      expect(await page.evaluate(() => localStorage.getItem("dsm-blur"))).toBeNull();
    });
  }
});
