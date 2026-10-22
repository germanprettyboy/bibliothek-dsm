/*
 * Opening hours card above the list. Data via the preview (dsm-preview-info + #preview),
 * time fixed (Wednesday, 2026-10-14, Europe/Rome).
 */
const { test, expect, open, swipeStages, OFF } = require("./helpers.js");

const HOURS = { mon: [], tue: [], wed: [["08:00", "12:00"], ["13:00", "15:00"]], thu: [["10:00", "14:00"]], fri: [], sat: [] };
const info = (extra = {}) => JSON.stringify({ updated: "2026-10-01", hours: HOURS, notice: { de: "", it: "" }, closures: [], ...extra });
const EMPTY = info({ hours: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] } });
const at = async (page, hhmm) => page.clock.setFixedTime(new Date(`2026-10-14T${hhmm}:00+02:00`));
const card = page => page.locator("#info .info-card");

async function withInfo(page, data, hhmm) {
  // a second call in the same test reloads: "#preview" again would only change the hash
  const again = page.url().includes("index.html");
  await page.addInitScript(d => localStorage.setItem("dsm-preview-info", d), data);
  await at(page, hhmm);
  if (!again) return open(page, "index.html#preview");
  await page.reload();
  await page.locator("#list .row").first().or(page.locator("#list .empty")).waitFor();
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

test.describe("special opening hours, Sunday, notice period, contact", () => {
  test.use({ storage: { "dsm-recs": OFF } });
  const dialog = page => page.locator("[role=dialog][aria-labelledby=info-t]");
  const sp = (from, to, hours, extra = {}) => ({ type: "special", from, to, hours, de: "", it: "", ...extra });

  test("special hours replace the regular hours of today", async ({ page }) => {
    await withInfo(page, info({ closures: [sp("2026-10-14", "2026-10-14", [["09:00", "10:00"]])] }), "09:30");
    await expect(card(page)).toContainText("Jetzt geöffnet");
    await expect(card(page)).toContainText("bis 10:00");
  });

  test("after the special hours today: closed, regular hours do not apply", async ({ page }) => {
    await withInfo(page, info({ closures: [sp("2026-10-14", "2026-10-14", [["09:00", "10:00"]])] }), "13:30");
    await expect(card(page)).toContainText("Jetzt geschlossen");
    await expect(card(page)).toContainText("Wieder geöffnet morgen ab 10:00");
  });

  test("a day without regular hours opens with special hours (next opening)", async ({ page }) => {
    const c = [{ from: "2026-10-15", to: "2026-10-15", type: "holiday", de: "Brückentag" }, sp("2026-10-16", "2026-10-16", [["09:00", "11:00"]])];
    await withInfo(page, info({ closures: c }), "16:00");
    await expect(card(page)).toContainText("Wieder geöffnet am Freitag ab 9:00");
  });

  test("a holiday on the same day wins over special hours", async ({ page }) => {
    const c = [sp("2026-10-14", "2026-10-14", [["09:00", "17:00"]]), { from: "2026-10-14", to: "2026-10-14", type: "holiday", de: "Fest" }];
    await withInfo(page, info({ closures: c }), "10:00");
    await expect(card(page)).toContainText("Heute geschlossen");
  });

  test("special hours without a valid range are ignored", async ({ page }) => {
    await withInfo(page, info({ closures: [sp("2026-10-14", "2026-10-14", [["12:00", "09:00"]])] }), "10:00");
    await expect(card(page)).toContainText("Jetzt geöffnet");
    await expect(card(page)).toContainText("Heute 8:00–12:00, 13:00–15:00");
  });

  test("upcoming special hours on the card and in the dialog", async ({ page }) => {
    await withInfo(page, info({ closures: [sp("2026-10-23", "2026-10-23", [["08:00", "11:00"]])] }), "10:00");
    await expect(card(page)).toContainText("Geänderte Öffnungszeiten");
    await expect(card(page)).toContainText("Fr, 23.10. · 8:00–11:00");
    await card(page).click();
    const d = dialog(page);
    await expect(d.locator("h4").first()).toHaveText("Ferien, Schließtage und geänderte Zeiten");
    await expect(d.locator(".closures li")).toHaveCount(1);
    await expect(d.locator(".closures li")).toContainText("Fr, 23.10. · 8:00–11:00 · Andere Zeiten");
    await expect(d.locator(".week dd").nth(2)).toHaveText("8:00–12:00, 13:00–15:00"); // the weekly table stays regular
  });

  test("own label and Italian type", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("dsm-lang", "it"));
    await withInfo(page, info({ closures: [sp("2026-10-23", "2026-10-23", [["08:00", "11:00"]], { it: "Giornata aperta" })] }), "10:00");
    await expect(card(page)).toContainText("Giornata aperta");
    await card(page).click();
    await expect(dialog(page).locator(".closures li")).toContainText("Altri orari");
  });

  test("without special entries the heading stays", async ({ page }) => {
    await withInfo(page, info(), "10:00");
    await card(page).click();
    await expect(dialog(page).locator("h4").first()).toHaveText("Ferien und Schließtage");
  });

  test("Sunday with hours is shown in the weekly table", async ({ page }) => {
    await withInfo(page, info({ hours: { ...HOURS, sun: [["10:00", "12:00"]] } }), "10:00");
    await card(page).click();
    await expect(dialog(page).locator(".week dt")).toHaveText(["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Sonntag"]);
    await expect(dialog(page).locator(".week dd").nth(5)).toHaveText("10:00–12:00");
  });

  test("notice only within its period", async ({ page }) => {
    const n = (from, to) => info({ notice: { de: "Hinweistext", it: "", ...(from && { from }), ...(to && { to }) } });
    const check = async (data, shown) => {
      await withInfo(page, data, "10:00");
      await card(page).click();
      await expect(dialog(page).locator(".hint")).toHaveCount(shown ? 1 : 0);
      await page.keyboard.press("Escape");
    };
    await check(n("2026-10-14", "2026-10-14"), true); // both bounds inclusive
    await check(n("2026-10-01", null), true);
    await check(n(null, "2026-10-20"), true);
    await check(n("2026-10-15", null), false);
    await check(n(null, "2026-10-13"), false);
  });

  test("a notice outside its period does not make the card appear", async ({ page }) => {
    const e = JSON.parse(EMPTY);
    await withInfo(page, JSON.stringify({ ...e, notice: { de: "Später", it: "", from: "2026-11-01" } }), "10:00");
    await expect(page.locator("#info")).toBeHidden();
  });

  test("contact in the dialog: text, mail and phone as links", async ({ page }) => {
    const contact = { email: "bibliothek@example.org", phone: "+39 02 123 4567", de: "Raum 12, Frau Beispiel", it: "Aula 12" };
    await withInfo(page, info({ contact }), "10:00");
    await card(page).click();
    const c = dialog(page).locator("#info-contact");
    await expect(c.locator("h4")).toHaveText("Kontakt");
    await expect(c).toContainText("Raum 12, Frau Beispiel");
    await expect(c.locator('a[href="mailto:bibliothek@example.org"]')).toHaveText("bibliothek@example.org");
    await expect(c.locator('a[href="tel:+39021234567"]')).toHaveText("+39 02 123 4567");
    expect(await c.locator("a").first().evaluate(a => getComputedStyle(a).textDecorationLine)).toBe("none");
  });

  test("without contact no section; contact only: card titled Kontakt", async ({ page }) => {
    await withInfo(page, info(), "10:00");
    await card(page).click();
    await expect(dialog(page).locator("#info-contact")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await withInfo(page, JSON.stringify({ ...JSON.parse(EMPTY), contact: { email: "a@b.de" } }), "10:00");
    await expect(card(page)).toContainText("Kontakt");
    await card(page).click();
    await expect(dialog(page).locator("#info-contact a")).toHaveAttribute("href", "mailto:a@b.de");
  });
});

test.describe("opening hours on the phone", () => {
  test.use({ storage: { "dsm-recs": OFF }, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("swiping: half, up = content-high, down = half, further down = closed", async ({ page }) => {
    await withInfo(page, info(), "10:00");
    await card(page).click();
    await swipeStages(page, page.locator("[role=dialog][aria-labelledby=info-t]"));
  });
});
