/* Verwaltung (wird verschlüsselt, siehe werkzeuge/admin-verschluesseln.js): Reiter Bestand, Empfehlungen, Info.
   React und die gemeinsamen Bausteine kommen zur Laufzeit von der Seite (src/verwaltung/gemeinsam.js).
   Nach dem Entschlüsseln meldet sich die Verwaltung als window.DSM_VERWALTUNG an, die Sperre zeigt sie dann an. */
import "./woerter";
import * as React from "react";

import { LockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { store } from "@/lib/speicher";
import { useSprache } from "@/lib/sprache";
import { Bestand } from "./bestand";
import { Empfehlungen, entwurfLaden } from "./empfehlungen";
import { Info, infoLaden } from "./info";

// Alte Vorschauen verwerfen, damit index.html#vorschau nur zeigt, was in dieser Sitzung entsteht
["dsm-vorschau", "dsm-vorschau-empf", "dsm-vorschau-info"].forEach(k => store.del(k));

function App({ sperren }) {
  const { t } = useSprache();
  const [tab, setTab] = React.useState("bestand");
  // Bestand: veröffentlichte Liste, eingelesene Datenbank, Cover-Abdeckung
  const [cur, setCur] = React.useState(window.DSM_BIBLIOTHEK);
  const [result, setResult] = React.useState(null);
  const [stand, setStand] = React.useState(null);
  const [cov, setCov] = React.useState(null);
  const [survey, setSurvey] = React.useState(null);
  const [draft, setDraft] = React.useState(entwurfLaden);
  const [info, setInfo] = React.useState(infoLaden);

  const entry = () => {
    const e = { stand, buecher: result.books.length, isbn: result.books.filter(b => b.i).length };
    if (cov && cov.done) Object.assign(e, { cover: (cov.ekz || 0) + cov.ol + cov.gb, ekz: cov.ekz || 0, ol: cov.ol, gb: cov.gb, ohne: cov.none, geprueft: cov.done, vollstaendig: !!cov.complete });
    return e;
  };
  const history = () => {
    let prev = cur && Array.isArray(cur.verlauf) ? cur.verlauf.slice() : [];
    if (cur && !prev.length && cur.stand && cur.buecher) prev = [{ stand: cur.stand, buecher: cur.buecher.length, isbn: cur.buecher.filter(b => b.i).length }];
    return prev.filter(e => e.stand !== stand).concat([entry()]).slice(-24);
  };
  const B = {
    cur, result, stand, cov, survey, entry, history,
    eingelesen(r) {
      const s = new Date().toLocaleDateString("sv-SE"); // JJJJ-MM-TT, lokales Datum
      if (survey) survey.stop();
      setSurvey(null); setCov(null); setStand(s); setResult(r);
      store.set("dsm-vorschau", JSON.stringify({ stand: s, anzahl: r.books.length, buecher: r.books }));
    },
    pruefen() {
      if (!result || survey) return;
      const s = window.DSMCovers.survey(result.books, st => setCov({ ...st }));
      setSurvey(s);
      s.done.then(() => setSurvey(null));
    },
    booksDatei() {
      const meta = { stand, abdeckung: entry(), verlauf: history() };
      return {
        text: window.DSMExtract.toScript(result, meta),
        fertig: () => {
          const neu = { stand, anzahl: result.books.length, abdeckung: meta.abdeckung, verlauf: meta.verlauf, buecher: result.books };
          window.DSM_BIBLIOTHEK = neu;
          setCur(neu);
        },
      };
    },
  };
  const catalog = result ? result.books : (cur && cur.buecher) || [];

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="adm-top mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <TabsList className="tabs max-[420px]:w-full max-[420px]:grid-cols-3">
          {[["bestand", "tabBestand"], ["empf", "tabEmpf"], ["info", "tabInfo"]].map(([v, k]) => (
            <TabsTrigger key={v} value={v} data-tab={v}>{t(k)}</TabsTrigger>
          ))}
        </TabsList>
        {/* Schloss; der Text gleitet bei Hover/Fokus nach rechts heraus */}
        <Button
          variant="ghost" size="icon" id="lock-btn" onClick={sperren} aria-label={t("lockAgain")}
          className="group w-auto gap-0 rounded-full px-3 hover:bg-surface focus-visible:bg-surface"
        >
          <LockIcon aria-hidden="true" strokeWidth={2} />
          <span className="grid grid-cols-[0fr] opacity-0 transition-[grid-template-columns,opacity,margin] duration-200 ease-dsm group-hover:ml-2 group-hover:grid-cols-[1fr] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:grid-cols-[1fr] group-focus-visible:opacity-100 motion-reduce:transition-none">
            <span className="overflow-hidden">{t("lockAgain")}</span>
          </span>
        </Button>
      </div>
      <TabsContent value="bestand"><Bestand B={B} /></TabsContent>
      <TabsContent value="empf"><Empfehlungen draft={draft} setDraft={setDraft} catalog={catalog} /></TabsContent>
      <TabsContent value="info"><Info info={info} setInfo={setInfo} /></TabsContent>
    </Tabs>
  );
}

window.DSM_VERWALTUNG = { App };
