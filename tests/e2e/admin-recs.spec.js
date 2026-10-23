/*
 * Admin page, tab "Empfehlungen": archive of previous rounds (edit, delete), undo of a new round, missing translations.
 * Shared helpers: admin-helpers.js. The published file gets a fixed archive (route), the test data has none.
 */
const { test, expect, data } = require("./helpers.js");
const { FOLDER, browserOf, adminSetup, unlock, tab, folderData, save, download, evaluate } = require("./admin-helpers.js");

const { R } = data();

adminSetup();

const TODAY = new Date().toLocaleDateString("sv-SE");
const pick = (g, n) => R.groups[g].slice(0, n).map(r => ({ ...r, de: "Alt " + r.t, it: "Vecchio " + r.t }));
// Two previous rounds: newest with topic, the older one without
const ARC = [
  { updated: "2026-09-01", topic: { de: "Herbstlektüre", it: "Letture d'autunno" }, groups: { middle: pick("upper", 2), "adult-fiction": pick("adult-fiction", 1) } },
  { updated: "2026-03-01", groups: { middle: pick("upper", 3).slice(2) } },
];
const PUBLISHED = { ...R, archive: ARC };

test.beforeEach(async ({ page }) => {
  await page.route("**/recommendations.js", r => r.fulfill({
    contentType: "text/javascript",
    body: "window.DSM_RECOMMENDATIONS = " + JSON.stringify(PUBLISHED) + ";\n",
  }));
});

const rec = page => folderData(page, "recommendations.js", "DSM_RECOMMENDATIONS");
const published = async page => evaluate(await save(page, "#rec-dl"), "DSM_RECOMMENDATIONS");
// Publishing again: the success message is already there, so wait for the written content itself (WebKit: the download)
async function republished(page, done) {
  if (!FOLDER({ browserName: browserOf(page) })) return evaluate(await download(page, "#rec-dl"), "DSM_RECOMMENDATIONS");
  await page.click("#rec-dl");
  await expect.poll(async () => { const d = await rec(page); return !!d && done(d); }).toBe(true);
  return rec(page);
}
const draft = page => page.evaluate(() => JSON.parse(localStorage.getItem("dsm-recs-draft") || "null"));
const row = (page, n) => page.locator(`#rec-archive .arc-r[data-n="${n}"]`);
const expand = async (page, n) => {
  await row(page, n).locator(".arc-h").click();
  await expect(row(page, n).locator(".arc-h")).toHaveAttribute("aria-expanded", "true");
};
async function open(page) {
  await unlock(page);
  await tab(page, "recs");
}

test.describe("archive of previous rounds", () => {
  test("listed newest first, expandable, rows at least 44 px", async ({ page }) => {
    await open(page);
    await expect(page.locator("#rec-archive .arc-r")).toHaveCount(2);
    await expect(row(page, 0)).toContainText("Herbstlektüre");
    await expect(row(page, 0).locator(".arc-h")).toHaveAttribute("aria-expanded", "false");
    expect((await row(page, 0).locator(".arc-h").boundingBox()).height).toBeGreaterThanOrEqual(44);
    await expect(row(page, 0).locator(".arc-body")).toHaveCount(0);
    await expand(page, 0);
    await expect(row(page, 0).locator(".arc-g")).toHaveCount(2); // only groups with books
    await expect(row(page, 0).locator('.arc-g[data-g="middle"] .rec-ed b')).toHaveText(ARC[0].groups.middle.map(r => r.t));
    await expect(row(page, 0).locator('input[data-f="de"]')).toHaveValue("Herbstlektüre");
    await expect(page.locator("#rec-arc-none")).toHaveCount(0);
  });

  test("editing an archived text: archive changed, current round and date unchanged", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    await expand(page, 0);
    await row(page, 0).locator('.arc-g[data-g="middle"] .rec-ed[data-n="0"] textarea[data-f=de]').fill("  Korrigierter Text.  ");
    await row(page, 0).locator('input[data-f="it"]').fill("Autunno");
    await row(page, 0).locator('.arc-g[data-g="middle"] .rec-ed[data-n="1"] [data-op="del"]').click();
    await expect.poll(async () => (await draft(page))?.archive?.[0].groups.middle.length).toBe(1);
    const s = await save(page, "#rec-dl");
    expect(s).toContain("Korrigierter Text.");
    const d = evaluate(s, "DSM_RECOMMENDATIONS");
    expect(d.archive.length).toBe(2);
    expect(d.archive[0].groups.middle.length).toBe(1);
    expect(d.archive[0].groups.middle[0].de).toBe("Korrigierter Text.");
    expect(d.archive[0].topic).toEqual({ de: "Herbstlektüre", it: "Autunno" });
    expect(d.archive[1]).toEqual(ARC[1]);
    expect(d.groups).toEqual(R.groups);
    expect(d.updated).toBe(R.updated);
    // published: the draft does not carry the archive any more (WebKit = download, which is not published yet)
    if (FOLDER({ browserName: browserOf(page) })) await expect.poll(async () => (await draft(page))?.archive).toBeUndefined();
  });

  test("delete a round: second click within 4 s", async ({ page }) => {
    await open(page);
    await expand(page, 1);
    const del = row(page, 1).locator('[data-op="del-round"]');
    await expect(del).toHaveText("Runde löschen");
    await del.click();
    await expect(del).toHaveText("Wirklich löschen?");
    await expect(page.locator("#rec-archive .arc-r")).toHaveCount(2);
    await del.click();
    await expect(page.locator("#rec-archive .arc-r")).toHaveCount(1);
    const d = await published(page);
    expect(d.archive).toEqual([ARC[0]]);
    expect(d.updated).toBe(R.updated);
    // the oldest round is gone: the note appears after deleting the last one too
    await expand(page, 0);
    await row(page, 0).locator('[data-op="del-round"]').click();
    await row(page, 0).locator('[data-op="del-round"]').click();
    await expect(page.locator("#rec-arc-none")).toHaveText("Noch keine früheren Runden.");
  });

  test("undo: archive[0] becomes the current round, the discarded one is nowhere", async ({ page }) => {
    await open(page);
    await expand(page, 1);
    await expect(row(page, 1).locator('[data-op="restore"]')).toHaveCount(0); // only the newest round
    await expand(page, 0);
    const back = row(page, 0).locator('[data-op="restore"]');
    await expect(back).toHaveText("Als aktuelle Runde zurückholen");
    await back.click();
    await expect(back).toHaveText("Wirklich zurückholen?");
    await back.click();
    await expect(page.locator("#rec-archive .arc-r")).toHaveCount(1);
    await expect(page.locator("#rec-list .rec-ed b")).toHaveText(ARC[0].groups.middle.map(r => r.t));
    await expect(page.locator('#rec-topic input[data-f="de"]')).toHaveValue("Herbstlektüre");
    const s = await save(page, "#rec-dl");
    const d = evaluate(s, "DSM_RECOMMENDATIONS");
    expect(d.groups.middle).toEqual(ARC[0].groups.middle);
    expect(d.groups["adult-fiction"]).toEqual(ARC[0].groups["adult-fiction"]);
    expect(d.groups.upper).toEqual([]);
    expect(d.updated).toBe("2026-09-01");
    expect(d.topic).toEqual(ARC[0].topic);
    expect(d.archive).toEqual([ARC[1]]);
    expect(s).not.toContain(R.groups.middle[0].k);
    expect(s).not.toContain(R.updated);
    if (FOLDER({ browserName: browserOf(page) })) await expect.poll(async () => (await draft(page))?.restored).toBeUndefined();
    // published again: nothing moves any more
    const again = await republished(page, x => x.updated === "2026-09-01");
    expect(again.updated).toBe("2026-09-01");
    expect(again.archive).toEqual([ARC[1]]);
  });

  test("undo, then change a book: new round, the restored one is at archive[0]", async ({ page }) => {
    await open(page);
    await expand(page, 0);
    await row(page, 0).locator('[data-op="restore"]').click();
    await row(page, 0).locator('[data-op="restore"]').click();
    await page.locator('#rec-list .rec-ed[data-n="0"] [data-op="del"]').click();
    const d = await published(page);
    expect(d.updated).toBe(TODAY);
    expect(d.groups.middle.length).toBe(1);
    expect(d.archive.length).toBe(2);
    expect(d.archive[0].updated).toBe("2026-09-01");
    expect(d.archive[0].topic).toEqual(ARC[0].topic);
    expect(d.archive[0].groups.middle).toEqual(ARC[0].groups.middle);
    expect(d.archive[1]).toEqual(ARC[1]);
    expect(JSON.stringify(d)).not.toContain(R.groups.middle[0].k);
  });

  test("discarding the draft drops undo and archive edits", async ({ page }) => {
    await open(page);
    await expand(page, 0);
    await row(page, 0).locator('[data-op="restore"]').click();
    await row(page, 0).locator('[data-op="restore"]').click();
    await expect.poll(async () => !!(await draft(page))?.restored).toBe(true);
    await page.click("#rec-reset");
    await page.click("#rec-reset");
    await expect(page.locator("#rec-archive .arc-r")).toHaveCount(2);
    await expect(page.locator("#rec-list .rec-ed b")).toHaveText(R.groups.middle.map(r => r.t));
    expect(await draft(page)).toBeNull();
  });
});

test("without any archive: note instead of the list", async ({ page }) => {
  await page.route("**/recommendations.js", r => r.fulfill({
    contentType: "text/javascript",
    body: "window.DSM_RECOMMENDATIONS = " + JSON.stringify(R) + ";\n",
  }));
  await open(page);
  await expect(page.locator("#rec-arc-none")).toHaveText("Noch keine früheren Runden.");
  await expect(page.locator("#rec-archive .arc-r")).toHaveCount(0);
});

test("missing translations: notes appear and disappear", async ({ page }) => {
  await open(page);
  await expect(page.locator("#rec-list .warn")).toHaveCount(0);
  await page.locator('#rec-list .rec-ed[data-n="3"] [data-op="del"]').click();
  await page.fill("#rec-q", "verwandlung kafka");
  await page.locator("#rec-res button:not([disabled])").first().click();
  const last = page.locator("#rec-list .rec-ed:last-child");
  await expect(last.locator(".warn-de")).toHaveText("Deutscher Text fehlt");
  await expect(last.locator(".warn-it")).toHaveText("Italienischer Text fehlt – es erscheint der deutsche");
  await last.locator("textarea[data-f=de]").fill("Ein Text.");
  await expect(last.locator(".warn-de")).toHaveCount(0);
  await expect(last.locator(".warn-it")).toHaveCount(1);
  await last.locator("textarea[data-f=it]").fill("Un testo.");
  await expect(last.locator(".warn")).toHaveCount(0);
  await last.locator("textarea[data-f=it]").fill("   ");
  await expect(last.locator(".warn-it")).toHaveCount(1);
});
