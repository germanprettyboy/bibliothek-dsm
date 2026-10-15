/*
 * covers.js – Cover über die ISBN laden (nur vorhandene ISBN, keine Ergänzung).
 *
 * 1. Cover-Index (cover-index.js, window.DSM_COVER, erzeugt mit werkzeuge/cover-index.js oder admin.html):
 *    je ISBN die schon ermittelte Quelle. Das Bild wird direkt geladen, ohne Abfrage vorab.
 * 2. Live für Bücher, die noch nicht im Index stehen:
 *    - Deutsche Nationalbibliothek (MVB-Cover der Verlage): Bild direkt über die ISBN, 404 = keins.
 *    - Open Library, Sammelabfrage über /search.json (bis zu 30 ISBN je Anfrage) → Cover-ID der Ausgabe.
 *      Bilder über die ID sind nicht ratenbegrenzt (Abrufe über /b/isbn/ wären auf 100 je 5 Minuten
 *      und IP begrenzt – im Schulnetz teilen sich alle eine IP).
 *    - Google Books, Bild direkt über die ISBN (ohne API, die ohne Schlüssel kein Kontingent hat).
 *      Ohne Cover liefert Google ein Ersatzbild 128×184, das wird verworfen.
 * Reihenfolge bei mehreren Treffern: DNB (schnell, 200 px) > Open Library (180 px) > Google (128 px).
 *
 * Betrieb
 *  - get(book): sofort, mit Vorrang (beim Antippen).
 *  - want(book) / unwant(book): Hintergrund für Bücher in Sichtweite, gestaffelt, pausiert bei
 *    verstecktem Tab und bei „Datensparen“. Geladene Bilder bleiben als Element im Speicher (img()).
 *  - Live-Ergebnisse (auch „kein Cover“) werden im Browser gemerkt.
 */
(function (root) {
  "use strict";

  const OL_SEARCH = "https://openlibrary.org/search.json?fields=key,cover_i,editions,editions.isbn,editions.cover_i&limit=100&q=";
  const SRC = {
    ol: id => "https://covers.openlibrary.org/b/id/" + id + "-M.jpg",
    dnb: i => "https://portal.dnb.de/opac/mvb/cover?isbn=" + i + "&size=m",
    gb: i => "https://books.google.com/books/content?vid=ISBN" + i + "&printsec=frontcover&img=1&zoom=1"
  };
  const BY = { ol: "coverOL", dnb: "coverDNB", gb: "coverGB" };
  const BATCH = 30;            // ISBN je Open-Library-Abfrage
  const BG_TICK = 1200;        // ms zwischen Hintergrund-Abfragen an Open Library
  const PROBE_TICK = 300;      // ms zwischen Bildproben (DNB/Google) im Hintergrund
  const IMG_TICK = 250;        // ms zwischen vorgeladenen Bildern
  const POOL = 40;             // vorgeladene Bildelemente im Speicher
  const CACHE_KEY = "dsm-cover-v3", HIT_TTL = 60 * 864e5, MISS_TTL = 14 * 864e5, MAX_ENTRIES = 3000;

  // ---------- Cache (nur Live-Ergebnisse) ----------
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {}; localStorage.removeItem("dsm-cover-v2"); } catch (e) { cache = {}; }
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

  // ---------- Index ----------
  // Werte: Zahl = Open-Library-Cover-ID, "d" = DNB, "g" = Google (jeweils mit dieser ISBN), 0 = geprüft, keins.
  function decode(v, i) {
    if (typeof v === "number") return v > 0 ? { src: SRC.ol(v), by: BY.ol } : null;
    if (v === "d") return { src: SRC.dnb(i), by: BY.dnb };
    if (v === "g") return { src: SRC.gb(i), by: BY.gb };
    return null;
  }
  // {src,by} | null (geprüft, keins) | undefined (nicht im Index)
  function indexed(b) {
    const X = root.DSM_COVER && root.DSM_COVER.c;
    if (!X) return undefined;
    let seen = false;
    for (const i of b.i) {
      if (!(i in X)) continue;
      seen = true;
      const h = decode(X[i], i);
      if (h) return h;
    }
    return seen ? null : undefined;
  }
  const known = b => { const x = indexed(b); return x !== undefined ? x : cached(keyOf(b)); };

  // ---------- Bilder ----------
  const pool = new Map(); // src -> geladenes <img>
  function keep(src, img) {
    pool.delete(src); pool.set(src, img);
    if (pool.size > POOL) pool.delete(pool.keys().next().value);
  }
  // Google-Ersatzbild „kein Bild verfügbar“ und Ein-Pixel-Bilder verwerfen
  const real = img => img.naturalWidth > 20 && img.naturalHeight > 20 && !(img.naturalWidth === 128 && img.naturalHeight === 184 && /books\.google/.test(img.src));
  function loadImg(src, ms) {
    const p = pool.get(src);
    if (p) return Promise.resolve(true);
    return new Promise(res => {
      const img = new Image();
      const t = setTimeout(() => { img.src = ""; res(false); }, ms || 8000);
      img.referrerPolicy = "no-referrer";
      img.decoding = "async";
      img.onload = () => { clearTimeout(t); const ok = real(img); if (ok) keep(src, img); res(ok); };
      img.onerror = () => { clearTimeout(t); res(false); };
      img.src = src;
    });
  }
  // Fertig geladenes Bildelement (aus dem Speicher, sonst neu) – nicht doppelt im Dokument verwenden
  function img(found) {
    const p = pool.get(found.src);
    if (p && !p.isConnected) return p;
    const n = new Image();
    n.referrerPolicy = "no-referrer"; n.decoding = "async"; n.src = found.src;
    return n;
  }
  // Erste ladbare Quelle aus einer Liste von {src,by}, nacheinander
  async function firstImg(cands) {
    for (const c of cands) if (await loadImg(c.src)) return c;
    return null;
  }
  const probes = b => b.i.map(i => ({ src: SRC.dnb(i), by: BY.dnb }));
  const gbProbes = b => b.i.map(i => ({ src: SRC.gb(i), by: BY.gb }));

  // ---------- Open Library ----------
  function timeoutSignal(ms) {
    if (!("AbortController" in root)) return { signal: undefined, done() {} };
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
    return { signal: c.signal, done() { clearTimeout(t); } };
  }
  // Mehrere Bücher in einer Anfrage. Ergebnis: Map key -> {src,by} | null; null bei Netzfehler.
  async function olLookup(books) {
    const isbns = [...new Set(books.flatMap(b => b.i))];
    const to = timeoutSignal(10000);
    try {
      const r = await fetch(OL_SEARCH + encodeURIComponent("isbn:(" + isbns.join(" OR ") + ")"), { referrerPolicy: "no-referrer", signal: to.signal });
      if (!r.ok) throw new Error("ol " + r.status);
      const j = await r.json();
      const ed = new Map();
      for (const d of j.docs || []) for (const e of (d.editions && d.editions.docs) || [])
        if (e.cover_i > 0) for (const i of e.isbn || []) if (!ed.has(i)) ed.set(i, e.cover_i);
      return new Map(books.map(b => {
        const id = b.i.map(i => ed.get(i)).find(Boolean);
        return [keyOf(b), id ? { src: SRC.ol(id), by: BY.ol, id } : null];
      }));
    } catch (e) {
      return null; // Netzfehler: nichts merken, später erneut versuchen
    } finally { to.done(); }
  }

  // ---------- Vorrang (Antippen) ----------
  const inflight = new Map();
  // olHit: optional Promise auf das Open-Library-Ergebnis aus einer Sammelabfrage
  function get(b, olHit) {
    if (!b || !b.i || !b.i.length) return Promise.resolve(null);
    const key = keyOf(b);
    if (inflight.has(key)) return inflight.get(key);
    const k = known(b);
    if (k === null) return Promise.resolve(null);
    // Bekannte Quelle: Bild laden; nur wenn es nicht mehr ladbar ist, live neu suchen
    const p = (k ? loadImg(k.src).then(ok => ok ? k : live(b)) : live(b, olHit))
      .then(v => { inflight.delete(key); return v || null; });
    inflight.set(key, p);
    return p;
  }
  // DNB und Open Library parallel; DNB gewinnt, sobald klar ist, dass es eins hat. Dann Google.
  function live(b, olHit) {
    const key = keyOf(b);
    const dnb = firstImg(probes(b));
    const ol = (olHit || olLookup([b]).then(m => m && m.get(key))).then(async h => {
      if (h === undefined) return undefined;
      return h && await loadImg(h.src) ? h : null;
    });
    return dnb.then(async d => {
      if (d) return d;
      const o = await ol;
      if (o) return o;
      const g = await firstImg(gbProbes(b));
      return g || (o === undefined ? undefined : null);
    }).then(v => { if (v !== undefined) store(key, v); return v; });
  }

  // ---------- Hintergrund (gestaffelt) ----------
  const queue = new Map();   // key -> Buch ohne bekannte Quelle (in Sichtweite)
  const probeQueue = [];     // Bücher ohne Open-Library-Treffer: DNB, dann Google
  const imgQueue = [];       // bekannte Quellen zum Vorladen
  const conn = navigator.connection || {};
  const enabled = !conn.saveData && !/(^|-)2g$/.test(conn.effectiveType || "");
  let olBusy = false, probeBusy = false, imgBusy = false;

  function want(b) {
    if (!enabled || !b || !b.i || !b.i.length) return;
    const key = keyOf(b);
    if (inflight.has(key)) return;
    const k = known(b);
    if (k) { if (!pool.has(k.src)) imgQueue.push({ key, hit: k, book: b }); }
    else if (k === undefined) queue.set(key, b);
  }
  function unwant(b) {
    if (!b || !b.i) return;
    const key = keyOf(b);
    queue.delete(key);
    for (let n = imgQueue.length - 1; n >= 0; n--) if (imgQueue[n].key === key) imgQueue.splice(n, 1);
  }
  const paused = () => document.hidden;

  setInterval(async () => {
    if (olBusy || paused() || !queue.size) return;
    olBusy = true;
    const batch = [];
    let n = 0;
    for (const b of queue.values()) { if (n + b.i.length > BATCH) break; batch.push(b); n += b.i.length; }
    batch.forEach(b => queue.delete(keyOf(b)));
    const m = await olLookup(batch);
    if (m) for (const b of batch) {
      const h = m.get(keyOf(b));
      // DNB zuerst prüfen (schneller und größer), Open Library als Rückfall merken
      probeQueue.push({ book: b, steps: probes(b).concat(h ? [h] : [], gbProbes(b)) });
    }
    olBusy = false;
  }, BG_TICK);

  setInterval(async () => {
    if (probeBusy || paused() || !probeQueue.length) return;
    probeBusy = true;
    const job = probeQueue.shift(), key = keyOf(job.book);
    const c = job.steps.shift();
    if (await loadImg(c.src)) store(key, c);
    else if (job.steps.length) probeQueue.unshift(job);
    else store(key, null);
    probeBusy = false;
  }, PROBE_TICK);

  setInterval(async () => {
    if (imgBusy || paused() || !imgQueue.length) return;
    imgBusy = true;
    const { book, hit } = imgQueue.shift();
    if (!await loadImg(hit.src)) queue.set(keyOf(book), book); // Bild weg: live neu suchen
    imgBusy = false;
  }, IMG_TICK);

  // ---------- Messung für die Admin-Seite ----------
  // Prüft alle Bücher mit ISBN live (ohne Index und Cache). onProgress({done,total,dnb,ol,gb,none,err});
  // stop() bricht ab. index() liefert danach die Daten für cover-index.js.
  function survey(books, onProgress) {
    let stopped = false;
    const list = books.filter(b => b.i && b.i.length);
    const st = { total: list.length, done: 0, dnb: 0, ol: 0, gb: 0, none: 0, err: 0, complete: false };
    const out = {}; // ISBN -> Indexwert
    const report = () => onProgress && onProgress(Object.assign({}, st));
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const hit = (b, v) => {
      if (v.by === BY.ol) out[b.i[0]] = v.id;
      else out[v.src.match(/(\d{13})/)[1]] = v.by === BY.dnb ? "d" : "g";
      st[v.by === BY.ol ? "ol" : v.by === BY.dnb ? "dnb" : "gb"]++;
    };
    const run = (async () => {
      report();
      // 1. Open Library in Sammelabfragen
      const olHit = new Map();
      for (let i = 0; i < list.length && !stopped;) {
        const part = [];
        for (let n = 0; i < list.length && n + list[i].i.length <= BATCH; i++) { part.push(list[i]); n += list[i].i.length; }
        if (!part.length) part.push(list[i++]);
        let m = await olLookup(part);
        if (!m) { await sleep(3000); m = await olLookup(part); }
        for (const b of part) olHit.set(keyOf(b), m ? m.get(keyOf(b)) : undefined);
        await sleep(300);
      }
      // 2. je Buch: DNB, sonst Open Library, sonst Google – vier Bücher gleichzeitig
      let next = 0;
      const worker = async () => {
        while (!stopped && next < list.length) {
          const b = list[next++];
          const o = olHit.get(keyOf(b));
          const v = await firstImg(probes(b)) || (o ? o : null) || await firstImg(gbProbes(b));
          if (v) hit(b, v);
          else if (o === undefined) st.err++;
          else { st.none++; out[b.i[0]] = 0; }
          st.done++;
          if (st.done % 10 === 0) report();
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      st.complete = !stopped;
      report();
      return st;
    })();
    return { done: run, stop() { stopped = true; }, index: () => Object.assign({}, out) };
  }

  // Mehrere Bücher auf einmal (z. B. Empfehlungen): eine Open-Library-Sammelabfrage für die unbekannten
  function prime(books) {
    const todo = books.filter(b => b && b.i && b.i.length && known(b) === undefined && !inflight.has(keyOf(b)));
    const m = todo.length > 1 ? olLookup(todo.slice(0, BATCH)) : null;
    return Promise.all(books.map(b => get(b, m && todo.includes(b) ? m.then(x => x ? x.get(keyOf(b)) : undefined) : undefined)));
  }

  root.DSMCovers = { get, prime, want, unwant, survey, img, enabled };
})(window);
