/*
 * Performance and stress, Chromium only (CDP CPU throttling). Budgets are generous on purpose (shared 2-core runner):
 * they catch a regression by a factor, not by percent. Measured values appear as annotations in the report.
 * Reference (CLAUDE.md, 390 px, CPU 4×, Mac): DOMContentLoaded ≈0.5 s, longest task ≈0.9 s (parsing books.js).
 */
const { test, expect, open, data } = require("./helpers.js");

const { B } = data();
const note = (type, description) => test.info().annotations.push({ type, description });

// Long tasks and the moment of the first list row, measured in the page itself
const measure = page => page.addInitScript(() => {
  window.__long = [];
  try {
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(e.duration); })
      .observe({ type: "longtask", buffered: true });
  } catch (e) { /* */ }
});
const results = page => page.evaluate(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  return { dcl: Math.round(nav.domContentLoadedEventEnd), longest: Math.round(Math.max(0, ...window.__long)) };
});

test.describe("performance", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("loading at CPU 4×: list visible, no endless block", async ({ page }) => {
    test.setTimeout(60000);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await measure(page);
    const t0 = Date.now();
    await open(page);
    const firstRow = Date.now() - t0;
    const r = await results(page);
    note("first row", firstRow + " ms");
    note("DOMContentLoaded", r.dcl + " ms");
    note("longest task", r.longest + " ms");
    expect(firstRow, "first list row").toBeLessThan(8000);
    expect(r.dcl, "DOMContentLoaded").toBeLessThan(4000);
    expect(r.longest, "longest task").toBeLessThan(5000);
  });

  test("search at CPU 4×: hits within a second", async ({ page }) => {
    await open(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const t0 = Date.now();
    await page.fill("#q", "die");
    await expect(page.locator("#meta")).toHaveText(/Treffer$/, { timeout: 10000 });
    const ms = Date.now() - t0;
    note("search", ms + " ms");
    expect(ms).toBeLessThan(3000);
  });
});

test.describe("stress: three times as many books", () => {
  // every book three times (title with a suffix), sorted as generate-books sorts: a catalog of ≈14,000 books
  const coll = new Intl.Collator("de", { sensitivity: "base", numeric: true });
  const books = [0, 2, 3].flatMap(n => B.books.map(b => (n ? { ...b, t: b.t + " " + n } : b)))
    .sort((x, y) => coll.compare(x.t.replace(/^[^\p{L}\p{N}]+/u, ""), y.t.replace(/^[^\p{L}\p{N}]+/u, "")));
  const body = "window.DSM_LIBRARY = " + JSON.stringify({ updated: B.updated, count: books.length, books }) + ";\n";

  test("all rows present, search and scrolling to the end", async ({ page }) => {
    test.setTimeout(90000);
    await page.route("**/books.js", r => r.fulfill({ body, contentType: "text/javascript" }));
    await measure(page);
    const t0 = Date.now();
    await open(page);
    await expect(page.locator("#list .row")).toHaveCount(books.length, { timeout: 30000 });
    note("all " + books.length + " rows", Date.now() - t0 + " ms");
    const r = await results(page);
    note("longest task", r.longest + " ms");
    expect(r.longest).toBeLessThan(5000);

    const t1 = Date.now();
    await page.fill("#q", "tschick");
    await expect(page.locator("#meta")).toHaveText(/Treffer$/);
    note("search", Date.now() - t1 + " ms");
    expect(Date.now() - t1).toBeLessThan(3000);
    await page.fill("#q", "");
    await expect(page.locator("#list .row")).toHaveCount(books.length, { timeout: 30000 });

    const last = page.locator("#list .row").last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ timeout: 10000 });
    await expect(last.locator(".t")).toHaveText(books[books.length - 1].t);
  });
});
