// Fragen beim ersten Besuch und Buchempfehlungen über der Liste
const { test, expect, oeffnen, daten, AUS } = require("./hilfen.js");

const { E } = daten();
const pref = page => page.evaluate(() => JSON.parse(localStorage.getItem("dsm-empf")));
const ask = page => page.locator("dialog.ask");

test.describe("Erster Besuch", () => {
  test.use({ speicher: {} });

  test("Frage erscheint: „Möchten Sie Buchempfehlungen sehen?“", async ({ page }) => {
    await oeffnen(page);
    await expect(ask(page)).toBeVisible();
    await expect(ask(page).locator("#ask-t")).toHaveText("Buchempfehlungen");
    await expect(ask(page).locator(".lead")).toHaveText("Möchten Sie Buchempfehlungen sehen?");
  });

  test("Nein → gespeichert, Hinweis, keine Empfehlungen, keine erneute Frage", async ({ page }) => {
    await oeffnen(page);
    await ask(page).locator('[data-a="no"]').click();
    await expect(ask(page)).toBeHidden();
    await expect(page.locator(".toast")).toContainText("Einstellungen");
    expect(await pref(page)).toEqual({ want: false, gruppe: null });
    await expect(page.locator("#recs")).toBeHidden();
    await page.reload();
    await page.waitForTimeout(800);
    await expect(ask(page)).toHaveCount(0);
  });

  test("Schließen (X / Escape) zählt als Nein", async ({ page }) => {
    await oeffnen(page);
    await expect(ask(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(ask(page)).toBeHidden();
    expect(await pref(page)).toEqual({ want: false, gruppe: null });
  });

  for (const [g, label] of [["mittelstufe", "Mittelstufe"], ["oberstufe", "Oberstufe"]]) {
    test(`Ja → ${label} → Empfehlungen sichtbar`, async ({ page }) => {
      await oeffnen(page);
      await ask(page).locator('[data-a="yes"]').click();
      await expect(ask(page).locator("#ask-t")).toHaveText("Für wen?");
      await expect(ask(page).locator(".choice b")).toHaveText(["Mittelstufe", "Oberstufe", "Erwachsenenliteratur"]);
      await ask(page).locator(`.choice[data-g="${g}"]`).click();
      await expect(ask(page)).toBeHidden();
      expect(await pref(page)).toEqual({ want: true, gruppe: g });
      await expect(page.locator("#recs")).toBeVisible();
      await expect(page.locator("#recs-open small")).toHaveText(label);
      await expect(page.locator("#recs .rec .rt b")).toHaveText(E.gruppen[g].map(r => r.t));
    });
  }

  test("Erwachsenenliteratur → Romane / Sachbücher / Biografien, Zurück funktioniert", async ({ page }) => {
    await oeffnen(page);
    await ask(page).locator('[data-a="yes"]').click();
    await ask(page).locator('.choice[data-g="erw"]').click();
    await expect(ask(page).locator("#ask-t")).toHaveText("Welcher Bereich?");
    await expect(ask(page).locator(".choice b")).toHaveText(["Romane", "Sachbücher", "Biografien & Geschichte"]);
    await ask(page).locator('[data-a="back"]').click();
    await expect(ask(page).locator("#ask-t")).toHaveText("Für wen?");
    await ask(page).locator('[data-a="back"]').click();
    await expect(ask(page).locator("#ask-t")).toHaveText("Buchempfehlungen");
    await ask(page).locator('[data-a="yes"]').click();
    await ask(page).locator('.choice[data-g="erw"]').click();
    await ask(page).locator('.choice[data-g="erw-bio"]').click();
    expect(await pref(page)).toEqual({ want: true, gruppe: "erw-bio" });
    await expect(page.locator("#recs-open small")).toHaveText("Erwachsenenliteratur · Biografien & Geschichte");
  });

  test("Frage auf Italienisch", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("dsm-lang", "it"));
    await oeffnen(page);
    await expect(ask(page).locator(".lead")).toHaveText("Desidera vedere dei consigli di lettura?");
  });

  test.describe("Handy", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    test("Fragen-Fenster passt auf den Bildschirm", async ({ page }) => {
      await oeffnen(page);
      const box = await ask(page).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.y + box.height).toBeLessThanOrEqual(844 + 1);
    });
  });
});

test.describe("Empfehlungen", () => {
  test.use({ speicher: { "dsm-empf": JSON.stringify({ want: true, gruppe: "erw-roman" }) } });

  test("höchstens 4, mit Cover-Platzhalter; Liste bleibt ohne Bilder", async ({ page }) => {
    await oeffnen(page);
    await expect(ask(page)).toHaveCount(0);
    await expect(page.locator("#recs .rec")).toHaveCount(Math.min(4, E.gruppen["erw-roman"].length));
    await expect(page.locator("#recs .rec .cover .ph").first()).toBeVisible();
  });

  test("Klick öffnet Detail mit „Warum dieses Buch?“ in DE und IT", async ({ page }) => {
    const r = E.gruppen["erw-roman"][0];
    await oeffnen(page);
    await page.locator("#recs .rec").first().click();
    await expect(page.locator("#d-title")).toHaveText(r.t);
    await expect(page.locator("#d-teaser")).toBeVisible();
    await expect(page.locator("#d-teaser b")).toHaveText("Warum dieses Buch?");
    await expect(page.locator("#d-teaser p")).toHaveText(r.de);
    await page.evaluate(() => document.querySelector('.seg [data-lang="it"]').click());
    await expect(page.locator("#d-teaser b")).toHaveText("Perché questo libro?");
    await expect(page.locator("#d-teaser p")).toHaveText(r.it);
  });

  test("Cover der Empfehlungen: eine Sammelabfrage", async ({ page, netz }) => {
    netz.ol = keys => Object.fromEntries(keys.map(k => [k, { thumbnail_url: "https://covers.openlibrary.org/b/id/1-S.jpg" }]));
    await oeffnen(page);
    await expect(page.locator("#recs .rec .cover img").first()).toBeVisible();
    const erste = netz.anfragen.find(u => u.includes("api/books"));
    expect(decodeURIComponent(erste).match(/ISBN:\d{13}/g).length).toBeGreaterThan(1);
  });

  test("Ausblenden → gespeichert, Hinweis", async ({ page }) => {
    await oeffnen(page);
    await page.click("#recs-x");
    await expect(page.locator("#recs")).toBeHidden();
    await expect(page.locator(".toast")).toContainText("Empfehlungen ausgeblendet");
    expect(await pref(page)).toEqual({ want: false, gruppe: "erw-roman" });
  });

  test("Einstellungen: Gruppe wechseln und ausschalten", async ({ page }) => {
    await oeffnen(page);
    await page.click(".settings-btn");
    const s = page.locator("dialog.settings");
    await expect(s.locator("#s-recs")).toBeChecked();
    await expect(s.locator('.gpick [data-g="erw-roman"]')).toHaveAttribute("aria-checked", "true");
    await s.locator('.gpick [data-g="oberstufe"]').click();
    await expect(s.locator('.gpick [data-g="oberstufe"]')).toHaveAttribute("aria-checked", "true");
    expect(await pref(page)).toEqual({ want: true, gruppe: "oberstufe" });
    await expect(page.locator("#recs .rec .rt b").first()).toHaveText(E.gruppen.oberstufe[0].t);
    await s.locator("#s-recs").uncheck();
    await expect(s.locator(".gpick")).toBeHidden();
    await expect(page.locator("#recs")).toBeHidden();
  });

  test("Empfehlung, die nicht (mehr) im Bestand ist, wird nicht angezeigt", async ({ page }) => {
    await page.route("**/empfehlungen.js", r => r.fulfill({
      contentType: "text/javascript",
      body: "window.DSM_EMPFEHLUNGEN = " + JSON.stringify({ stand: "2026-01-01", gruppen: {
        "erw-roman": [{ k: "gibt es nicht|niemand", t: "Gibt es nicht", a: "Niemand", de: "x", it: "x" }, E.gruppen["erw-roman"][0]],
      } }),
    }));
    await oeffnen(page);
    await expect(page.locator("#recs .rec")).toHaveCount(1);
  });
});

test.describe("Empfehlungen ausgeschaltet", () => {
  test.use({ speicher: { "dsm-empf": AUS } });
  test("einschalten über Einstellungen", async ({ page }) => {
    await oeffnen(page);
    await expect(page.locator("#recs")).toBeHidden();
    await page.click(".settings-btn");
    await page.locator("#s-recs").check();
    await expect(page.locator("#recs")).toBeVisible();
    expect(await pref(page)).toEqual({ want: true, gruppe: "mittelstufe" });
  });
});
