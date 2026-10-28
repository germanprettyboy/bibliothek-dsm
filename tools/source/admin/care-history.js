/* Progress of the maintenance work: every import keeps the number of entries per maintenance list (localStorage
   "dsm-care-history", oldest first, one entry per day – a second import on the same day replaces it – at most 30):
   [{ d: "YYYY-MM-DD", n: copies, c: { [list key]: entries } }]. Tab "Pflege" shows each list's change since the import
   of an earlier day, tab "Statistik" the course over time. Only counts, no titles or numbers of copies. */
import { store } from "@/lib/storage";

const KEY = "dsm-care-history", MAX = 30;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function loadCare() {
  const l = store.json(KEY);
  return Array.isArray(l) ? l.filter(e => e && YMD.test(e.d) && e.c && typeof e.c === "object") : [];
}
// After an import: today's counts (the lists of inspect plus the name check of the import); returns the new list
export function recordCare(ins, report) {
  const c = {};
  for (const x of ins.checks) c[x.key] = x.rows.length;
  c.nameHits = ((report && report.nameHitTitles) || []).length;
  const d = new Date().toLocaleDateString("sv-SE");
  const list = loadCare().filter(e => e.d !== d).concat([{ d, n: ins.records.length, c }]).sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-MAX);
  store.set(KEY, JSON.stringify(list));
  return list;
}
// Base of the changes: the newest entry of a day before the newest one (null = no earlier import)
export const previous = list => (list.length > 1 ? list[list.length - 2] : null);
export const total = e => Object.values(e.c).reduce((s, n) => s + (+n || 0), 0);
