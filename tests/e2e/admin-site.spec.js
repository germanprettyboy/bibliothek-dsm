/*
 * Admin page, card "Website" on top of tab Bestand: one switch per element of the book list and one for all of them,
 * published at once (info.js "hide", recommendations.js "off") – only the switch changes in the published file.
 * "Bearbeiten" and admin.html#<tab> open the editor; an open preview follows the drafts live and opens tabs from its banner.
 * Shared helpers: admin-helpers.js. The published files are read back from the (test) website folder.
 */
const { test, expect, data } = require("./helpers.js");
const { adminSetup, unlock, tab, folderData, okText } = require("./admin-helpers.js");

const { R } = data();

adminSetup();

const INFO = {
  updated: "2026-10-01", hours: { mon: [["08:00", "13:00"]], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
  notice: { de: "", it: "" }, closures: [], announcement: { de: "Heute ab 12 Uhr geschlossen.", it: "Oggi chiusa dalle 12.", color: "yellow" },
};
// info.js for every page of the test (admin page and preview)
const withInfo = context => context.route("**/info.js", r => r.fulfill({ contentType: "text/javascript", body: "window.DSM_INFO = " + JSON.stringify(INFO) + ";\n" }));
const row = (page, k) => page.locator(`#site [data-site="${k}"]`);
const sw = (page, k) => row(page, k).locator("[data-site-switch]");
const info = page => folderData(page, "info.js", "DSM_INFO");
const recs = page => folderData(page, "recommendations.js", "DSM_RECOMMENDATIONS");

test.describe("switches", () => {
  test("a switch publishes at once: info.js gets hide, everything else stays; on again removes it", { tag: "@smoke" }, async ({ page, context }) => {
    await withInfo(context);
    await unlock(page);
    await expect(row(page, "announcement").locator("[data-site-status]")).toHaveText("„Heute ab 12 Uhr geschlossen.“");
    await expect(row(page, "info").locator("[data-site-status]")).toHaveText("Karte über der Bücherliste");
    for (const k of ["announcement", "info", "recs", "archive"]) await expect(sw(page, k)).toBeChecked();
    await expect(page.locator("#site-all")).toBeChecked();
    await expect(page.locator("#site-all-n")).toHaveText("4 von 4 eingeschaltet");

    await sw(page, "announcement").click();
    await expect(page.locator("#site-note")).toHaveText(okText("info.js"));
    await expect(sw(page, "announcement")).not.toBeChecked();
    await expect(page.locator("#site-all")).not.toBeChecked();
    await expect(page.locator("#site-all-n")).toHaveText("3 von 4 eingeschaltet");
    let d = await info(page);
    expect(d.hide).toEqual(["announcement"]);
    expect(d.announcement).toEqual(INFO.announcement); // the text stays in the file
    expect(d.hours).toEqual(INFO.hours);
    expect(await recs(page)).toBeNull(); // only the file of the switch is written

    await sw(page, "announcement").click();
    await expect(sw(page, "announcement")).toBeChecked();
    d = await info(page);
    expect(d.hide).toBeUndefined();
    expect(d.announcement).toEqual(INFO.announcement);
  });

  test("without info.js: nothing to switch for announcement and opening hours; the archive note writes a file with only the switch", async ({ page }) => {
    await unlock(page);
    await expect(sw(page, "announcement")).toBeDisabled();
    await expect(row(page, "announcement").locator("[data-site-status]")).toHaveText("Kein Text eingetragen");
    await expect(sw(page, "info")).toBeDisabled();
    await expect(row(page, "info").locator("[data-site-status]")).toHaveText("Noch nichts eingetragen");
    await expect(page.locator("#site-all-n")).toHaveText("2 von 2 eingeschaltet");
    await sw(page, "archive").click();
    await expect(page.locator("#site-note")).toHaveText(okText("info.js"));
    const d = await info(page);
    expect(d.hide).toEqual(["archive"]);
    expect(d.announcement).toBeUndefined();
    expect(Object.values(d.hours)).toEqual([[], [], [], [], [], [], []]);
    await expect(sw(page, "archive")).not.toBeChecked();
    // the draft of tab Info has the switch too: publishing there keeps it
    await tab(page, "info");
    await page.fill("#i-ann-de", "Neu.");
    await page.click("#i-dl");
    await expect.poll(async () => (await info(page))?.announcement?.de).toBe("Neu.");
    expect((await info(page)).hide).toEqual(["archive"]);
  });

  test("recommendations: off: true at once, same round; the tab's switch and a stored draft follow", async ({ page }) => {
    await page.addInitScript(d => { if (!localStorage.getItem("dsm-recs-draft")) localStorage.setItem("dsm-recs-draft", JSON.stringify(d)); },
      { topic: { de: "", it: "" }, groups: R.groups, off: false });
    await unlock(page);
    await sw(page, "recs").click();
    await expect(page.locator("#site-note")).toHaveText(okText("recommendations.js"));
    const d = await recs(page);
    expect(d.off).toBe(true);
    expect(d.updated).toBe(R.updated);
    expect(d.groups).toEqual(R.groups);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("dsm-recs-draft")).off)).toBe(true);
    await tab(page, "recs");
    await expect(page.locator("#rec-on")).not.toBeChecked();
  });

  test("the switch for all: everything off in both files, then everything on again", async ({ page, context }) => {
    await withInfo(context);
    await unlock(page);
    await page.click("#site-all");
    await expect(page.locator("#site-all-n")).toHaveText("0 von 4 eingeschaltet");
    await expect(page.locator("#site-note")).toContainText("info.js im Ordner");
    await expect(page.locator("#site-note")).toContainText("recommendations.js im Ordner");
    expect((await info(page)).hide).toEqual(["announcement", "info", "archive"]);
    expect((await recs(page)).off).toBe(true);
    for (const k of ["announcement", "info", "recs", "archive"]) await expect(sw(page, k)).not.toBeChecked();
    await page.click("#site-all");
    await expect(page.locator("#site-all-n")).toHaveText("4 von 4 eingeschaltet");
    expect((await info(page)).hide).toBeUndefined();
    expect((await recs(page)).off).toBeUndefined();
  });
});

test.describe("from the card and the preview to the editors", () => {
  test("„Bearbeiten“ opens the tab at the element; admin.html#<tab> opens a tab, also after a reload", async ({ page, context }) => {
    await withInfo(context);
    await unlock(page);
    await row(page, "info").locator("[data-site-edit]").click();
    await expect(page.locator("#tab-info")).toBeVisible();
    await expect(page.locator("#i-hours")).toBeInViewport();
    await page.goto("admin.html#recs");
    await expect(page.locator("#tab-recs")).toBeVisible();
    await page.reload();
    await expect(page.locator("#app")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#tab-recs")).toBeVisible();
    await expect(page.locator("#site")).toHaveCount(0); // the card belongs to tab Bestand
  });

  test("live preview: follows the draft while typing, its banner opens the editor in the admin page", async ({ page, context }) => {
    await withInfo(context);
    await unlock(page);
    await expect(page.locator("#site-open")).toHaveAttribute("href", "index.html");
    const [p2] = await Promise.all([context.waitForEvent("page"), page.click("#site-live")]);
    await expect(p2.locator("#preview")).toBeVisible();
    await expect(p2.locator("#preview-edit [data-edit]")).toHaveText(["Ankündigung", "Öffnungszeiten", "Empfehlungen", "Bestand"]);
    await expect(p2.locator("#announce")).toContainText("Heute ab 12 Uhr geschlossen.");
    await tab(page, "info");
    await page.fill("#i-ann-de", "Live aus der Verwaltung.");
    await expect(p2.locator("#announce")).toContainText("Live aus der Verwaltung.");
    // the published file is untouched: a draft only
    expect(await info(page)).toBeNull();
    await tab(page, "catalog");
    await p2.click('#preview-edit [data-edit="recs"]');
    await expect(page.locator("#tab-recs")).toBeVisible();
    await expect(p2).toHaveURL(/index\.html#preview$/);
  });
});
