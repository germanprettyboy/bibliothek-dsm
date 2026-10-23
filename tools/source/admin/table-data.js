/* Data of the table viewer (table-view.jsx): the rows of both datasets with the maintenance lists they appear in, the
   columns, search, filters, sorting and the CSV of the current view. Admin page only – nothing here is published. */
import { log } from "@/lib/storage";

// Search like the other admin searches: lower case, no accents, ß = ss, only letters and digits
export const normE = s => String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();
export const coll = new Intl.Collator("de", { sensitivity: "base", numeric: true });
const keyOf = (t, a) => normE(t) + "|" + normE(a);
const firstAuthor = a => String(a || "").split(", ")[0];

// Lists that point at single copies, by group (master data lists – spellings, unused entries – point at entries, not rows)
export const LISTS = [
  ["isbn", ["isbnBad", "isbnShared", "isbnNone", "coverNone"]],
  ["title", ["titleNone", "titleSpaces", "titleCaps", "yearOdd", "yearNone", "authorNone", "categoryNone", "locationNone"]],
  ["copies", ["copiesCategory", "copiesLocation"]],
  ["names", ["nameHits"]],
];
export const GROUP = {};
LISTS.forEach(([g, keys]) => keys.forEach(k => { GROUP[k] = g; }));

/* Columns per dataset: id, label key, grid width, numeric (sort + tabular figures), shown from which width (px; 0 = always,
   Infinity = only on demand), never hidden (title). */
export const COLUMNS = {
  records: [
    { id: "id", label: "cId", w: "4.5rem", num: true, from: 0 },
    { id: "t", label: "cTitle", w: "minmax(0, 3fr)", fixed: true },
    { id: "a", label: "cAuthor", w: "minmax(0, 2fr)", from: 0 },
    { id: "p", label: "cPublisher", w: "minmax(0, 1.4fr)", from: 1100 },
    { id: "y", label: "cYear", w: "4rem", num: true, from: 800 },
    { id: "c", label: "cCategory", w: "minmax(0, 1.4fr)", from: 900 },
    { id: "l", label: "cLocation", w: "minmax(0, 1.6fr)", from: 0 },
    { id: "sig", label: "cSig", w: "minmax(0, 1fr)", from: 1250 },
    { id: "z", label: "cAdded", w: "6.5rem", num: true, from: 1150 },
    { id: "probs", label: "tvC_probs", w: "minmax(0, 2fr)", from: 0 },
  ],
  books: [
    { id: "t", label: "cTitle", w: "minmax(0, 3fr)", fixed: true },
    { id: "a", label: "tvC_authors", w: "minmax(0, 2fr)", from: 0 },
    { id: "p", label: "cPublisher", w: "minmax(0, 1.4fr)", from: 1100 },
    { id: "y", label: "cYear", w: "4rem", num: true, from: 800 },
    { id: "i", label: "tvC_isbn", w: "9.5rem", num: true, from: 1000 },
    { id: "c", label: "cCategory", w: "minmax(0, 1.4fr)", from: 900 },
    { id: "l", label: "tvC_locs", w: "minmax(0, 1.6fr)", from: 0 },
    { id: "cover", label: "tvC_cover", w: "7rem", from: 1000, needs: "cov" },
    { id: "probs", label: "tvC_probs", w: "minmax(0, 2fr)", from: 0 },
  ],
};
// Default set of visible columns for a window width
export const defaultHidden = (set, width) => new Set(COLUMNS[set].filter(c => !c.fixed && width < c.from).map(c => c.id));

// Books the cover survey found no cover for: key (title|first author) -> ISBNs
function missOf(cov) {
  if (!cov || !cov.miss) return null;
  const m = new Map();
  for (const b of cov.miss) m.set(keyOf(b.t, (b.a || [])[0]), (b.i || []).join(" "));
  return m;
}
// One problem per list and row; several values (e.g. two wrong ISBNs) joined
function addProb(list, key, v) {
  const p = list.find(x => x.key === key);
  if (!p) list.push({ key, v: v == null ? "" : String(v) });
  else if (v != null && v !== "" && !(", " + p.v + ", ").includes(", " + v + ", ")) p.v = p.v ? p.v + ", " + v : String(v);
}
const ORDER = {};
LISTS.forEach(([, keys]) => keys.forEach(k => { ORDER[k] = Object.keys(ORDER).length; }));
const byList = (x, y) => ORDER[x.key] - ORDER[y.key];

/* Rows of the copies (WinBook records): { n, id, t, a, p, y, c, l, sig, z, probs:[{key, v}], cs:[c], ls:[l], q } and of the
   public list: { n, t, s, a, p, y, i, c, l, cover, probs, ids, cs, ls, q } (q = search text, cs/ls = values for the filters). */
export function buildData(ins, books, report, cov) {
  const hits = new Set((report && report.nameHitTitles) || []);
  const miss = missOf(cov);
  let records = null;
  const recByKey = new Map();
  if (ins) {
    const probs = new Map();
    const add = (r, key, v) => addProb(probs.get(r) || probs.set(r, []).get(r), key, v);
    for (const c of ins.checks) if (GROUP[c.key]) for (const x of c.rows) if (x.r) add(x.r, c.key, x.v);
    records = ins.records.map((r, n) => {
      const k = keyOf(r.t, firstAuthor(r.a));
      if (hits.has(r.t)) add(r, "nameHits");
      if (miss && r.t && miss.has(k)) add(r, "coverNone", miss.get(k));
      const row = {
        n, id: r.id, t: r.t, a: r.a, p: r.p, y: r.y, c: r.c, l: r.l, sig: r.sig, z: r.z,
        probs: (probs.get(r) || []).slice().sort(byList), cs: [r.c], ls: [r.l],
        q: normE([r.id, r.t, r.a, r.p, r.y, r.c, r.l, r.sig, r.z].join(" ")),
      };
      if (r.t) (recByKey.get(k) || recByKey.set(k, []).get(k)).push(row);
      return row;
    });
  }
  const list = (books || []).map((b, n) => {
    const a = b.a || [], i = b.i || [], l = b.l || [];
    const k = keyOf(b.t, a[0]);
    const copies = recByKey.get(k) || [];
    const probs = [];
    for (const r of copies) for (const p of r.probs) addProb(probs, p.key, p.v);
    if (hits.has(b.t)) addProb(probs, "nameHits");
    if (miss && miss.has(k)) addProb(probs, "coverNone", miss.get(k));
    const cover = !i.length ? "none" : !cov ? "" : miss && miss.has(k) ? "no" : cov.complete ? "yes" : "open";
    return {
      n, t: b.t || "", s: b.s || "", a: a.join(", "), p: b.p || "", y: b.y || "", i: i.join(" "), c: b.c || "", l: l.join(", "),
      cover, probs: probs.sort(byList), ids: copies.map(r => r.id), cs: [b.c || ""], ls: l.length ? l : [""],
      q: normE([b.t, b.s, a.join(" "), b.p, b.y, i.join(" "), b.c, l.join(" ")].join(" ")),
    };
  });
  return { records, books: list };
}

// Rows per list key, values of category and location with their counts (for the filter menus)
export function facets(rows) {
  const lists = {}, cats = new Map(), locs = new Map();
  let any = 0;
  for (const r of rows) {
    if (r.probs.length) any++;
    for (const p of r.probs) lists[p.key] = (lists[p.key] || 0) + 1;
    for (const c of r.cs) cats.set(c, (cats.get(c) || 0) + 1);
    for (const l of r.ls) locs.set(l, (locs.get(l) || 0) + 1);
  }
  const sorted = m => [...m].sort((x, y) => (!x[0] ? 1 : !y[0] ? -1 : coll.compare(x[0], y[0])));
  return { lists, any, cats: sorted(cats), locs: sorted(locs) };
}

// Filter values: list "all" | "any" | "ok" | key; category/location "all" | "none" (empty) | name
export const ALL = "__all", NONE = "__none";
export function filterRows(rows, { q, list, cat, loc }) {
  const terms = normE(q).split(" ").filter(Boolean);
  const want = v => (v === NONE ? "" : v);
  return rows.filter(r => {
    if (list === "any" ? !r.probs.length : list === "ok" ? r.probs.length : list !== ALL && !r.probs.some(p => p.key === list)) return false;
    if (cat !== ALL && !r.cs.includes(want(cat))) return false;
    if (loc !== ALL && !r.ls.includes(want(loc))) return false;
    for (const w of terms) if (!r.q.includes(w)) return false;
    return true;
  });
}

// Sort by a column: numbers as numbers, text with the German collator (numeric), empty values always last
const sortValue = (r, col) => (col === "probs" ? r.probs.length || "" : col === "id" ? r.id : r[col]);
export function sortRows(rows, col, dir) {
  if (!col || !dir) return rows;
  const f = dir === "asc" ? 1 : -1;
  return rows.slice().sort((x, y) => {
    const a = sortValue(x, col), b = sortValue(y, col);
    const ea = a === "" || a == null, eb = b === "" || b == null;
    if (ea || eb) return ea && eb ? x.n - y.n : ea ? 1 : -1;
    const c = typeof a === "number" && typeof b === "number" ? a - b : coll.compare(String(a), String(b));
    return c * f || x.n - y.n;
  });
}

// CSV for Excel (same rules as the maintenance lists): BOM, semicolons, CRLF; cells starting with = + - @ are not formulas
const cell = v => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
// Download a file (CSV, Excel)
export function saveBlob(name, blob, rows) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  log("Table", `${name} saved (${rows} rows)`);
}
export function saveCsv(name, rows) {
  const text = "\ufeff" + rows.map(r => r.map(cell).join(";")).join("\r\n") + "\r\n";
  saveBlob(name, new Blob([text], { type: "text/csv;charset=utf-8" }), rows.length - 1);
}
export const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const today = () => new Date().toLocaleDateString("sv-SE");
