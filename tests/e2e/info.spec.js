/*
 * Opening hours card above the list. Data via the preview (dsm-preview-info + #preview),
 * time fixed (Wednesday, 2026-10-14, Europe/Rome).
 */
const { test, expect, PHONE, open, swipeStages, OFF } = require("./helpers.js");

const HOURS = { mon: [], tue: [], wed: [["08:00", "12:00"], ["13:00", "15:00"]], thu: [["10:00", "14:00"]], fri: [], sat: [] };
const info = (extra = {}) => JSON.stringify({ updated: "2026-10-01", hours: HOURS, notice: { de: "", it: "" }, closures: [], ...extra });
const EMPTY = info({ hours: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] } });
const at = async (page, hhmm) => page.clock.setFixedTime(new Date(`2026-10-14T${hhmm}:00+02:00`));
const card = page => page.locator("#info .info-card");

async function withInfo(page, data, hhmm) {
  await page.addInitScript(d => localStorage.setItem("dsm-preview-info", d), data);
  await at(page, hhmm);
  await open(page, "index.html#preview");
}

test.describe("info card", () => {
  test.use({ storage: { "dsm-recs": OFF } });

  test("info.js without hours and closing days: no card", async ({ page }) => {
    await page.route("**/info.js", route => route.fulfill({ body: `window.DSM_INFO = ${EMPTY};\n`, contentType: "text/javascript" }));
    await open(page);
    await expect(page.locator("#info")).toBeHidden();
  });

  test("open now, several ranges today", async ({ page }) => {
    await withInfo(page, info(), "10:00");
    await expect(card(page)).toContainText("Jetzt geöffnet");
    await expect(card(page)).toContainText("Heute 8:00–12:00, 13:00–15:00");
  });

  test("lunch break: today from 13:00", async ({ page }) => {
    await withInfo(page, info(), "12:30");
    await expect(card(page)).toContainText("Heute ab 13:00 geöffnet");
  });

  test("closed in the evening: open again tomorrow", async ({ page }) => {
    await withInfo(page, info(), "16:00");
    await expect(card(page)).toContainText("Jetzt geschlossen");
    await expect(card(page)).toContainText("Wieder geöffnet morgen ab 10:00");
  });

  test("a closing day tomorrow is skipped and announced", async ({ page }) => {
    const c = [{ from: "2026-10-15", to: "2026-10-15", type: "holiday", de: "Brückentag", it: "Ponte" }];
    await withInfo(page, info({ closures: c }), "16:00");
    await expect(card(page)).toContainText("Wieder geöffnet am Mittwoch, 21.10., ab 8:00");
    await expect(card(page)).toContainText("Brückentag");
    await expect(card(page)).toContainText("Do, 15.10. · geschlossen");
  });

  test("holiday today: closed today with the name and the next opening", async ({ page }) => {
    const c = [{ from: "2026-10-12", to: "2026-10-14", type: "holiday", de: "Herbstferien", it: "Vacanze d'autunno" }];
    await withInfo(page, info({ closures: c }), "10:00");
    await expect(card(page)).toContainText("Heute geschlossen");
    await expect(card(page)).toContainText("Herbstferien · Wieder geöffnet morgen ab 10:00");
  });

  test("past closing days disappear", async ({ page }) => {
    const c = [{ from: "2026-09-01", to: "2026-09-05", type: "holiday", de: "Vorbei" }];
    await withInfo(page, info({ closures: c }), "10:00");
    await expect(card(page)).not.toContainText("Vorbei");
    await card(page).click();
    await expect(page.locator("[role=dialog][aria-labelledby=info-t]")).toContainText("Keine Schließtage geplant.");
  });

  test("dialog: week overview, today marked, closing days, notice", async ({ page }) => {
    const c = [{ from: "2026-10-26", to: "2026-10-30", type: "holiday", de: "Herbstferien" },
      { from: "2026-11-02", type: "absent", de: "" }];
    await withInfo(page, info({ closures: c, notice: { de: "Bitte Ausweis mitbringen.", it: "Portare la tessera." } }), "10:00");
    await card(page).click();
    const d = page.locator("[role=dialog][aria-labelledby=info-t]");
    await expect(d).toBeVisible();
    await expect(d.locator(".hint")).toHaveText("Bitte Ausweis mitbringen.");
    await expect(d.locator(".week dt")).toHaveText(["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"]);
    await expect(d.locator(".week dt.today")).toHaveText("Mittwoch");
    await expect(d.locator(".week dd").nth(0)).toHaveText("geschlossen");
    await expect(d.locator(".week dd").nth(2)).toHaveText("8:00–12:00, 13:00–15:00");
    await expect(d.locator(".closures li")).toHaveCount(2);
    await expect(d.locator(".closures li").nth(0)).toContainText("Herbstferien");
    await expect(d.locator(".closures li").nth(0)).toContainText("26.10.–30.10.");
    await expect(d.locator(".closures li").nth(1)).toContainText("Bibliothek geschlossen");
    await expect(d.locator(".closures li").nth(1)).toContainText("Abwesenheit");
    await page.keyboard.press("Escape");
    await expect(d).toBeHidden();
  });

  test("Italian", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("dsm-lang", "it"));
    await withInfo(page, info(), "10:00");
    await expect(card(page)).toContainText("Aperta ora");
    await card(page).click();
    await expect(page.locator("[role=dialog][aria-labelledby=info-t] .week dt").first()).toHaveText("lunedì");
  });

  test("invalid hours are ignored", async ({ page }) => {
    const h = { wed: [["8:00", "12:00"], ["15:00", "13:00"], ["14:00", "16:00"]] };
    await withInfo(page, info({ hours: h }), "10:00");
    await expect(card(page)).toContainText("Heute ab 14:00 geöffnet");
  });
});

test.describe("opening hours on the phone", () => {
  test.use({ storage: { "dsm-recs": OFF }, ...PHONE });
  test("swiping: half, up = content-high, down = half, further down = closed", async ({ page }) => {
    await withInfo(page, info(), "10:00");
    await card(page).click();
    await swipeStages(page, page.locator("[role=dialog][aria-labelledby=info-t]"));
  });
});
