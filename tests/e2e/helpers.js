/*
 * Gemeinsame Fixture: Cover-Dienste standardmäßig gesperrt (kein echtes Netz in Tests),
 * Bilder laden nur, wenn netz.bild(url) zustimmt (Standard: nur Open-Library-Bilder über die Cover-ID),
 * jede Anfrage wird mitgeschrieben, Skriptfehler lassen den Test scheitern.
 */
const base = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const { WEB, TMP, daten, treffer, schluessel } = require("../helfer/laden.js");

const BILD = fs.readFileSync(path.join(WEB, "assets", "logo-hell.png")); // 720×401 px, reicht als „Cover“
const CORS = { "access-control-allow-origin": "*" };
const AUS = JSON.stringify({ want: false, gruppe: null });

const test = base.test.extend({
  // Startzustand im localStorage (vor jedem Laden gesetzt). Standard: Fragen beim ersten Besuch schon beantwortet.
  speicher: [{ "dsm-empf": AUS }, { option: true }],
  netz: async ({ context }, use) => {
    const n = { anfragen: [], ol: null, bild: url => /covers\.openlibrary\.org\/b\/id\//.test(url) };
    await context.route(/openlibrary\.org|books\.google\.com|cover\.ekz\.de/, async route => {
      const url = route.request().url();
      n.anfragen.push(url);
      if (url.startsWith("https://openlibrary.org/api/books") && n.ol) {
        const keys = decodeURIComponent(new URL(url).searchParams.get("bibkeys")).split(",");
        return route.fulfill({ json: n.ol(keys), headers: CORS });
      }
      if (!url.includes("/api/books") && n.bild(url)) {
        return route.fulfill({ body: BILD, contentType: "image/png" });
      }
      return route.abort();
    });
    await use(n);
  },
  page: async ({ page, speicher, netz }, use) => { // eslint-disable-line no-unused-vars
    const fehler = [];
    page.on("pageerror", e => fehler.push(e.message));
    page.on("console", m => { if (m.type() === "error" && !/ERR_FAILED|Failed to load resource/.test(m.text())) fehler.push(m.text()); });
    await page.addInitScript(s => {
      if (sessionStorage.getItem("__test-init")) return; // nur beim ersten Laden, Reload behält den Zustand
      sessionStorage.setItem("__test-init", "1");
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    }, speicher);
    await use(page);
    base.expect(fehler, "Skriptfehler auf der Seite").toEqual([]);
  },
});

// Liste geladen und Fragen-Overlay ggf. erschienen
async function oeffnen(page, url = "index.html") {
  await page.goto(url);
  await page.locator("#list .row").first().or(page.locator("#list .empty")).waitFor();
}

module.exports = { test, expect: base.expect, oeffnen, daten, treffer, schluessel, TMP, BILD, AUS };
