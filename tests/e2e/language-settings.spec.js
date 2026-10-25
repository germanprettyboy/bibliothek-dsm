// Language DE/IT and settings (theme, larger text, high contrast, no animations, experimental backgrounds)
const { test, expect, PHONE, open, swipeStages, data, hits } = require("./helpers.js");

const { B, C } = data();

test.describe("language", () => {
  test("switch to IT and back, the choice survives a reload", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await page.click('.seg [data-lang="it"]');
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    await expect(page.locator("h1")).toHaveText("Biblioteca");
    await expect(page.locator("#q")).toHaveAttribute("placeholder", "Cerca titolo, autore o ISBN");
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

// Experimental backgrounds (library/backdrop.jsx): off by default, 9 variants, none under high contrast, still without motion
const BGS = ["milan", "metro", "notebook", "words", "aurora", "ribbons", "lamp", "ink", "pullout"];
const CSS_BGS = ["notebook", "aurora"];
// Chosen before the first load (like a returning visitor); a choice made in the test survives reloads
const useBg = (page, id) => page.addInitScript(v => {
  if (!localStorage.getItem("dsm-bg")) localStorage.setItem("dsm-bg", JSON.stringify({ on: true, id: v }));
}, id);

test.describe("background", () => {
  test("off by default; on, choose, saved, off again", { tag: "@smoke" }, async ({ page }) => {
    await open(page);
    await expect(page.locator("#bg")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-bg", /.*/);
    await openSettings(page);
    await expect(page.locator("#s-bg")).not.toBeChecked();
    await expect(page.locator("#s-bgpick")).toBeHidden();
    await page.locator("#s-bg").check();
    await expect(page.locator("html")).toHaveAttribute("data-bg", "aurora");
    await expect(page.locator('#bg[data-bg="aurora"]')).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("#s-bgpick [role=radio]")).toHaveCount(BGS.length);
    await page.click('#s-bgpick [data-bg="milan"]');
    await expect(page.locator('#bg[data-bg="milan"] canvas')).toHaveCount(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("dsm-bg")))).toEqual({ on: true, id: "milan" });
    // behind everything, never in the way of a click
    expect(await page.evaluate(() => { const s = getComputedStyle(document.getElementById("bg")); return [s.position, s.zIndex, s.pointerEvents]; }))
      .toEqual(["fixed", "-1", "none"]);
    await page.reload();
    await expect(page.locator('#bg[data-bg="milan"] canvas')).toHaveCount(1);
    await openSettings(page);
    await expect(page.locator('#s-bgpick [data-bg="milan"]')).toHaveAttribute("aria-checked", "true");
    await page.locator("#s-bg").uncheck();
    await expect(page.locator("#bg")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-bg", /.*/);
  });

  test("all 9 variants draw without script errors, the pointer and taps included", async ({ page }) => {
    test.setTimeout(90000); // 9 reloads
    await open(page);
    for (const id of BGS) {
      await page.evaluate(v => localStorage.setItem("dsm-bg", JSON.stringify({ on: true, id: v })), id);
      await page.reload();
      await expect(page.locator(`#bg[data-bg="${id}"]`)).toHaveCount(1);
      if (CSS_BGS.includes(id)) {
        await expect(page.locator("#bg canvas")).toHaveCount(0);
        continue;
      }
      // in the left margin, next to the column
      await page.mouse.move(60, 300);
      await page.mouse.move(90, 340, { steps: 4 });
      await page.mouse.click(120, 360);
      // something was drawn: a pixel that is not transparent
      await expect.poll(() => page.evaluate(() => {
        const c = document.querySelector("#bg canvas"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        for (let i = 3; i < d.length; i += 4 * 97) if (d[i]) return true;
        return false;
      }), id).toBe(true);
    }
  });

  test("the search bar lets it through until it sticks", async ({ page }) => {
    await useBg(page, "notebook");
    await open(page);
    const bg = () => page.evaluate(() => getComputedStyle(document.getElementById("bar")).backgroundColor);
    expect(await bg()).toBe("rgba(0, 0, 0, 0)");
    await page.mouse.wheel(0, 1500);
    await expect(page.locator("#bar.stuck")).toHaveCount(1);
    expect(await bg()).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("high contrast: no background, the switch locked; back afterwards", async ({ page }) => {
    await useBg(page, "milan");
    await open(page);
    await expect(page.locator('#bg[data-bg="milan"]')).toHaveCount(1);
    await openSettings(page);
    await page.locator("#s-contrast").check();
    await expect(page.locator("#bg")).toHaveCount(0);
    await expect(page.locator("#s-bg")).toBeDisabled();
    await expect(page.locator("#s-bgpick")).toBeHidden();
    await page.locator("#s-contrast").uncheck();
    await expect(page.locator('#bg[data-bg="milan"]')).toHaveCount(1);
  });

  test("in Italian", async ({ page }) => {
    await useBg(page, "words");
    await open(page);
    await page.click('.seg [data-lang="it"]');
    await openSettings(page);
    await expect(page.locator('label[for="s-bg"]')).toContainText("Sfondo decorativo");
    await expect(page.locator('#s-bgpick [data-bg="words"]')).toContainText("Bilingue");
  });
});

test("a background that no longer exists (gallery until 2026-10-25) falls back to Farbnebel", async ({ page }) => {
  await useBg(page, "books-pull-out");
  await open(page);
  await expect(page.locator("html")).toHaveAttribute("data-bg", "aurora");
});

test.describe("background with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("an animated variant stands still", async ({ page }) => {
    await useBg(page, "ribbons");
    await open(page);
    await expect(page.locator('#bg[data-bg="ribbons"] canvas')).toHaveCount(1);
    const pic = () => page.evaluate(() => document.querySelector("#bg canvas").toDataURL());
    const a = await pic();
    await page.waitForTimeout(400); // nothing may change meanwhile
    expect(await pic()).toBe(a);
  });
});
