/*
 * Admin page, tab "Info": Sunday, special opening hours ("Andere Zeiten"), notice with period, contact.
 * Shared helpers: admin-helpers.js. The published info.js is read back from the (test) website folder.
 */
const { test, expect } = require("./helpers.js");
const { adminSetup, unlock, tab, save, evaluate, folderData } = require("./admin-helpers.js");

adminSetup();

async function open(page) {
  await unlock(page);
  await tab(page, "info");
}
const published = async page => evaluate(await save(page, "#i-dl"), "DSM_INFO");
// Publishing again: the success message is already there, so wait for the written content itself
const republished = async (page, pick, value) => {
  await page.click("#i-dl");
  await expect.poll(async () => { const d = await folderData(page, "info.js", "DSM_INFO"); return d && pick(d); }).toEqual(value);
};
const clo = (page, n) => page.locator(`#i-clo .clo[data-n="${n}"]`);

test.describe("Sunday", () => {
  test("seventh day with the same controls; copy still goes to Tue–Fri only", async ({ page }) => {
    await open(page);
    await expect(page.locator("#i-hours .day")).toHaveCount(7);
    await expect(page.locator('#i-hours .day[data-d="sun"] b')).toHaveText("Sonntag");
    await page.locator('#i-hours .day[data-d="mon"] [data-op="add"]').click();
    await page.locator('#i-hours .day[data-d="sun"] [data-op="add"]').click();
    await page.locator('#i-hours .day[data-d="sun"] input[data-f="0"]').fill("10:00");
    await page.locator('#i-hours .day[data-d="sun"] input[data-f="1"]').fill("12:00");
    await page.click("#i-copy");
    await expect(page.locator('#i-hours .day[data-d="sat"] .range')).toHaveCount(0);
    const d = await published(page);
    expect(d.hours.sun).toEqual([["10:00", "12:00"]]);
    expect(d.hours.fri).toEqual([["08:00", "13:00"]]);
    expect(d.hours.sat).toEqual([]);
  });
});

test.describe("special opening hours", () => {
  test("third type with its own time ranges, written sorted with valid ranges only", async ({ page }) => {
    await open(page);
    await page.click("#i-add-special");
    const c = clo(page, 0);
    await expect(c.locator('[data-type="special"]')).toHaveAttribute("data-state", "on");
    await expect(c.locator(".range")).toHaveCount(1);
    await expect(c.locator('input.txt[data-f="de"]')).toHaveAttribute("placeholder", "Geänderte Öffnungszeiten");
    await expect(c.locator('input.txt[data-f="it"]')).toHaveAttribute("placeholder", "Orari modificati");
    await c.locator('input[data-f="from"]').fill("2099-12-23");
    await c.locator('input[data-f="to"]').fill("2099-12-24");
    // second range typed earlier than the first one: output is sorted
    await c.locator('[data-op="add"]').click();
    await expect(c.locator(".range")).toHaveCount(2);
    await expect(c.locator('[data-op="add"]')).toHaveCount(0);
    await c.locator('.range[data-n="0"] input[data-f="0"]').fill("14:00");
    await c.locator('.range[data-n="0"] input[data-f="1"]').fill("16:00");
    await c.locator('.range[data-n="1"] input[data-f="0"]').fill("08:00");
    await c.locator('.range[data-n="1"] input[data-f="1"]').fill("11:00");
    await c.locator('input.txt[data-f="de"]').fill("Weihnachtswoche");
    await expect(page.locator("#i-state")).toHaveCount(0);
    const d = await published(page);
    expect(d.closures).toEqual([{ type: "special", from: "2099-12-23", to: "2099-12-24", de: "Weihnachtswoche", it: "", hours: [["08:00", "11:00"], ["14:00", "16:00"]] }]);
  });

  test("without a valid range: incomplete, warning, not published", async ({ page }) => {
    await open(page);
    await page.click("#i-add-special");
    const c = clo(page, 0);
    await c.locator('input[data-f="from"]').fill("2099-12-23");
    await c.locator('.range input[data-f="1"]').fill("07:00"); // 08:00–07:00 = invalid
    await expect(c.locator('.range input[data-f="1"]')).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#i-state")).toContainText("1 unvollständige Angaben");
    await expect(c.locator(".warn")).toBeVisible();
    await c.locator('.range [data-op="del"]').click();
    await expect(c.locator(".range")).toHaveCount(0);
    await expect(page.locator("#i-state")).toContainText("1 unvollständige Angaben");
    const d = await published(page);
    expect(d.closures[0].hours).toEqual([]);
    await c.locator('[data-op="add"]').click();
    await expect(page.locator("#i-state")).toHaveCount(0);
  });

  test("changing the type of an entry to special adds a range; back to holiday drops the hours", async ({ page }) => {
    await open(page);
    await page.click("#i-add-holiday");
    const c = clo(page, 0);
    await c.locator('input[data-f="from"]').fill("2099-12-23");
    await c.locator('[data-type="special"]').click();
    await expect(clo(page, 0).locator(".range")).toHaveCount(1);
    await clo(page, 0).locator('[data-type="holiday"]').click();
    await expect(clo(page, 0).locator(".range")).toHaveCount(0);
    const d = await published(page);
    expect(d.closures[0]).toEqual({ type: "holiday", from: "2099-12-23", to: "2099-12-23", de: "", it: "" });
  });

  test("draft survives a reload (type and hours)", async ({ page }) => {
    await open(page);
    await page.click("#i-add-special");
    await clo(page, 0).locator('input[data-f="from"]').fill("2099-12-23");
    await clo(page, 0).locator('.range input[data-f="1"]').fill("11:30");
    await page.waitForTimeout(500);
    await page.reload(); // stays unlocked in this tab
    await expect(page.locator("#app")).toBeVisible({ timeout: 15000 });
    await tab(page, "info");
    await expect(clo(page, 0).locator('[data-type="special"]')).toHaveAttribute("data-state", "on");
    await expect(clo(page, 0).locator('.range input[data-f="1"]')).toHaveValue("11:30");
  });
});

test.describe("notice with a period", () => {
  test("optional from/to are written only when set; a past end warns", async ({ page }) => {
    await open(page);
    await page.fill("#i-note-de", "Hinweis");
    let d = await published(page);
    expect(d.notice).toEqual({ de: "Hinweis", it: "" });
    await expect(page.locator("#i-note-warn")).toBeHidden();
    await page.fill("#i-note-from", "2099-01-10");
    await page.fill("#i-note-to", "2099-01-20");
    await republished(page, x => x.notice, { de: "Hinweis", it: "", from: "2099-01-10", to: "2099-01-20" });
    await page.fill("#i-note-to", "2020-01-01");
    await expect(page.locator("#i-note-warn")).toBeVisible(); // ends before it starts
    await page.fill("#i-note-from", "");
    await expect(page.locator("#i-note-warn")).toHaveText("Vorbei – wird nicht mehr angezeigt.");
    await republished(page, x => x.notice, { de: "Hinweis", it: "", to: "2020-01-01" });
  });
});

test.describe("contact", () => {
  test("card between notice and closures; written only if something is filled in, trimmed", async ({ page }) => {
    await open(page);
    const txt = await page.locator("#tab-info").innerText();
    expect(txt.indexOf("Hinweis (optional)")).toBeLessThan(txt.indexOf("Kontakt"));
    expect(txt.indexOf("Kontakt")).toBeLessThan(txt.indexOf("Ferien, Abwesenheiten"));
    await expect(page.locator("#i-contact-email")).toHaveAttribute("type", "email");
    await expect(page.locator("#i-contact-phone")).toHaveAttribute("type", "tel");
    let d = await published(page);
    expect(d).not.toHaveProperty("contact");
    await page.fill("#i-contact-email", "  bibliothek@example.org ");
    await page.fill("#i-contact-phone", "+39 02 1234567");
    await page.fill("#i-contact-de", "Raum 12, Frau Beispiel");
    await page.fill("#i-contact-it", "   ");
    await republished(page, x => x.contact, { email: "bibliothek@example.org", phone: "+39 02 1234567", de: "Raum 12, Frau Beispiel" });
  });

  test("Italian labels", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("dsm-lang", "it"));
    await open(page);
    await expect(page.locator("#tab-info")).toContainText("Contatti");
    await expect(page.locator("#tab-info")).toContainText("Visibile dal");
    await expect(page.locator("#i-add-special")).toHaveText("+ Altri orari");
  });
});
