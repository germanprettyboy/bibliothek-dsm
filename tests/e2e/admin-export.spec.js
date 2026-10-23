/*
 * Admin page, tab "Pflege": downloads as Excel workbook (tools/source/admin/xlsx.js: ZIP without compression, one sheet
 * per list, "Übersicht" first) and printing (print.jsx: dialog with the choice of lists, printable document in body).
 * The CSV contents are checked in admin-care.spec.js. window.print is replaced: no real print dialog.
 */
const fs = require("fs");
const { test, expect, PHONE, swipeStages } = require("./helpers.js");
const { adminSetup, unlock, importTest, tab, menusClosed } = require("./admin-helpers.js");

adminSetup();

// Download as bytes
async function bytes(page, selector) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click(selector)]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
}
// ZIP entries (xlsx.js writes STORE entries with their sizes in the local header): { name: text }
function unzip(buf) {
  const files = {};
  for (let p = 0; buf.readUInt32LE(p) === 0x04034b50;) {
    const method = buf.readUInt16LE(p + 8), size = buf.readUInt32LE(p + 18), n = buf.readUInt16LE(p + 26), x = buf.readUInt16LE(p + 28);
    const start = p + 30 + n + x;
    files[buf.toString("utf8", p + 30, p + 30 + n)] = method === 0 ? buf.toString("utf8", start, start + size) : null;
    p = start + size;
  }
  return files;
}
const unxml = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const sheetsOf = files => [...files["xl/workbook.xml"].matchAll(/<sheet name="([^"]*)"/g)].map(m => unxml(m[1]));

async function care(page) {
  await unlock(page);
  await importTest(page);
  await tab(page, "care");
}
// window.print records what would be printed: the lists of the document, its text, the class on <html>
const stubPrint = page => page.addInitScript(() => {
  window.__printed = null;
  window.print = () => {
    const d = document.querySelectorAll("[data-print]");
    window.__printed = {
      n: d.length, text: d.length ? d[0].textContent : "",
      lists: d.length ? Array.from(d[0].querySelectorAll("[data-print-list]"), s => s.getAttribute("data-print-list")) : [],
      printing: document.documentElement.classList.contains("printing"),
    };
  };
});

test.describe("Excel export", () => {
  test("one list and all lists: valid workbooks, one sheet per list", { tag: "@smoke" }, async ({ page }) => {
    await care(page);
    const one = page.locator('.check[data-check="yearOdd"]');
    await one.locator(":scope > button").click();
    await one.locator('[data-dl="yearOdd"]').click();
    await expect(page.locator('[data-xlsx="yearOdd"]')).toHaveText("Excel-Tabelle (.xlsx)");
    await expect(page.locator('[data-csv="yearOdd"]')).toHaveText("CSV-Datei (.csv)");
    const a = await bytes(page, '[data-xlsx="yearOdd"]');
    expect(a.name).toMatch(/^erscheinungsjahr-nicht-als-jahreszahl-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(a.buf.subarray(0, 2).toString()).toBe("PK");
    const f = unzip(a.buf);
    expect(Object.keys(f)).toEqual(expect.arrayContaining(["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml"]));
    expect(sheetsOf(f)).toEqual(["Erscheinungsjahr nicht als…"]);
    const s1 = f["xl/worksheets/sheet1.xml"];
    expect(s1).toContain("Bibliothek DSM · Fehlerliste · Erscheinungsjahr nicht als Jahreszahl");
    expect(s1).toContain('<pane ySplit="4"'); // title, hint, blank row, frozen header
    expect(s1).toMatch(/<autoFilter ref="A4:J6"\/>/);
    expect(s1).toContain("<t>2010 (1. Aufl.)</t>");
    expect(s1).toMatch(/<c r="I6" s="\d+"><v>46096<\/v><\/c>/); // 15.03.2026 as a real date
    expect(f["xl/styles.xml"]).toContain('formatCode="dd.mm.yyyy"');
    expect(f["xl/styles.xml"]).toContain('<name val="Fira Sans"/>');

    await page.click("#m-dl");
    const all = await bytes(page, "#m-all-xlsx");
    expect(all.name).toMatch(/^bestandspflege-\d{4}-\d{2}-\d{2}\.xlsx$/);
    const g = unzip(all.buf);
    const names = sheetsOf(g);
    expect(names[0]).toBe("Übersicht");
    expect(names).toEqual(expect.arrayContaining(["Ungültige ISBN", "Ohne ISBN", "Erscheinungsjahr nicht als…", "Autoren in mehreren…", "Ungenutzte Kategorien"]));
    expect(names).not.toContain("Titel in Großbuchstaben"); // empty lists: only in the overview
    for (const n of names) expect(n.length).toBeLessThanOrEqual(31);
    expect(new Set(names).size).toBe(names.length);
    const overview = g["xl/worksheets/sheet1.xml"];
    expect(overview).toContain("Titel in Großbuchstaben");
    expect(overview).toContain('location="\'Ungültige ISBN\'!A1"'); // link to the list's sheet
    // the ISBN stays text (no 9,78E+12), Excel's "number stored as text" hint is off
    const bad = g[`xl/worksheets/sheet${names.indexOf("Ungültige ISBN") + 1}.xml`];
    expect(bad).toContain('t="inlineStr"><is><t>9783522202100</t>');
    expect(bad).toContain('numberStoredAsText="1"');
    expect(Object.values(g).join("")).not.toContain("Musterfrau");
  });

  test("location list: this location and all locations", async ({ page }) => {
    await care(page);
    await page.selectOption("#m-loc", "Jugendbücher 6 Brett 5");
    await page.click("#m-shelf-dl");
    const one = unzip((await bytes(page, "#m-shelf-xlsx")).buf);
    expect(sheetsOf(one)).toEqual(["Jugendbücher 6 Brett 5"]);
    expect((one["xl/worksheets/sheet1.xml"].match(/<row /g) || []).length).toBe(1 + 1 + 3); // title, header (after an empty row 2), 3 copies
    await menusClosed(page);
    await page.click("#m-shelf-dl");
    const all = unzip((await bytes(page, "#m-shelf-all-xlsx")).buf);
    expect(sheetsOf(all)).toEqual(["Alle Standorte"]);
    expect((all["xl/worksheets/sheet1.xml"].match(/<row /g) || []).length).toBe(1 + 1 + 10);
  });
});

test.describe("printing the error lists", () => {
  test("choose lists, preview, the printout contains only them", async ({ page }) => {
    await stubPrint(page);
    await care(page);
    await page.click("#m-print-lists");
    const dialog = page.locator(".sheet.print-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#p-t")).toHaveText("Fehlerliste drucken");
    await expect(dialog.locator("#p-chosen")).toHaveText(/^(\d+) von \1 Listen · \d+ Einträge$/);
    await expect(dialog.locator(".pd-preview .pd-hd")).toContainText("Fehlerliste");
    // choose: none, then two lists; the menu stays open while choosing
    await page.click("#p-pick");
    await expect(page.locator('[data-pick="isbnBad"]')).toHaveAttribute("data-state", "checked");
    await expect(page.locator('[data-pick="titleCaps"]')).toHaveCount(0); // empty lists are not offered
    await page.click("#p-none");
    await expect(page.locator('[data-pick="isbnBad"]')).toHaveAttribute("data-state", "unchecked");
    await expect(dialog.locator("#p-chosen")).toHaveText("Keine Liste gewählt.");
    await expect(dialog.locator("#p-go")).toBeDisabled();
    await page.click('[data-pick="isbnBad"]');
    await page.click('[data-pick="authorDup"]');
    await expect(page.locator('[data-pick="authorDup"]')).toHaveAttribute("data-state", "checked");
    await page.keyboard.press("Escape"); // closes the menu, not the dialog
    await expect(page.locator('[data-pick="isbnBad"]')).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#p-chosen")).toHaveText(/^2 von \d+ Listen · 2 Einträge$/);
    await expect(dialog.locator(".pd-preview [data-print-list]")).toHaveCount(2);
    await dialog.locator("#p-go").click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.__printed && window.__printed.n)).toBe(1);
    const p = await page.evaluate(() => window.__printed);
    expect(p.printing).toBe(true);
    expect(p.lists).toEqual(["isbnBad", "authorDup"]);
    expect(p.text).toContain("Bibliothek · Fehlerliste");
    expect(p.text).toContain("Ungültige ISBN");
    expect(p.text).toContain("Das doppelte Lottchen");
    expect(p.text).toContain("Preußler, Otfried · preussler, Otfried");
    expect(p.text).toContain("Bibliothek der Deutschen Schule Mailand · Verwaltung");
    expect(p.text).not.toContain("Musterfrau");
    await expect(page.locator("[data-print]")).toBeHidden(); // never on screen
    // "Alle" chooses every list again
    await page.click("#m-print-lists");
    await page.click("#p-pick");
    await page.click("#p-all");
    await expect(page.locator('[data-pick="yearOdd"]')).toHaveAttribute("data-state", "checked");
  });
});

test.describe("print dialog on the phone", () => {
  test.use({ ...PHONE });
  test("swiping: half, up, down, closed", async ({ page }) => {
    await care(page);
    await page.click("#m-print-lists");
    await swipeStages(page, page.locator(".sheet.print-dialog"));
  });
});
