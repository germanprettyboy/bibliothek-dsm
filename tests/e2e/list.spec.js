// Book list: display, search, A–Z bar (from 768 px), letter floater (below), preview.
const { test, expect, PHONE, open, data, hits } = require("./helpers.js");

const { B } = data();

test.describe("list", () => {
  test("shows all books as plain text (title + author), no images", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    await expect(page.locator("#list .row")).toHaveCount(B.books.length);
    await expect(page.locator("#list img")).toHaveCount(0);
    await expect(page.locator("#list .cover")).toHaveCount(0);
    await expect(page.locator("#meta")).toHaveText(`${B.books.length.toLocaleString("de-DE")} Bücher`);
    const first = page.locator("#list .row").first();
    await expect(first.locator(".t")).toHaveText(B.books[0].t);
    await expect(first.locator(".a")).toHaveText(B.books[0].a.join(", "));
  });

  test("no footer; the skip link appears on the first tab and leads to the search", async ({ page }) => {
    await open(page);
    await expect(page.locator("footer")).toHaveCount(0);
    await page.keyboard.press("Tab");
    const skip = page.locator('a[href="#q"]');
    await expect(skip).toBeFocused();
    await expect(skip).toHaveText("Zur Suche springen");
    await page.keyboard.press("Enter");
    await expect(page.locator("#q")).toBeFocused();
  });

  test("letter chunks with anchors", async ({ page }) => {
    await open(page);
    await expect(page.locator("#L-K")).toHaveAttribute("data-l", "K");
    // the list renders step by step (2 chunks, then 20 per step): count once it is complete
    await expect(page.locator("#list .row")).toHaveCount(B.books.length);
    const n = await page.locator("#list ul[data-l]").count();
    expect(n).toBeGreaterThan(20);
  });

  test("list in chunks of at most 40 books, all books present, estimated height", async ({ page }) => {
    await open(page);
    // the list builds up in steps (first two chunks, then 20 each)
    await expect(page.locator("#list .row")).toHaveCount(B.books.length);
    const r = await page.evaluate(() => {
      const uls = [...document.querySelectorAll("#list .rows > ul")];
      return {
        max: Math.max(...uls.map(u => u.children.length)),
        rows: document.querySelectorAll("#list .row").length,
        withHeight: uls.every(u => /contain-intrinsic-size/.test(u.getAttribute("style") || "")),
        cv: getComputedStyle(uls[0]).contentVisibility,
      };
    });
    expect(r.max).toBeLessThanOrEqual(40);
    expect(r.rows).toBe(B.books.length);
    expect(r.withHeight).toBe(true);
    expect(r.cv).toBe("auto");
  });

  test("page text can be neither marked nor copied; the search field can", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    // user-select is not inherited (Firefox reports "auto" below body, which there means none): body, then a real try
    expect(await page.evaluate(() => getComputedStyle(document.body).userSelect)).toBe("none");
    await page.locator("#meta").dblclick();
    expect(await page.evaluate(() => String(getSelection()))).toBe("");
    // a copy anywhere on the page is refused, one in a field goes through
    const copy = sel => page.evaluate(s => {
      const e = new ClipboardEvent("copy", { bubbles: true, cancelable: true });
      document.querySelector(s).dispatchEvent(e);
      return e.defaultPrevented;
    }, sel);
    expect(await copy("#list .row")).toBe(true);
    expect(await copy("#q")).toBe(false);
    await page.fill("#q", "tschick");
    expect(await page.evaluate(() => getComputedStyle(document.getElementById("q")).userSelect)).not.toBe("none");
    await page.locator("#q").selectText();
    expect(await page.evaluate(() => { const q = document.getElementById("q"); return q.value.slice(q.selectionStart, q.selectionEnd); })).toBe("tschick");
  });

  test("no loan information visible", async ({ page }) => {
    await open(page);
    await expect(page.locator("body")).not.toContainText(/verliehen|ausgeliehen|verfügbar|vorgemerkt/i);
  });

  test("without books.js: an understandable message instead of an empty page", async ({ page }) => {
    await page.route("**/books.js", r => r.fulfill({ body: "", contentType: "text/javascript" }));
    await open(page);
    await expect(page.locator("#list .empty")).toContainText("books.js fehlt");
  });
});

test.describe("search", () => {
  const search = async (page, q) => { await page.fill("#q", q); await expect(page.locator("#list")).toHaveClass(/live/); };

  test("hits by title, count and highlighting", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    await search(page, "tschick");
    const n = hits(B.books, "tschick").length;
    await expect(page.locator("#meta")).toHaveText(`${n} Treffer`);
    await expect(page.locator("#list .row")).toHaveCount(n);
    await expect(page.locator("#list mark").first()).toHaveText(/tschick/i);
  });

  test('accents and ß don\'t matter: "preussler" finds Preußler', async ({ page }) => {
    await open(page);
    await search(page, "krabat preussler");
    await expect(page.locator("#list .row .t").first()).toHaveText(/Krabat/);
    await search(page, "Kästner");
    await expect(page.locator("#meta")).toHaveText(`${hits(B.books, "kastner").length} Treffer`);
  });

  test("highlighting also with accents and ß, like the search", async ({ page }) => {
    await open(page);
    await search(page, "Kästner");
    await expect(page.locator("#list .row .a mark").first()).toHaveText("Kästner");
    await search(page, "kastner");
    await expect(page.locator("#list .row .a mark").first()).toHaveText("Kästner");
    await search(page, "krabat preussler");
    await expect(page.locator("#list .row").first().locator("mark")).toHaveText(["Krabat", "Preußler"]);
  });

  test("ISBN search", async ({ page }) => {
    const b = B.books.find(x => x.i);
    await open(page);
    await search(page, b.i[0]);
    await expect(page.locator("#list .row .t").first()).toHaveText(b.t);
  });

  test("several terms: all must match", async ({ page }) => {
    await open(page);
    await search(page, "harry potter");
    const n = hits(B.books, "harry potter").length;
    await expect(page.locator("#list .row")).toHaveCount(n);
  });

  test("nothing found → note, A–Z letters disabled", async ({ page }) => {
    await open(page);
    await search(page, "qqqxyzzz");
    await expect(page.locator("#list .empty strong")).toHaveText("Kein Buch gefunden");
    await expect(page.locator("#meta")).toHaveText("0 Treffer");
    await expect(page.locator("#index button:enabled")).toHaveCount(0);
  });

  test("the clear button and Escape reset", async ({ page }) => {
    // Back to the full list takes ~3 s in Chromium: the fade-in animation .list.live > * over all rows
    // costs compositing time (layerize). Until that is fixed, give it more time.
    test.slow();
    await open(page);
    await expect(page.locator(".search .clear")).toBeHidden();
    await search(page, "tschick");
    await expect(page.locator(".search .clear")).toBeVisible();
    await page.click(".search .clear");
    await expect(page.locator("#q")).toHaveValue("");
    await expect(page.locator("#list .row")).toHaveCount(B.books.length);
    await search(page, "tschick");
    await page.locator("#q").press("Escape");
    await expect(page.locator("#meta")).toHaveText(`${B.books.length.toLocaleString("de-DE")} Bücher`);
  });

  test("HTML in the search is not executed", async ({ page }) => {
    await open(page);
    await search(page, "<img src=x onerror=alert(1)>");
    await expect(page.locator("#list img")).toHaveCount(0);
  });
});

test.describe("A–Z bar (from 768 px)", () => {
  test("desktop: a letter filters the list, the same letter again lifts the filter", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    await expect(page.locator("#index")).toBeVisible();
    await expect(page.locator("#index button")).toHaveCount(27);
    const n = await page.evaluate(() => window.DSM_LIBRARY.books.filter(b => b._l === "M").length);
    expect(n).toBeGreaterThan(0);
    const m = page.locator('#index button[data-l="M"]');
    await m.click();
    await expect(m).toHaveClass(/on/);
    await expect(m).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#list .row")).toHaveCount(n);
    await expect(page.locator("#meta")).toHaveText(`${n.toLocaleString("de-DE")} Treffer`);
    expect(await page.locator("#list ul[data-l]").evaluateAll(us => us.map(u => u.id))).toEqual(["L-M"]);
    await m.click();
    await expect(m).not.toHaveClass(/on/);
    await expect(page.locator("#list .row")).toHaveCount(B.books.length);
    await expect(page.locator("#meta")).toHaveText(`${B.books.length.toLocaleString("de-DE")} Bücher`);
  });

  test("desktop: letter and search work together, the search disables absent letters", async ({ page }) => {
    await open(page);
    await page.fill("#q", "harry potter");
    await expect(page.locator("#meta")).toHaveText(/Treffer/);
    const enabled = await page.locator("#index button:enabled").evaluateAll(bs => bs.map(b => b.dataset.l));
    expect(enabled).toContain("H");
    expect(enabled.length).toBeLessThan(27);
    await page.click('#index button[data-l="H"]');
    const n = await page.evaluate(() => window.DSM_LIBRARY.books.filter(b => b._l === "H" && b._s.includes("harry") && b._s.includes("potter")).length);
    expect(n).toBeGreaterThan(0);
    await expect(page.locator("#list .row")).toHaveCount(n);
  });

  test("visible at 768 px, not at 767 px", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await open(page);
    await expect(page.locator("#index")).toBeVisible();
    await page.setViewportSize({ width: 767, height: 900 });
    await expect(page.locator("#index")).toBeHidden();
  });

  test("desktop: no floater while scrolling", async ({ page }) => {
    await open(page);
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(300);
    await expect(page.locator("#floater")).not.toHaveClass(/show/);
  });
});

test.describe("phone (390 px)", () => {
  test.use({ ...PHONE });

  test("no A–Z bar, only the search", async ({ page }) => {
    await open(page);
    await expect(page.locator("#index")).toBeHidden();
    await expect(page.locator("#q")).toBeVisible();
  });

  test("letter floater only while scrolling, disappears afterwards", async ({ page }) => {
    await open(page);
    // list complete first: every further render step hides the floater (slower engines are still building it up)
    await expect(page.locator("#list .row")).toHaveCount(B.books.length);
    await expect(page.locator("#floater")).not.toHaveClass(/show/);
    await page.evaluate(() => scrollTo({ top: document.getElementById("L-K").offsetTop, behavior: "instant" }));
    await expect(page.locator("#floater")).toHaveClass(/show/);
    await expect(page.locator("#floater")).toHaveText(/^[J-L]$/);
    await expect(page.locator("#floater")).not.toHaveClass(/show/, { timeout: 2500 });
  });

  test("no horizontal scrolling", async ({ page }) => {
    await open(page);
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(w).toBeLessThanOrEqual(390);
  });

  test("the search bar sticks at the top", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    await page.evaluate(() => scrollTo({ top: 5000, behavior: "instant" }));
    await expect(page.locator("#bar")).toHaveClass(/stuck/);
    const top = await page.locator("#bar").evaluate(el => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(5);
  });
});

test.describe("phone (360 px)", () => {
  test.use({ ...PHONE, viewport: { width: 360, height: 740 } });

  test("the search placeholder fits whole (DE and IT), the × gets its room only with text", async ({ page }) => {
    await open(page);
    // text width in the field's font against its content box (a placeholder has no scrollWidth)
    const fits = () => page.locator("#q").evaluate(async i => {
      await document.fonts.ready;
      const cs = getComputedStyle(i), c = document.createElement("canvas").getContext("2d");
      c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      return c.measureText(i.placeholder).width <= i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    });
    expect(await fits()).toBe(true);
    await page.click('.seg [data-lang="it"]');
    await expect(page.locator("#q")).toHaveAttribute("placeholder", "Titolo, autore o ISBN");
    expect(await fits()).toBe(true);
    await page.locator("#q").fill("tschick");
    await expect(page.locator(".search .clear")).toBeVisible();
    await expect(page.locator("#q")).toHaveCSS("padding-right", "48px");
  });
});

test.describe("preview from the admin page", () => {
  const preview = { updated: "2026-01-01", count: 2, books: [{ t: "Vorschau Eins", a: ["A B"] }, { t: "Vorschau Zwei" }] };
  test.use({ storage: { "dsm-recs": JSON.stringify({ want: false, group: null }), "dsm-preview": JSON.stringify(preview) } });

  test("index.html#preview shows the new list with a note", async ({ page }) => {
    await open(page, "index.html#preview");
    await expect(page.locator("#preview")).toBeVisible();
    await expect(page.locator("#list .row")).toHaveCount(2);
    // "Vorschau beenden" leads back to the admin page (a tab without history closes instead, then the same address)
    await expect(page.locator("#preview-end")).toHaveAttribute("href", "admin.html");
    await page.click("#preview-end");
    await expect(page).toHaveURL(/admin\.html$/);
  });

  test("without #preview: the published list", async ({ page }) => {
    await open(page);
    await expect(page.locator("#preview")).toBeHidden();
    await expect(page.locator("#list .row")).toHaveCount(B.books.length);
  });
});

test.describe("letter anchors unique", () => {
  // Sorted by Collator, initial letter by Unicode: "Œuvres" sits between the O's but counts as "#",
  // Greek titles come after Z – "#" may still be an anchor only once
  const books = ["1984", "Oase", "Œuvres", "Ohne Ende", "Zebra", "Ὀδύσσεια"].map(t => ({ t }));
  test.use({ storage: { "dsm-recs": JSON.stringify({ want: false, group: null }), "dsm-preview": JSON.stringify({ updated: "2026-01-01", count: books.length, books }) } });

  test("every letter only one chunk head", async ({ page }) => {
    await open(page, "index.html#preview");
    await expect(page.locator("#list .row")).toHaveCount(books.length);
    const heads = await page.locator("#list ul[data-l]").evaluateAll(us => us.map(u => u.id));
    expect(heads).toEqual(["L-0", "L-O", "L-Z"]);
  });
});
