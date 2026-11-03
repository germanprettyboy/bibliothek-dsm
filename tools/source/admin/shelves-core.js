/* Shelf analysis for tab "Regale" (pure logic for shelves.jsx, no React; also runs in Node: tests/unit/shelves.test.js).
   Input: the copies of the maintenance analysis (extract.js inspect().records { id, t, a, sn, c, l, sig, y, z }).
   WinBook only knows where a copy should stand (its location), not where it stands. So "placed wrong" here means: the
   location in WinBook does not fit the order of the shelves. Then either the book stands at an odd place, or its
   location or category in WinBook is wrong – both need a look at the shelf. Nothing here is published.

   Locations are parsed as "<section> [Regal] <shelf no.> Brett <board no.>" ("Jugendbücher 6 Brett 5",
   "Geschichte/Politik/Wirtschaft Regal 2 Brett 3", "Biografie Brett 1"); a location without a board number
   ("Schreibtisch", "Italienisch") is its own shelf with one place. Three checks, each row { r: copy, v: where it belongs }:
     placeCategory  the copy stands apart from the other copies of its category. A category's home = the boards (else
                    shelves, else sections) that hold more than T = max(2, 5 %) of its copies, if they hold ≥ 80 % of
                    them and are few (≤ 3 boards, ≤ 2 shelves or ≤ 3 sections). A copy outside the home is flagged unless
                    it belongs to a big group (> T) elsewhere on a coarser level (a second home, e.g. one category in
                    two sections). Categories with fewer than 5 copies with a location are skipped, copies of
                    placeVague are not flagged again.
     placeOrder     the copy breaks the A–Z order of a section sorted by author: sections with ≥ 3 boards and ≥ 30
                    copies whose boards, in shelf order, follow the initials of the first author's surname for ≥ 80 %
                    of the copies (longest non-decreasing run). Only the initial counts – finer orders are not
                    consistent enough on real shelves. Value: the board(s) with this initial.
     placeVague     location without a board number although the section has boards ("Italienisch" next to
                    "Italienisch 1 Brett 1"). Value: the shelves of the section.
   Inventory (stored by shelves.jsx, dsm-inventory): per board the date it was checked, the copies missing there and the
   copies found there that WinBook puts elsewhere. */

export const PLACE_CHECKS = ["placeCategory", "placeOrder", "placeVague"];

const MIN_CAT = 5; // copies of a category (with a location) needed for its home
const HOME_SHARE = 0.8;
const HOME_MAX = [3, 2, 3]; // home size per level: boards, shelves, sections
const RUN_BOARDS = 3, RUN_MIN = 30, RUN_SHARE = 0.8, RUN_LETTERS = 6; // alphabetical section
const MARKS = /[\u0300-\u036f]/g;

export const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(MARKS, "").replace(/ß/g, "ss")
  .replace(/[^a-z0-9]+/g, " ").trim();
const coll = new Intl.Collator("de", { sensitivity: "base", numeric: true });

const LOC = /^(.*?)(?:\s+(?:regal\s*)?(\d+))?(?:\s+(?:brett|boden|fach)\s*(\d+))?\s*$/i;
/* "Jugendbücher 6 Brett 5" → { base: "Jugendbücher", unit: "Jugendbücher 6", no: 6, board: 5 };
   "Schreibtisch" → { base: "Schreibtisch", unit: "Schreibtisch", no: 0, board: 0 } */
export function parseLoc(name) {
  const s = String(name || "").replace(/\s+/g, " ").trim();
  const m = LOC.exec(s);
  if (!m || !m[1]) return { base: s, unit: s, no: 0, board: 0 };
  const board = m[3] ? +m[3] : 0;
  return { base: m[1], unit: board ? s.replace(/\s+(?:brett|boden|fach)\s*\d+\s*$/i, "") : s, no: m[2] ? +m[2] : 0, board };
}

// Initial of the first author's surname (a–z or a digit; umlauts as their base letter), "" without an author
export const initial = r => (norm(r.sn || "")[0] || "");

const countBy = (list, key) => {
  const m = new Map();
  for (const x of list) { const k = key(x); m.set(k, (m.get(k) || 0) + 1); }
  return m;
};

/* Longest non-decreasing subsequence of keys (patience sorting): the set of kept indexes. Ties keep the earlier one,
   so the result is the same on every run. */
function keepRun(keys) {
  const tails = [], prev = new Array(keys.length);
  for (let i = 0; i < keys.length; i++) {
    let lo = 0, hi = tails.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (keys[tails[mid]] <= keys[i]) lo = mid + 1; else hi = mid; }
    prev[i] = lo ? tails[lo - 1] : -1;
    tails[lo] = i;
  }
  const keep = new Set();
  for (let j = tails.length ? tails[tails.length - 1] : -1; j >= 0; j = prev[j]) keep.add(j);
  return keep;
}

const range = list => (list.length === 1 ? list[0] : list[0] + " – " + list[list.length - 1]);

/* Analysis of all copies with a location. Returns
     boards: [{ loc, base, unit, no, board, recs, n, cats: [[name, n]], none, from, to, year, flagged }]
             (shelf order; from/to = first and last initial in an A–Z section, year = median year)
     units:  [{ unit, base, no, boards, n, flagged }] (shelf order)
     runs:   [{ base, n, boards, share }] sections sorted A–Z by author
     checks: [{ key, rows: [{ r, v }] }] in the order of PLACE_CHECKS
     flags:  Map(copy → [{ key, v }]) */
export function analyze(records) {
  const located = records.filter(r => r.l);
  const P = new Map(); // location → parsed
  for (const r of located) if (!P.has(r.l)) P.set(r.l, parseLoc(r.l));
  const keyOf = [r => r.l, r => norm(P.get(r.l).unit), r => norm(P.get(r.l).base)];
  const C = { placeCategory: [], placeOrder: [], placeVague: [] };
  const flags = new Map();
  const flag = (key, r, v) => {
    C[key].push({ r, v });
    (flags.get(r) || flags.set(r, []).get(r)).push({ key, v });
  };
  const nameOf = new Map(); // normalized unit/base → shown name (first seen)
  for (const p of P.values()) { if (!nameOf.has(norm(p.unit))) nameOf.set(norm(p.unit), p.unit); if (!nameOf.has(norm(p.base))) nameOf.set(norm(p.base), p.base); }
  const show = (level, k) => (level ? nameOf.get(k) : k);
  // Locations without a board in a section that has boards (placeVague; not flagged again for their category)
  const unitsOf = new Map(); // normalized section → its shelves with boards
  for (const p of P.values()) if (p.board) { const k = norm(p.base); (unitsOf.get(k) || unitsOf.set(k, new Set()).get(k)).add(p.unit); }
  const vagueOf = r => { const p = P.get(r.l); return !p.board && unitsOf.get(norm(p.base)); };

  // ---------- Category ----------
  const byCat = new Map();
  for (const r of located) if (r.c) (byCat.get(r.c) || byCat.set(r.c, []).get(r.c)).push(r);
  for (const list of byCat.values()) {
    const N = list.length;
    if (N < MIN_CAT) continue;
    const T = Math.max(2, Math.floor(N * 0.05));
    const counts = keyOf.map(k => countBy(list, k));
    for (let level = 0; level < 3; level++) {
      const home = [...counts[level]].filter(([, n]) => n > T).sort((x, y) => y[1] - x[1] || coll.compare(x[0], y[0]));
      if (!home.length || home.length > HOME_MAX[level]) continue;
      if (home.reduce((s, [, n]) => s + n, 0) < N * HOME_SHARE) continue;
      const homeKeys = new Set(home.map(([k]) => k));
      const homeMembers = list.filter(r => homeKeys.has(keyOf[level](r)));
      const coarse = [1, 2].filter(l => l > level).map(l => ({ l, keys: new Set(homeMembers.map(keyOf[l])) }));
      const v = home.map(([k]) => show(level, k)).join(" · ");
      for (const r of list) {
        if (homeKeys.has(keyOf[level](r)) || vagueOf(r)) continue;
        // a big group elsewhere (another shelf or section) is a second home, not a mistake
        if (coarse.some(({ l, keys }) => !keys.has(keyOf[l](r)) && counts[l].get(keyOf[l](r)) > T)) continue;
        flag("placeCategory", r, v);
      }
      break;
    }
  }

  // ---------- A–Z order of a section ----------
  const runs = [];
  const bySection = new Map();
  for (const r of located) {
    const p = P.get(r.l);
    if (!p.board) continue;
    const k = norm(p.base);
    (bySection.get(k) || bySection.set(k, []).get(k)).push(r);
  }
  const letters = new Map(); // location → [first, last] initial of the kept copies
  const order = r => { const p = P.get(r.l); return p.no * 10000 + p.board; };
  for (const [k, all] of bySection) {
    const list = all.filter(r => initial(r));
    const boards = new Set(list.map(r => r.l));
    if (boards.size < RUN_BOARDS || list.length < RUN_MIN || new Set(list.map(initial)).size < RUN_LETTERS) continue;
    list.sort((x, y) => order(x) - order(y) || (initial(x) < initial(y) ? -1 : initial(x) > initial(y) ? 1 : 0) || coll.compare(x.t, y.t) || x.id - y.id);
    const keep = keepRun(list.map(initial));
    if (keep.size < list.length * RUN_SHARE) continue;
    runs.push({ base: nameOf.get(k), n: list.length, boards: boards.size, share: keep.size / list.length });
    const kept = list.filter((r, i) => keep.has(i));
    for (const r of kept) {
      const f = letters.get(r.l), i = initial(r);
      if (!f) letters.set(r.l, [i, i]);
      else { if (i < f[0]) f[0] = i; if (i > f[1]) f[1] = i; }
    }
    list.forEach((r, i) => {
      if (keep.has(i)) return;
      const L = initial(r);
      const same = [...new Set(kept.filter(x => initial(x) === L).map(x => x.l))];
      let v;
      if (same.length) v = range(same);
      else { const before = kept.filter(x => initial(x) < L); v = (before.length ? before[before.length - 1] : kept[0]).l; }
      flag("placeOrder", r, L.toUpperCase() + " → " + v);
    });
  }

  // ---------- Location without a board ----------
  for (const r of located) {
    const u = vagueOf(r);
    if (u) flag("placeVague", r, [...u].sort(coll.compare).join(" · "));
  }

  // ---------- Boards and shelves ----------
  const byLoc = new Map();
  for (const r of located) (byLoc.get(r.l) || byLoc.set(r.l, []).get(r.l)).push(r);
  const boards = [...byLoc].map(([loc, recs]) => {
    const p = P.get(loc);
    const cats = [...countBy(recs.filter(r => r.c), r => r.c)].sort((x, y) => y[1] - x[1] || coll.compare(x[0], y[0]));
    const years = recs.map(r => +r.y).filter(Boolean).sort((x, y) => x - y);
    const lt = letters.get(loc);
    return {
      loc, ...p, recs, n: recs.length, cats, none: recs.filter(r => !r.c).length,
      from: lt ? lt[0].toUpperCase() : "", to: lt ? lt[1].toUpperCase() : "",
      year: years.length ? years[(years.length - 1) >> 1] : 0,
      flagged: recs.filter(r => flags.has(r)).length,
    };
  }).sort((x, y) => coll.compare(x.base, y.base) || x.no - y.no || coll.compare(x.unit, y.unit) || x.board - y.board || coll.compare(x.loc, y.loc));
  const units = [];
  for (const b of boards) {
    const last = units[units.length - 1];
    if (last && norm(last.unit) === norm(b.unit)) { last.boards.push(b); last.n += b.n; last.flagged += b.flagged; }
    else units.push({ unit: b.unit, base: b.base, no: b.no, boards: [b], n: b.n, flagged: b.flagged });
  }

  // Rows in shelf order (where the copy stands now), then title
  const pos = new Map(boards.map((b, i) => [b.loc, i]));
  const byShelf = (x, y) => pos.get(x.r.l) - pos.get(y.r.l) || coll.compare(x.r.t, y.r.t) || x.r.id - y.r.id;
  return { boards, units, runs, flags, checks: PLACE_CHECKS.map(key => ({ key, rows: C[key].sort(byShelf) })) };
}

// The maintenance analysis with the shelf analysis (ins.shelves) and its checks after the others (app.jsx, on import)
export function attach(ins) {
  const A = analyze(ins.records);
  return { ...ins, shelves: A, checks: ins.checks.concat(A.checks) };
}

// Shelf order of a board's copies: A–Z sections by author, other boards by category, then author and title
export function shelfOrder(board) {
  const az = !!board.from;
  return board.recs.slice().sort((x, y) => (az ? 0 : coll.compare(x.c || "￿", y.c || "￿"))
    || coll.compare(norm(x.sn), norm(y.sn)) || coll.compare(x.t, y.t) || x.id - y.id);
}

/* Inventory: inv = { boards: { [location]: { d?: "YYYY-MM-DD", miss: [ids], here: [ids] } } } (shelves.jsx). Unknown
   numbers (no longer in WinBook) and entries of locations that no longer exist are left out. records: every copy (a
   book found on a board may have no location in WinBook). Returns
     done: checked boards, total: boards, missing: [{ r }], here: [{ r, v: found at }] (shelf order) */
export function inventory(A, inv, records) {
  const byId = new Map();
  for (const r of records || A.boards.reduce((a, b) => a.concat(b.recs), [])) byId.set(String(r.id), r);
  const pos = new Map(A.boards.map((b, i) => [b.loc, i]));
  const missing = [], here = [];
  let done = 0;
  for (const b of A.boards) {
    const e = inv && inv.boards && inv.boards[b.loc];
    if (!e) continue;
    if (e.d) done++;
    for (const id of e.miss || []) { const r = byId.get(String(id)); if (r && r.l === b.loc) missing.push({ r }); }
    for (const id of e.here || []) { const r = byId.get(String(id)); if (r && r.l !== b.loc) here.push({ r, v: b.loc }); }
  }
  const at = x => pos.get(x.v || x.r.l);
  const sort = (x, y) => at(x) - at(y) || coll.compare(x.r.t, y.r.t) || x.r.id - y.r.id;
  return { done, total: A.boards.length, missing: missing.sort(sort), here: here.sort(sort) };
}
