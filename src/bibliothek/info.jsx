/* Info über der Liste: Öffnungszeiten (heute geöffnet/geschlossen), Ferien und Abwesenheiten, dazu ein Fenster
   mit allen Zeiten. Daten: info.js (window.DSM_INFO, vor diesem Skript geladen), gepflegt in admin.html.
   Vergangene Schließtage blenden sich selbst aus. */
import * as React from "react";
import { ChevronRightIcon } from "lucide-react";

import { Fenster } from "@/components/fenster";
import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { store } from "@/lib/speicher";
import { woerter, useSprache, t } from "@/lib/sprache";
import { VORSCHAU } from "@/bibliothek/daten";

woerter({
  de: {
    infoT: "Öffnungszeiten", infoOpen: "Öffnungszeiten und Schließtage anzeigen",
    openNow: "Jetzt geöffnet", until: "bis {t}", openLater: "Heute ab {t} geöffnet", today: "Heute",
    closedNow: "Jetzt geschlossen", closedToday: "Heute geschlossen", again: "Wieder geöffnet {w}",
    wTomorrow: "morgen ab {t}", wDay: "am {w} ab {t}", wDate: "am {w}, {d}, ab {t}",
    closed: "geschlossen", ferien: "Ferien", abwesend: "Bibliothek geschlossen",
    artFerien: "Ferien", artAbw: "Abwesenheit",
    closuresT: "Ferien und Schließtage", noClosures: "Keine Schließtage geplant.",
    wd_mo: "Montag", wd_di: "Dienstag", wd_mi: "Mittwoch", wd_do: "Donnerstag", wd_fr: "Freitag", wd_sa: "Samstag", wd_so: "Sonntag",
    ws_mo: "Mo", ws_di: "Di", ws_mi: "Mi", ws_do: "Do", ws_fr: "Fr", ws_sa: "Sa", ws_so: "So",
  },
  it: {
    infoT: "Orari di apertura", infoOpen: "Mostra orari e giorni di chiusura",
    openNow: "Aperta ora", until: "fino alle {t}", openLater: "Oggi aperta dalle {t}", today: "Oggi",
    closedNow: "Chiusa ora", closedToday: "Oggi chiusa", again: "Riapre {w}",
    wTomorrow: "domani alle {t}", wDay: "{w} alle {t}", wDate: "{w} {d} alle {t}",
    closed: "chiusa", ferien: "Vacanze", abwesend: "Biblioteca chiusa",
    artFerien: "Vacanze", artAbw: "Assenza",
    closuresT: "Vacanze e giorni di chiusura", noClosures: "Nessuna chiusura prevista.",
    wd_mo: "lunedì", wd_di: "martedì", wd_mi: "mercoledì", wd_do: "giovedì", wd_fr: "venerdì", wd_sa: "sabato", wd_so: "domenica",
    ws_mo: "lun", ws_di: "mar", ws_mi: "mer", ws_do: "gio", ws_fr: "ven", ws_sa: "sab", ws_so: "dom",
  },
});

const DAYS = ["mo", "di", "mi", "do", "fr", "sa", "so"];
const ISO = /^\d{4}-\d{2}-\d{2}$/, HM = /^\d{2}:\d{2}$/;
const p2 = n => (n < 10 ? "0" : "") + n;
const iso = d => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); // JJJJ-MM-TT, lokales Datum (ohne Intl: läuft bis zu 120-mal je Aufruf)
const keyOf = d => DAYS[(d.getDay() + 6) % 7];
const hm = d => p2(d.getHours()) + ":" + p2(d.getMinutes());
const tm = s => s.replace(/^0(\d)/, "$1");
const span = r => tm(r[0]) + "–" + tm(r[1]);

// Alles, was aus info.js berechnet wird; Texte über t() in der aktuellen Sprache
function auswerten(I, lang) {
  const dayRanges = k => ((I.zeiten || {})[k] || []).filter(r => r && HM.test(r[0]) && HM.test(r[1]) && r[0] < r[1]).sort();
  const hasHours = DAYS.some(k => dayRanges(k).length);
  const hinweis = ((I.hinweis && (I.hinweis[lang] || I.hinweis.de)) || "").trim();
  const closures = (I.schliessungen || []).filter(c => c && ISO.test(c.von))
    .map(c => Object.assign({}, c, { bis: ISO.test(c.bis || "") && c.bis >= c.von ? c.bis : c.von }))
    .sort((a, b) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0));
  const closedOn = s => closures.find(c => c.von <= s && s <= c.bis);
  const label = c => ((c[lang] || c.de || "") + "").trim() || t(c.art === "abwesend" ? "abwesend" : "ferien");
  function dd(s, year) {
    const [y, m, d] = s.split("-");
    const short = lang === "it" ? `${+d}/${+m}` : `${+d}.${+m}.`;
    return year ? (lang === "it" ? `${short}/${y}` : `${short}${y}`) : short;
  }
  function rangeText(c) {
    const yr = c.bis.slice(0, 4) !== String(new Date().getFullYear());
    if (c.von === c.bis) {
      const d = new Date(c.von + "T12:00:00");
      return t("ws_" + keyOf(d)) + ", " + dd(c.von, yr);
    }
    return dd(c.von, c.von.slice(0, 4) !== c.bis.slice(0, 4)) + "–" + dd(c.bis, yr);
  }
  // Datum, dazu „geschlossen“, sofern der Name es nicht schon sagt
  const closedText = c => rangeText(c) + (label(c) === t("abwesend") ? "" : " · " + t("closed"));
  // Nächste Öffnung ab jetzt (Schließtage übersprungen, höchstens 120 Tage voraus)
  function nextOpen(now) {
    const nowHm = hm(now);
    for (let i = 0; i <= 120; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
      if (closedOn(iso(d))) continue;
      const r = dayRanges(keyOf(d)).find(x => i > 0 || x[0] > nowHm);
      if (r) return { d, r, i };
    }
    return null;
  }
  function when(n) {
    const tt = tm(n.r[0]), w = t("wd_" + keyOf(n.d));
    if (n.i === 1) return t("wTomorrow", { t: tt });
    return n.i <= 6 ? t("wDay", { w, t: tt }) : t("wDate", { w, d: dd(iso(n.d)), t: tt });
  }
  function status(now) {
    const today = iso(now), nowHm = hm(now), c = closedOn(today);
    const again = () => { const n = hasHours && nextOpen(now); return n ? t("again", { w: when(n) }) : ""; };
    if (c) return { k: "zu", t: t("closedToday"), sub: [label(c) === t("abwesend") ? "" : label(c), again()].filter(Boolean).join(" · ") };
    if (!hasHours) return null;
    const rs = dayRanges(keyOf(now)), all = t("today") + " " + rs.map(span).join(", ");
    const cur = rs.find(r => r[0] <= nowHm && nowHm < r[1]);
    if (cur) return { k: "auf", t: t("openNow"), sub: rs.length > 1 ? all : t("until", { t: tm(cur[1]) }) };
    const later = rs.find(r => nowHm < r[0]);
    if (later) return { k: "spaeter", t: t("openLater", { t: tm(later[0]) }), sub: all };
    return { k: "zu", t: t("closedNow"), sub: again() };
  }
  return { dayRanges, hasHours, hinweis, closures, closedOn, label, rangeText, closedText, status };
}

// Jede Minute (und beim Zurückkehren in den Tab) neu berechnen
function useJetzt() {
  const [, setN] = React.useState(0);
  React.useEffect(() => {
    const tick = () => { if (!document.hidden) setN(n => n + 1); };
    const id = setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, []);
  return new Date();
}

export function InfoKarte({ I, onOpen }) {
  const { lang } = useSprache();
  const now = useJetzt();
  const A = I ? auswerten(I, lang) : null;
  const today = iso(now);
  const st = A && A.status(now);
  const active = A && A.closedOn(today);
  const soonLimit = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21, 12));
  const soon = A && A.closures.find(c => c !== active && c.bis >= today && c.von <= soonLimit);
  const zeigen = !!A && !!(st || soon || A.closures.some(c => c.bis >= today) || A.hinweis);
  // Für den nächsten Besuch merken, ob eine Karte kommt (Platzhalter, kopf.js); Vorschau zählt nicht
  React.useEffect(() => {
    if (!VORSCHAU && store.get("dsm-info-karte") !== (zeigen ? "1" : "0")) store.set("dsm-info-karte", zeigen ? "1" : "0");
  }, [zeigen]);
  if (!zeigen) return <section className="wrap info" id="info" hidden />;
  const Chev = <ChevronRightIcon aria-hidden="true" strokeWidth={1.6} className="go size-4 shrink-0 text-muted-foreground" />;
  return (
    <section className="wrap info pb-4" id="info">
      {/* Kein aria-label: Bildschirmleser lesen den Status selbst, der Hinweis aufs Fenster steht unsichtbar dahinter */}
      <button type="button" className="info-card karte grid w-full p-0 text-left transition-transform duration-150 ease-dsm active:scale-[.99]" aria-haspopup="dialog" onClick={onOpen}>
        {st ? (
          <Zeile><i className={cn("dot", st.k !== "auf" && st.k)} /><Text b={st.t} small={st.sub} />{Chev}</Zeile>
        ) : (
          <Zeile><Text b={t(A.hasHours ? "infoT" : "closuresT")} />{Chev}</Zeile>
        )}
        {soon ? <Zeile><i className={cn("bar-c", soon.art === "abwesend" && "abwesend")} /><Text b={A.label(soon)} small={A.closedText(soon)} /></Zeile> : null}
        <span className="sr-only">{t("infoOpen")}</span>
      </button>
    </section>
  );
}
const Zeile = ({ children }) => <span className="info-line flex min-w-0 items-center gap-3 border-t border-border px-4 py-3 first:border-t-0">{children}</span>;
const Text = ({ b, small }) => (
  <span className="tx min-w-0 flex-1">
    <b className="block font-medium">{b}</b>
    {small ? <small className="block text-s text-muted-foreground">{small}</small> : null}
  </span>
);

// Fenster mit allen Zeiten und Schließtagen
export function InfoFenster({ I, open, onOpenChange }) {
  const { lang } = useSprache();
  const now = useJetzt();
  if (!I) return null;
  const A = auswerten(I, lang), today = iso(now), tk = keyOf(now);
  const shown = DAYS.filter((k, n) => n < 5 || A.dayRanges(k).length);
  const fut = A.closures.filter(c => c.bis >= today).slice(0, 10);
  const zelle = "m-0 border-t border-border py-[9px] tabular-nums";
  return (
    <Fenster open={open} onOpenChange={onOpenChange} name="Öffnungszeiten" titleId="info-t" className="info-fenster">
      <div className="pane">
        <DialogTitle id="info-t" asChild><h3>{t("infoT")}</h3></DialogTitle>
        {A.hinweis ? <p className="hint m-0">{A.hinweis}</p> : null}
        {A.hasHours ? (
          <section>
            <dl className="week m-0 grid grid-cols-[max-content_1fr]">
              {shown.map(k => {
                const rs = A.dayRanges(k), heute = k === tk;
                return (
                  <React.Fragment key={k}>
                    <dt className={cn(zelle, "pr-5 text-muted-foreground", heute && "heute font-semibold text-foreground")}>{t("wd_" + k)}</dt>
                    <dd className={cn(zelle, heute && "heute font-semibold", !rs.length && "zu text-muted-foreground")}>{rs.length ? rs.map(span).join(", ") : t("closed")}</dd>
                  </React.Fragment>
                );
              })}
            </dl>
          </section>
        ) : null}
        <section className="grid gap-1">
          <h4 className="m-0 mb-1.5 text-s font-medium text-muted-foreground">{t("closuresT")}</h4>
          {fut.length ? (
            <ul className="closures m-0 grid list-none gap-2 p-0">
              {fut.map((c, n) => (
                <li key={n} className="flex gap-3 rounded-2xl px-4 py-3 [background:var(--gb-bot)] shadow-[inset_0_0_0_1px_var(--line)]">
                  <i className={cn("bar-c", c.art === "abwesend" && "abwesend")} />
                  <span className="grid min-w-0 gap-0.5">
                    <b className="font-semibold">{A.label(c)}</b>
                    <small className="text-s text-muted-foreground tabular-nums">{A.rangeText(c)} · {t(c.art === "abwesend" ? "artAbw" : "artFerien")}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="note m-0 text-s text-muted-foreground">{t("noClosures")}</p>}
        </section>
      </div>
    </Fenster>
  );
}
