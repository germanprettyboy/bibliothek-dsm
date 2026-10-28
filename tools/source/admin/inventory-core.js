/* Inventory (inventory.jsx): which copies of the import were found at the shelf. One running inventory, kept in
   localStorage "dsm-inventory" so it survives reloads, days and new imports (copies are identified by their WinBook
   number): { v: 1, started: "YYYY-MM-DD", loc: null | "<location>" (null = all locations),
   found: { [id]: [time, location chosen at the scan] }, unknown: [{ code, time }] }.
   Only numbers, codes and times: nothing about readers or loans (a missing copy may simply be on loan). */
import { store } from "@/lib/storage";

const KEY = "dsm-inventory";
const UNKNOWN_MAX = 200;

function load() {
  const d = store.json(KEY);
  return d && d.v === 1 && d.found && typeof d.found === "object" ? { ...d, unknown: Array.isArray(d.unknown) ? d.unknown : [] } : null;
}
// Shared state (the card in tab "Pflege", the inventory sheet and the to-dos of the command palette read it)
let state = load();
const listeners = new Set();
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const current = () => state;
export function save(next) {
  state = next;
  if (next) store.set(KEY, JSON.stringify(next)); else store.del(KEY);
  listeners.forEach(fn => fn());
}
export const fresh = loc => ({ v: 1, started: new Date().toLocaleDateString("sv-SE"), loc: loc == null ? null : loc, found: {}, unknown: [] });

const normSig = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const normId = s => String(s).replace(/^0+(?=\d)/, "");
const push = (m, k, v) => (m.get(k) || m.set(k, []).get(k)).push(v);
export const inScope = (inv, r) => inv.loc == null || (r.l || "") === inv.loc;

/* A scanned or typed code → { kind, rec?, how?, code }:
   found = a copy of the chosen location (with all locations: any copy), odd = a copy that belongs to another location,
   again = already counted, unknown = no copy with this code. Order: ISBN (the EAN barcode on the book, also with a
   2/5-digit add-on, or an ISBN-10), WinBook number, shelf mark. Several copies with the same code: the first one not yet
   counted in the chosen location, then anywhere. */
export function matcher(records) {
  const byIsbn = new Map(), byId = new Map(), bySig = new Map();
  for (const r of records) {
    for (const i of r.i || []) push(byIsbn, i, r);
    if (r.id != null && r.id !== "") byId.set(normId(r.id), r);
    if (r.sig) push(bySig, normSig(r.sig), r);
  }
  const isbn13 = window.DSMExtract.isbn13;
  return (inv, code) => {
    const raw = String(code || "").trim();
    const digits = raw.replace(/[\s-]/g, "").toUpperCase();
    let cands = null, how = "";
    const isbn = /^[\dX]{10,18}$/.test(digits) && (isbn13(digits) || (digits.length > 13 && isbn13(digits.slice(0, 13))));
    if (isbn && byIsbn.has(isbn)) { cands = byIsbn.get(isbn); how = "isbn"; }
    else if (/^\d{1,12}$/.test(digits) && byId.has(normId(digits))) { cands = [byId.get(normId(digits))]; how = "id"; }
    else if (raw && bySig.has(normSig(raw))) { cands = bySig.get(normSig(raw)); how = "sig"; }
    if (!cands) return { kind: "unknown", code: raw };
    const seen = r => !!inv.found[r.id];
    const rec = cands.find(r => inScope(inv, r) && !seen(r)) || cands.find(r => !seen(r)) || cands[0];
    if (seen(rec)) return { kind: "again", rec, how, code: raw };
    return { kind: inScope(inv, rec) ? "found" : "odd", rec, how, code: raw };
  };
}

// Applies a match: found/odd are counted (with the location chosen at the scan), unknown codes kept once, newest first
export function apply(inv, m) {
  if (m.kind === "found" || m.kind === "odd") return { ...inv, found: { ...inv.found, [m.rec.id]: [Date.now(), inv.loc] } };
  if (m.kind === "unknown" && m.code) {
    return { ...inv, unknown: [{ code: m.code, time: Date.now() }].concat(inv.unknown.filter(u => u.code !== m.code)).slice(0, UNKNOWN_MAX) };
  }
  return inv;
}
// Mark by hand (a copy without a readable barcode) or take a count back
export function mark(inv, id, on) {
  const found = { ...inv.found };
  if (on) found[id] = [Date.now(), inv.loc]; else delete found[id];
  return { ...inv, found };
}
export const forget = (inv, code) => ({ ...inv, unknown: inv.unknown.filter(u => u.code !== code) });

/* Counts for the chosen location: scope = its copies, found/missing among them (found newest first); odd = copies
   counted while looking at a location they don't belong to – they need to go back to their own shelf */
export function tally(records, inv) {
  const scope = [], found = [], missing = [], odd = [];
  const at = r => inv.found[r.id];
  for (const r of records) {
    const f = at(r);
    if (inScope(inv, r)) { scope.push(r); (f ? found : missing).push(r); }
    if (f && f[1] != null && f[1] !== (r.l || "") && (inv.loc == null || f[1] === inv.loc)) odd.push(r);
  }
  found.sort((a, b) => at(b)[0] - at(a)[0]);
  odd.sort((a, b) => at(b)[0] - at(a)[0]);
  return { scope, found, missing, odd, unknown: inv.unknown };
}
