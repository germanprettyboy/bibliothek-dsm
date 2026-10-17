/*
 * Shared fixture: cover services blocked by default (no real network in tests),
 * images only load if net.image(url) agrees (default: only Open Library images via the cover ID),
 * every request is recorded, script errors make the test fail.
 */
const base = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const { WEB, TMP, data, hits, keyOf } = require("../helpers/load.js");

const IMAGE = fs.readFileSync(path.join(WEB, "assets", "logo-light.png")); // 720×401 px, good enough as a "cover"
const CORS = { "access-control-allow-origin": "*" };
const OFF = JSON.stringify({ want: false, group: null });

const test = base.test.extend({
  // Initial state in localStorage (set before every load). Default: questions on the first visit already answered.
  storage: [{ "dsm-recs": OFF }, { option: true }],
  net: async ({ context }, use) => {
    const n = { requests: [], ol: null, image: url => /covers\.openlibrary\.org\/b\/id\//.test(url) };
    await context.route(/openlibrary\.org|books\.google\.com|cover\.ekz\.de/, async route => {
      const url = route.request().url();
      n.requests.push(url);
      if (url.startsWith("https://openlibrary.org/api/books") && n.ol) {
        const keys = decodeURIComponent(new URL(url).searchParams.get("bibkeys")).split(",");
        return route.fulfill({ json: n.ol(keys), headers: CORS });
      }
      if (!url.includes("/api/books") && n.image(url)) {
        return route.fulfill({ body: IMAGE, contentType: "image/png" });
      }
      return route.abort();
    });
    await use(n);
  },
  page: async ({ page, storage, net }, use) => { // eslint-disable-line no-unused-vars
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error" && !/ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.addInitScript(s => {
      if (sessionStorage.getItem("__test-init")) return; // only on the first load, a reload keeps the state
      sessionStorage.setItem("__test-init", "1");
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    }, storage);
    await use(page);
    base.expect(errors, "script errors on the page").toEqual([]);
  },
});

// List loaded and questions overlay appeared, if any
async function open(page, url = "index.html") {
  await page.goto(url);
  await page.locator("#list .row").first().or(page.locator("#list .empty")).waitFor();
}

module.exports = { test, expect: base.expect, open, data, hits, keyOf, TMP, IMAGE, OFF };
