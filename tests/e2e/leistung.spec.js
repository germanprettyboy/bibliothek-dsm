// Unschärfe nach Leistung (src/lib/leistung.js): Messung beim Öffnen von Fenstern, Stufen voll → wenig → aus, gemerkt nur für die Sitzung.
const { test, expect, oeffnen, AUS } = require("./hilfen.js");

// requestAnimationFrame mit festen Bildabständen (ms) – so ruckelt oder läuft die Seite „gespielt“
const bilder = (page, ms) => page.addInitScript(ms => {
  const echt = window.requestAnimationFrame.bind(window);
  let t = 0;
  window.requestAnimationFrame = cb => echt(() => { t += ms; cb(t); });
}, ms);

async function detailAufZu(page) {
  await page.locator("#list .row").nth(2).click();
  await expect(page.locator("#detail")).toBeVisible();
  await page.waitForTimeout(700);
  await page.keyboard.press("Escape");
  await expect(page.locator("#detail")).toHaveCount(0);
}
const filter = (page, sel) => page.evaluate(sel => getComputedStyle(document.querySelector(sel)).backdropFilter, sel);

test.describe("Unschärfe nach Leistung", () => {
  // Bis zu fünfmal Fenster auf und zu: unter Last (parallele Tests) dauert ein Durchgang 3–5 s, 30 s reichen nicht
  test("ruckelnde Fenster: erst weniger, dann keine Unschärfe, für die Sitzung gemerkt", async ({ page }) => {
    test.slow();
    await bilder(page, 40);
    await oeffnen(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-blur", /.*/);
    await detailAufZu(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-blur", /.*/); // einmal ruckeln reicht nicht
    await detailAufZu(page);
    await expect(page.locator("html")).toHaveAttribute("data-blur", "wenig");
    await detailAufZu(page);
    await detailAufZu(page);
    await expect(page.locator("html")).toHaveAttribute("data-blur", "aus");
    expect(await page.evaluate(() => sessionStorage.getItem("dsm-blur"))).toBe("aus");
    expect(await page.evaluate(() => localStorage.getItem("dsm-blur"))).toBeNull();
    await page.locator("#list .row").nth(2).click();
    await expect(page.locator("#detail")).toBeVisible();
    expect(await filter(page, ".schleier")).toBe("none");
    expect(await filter(page, "#detail")).toBe("none");
  });

  test("flüssige Fenster: Unschärfe bleibt", async ({ page }) => {
    test.slow();
    await bilder(page, 16);
    await oeffnen(page);
    for (let i = 0; i < 3; i++) await detailAufZu(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-blur", /.*/);
    await page.locator("#list .row").nth(2).click();
    expect(await filter(page, ".schleier")).toContain("blur(8px)");
  });

  test.describe("gemerkte Stufe der Sitzung", () => {
    test.use({ speicher: { "dsm-empf": AUS } });
    test("wird vor dem ersten Zeichnen gesetzt", async ({ page }) => {
      await page.addInitScript(() => sessionStorage.setItem("dsm-blur", "wenig"));
      await oeffnen(page);
      await expect(page.locator("html")).toHaveAttribute("data-blur", "wenig");
      await page.locator("#list .row").nth(2).click();
      expect(await filter(page, ".schleier")).toContain("blur(4px)");
    });
  });

  test.describe("alter dauerhafter Merker", () => {
    test.use({ speicher: { "dsm-empf": AUS, "dsm-blur": JSON.stringify({ stufe: "aus", t: Date.now() }) } });
    test("wird ignoriert und gelöscht: neuer Besuch beginnt mit voller Unschärfe", async ({ page }) => {
      await oeffnen(page);
      await expect(page.locator("html")).not.toHaveAttribute("data-blur", /.*/);
      expect(await page.evaluate(() => localStorage.getItem("dsm-blur"))).toBeNull();
      await page.locator("#list .row").nth(2).click();
      expect(await filter(page, ".schleier")).toContain("blur(8px)");
    });
  });

  test("hoher Kontrast: Glas ohne Unschärfe", async ({ page }) => {
    await oeffnen(page);
    await page.evaluate(() => { document.documentElement.dataset.contrast = "high"; });
    await page.locator("#list .row").nth(2).click();
    await expect(page.locator("#detail")).toBeVisible();
    expect(await filter(page, "#detail")).toBe("none");
  });
});
