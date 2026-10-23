/* Automatic corrections of the public list (pure logic for fixes.jsx, no React; also runs in Node).
   Only deterministic normalizations of the list built from WinBIAP (books.js entries { t, s?, a?, p?, y?, i?, c?, l? }).
   The input list is never changed: a changed book is a new object, an unchanged one keeps its reference.
   WinBIAP itself is never written. Not done on purpose: titles in capitals (not consistent in German), ISBN completion,
   merging different books, anything that needs a guess. Steps run in this order, each on the result of the steps before:
     chars      NFC (letters with accents stored as two characters) and invisible characters (soft hyphen, zero width)
     punct      separators left over from library cataloguing (ISBD): "Rowohlt,", "Flix,", "= Parallel title", "Titel , Teil"
     subtitle   subtitle equal to the title (apart from case/punctuation) or without any letter or digit
     category, location, publisher, author
                spelling variants that differ only in case, accents, ß/ss (and, except for authors, spaces): one spelling
                per group. Canonical = known Italian name (categories) > proper case > more accents > more frequent; a group
                where the best two tie on all of these is left alone (not unambiguous). */

export const STEPS = ["chars", "punct", "subtitle", "category", "location", "publisher", "author"];

const TEXT = ["t", "s", "p", "c", "a", "l"];
const INVISIBLE = /[­​-‍⁠﻿]/g;
const MARKS = /[̀-ͯ]/g;
const ALNUM = /[\p{L}\p{N}]/u;
const coll = new Intl.Collator("de", { sensitivity: "variant", numeric: true });

// Same key as the list's merge key in extract.js (title + first author): lower case, no accents, ß → ss, a–z0–9
export const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(MARKS, "").replace(/ß/g, "ss")
  .replace(/[^a-z0-9]+/g, " ").trim();
const fold = s => s.toLowerCase().normalize("NFD").replace(MARKS, "").replace(/ß/g, "ss");
const KEYS = {
  author: s => fold(s).replace(/\s+/g, " ").trim(),
  other: s => fold(s).replace(/\s+/g, ""),
};

// ---------- single values ----------
function chars(s) {
  const r = s.normalize("NFC").replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
  return r && ALNUM.test(r) ? r : s;
}
// Trailing separators of names (publisher, author, category, location); a period stays ("Ulf K.", "etc.")
function tail(s) {
  const r = s.replace(/\s*[,;:/]+$/, "");
  return ALNUM.test(r) ? r : s;
}
// Title and subtitle: separators at the start/end, a space before a comma
function title(s) {
  const r = s.replace(/^[,;:/=]+\s*/, "").replace(/\s*[,;:/=]+$/, "").replace(/ +,(?= )/g, ",");
  return ALNUM.test(r) ? r : s;
}

// ---------- books ----------
// Applies f to the string fields fs of b (arrays element by element, duplicates removed); note(from, to) per change
function mapFields(b, fs, f, note) {
  let out = b;
  for (const k of fs) {
    const v = b[k];
    if (v == null) continue;
    if (Array.isArray(v)) {
      const nv = [];
      let diff = false;
      for (const x of v) {
        const y = f(x, k);
        if (y !== x) { diff = true; if (note) note(x, y); }
        if (!nv.includes(y)) nv.push(y);
      }
      if (diff || nv.length !== v.length) { if (out === b) out = { ...b }; out[k] = nv; }
    } else {
      const y = f(v, k);
      if (y !== v) { if (note) note(v, y); if (out === b) out = { ...b }; out[k] = y; }
    }
  }
  return out;
}

const letters = s => s.replace(/[^\p{L}]/gu, "");
function caseScore(s) {
  const l = letters(s);
  if (!l) return 0;
  const first = l[0] !== l[0].toLowerCase() ? 1 : 0;
  const caps = l.length >= 2 && l === l.toUpperCase() && l !== l.toLowerCase();
  return first + (caps ? 0 : 1);
}
const accents = s => (s.normalize("NFD").match(MARKS) || []).length + (s.match(/ß/g) || []).length;

// Spelling map { variant → canonical } over the values values(b) of all books
function spellings(books, values, key, known) {
  const groups = new Map(), keys = new Map();
  for (const b of books) {
    for (const v of values(b)) {
      let k = keys.get(v);
      if (k === undefined) keys.set(v, (k = key(v)));
      if (!k) continue;
      const g = groups.get(k) || groups.set(k, new Map()).get(k);
      g.set(v, (g.get(v) || 0) + 1);
    }
  }
  const map = new Map();
  for (const g of groups.values()) {
    if (g.size < 2) continue;
    const ranked = [...g].map(([v, n]) => ({ v, s: [known && known.has(v) ? 1 : 0, caseScore(v), accents(v), n] }))
      .sort((x, y) => { for (let i = 0; i < 4; i++) if (x.s[i] !== y.s[i]) return y.s[i] - x.s[i]; return coll.compare(x.v, y.v); });
    if (ranked[0].s.every((x, i) => x === ranked[1].s[i])) continue; // not unambiguous
    for (const { v } of ranked.slice(1)) map.set(v, ranked[0].v);
  }
  return map;
}
const vals = f => b => (b[f] == null ? [] : Array.isArray(b[f]) ? b[f] : [b[f]]);
const SPELL = { category: ["c", KEYS.other], location: ["l", KEYS.other], publisher: ["p", KEYS.other], author: ["a", KEYS.author] };

// Step key → function (b, note) → b' for the list books (spelling steps need the whole list)
function stepFn(key, books, known) {
  if (key === "chars") return (b, note) => mapFields(b, TEXT, chars, note);
  if (key === "punct") return (b, note) => mapFields(b, TEXT, (s, k) => (k === "t" || k === "s" ? title(s) : tail(s)), note);
  if (key === "subtitle") {
    return (b, note) => {
      if (!b.s || (ALNUM.test(b.s) && norm(b.s) !== norm(b.t))) return b;
      if (note) note(b.t + " · " + b.s, b.t);
      const out = { ...b };
      delete out.s;
      return out;
    };
  }
  const [f, k] = SPELL[key];
  const map = spellings(books, vals(f), k, key === "category" ? known : null);
  if (!map.size) return () => null; // nothing to do (null = "no change", see plan)
  return (b, note) => mapFields(b, [f], v => map.get(v) || v, note);
}

/* Analysis: every step on the result of the selected steps before it.
   on(key) → selected?; known = Set of category names with an Italian name (preferred spelling).
   Returns { rows: [{ key, count, pairs: [[from, to, n]] }], fns: { key: b → b' } (selected steps with changes),
   books: the corrected list, changed: books changed by the selected steps }. */
export function plan(books, on, known) {
  let list = books;
  const rows = [], fns = {};
  for (const key of STEPS) {
    const fn = stepFn(key, list, known);
    const pairs = new Map();
    const note = (from, to) => { const k = from + "\u0000" + to; const p = pairs.get(k); if (p) p[2]++; else pairs.set(k, [from, to, 1]); };
    let count = 0;
    const next = list.map(b => {
      const r = fn(b, note);
      if (r && r !== b) { count++; return r; }
      return b;
    });
    rows.push({ key, count, pairs: [...pairs.values()].sort((x, y) => y[2] - x[2] || coll.compare(x[0], y[0])) });
    if (count && on(key)) { fns[key] = b => fn(b) || b; list = next; }
  }
  let changed = 0;
  for (let i = 0; i < books.length; i++) if (list[i] !== books[i]) changed++;
  return { rows, fns, books: list, changed };
}

// Applies the step functions (in STEPS order) to books[from..to) and writes the result to out
export function apply(books, fns, from, to, out) {
  const order = STEPS.filter(k => fns[k]);
  for (let i = from; i < to; i++) {
    let b = books[i];
    for (const k of order) b = fns[k](b);
    out[i] = b;
  }
  return out;
}
