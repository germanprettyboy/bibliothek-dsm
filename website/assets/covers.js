/*
 * covers.js – Cover über die ISBN laden (nur vorhandene ISBN, keine Ergänzung).
 *
 * Quellen
 *  1. Open Library, Sammelabfrage über /api/books (bis zu 20 Bücher je Anfrage). Liefert eine
 *     Cover-ID; Bilder über die ID sind nicht ratenbegrenzt (Abrufe direkt über die ISBN wären
 *     auf 100 je 5 Minuten und IP begrenzt – im Schulnetz teilen sich alle eine IP).
 *  2. Google Books als Rückfall, einzeln und gedrosselt.
 * Auflösung: klein (Open Library „M“, ca. 180 px breit; Google „thumbnail“, ca. 128 px breit).
 *
 * Betrieb
 *  - get(book): sofort, mit Vorrang (beim Antippen).
 *  - want(book) / unwant(book): Hintergrund-Warteschlange für Bücher in Sichtweite,
 *    gestaffelt abgearbeitet, pausiert bei verstecktem Tab und bei „Datensparen“.
 *  - Ergebnisse (auch „kein Cover“) werden im Browser gemerkt.
 */
(function (root) {
  "use strict";

  const OL_API = "https://openlibrary.org/api/books?format=json&jscmd=viewapi&bibkeys=";
  const GB_API = "https://www.googleapis.com/books/v1/volumes?fields=items(volumeInfo/imageLinks)&q=isbn:";
  const BATCH = 20;            // Bücher je Open-Library-Abfrage
  const BG_TICK = 1500;        // ms zwischen Hintergrund-Abfragen an Open Library
  const GB_TICK = 1800;        // ms zwischen Hintergrund-Abfragen an Google Books
  const IMG_TICK = 350;        // ms zwischen vorgeladenen Bildern
  const CACHE_KEY = "dsm-cover-v2", HIT_TTL = 60 * 864e5, MISS_TTL = 14 * 864e5, MAX_ENTRIES = 3000;

  // ---------- Cache ----------
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {}; } catch (e) { cache = {}; }
  let saveT = 0;
  function persist() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const keys = Object.keys(cache);
      if (keys.length > MAX_ENTRIES) keys.sort((a, b) => cache[a].t - cache[b].t).slice(0, keys.length - MAX_ENTRIES).forEach(k => delete cache[k]);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* voll oder gesperrt */ }
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

  // ---------- Hilfen ----------
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
  function loadImg(src, ms) {
    return new Promise(res => {
      const img = new Image();
      const t = setTimeout(() => { img.src = ""; res(false); }, ms || 8000);
      img.referrerPolicy = "no-referrer";
      img.decoding = "async";
      img.onload = () => { clearTimeout(t); res(img.naturalWidth > 20 && img.naturalHeight > 20); };
      img.onerror = () => { clearTimeout(t); res(false); };
      img.src = src;
    });
  }

  // Open Library: mehrere Bücher in einer Anfrage. Ergebnis: Map key -> {src,by} | null
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
      return null; // Netzfehler: nichts merken, später erneut versuchen
    } finally { to.done(); }
  }

  // Google Books: ein Buch je Anfrage. Ergebnis: {src,by} | null | undefined (Fehler)
  let gbBlockedUntil = 0;
  async function gbLookup(b) {
    if (Date.now() < gbBlockedUntil) return undefined;
    const to = timeoutSignal(6000);
    try {
      const r = await fetch(GB_API + b.i[0], { referrerPolicy: "no-referrer", signal: to.signal });
      if (r.status === 429 || r.status === 403) { gbBlockedUntil = Date.now() + 5 * 60e3; return undefined; }
      if (!r.ok) return undefined;
      const j = await r.json();
      const l = j.items && j.items[0] && j.items[0].volumeInfo && j.items[0].volumeInfo.imageLinks;
      const u = l && (l.thumbnail || l.smallThumbnail);
      return u ? { src: u.replace(/^http:/, "https:").replace("&edge=curl", ""), by: "coverGB" } : null;
    } catch (e) { return undefined; } finally { to.done(); }
  }

  // ---------- Vorrang (Antippen) ----------
  const inflight = new Map();
  function get(b) {
    if (!b || !b.i || !b.i.length) return Promise.resolve(null);
    const key = keyOf(b);
    const c = cached(key);
    if (c !== undefined) return Promise.resolve(c);
    if (inflight.has(key)) return inflight.get(key);
    // Open Library und Google parallel, erstes ladbares Bild gewinnt
    const p = new Promise(res => {
      let left = 2, missOk = true;
      const fin = v => {
        if (v) { res(v); return; }
        if (v === undefined) missOk = false;
        if (--left === 0) res(missOk ? null : undefined);
      };
      olLookup([b]).then(async m => {
        const h = m ? m.get(key) : undefined;
        fin(h ? (await loadImg(h.src) ? h : null) : h);
      });
      gbLookup(b).then(async g => fin(g ? (await loadImg(g.src) ? g : null) : g));
    }).then(v => { inflight.delete(key); if (v !== undefined) store(key, v); return v || null; });
    inflight.set(key, p);
    return p;
  }

  // ---------- Hintergrund (gestaffelt) ----------
  const queue = new Map();   // key -> book (in Sichtweite, noch offen)
  const gbQueue = [];        // Bücher ohne Open-Library-Treffer
  const imgQueue = [];       // aufgelöste Bild-URLs zum Vorladen
  const conn = navigator.connection || {};
  const enabled = !conn.saveData && !/(^|-)2g$/.test(conn.effectiveType || "");

  function want(b) {
    if (!enabled || !b || !b.i || !b.i.length) return;
    const key = keyOf(b);
    if (cached(key) !== undefined || inflight.has(key)) return;
    queue.set(key, b);
    kickOl();
  }
  function unwant(b) { if (b && b.i) queue.delete(keyOf(b)); }
  const paused = () => document.hidden;

  // Taktgeber, der nur läuft, solange Arbeit ansteht (statt Dauer-Intervallen, die das Gerät
  // auch ohne Arbeit mehrmals pro Sekunde wecken). Abstand zwischen zwei Starts mindestens „tick“.
  function worker(tick, hasWork, run) {
    let t = 0, busy = false, last = 0;
    const loop = async () => {
      t = 0;
      if (busy || paused() || !hasWork()) return; // versteckter Tab: weiter bei visibilitychange
      busy = true; last = Date.now();
      try { await run(); } finally { busy = false; kick(); }
    };
    const kick = () => {
      if (t || busy || !hasWork()) return;
      t = setTimeout(loop, last ? Math.max(0, tick - (Date.now() - last)) : tick);
    };
    return kick;
  }
  const kickOl = worker(BG_TICK, () => queue.size > 0, async () => {
    const batch = [...queue.values()].slice(0, BATCH);
    batch.forEach(b => queue.delete(keyOf(b)));
    const m = await olLookup(batch);
    if (m) {
      for (const b of batch) {
        const h = m.get(keyOf(b));
        if (h) imgQueue.push({ key: keyOf(b), hit: h, book: b }); else gbQueue.push(b);
      }
      kickImg(); kickGb();
    }
  });
  const kickGb = worker(GB_TICK, () => gbQueue.length > 0, async () => {
    const b = gbQueue.shift();
    const g = await gbLookup(b);
    if (g) { imgQueue.push({ key: keyOf(b), hit: g, book: b }); kickImg(); }
    else if (g === null) store(keyOf(b), null);
  });
  const kickImg = worker(IMG_TICK, () => imgQueue.length > 0, async () => {
    const { key, hit, book } = imgQueue.shift();
    if (await loadImg(hit.src)) store(key, hit);
    else if (hit.by === "coverGB") store(key, null); // auch Google-Bild defekt: kein Cover (sonst Endlosschleife)
    else { gbQueue.push(book); kickGb(); } // Open-Library-Bild defekt: Google versuchen
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { kickOl(); kickGb(); kickImg(); } });

  // ---------- Messung für die Admin-Seite ----------
  // Prüft alle Bücher mit ISBN gestaffelt. onProgress({done,total,ol,gb,none,err}); stop() bricht ab.
  function survey(books, onProgress) {
    let stopped = false;
    const list = books.filter(b => b.i && b.i.length);
    const st = { total: list.length, done: 0, ol: 0, gb: 0, none: 0, err: 0, paused: false, complete: false };
    const report = () => onProgress && onProgress(Object.assign({}, st));
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const run = (async () => {
      report();
      const misses = [];
      for (let i = 0; i < list.length && !stopped; i += 40) {
        const part = list.slice(i, i + 40);
        let m = await olLookup(part);
        if (!m) { await sleep(3000); m = await olLookup(part); }
        for (const b of part) {
          const h = m ? m.get(keyOf(b)) : undefined;
          if (h) { st.ol++; st.done++; store(keyOf(b), h); } else misses.push(b);
        }
        report();
        await sleep(600);
      }
      for (const b of misses) {
        if (stopped) break;
        while (!stopped && Date.now() < gbBlockedUntil) { st.paused = true; report(); await sleep(5000); }
        st.paused = false;
        if (stopped) break;
        const g = await gbLookup(b);
        if (g) { st.gb++; store(keyOf(b), g); } else if (g === null) { st.none++; store(keyOf(b), null); } else st.err++;
        st.done++;
        report();
        await sleep(900);
      }
      st.complete = !stopped;
      report();
      return st;
    })();
    return { done: run, stop() { stopped = true; } };
  }

  // Mehrere Bücher auf einmal (z. B. Empfehlungen): eine Sammelabfrage, danach einzeln
  async function prime(books) {
    const todo = books.filter(b => b && b.i && b.i.length && cached(keyOf(b)) === undefined && !inflight.has(keyOf(b)));
    if (todo.length > 1) {
      const m = await olLookup(todo);
      if (m) await Promise.all(todo.map(async b => { const h = m.get(keyOf(b)); if (h && await loadImg(h.src)) store(keyOf(b), h); }));
    }
    return Promise.all(books.map(get));
  }

  root.DSMCovers = { get, prime, want, unwant, survey, enabled };
})(window);
