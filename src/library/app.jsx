/* Book list (index.html): header, info, recommendations, search and list, dialogs. */
import * as React from "react";

import { Settings } from "@/components/settings";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { addStrings, useLanguage } from "@/lib/language";
import { loadBooks, prepare, keyOf, previewRecs, previewInfo, previewBooks } from "@/library/data";
import { Detail } from "@/library/detail";
import { Recommendations, Archive, RecommendationSettings, Questions } from "@/library/recommendations";
import { InfoCard, InfoDialog } from "@/library/info";
import { BookList } from "@/library/list";
import { getChoice } from "@/library/choice";

addStrings({
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

// Recommendations and opening hours are already set (scripts before this one), the books come afterwards
const R = previewRecs() || window.DSM_RECOMMENDATIONS || { groups: {} };
const I = previewInfo() || window.DSM_INFO || null;
const PREVIEW_ON = !!(previewBooks() || previewRecs() || previewInfo());

export function App() {
  const { t } = useLanguage();
  const [books, setBooks] = React.useState([]);
  const [loaded, setLoaded] = React.useState(false);
  const [detail, setDetail] = React.useState(null);
  const [dialog, setDialog] = React.useState(null); // settings | archive | info | questions

  React.useEffect(() => loadBooks(d => { setBooks(prepare(d)); setLoaded(true); }), []);
  const byKey = React.useMemo(() => new Map(books.map(b => [keyOf(b), b])), [books]);
  // Questions on the first visit
  React.useEffect(() => {
    if (!loaded || getChoice() || !books.length) return undefined;
    const id = setTimeout(() => setDialog("questions"), 450);
    return () => clearTimeout(id);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = React.useCallback((b, rec) => setDetail({ b, rec: rec || null }), []);
  const dialogToggle = name => on => setDialog(on ? name : null);

  return (
    <>
      {/* Skip link for keyboard and screen readers: only visible on focus */}
      <a href="#q" className="sr-only rounded-lg bg-foreground px-4 py-3 font-semibold text-background no-underline focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70]">{t("skip")}</a>
      <div className="banner text-s font-medium" id="preview" hidden={!PREVIEW_ON}>
        <div className="wrap flex items-center justify-between gap-3 py-2">
          <span>{t("preview")}</span>
          <a href="./" className="font-semibold whitespace-nowrap text-anthracite no-underline">{t("previewEnd")}</a>
        </div>
      </div>
      <Header onSettings={() => setDialog("settings")} />
      <section className="wrap intro pt-2 pb-4 sm:pt-3 sm:pb-5">
        <h1 className="m-0 text-l font-semibold leading-[1.1] [text-wrap:balance]">{t("title")}</h1>
      </section>
      <InfoCard I={I} onOpen={() => setDialog("info")} />
      <Recommendations R={R} byKey={byKey} loaded={loaded} onOpen={open} onArchive={() => setDialog("archive")} />
      <BookList books={books} loaded={loaded} onOpen={open} />

      <Detail entry={detail} onClose={() => setDetail(null)} />
      <Settings open={dialog === "settings"} onOpenChange={dialogToggle("settings")}>
        <RecommendationSettings />
      </Settings>
      <Archive open={dialog === "archive"} onOpenChange={dialogToggle("archive")} R={R} byKey={byKey} onOpen={open} />
      <InfoDialog I={I} open={dialog === "info"} onOpenChange={dialogToggle("info")} />
      <Questions open={dialog === "questions"} onOpenChange={dialogToggle("questions")} />
      <Toaster />
    </>
  );
}
