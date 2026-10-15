/*
 * Öffnungszeiten-Karte über der Liste. Daten über die Vorschau (dsm-vorschau-info + #vorschau),
 * Uhrzeit fest eingestellt (Mittwoch, 14.10.2026, Europe/Rome).
 */
const { test, expect, oeffnen, AUS } = require("./hilfen.js");

const ZEITEN = { mo: [], di: [], mi: [["08:00", "12:00"], ["13:00", "15:00"]], do: [["10:00", "14:00"]], fr: [], sa: [] };
const info = (extra = {}) => JSON.stringify({ stand: "2026-10-01", zeiten: ZEITEN, hinweis: { de: "", it: "" }, schliessungen: [], ...extra });
const um = async (page, hhmm) => page.clock.setFixedTime(new Date(`2026-10-14T${hhmm}:00+02:00`));
const karte = page => page.locator("#info .info-card");

async function mitInfo(page, daten, hhmm) {
  await page.addInitScript(d => localStorage.setItem("dsm-vorschau-info", d), daten);
  await um(page, hhmm);
  await oeffnen(page, "index.html#vorschau");
}

test.describe("Info-Karte", () => {
  test.use({ speicher: { "dsm-empf": AUS } });

  test("veröffentlichte info.js ohne Zeiten und Schließtage: keine Karte", async ({ page }) => {
    await oeffnen(page);
    await expect(page.locator("#info")).toBeHidden();
  });

  test("jetzt geöffnet, mehrere Zeiten heute", async ({ page }) => {
    await mitInfo(page, info(), "10:00");
    await expect(karte(page)).toContainText("Jetzt geöffnet");
    await expect(karte(page)).toContainText("Heute 8:00–12:00, 13:00–15:00");
  });

  test("Mittagspause: heute ab 13:00", async ({ page }) => {
    await mitInfo(page, info(), "12:30");
    await expect(karte(page)).toContainText("Heute ab 13:00 geöffnet");
  });

  test("abends geschlossen: wieder geöffnet morgen", async ({ page }) => {
    await mitInfo(page, info(), "16:00");
    await expect(karte(page)).toContainText("Jetzt geschlossen");
    await expect(karte(page)).toContainText("Wieder geöffnet morgen ab 10:00");
  });

  test("Schließtag morgen wird übersprungen und angekündigt", async ({ page }) => {
    const s = [{ von: "2026-10-15", bis: "2026-10-15", art: "ferien", de: "Brückentag", it: "Ponte" }];
    await mitInfo(page, info({ schliessungen: s }), "16:00");
    await expect(karte(page)).toContainText("Wieder geöffnet am Mittwoch, 21.10., ab 8:00");
    await expect(karte(page)).toContainText("Brückentag");
    await expect(karte(page)).toContainText("Do, 15.10. · geschlossen");
  });

  test("heute Ferien: heute geschlossen mit Name und nächster Öffnung", async ({ page }) => {
    const s = [{ von: "2026-10-12", bis: "2026-10-14", art: "ferien", de: "Herbstferien", it: "Vacanze d'autunno" }];
    await mitInfo(page, info({ schliessungen: s }), "10:00");
    await expect(karte(page)).toContainText("Heute geschlossen");
    await expect(karte(page)).toContainText("Herbstferien · Wieder geöffnet morgen ab 10:00");
  });

  test("vergangene Schließtage verschwinden", async ({ page }) => {
    const s = [{ von: "2026-09-01", bis: "2026-09-05", art: "ferien", de: "Vorbei" }];
    await mitInfo(page, info({ schliessungen: s }), "10:00");
    await expect(karte(page)).not.toContainText("Vorbei");
    await karte(page).click();
    await expect(page.locator("dialog.sheet[aria-labelledby=info-t]")).toContainText("Keine Schließtage geplant.");
  });

  test("Fenster: Wochenübersicht, heute markiert, Schließtage, Hinweis", async ({ page }) => {
    const s = [{ von: "2026-10-26", bis: "2026-10-30", art: "ferien", de: "Herbstferien" },
      { von: "2026-11-02", art: "abwesend", de: "" }];
    await mitInfo(page, info({ schliessungen: s, hinweis: { de: "Bitte Ausweis mitbringen.", it: "Portare la tessera." } }), "10:00");
    await karte(page).click();
    const d = page.locator("dialog[aria-labelledby=info-t]");
    await expect(d).toBeVisible();
    await expect(d.locator(".hint")).toHaveText("Bitte Ausweis mitbringen.");
    await expect(d.locator(".week dt")).toHaveText(["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"]);
    await expect(d.locator(".week dt.heute")).toHaveText("Mittwoch");
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

  test("Italienisch", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("dsm-lang", "it"));
    await mitInfo(page, info(), "10:00");
    await expect(karte(page)).toContainText("Aperta ora");
    await karte(page).click();
    await expect(page.locator("dialog[aria-labelledby=info-t] .week dt").first()).toHaveText("lunedì");
  });

  test("ungültige Zeiten werden ignoriert", async ({ page }) => {
    const z = { mi: [["8:00", "12:00"], ["15:00", "13:00"], ["14:00", "16:00"]] };
    await mitInfo(page, info({ zeiten: z }), "10:00");
    await expect(karte(page)).toContainText("Heute ab 14:00 geöffnet");
  });
});
