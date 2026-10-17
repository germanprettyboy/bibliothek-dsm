/*
 * covers.js – Cover über die ISBN laden (nur vorhandene ISBN, keine Ergänzung).
 *
 * Quellen, in dieser Reihenfolge
 *  1. ekz-Bibliotheksservice: Bild direkt über die ISBN (cover.ekz.de/<ISBN>.jpg), 404 = keins.
 *     Statt 404 kommt oft (Bestand 17.10.2026: 376 von 2625) ein Ersatzbild „leider kein aktuelles
 *     Bild vorhanden“ (170×270, immer dieselben 9977 Byte). Bilder in dieser Größe werden deshalb
 *     ein zweites Mal als Daten geholt (ekz erlaubt CORS) und byte-genau verglichen – echte Cover
 *     gleicher Größe bleiben. Lässt sich das nicht prüfen, gilt das Bild als Ersatzbild.
 *     Trifft beim Bestand rund 2 von 3 Büchern, ohne Abfrage vorab. (Die Deutsche Nationalbibliothek
 *     scheidet aus: portal.dnb.de steht hinter einem Bot-Schutz, Browser bekommen dort HTML statt Bild.)
 *  2. Open Library, Sammelabfrage über /api/books (bis zu 20 Bücher je Anfrage) → Bild über die
 *     Cover-ID. Bilder über die ID sind nicht ratenbegrenzt (Abrufe direkt über die ISBN wären auf
 *     100 je 5 Minuten und IP begrenzt – im Schulnetz teilen sich alle eine IP).
 *  3. Google Books, Bild direkt über die ISBN. Die Google-API wird nicht benutzt: ohne Schlüssel
 *     ist ihr gemeinsames Tageskontingent erschöpft (immer 429). Ohne Cover liefert Google eins von
 *     zwei Ersatzbildern: 128×184 (Buch-Umriss) oder 128×170 („image not available“), beide werden
 *     verworfen. Google erlaubt kein CORS, Bytes vergleichen geht nicht – Maße reichen: im Bestand
 *     (17.10.2026) 444 Ersatzbilder, nur 6 echte Cover in diesen Größen.
 * Auflösung: ekz 170–440 px (fest), Open Library „M“ ca. 180 px, Google ca. 128 px breit.
 *
 * Betrieb
 *  - get(book): sofort, mit Vorrang (beim Antippen). ekz und Open Library parallel.
 *  - want(book) / unwant(book): Hintergrund für Bücher in Sichtweite, gestaffelt; Open Library nur
 *    für Bücher ohne ekz-Cover. Pausiert bei verstecktem Tab und bei „Datensparen“.
 *  - Geladene Bilder bleiben als Element im Speicher (img()): ein neues
 *    <img> mit derselben Adresse würde das Bild ohne Cache-Kopfzeilen sonst ein zweites Mal laden.
 *  - Ergebnisse (auch „kein Cover“) werden im Browser gemerkt.
 */
(function (root) {
  "use strict";
  const log = root.DSM_LOG || function () {}; // assets/protokoll.js

  const OL_API = "https://openlibrary.org/api/books?format=json&jscmd=viewapi&bibkeys=";
  const SRC = {
    ekz: i => "https://cover.ekz.de/" + i + ".jpg",
    gb: i => "https://books.google.com/books/content?vid=ISBN" + i + "&printsec=frontcover&img=1&zoom=1"
  };
  const BATCH = 20;            // Bücher je Open-Library-Abfrage
  const PROBE_TICK = 300;      // ms zwischen ekz-Bildproben im Hintergrund
  const BG_TICK = 1500;        // ms zwischen Hintergrund-Abfragen an Open Library
  const TAIL_TICK = 600;       // ms zwischen Bildproben nach Open Library (Open-Library-Bild, Google-Bild)
  const IMG_TICK = 350;        // ms zwischen vorgeladenen Bildern aus dem Cache
  const POOL = 40;             // geladene Bildelemente im Speicher
  const EKZ_ERSATZ = { w: 170, h: 270, bytes: 9977, fnv: 0x6b29ba0d }; // ekz „leider kein aktuelles Bild vorhanden“
  const CACHE_KEY = "dsm-cover-v3", HIT_TTL = 60 * 864e5, MISS_TTL = 14 * 864e5, MAX_ENTRIES = 3000;

  // ---------- Cache ----------
  // v2 stammt aus der Zeit ohne ekz (viele falsche „kein Cover“) und wird verworfen
  let cache = {};
  try { localStorage.removeItem("dsm-cover-v2"); } catch (e) { /* gesperrt */ }
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

  // ---------- Bilder ----------
  const pool = new Map(); // src -> geladenes <img>
  function keep(src, img) {
    pool.delete(src); pool.set(src, img);
    if (pool.size > POOL) pool.delete(pool.keys().next().value);
  }
  // Google-Ersatzbilder (Buch-Umriss 128×184, „image not available“ 128×170) und Ein-Pixel-Bilder verwerfen
  const real = (img, src) => img.naturalWidth > 20 && img.naturalHeight > 20 &&
    !(img.naturalWidth === 128 && (img.naturalHeight === 184 || img.naturalHeight === 170) && src.includes("books.google"));
  // ekz-Ersatzbild: nur Bilder in seiner Größe als Daten nachladen und vergleichen. src -> Promise<bool>
  const ersatz = new Map();
  function ekzErsatz(img, src) {
    if (!src.startsWith("https://cover.ekz.de/") || img.naturalWidth !== EKZ_ERSATZ.w || img.naturalHeight !== EKZ_ERSATZ.h) return Promise.resolve(false);
    if (ersatz.has(src)) return ersatz.get(src);
    const to = timeoutSignal(8000);
    const p = fetch(src, { referrerPolicy: "no-referrer", signal: to.signal })
      .then(r => { if (!r.ok) throw new Error("ekz " + r.status); return r.arrayBuffer(); })
      .then(buf => {
        const b = new Uint8Array(buf);
        if (b.length !== EKZ_ERSATZ.bytes) return false;
        let h = 0x811c9dc5;
        for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
        return h === EKZ_ERSATZ.fnv;
      })
      .catch(() => { ersatz.delete(src); return true; }) // nicht prüfbar: lieber Platzhalter als Ersatzbild
      .finally(() => to.done());
    ersatz.set(src, p);
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
        const ok = real(img, src) && !await ekzErsatz(img, src);
        if (ok) keep(src, img);
        res(ok);
      };
      img.onerror = () => { clearTimeout(t); res(false); };
      img.src = src;
    });
  }
  // Fertig geladenes Bildelement (aus dem Speicher, sonst neu); jedes Element nur einmal im Dokument
  function img(found) {
    const p = pool.get(found.src);
    if (p && !p.isConnected) { pool.delete(found.src); return p; }
    const n = new Image();
    n.referrerPolicy = "no-referrer"; n.decoding = "async"; n.src = found.src;
    return n;
  }
  // Erste ladbare Quelle aus einer Liste von {src,by}, nacheinander
  async function firstImg(cands) {
    for (const c of cands) if (await loadImg(c.src)) return c;
    return null;
  }
  const ekzCands = b => b.i.map(i => ({ src: SRC.ekz(i), by: "coverEKZ" }));
  const gbCands = b => b.i.map(i => ({ src: SRC.gb(i), by: "coverGB" }));

  // Open Library: mehrere Bücher in einer Anfrage. Ergebnis: Map key -> {src,by} | null; null bei Netzfehler.
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

  // ---------- Vorrang (Antippen) ----------
  const inflight = new Map();
  // olHit: optional Promise auf das Open-Library-Ergebnis aus einer Sammelabfrage (prime)
  function get(b, olHit) {
    if (!b || !b.i || !b.i.length) return Promise.resolve(null);
    const key = keyOf(b);
    if (inflight.has(key)) return inflight.get(key);
    const c = cached(key);
    if (c === null) return Promise.resolve(null);
    // Bekannte Quelle: Bild laden; nur wenn es nicht mehr ladbar ist, neu suchen
    const p = (c ? loadImg(c.src).then(ok => ok ? c : live(b)) : live(b, olHit))
      .then(v => { inflight.delete(key); return v || null; });
    inflight.set(key, p);
    return p;
  }
  // ekz und Open Library parallel; ekz gewinnt, sobald klar ist, dass es eins hat. Dann Google.
  function live(b, olHit) {
    const key = keyOf(b);
    const ekz = firstImg(ekzCands(b));
    const ol = (olHit || olLookup([b]).then(m => m ? m.get(key) : undefined)).then(async h => {
      if (h === undefined) return undefined; // Netzfehler
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

  // ---------- Hintergrund (gestaffelt) ----------
  const queue = new Map();   // key -> Buch in Sichtweite, noch offen: ekz probieren
  const olQueue = new Map(); // ohne ekz-Cover: Open Library
  const tail = [];           // {key, steps:[{src,by}]}: Open-Library-Bild, dann Google-Bild
  const imgQueue = [];       // bekannte Quellen (Cache) zum Vorladen
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

  // Taktgeber, der nur läuft, solange Arbeit ansteht (statt Dauer-Intervallen, die das Gerät
  // auch ohne Arbeit mehrmals pro Sekunde wecken). Pause von „tick“ ms vor jedem Schritt.
  function worker(tick, hasWork, run) {
    let t = 0, busy = false;
    const loop = async () => {
      t = 0;
      if (busy || !hasWork()) return;
      if (paused()) { kick(); return; } // versteckter Tab: nur warten (Browser drosselt Timer dort ohnehin)
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
    if (!m) return; // Netzfehler: nichts merken, beim nächsten Erscheinen erneut
    let hits = 0;
    for (const b of batch) {
      const h = m.get(keyOf(b));
      if (h) hits++;
      tail.push({ key: keyOf(b), steps: (h ? [h] : []).concat(gbCands(b)) });
    }
    log("Cover", `Hintergrund: ${batch.length} Bücher ohne ekz-Cover bei Open Library abgefragt, ${hits} mit Cover`);
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
    if (!await loadImg(hit.src)) { delete cache[key]; queue.set(key, book); kickEkz(); } // Bild weg: neu suchen
  });

  // ---------- Messung für die Admin-Seite ----------
  // Prüft alle Bücher mit ISBN (ohne Cache), vier gleichzeitig. onProgress({done,total,ekz,ol,gb,none,err});
  // stop() bricht ab. Ergebnisse landen im Cache.
  function survey(books, onProgress) {
    let stopped = false;
    const list = books.filter(b => b.i && b.i.length);
    const st = { total: list.length, done: 0, ekz: 0, ol: 0, gb: 0, none: 0, err: 0, complete: false };
    const report = () => onProgress && onProgress(Object.assign({}, st));
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const COUNT = { coverEKZ: "ekz", coverOL: "ol", coverGB: "gb" };
    const run = (async () => {
      report();
      // 1. ekz je Buch; Fehltreffer sammeln
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
      // 2. Fehltreffer: Open Library in Sammelabfragen, sonst Google-Bild
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

  // Mehrere Bücher auf einmal (z. B. Empfehlungen): eine Open-Library-Sammelabfrage für die unbekannten
  function prime(books) {
    const todo = books.filter(b => b && b.i && b.i.length && cached(keyOf(b)) === undefined && !inflight.has(keyOf(b))).slice(0, BATCH);
    const m = todo.length > 1 ? olLookup(todo) : null;
    return Promise.all(books.map(b => get(b, m && todo.includes(b) ? m.then(x => x ? x.get(keyOf(b)) : undefined) : undefined)));
  }

  root.DSMCovers = { get, prime, want, unwant, survey, img, enabled };
})(window);
