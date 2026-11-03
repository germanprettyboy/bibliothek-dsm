/*
 * Admin page, tab "Regale" (tools/source/admin/shelves.jsx, analysis shelves-core.js): books placed wrong (check list with
 * reasons and "Passt so"), shelf overview, board dialog (inventory: missing, found here, checked), inventory result,
 * downloads, printing, and the placement lists in tab "Pflege". Test database: tests/helpers/testdb.js shelves()
 * (SHELF_WRONG = the copies placed wrong on purpose). window.print is replaced: no real print dialog.
 */
const path = require("path");
const { test, expect, PHONE, swipeStages, TMP } = require("./helpers.js");
const { adminSetup, unlock, load, tab, downloadFile, menusClosed } = require("./admin-helpers.js");
const { SHELF_WRONG } = require("../helpers/testdb.js");

adminSetup();

async function shelves(page) {
  await unlock(page);
  await load(page, path.join(TMP, "shelves.winbook"));
  await expect(page.locator("#report")).toBeVisible({ timeout: 20000 });
  await tab(page, "shelves");
}
const rows = text => text.replace(/^﻿/, "").trim().split("\r\n").map(l => l.split(";"));
const move = (page, title) => page.locator(".sh-move", { hasText: title });
const WRONG = Object.values(SHELF_WRONG).flat().sort();
// window.print records what would be printed: the lists of the document and its text
const stubPrint = page => page.addInitScript(() => {
  window.__printed = null;
  window.print = () => {
    const d = document.querySelector("[data-print]");
    window.__printed = d ? { text: d.textContent, lists: Array.from(d.querySelectorAll("[data-print-list]"), s => s.getAttribute("data-print-list")) } : null;
  };
});

test.describe("tab Regale", () => {
  test("before an import: note, the button leads to the catalog tab", { tag: "@smoke" }, async ({ page }) => {
    await unlock(page);
    await tab(page, "shelves");
    await expect(page.locator("#sh-none")).toContainText("Nichts davon wird veröffentlicht");
    await page.click("#sh-to-catalog");
    await expect(page.locator("#tab-catalog")).toBeVisible();
  });

  test("check list: every copy placed wrong, by its location in shelf order, with where it belongs; filter by reason", { tag: "@smoke" }, async ({ page }) => {
    await shelves(page);
    await expect(page.locator("#sh-big")).toHaveText("7");
    await expect(page.locator("#sh-lines")).toContainText("Exemplare mit Standort70");
    await expect(page.locator("#sh-lines")).toContainText("Nach Autor A–Z sortiertRomane");
    await expect(page.locator(".sh-move")).toHaveCount(7);
    expect((await page.locator(".sh-move .sh-t").allTextContents()).sort()).toEqual(WRONG);
    expect(await page.locator("#sh-moves .sh-loc").evaluateAll(s => s.map(e => e.dataset.loc)))
      .toEqual(["Jugendbücher 1 Brett 3", "Romane", "Romane 1 Brett 1", "Romane 2 Brett 2", "Sachbuch Brett 1", "Schreibtisch"]);
    await expect(move(page, "Der Steppenwolf")).toHaveAttribute("data-key", "placeOrder");
    await expect(move(page, "Der Steppenwolf")).toContainText("H → Romane 1 Brett 2");
    await expect(move(page, "Drachenherz")).toHaveAttribute("data-key", "placeCategory");
    await expect(move(page, "Drachenherz")).toContainText("Cornelia Funke · Fantasy · Nr. 52");
    await expect(move(page, "Drachenherz")).toContainText("→ Jugendbücher 1 Brett 1");
    await expect(move(page, "Ohne Brett 1")).toContainText("→ Romane 1 · Romane 2");

    await expect(page.locator('[data-reason="all"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-reason="placeCategory"]')).toHaveText(/^Kategorie\s*3$/);
    await page.click('[data-reason="placeOrder"]');
    await expect(page.locator('[data-reason="placeOrder"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".sh-move .sh-t")).toHaveText(["Der Steppenwolf", "Der Zauberberg"]);
    await page.click('[data-reason="placeVague"]');
    await expect(page.locator(".sh-move .sh-t")).toHaveText(["Ohne Brett 1", "Ohne Brett 2"]);
    await page.click('[data-reason="all"]');
    await expect(page.locator(".sh-move")).toHaveCount(7);
    await expect(page.locator("#tab-shelves")).not.toContainText("Musterfrau");
  });

  test("Passt so: the row disappears and stays hidden (WinBook number + list in the browser), can be shown again", async ({ page }) => {
    await shelves(page);
    await move(page, "Der Steppenwolf").locator("[data-ok-btn]").click();
    await expect(page.locator("#sh-big")).toHaveText("6");
    await expect(move(page, "Der Steppenwolf")).toHaveCount(0);
    await expect(page.locator('[data-reason="placeOrder"]')).toHaveText(/^A–Z\s*1$/);
    await expect(page.locator("#sh-lines")).toContainText("Als passend markiert1");
    expect(await page.evaluate(() => localStorage.getItem("dsm-shelf-ok"))).toBe('["39|placeOrder"]');
    await page.click("#sh-show-ok");
    await expect(move(page, "Der Steppenwolf")).toHaveAttribute("data-ok", "1");
    await move(page, "Der Steppenwolf").locator("[data-ok-btn]").click(); // "Doch prüfen"
    await expect(page.locator("#sh-big")).toHaveText("7");
    await expect(page.locator("#sh-show-ok")).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("dsm-shelf-ok"))).toBe("[]");
  });

  test("shelf overview → board dialog: copies in shelf order, missing, found here, checked → inventory", { tag: "@smoke" }, async ({ page }) => {
    await shelves(page);
    const unit = page.locator('.sh-unit[data-unit="Romane 1"]');
    await expect(unit.locator(":scope > button")).toHaveAttribute("aria-expanded", "false");
    await expect(unit).toContainText("23 Exemplare · 1 auffällig");
    await unit.locator(":scope > button").click();
    const board = page.locator('.sh-board[data-loc="Romane 1 Brett 1"]');
    await expect(board).toContainText("Roman (11) · A–D");
    await board.click();

    const dialog = page.locator("#sh-board");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#sh-board-t")).toHaveText("Romane 1 Brett 1");
    await expect(dialog.locator(".sh-copy")).toHaveCount(11);
    // A–Z section: by the surname of the first author (Böll before Brecht), the copy out of order last, with its flag
    await expect(dialog.locator(".sh-copy .sh-t")).toHaveText(["Roman von Anna Adler 1", "Roman von Anna Adler 2", "Roman von Paul Arndt",
      "Roman von Lisa Bauer", "Roman von Heinrich Böll", "Roman von Bertolt Brecht 1", "Roman von Bertolt Brecht 2", "Roman von Paul Celan",
      "Roman von Annette Droste", "Roman von Friedrich Dürrenmatt", "Der Steppenwolf"]);
    await expect(dialog.locator('.sh-copy[data-id="39"] [data-flag="placeOrder"]')).toContainText("H → Romane 1 Brett 2");

    const adler = dialog.locator('.sh-copy[data-id="1"]');
    await adler.locator("[data-miss]").click();
    await expect(adler).toHaveAttribute("data-missing", "1");
    await expect(adler.locator("[data-miss]")).toHaveAttribute("aria-pressed", "true");

    await dialog.locator("#sh-here-q").fill("d");
    await expect(dialog.locator("#sh-here-none")).toHaveText("Mindestens zwei Zeichen eingeben.");
    await dialog.locator("#sh-here-q").fill("drachen");
    await expect(dialog.locator("[data-add-here]")).toHaveCount(1);
    await expect(dialog.locator("#sh-here-hits")).toContainText("laut WinBook: Jugendbücher 1 Brett 3 · Nr. 52");
    await dialog.locator('[data-add-here="52"]').click();
    await expect(dialog.locator("#sh-here-q")).toHaveValue("");
    await expect(dialog.locator('[data-here="52"]')).toContainText("Drachenherz");
    // by number; a copy of this board is no hit
    await dialog.locator("#sh-here-q").fill("1");
    await expect(dialog.locator("#sh-here-none")).toHaveText("Kein Treffer.");

    await expect(dialog.locator("#sh-checked")).toHaveText("Brett als geprüft markieren");
    await dialog.locator("#sh-checked").click();
    await expect(dialog.locator("#sh-checked-on")).toHaveText(/^Geprüft am \d\d\.\d\d\.\d{4}$/);
    await expect(dialog.locator("#sh-checked")).toHaveText("Markierung aufheben");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await expect(board).toContainText(/1 auffällig · 1 fehlt · geprüft \d\d\.\d\d\.\d{4}/);
    await expect(unit).toContainText("1 von 2 Brettern geprüft");
    await expect(page.locator("#sh-inv-lines")).toContainText("Bretter geprüft1 von 10");
    await expect(page.locator("#sh-inv-lines")).toContainText("Nicht gefunden1");
    await expect(page.locator("#sh-inv-lines")).toContainText("Am falschen Platz1");
    const here = page.locator('#sh-inv .check[data-check="invHere"]');
    await here.locator(":scope > button").click();
    await expect(here.locator("tbody tr td")).toHaveText(["52", "Drachenherz", "Cornelia Funke", "Jugendbücher 1 Brett 3", "Romane 1 Brett 1"]);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("dsm-inventory")));
    expect(stored.boards["Romane 1 Brett 1"]).toMatchObject({ miss: [1], here: [52] });
  });

  test("shelf overview: search opens the matching shelves; places without a board are one row", async ({ page }) => {
    await shelves(page);
    await expect(page.locator(".sh-unit")).toHaveCount(6);
    await expect(page.locator('.sh-unit[data-unit="Schreibtisch"] > .sh-board[data-loc="Schreibtisch"]')).toContainText("1 auffällig");
    await page.fill("#sh-find", "sachbuch");
    await expect(page.locator(".sh-unit")).toHaveCount(1);
    await expect(page.locator('.sh-board[data-loc="Sachbuch Brett 1"]')).toBeVisible();
    await page.fill("#sh-find", "xyz");
    await expect(page.locator("#sh-map")).toContainText("Kein Regal mit diesem Namen.");
  });

  test("inventory: result as CSV, reset in two clicks", async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("__inv")) {
        localStorage.setItem("dsm-inventory", JSON.stringify({ boards: { "Romane 1 Brett 1": { d: "2026-11-01", miss: [1], here: [52] } } }));
        sessionStorage.setItem("__inv", "1");
      }
    });
    await shelves(page);
    await expect(page.locator("#sh-inv-lines")).toContainText("Bretter geprüft1 von 10");
    await page.click("#sh-inv-dl");
    const f = await downloadFile(page, "#sh-inv-csv");
    expect(f.name).toMatch(/^inventur-\d{4}-\d{2}-\d{2}\.csv$/);
    const r = rows(f.text);
    expect(r[0]).toEqual(["Liste", "Bereich", "Nr.", "Titel", "Autor", "Verlag", "Jahr", "Kategorie", "Standort", "Signatur", "Erfasst am", "Wert", "Exemplare"]);
    expect(r.slice(1).map(x => [x[0], x[1], x[2], x[3], x[8], x[11]])).toEqual([
      ["Bei der Inventur nicht gefunden", "Aufstellung", "1", "Roman von Anna Adler 1", "Romane 1 Brett 1", ""],
      ["Am falschen Platz gefunden", "Aufstellung", "52", "Drachenherz", "Jugendbücher 1 Brett 3", "Romane 1 Brett 1"],
    ]);
    await menusClosed(page);
    await page.click("#sh-inv-reset");
    await expect(page.locator("#sh-inv-reset")).toHaveText("Wirklich alles zurücksetzen?");
    await page.click("#sh-inv-reset");
    await expect(page.locator("#sh-inv-empty")).toBeVisible();
    await expect(page.locator("#sh-inv-lines")).toContainText("Bretter geprüft0 von 10");
    expect(await page.evaluate(() => localStorage.getItem("dsm-inventory"))).toBeNull();
  });

  test("check list: CSV with where each copy belongs, Excel, printing", async ({ page }) => {
    await stubPrint(page);
    await shelves(page);
    await page.click("#sh-dl");
    const f = await downloadFile(page, "#sh-csv");
    expect(f.name).toMatch(/^aufstellung-\d{4}-\d{2}-\d{2}\.csv$/);
    const r = rows(f.text);
    expect(r.length).toBe(1 + 7);
    expect(r.slice(1).map(x => x[3]).sort()).toEqual(WRONG);
    expect(r.find(x => x[3] === "Der Steppenwolf")[11]).toBe("H → Romane 1 Brett 2");
    expect(r.find(x => x[3] === "Tatort Hafen")[0]).toBe("Steht nicht bei seiner Kategorie");
    await menusClosed(page);
    await page.click("#sh-dl");
    const x = await downloadFile(page, "#sh-xlsx");
    expect(x.name).toMatch(/^aufstellung-\d{4}-\d{2}-\d{2}\.xlsx$/);
    await menusClosed(page);
    await page.click("#sh-print");
    await expect.poll(() => page.evaluate(() => window.__printed && window.__printed.lists)).toEqual(["placeCategory", "placeOrder", "placeVague"]);
    const printed = await page.evaluate(() => window.__printed.text);
    expect(printed).toContain("Prüfliste Aufstellung");
    expect(printed).toContain("Der Zauberberg");
  });

  test("tab Pflege: the placement lists in the group Aufstellung", async ({ page }) => {
    await shelves(page);
    await tab(page, "care");
    await expect(page.locator('#m-checks [data-group="place"] h3')).toHaveText("Aufstellung");
    const c = page.locator('.check[data-check="placeCategory"]');
    await expect(c.locator(":scope > button")).toHaveText(/Steht nicht bei seiner Kategorie\s*3/);
    await c.locator(":scope > button").click();
    await expect(c.locator("tbody")).toContainText("Drachenherz");
    await expect(c.locator("tbody")).toContainText("Jugendbücher 1 Brett 1");
  });
});

test.describe("board dialog on the phone", () => {
  test.use({ ...PHONE });
  test("swiping: half, up, down, closed", async ({ page }) => {
    await shelves(page);
    await page.click('.sh-unit[data-unit="Romane 1"] > button');
    await page.click('.sh-board[data-loc="Romane 1 Brett 2"]');
    await swipeStages(page, page.locator(".sheet.board-dialog"));
  });
});
