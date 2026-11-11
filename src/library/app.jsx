/* Book list (index.html): header, info, recommendations, search and list, dialogs, optional background.
   Preview (index.html#preview, opened from the admin page): the banner #preview; while the admin page is open in another
   tab it sends its drafts over BroadcastChannel "dsm-preview" ({info?, recs?}), the preview follows them live, and the
   banner's links #preview-edit [data-edit] open the matching tab there ({edit}) instead of leaving the preview. */
import * as React from "react";

import { Settings } from "@/components/settings";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { addStrings, useLanguage } from "@/lib/language";
import { notify } from "@/lib/notice";
import { loadBooks, prepare, keyOf, previewRecs, previewInfo, previewBooks, hiddenBy, PREVIEW } from "@/library/data";
import { Detail } from "@/library/detail";
import { Recommendations, Archive, RecommendationSettings, Questions } from "@/library/recommendations";
import { InfoCard, InfoDialog } from "@/library/info";
import { Announcement } from "@/library/announcement";
import { BookList } from "@/library/list";
import { getChoice } from "@/library/choice";
import { BackgroundSettings, startBackground } from "@/library/backdrop";

addStrings({
  de: {
    pageTitle: "Bibliothek – Deutsche Schule Mailand", title: "Bibliothek",
    skip: "Zur Suche springen",
    preview: "Vorschau der neuen Liste – noch nicht veröffentlicht.", previewEnd: "Vorschau beenden",
    previewEdit: "Bearbeiten", previewSent: "In der Verwaltung geöffnet.",
    edAnnouncement: "Ankündigung", edInfo: "Öffnungszeiten", edRecs: "Empfehlungen", edCatalog: "Bestand",
  },
  it: {
    pageTitle: "Biblioteca – Scuola Germanica di Milano", title: "Biblioteca",
    skip: "Vai alla ricerca",
    preview: "Anteprima del nuovo elenco – non ancora pubblicato.", previewEnd: "Chiudi anteprima",
    previewEdit: "Modifica", previewSent: "Aperto nell'amministrazione.",
    edAnnouncement: "Avviso", edInfo: "Orari", edRecs: "Consigli", edCatalog: "Catalogo",
  },
});

// Recommendations and opening hours are already set (scripts before this one), the books come afterwards
const R0 = previewRecs() || window.DSM_RECOMMENDATIONS || { groups: {} };
const I0 = previewInfo() || window.DSM_INFO || null;
const PREVIEW_ON = !!(previewBooks() || previewRecs() || previewInfo());
// What the banner can open in the admin page: [target (tab or tab:element id), label key]
const EDIT = [["info:i-ann", "edAnnouncement"], ["info:i-hours", "edInfo"], ["recs", "edRecs"], ["catalog", "edCatalog"]];

export function App() {
  const { t } = useLanguage();
  const [books, setBooks] = React.useState([]);
  const [loaded, setLoaded] = React.useState(false);
  const [detail, setDetail] = React.useState(null);
  const [dialog, setDialog] = React.useState(null); // settings | archive | info | questions
  // Recommendations and info: fixed for visitors; the preview follows the admin page's drafts
  const [R, setR] = React.useState(R0);
  const [I, setI] = React.useState(I0);
  const [live, setLive] = React.useState(false);
  const channel = React.useRef(null);
  // Switched off in the admin page: no card, no archive, no settings section, no questions
  const RECS = !R.off;

  React.useEffect(() => loadBooks(d => { setBooks(prepare(d)); setLoaded(true); }), []);
  React.useEffect(startBackground, []); // interactive background, if chosen (settings)
  React.useEffect(() => {
    if (!PREVIEW || typeof BroadcastChannel !== "function") return undefined;
    const ch = channel.current = new BroadcastChannel("dsm-preview");
    ch.onmessage = e => {
      const d = e.data || {};
      if (d.recs && d.recs.groups) setR(d.recs);
      if (d.info && d.info.hours) setI(d.info);
      if (d.recs || d.info) setLive(true);
    };
    ch.postMessage({ hello: true }); // an open admin page answers with its drafts
    return () => { channel.current = null; ch.close(); };
  }, []);
  const byKey = React.useMemo(() => new Map(books.map(b => [keyOf(b), b])), [books]);
  // Questions on the first visit, only if there is a recommendation in the catalog at all. Never in place of another
  // window (on a slow connection the settings or opening hours may already be open when the list arrives): after it.
  React.useEffect(() => {
    if (!RECS || !loaded || dialog || detail || getChoice() || !books.length) return undefined;
    if (!Object.values(R.groups || {}).some(l => (l || []).some(r => byKey.has(r.k)))) return undefined;
    const id = setTimeout(() => setDialog("questions"), 450);
    return () => clearTimeout(id);
  }, [loaded, dialog, detail, RECS]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = React.useCallback((b, rec) => setDetail({ b, rec: rec || null }), []);
  const dialogToggle = name => on => setDialog(on ? name : null);
  const settings = React.useCallback(() => setDialog("settings"), []);

  return (
    <>
      {/* Skip link for keyboard and screen readers: only visible on focus */}
      <a href="#q" className="sr-only rounded-lg bg-foreground px-4 py-3 font-semibold text-background no-underline focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70]">{t("skip")}</a>
      <div className="banner text-s font-medium" id="preview" hidden={!PREVIEW_ON && !live}>
        <div className="wrap flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
          <span>{t("preview")}</span>
          {/* One click from the page to its editor: the admin page open in another tab switches to it */}
          {live ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1" id="preview-edit">
              <span className="font-normal">{t("previewEdit")}:</span>
              {EDIT.map(([to, k]) => (
                <a
                  key={to} href={"admin.html#" + to.split(":")[0]} data-edit={to} className="font-semibold whitespace-nowrap text-anthracite no-underline"
                  onClick={e => {
                    if (!channel.current) return;
                    e.preventDefault();
                    channel.current.postMessage({ edit: to });
                    notify(t("previewSent"));
                  }}
                >{t(k)}</a>
              ))}
            </span>
          ) : null}
          {/* Back to the admin page: a preview tab opened from there (new tab, no history) closes, otherwise admin.html */}
          <a
            href="admin.html" className="font-semibold whitespace-nowrap text-anthracite no-underline" id="preview-end"
            onClick={e => {
              if (history.length > 1 || !/admin\.html/.test(document.referrer)) return;
              e.preventDefault();
              window.close();
              setTimeout(() => { location.href = "admin.html"; }, 150);
            }}
          >{t("previewEnd")}</a>
        </div>
      </div>
      {/* preview: a changed announcement starts anew (the component remembers "closed" per mount) */}
      <Announcement key={live ? JSON.stringify([I && I.announcement, hiddenBy(I, "announcement")]) : "a"} I={I} ready={loaded} />
      <Header onSettings={settings} title={t("title")} />
      <InfoCard I={I} onOpen={() => setDialog("info")} />
      {RECS ? <Recommendations R={R} byKey={byKey} loaded={loaded} onOpen={open} onArchive={() => setDialog("archive")} onSettings={settings} /> : null}
      <BookList books={books} loaded={loaded} onOpen={open} />

      <Detail entry={detail} onClose={() => setDetail(null)} archive={!hiddenBy(I, "archive")} />
      <Settings open={dialog === "settings"} onOpenChange={dialogToggle("settings")}>
        {RECS ? <RecommendationSettings /> : null}
        <BackgroundSettings />
      </Settings>
      {RECS ? <Archive open={dialog === "archive"} onOpenChange={dialogToggle("archive")} R={R} byKey={byKey} onOpen={open} /> : null}
      <InfoDialog I={I} open={dialog === "info"} onOpenChange={dialogToggle("info")} />
      {RECS ? <Questions open={dialog === "questions"} onOpenChange={dialogToggle("questions")} onSettings={settings} /> : null}
      <Toaster />
    </>
  );
}
