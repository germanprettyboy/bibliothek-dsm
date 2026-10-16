/*
 * covers.js in einer Sandbox: fetch, Image, localStorage und die Takt-Timer (setTimeout 300/350/600/1500 ms) sind ersetzt.
 * Kein Netz. Prüft Reihenfolge ekz → Open Library (Sammelabfrage) → Google-Bild, Ersatzbild-Erkennung,
 * keine Google-API, Cache, Hintergrund-Warteschlangen und Messung.
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
const EKZ = "https://cover.ekz.de/";
const GB = "https://books.google.com/books/content?vid=ISBN";
const warte = ms => new Promise(r => setTimeout(r, ms));
const TAKTE = [300, 350, 600, 1500];
const antwort = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

/*
 * ol(keys) → Objekt für die OL-Antwort; „throw“ simuliert Netzfehler.
 * bild(src) → true (Cover 180×270), false (404/Fehler) oder [Breite, Höhe].
 */
function sandbox({ ol = () => ({}), bild = () => false, cache = null, conn = {}, hidden = false, alt = null } = {}) {
  const calls = [], bilder = [], intervals = [], ls = new Map();
  if (cache) ls.set("dsm-cover-v3", JSON.stringify(cache));
  if (alt) ls.set("dsm-cover-v2", alt);
  class Img {
    constructor() { this.naturalWidth = 0; this.naturalHeight = 0; this.isConnected = false; }
    set src(v) {
      this._src = v;
      if (!v) return;
      bilder.push(v);
      setImmediate(() => {
        const r = bild(v);
        if (r) { [this.naturalWidth, this.naturalHeight] = r === true ? [180, 270] : r; this.onload && this.onload(); }
        else this.onerror && this.onerror();
      });
    }
    get src() { return this._src; }
  }
  const ctx = {
    fetch: async (url, opt) => {
      calls.push({ url, opt });
      if (!url.startsWith(OL)) throw new Error("unerwartete URL " + url);
      const r = ol(decodeURIComponent(url.slice(OL.length)).split(","));
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
    // Takte der Hintergrund-Warteschlangen per tick() auslösen, übrige Timer echt
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
  const gespeichert = () => JSON.parse(ls.get("dsm-cover-v3") || "{}");
  return {
    C: ctx.DSMCovers, calls, bilder, tick, gespeichert, ls, takte: () => intervals.length, ctx,
    ol: () => calls.filter(c => c.url.startsWith(OL)),
    ekz: () => bilder.filter(s => s.startsWith(EKZ)),
    gb: () => bilder.filter(s => s.startsWith(GB)),
  };
}

const buch = (i, t = "Buch " + i) => ({ t, i: [i] });
const K1 = "9783522202107", K2 = "9783871347108", K3 = "9780804429573";
const OLHIT = id => keys => Object.fromEntries(keys.map(k => [k, { thumbnail_url: `http://covers.openlibrary.org/b/id/${id}-S.jpg` }]));
const nur = (...teile) => src => teile.some(t => src.includes(t)); // Bild lädt nur, wenn die URL einen der Teile enthält

describe("get(): Antippen, mit Vorrang", () => {
  test("ohne ISBN: kein Abruf, Platzhalter", async () => {
    const s = sandbox();
    assert.equal(await s.C.get({ t: "x" }), null);
    assert.equal(await s.C.get({ t: "x", i: [] }), null);
    assert.equal(s.calls.length + s.bilder.length, 0);
  });

  test("ekz zuerst: Bild direkt über die ISBN", async () => {
    const s = sandbox({ bild: nur("ekz.de"), ol: OLHIT(42) });
    const r = await s.C.get(buch(K1));
    assert.deepEqual({ ...r }, { src: EKZ + K1 + ".jpg", by: "coverEKZ" });
    assert.equal(s.gb().length, 0);
  });

  test("ohne ekz-Cover: Open Library viewapi mit ISBN-13 und ISBN-10, Bild in Größe M über https", async () => {
    const s = sandbox({ bild: nur("openlibrary"), ol: OLHIT(42) });
    const r = await s.C.get(buch(K1));
    assert.deepEqual({ ...r }, { src: "https://covers.openlibrary.org/b/id/42-M.jpg", by: "coverOL" });
    const u = decodeURIComponent(s.ol()[0].url);
    assert.ok(u.includes("ISBN:" + K1) && u.includes("ISBN:3522202104"), u);
    for (const c of s.calls) assert.equal(c.opt.referrerPolicy, "no-referrer");
  });

  test("ISBN-10 mit Prüfziffer X richtig abgeleitet", async () => {
    const s = sandbox();
    await s.C.get(buch(K3));
    assert.ok(decodeURIComponent(s.ol()[0].url).includes("ISBN:080442957X"));
  });

  test("Rückfall Google: Bild direkt über die ISBN, keine Google-API", async () => {
    const s = sandbox({ bild: nur("books.google") });
    const r = await s.C.get(buch(K2));
    assert.equal(r.by, "coverGB");
    assert.equal(r.src, GB + K2 + "&printsec=frontcover&img=1&zoom=1");
    assert.ok(!s.calls.some(c => c.url.includes("googleapis")));
  });

  test("Google-Ersatzbild 128×184 gilt als „kein Cover“", async () => {
    const s = sandbox({ bild: src => (src.includes("books.google") ? [128, 184] : false) });
    assert.equal(await s.C.get(buch(K2)), null);
    await warte(450);
    assert.equal(s.gespeichert()[K2].u, "");
  });

  test("echtes Google-Cover 128×205 wird genommen", async () => {
    const s = sandbox({ bild: src => (src.includes("books.google") ? [128, 205] : false) });
    assert.equal((await s.C.get(buch(K2))).by, "coverGB");
  });

  test("mehrere ISBN: jede wird bei ekz probiert", async () => {
    const s = sandbox({ bild: nur("ekz.de/" + K2) });
    const r = await s.C.get({ t: "x", i: [K1, K2] });
    assert.equal(r.src, EKZ + K2 + ".jpg");
  });

  test("kein Cover: null, wird gemerkt, zweiter Aufruf ohne Netz", async () => {
    const s = sandbox();
    assert.equal(await s.C.get(buch(K1)), null);
    const n = s.calls.length + s.bilder.length;
    assert.equal(await s.C.get(buch(K1)), null);
    assert.equal(s.calls.length + s.bilder.length, n);
    await warte(450);
    assert.deepEqual(Object.keys(s.gespeichert()), [K1]);
    assert.equal(s.gespeichert()[K1].u, "");
  });

  test("Netzfehler bei Open Library ohne anderes Cover: null, aber nicht gemerkt", async () => {
    const s = sandbox({ ol: () => "throw" });
    assert.equal(await s.C.get(buch(K1)), null);
    await s.C.get(buch(K1));
    assert.equal(s.ol().length, 2);
    await warte(450);
    assert.deepEqual(s.gespeichert(), {});
  });

  test("Open-Library-Bild lädt nicht → weiter zu Google", async () => {
    const s = sandbox({ ol: OLHIT(1), bild: nur("books.google") });
    assert.equal((await s.C.get(buch(K1))).by, "coverGB");
  });

  test("gleichzeitige Aufrufe teilen sich eine Abfrage", async () => {
    const s = sandbox({ bild: nur("openlibrary"), ol: OLHIT(7) });
    const [a, b] = await Promise.all([s.C.get(buch(K1)), s.C.get(buch(K1))]);
    assert.equal(a.src, b.src);
    assert.equal(s.ol().length, 1);
    assert.equal(s.ekz().length, 1);
  });

  test("nie /b/isbn/ (Ratenbegrenzung bei Open Library)", async () => {
    const s = sandbox({ bild: nur("books.google") });
    await s.C.get(buch(K1));
    assert.ok(![...s.calls.map(c => c.url), ...s.bilder].some(u => u.includes("/b/isbn/")));
  });
});

describe("img(): geladenes Bild wiederverwenden (nicht doppelt laden)", () => {
  test("nach get() kommt das schon geladene Element, ein zweites Mal ein neues", async () => {
    const s = sandbox({ bild: nur("ekz.de") });
    const r = await s.C.get(buch(K1));
    const n = s.bilder.length;
    const a = s.C.img(r);
    assert.equal(a.src, r.src);
    assert.equal(s.bilder.length, n, "kein neuer Abruf");
    const b = s.C.img(r);
    assert.notEqual(a, b);
    assert.equal(s.bilder.length, n + 1);
  });
});

describe("Cache dsm-cover-v3", () => {
  const tag = 864e5;
  test("alter Cache dsm-cover-v2 wird gelöscht", () => {
    const s = sandbox({ alt: "{}" });
    assert.equal(s.ls.has("dsm-cover-v2"), false);
  });
  test("Treffer 60 Tage gültig: Bild direkt laden, keine Abfrage", async () => {
    const s = sandbox({ bild: () => true, cache: { [K1]: { u: "https://x/1-M.jpg", b: "coverOL", t: Date.now() - 59 * tag } } });
    assert.deepEqual({ ...(await s.C.get(buch(K1))) }, { src: "https://x/1-M.jpg", by: "coverOL" });
    assert.equal(s.calls.length, 0);
    assert.deepEqual(s.bilder, ["https://x/1-M.jpg"]);
  });
  test("gemerktes Bild nicht mehr ladbar → neu suchen", async () => {
    const s = sandbox({ bild: nur("ekz.de"), cache: { [K1]: { u: "https://x/1-M.jpg", b: "coverOL", t: Date.now() } } });
    assert.equal((await s.C.get(buch(K1))).by, "coverEKZ");
  });
  test("Treffer älter als 60 Tage → neu abfragen", async () => {
    const s = sandbox({ cache: { [K1]: { u: "https://x/1-M.jpg", b: "coverOL", t: Date.now() - 61 * tag } } });
    await s.C.get(buch(K1));
    assert.equal(s.ol().length, 1);
  });
  test("„kein Cover“ 14 Tage gültig, danach neu", async () => {
    let s = sandbox({ cache: { [K1]: { u: "", b: "", t: Date.now() - 13 * tag } } });
    assert.equal(await s.C.get(buch(K1)), null);
    assert.equal(s.calls.length + s.bilder.length, 0);
    s = sandbox({ cache: { [K1]: { u: "", b: "", t: Date.now() - 15 * tag } } });
    await s.C.get(buch(K1));
    assert.equal(s.ol().length, 1);
  });
  test("defekter Cache wird ignoriert", async () => {
    const s = sandbox();
    s.ctx.localStorage.setItem("dsm-cover-v3", "{kaputt");
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
  test("Takte: ekz 0,3 s, Open Library 1,5 s, danach Bildproben 0,6 s, Vorladen 0,35 s", () => {
    const s = sandbox();
    assert.ok(s.C.enabled);
    assert.match(CODE, /PROBE_TICK = 300/);
    assert.match(CODE, /BG_TICK = 1500/);
    assert.match(CODE, /TAIL_TICK = 600/);
    assert.match(CODE, /IMG_TICK = 350/);
  });

  test("ekz-Treffer: gemerkt, keine Open-Library-Abfrage", async () => {
    const s = sandbox({ bild: nur("ekz.de") });
    s.C.want(buch(K1));
    assert.equal(s.bilder.length, 0, "nichts sofort");
    await s.tick(300);
    assert.equal(s.ekz().length, 1);
    await s.tick(1500);
    assert.equal(s.ol().length, 0);
    await warte(450);
    assert.equal(s.gespeichert()[K1].b, "coverEKZ");
  });

  test("nur Bücher ohne ekz-Cover gehen an Open Library, bis zu 20 je Abfrage", async () => {
    const s = sandbox();
    const bs = Array.from({ length: 25 }, (_, n) => buch("97835222021" + String(n).padStart(2, "0")));
    bs.forEach(b => s.C.want(b));
    for (let n = 0; n < 25; n++) await s.tick(300);
    assert.equal(s.ekz().length, 25);
    assert.equal(s.ol().length, 0);
    await s.tick(1500);
    assert.equal(s.ol().length, 1);
    const keys1 = decodeURIComponent(s.ol()[0].url.slice(OL.length)).split(",");
    assert.equal(keys1.filter(k => /^ISBN:\d{13}$/.test(k)).length, 20);
    await s.tick(1500);
    assert.equal(s.ol().length, 2);
    await s.tick(1500);
    assert.equal(s.ol().length, 2, "Warteschlange leer");
  });

  test("nach Open Library: Open-Library-Bild, sonst Google-Bild, sonst „kein Cover“ gemerkt", async () => {
    const s = sandbox({ ol: keys => (keys.includes("ISBN:" + K1) ? OLHIT(5)(["ISBN:" + K1]) : {}), bild: nur("openlibrary") });
    s.C.want(buch(K1)); s.C.want(buch(K2));
    await s.tick(300); await s.tick(300);
    await s.tick(1500);
    for (let n = 0; n < 4; n++) await s.tick(600);
    assert.equal(s.takte(), 0);
    assert.deepEqual(s.gb(), [GB + K2 + "&printsec=frontcover&img=1&zoom=1"]);
    await warte(450);
    const g = s.gespeichert();
    assert.equal(g[K1].u, "https://covers.openlibrary.org/b/id/5-M.jpg");
    assert.equal(g[K2].u, "");
  });

  test("Netzfehler bei Open Library: nichts gemerkt", async () => {
    const s = sandbox({ ol: () => "throw" });
    s.C.want(buch(K1));
    await s.tick(300); await s.tick(1500);
    assert.equal(s.takte(), 0);
    await warte(450);
    assert.deepEqual(s.gespeichert(), {});
  });

  test("unwant entfernt aus der Warteschlange; Bücher ohne ISBN werden ignoriert", async () => {
    const s = sandbox();
    s.C.want({ t: "ohne" });
    s.C.want(buch(K1)); s.C.unwant(buch(K1));
    await s.tick(300);
    assert.equal(s.calls.length + s.bilder.length, 0);
  });

  test("„kein Cover“ bekannt → nichts; Treffer bekannt → nur Bild vorladen", async () => {
    const s = sandbox({ bild: () => true, cache: { [K1]: { u: "", b: "", t: Date.now() }, [K2]: { u: "https://x/2.jpg", b: "coverEKZ", t: Date.now() } } });
    s.C.want(buch(K1)); s.C.want(buch(K2));
    await s.tick(300); await s.tick(350);
    assert.equal(s.calls.length, 0);
    assert.deepEqual(s.bilder, ["https://x/2.jpg"]);
    s.C.want(buch(K2));
    await s.tick(350);
    assert.equal(s.bilder.length, 1, "schon im Speicher");
  });

  test("pausiert bei verstecktem Tab", async () => {
    const s = sandbox({ hidden: true });
    s.C.want(buch(K1));
    await s.tick(300);
    assert.equal(s.bilder.length, 0);
    s.ctx.document.hidden = false;
    await s.tick(300);
    assert.equal(s.bilder.length, 1);
  });

  test("ohne Arbeit läuft kein Takt-Timer (Gerät wird nicht geweckt)", async () => {
    const s = sandbox({ bild: nur("ekz.de") });
    assert.equal(s.takte(), 0, "nach dem Laden");
    s.C.want(buch(K1));
    assert.equal(s.takte(), 1);
    await s.tick(300);
    assert.equal(s.takte(), 0, "Warteschlangen leer");
  });

  test("Datensparen / 2G: Hintergrund aus", async () => {
    for (const conn of [{ saveData: true }, { effectiveType: "2g" }, { effectiveType: "slow-2g" }]) {
      const s = sandbox({ conn });
      assert.equal(s.C.enabled, false);
      s.C.want(buch(K1));
      await s.tick(300);
      assert.equal(s.calls.length + s.bilder.length, 0);
    }
  });
});

describe("prime(): Empfehlungen", () => {
  test("mehrere Bücher: eine Open-Library-Sammelabfrage parallel zu den ekz-Bildern", async () => {
    const s = sandbox({ ol: OLHIT(9), bild: nur("openlibrary", "ekz.de/" + K2) });
    const r = await s.C.prime([buch(K1), buch(K2), { t: "ohne ISBN" }]);
    assert.equal(s.ol().length, 1);
    assert.equal(r[0].by, "coverOL");
    assert.equal(r[1].by, "coverEKZ");
    assert.equal(r[2], null);
    assert.equal(s.gb().length, 0);
  });
});

describe("survey(): Abdeckung messen (admin.html)", () => {
  test("zählt ekz, Open Library, Google, ohne Cover; Open Library nur für ekz-Fehltreffer", async () => {
    const K4 = "9783453604117";
    const s = sandbox({
      ol: keys => (keys.includes("ISBN:" + K1) ? OLHIT(1)(["ISBN:" + K1]) : {}),
      bild: nur("openlibrary", "ISBN" + K2, "ekz.de/" + K4),
    });
    const verlauf = [];
    const sv = s.C.survey([buch(K1), buch(K2), buch(K3), buch(K4), { t: "ohne" }], st => verlauf.push(st));
    const st = await sv.done;
    assert.equal(st.total, 4);
    assert.equal(st.ekz, 1); assert.equal(st.ol, 1); assert.equal(st.gb, 1); assert.equal(st.none, 1); assert.equal(st.err, 0);
    assert.equal(st.done, 4);
    assert.equal(st.complete, true);
    assert.equal(s.ol().length, 1, "eine Sammelabfrage");
    assert.ok(!decodeURIComponent(s.ol()[0].url).includes(K4), "ekz-Treffer nicht an Open Library");
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
