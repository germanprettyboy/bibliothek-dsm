/*
 * covers.js in a sandbox: fetch, Image, localStorage and the tick timers (setTimeout 300/350/600/1500 ms) are replaced.
 * No network. Checks the order ekz → Open Library (batch request) → Google image, substitute image detection,
 * no Google API, cache, background queues and the survey.
 */
"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { WEB } = require("../helpers/load.js");

const CODE = fs.readFileSync(path.join(WEB, "assets", "covers.js"), "utf8");
const OL = "https://openlibrary.org/api/books?format=json&jscmd=viewapi&bibkeys=";
const EKZ = "https://cover.ekz.de/";
const GB = "https://books.google.com/books/content?vid=ISBN";
const wait = ms => new Promise(r => setTimeout(r, ms));
const TICKS = [300, 350, 600, 1500];
const answer = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

/*
 * ol(keys) → object for the OL answer; "throw" simulates a network error.
 * image(src) → true (cover 180×270), false (404/error) or [width, height].
 * bytes(src) → content of an ekz image for fetch (Buffer), "throw" = network error, otherwise 404.
 */
function sandbox({ ol = () => ({}), image = () => false, bytes = () => null, cache = null, conn = {}, hidden = false, old = null } = {}) {
  const calls = [], images = [], intervals = [], ls = new Map();
  if (cache) ls.set("dsm-cover-v3", JSON.stringify(cache));
  if (old) ls.set("dsm-cover-v2", old);
  class Img {
    constructor() { this.naturalWidth = 0; this.naturalHeight = 0; this.isConnected = false; }
    set src(v) {
      this._src = v;
      if (!v) return;
      images.push(v);
      setImmediate(() => {
        const r = image(v);
        if (r) { [this.naturalWidth, this.naturalHeight] = r === true ? [180, 270] : r; this.onload && this.onload(); }
        else this.onerror && this.onerror();
      });
    }
    get src() { return this._src; }
  }
  const ctx = {
    fetch: async (url, opt) => {
      calls.push({ url, opt });
      if (url.startsWith(EKZ)) {
        const d = bytes(url);
        if (d === "throw") throw new TypeError("Failed to fetch");
        return d ? { ok: true, status: 200, arrayBuffer: async () => d.buffer.slice(d.byteOffset, d.byteOffset + d.length) } : answer({}, 404);
      }
      if (!url.startsWith(OL)) throw new Error("unexpected URL " + url);
      const r = ol(decodeURIComponent(url.slice(OL.length)).split(","));
      if (r === "throw") throw new TypeError("Failed to fetch");
      return r && r.__status ? answer(r.body || {}, r.__status) : answer(r);
    },
    Image: Img,
    localStorage: {
      getItem: k => (ls.has(k) ? ls.get(k) : null),
      setItem: (k, v) => ls.set(k, String(v)),
      removeItem: k => ls.delete(k),
    },
    navigator: { connection: conn },
    document: { hidden },
    // trigger the ticks of the background queues via tick(), other timers are real
    setTimeout: (fn, ms, ...a) => {
      if (!TICKS.includes(ms)) return setTimeout(fn, ms, ...a);
      intervals.push({ fn, ms }); return -intervals.length;
    },
    clearTimeout: id => (id < 0 ? undefined : clearTimeout(id)), setImmediate, AbortController,
    console,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename: "covers.js" });
  // only the timers of this tick pending at the time of the call, each exactly once
  const tick = async ms => {
    const due = intervals.filter(i => i.ms === ms);
    for (const i of due) intervals.splice(intervals.indexOf(i), 1);
    for (const i of due) await i.fn();
    await wait(5);
  };
  const saved = () => JSON.parse(ls.get("dsm-cover-v3") || "{}");
  return {
    C: ctx.DSMCovers, calls, images, tick, saved, ls, timers: () => intervals.length, ctx,
    ol: () => calls.filter(c => c.url.startsWith(OL)),
    ekzBytes: () => calls.filter(c => c.url.startsWith(EKZ)),
    ekz: () => images.filter(s => s.startsWith(EKZ)),
    gb: () => images.filter(s => s.startsWith(GB)),
  };
}

const book = (i, t = "Book " + i) => ({ t, i: [i] });
const K1 = "9783522202107", K2 = "9783871347108", K3 = "9780804429573";
const OLHIT = id => keys => Object.fromEntries(keys.map(k => [k, { thumbnail_url: `http://covers.openlibrary.org/b/id/${id}-S.jpg` }]));
const only = (...parts) => src => parts.some(t => src.includes(t)); // the image only loads if the URL contains one of the parts

describe("get(): tap, with priority", () => {
  test("without ISBN: no request, placeholder", async () => {
    const s = sandbox();
    assert.equal(await s.C.get({ t: "x" }), null);
    assert.equal(await s.C.get({ t: "x", i: [] }), null);
    assert.equal(s.calls.length + s.images.length, 0);
  });

  test("ISBN with a wrong cover (books.js noCover): placeholder, no request, also not from the cache", async () => {
    const s = sandbox({ image: only("ekz.de"), cache: { [K1]: { src: EKZ + K1 + ".jpg", by: "coverEKZ", t: Date.now() } } });
    s.ctx.DSM_LIBRARY = { noCover: [K1] };
    assert.equal(await s.C.get(book(K1)), null);
    assert.equal(s.calls.length + s.images.length, 0);
    s.C.want(book(K1));
    assert.equal(s.timers(), 0);
  });

  test("ekz first: image directly via the ISBN", async () => {
    const s = sandbox({ image: only("ekz.de"), ol: OLHIT(42) });
    const r = await s.C.get(book(K1));
    assert.deepEqual({ ...r }, { src: EKZ + K1 + ".jpg", by: "coverEKZ" });
    assert.equal(s.gb().length, 0);
  });

  test("without an ekz cover: Open Library viewapi with ISBN-13 and ISBN-10, image in size M via https", async () => {
    const s = sandbox({ image: only("openlibrary"), ol: OLHIT(42) });
    const r = await s.C.get(book(K1));
    assert.deepEqual({ ...r }, { src: "https://covers.openlibrary.org/b/id/42-M.jpg", by: "coverOL" });
    const u = decodeURIComponent(s.ol()[0].url);
    assert.ok(u.includes("ISBN:" + K1) && u.includes("ISBN:3522202104"), u);
    for (const c of s.calls) assert.equal(c.opt.referrerPolicy, "no-referrer");
  });

  test("ISBN-10 with check digit X derived correctly", async () => {
    const s = sandbox();
    await s.C.get(book(K3));
    assert.ok(decodeURIComponent(s.ol()[0].url).includes("ISBN:080442957X"));
  });

  test("fallback Google: image directly via the ISBN, no Google API", async () => {
    const s = sandbox({ image: only("books.google") });
    const r = await s.C.get(book(K2));
    assert.equal(r.by, "coverGB");
    assert.equal(r.src, GB + K2 + "&printsec=frontcover&img=1&zoom=1");
    assert.ok(!s.calls.some(c => c.url.includes("googleapis")));
  });

  test('Google substitute image 128×184 counts as "no cover"', async () => {
    const s = sandbox({ image: src => (src.includes("books.google") ? [128, 184] : false) });
    assert.equal(await s.C.get(book(K2)), null);
    await wait(450);
    assert.equal(s.saved()[K2].u, "");
  });

  test('Google substitute image "image not available" 128×170 counts as "no cover"', async () => {
    const s = sandbox({ image: src => (src.includes("books.google") ? [128, 170] : false) });
    assert.equal(await s.C.get(book(K2)), null);
  });

  test("a real Google cover 128×205 is taken", async () => {
    const s = sandbox({ image: src => (src.includes("books.google") ? [128, 205] : false) });
    assert.equal((await s.C.get(book(K2))).by, "coverGB");
  });

  // instead of a 404 ekz often returns "leider kein aktuelles Bild vorhanden" (170×270, always the same 9977 bytes)
  const SUBSTITUTE = fs.readFileSync(path.join(__dirname, "..", "helpers", "ekz-placeholder.jpg"));
  const ekzImage = size => src => (src.includes("ekz.de") ? size : src.includes("openlibrary"));

  test('ekz substitute image "leider kein aktuelles Bild vorhanden" counts as "no cover" → Open Library', async () => {
    const s = sandbox({ image: ekzImage([170, 270]), bytes: () => SUBSTITUTE, ol: OLHIT(42) });
    const r = await s.C.get(book(K1));
    assert.equal(r.by, "coverOL");
    assert.equal(s.ekzBytes().length, 1);
    assert.equal(s.ekzBytes()[0].opt.referrerPolicy, "no-referrer");
  });

  test("ekz substitute image without another source: placeholder, remembered", async () => {
    const s = sandbox({ image: src => (src.includes("ekz.de") ? [170, 270] : false), bytes: () => SUBSTITUTE });
    assert.equal(await s.C.get(book(K1)), null);
    await wait(450);
    assert.equal(s.saved()[K1].u, "");
  });

  test("a real ekz cover of the same size 170×270 stays", async () => {
    const other = Buffer.from(SUBSTITUTE); other[5000] ^= 1;
    const s = sandbox({ image: ekzImage([170, 270]), bytes: () => other, ol: OLHIT(42) });
    assert.equal((await s.C.get(book(K1))).by, "coverEKZ");
    const s2 = sandbox({ image: ekzImage([170, 270]), bytes: () => Buffer.alloc(12000), ol: OLHIT(42) });
    assert.equal((await s2.C.get(book(K1))).by, "coverEKZ");
  });

  test("ekz image of another size: no second request as data", async () => {
    const s = sandbox({ image: ekzImage([170, 271]), bytes: () => SUBSTITUTE });
    assert.equal((await s.C.get(book(K1))).by, "coverEKZ");
    assert.equal(s.ekzBytes().length, 0);
  });

  test("ekz 170×270 can't be checked (network error): rather no ekz image", async () => {
    const s = sandbox({ image: ekzImage([170, 270]), bytes: () => "throw", ol: OLHIT(42) });
    assert.equal((await s.C.get(book(K1))).by, "coverOL");
    const s2 = sandbox({ image: src => (src.includes("ekz.de") ? [170, 270] : false), bytes: () => "throw" });
    assert.equal(await s2.C.get(book(K1)), null);
  });

  test("ekz substitute image from an old cache: discarded and searched anew", async () => {
    const cache = { [K1]: { u: EKZ + K1 + ".jpg", b: "coverEKZ", t: Date.now() } };
    const s = sandbox({ cache, image: ekzImage([170, 270]), bytes: () => SUBSTITUTE, ol: OLHIT(42) });
    assert.equal((await s.C.get(book(K1))).by, "coverOL");
    await wait(450);
    assert.equal(s.saved()[K1].b, "coverOL");
  });

  test("several ISBNs: each is tried at ekz", async () => {
    const s = sandbox({ image: only("ekz.de/" + K2) });
    const r = await s.C.get({ t: "x", i: [K1, K2] });
    assert.equal(r.src, EKZ + K2 + ".jpg");
  });

  test("no cover: null, remembered, second call without network", async () => {
    const s = sandbox();
    assert.equal(await s.C.get(book(K1)), null);
    const n = s.calls.length + s.images.length;
    assert.equal(await s.C.get(book(K1)), null);
    assert.equal(s.calls.length + s.images.length, n);
    await wait(450);
    assert.deepEqual(Object.keys(s.saved()), [K1]);
    assert.equal(s.saved()[K1].u, "");
  });

  test("network error at Open Library without another cover: null, but not remembered", async () => {
    const s = sandbox({ ol: () => "throw" });
    assert.equal(await s.C.get(book(K1)), null);
    await s.C.get(book(K1));
    assert.equal(s.ol().length, 2);
    await wait(450);
    assert.deepEqual(s.saved(), {});
  });

  test("Open Library image doesn't load → on to Google", async () => {
    const s = sandbox({ ol: OLHIT(1), image: only("books.google") });
    assert.equal((await s.C.get(book(K1))).by, "coverGB");
  });

  test("simultaneous calls share one request", async () => {
    const s = sandbox({ image: only("openlibrary"), ol: OLHIT(7) });
    const [a, b] = await Promise.all([s.C.get(book(K1)), s.C.get(book(K1))]);
    assert.equal(a.src, b.src);
    assert.equal(s.ol().length, 1);
    assert.equal(s.ekz().length, 1);
  });

  test("never /b/isbn/ (rate limit at Open Library)", async () => {
    const s = sandbox({ image: only("books.google") });
    await s.C.get(book(K1));
    assert.ok(![...s.calls.map(c => c.url), ...s.images].some(u => u.includes("/b/isbn/")));
  });
});

describe("img(): reuse a loaded image (don't load twice)", () => {
  test("after get() comes the already loaded element, a second time a new one", async () => {
    const s = sandbox({ image: only("ekz.de") });
    const r = await s.C.get(book(K1));
    const n = s.images.length;
    const a = s.C.img(r);
    assert.equal(a.src, r.src);
    assert.equal(s.images.length, n, "no new request");
    const b = s.C.img(r);
    assert.notEqual(a, b);
    assert.equal(s.images.length, n + 1);
  });
});

describe("cache dsm-cover-v3", () => {
  const day = 864e5;
  test("the old cache dsm-cover-v2 is deleted", () => {
    const s = sandbox({ old: "{}" });
    assert.equal(s.ls.has("dsm-cover-v2"), false);
  });
  test("hit valid for 60 days: load the image directly, no request", async () => {
    const s = sandbox({ image: () => true, cache: { [K1]: { u: "https://x/1-M.jpg", b: "coverOL", t: Date.now() - 59 * day } } });
    assert.deepEqual({ ...(await s.C.get(book(K1))) }, { src: "https://x/1-M.jpg", by: "coverOL" });
    assert.equal(s.calls.length, 0);
    assert.deepEqual(s.images, ["https://x/1-M.jpg"]);
  });
  test("remembered image can't be loaded any more → search anew", async () => {
    const s = sandbox({ image: only("ekz.de"), cache: { [K1]: { u: "https://x/1-M.jpg", b: "coverOL", t: Date.now() } } });
    assert.equal((await s.C.get(book(K1))).by, "coverEKZ");
  });
  test("hit older than 60 days → request again", async () => {
    const s = sandbox({ cache: { [K1]: { u: "https://x/1-M.jpg", b: "coverOL", t: Date.now() - 61 * day } } });
    await s.C.get(book(K1));
    assert.equal(s.ol().length, 1);
  });
  test('"no cover" valid for 14 days, afterwards anew', async () => {
    let s = sandbox({ cache: { [K1]: { u: "", b: "", t: Date.now() - 13 * day } } });
    assert.equal(await s.C.get(book(K1)), null);
    assert.equal(s.calls.length + s.images.length, 0);
    s = sandbox({ cache: { [K1]: { u: "", b: "", t: Date.now() - 15 * day } } });
    await s.C.get(book(K1));
    assert.equal(s.ol().length, 1);
  });
  test("a broken cache is ignored", async () => {
    const s = sandbox();
    s.ctx.localStorage.setItem("dsm-cover-v3", "{broken");
    assert.doesNotThrow(() => vm.runInContext(CODE, s.ctx));
  });
  test("at most 3000 entries, the oldest are dropped", async () => {
    const cache = {};
    for (let n = 0; n < 3005; n++) cache["k" + n] = { u: "", b: "", t: Date.now() - (3005 - n) * 1000 };
    const s = sandbox({ cache });
    await s.C.get(book(K1));
    await wait(450);
    const g = s.saved();
    assert.equal(Object.keys(g).length, 3000);
    assert.ok(!("k0" in g) && !("k5" in g) && "k6" in g && K1 in g);
  });
});

describe("background: want/unwant, staggered", () => {
  test("ticks: ekz 0.3 s, Open Library 1.5 s, then image probes 0.6 s, preloading 0.35 s", () => {
    const s = sandbox();
    assert.ok(s.C.enabled);
    assert.match(CODE, /PROBE_TICK = 300/);
    assert.match(CODE, /BG_TICK = 1500/);
    assert.match(CODE, /TAIL_TICK = 600/);
    assert.match(CODE, /IMG_TICK = 350/);
  });

  test("ekz hit: remembered, no Open Library request", async () => {
    const s = sandbox({ image: only("ekz.de") });
    s.C.want(book(K1));
    assert.equal(s.images.length, 0, "nothing immediately");
    await s.tick(300);
    assert.equal(s.ekz().length, 1);
    await s.tick(1500);
    assert.equal(s.ol().length, 0);
    await wait(450);
    assert.equal(s.saved()[K1].b, "coverEKZ");
  });

  test("only books without an ekz cover go to Open Library, up to 20 per request", async () => {
    const s = sandbox();
    const bs = Array.from({ length: 25 }, (_, n) => book("97835222021" + String(n).padStart(2, "0")));
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
    assert.equal(s.ol().length, 2, "queue empty");
  });

  test('after Open Library: Open Library image, otherwise Google image, otherwise "no cover" remembered', async () => {
    const s = sandbox({ ol: keys => (keys.includes("ISBN:" + K1) ? OLHIT(5)(["ISBN:" + K1]) : {}), image: only("openlibrary") });
    s.C.want(book(K1)); s.C.want(book(K2));
    await s.tick(300); await s.tick(300);
    await s.tick(1500);
    for (let n = 0; n < 4; n++) await s.tick(600);
    assert.equal(s.timers(), 0);
    assert.deepEqual(s.gb(), [GB + K2 + "&printsec=frontcover&img=1&zoom=1"]);
    await wait(450);
    const g = s.saved();
    assert.equal(g[K1].u, "https://covers.openlibrary.org/b/id/5-M.jpg");
    assert.equal(g[K2].u, "");
  });

  test("network error at Open Library: nothing remembered", async () => {
    const s = sandbox({ ol: () => "throw" });
    s.C.want(book(K1));
    await s.tick(300); await s.tick(1500);
    assert.equal(s.timers(), 0);
    await wait(450);
    assert.deepEqual(s.saved(), {});
  });

  test("unwant removes from the queue; books without ISBN are ignored", async () => {
    const s = sandbox();
    s.C.want({ t: "without" });
    s.C.want(book(K1)); s.C.unwant(book(K1));
    await s.tick(300);
    assert.equal(s.calls.length + s.images.length, 0);
  });

  test('"no cover" known → nothing; hit known → only preload the image', async () => {
    const s = sandbox({ image: () => true, cache: { [K1]: { u: "", b: "", t: Date.now() }, [K2]: { u: "https://x/2.jpg", b: "coverEKZ", t: Date.now() } } });
    s.C.want(book(K1)); s.C.want(book(K2));
    await s.tick(300); await s.tick(350);
    assert.equal(s.calls.length, 0);
    assert.deepEqual(s.images, ["https://x/2.jpg"]);
    s.C.want(book(K2));
    await s.tick(350);
    assert.equal(s.images.length, 1, "already in memory");
  });

  test("pauses in a hidden tab", async () => {
    const s = sandbox({ hidden: true });
    s.C.want(book(K1));
    await s.tick(300);
    assert.equal(s.images.length, 0);
    s.ctx.document.hidden = false;
    await s.tick(300);
    assert.equal(s.images.length, 1);
  });

  test("without work no tick timer runs (the device is not woken)", async () => {
    const s = sandbox({ image: only("ekz.de") });
    assert.equal(s.timers(), 0, "after loading");
    s.C.want(book(K1));
    assert.equal(s.timers(), 1);
    await s.tick(300);
    assert.equal(s.timers(), 0, "queues empty");
  });

  test("data saver / 2G: background off", async () => {
    for (const conn of [{ saveData: true }, { effectiveType: "2g" }, { effectiveType: "slow-2g" }]) {
      const s = sandbox({ conn });
      assert.equal(s.C.enabled, false);
      s.C.want(book(K1));
      await s.tick(300);
      assert.equal(s.calls.length + s.images.length, 0);
    }
  });
});

describe("prime(): recommendations", () => {
  test("several books: one Open Library batch request in parallel to the ekz images", async () => {
    const s = sandbox({ ol: OLHIT(9), image: only("openlibrary", "ekz.de/" + K2) });
    const r = await s.C.prime([book(K1), book(K2), { t: "without ISBN" }]);
    assert.equal(s.ol().length, 1);
    assert.equal(r[0].by, "coverOL");
    assert.equal(r[1].by, "coverEKZ");
    assert.equal(r[2], null);
    assert.equal(s.gb().length, 0);
  });
});

describe("survey(): measure coverage (admin.html)", () => {
  test("counts ekz, Open Library, Google, without cover; Open Library only for ekz misses", async () => {
    const K4 = "9783453604117";
    const s = sandbox({
      ol: keys => (keys.includes("ISBN:" + K1) ? OLHIT(1)(["ISBN:" + K1]) : {}),
      image: only("openlibrary", "ISBN" + K2, "ekz.de/" + K4),
    });
    const progress = [];
    const sv = s.C.survey([book(K1), book(K2), book(K3), book(K4), { t: "without" }], st => progress.push(st));
    const st = await sv.done;
    assert.equal(st.total, 4);
    assert.equal(st.ekz, 1); assert.equal(st.ol, 1); assert.equal(st.gb, 1); assert.equal(st.none, 1); assert.equal(st.err, 0);
    assert.equal(st.done, 4);
    assert.equal(st.complete, true);
    assert.equal(s.ol().length, 1, "one batch request");
    assert.ok(!decodeURIComponent(s.ol()[0].url).includes(K4), "ekz hits not sent to Open Library");
    assert.ok(progress.every((v, n) => n === 0 || v.done >= progress[n - 1].done), "progress increases");
    assert.deepEqual(st.miss.map(b => b.t), ["Book " + K3], "books without a cover for the maintenance list");
  });
  test("blocked ISBNs (books.js noCover) are skipped as if missing", async () => {
    const s = sandbox({ image: only("ekz.de") });
    s.ctx.DSM_LIBRARY = { noCover: [K1] };
    const st = await s.C.survey([book(K1), book(K2), { t: "both", i: [K1, K3] }]).done;
    assert.equal(st.total, 2);
    assert.equal(st.ekz, 2);
    assert.ok(!s.ekz().some(u => u.includes(K1)), "no request for the blocked ISBN");
  });
  test("an ekz substitute image doesn't count as an ekz cover", async () => {
    const SUBSTITUTE = fs.readFileSync(path.join(__dirname, "..", "helpers", "ekz-placeholder.jpg"));
    const s = sandbox({ image: src => (src.includes("ekz.de/" + K1) ? [170, 270] : src.includes("ekz.de/" + K2)), bytes: () => SUBSTITUTE });
    const st = await s.C.survey([book(K1), book(K2)]).done;
    assert.equal(st.ekz, 1); assert.equal(st.none, 1);
  });
  test("stop() aborts, complete = false", async () => {
    const s = sandbox();
    const sv = s.C.survey([book(K1), book(K2), book(K3)]);
    sv.stop();
    const st = await sv.done;
    assert.equal(st.complete, false);
    assert.ok(st.done < 3);
  });
});
