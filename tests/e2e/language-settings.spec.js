// Language DE/IT and settings (theme, larger text, high contrast, no animations, interactive backgrounds)
const { test, expect, PHONE, open, settled, swipeStages, data, hits, OFF } = require("./helpers.js");

const { B, C } = data();

test.describe("language", () => {
  test("switch to IT and back, the choice survives a reload", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await page.click('.seg [data-lang="it"]');
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    await expect(page.locator("h1")).toHaveText("Biblioteca");
    await expect(page.locator("#q")).toHaveAttribute("placeholder", "Titolo, autore o ISBN");
    await expect(page.locator("#meta")).toHaveText(`${B.books.length.toLocaleString("it-IT")} libri`);
    await expect(page.locator('.seg [data-lang="it"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveTitle("Biblioteca – Scuola Germanica di Milano");
    await page.reload();
    await expect(page.locator("h1")).toHaveText("Biblioteca");
    await page.click('.seg [data-lang="de"]');
    await expect(page.locator("h1")).toHaveText("Bibliothek");
    expect(await page.evaluate(() => localStorage.getItem("dsm-lang"))).toBe("de");
  });

  test("IT: hit count in the singular", async ({ page }) => {
    const b = B.books.find(x => x.i && hits(B.books, x.i[0]).length === 1);
    await open(page);
    await page.click('.seg [data-lang="it"]');
    await page.fill("#q", b.i[0]);
    await expect(page.locator("#meta")).toHaveText("1 risultato");
  });

  test("IT: detail with translated category and location (Regal → scaffale, Brett → ripiano)", async ({ page }) => {
    const b = B.books.find(x => x.c && x.l && /Regal \d+ Brett \d+/.test(x.l[0]));
    await open(page);
    await page.click('.seg [data-lang="it"]');
    await page.fill("#q", b.i ? b.i[0] : b.t);
    await page.locator("#list .row").first().click();
    const dl = page.locator("#d-dl");
    await expect(dl.locator("dt")).toContainText(["Categoria", "Collocazione"]);
    await expect(dl).toContainText(C[b.c]);
    const [, r, br] = /Regal (\d+) Brett (\d+)/.exec(b.l[0]);
    await expect(dl).toContainText(`scaffale ${r}, ripiano ${br}`);
    // language switch with the dialog open (the button lies behind the modal dialog, hence via script)
    await page.evaluate(() => document.querySelector('.seg [data-lang="de"]').click());
    await expect(dl.locator("dt")).toContainText(["Kategorie", "Standort"]);
    await expect(dl).toContainText(`Regal ${r} Brett ${br}`);
  });

  test.describe("Italian browser", () => {
    test.use({ locale: "it-IT" });
    test("without a saved choice: Italian", async ({ page }) => {
      await open(page);
      await expect(page.locator("html")).toHaveAttribute("lang", "it");
      await expect(page.locator("h1")).toHaveText("Biblioteca");
    });
  });

  test("Italian text stays anthracite (no red)", async ({ page }) => {
    await open(page);
    await page.click('.seg [data-lang="it"]');
    const colors = await page.evaluate(() => [...document.querySelectorAll("h1, #meta, #list .t, #list .a")]
      .slice(0, 50).map(e => getComputedStyle(e).color));
    for (const c of new Set(colors)) expect(c).not.toBe("rgb(169, 58, 57)");
    expect(colors).toContain("rgb(51, 51, 51)");
  });
});

const openSettings = async page => { await page.click(".settings-btn"); await expect(page.locator(".settings[role=dialog]")).toBeVisible(); };

test.describe("settings", () => {
  test("theme: automatic / light / dark, saved", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
    await openSettings(page);
    await expect(page.locator('#s-theme [data-v="auto"]')).toHaveAttribute("aria-checked", "true");
    await page.click('#s-theme [data-v="dark"]');
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.click('#s-theme [data-v="light"]');
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const light = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(dark).not.toBe(light);
    await page.click('#s-theme [data-v="dark"]');
    // switch finished (view transition over, `still` removed) before reloading: WebKit keeps the new page from
    // rendering if a view transition starts while the reload is already under way
    await page.waitForFunction(() => document.documentElement.dataset.theme === "dark" &&
      ![...document.head.querySelectorAll("style")].some(s => s.textContent.includes("transition: none !important")));
    // without waiting for "load": after a view transition WebKit sometimes never fires it on the reloaded page
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await openSettings(page);
    await page.click('#s-theme [data-v="auto"]');
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
    expect(await page.evaluate(() => localStorage.getItem("dsm-theme"))).toBe("auto");
  });

  test("the default follows the device (dark system → dark page, dark logo)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await open(page);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.emulateMedia({ colorScheme: "light" });
    const bg2 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe(bg2);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator(".logo-d")).toBeVisible();
    await expect(page.locator(".logo-l")).toBeHidden();
  });

  test("the device switching light/dark starts no component transitions (no patchy fade)", async ({ page }) => {
    await open(page);
    const running = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() =>
      r(document.getAnimations().filter(a => a instanceof CSSTransition).length))));
    await expect.poll(running).toBe(0); // logo fade-in after loading
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await running()).toBe(0);
    await page.emulateMedia({ colorScheme: "light" });
    expect(await running()).toBe(0);
    await expect.poll(() => page.evaluate(() => !!document.querySelector("head > style:last-child")?.textContent.includes("transition: none"))).toBe(false);
  });

  test('"light" wins against a dark system', async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => localStorage.setItem("dsm-theme", "light"));
    await open(page);
    await expect(page.locator(".logo-l")).toBeVisible();
  });

  test("larger text", async ({ page }) => {
    await open(page);
    const before = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#list .t")).fontSize));
    await openSettings(page);
    await page.locator("#s-font").check();
    await expect(page.locator("html")).toHaveAttribute("data-font", "large");
    const after = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#list .t")).fontSize));
    expect(after).toBeGreaterThan(before);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-font", "large");
  });

  test("dark: the thumb of a switch that is on stays visible (page color on the light track)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await open(page);
    await openSettings(page);
    const thumb = page.locator('#s-font [data-slot="switch-thumb"]');
    await expect(thumb).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await page.locator("#s-font").check();
    await expect(thumb).toHaveCSS("background-color", await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  });

  test("high contrast", async ({ page }) => {
    await open(page);
    await openSettings(page);
    await page.locator("#s-contrast").check();
    await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
    expect(await page.evaluate(() => localStorage.getItem("dsm-contrast"))).toBe("high");
    await page.locator("#s-contrast").uncheck();
    await expect(page.locator("html")).not.toHaveAttribute("data-contrast", /.*/);
  });

  test("settings in Italian", async ({ page }) => {
    await open(page);
    await page.click('.seg [data-lang="it"]');
    await openSettings(page);
    await expect(page.locator("#s-title")).toHaveText("Impostazioni");
    await expect(page.locator('#s-theme [data-v="dark"]')).toHaveText("Scuro");
  });

  test("settings without localStorage (private mode): the page works", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
    });
    await page.goto("index.html");
    await expect(page.locator("#list .row").first()).toBeVisible();
    await page.keyboard.press("Escape"); // questions dialog, if any
    await page.click(".settings-btn");
    await page.click('#s-theme [data-v="dark"]');
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("settings sheet on the phone", () => {
  test.use({ ...PHONE });
  test("swiping: half, up = content-high, down = half, further down = closed", async ({ page }) => {
    await open(page);
    await page.click(".settings-btn");
    await swipeStages(page, page.locator(".settings[role=dialog]"));
  });
});

// Slim desktop window (mouse, no touch): no swipe stages, a plain bottom sheet that scrolls with the wheel to its end
test.describe("sheets in a slim desktop window", () => {
  test.use({ viewport: { width: 390, height: 560 } });
  for (const [name, button, sel] of [["settings", ".settings-btn", ".settings"], ["categories", "#cat-btn", ".categories"]]) {
    test(`${name}: whole content reachable with the wheel`, async ({ page }) => {
      await open(page);
      await page.click(button);
      const d = page.locator(`${sel}[role=dialog]`);
      await expect(d).toBeVisible();
      expect(await d.evaluate(e => e.dataset.stage)).toBeUndefined();
      expect(await d.locator(".grab").isVisible()).toBe(false);
      const box = await d.boundingBox();
      expect(box.y + box.height).toBeLessThanOrEqual(561);
      expect(await d.evaluate(e => e.scrollHeight > e.clientHeight)).toBe(true);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let i = 0; i < 40 && await d.evaluate(e => e.scrollTop + e.clientHeight < e.scrollHeight - 1); i++) await page.mouse.wheel(0, 2000);
      const last = await d.evaluate(e => {
        const pane = e.querySelector(":scope > .pane");
        return pane.lastElementChild.getBoundingClientRect().bottom - e.getBoundingClientRect().bottom;
      });
      expect(last).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the dialog closes immediately", async ({ page }) => {
    await open(page);
    await page.click(".settings-btn");
    await page.keyboard.press("Escape");
    // without the fade-out animation the dialog (Radix Dialog) is out of the DOM immediately
    await expect(page.locator(".settings[role=dialog]")).toHaveCount(0, { timeout: 300 });
  });
  test("the setting \"Keine Animationen\" is on and locked", async ({ page }) => {
    await open(page);
    await openSettings(page);
    await expect(page.locator("#s-motion")).toBeChecked();
    await expect(page.locator("#s-motion")).toBeDisabled();
  });
});

test.describe("setting \"Keine Animationen\"", () => {
  test("stops animations, survives a reload, off again", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    await openSettings(page);
    await expect(page.locator("#s-motion")).not.toBeChecked();
    await page.locator("#s-motion").check();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    expect(await page.evaluate(() => localStorage.getItem("dsm-motion"))).toBe("reduce");
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".settings[role=dialog]")).animationDuration))).toBeLessThan(.001);
    await page.keyboard.press("Escape");
    // without the fade-out animation the dialog is out of the DOM immediately
    await expect(page.locator(".settings[role=dialog]")).toHaveCount(0, { timeout: 300 });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    await openSettings(page);
    await page.locator("#s-motion").uncheck();
    await expect(page.locator("html")).not.toHaveAttribute("data-motion", /.*/);
    expect(await page.evaluate(() => localStorage.getItem("dsm-motion"))).toBe("normal");
  });
});

// Interactive background (library/backdrop.jsx, scenes.js, dots-gl.js): off by default, one scene (Punkte), nothing to
// tweak, a live preview, none under high contrast, paused under a dialog, one still frame without motion, waves only on
// free space and never for a click that closes a dialog
const BG = JSON.stringify({ on: true });
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("dsm-bg")));
const withBg = page => page.addInitScript(v => { if (!localStorage.getItem("dsm-bg")) localStorage.setItem("dsm-bg", v); }, BG);
// frames the page layer painted, WebGL or canvas 2D, waves running (window.DSM_BG)
const bgStats = page => page.evaluate(() => ({ ...window.DSM_BG }));
const frames = async page => (await bgStats(page)).frames;
// Anything drawn on the canvas (sampled alpha). WebGL: read in a frame right after the scene painted (its buffer is
// gone once the frame is shown), so for a while on every frame; canvas 2D: any time.
const painted = (page, sel) => page.evaluate(s => new Promise(resolve => {
  let n = 0;
  const check = () => {
    const c = document.querySelector(s), gl = c && c.getContext("webgl");
    let d = null;
    if (gl) {
      d = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, d);
    } else if (c) d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let hit = false;
    for (let i = 3; d && i < d.length; i += 4 * 61) if (d[i]) { hit = true; break; }
    if (hit || ++n > 120) resolve(hit); else requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}), sel);

test.describe("background", () => {
  test("off by default; on with a live preview and nothing to tweak, saved, off again", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    await expect(page.locator("#bg")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-bg", /.*/);
    await openSettings(page);
    await expect(page.locator("#s-bg")).not.toBeChecked();
    await expect(page.locator("#s-bgpick")).toBeHidden();
    await page.locator("#s-bg").check();
    await expect(page.locator("html")).toHaveAttribute("data-bg", "dots");
    await expect(page.locator('#bg[data-bg="dots"]')).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("#bg-preview")).toBeVisible();
    await expect.poll(() => painted(page, "#bg-preview canvas")).toBe(true);
    await expect.poll(() => frames(page)).toBeGreaterThan(0); // the page layer under the dialog: one frame, then paused
    // behind everything, never in the way of a click
    expect(await page.evaluate(() => { const s = getComputedStyle(document.getElementById("bg")); return [s.position, s.zIndex, s.pointerEvents]; }))
      .toEqual(["fixed", "-1", "none"]);
    // no scene choice, colors or sliders
    await expect(page.locator('#s-bgpick input, #s-bgpick button, #s-bgpick [role="radio"]')).toHaveCount(0);
    expect(await saved(page)).toEqual({ on: true });
    await page.reload();
    await expect(page.locator('#bg[data-bg="dots"] canvas')).toHaveCount(1);
    await openSettings(page);
    await expect(page.locator("#s-bg")).toBeChecked();
    await page.locator("#s-bg").uncheck();
    await expect(page.locator("#bg")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-bg", /.*/);
    expect(await saved(page)).toEqual({ on: false });
  });

  test("draws, moves and answers the pointer and clicks without script errors", async ({ page, browserName }) => {
    await withBg(page);
    await open(page);
    await expect(page.locator('#bg[data-bg="dots"] canvas')).toHaveCount(1);
    await expect.poll(() => painted(page, "#bg canvas")).toBe(true);
    if (browserName === "chromium") expect((await bgStats(page)).gl).toBe(true); // on the GPU where WebGL works (also headless)
    // in the left margin, next to the column: the lens, then a ring wave
    const f = await frames(page);
    await page.mouse.move(60, 300);
    await page.mouse.move(120, 340, { steps: 4 });
    await page.mouse.click(120, 340);
    await expect.poll(() => frames(page)).toBeGreaterThan(f + 3);
    await expect.poll(async () => (await bgStats(page)).waves).toBe(1);
  });

  test("no wave for a click on a book, a field or a button, nor for one that closes a dialog; one on free space", async ({ page }) => {
    await withBg(page);
    await open(page);
    // painted again after each click: the layer runs (not under a dialog), the count is current
    const quiet = async what => {
      const f = await frames(page);
      await expect.poll(() => frames(page), what).toBeGreaterThan(f + 1);
      expect((await bgStats(page)).waves, what).toBe(0);
    };
    await page.locator("#list .row").nth(1).click();
    await expect(page.locator("#detail")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#detail")).toHaveCount(0);
    await quiet("book");
    // closing the book by a click beside it (the left margin, under the scrim)
    await page.locator("#list .row").nth(1).click();
    await expect(page.locator("#detail")).toBeVisible();
    await settled(page);
    await page.mouse.click(40, 400);
    await expect(page.locator("#detail")).toHaveCount(0);
    await quiet("book closed by a click beside it");
    await page.click("#q");
    await quiet("search field");
    await page.click("#cat-btn");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await quiet("category button");
    await page.mouse.click(40, 400); // the left margin
    await expect.poll(async () => (await bgStats(page)).waves).toBe(1);
  });

  test("the search bar lets the background through until it sticks", async ({ page }) => {
    await withBg(page);
    await open(page);
    const bg = () => page.evaluate(() => getComputedStyle(document.getElementById("bar")).backgroundColor);
    expect(await bg()).toBe("rgba(0, 0, 0, 0)");
    await page.mouse.wheel(0, 1500);
    await expect(page.locator("#bar.stuck")).toHaveCount(1);
    expect(await bg()).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("paused under a dialog", async ({ page }) => {
    await withBg(page);
    await open(page);
    await expect.poll(() => painted(page, "#bg canvas")).toBe(true);
    await openSettings(page);
    await settled(page); // dialog open, scroll lock (and with it a possible resize) done
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const f = await frames(page);
    await page.waitForTimeout(400); // running, it would paint at least 8 times meanwhile
    expect(await frames(page)).toBe(f);
  });

  test("high contrast: no background, the switch locked; back afterwards", async ({ page }) => {
    await withBg(page);
    await open(page);
    await expect(page.locator('#bg[data-bg="dots"]')).toHaveCount(1);
    await openSettings(page);
    await page.locator("#s-contrast").check();
    await expect(page.locator("#bg")).toHaveCount(0);
    await expect(page.locator("#s-bg")).toBeDisabled();
    await expect(page.locator("#s-bgpick")).toBeHidden();
    await page.locator("#s-contrast").uncheck();
    await expect(page.locator('#bg[data-bg="dots"]')).toHaveCount(1);
  });

  test("in Italian", async ({ page }) => {
    await withBg(page);
    await open(page);
    await page.click('.seg [data-lang="it"]');
    await openSettings(page);
    await expect(page.locator('label[for="s-bg"]')).toContainText("Sfondo animato");
  });

  test.describe("saved before 2026-10-27", () => {
    test.use({ storage: { "dsm-recs": OFF, "dsm-bg": JSON.stringify({ on: true, id: "lines", color: "blue", k: 80, t: 50, d: 10 }) } });
    test("an old scene and its tweaks: Punkte as designed", async ({ page }) => {
      await open(page);
      await expect(page.locator("html")).toHaveAttribute("data-bg", "dots");
      await openSettings(page);
      await expect(page.locator("#s-bg")).toBeChecked();
    });
  });
});

test.describe("background with reduced motion", () => {
  test.use({ reducedMotion: "reduce", storage: { "dsm-recs": OFF, "dsm-bg": BG } });
  test("one still frame, no pointer, no wave", async ({ page }) => {
    await open(page);
    await expect.poll(() => frames(page)).toBeGreaterThan(0);
    const f = await frames(page);
    await page.mouse.move(60, 300);
    await page.mouse.move(120, 340, { steps: 4 });
    await page.mouse.click(120, 340);
    await page.waitForTimeout(400); // nothing may be painted meanwhile
    const s = await bgStats(page);
    expect([s.frames, s.waves]).toEqual([f, 0]);
  });
});
