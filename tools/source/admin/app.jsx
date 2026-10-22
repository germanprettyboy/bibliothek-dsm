/* Admin app (gets encrypted, see tools/encrypt-admin.js): tabs catalog, care, recommendations, info.
   React and the shared building blocks come from the page at runtime (src/admin/shared.js).
   After decryption the admin app registers itself as window.DSM_ADMIN, the lock then shows it. */
import "./strings";
import * as React from "react";

import { LockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { store } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { Catalog } from "./catalog";
import { Care } from "./maintenance";
import { Recommendations, loadDraft } from "./recommendations";
import { Info, loadInfo } from "./info";

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
  const { t } = useLanguage();
  const [tab, setTab] = React.useState("catalog");
  // Catalog: published list, imported database, maintenance analysis, cover coverage
  const [cur, setCur] = React.useState(window.DSM_LIBRARY);
  const [result, setResult] = React.useState(null);
  const [ins, setIns] = React.useState(null);
  const [updated, setUpdated] = React.useState(null);
  const [cov, setCov] = React.useState(null);
  const [survey, setSurvey] = React.useState(null);
  const [extra, setExtra] = React.useState(loadExtra);
  const [draft, setDraft] = React.useState(loadDraft);
  const [info, setInfo] = React.useState(loadInfo);

  React.useEffect(() => {
    if (!extra.changed) return undefined;
    const id = setTimeout(() => { const { changed, ...d } = extra; store.set(BDRAFT, JSON.stringify(d)); }, 300); // eslint-disable-line no-unused-vars
    return () => clearTimeout(id);
  }, [extra]);

  // Without an import everything refers to the published list (and keeps its date)
  const books = result ? result.books : (cur && cur.books) || [];
  const date = result ? updated : cur && cur.updated;
  const entry = () => {
    if (!result && !(cov && cov.done) && cur && cur.coverage) return cur.coverage;
    const e = { updated: date, books: books.length, isbn: books.filter(b => b.i).length };
    if (cov && cov.done) Object.assign(e, { cover: (cov.ekz || 0) + cov.ol + cov.gb, ekz: cov.ekz || 0, ol: cov.ol, gb: cov.gb, none: cov.none, checked: cov.done, complete: !!cov.complete });
    return e;
  };
  const history = () => {
    let prev = cur && Array.isArray(cur.history) ? cur.history.slice() : [];
    if (cur && !prev.length && cur.updated && cur.books) prev = [{ updated: cur.updated, books: cur.books.length, isbn: cur.books.filter(b => b.i).length }];
    return prev.filter(e => e.updated !== date).concat([entry()]).slice(-24);
  };
  const catIt = cleanCatIt(extra.catIt);
  const noCover = extra.noCover.slice().sort();
  const changed = !!cur && (!same(catIt, cleanCatIt((cur && cur.catIt) || {})) || !same(noCover, ((cur && cur.noCover) || []).slice().sort())
    || (!!(cov && cov.done) && !same(entry(), cur.coverage)));
  const edit = fn => setExtra(x => { const n = { catIt: { ...x.catIt }, noCover: x.noCover.slice(), changed: true }; fn(n); return n; });
  const B = {
    cur, result, updated, cov, survey, entry, history, books, extra, changed,
    imported(r, inspection) {
      const s = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local date
      if (survey) survey.stop();
      setSurvey(null); setCov(null); setUpdated(s); setResult(r); setIns(inspection || null);
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
    booksFile() {
      const meta = { updated: date, coverage: entry(), history: history(), catIt, noCover };
      return {
        text: window.DSMExtract.toScript({ books }, meta),
        done: () => {
          const next = { updated: date, count: books.length, coverage: meta.coverage, history: meta.history };
          if (Object.keys(catIt).length) next.catIt = catIt;
          if (noCover.length) next.noCover = noCover;
          next.books = books;
          window.DSM_LIBRARY = next;
          setCur(next);
          store.del(BDRAFT);
          setExtra(fromLibrary(next));
        },
      };
    },
  };
  const catalog = books;

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="adm-top mb-[18px] flex flex-wrap items-center justify-between gap-3">
        {/* Phones: four tabs in two rows (one row would cut "Empfehlungen") */}
        <TabsList className="tabs max-[420px]:w-full max-[420px]:grid-flow-row max-[420px]:grid-cols-2">
          {[["catalog", "tabCatalog"], ["care", "tabCare"], ["recs", "tabRecs"], ["info", "tabInfo"]].map(([v, k]) => (
            <TabsTrigger key={v} value={v} data-tab={v}>{t(k)}</TabsTrigger>
          ))}
        </TabsList>
        {/* Padlock; the text slides out to the right on hover/focus */}
        <Button
          variant="ghost" size="icon" id="lock-btn" onClick={lock} aria-label={t("lockAgain")}
          className="group w-auto gap-0 rounded-full px-3 hover:bg-surface focus-visible:bg-surface"
        >
          <LockIcon aria-hidden="true" strokeWidth={2} />
          <span className="grid grid-cols-[0fr] opacity-0 transition-[grid-template-columns,opacity,margin] duration-200 ease-dsm group-hover:ml-2 group-hover:grid-cols-[1fr] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:grid-cols-[1fr] group-focus-visible:opacity-100 motion-reduce:transition-none">
            <span className="overflow-hidden">{t("lockAgain")}</span>
          </span>
        </Button>
      </div>
      <TabsContent value="catalog"><Catalog B={B} /></TabsContent>
      <TabsContent value="care"><Care ins={ins} report={result && result.report} cov={cov} onCatalog={() => setTab("catalog")} /></TabsContent>
      <TabsContent value="recs"><Recommendations draft={draft} setDraft={setDraft} catalog={catalog} /></TabsContent>
      <TabsContent value="info"><Info info={info} setInfo={setInfo} /></TabsContent>
    </Tabs>
  );
}

window.DSM_ADMIN = { App };
