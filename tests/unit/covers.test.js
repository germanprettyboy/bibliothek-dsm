/*
 * covers.js in einer Sandbox: fetch, Image, localStorage und die Takt-Timer (setTimeout 350/1500/1800 ms) sind ersetzt.
 * Kein Netz. Prüft Sammelabfrage, Rückfall auf Google, Drosselung, Cache, Hintergrund-Warteschlange und Messung.
 */
"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { WEB } = require("../helfer/laden.js");

const CODE = fs.readFileSync(path.join(WEB, "assets", "covers.js"), "utf8");
const OL = "https://openlibrary.org/api/books?format=json&jscmd=viewapi&bibkeys=";
const GB = "https://www.googleapis.com/books/v1/volumes?";
const warte = ms => new Promise(r => setTimeout(r, ms));
const TAKTE = [350, 1500, 1800];
const antwort = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

/*
 * ol(keys) → Objekt für die OL-Antwort, gb(isbn) → Antwort für Google; Rückgabe „throw“ simuliert Netzfehler.
 * bildOk(src) → lädt das Bild?
 */
function sandbox({ ol = () => ({}), gb = () => ({}), bildOk = () => true, cache = null, conn = {}, hidden = false } = {}) {
  const calls = [], intervals = [], ls = new Map();
  if (cache) ls.set("dsm-cover-v2", JSON.stringify(cache));
  class Img {
    constructor() { this.naturalWidth = 0; this.naturalHeight = 0; }
    set src(v) {
      this._src = v;
      if (!v) return;
      setImmediate(() => {
        if (bildOk(v)) { this.naturalWidth = 180; this.naturalHeight = 270; this.onload && this.onload(); }
        else this.onerror && this.onerror();
      });
    }
    get src() { return this._src; }
  }
  const ctx = {
    fetch: async (url, opt) => {
      calls.push({ url, opt });
      let r;
      if (url.startsWith(OL)) r = ol(decodeURIComponent(url.slice(OL.length)).split(","));
      else if (url.startsWith(GB)) r = gb(url.split("q=isbn:")[1]);
      else throw new Error("unerwartete URL " + url);
      if (r === "throw") throw new TypeError("Failed to fetch");
      return r && r.__status ? antwort(r.body || {}, r.__status) : antwort(r);
    },
    Image: Img,
    localStorage: {
      getItem: k => (ls.has(k) ? ls.get(k) : null),
      setItem: (k, v) => ls.set(k, String(v)),
      removeItem: k => ls.delete(k),
    },
    navigator: { connection: conn },
    document: { hidden },
    // Takt der Hintergrund-Warteschlangen (350/1500/1800 ms) per tick() auslösen, übrige Timer echt
    setTimeout: (fn, ms, ...a) => {
      if (!TAKTE.includes(ms)) return setTimeout(fn, ms, ...a);
      intervals.push({ fn, ms }); return -intervals.length;
    },
    clearTimeout: id => (id < 0 ? undefined : clearTimeout(id)), setImmediate, AbortController,
    console,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename: "covers.js" });
  // nur die beim Aufruf anstehenden Timer dieses Takts, jeder genau einmal
  const tick = async ms => {
    const due = intervals.filter(i => i.ms === ms);
    for (const i of due) intervals.splice(intervals.indexOf(i), 1);
    for (const i of due) await i.fn();
    await warte(5);
  };
  const gespeichert = () => JSON.parse(ls.get("dsm-cover-v2") || "{}");
  return { C: ctx.DSMCovers, calls, tick, gespeichert, takte: () => intervals.length, ctx, ol: () => calls.filter(c => c.url.startsWith(OL)), gb: () => calls.filter(c => c.url.startsWith(GB)) };
}

const buch = (i, t = "Buch " + i) => ({ t, i: [i] });
const K1 = "9783522202107", K2 = "9783871347108", K3 = "9780804429573";
const OLHIT = id => keys => Object.fromEntries(keys.map(k => [k, { thumbnail_url: `http://covers.openlibrary.org/b/id/${id}-S.jpg` }]));

describe("get(): Antippen, mit Vorrang", () => {
  test("ohne ISBN: kein Abruf, Platzhalter", async () => {
    const s = sandbox();
    assert.equal(await s.C.get({ t: "x" }), null);
    assert.equal(await s.C.get({ t: "x", i: [] }), null);
    assert.equal(s.calls.length, 0);
  });

  test("Open Library: Sammelabfrage viewapi mit ISBN-13 und ISBN-10, Bild in Größe M über https", async () => {
    const s = sandbox({ ol: OLHIT(42) });
    const r = await s.C.get(buch(K1));
    assert.deepEqual({ ...r }, { src: "https://covers.openlibrary.org/b/id/42-M.jpg", by: "coverOL" });
    const u = decodeURIComponent(s.ol()[0].url);
    assert.ok(u.includes("ISBN:" + K1) && u.includes("ISBN:3522202104"), u);
    for (const c of s.calls) {
      assert.ok(!c.url.includes("/b/isbn/"));
      assert.equal(c.opt.referrerPolicy, "no-referrer");
    }
  });

  test("ISBN-10 mit Prüfziffer X richtig abgeleitet", async () => {
    const s = sandbox();
    await s.C.get(buch(K3));
    assert.ok(decodeURIComponent(s.ol()[0].url).includes("ISBN:080442957X"));
  });

  test("Rückfall Google Books: thumbnail, https, ohne edge=curl", async () => {
    const s = sandbox({
      ol: () => ({}),
      gb: () => ({ items: [{ volumeInfo: { imageLinks: { thumbnail: "http://books.google.com/books/content?id=a&zoom=1&edge=curl&source=gbs_api" } } }] }),
    });
    const r = await s.C.get(buch(K2));
    assert.equal(r.by, "coverGB");
    assert.equal(r.src, "https://books.google.com/books/content?id=a&zoom=1&source=gbs_api");
    assert.ok(s.gb()[0].url.endsWith("q=isbn:" + K2));
    assert.ok(s.gb()[0].url.includes("fields=items(volumeInfo/imageLinks)"));
  });

  test("kein Cover: null, wird gemerkt, zweiter Aufruf ohne Netz", async () => {
    const s = sandbox();
    assert.equal(await s.C.get(buch(K1)), null);
    const n = s.calls.length;
    assert.equal(await s.C.get(buch(K1)), null);
    assert.equal(s.calls.length, n);
    await warte(450);
    assert.deepEqual(Object.keys(s.gespeichert()), [K1]);
    assert.equal(s.gespeichert()[K1].u, "");
  });

  test("Netzfehler: null, aber nicht gemerkt (später erneut)", async () => {
    const s = sandbox({ ol: () => "throw", gb: () => "throw" });
    assert.equal(await s.C.get(buch(K1)), null);
    await s.C.get(buch(K1));
    assert.equal(s.ol().length, 2);
    await warte(450);
    assert.deepEqual(s.gespeichert(), {});
  });

  test("Bild lädt nicht → kein Cover", async () => {
    const s = sandbox({ ol: OLHIT(1), bildOk: () => false });
    assert.equal(await s.C.get(buch(K1)), null);
  });

  test("gleichzeitige Aufrufe teilen sich eine Abfrage", async () => {
    const s = sandbox({ ol: OLHIT(7) });
    const [a, b] = await Promise.all([s.C.get(buch(K1)), s.C.get(buch(K1))]);
    assert.equal(a.src, b.src);
    assert.equal(s.ol().length, 1);
    assert.equal(s.gb().length, 1);
  });

  test("Google 429: fünf Minuten keine weiteren Google-Abfragen", async () => {
    const s = sandbox({ gb: () => ({ __status: 429 }) });
    await s.C.get(buch(K1));
    await s.C.get(buch(K2));
    assert.equal(s.gb().length, 1);
    assert.equal(s.ol().length, 2);
  });
});

describe("Cache dsm-cover-v2", () => {
  const tag = 864e5;
  test("Treffer 60 Tage gültig", async () => {
    const s = sandbox({ cache: { [K1]: { u: "https://x/1-M.jpg", b: "coverOL", t: Date.now() - 59 * tag } } });
    assert.deepEqual({ ...(await s.C.get(buch(K1))) }, { src: "https://x/1-M.jpg", by: "coverOL" });
    assert.equal(s.calls.length, 0);
  });
  test("Treffer älter als 60 Tage → neu abfragen", async () => {
    const s = sandbox({ cache: { [K1]: { u: "https://x/1-M.jpg", b: "coverOL", t: Date.now() - 61 * tag } } });
    await s.C.get(buch(K1));
    assert.equal(s.ol().length, 1);
  });
  test("„kein Cover“ 14 Tage gültig, danach neu", async () => {
    let s = sandbox({ cache: { [K1]: { u: "", b: "", t: Date.now() - 13 * tag } } });
    assert.equal(await s.C.get(buch(K1)), null);
    assert.equal(s.calls.length, 0);
    s = sandbox({ cache: { [K1]: { u: "", b: "", t: Date.now() - 15 * tag } } });
    await s.C.get(buch(K1));
    assert.equal(s.ol().length, 1);
  });
  test("defekter Cache wird ignoriert", async () => {
    const s = sandbox();
    s.ctx.localStorage.setItem("dsm-cover-v2", "{kaputt");
    assert.doesNotThrow(() => vm.runInContext(CODE, s.ctx));
  });
  test("höchstens 3000 Einträge, älteste fliegen raus", async () => {
    const cache = {};
    for (let n = 0; n < 3005; n++) cache["k" + n] = { u: "", b: "", t: Date.now() - (3005 - n) * 1000 };
    const s = sandbox({ cache });
    await s.C.get(buch(K1));
    await warte(450);
    const g = s.gespeichert();
    assert.equal(Object.keys(g).length, 3000);
    assert.ok(!("k0" in g) && !("k5" in g) && "k6" in g && K1 in g);
  });
});

describe("Hintergrund: want/unwant, gestaffelt", () => {
  test("Intervalle: Open Library 1,5 s, Google 1,8 s, Bilder 0,35 s", () => {
    const s = sandbox();
    assert.ok(s.C.enabled);
    assert.match(CODE, /BG_TICK = 1500/);
    assert.match(CODE, /GB_TICK = 1800/);
    assert.match(CODE, /IMG_TICK = 350/);
  });

  test("bis zu 20 Bücher je Open-Library-Abfrage, kein Abruf ohne Tick", async () => {
    const s = sandbox();
    const bs = Array.from({ length: 25 }, (_, n) => buch("97835222021" + String(n).padStart(2, "0")));
    bs.forEach(b => s.C.want(b));
    assert.equal(s.calls.length, 0, "nichts sofort");
    await s.tick(1500);
    assert.equal(s.ol().length, 1);
    const keys1 = decodeURIComponent(s.ol()[0].url.slice(OL.length)).split(",");
    assert.equal(keys1.filter(k => /^ISBN:\d{13}$/.test(k)).length, 20);
    await s.tick(1500);
    assert.equal(s.ol().length, 2);
    await s.tick(1500);
    assert.equal(s.ol().length, 2, "Warteschlange leer");
  });

  test("unwant entfernt aus der Warteschlange; Bücher ohne ISBN werden ignoriert", async () => {
    const s = sandbox();
    s.C.want({ t: "ohne" });
    s.C.want(buch(K1)); s.C.unwant(buch(K1));
    await s.tick(1500);
    assert.equal(s.calls.length, 0);
  });

  test("Treffer → Bild vorladen → gemerkt; kein Treffer → Google einzeln → „kein Cover“ gemerkt", async () => {
    const s = sandbox({ ol: keys => (keys.includes("ISBN:" + K1) ? OLHIT(5)(["ISBN:" + K1]) : {}) });
    s.C.want(buch(K1)); s.C.want(buch(K2));
    await s.tick(1500);
    assert.equal(s.gb().length, 0);
    await s.tick(350);
    await s.tick(1800);
    assert.equal(s.gb().length, 1);
    assert.ok(s.gb()[0].url.endsWith(K2));
    await warte(450);
    const g = s.gespeichert();
    assert.equal(g[K1].u, "https://covers.openlibrary.org/b/id/5-M.jpg");
    assert.equal(g[K2].u, "");
  });

  test("bereits bekannte Bücher werden nicht erneut abgefragt", async () => {
    const s = sandbox({ cache: { [K1]: { u: "", b: "", t: Date.now() } } });
    s.C.want(buch(K1));
    await s.tick(1500);
    assert.equal(s.calls.length, 0);
  });

  test("pausiert bei verstecktem Tab", async () => {
    const s = sandbox({ hidden: true });
    s.C.want(buch(K1));
    await s.tick(1500);
    assert.equal(s.calls.length, 0);
    s.ctx.document.hidden = false;
    await s.tick(1500);
    assert.equal(s.calls.length, 1);
  });

  test("ohne Arbeit läuft kein Takt-Timer (Gerät wird nicht geweckt)", async () => {
    const s = sandbox({ ol: OLHIT(3) });
    assert.equal(s.takte(), 0, "nach dem Laden");
    s.C.want(buch(K1));
    assert.equal(s.takte(), 1);
    await s.tick(1500);
    await s.tick(350);
    assert.equal(s.takte(), 0, "Warteschlangen leer");
  });

  test("Google-Bild defekt: „kein Cover“ gemerkt, keine Endlosschleife", async () => {
    const s = sandbox({
      ol: () => ({}),
      gb: () => ({ items: [{ volumeInfo: { imageLinks: { thumbnail: "https://books.google.com/x" } } }] }),
      bildOk: () => false,
    });
    s.C.want(buch(K2));
    await s.tick(1500);
    await s.tick(1800);
    await s.tick(350);
    assert.equal(s.takte(), 0);
    await warte(450);
    assert.equal(s.gespeichert()[K2].u, "");
    assert.equal(s.gb().length, 1);
  });

  test("Datensparen / 2G: Hintergrund aus", async () => {
    for (const conn of [{ saveData: true }, { effectiveType: "2g" }, { effectiveType: "slow-2g" }]) {
      const s = sandbox({ conn });
      assert.equal(s.C.enabled, false);
      s.C.want(buch(K1));
      await s.tick(1500);
      assert.equal(s.calls.length, 0);
    }
  });
});

describe("prime(): Empfehlungen", () => {
  test("mehrere Bücher in einer Sammelabfrage", async () => {
    const s = sandbox({ ol: OLHIT(9) });
    const r = await s.C.prime([buch(K1), buch(K2), { t: "ohne ISBN" }]);
    assert.equal(s.ol().length, 1);
    assert.equal(r[0].by, "coverOL");
    assert.equal(r[1].by, "coverOL");
    assert.equal(r[2], null);
    assert.equal(s.gb().length, 0, "Treffer aus der Sammelabfrage brauchen keinen Einzelabruf");
  });
});

describe("survey(): Abdeckung messen (admin.html)", () => {
  test("zählt Open Library, Google, ohne Cover; Bücher ohne ISBN zählen nicht", async () => {
    const s = sandbox({
      ol: keys => (keys.includes("ISBN:" + K1) ? OLHIT(1)(["ISBN:" + K1]) : {}),
      gb: i => (i === K2 ? { items: [{ volumeInfo: { imageLinks: { thumbnail: "http://g/x" } } }] } : {}),
    });
    const verlauf = [];
    const sv = s.C.survey([buch(K1), buch(K2), buch(K3), { t: "ohne" }], st => verlauf.push(st));
    const st = await sv.done;
    assert.equal(st.total, 3);
    assert.equal(st.ol, 1); assert.equal(st.gb, 1); assert.equal(st.none, 1); assert.equal(st.err, 0);
    assert.equal(st.done, 3);
    assert.equal(st.complete, true);
    assert.equal(s.ol().length, 1, "eine Sammelabfrage für alle");
    assert.ok(verlauf.length >= 4);
    assert.ok(verlauf.every((v, n) => n === 0 || v.done >= verlauf[n - 1].done), "Fortschritt steigt");
  });
  test("stop() bricht ab, complete = false", async () => {
    const s = sandbox();
    const sv = s.C.survey([buch(K1), buch(K2), buch(K3)]);
    sv.stop();
    const st = await sv.done;
    assert.equal(st.complete, false);
    assert.ok(st.done < 3);
  });
});
