/* Admin app (gets encrypted, see tools/encrypt-admin.js): tabs catalog, recommendations, info.
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
import { Recommendations, loadDraft } from "./recommendations";
import { Info, loadInfo } from "./info";

// Discard old previews, so index.html#preview only shows what is created in this session
["dsm-preview", "dsm-preview-recs", "dsm-preview-info"].forEach(k => store.del(k));

function App({ lock }) {
  const { t } = useLanguage();
  const [tab, setTab] = React.useState("catalog");
  // Catalog: published list, imported database, cover coverage
  const [cur, setCur] = React.useState(window.DSM_LIBRARY);
  const [result, setResult] = React.useState(null);
  const [updated, setUpdated] = React.useState(null);
  const [cov, setCov] = React.useState(null);
  const [survey, setSurvey] = React.useState(null);
  const [draft, setDraft] = React.useState(loadDraft);
  const [info, setInfo] = React.useState(loadInfo);

  const entry = () => {
    const e = { updated, books: result.books.length, isbn: result.books.filter(b => b.i).length };
    if (cov && cov.done) Object.assign(e, { cover: (cov.ekz || 0) + cov.ol + cov.gb, ekz: cov.ekz || 0, ol: cov.ol, gb: cov.gb, none: cov.none, checked: cov.done, complete: !!cov.complete });
    return e;
  };
  const history = () => {
    let prev = cur && Array.isArray(cur.history) ? cur.history.slice() : [];
    if (cur && !prev.length && cur.updated && cur.books) prev = [{ updated: cur.updated, books: cur.books.length, isbn: cur.books.filter(b => b.i).length }];
    return prev.filter(e => e.updated !== updated).concat([entry()]).slice(-24);
  };
  const B = {
    cur, result, updated, cov, survey, entry, history,
    imported(r) {
      const s = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local date
      if (survey) survey.stop();
      setSurvey(null); setCov(null); setUpdated(s); setResult(r);
      store.set("dsm-preview", JSON.stringify({ updated: s, count: r.books.length, books: r.books }));
    },
    check() {
      if (!result || survey) return;
      const s = window.DSMCovers.survey(result.books, st => setCov({ ...st }));
      setSurvey(s);
      s.done.then(() => setSurvey(null));
    },
    booksFile() {
      const meta = { updated, coverage: entry(), history: history() };
      return {
        text: window.DSMExtract.toScript(result, meta),
        done: () => {
          const next = { updated, count: result.books.length, coverage: meta.coverage, history: meta.history, books: result.books };
          window.DSM_LIBRARY = next;
          setCur(next);
        },
      };
    },
  };
  const catalog = result ? result.books : (cur && cur.books) || [];

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="adm-top mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <TabsList className="tabs max-[420px]:w-full max-[420px]:grid-cols-3">
          {[["catalog", "tabCatalog"], ["recs", "tabRecs"], ["info", "tabInfo"]].map(([v, k]) => (
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
      <TabsContent value="recs"><Recommendations draft={draft} setDraft={setDraft} catalog={catalog} /></TabsContent>
      <TabsContent value="info"><Info info={info} setInfo={setInfo} /></TabsContent>
    </Tabs>
  );
}

window.DSM_ADMIN = { App };
