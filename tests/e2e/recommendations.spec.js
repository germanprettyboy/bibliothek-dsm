// Questions on the first visit and book recommendations above the list
const { test, expect, open, data, OFF } = require("./helpers.js");

const { R } = data();
const pref = page => page.evaluate(() => JSON.parse(localStorage.getItem("dsm-recs")));
const ask = page => page.locator(".ask[role=dialog]");

test.describe("first visit", () => {
  test.use({ storage: {} });

  test('first question is "Möchten Sie Buchempfehlungen sehen?", without a language step', async ({ page }) => {
    await open(page);
    await expect(ask(page)).toBeVisible();
    await expect(ask(page).locator('[data-a="de"], [data-a="it"]')).toHaveCount(0);
    await expect(ask(page).locator(".progress")).toHaveCount(0);
    await expect(ask(page).locator("#ask-t")).toHaveText("Buchempfehlungen");
    await expect(ask(page).locator(".lead")).toHaveText("Möchten Sie Buchempfehlungen sehen?");
    await expect(ask(page).locator('[data-a="back"]')).toHaveCount(0);
  });

  test("no focus ring on a button when opening", async ({ page }) => {
    await open(page);
    await expect(ask(page)).toBeVisible();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.activeElement.matches("button") && document.activeElement.matches(":focus-visible"))).toBe(false);
    expect(await page.evaluate(() => !!document.activeElement.closest(".ask"))).toBe(true);
  });

  test("Italian page language: the questions come in Italian", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("dsm-lang", "it"));
    await open(page);
    await expect(ask(page).locator(".lead")).toHaveText("Desidera vedere dei consigli di lettura?");
  });

  test("no → saved, notice, no recommendations, no repeated question", async ({ page }) => {
    await open(page);
    await ask(page).locator('[data-a="no"]').click();
    await expect(ask(page)).toBeHidden();
    await expect(page.locator(".toast")).toContainText("Einstellungen");
    expect(await pref(page)).toEqual({ want: false, group: null });
    await expect(page.locator("#recs")).toBeHidden();
    // notice centered (also once the scroll lock has released the scrollbar); a click opens the settings
    const box = await page.locator(".toast").boundingBox();
    const mid = await page.evaluate(() => document.documentElement.clientWidth / 2);
    expect(Math.abs(box.x + box.width / 2 - mid)).toBeLessThan(2);
    await page.locator(".toast-btn").click();
    await expect(page.locator(".settings[role=dialog]")).toBeVisible();
    await expect(page.locator(".toast")).toHaveCount(0);
    await page.reload();
    await page.waitForTimeout(800);
    await expect(ask(page)).toHaveCount(0);
  });

  test("closing (X / Escape) counts as no", async ({ page }) => {
    await open(page);
    await expect(ask(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(ask(page)).toBeHidden();
    expect(await pref(page)).toEqual({ want: false, group: null });
  });

  // Oberstufe takes the same path (only data-g differs); switching groups is covered by "settings: change the group"
  test("yes → Mittelstufe → recommendations visible", async ({ page }) => {
    await open(page);
    await ask(page).locator('[data-a="yes"]').click();
    await expect(ask(page).locator("#ask-t")).toHaveText("Für wen?");
    await expect(ask(page).locator(".choice b")).toHaveText(["Mittelstufe", "Oberstufe", "Erwachsenenliteratur"]);
    await ask(page).locator('.choice[data-g="middle"]').click();
    await expect(ask(page)).toBeHidden();
    expect(await pref(page)).toEqual({ want: true, group: "middle" });
    await expect(page.locator("#recs")).toBeVisible();
    await expect(page.locator("#recs-open small")).toHaveText("Mittelstufe");
    await expect(page.locator("#recs .rec .rt b")).toHaveText(R.groups.middle.map(r => r.t));
  });

  test("adult literature → fiction / nonfiction / biographies, back works", async ({ page }) => {
    await open(page);
    await ask(page).locator('[data-a="yes"]').click();
    await ask(page).locator('.choice[data-g="adult"]').click();
    await expect(ask(page).locator("#ask-t")).toHaveText("Welcher Bereich?");
    await expect(ask(page).locator(".choice b")).toHaveText(["Romane", "Sachbücher", "Biografien & Geschichte"]);
    await ask(page).locator('[data-a="back"]').click();
    await expect(ask(page).locator("#ask-t")).toHaveText("Für wen?");
    await ask(page).locator('[data-a="back"]').click();
    await expect(ask(page).locator("#ask-t")).toHaveText("Buchempfehlungen");
    await ask(page).locator('[data-a="yes"]').click();
    await ask(page).locator('.choice[data-g="adult"]').click();
    await ask(page).locator('.choice[data-g="adult-bio"]').click();
    expect(await pref(page)).toEqual({ want: true, group: "adult-bio" });
    await expect(page.locator("#recs-open small")).toHaveText("Erwachsenenliteratur · Biografien & Geschichte");
  });

  test.describe("phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    test("the questions dialog fits the screen", async ({ page }) => {
      await open(page);
      const box = await ask(page).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.y + box.height).toBeLessThanOrEqual(844 + 1);
    });
  });
});

test.describe("recommendations", () => {
  test.use({ storage: { "dsm-recs": JSON.stringify({ want: true, group: "adult-fiction" }) } });

  test("at most 4, with cover placeholder; the list stays without images", async ({ page }) => {
    await open(page);
    await expect(ask(page)).toHaveCount(0);
    await expect(page.locator("#recs .rec")).toHaveCount(Math.min(4, R.groups["adult-fiction"].length));
    await expect(page.locator("#recs .rec .cover .ph").first()).toBeVisible();
  });

  test('a click opens the detail with "Warum dieses Buch?" in DE and IT', async ({ page }) => {
    const r = R.groups["adult-fiction"][0];
    await open(page);
    await page.locator("#recs .rec").first().click();
    await expect(page.locator("#d-title")).toHaveText(r.t);
    await expect(page.locator("#d-teaser")).toBeVisible();
    await expect(page.locator("#d-teaser b")).toHaveText("Warum dieses Buch?");
    await expect(page.locator("#d-teaser p")).toHaveText(r.de);
    await page.evaluate(() => document.querySelector('.seg [data-lang="it"]').click());
    await expect(page.locator("#d-teaser b")).toHaveText("Perché questo libro?");
    await expect(page.locator("#d-teaser p")).toHaveText(r.it);
  });

  test("covers of the recommendations: one batch request", async ({ page, net }) => {
    net.ol = keys => Object.fromEntries(keys.map(k => [k, { thumbnail_url: "https://covers.openlibrary.org/b/id/1-S.jpg" }]));
    await open(page);
    await expect(page.locator("#recs .rec .cover img").first()).toBeVisible();
    const first = net.requests.find(u => u.includes("api/books"));
    expect(decodeURIComponent(first).match(/ISBN:\d{13}/g).length).toBeGreaterThan(1);
  });

  test("hide → saved, notice", async ({ page }) => {
    await open(page);
    await page.click("#recs-x");
    await expect(page.locator("#recs")).toBeHidden();
    await expect(page.locator(".toast")).toContainText("Empfehlungen ausgeblendet");
    expect(await pref(page)).toEqual({ want: false, group: "adult-fiction" });
  });

  test("settings: change the group and switch off", async ({ page }) => {
    await open(page);
    await page.click(".settings-btn");
    const s = page.locator(".settings[role=dialog]");
    await expect(s.locator("#s-recs")).toBeChecked();
    await expect(s.locator('.gpick [data-g="adult-fiction"]')).toHaveAttribute("aria-checked", "true");
    await s.locator('.gpick [data-g="upper"]').click();
    await expect(s.locator('.gpick [data-g="upper"]')).toHaveAttribute("aria-checked", "true");
    expect(await pref(page)).toEqual({ want: true, group: "upper" });
    await expect(page.locator("#recs .rec .rt b").first()).toHaveText(R.groups.upper[0].t);
    await s.locator("#s-recs").uncheck();
    await expect(s.locator(".gpick")).toBeHidden();
    await expect(page.locator("#recs")).toBeHidden();
  });

  test("a recommendation that is not (any more) in the catalog is not shown", async ({ page }) => {
    await page.route("**/recommendations.js", r => r.fulfill({
      contentType: "text/javascript",
      body: "window.DSM_RECOMMENDATIONS = " + JSON.stringify({ updated: "2026-01-01", groups: {
        "adult-fiction": [{ k: "gibt es nicht|niemand", t: "Gibt es nicht", a: "Niemand", de: "x", it: "x" }, R.groups["adult-fiction"][0]],
      } }),
    }));
    await open(page);
    await expect(page.locator("#recs .rec")).toHaveCount(1);
  });
});

test.describe("recommendations switched off", () => {
  test.use({ storage: { "dsm-recs": OFF } });
  test("switch on via the settings", async ({ page }) => {
    await open(page);
    await expect(page.locator("#recs")).toBeHidden();
    await page.click(".settings-btn");
    await page.locator("#s-recs").check();
    await expect(page.locator("#recs")).toBeVisible();
    expect(await pref(page)).toEqual({ want: true, group: "middle" });
  });
});
