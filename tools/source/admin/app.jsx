/* Admin app (gets encrypted, see tools/encrypt-admin.js): tabs catalog, covers, care, statistics, recommendations, info,
   help page and lock in the navigation bar (nav.jsx).
   React and the shared building blocks come from the page at runtime (src/admin/shared.js).
   After decryption the admin app registers itself as window.DSM_ADMIN, the lock then shows it. */
import "./strings";
import * as React from "react";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { store } from "@/lib/storage";
import { Catalog } from "./catalog";
import { Covers } from "./covers";
import { Care } from "./maintenance";
import { Stats } from "./stats";
import { Recommendations, loadDraft } from "./recommendations";
import { Info, loadInfo } from "./info";
import { Help } from "./help";
import { AdminNav, TABS } from "./nav";
import { registerRestore } from "./versions";

// Discard old previews, so index.html#preview only shows what is created in this session
["dsm-preview", "dsm-preview-recs", "dsm-preview-info"].forEach(k => store.del(k));

// Italian category names and hidden covers (both published with books.js); draft until then
const BDRAFT = "dsm-books-draft";
const fromLibrary = l => ({ catIt: Object.assign({}, l && l.catIt), noCover: ((l && l.noCover) || []).slice() });
function loadExtra() {
  const d = store.json(BDRAFT);
  return d && d.catIt && Array.isArray(d.noCover) ? d : fromLibrary(window.DSM_LIBRARY);
}
const cleanCatIt = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, String(o[k] || "").trim()]).filter(([, v]) => v));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function App({ lock }) {
  const [tab, setTab] = React.useState("catalog");
  const [help, setHelp] = React.useState(false);
  // Catalog: published list, imported database, maintenance analysis, cover coverage
  const [cur, setCur] = React.useState(window.DSM_LIBRARY);
  const [result, setResult] = React.useState(null);
  const [ins, setIns] = React.useState(null);
  const [updated, setUpdated] = React.useState(null);
  const [cov, setCov] = React.useState(null);
  const [survey, setSurvey] = React.useState(null);
  const [extra, setExtra] = React.useState(loadExtra);
  // Automatic corrections (fixes.jsx): corrected list { books, applied: [keys], base } on top of the import / published list
  const [fixed, setFixed] = React.useState(null);
  const [draft, setDraft] = React.useState(loadDraft);
  const [info, setInfo] = React.useState(loadInfo);

  React.useEffect(() => {
    if (!extra.changed) return undefined;
    const id = setTimeout(() => { const { changed, ...d } = extra; store.set(BDRAFT, JSON.stringify(d)); }, 300); // eslint-disable-line no-unused-vars
    return () => clearTimeout(id);
  }, [extra]);

  // Without an import everything refers to the published list (and keeps its date)
  const base = result ? result.books : (cur && cur.books) || [];
  const books = fixed ? fixed.books : base;
  const date = result ? updated : fixed ? new Date().toLocaleDateString("sv-SE") : cur && cur.updated;
  const entry = () => {
    if (!result && !fixed && !(cov && cov.done) && cur && cur.coverage) return cur.coverage;
    const e = { updated: date, books: books.length, isbn: books.filter(b => b.i).length };
    if (cov && cov.done) Object.assign(e, { cover: (cov.ekz || 0) + cov.ol, ekz: cov.ekz || 0, ol: cov.ol, none: cov.none, checked: cov.done, complete: !!cov.complete });
    else if (!result && cur && cur.coverage && cur.coverage.cover != null) {
      const c = cur.coverage;
      Object.assign(e, { cover: c.cover, ekz: c.ekz, ol: c.ol, none: c.none, checked: c.checked, complete: c.complete });
    }
    return e;
  };
  const history = () => {
    let prev = cur && Array.isArray(cur.history) ? cur.history.slice() : [];
    if (cur && !prev.length && cur.updated && cur.books) prev = [{ updated: cur.updated, books: cur.books.length, isbn: cur.books.filter(b => b.i).length }];
    return prev.filter(e => e.updated !== date).concat([entry()]).slice(-24);
  };
  const catIt = cleanCatIt(extra.catIt);
  const noCover = extra.noCover.slice().sort();
  const changed = !!cur && (!!fixed || !same(catIt, cleanCatIt((cur && cur.catIt) || {})) || !same(noCover, ((cur && cur.noCover) || []).slice().sort())
    || (!!(cov && cov.done) && !same(entry(), cur.coverage)));
  const edit = fn => setExtra(x => { const n = { catIt: { ...x.catIt }, noCover: x.noCover.slice(), changed: true }; fn(n); return n; });
  // The new state counts as published (after writing books.js, or after restoring an earlier version)
  const published = next => {
    window.DSM_LIBRARY = next;
    setCur(next);
    setFixed(null);
    store.del(BDRAFT);
    setExtra(fromLibrary(next));
  };
  // Restoring an earlier books.js (versions.js): it counts as published (only state setters inside, so registered once)
  React.useEffect(() => registerRestore("books.js", next => published(next)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const B = {
    cur, result, ins, updated, cov, survey, entry, history, books, base, extra, changed, fixed, setTab,
    imported(r, inspection) {
      const s = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local date
      if (survey) survey.stop();
      setSurvey(null); setCov(null); setFixed(null); setUpdated(s); setResult(r); setIns(inspection || null);
      store.set("dsm-preview", JSON.stringify({ updated: s, count: r.books.length, books: r.books }));
    },
    check() {
      if (!books.length || survey) return;
      const s = window.DSMCovers.survey(books, st => setCov({ ...st }));
      setSurvey(s);
      s.done.then(() => setSurvey(null));
    },
    setCatIt: (k, v) => edit(n => { n.catIt[k] = v; }),
    hideCover: (isbns, on) => edit(n => { n.noCover = on ? [...new Set(n.noCover.concat(isbns))] : n.noCover.filter(i => !isbns.includes(i)); }),
    // Automatic corrections: fixed = { books, applied } or null (undo)
    setFixed(f) {
      setFixed(f);
      const list = f ? f.books : base;
      store.set("dsm-preview", JSON.stringify({ updated: date, count: list.length, books: list }));
    },
    published,
    booksFile() {
      const meta = { updated: date, coverage: entry(), history: history(), catIt, noCover };
      return {
        text: window.DSMExtract.toScript({ books }, meta),
        done: () => {
          const next = { updated: date, count: books.length, coverage: meta.coverage, history: meta.history };
          if (Object.keys(catIt).length) next.catIt = catIt;
          if (noCover.length) next.noCover = noCover;
          next.books = books;
          // Published corrections become the base of the import, so they don't fall back to the uncorrected list
          if (fixed && result) setResult(r => ({ ...r, books }));
          published(next);
        },
      };
    },
  };

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <AdminNav tab={tab} lock={lock} onHelp={() => setHelp(true)} />
      <TabsContent value="catalog"><Catalog B={B} /></TabsContent>
      <TabsContent value="covers"><Covers B={B} /></TabsContent>
      <TabsContent value="care"><Care B={B} ins={ins} report={result && result.report} cov={cov} onCatalog={() => setTab("catalog")} /></TabsContent>
      <TabsContent value="stats"><Stats B={B} /></TabsContent>
      <TabsContent value="recs"><Recommendations draft={draft} setDraft={setDraft} catalog={books} /></TabsContent>
      <TabsContent value="info"><Info info={info} setInfo={setInfo} /></TabsContent>
      <Help open={help} onOpenChange={setHelp} onTab={v => { setHelp(false); setTab(v); }} tabs={TABS} />
    </Tabs>
  );
}

window.DSM_ADMIN = { App };
