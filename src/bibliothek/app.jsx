/* Bücherliste (index.html): Kopf, Info, Empfehlungen, Suche und Liste, Fenster. */
import * as React from "react";

import { Einstellungen } from "@/components/einstellungen";
import { Kopf } from "@/components/kopf";
import { Toaster } from "@/components/ui/sonner";
import { woerter, useSprache } from "@/lib/sprache";
import { buecherLaden, vorbereiten, keyOf, vorschauEmpf, vorschauInfo, vorschauBuecher } from "@/bibliothek/daten";
import { Detail } from "@/bibliothek/detail";
import { Empfehlungen, Archiv, EmpfEinstellungen, Fragen } from "@/bibliothek/empfehlungen";
import { InfoKarte, InfoFenster } from "@/bibliothek/info";
import { Liste } from "@/bibliothek/liste";
import { getWahl } from "@/bibliothek/wahl";

woerter({
  de: {
    pageTitle: "Bibliothek – Deutsche Schule Mailand", title: "Bibliothek",
    skip: "Zur Suche springen",
    preview: "Vorschau der neuen Liste – noch nicht veröffentlicht.", previewEnd: "Vorschau beenden",
  },
  it: {
    pageTitle: "Biblioteca – Scuola Germanica di Milano", title: "Biblioteca",
    skip: "Vai alla ricerca",
    preview: "Anteprima del nuovo elenco – non ancora pubblicato.", previewEnd: "Chiudi anteprima",
  },
});

// Empfehlungen und Öffnungszeiten stehen schon fest (Skripte vor diesem), die Bücher kommen danach
const R = vorschauEmpf() || window.DSM_EMPFEHLUNGEN || { gruppen: {} };
const I = vorschauInfo() || window.DSM_INFO || null;
const VORSCHAU_AN = !!(vorschauBuecher() || vorschauEmpf() || vorschauInfo());

export function App() {
  const { t } = useSprache();
  const [books, setBooks] = React.useState([]);
  const [geladen, setGeladen] = React.useState(false);
  const [detail, setDetail] = React.useState(null);
  const [fenster, setFenster] = React.useState(null); // einstellungen | archiv | info | fragen

  React.useEffect(() => buecherLaden(d => { setBooks(vorbereiten(d)); setGeladen(true); }), []);
  const byKey = React.useMemo(() => new Map(books.map(b => [keyOf(b), b])), [books]);
  // Fragen beim ersten Besuch
  React.useEffect(() => {
    if (!geladen || getWahl() || !books.length) return undefined;
    const id = setTimeout(() => setFenster("fragen"), 450);
    return () => clearTimeout(id);
  }, [geladen]); // eslint-disable-line react-hooks/exhaustive-deps

  const oeffnen = React.useCallback((b, rec) => setDetail({ b, rec: rec || null }), []);
  const fensterAuf = name => an => setFenster(an ? name : null);

  return (
    <>
      {/* Sprunglink für Tastatur und Bildschirmleser: erst beim Fokus sichtbar */}
      <a href="#q" className="sr-only rounded-lg bg-foreground px-4 py-3 font-semibold text-background no-underline focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70]">{t("skip")}</a>
      <div className="banner text-s font-medium" id="preview" hidden={!VORSCHAU_AN}>
        <div className="wrap flex items-center justify-between gap-3 py-2">
          <span>{t("preview")}</span>
          <a href="./" className="font-semibold whitespace-nowrap text-anthrazit no-underline">{t("previewEnd")}</a>
        </div>
      </div>
      <Kopf onEinstellungen={() => setFenster("einstellungen")} />
      <section className="wrap intro pt-2 pb-4 sm:pt-3 sm:pb-5">
        <h1 className="m-0 text-l font-semibold leading-[1.1] [text-wrap:balance]">{t("title")}</h1>
      </section>
      <InfoKarte I={I} onOpen={() => setFenster("info")} />
      <Empfehlungen R={R} byKey={byKey} geladen={geladen} onOpen={oeffnen} onArchiv={() => setFenster("archiv")} />
      <Liste books={books} geladen={geladen} onOpen={oeffnen} />

      <Detail eintrag={detail} onClose={() => setDetail(null)} />
      <Einstellungen open={fenster === "einstellungen"} onOpenChange={fensterAuf("einstellungen")}>
        <EmpfEinstellungen />
      </Einstellungen>
      <Archiv open={fenster === "archiv"} onOpenChange={fensterAuf("archiv")} R={R} byKey={byKey} onOpen={oeffnen} />
      <InfoFenster I={I} open={fenster === "info"} onOpenChange={fensterAuf("info")} />
      <Fragen open={fenster === "fragen"} onOpenChange={fensterAuf("fragen")} />
      <Toaster />
    </>
  );
}
