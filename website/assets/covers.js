/*
 * covers.js – load covers via the ISBN (only existing ISBNs, no completion).
 *
 * Sources, in this order
 *  1. ekz-Bibliotheksservice: image directly via the ISBN (cover.ekz.de/<ISBN>.jpg), 404 = none.
 *     Instead of a 404 there often comes (catalog 2026-10-17: 376 of 2625) a substitute image "leider kein aktuelles
 *     Bild vorhanden" (170×270, always the same 9977 bytes). Images of this size are therefore
 *     fetched a second time as data (ekz allows CORS) and compared byte by byte – real covers
 *     of the same size stay. If that can't be checked, the image counts as a substitute.
 *     Hits about 2 out of 3 books in the catalog, without a request beforehand. (The Deutsche Nationalbibliothek
 *     is ruled out: portal.dnb.de sits behind bot protection, browsers get HTML there instead of an image.)
 *  2. Open Library, batch request via /api/books (up to 20 books per request) → image via the
 *     cover ID. Images via the ID are not rate-limited (requests directly via the ISBN would be limited to
 *     100 per 5 minutes and IP – in the school network everyone shares one IP).
 *  3. Google Books, image directly via the ISBN. The Google API is not used: without a key
 *     its shared daily quota is exhausted (always 429). Without a cover Google returns one of
 *     two substitute images: 128×184 (book outline) or 128×170 ("image not available"), both are
 *     discarded. Google allows no CORS, comparing bytes is impossible – the dimensions suffice: in the catalog
 *     (2026-10-17) 444 substitute images, only 6 real covers of these sizes.
 * Resolution: ekz 170–440 px (fixed), Open Library "M" about 180 px, Google about 128 px wide.
 *
 * Operation
 *  - get(book): immediately, with priority (on tap). ekz and Open Library in parallel.
 *  - want(book) / unwant(book): background for books in view, staggered; Open Library only
 *    for books without an ekz cover. Pauses in a hidden tab and with "data saver".
 *  - Loaded images stay in memory as elements (img()): a new
 *    <img> with the same address would otherwise load the image a second time without cache headers.
 *  - Results (also "no cover") are remembered in the browser.
 */
(function (root) {
  "use strict";
  const log = root.DSM_LOG || function () {}; // assets/logger.js

  const OL_API = "https://openlibrary.org/api/books?format=json&jscmd=viewapi&bibkeys=";
  const SRC = {
    ekz: i => "https://cover.ekz.de/" + i + ".jpg",
    gb: i => "https://books.google.com/books/content?vid=ISBN" + i + "&printsec=frontcover&img=1&zoom=1"
  };
  const BATCH = 20;            // books per Open Library request
  const PROBE_TICK = 300;      // ms between ekz image probes in the background
  const BG_TICK = 1500;        // ms between background requests to Open Library
  const TAIL_TICK = 600;       // ms between image probes after Open Library (Open Library image, Google image)
  const IMG_TICK = 350;        // ms between preloaded images from the cache
  const POOL = 40;             // loaded image elements in memory
  const EKZ_SUBSTITUTE = { w: 170, h: 270, bytes: 9977, fnv: 0x6b29ba0d }; // ekz "leider kein aktuelles Bild vorhanden"
  const CACHE_KEY = "dsm-cover-v3", HIT_TTL = 60 * 864e5, MISS_TTL = 14 * 864e5, MAX_ENTRIES = 3000;

  // ---------- Cache ----------
  // v2 dates from the time without ekz (many wrong "no cover") and is discarded
  let cache = {};
  try { localStorage.removeItem("dsm-cover-v2"); } catch (e) { /* blocked */ }
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {}; } catch (e) { cache = {}; }
  let saveT = 0;
  function persist() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const keys = Object.keys(cache);
      if (keys.length > MAX_ENTRIES) keys.sort((a, b) => cache[a].t - cache[b].t).slice(0, keys.length - MAX_ENTRIES).forEach(k => delete cache[k]);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* full or blocked */ }
    }, 400);
  }
  const keyOf = b => (b.i || []).join(",");
  function cached(key) {
    const c = cache[key];
    if (!c) return undefined;
    const age = Date.now() - c.t;
    if (c.u ? age > HIT_TTL : age > MISS_TTL) return undefined;
    return c.u ? { src: c.u, by: c.b } : null;
  }
  function store(key, v) { cache[key] = { u: v ? v.src : "", b: v ? v.by : "", t: Date.now() }; persist(); }

  // ---------- Helpers ----------
  function isbn10(i13) {
    if (!/^978\d{10}$/.test(i13)) return null;
    const core = i13.slice(3, 12);
    let s = 0;
    for (let i = 0; i < 9; i++) s += +core[i] * (10 - i);
    const c = (11 - (s % 11)) % 11;
    return core + (c === 10 ? "X" : String(c));
  }
  function timeoutSignal(ms) {
    if (!("AbortController" in root)) return { signal: undefined, done() {} };
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
    return { signal: c.signal, done() { clearTimeout(t); } };
  }

  // ---------- Images ----------
  const pool = new Map(); // src -> loaded <img>
  function keep(src, img) {
    pool.delete(src); pool.set(src, img);
    if (pool.size > POOL) pool.delete(pool.keys().next().value);
  }
  // discard Google substitute images (book outline 128×184, "image not available" 128×170) and one-pixel images
  const real = (img, src) => img.naturalWidth > 20 && img.naturalHeight > 20 &&
    !(img.naturalWidth === 128 && (img.naturalHeight === 184 || img.naturalHeight === 170) && src.includes("books.google"));
  // ekz substitute image: only reload images of its size as data and compare. src -> Promise<bool>
  const substitutes = new Map();
  function ekzSubstitute(img, src) {
    if (!src.startsWith("https://cover.ekz.de/") || img.naturalWidth !== EKZ_SUBSTITUTE.w || img.naturalHeight !== EKZ_SUBSTITUTE.h) return Promise.resolve(false);
    if (substitutes.has(src)) return substitutes.get(src);
    const to = timeoutSignal(8000);
    const p = fetch(src, { referrerPolicy: "no-referrer", signal: to.signal })
      .then(r => { if (!r.ok) throw new Error("ekz " + r.status); return r.arrayBuffer(); })
      .then(buf => {
        const b = new Uint8Array(buf);
        if (b.length !== EKZ_SUBSTITUTE.bytes) return false;
        let h = 0x811c9dc5;
        for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
        return h === EKZ_SUBSTITUTE.fnv;
      })
      .catch(() => { substitutes.delete(src); return true; }) // can't be checked: rather a placeholder than a substitute image
      .finally(() => to.done());
    substitutes.set(src, p);
    return p;
  }
  function loadImg(src, ms) {
    if (pool.has(src)) return Promise.resolve(true);
    return new Promise(res => {
      const img = new Image();
      const t = setTimeout(() => { img.src = ""; res(false); }, ms || 8000);
      img.referrerPolicy = "no-referrer";
      img.decoding = "async";
      img.onload = async () => {
        clearTimeout(t);
        const ok = real(img, src) && !await ekzSubstitute(img, src);
        if (ok) keep(src, img);
        res(ok);
      };
      img.onerror = () => { clearTimeout(t); res(false); };
      img.src = src;
    });
  }
  // Fully loaded image element (from memory, otherwise new); every element only once in the document
  function img(found) {
    const p = pool.get(found.src);
    if (p && !p.isConnected) { pool.delete(found.src); return p; }
    const n = new Image();
    n.referrerPolicy = "no-referrer"; n.decoding = "async"; n.src = found.src;
    return n;
  }
  // First loadable source from a list of {src,by}, one after another
  async function firstImg(cands) {
    for (const c of cands) if (await loadImg(c.src)) return c;
    return null;
  }
  const ekzCands = b => b.i.map(i => ({ src: SRC.ekz(i), by: "coverEKZ" }));
  const gbCands = b => b.i.map(i => ({ src: SRC.gb(i), by: "coverGB" }));

  // Open Library: several books in one request. Result: Map key -> {src,by} | null; null on a network error.
  async function olLookup(books) {
    const want = new Map(); // bibkey -> key
    for (const b of books) for (const i of b.i) {
      want.set("ISBN:" + i, keyOf(b));
      const i10 = isbn10(i); if (i10) want.set("ISBN:" + i10, keyOf(b));
    }
    const out = new Map(books.map(b => [keyOf(b), null]));
    const to = timeoutSignal(8000);
    try {
      const r = await fetch(OL_API + [...want.keys()].join(","), { referrerPolicy: "no-referrer", signal: to.signal });
      if (!r.ok) throw new Error("ol " + r.status);
      const j = await r.json();
      for (const [bib, v] of Object.entries(j)) {
        const k = want.get(bib);
        if (!k || out.get(k) || !v || !v.thumbnail_url) continue;
        out.set(k, { src: v.thumbnail_url.replace(/^http:/, "https:").replace(/-S\.jpg$/, "-M.jpg"), by: "coverOL" });
      }
      return out;
    } catch (e) {
      return null; // network error: remember nothing, try again later
    } finally { to.done(); }
  }

  // ---------- Priority (tap) ----------
  const inflight = new Map();
  // olHit: optional promise of the Open Library result from a batch request (prime)
  function get(b, olHit) {
    if (!b || !b.i || !b.i.length) return Promise.resolve(null);
    const key = keyOf(b);
    if (inflight.has(key)) return inflight.get(key);
    const c = cached(key);
    if (c === null) return Promise.resolve(null);
    // Known source: load the image; search anew only if it can no longer be loaded
    const p = (c ? loadImg(c.src).then(ok => ok ? c : live(b)) : live(b, olHit))
      .then(v => { inflight.delete(key); return v || null; });
    inflight.set(key, p);
    return p;
  }
  // ekz and Open Library in parallel; ekz wins as soon as it is clear that it has one. Then Google.
  function live(b, olHit) {
    const key = keyOf(b);
    const ekz = firstImg(ekzCands(b));
    const ol = (olHit || olLookup([b]).then(m => m ? m.get(key) : undefined)).then(async h => {
      if (h === undefined) return undefined; // network error
      return h && await loadImg(h.src) ? h : null;
    });
    return ekz.then(async d => {
      if (d) return d;
      const o = await ol;
      if (o) return o;
      const g = await firstImg(gbCands(b));
      return g || (o === undefined ? undefined : null);
    }).then(v => { if (v !== undefined) store(key, v); return v; });
  }

  // ---------- Background (staggered) ----------
  const queue = new Map();   // key -> book in view, still open: try ekz
  const olQueue = new Map(); // without an ekz cover: Open Library
  const tail = [];           // {key, steps:[{src,by}]}: Open Library image, then Google image
  const imgQueue = [];       // known sources (cache) for preloading
  const conn = navigator.connection || {};
  const enabled = !conn.saveData && !/(^|-)2g$/.test(conn.effectiveType || "");
  const pending = key => inflight.has(key) || queue.has(key) || olQueue.has(key) || tail.some(j => j.key === key);

  function want(b) {
    if (!enabled || !b || !b.i || !b.i.length) return;
    const key = keyOf(b);
    if (pending(key)) return;
    const c = cached(key);
    if (c) { if (!pool.has(c.src) && !imgQueue.some(x => x.key === key)) { imgQueue.push({ key, hit: c, book: b }); kickImg(); } }
    else if (c === undefined) { queue.set(key, b); kickEkz(); }
  }
  function unwant(b) {
    if (!b || !b.i) return;
    const key = keyOf(b);
    queue.delete(key);
    for (let n = imgQueue.length - 1; n >= 0; n--) if (imgQueue[n].key === key) imgQueue.splice(n, 1);
  }
  const paused = () => document.hidden;

  // Timer that only runs while work is pending (instead of permanent intervals that wake the device
  // several times per second even without work). Pause of "tick" ms before every step.
  function worker(tick, hasWork, run) {
    let t = 0, busy = false;
    const loop = async () => {
      t = 0;
      if (busy || !hasWork()) return;
      if (paused()) { kick(); return; } // hidden tab: just wait (the browser throttles timers there anyway)
      busy = true;
      try { await run(); } finally { busy = false; kick(); }
    };
    const kick = () => { if (!t && !busy && hasWork()) t = setTimeout(loop, tick); };
    return kick;
  }
  const kickEkz = worker(PROBE_TICK, () => queue.size > 0, async () => {
    const [key, b] = queue.entries().next().value;
    queue.delete(key);
    const d = await firstImg(ekzCands(b));
    if (d) store(key, d);
    else { olQueue.set(key, b); kickOl(); }
  });
  const kickOl = worker(BG_TICK, () => olQueue.size > 0, async () => {
    const batch = [...olQueue.values()].slice(0, BATCH);
    batch.forEach(b => olQueue.delete(keyOf(b)));
    const m = await olLookup(batch);
    if (!m) return; // network error: remember nothing, again on the next appearance
    let hits = 0;
    for (const b of batch) {
      const h = m.get(keyOf(b));
      if (h) hits++;
      tail.push({ key: keyOf(b), steps: (h ? [h] : []).concat(gbCands(b)) });
    }
    log("Cover", `background: ${batch.length} books without an ekz cover requested from Open Library, ${hits} with a cover`);
    kickTail();
  });
  const kickTail = worker(TAIL_TICK, () => tail.length > 0, async () => {
    const job = tail[0];
    const c = job.steps.shift();
    const ok = await loadImg(c.src);
    if (ok || !job.steps.length) { tail.shift(); store(job.key, ok ? c : null); }
  });
  const kickImg = worker(IMG_TICK, () => imgQueue.length > 0, async () => {
    const { key, hit, book } = imgQueue.shift();
    if (!await loadImg(hit.src)) { delete cache[key]; persist(); queue.set(key, book); kickEkz(); } // image gone: search anew
  });

  // ---------- Measurement for the admin page ----------
  // Checks all books with an ISBN (without cache), four at a time. onProgress({done,total,ekz,ol,gb,none,err});
  // stop() aborts. Results end up in the cache.
  function survey(books, onProgress) {
    let stopped = false;
    const list = books.filter(b => b.i && b.i.length);
    const st = { total: list.length, done: 0, ekz: 0, ol: 0, gb: 0, none: 0, err: 0, complete: false };
    const report = () => onProgress && onProgress(Object.assign({}, st));
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const COUNT = { coverEKZ: "ekz", coverOL: "ol", coverGB: "gb" };
    const run = (async () => {
      report();
      // 1. ekz per book; collect misses
      const misses = [];
      let next = 0;
      const ekzWorker = async () => {
        while (!stopped && next < list.length) {
          const b = list[next++];
          const d = await firstImg(ekzCands(b));
          if (d) { st.ekz++; st.done++; store(keyOf(b), d); } else misses.push(b);
          if (st.done % 10 === 0) report();
        }
      };
      await Promise.all([ekzWorker(), ekzWorker(), ekzWorker(), ekzWorker()]);
      report();
      // 2. misses: Open Library in batch requests, otherwise the Google image
      for (let i = 0; i < misses.length && !stopped; i += BATCH) {
        const part = misses.slice(i, i + BATCH);
        let m = await olLookup(part);
        if (!m) { await sleep(3000); m = await olLookup(part); }
        for (const b of part) {
          if (stopped) break;
          const h = m ? m.get(keyOf(b)) : undefined;
          const v = await firstImg((h ? [h] : []).concat(gbCands(b)));
          if (v) { st[COUNT[v.by]]++; store(keyOf(b), v); }
          else if (h === undefined) st.err++;
          else { st.none++; store(keyOf(b), null); }
          st.done++;
        }
        report();
        await sleep(500);
      }
      st.complete = !stopped;
      report();
      return st;
    })();
    return { done: run, stop() { stopped = true; } };
  }

  // Several books at once (e.g. recommendations): one Open Library batch request for the unknown ones
  function prime(books) {
    const todo = books.filter(b => b && b.i && b.i.length && cached(keyOf(b)) === undefined && !inflight.has(keyOf(b))).slice(0, BATCH);
    const m = todo.length > 1 ? olLookup(todo) : null;
    return Promise.all(books.map(b => get(b, m && todo.includes(b) ? m.then(x => x ? x.get(keyOf(b)) : undefined) : undefined)));
  }

  root.DSMCovers = { get, prime, want, unwant, survey, img, enabled };
})(window);
