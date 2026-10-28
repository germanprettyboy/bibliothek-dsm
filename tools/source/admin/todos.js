/* "Anstehend" in the command palette (palette.jsx): what is worth doing now, computed from the app state.
   Entry: { id, level, key, vars?, n?, tab, act? } – level "warn" (the website shows something wrong), "mid" (a routine is
   due), "ok" (good to know); key/vars = text (strings-palette.js), n = a count shown at the right, tab = where it is
   done, act = an action of the palette instead of the tab ("inventory"). No draft notices and no "currently published"
   lines (CLAUDE.md): only what needs doing. */
import { GROUPS, recKey } from "./recommendations";
import { allChecks } from "./maintenance";
import { tally } from "./inventory-core";

const IMPORT_DUE = 35, IMPORT_LATE = 90; // days: the monthly routine
const RECS_OLD = 120; // days of the same recommendation round
const CLOSURE_SOON = 14; // days ahead
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const ORDER = { warn: 0, mid: 1, ok: 2 };

const today = () => new Date().toLocaleDateString("sv-SE");
const daysSince = iso => (YMD.test(iso || "") ? Math.round((Date.parse(today()) - Date.parse(iso)) / 864e5) : null);

// s = { B, draft, info, ins, report, cov, inv }
export function todos({ B, draft, info, ins, report, cov, inv }) {
  const out = [];
  const add = (id, level, key, more) => out.push({ id, level, key, ...more });
  const books = B.books || [];

  // Catalog: imported this month? Italian names for new categories? Covers checked?
  if (!books.length) add("import", "warn", "tdNoBooks", { tab: "catalog" });
  else if (!B.result && B.cur) {
    const d = daysSince(B.cur.updated);
    if (d != null && d >= IMPORT_DUE) add("import", d >= IMPORT_LATE ? "warn" : "mid", "tdImport", { vars: { n: d }, tab: "catalog" });
  }
  const file = window.DSM_CATEGORIES_IT || {}, own = (B.extra && B.extra.catIt) || {};
  const noIt = new Set(books.map(b => b.c).filter(c => c && !file[c] && !String(own[c] || "").trim())).size;
  if (noIt) add("catIt", "mid", "tdCatIt", { n: noIt, tab: "catalog" });
  const coverage = B.cur && B.cur.coverage;
  if (books.some(b => b.i && b.i.length) && !B.survey && !(B.cov && B.cov.done) && !(coverage && coverage.cover != null)) add("covers", "mid", "tdCovers", { tab: "covers" });

  // Recommendations (the draft = what the next publish shows); nothing while they are switched off
  if (draft && !draft.off) {
    const keys = new Set(books.map(recKey));
    const recs = GROUPS.flatMap(g => draft.groups[g] || []);
    const gone = recs.filter(r => !keys.has(r.k)).length;
    if (books.length && gone) add("recsMissing", "warn", "tdRecsMissing", { n: gone, tab: "recs" });
    const text = recs.filter(r => !(r.de || "").trim() || !(r.it || "").trim()).length;
    if (text) add("recsText", "mid", "tdRecsText", { n: text, tab: "recs" });
    if (!recs.length) add("recsNone", "mid", "tdRecsNone", { tab: "recs" });
    else {
      const pub = window.DSM_RECOMMENDATIONS, d = pub && daysSince(pub.updated);
      if (d != null && d >= RECS_OLD) add("recsOld", "mid", "tdRecsOld", { vars: { n: d }, tab: "recs" });
    }
  }

  // Info: an expired announcement still in the file, no opening hours, the next closure
  if (info) {
    const a = info.announcement, now = today();
    if (a && (a.de.trim() || a.it.trim()) && YMD.test(a.until) && a.until < now) add("annOld", "mid", "tdAnnOld", { vars: { d: a.until }, tab: "info" });
    if (!Object.values(info.hours).some(l => l.some(r => r[0] && r[1]))) add("hours", "mid", "tdHours", { tab: "info" });
    const next = info.closures
      .filter(c => c.type !== "special" && YMD.test(c.from) && (c.to && c.to >= c.from ? c.to : c.from) >= now && daysSince(c.from) >= -CLOSURE_SOON)
      .sort((x, y) => (x.from < y.from ? -1 : 1))[0];
    if (next) add("closure", "ok", next.from <= now ? "tdClosureNow" : "tdClosure", { vars: { d: next.from, c: next }, tab: "info" });
  }

  // After an import: open maintenance entries; a running inventory
  if (ins) {
    const n = allChecks(ins, report, cov).reduce((s, [, list]) => s + list.reduce((m, c) => m + c.rows.length, 0), 0);
    if (n) add("care", "ok", "tdCare", { n, tab: "care" });
    if (inv) {
      const T = tally(ins.records, inv);
      if (T.missing.length) add("inventory", "ok", "tdInv", { vars: { f: T.found.length, n: T.scope.length }, tab: "care", act: "inventory" });
    }
  }
  return out.sort((x, y) => ORDER[x.level] - ORDER[y.level]);
}
