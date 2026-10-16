/* Buchempfehlungen über der Liste (höchstens 4 der gewählten Gruppe), Fenster „Bisherige Empfehlungen“,
   Abschnitt in den Einstellungen und die Fragen beim ersten Besuch.
   Daten: empfehlungen.js (window.DSM_EMPFEHLUNGEN) oder Vorschau aus der Verwaltung. */
import * as React from "react";
import { ChevronRightIcon, XIcon } from "lucide-react";

import { Abschnitt, Option } from "@/components/einstellungen";
import { Fenster } from "@/components/fenster";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { log } from "@/lib/speicher";
import { hinweis } from "@/lib/hinweis";
import { woerter, useSprache, t as tx } from "@/lib/sprache";
import { Cover } from "@/bibliothek/cover";
import { useWahl, setWahl, getWahl } from "@/bibliothek/wahl";

woerter({
  de: {
    recsT: "Empfehlungen", recsClose: "Empfehlungen ausblenden",
    recsOff: "Empfehlungen ausgeblendet. Über die Einstellungen lassen sie sich wieder einschalten.",
    askNo: "Alles klar. Empfehlungen lassen sich jederzeit in den Einstellungen einschalten.",
    g_mittelstufe: "Mittelstufe", g_oberstufe: "Oberstufe", g_erw: "Erwachsenenliteratur", g_erwShort: "Erwachsene",
    "g_erw-roman": "Romane", "g_erw-sach": "Sachbücher", "g_erw-bio": "Biografien & Geschichte",
    d_mittelstufe: "Jugendromane und erste Klassiker", d_oberstufe: "Romane und Klassiker für Fortgeschrittene", d_erw: "In drei Kernbereichen",
    "d_erw-roman": "Erzählende Literatur", "d_erw-sach": "Natur, Gesellschaft, Technik", "d_erw-bio": "Lebensgeschichten und Zeitgeschichte",
    askT1: "Buchempfehlungen", askP1: "Möchten Sie Buchempfehlungen sehen?", yes: "Ja, gerne", no: "Nein, danke",
    askT2: "Für wen?", askP2: "Wählen Sie die passende Stufe.", askT3: "Welcher Bereich?", askP3: "Erwachsenenliteratur in drei Kernbereichen.", back: "Zurück",
    sRecs: "Buchempfehlungen", sRecsShow: "Empfehlungen anzeigen", sRecsShowH: "Drei bis vier ausgewählte Bücher über der Liste.",
    sRecsFor: "Empfehlungen für",
    arcT: "Bisherige Empfehlungen", arcOpen: "Alle bisherigen Empfehlungen", arcNow: "Aktuell", arcGone: "Nicht mehr im Bestand",
  },
  it: {
    recsT: "Consigli di lettura", recsClose: "Nascondi i consigli",
    recsOff: "Consigli nascosti. Puoi riattivarli nelle impostazioni.",
    askNo: "D'accordo. Puoi attivare i consigli in qualsiasi momento nelle impostazioni.",
    g_mittelstufe: "Livello intermedio", g_oberstufe: "Livello superiore", g_erw: "Letteratura per adulti", g_erwShort: "Adulti",
    "g_erw-roman": "Romanzi", "g_erw-sach": "Saggistica", "g_erw-bio": "Biografie e storia",
    d_mittelstufe: "Romanzi per ragazzi e primi classici", d_oberstufe: "Romanzi e classici per lettori esperti", d_erw: "In tre aree principali",
    "d_erw-roman": "Narrativa", "d_erw-sach": "Natura, società, tecnica", "d_erw-bio": "Vite e storia contemporanea",
    askT1: "Consigli di lettura", askP1: "Desidera vedere dei consigli di lettura?", yes: "Sì, volentieri", no: "No, grazie",
    askT2: "Per chi?", askP2: "Scelga il livello adatto.", askT3: "Quale area?", askP3: "Letteratura per adulti in tre aree principali.", back: "Indietro",
    sRecs: "Consigli di lettura", sRecsShow: "Mostra i consigli", sRecsShowH: "Da tre a quattro libri scelti sopra l'elenco.",
    sRecsFor: "Consigli per",
    arcT: "Consigli precedenti", arcOpen: "Tutti i consigli precedenti", arcNow: "Attuali", arcGone: "Non più in catalogo",
  },
});

const C = () => window.DSMCovers;
const still = matchMedia("(prefers-reduced-motion: reduce)");
export const gLabel = g => (g.startsWith("erw-") ? tx("g_erw") + " · " + tx("g_" + g) : tx("g_" + g));
const FARBE = { mittelstufe: "--gelb", oberstufe: "--orange", erw: "--mauve", "erw-roman": "--rot", "erw-sach": "--gruen", "erw-bio": "--blau" };
const Balken = ({ g }) => <i className="bar-c" style={{ background: `var(${FARBE[g]})` }} />;

// Cover mehrerer Bücher mit einer Sammelabfrage holen; Ergebnis je Buch (undefined = läuft)
function useCoverListe(books, an = true) {
  const [found, setFound] = React.useState([]);
  React.useEffect(() => {
    setFound([]);
    if (!an || !books.length) return undefined;
    let aktuell = true;
    C().prime(books).then(res => { if (aktuell) setFound(res.map(f => f || null)); });
    return () => { aktuell = false; };
  }, [books, an]);
  return found;
}

// ---------- Karte über der Liste ----------
export function Empfehlungen({ R, byKey, geladen, onOpen, onArchiv }) {
  const { t } = useSprache();
  const p = useWahl();
  const [weg, setWeg] = React.useState(false);
  const gewaehlt = !!(p && p.want && p.gruppe);
  const shown = React.useMemo(() => (geladen && gewaehlt ? ((R.gruppen && R.gruppen[p.gruppe]) || []).map(r => ({ r, b: byKey.get(r.k) })).filter(x => x.b).slice(0, 4) : []),
    [R, byKey, geladen, gewaehlt, p]);
  const books = React.useMemo(() => shown.map(x => x.b), [shown]);
  const found = useCoverListe(books);
  const geloggt = React.useRef(null);
  React.useEffect(() => {
    if (!shown.length) { geloggt.current = null; return; }
    if (p.gruppe !== geloggt.current) { geloggt.current = p.gruppe; log("Empfehlung", `${gLabel(p.gruppe)}: ${shown.length} Bücher`, { Bücher: books.map(b => b.t).join(" · ") }); }
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (gewaehlt) setWeg(false); }, [gewaehlt]);

  const ausblenden = () => {
    setWeg(true);
    setTimeout(() => setWahl({ want: false, gruppe: (getWahl() || {}).gruppe || null }), still.matches ? 0 : 300);
    hinweis(t("recsOff"));
  };

  // Während books.js lädt: Platzhalter an der Stelle der Empfehlungen (nur wenn welche gewählt sind)
  if (!geladen) {
    return (
      <section className="wrap recs pb-4" id="recs" hidden={!gewaehlt} aria-hidden="true">
        <div className="recs-card skel relative overflow-hidden bg-surface pt-3.5 pb-4 sm:rounded-[20px] sm:p-4">
          <div className="recs-head flex items-center gap-3 pr-2.5 pl-[max(16px,env(safe-area-inset-left,0px))] sm:p-0"><Skeleton /></div>
          <div className="mt-2 grid px-[max(16px,env(safe-area-inset-left,0px))] sm:mt-3.5 sm:grid-cols-4 sm:gap-3.5 sm:px-0">
            {[0, 1, 2, 3].map(n => (
              <div key={n} className="rec grid grid-cols-[40px_1fr] items-center gap-3.5 border-t border-border py-2.5 first:border-t-0 sm:block sm:border-0 sm:p-0">
                <div className="cover small" /><Skeleton />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  if (!shown.length) return <section className="wrap recs" id="recs" hidden />;
  return (
    <section className="wrap recs pb-4" id="recs" aria-labelledby="recs-title">
      <div className={cn("recs-card relative overflow-hidden bg-surface pt-3.5 pb-4 sm:rounded-[20px] sm:p-4", weg && "hide")}>
        <div className="recs-head flex items-center justify-between gap-3 pr-2.5 pl-[max(16px,env(safe-area-inset-left,0px))] sm:p-0">
          <h2 id="recs-title" className="m-0 min-w-0 text-m font-semibold leading-[1.2]">
            {/* Kopf öffnet die bisherigen Empfehlungen */}
            <button
              type="button" id="recs-open" aria-haspopup="dialog" title={t("arcOpen")} onClick={onArchiv}
              className="group/kopf -mx-2 -my-1.5 grid gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-background active:bg-background"
            >
              <span className="inline-flex items-center gap-1">
                {t("recsT")}
                <ChevronRightIcon aria-hidden="true" className="size-3.5 text-muted-foreground transition-transform duration-150 group-hover/kopf:translate-x-0.5" />
              </span>
              <small className="text-s font-normal text-muted-foreground">{gLabel(p.gruppe)}</small>
            </button>
          </h2>
          <Button variant="icon" size="icon-sm" id="recs-x" aria-label={t("recsClose")} onClick={ausblenden}><XIcon aria-hidden="true" /></Button>
        </div>
        <div className="recs-row mt-2 grid px-[max(16px,env(safe-area-inset-left,0px))] sm:mt-3.5 sm:grid-cols-4 sm:gap-3.5 sm:px-0 sm:pt-0.5">
          {shown.map((x, n) => (
            <button
              key={x.r.k} type="button" onClick={() => onOpen(x.b, x.r)}
              className="rec group/rec grid min-w-0 grid-cols-[40px_1fr] items-center gap-3.5 border-t border-border py-2.5 text-left transition-opacity first:border-t-0 active:opacity-60 sm:flex sm:flex-col sm:justify-start sm:border-0 sm:p-0 sm:active:opacity-100"
            >
              <Cover
                small titel={x.b.t} isbn={!!x.b.i} found={found[n]}
                className="shadow-[0_3px_8px_rgba(0,0,0,.14)] transition-[translate,box-shadow] duration-[250ms] ease-dsm sm:shadow-[0_6px_16px_rgba(0,0,0,.14)] sm:group-hover/rec:-translate-y-[3px] sm:group-hover/rec:shadow-[0_12px_24px_rgba(0,0,0,.18)]"
              />
              <span className="rt min-w-0">
                <b className="text-m font-medium leading-[1.3] sm:mt-[9px]">{x.b.t}</b>
                <span className="mt-0.5 block truncate text-s text-muted-foreground">{(x.b.a || [])[0] || ""}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Bisherige Empfehlungen: aktuelle Runde und Archiv, neueste zuerst, nur die gewählte Gruppe ----------
export function Archiv({ open, onOpenChange, R, byKey, onOpen }) {
  const { t, df, lang } = useSprache();
  const p = useWahl() || {}, g = p.gruppe;
  const runden = React.useMemo(() => {
    const all = [{ stand: R.stand, thema: R.thema, gruppen: R.gruppen, now: true }].concat(Array.isArray(R.archiv) ? R.archiv : []);
    return all.map(x => ({ ...x, recs: ((x.gruppen && x.gruppen[g]) || []).map(r => ({ r, b: byKey.get(r.k) })) })).filter(x => x.recs.length);
  }, [R, byKey, g]);
  return (
    <Fenster open={open} onOpenChange={onOpenChange} name="Bisherige Empfehlungen" titleId="arc-t" className="archiv">
      <div className="pane gap-[18px]">
        <div>
          <DialogTitle id="arc-t" asChild><h3>{t("arcT")}</h3></DialogTitle>
          <p className="sub mt-1 mb-0 text-muted-foreground">{g ? gLabel(g) : ""}</p>
        </div>
        <ol className="arc m-0 grid list-none p-0">
          {runden.map((x, n) => (
            <Runde key={(x.stand || "") + n} x={x} n={n} thema={x.thema && (x.thema[lang] || x.thema.de)} df={df} t={t} lang={lang} onOpen={onOpen} />
          ))}
        </ol>
      </div>
    </Fenster>
  );
}

// Eine Runde der Zeitleiste; Cover erst laden, wenn sie in Sichtweite kommt
function Runde({ x, n, thema, df, t, lang, onOpen }) {
  const li = React.useRef(null);
  const [sichtbar, setSichtbar] = React.useState(false);
  React.useEffect(() => {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setSichtbar(true); io.disconnect(); } },
      { root: li.current.closest("[role=dialog]"), rootMargin: "200px 0px" });
    io.observe(li.current);
    return () => io.disconnect();
  }, []);
  const books = React.useMemo(() => x.recs.filter(it => it.b).map(it => it.b), [x]);
  const found = useCoverListe(books, sichtbar);
  return (
    <li ref={li} className={cn("arc-round relative pb-[22px] pl-[22px]", x.now && "now")} style={{ "--i": Math.min(n, 8) }}>
      <div className="arc-hd mb-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <time className="font-semibold tabular-nums" dateTime={x.stand || ""}>{df(x.stand)}</time>
        {x.now ? <span className="arc-now text-s text-muted-foreground">{t("arcNow")}</span> : null}
        {thema ? <b className="basis-full font-medium">{thema}</b> : null}
      </div>
      {x.recs.map((it, k) => {
        const txt = it.r[lang] || it.r.de || "";
        const inner = (
          <>
            <Cover small titel={it.b ? it.b.t : it.r.t} isbn={!!(it.b && it.b.i)} found={it.b ? found[books.indexOf(it.b)] : null} className="shadow-[0_3px_8px_rgba(0,0,0,.14)]" />
            <span className="rt grid min-w-0 gap-0.5">
              <b className="font-medium [overflow-wrap:anywhere]">{it.b ? it.b.t : it.r.t}</b>
              <span className="text-s text-muted-foreground">{it.b ? (it.b.a || [])[0] || "" : it.r.a || ""}</span>
              {it.b ? null : <small className="text-s text-muted-foreground">{t("arcGone")}</small>}
              {txt ? <p className="mt-1 mb-0 text-s leading-normal">{txt}</p> : null}
            </span>
          </>
        );
        const cls = "arc-item grid w-full grid-cols-[40px_1fr] items-start gap-3.5 border-t border-border py-3 text-left";
        return it.b
          ? <button key={k} type="button" className={cn(cls, "transition-opacity active:opacity-60")} onClick={() => onOpen(it.b, it.r)}>{inner}</button>
          : <div key={k} className={cn(cls, "gone [&_.cover]:opacity-50")}>{inner}</div>;
      })}
    </li>
  );
}

// ---------- Einstellungen: Abschnitt Buchempfehlungen ----------
const box = "grid overflow-hidden rounded-xl bg-surface shadow-[inset_0_0_0_1px_var(--line)]";
export function EmpfEinstellungen() {
  const { t } = useSprache();
  const p = useWahl() || {};
  const opt = g => (
    <RadioGroupItem value={g} data-g={g}>
      <Balken g={g} />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <b className="font-medium group-data-[state=checked]/opt:font-semibold">{t("g_" + g)}</b>
        <small className="text-s text-muted-foreground">{t("d_" + g)}</small>
      </span>
    </RadioGroupItem>
  );
  return (
    <Abschnitt titel={t("sRecs")}>
      <Option id="s-recs" titel={t("sRecsShow")} hilfe={t("sRecsShowH")} checked={!!p.want} onCheckedChange={v => setWahl({ want: v, gruppe: p.gruppe || "mittelstufe" })} />
      <RadioGroup className="gpick pt-1.5" aria-label={t("sRecsFor")} hidden={!p.want} value={p.gruppe || ""} onValueChange={g => setWahl({ want: true, gruppe: g })}>
        <div className={box}>{opt("mittelstufe")}</div>
        <div className={box}>{opt("oberstufe")}</div>
        <div>
          <span className="block px-0.5 pt-1 pb-1.5 text-s text-muted-foreground">{t("g_erw")}</span>
          <div className={box}>{opt("erw-roman")}{opt("erw-sach")}{opt("erw-bio")}</div>
        </div>
      </RadioGroup>
    </Abschnitt>
  );
}

// ---------- Fragen beim ersten Besuch ----------
export function Fragen({ open, onOpenChange }) {
  const { t } = useSprache();
  const [step, setStep] = React.useState(1);
  const fertig = React.useRef(false);
  const pane = React.useRef(null);
  // Fokus auf die Hauptwahl jedes Schritts (statt auf den Schließen-Knopf)
  const fokus = () => { const f = pane.current && pane.current.querySelector(".primary, .choice"); if (f) f.focus({ preventScroll: true }); };
  React.useEffect(() => { if (open) fokus(); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const wechsel = an => {
    if (!an && !fertig.current) { setWahl({ want: false, gruppe: null }); hinweis(t("askNo")); }
    onOpenChange(an);
  };
  const waehlen = g => {
    fertig.current = true;
    setWahl({ want: true, gruppe: g });
    onOpenChange(false);
    setTimeout(() => scrollTo({ top: 0, behavior: still.matches ? "instant" : "smooth" }), 230);
  };
  const choice = g => (
    <button
      type="button" key={g} data-g={g} onClick={() => (g === "erw" ? setStep(3) : waehlen(g))}
      className="choice flex w-full items-center justify-between gap-3 rounded-2xl border border-glass-brd px-[18px] py-4 text-left text-foreground transition-[transform,box-shadow] duration-150 ease-dsm [background:linear-gradient(180deg,var(--gb-top),var(--gb-bot))] shadow-[inset_0_1px_0_var(--glass-hi),0_2px_10px_rgba(0,0,0,.06)] hover:shadow-[inset_0_1px_0_var(--glass-hi),0_6px_18px_rgba(0,0,0,.1)] active:scale-[.985]"
    >
      <Balken g={g} />
      <span className="min-w-0 flex-1">
        <b className="block font-semibold">{t("g_" + g)}</b>
        <small className="mt-0.5 block text-s text-muted-foreground">{t("d_" + g)}</small>
      </span>
      <ChevronRightIcon aria-hidden="true" className="size-[18px] shrink-0 text-muted-foreground" />
    </button>
  );
  const zurueck = (
    <div>
      <Button variant="ghost" size="text" data-a="back" onClick={() => setStep(step === 3 ? 2 : 1)}>← {t("back")}</Button>
    </div>
  );
  return (
    <Fenster
      open={open} onOpenChange={wechsel} name="Fragen beim ersten Besuch" titleId="ask-t" className="ask"
      onOpenAutoFocus={e => { e.preventDefault(); requestAnimationFrame(fokus); }}
    >
      <div className="pane min-h-60" ref={pane}>
        <div className="step grid gap-[18px]" key={step}>
          <DialogTitle id="ask-t" asChild><h3>{t("askT" + step)}</h3></DialogTitle>
          <p className="lead m-0 text-muted-foreground">{t("askP" + step)}</p>
          {step === 1 ? (
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="glass" size="lg" data-a="no" onClick={() => wechsel(false)}>{t("no")}</Button>
              <Button variant="glass-primary" size="lg" className="primary" data-a="yes" onClick={() => setStep(2)}>{t("yes")}</Button>
            </div>
          ) : (
            <>
              <div className="grid gap-2.5">{(step === 2 ? ["mittelstufe", "oberstufe", "erw"] : ["erw-roman", "erw-sach", "erw-bio"]).map(choice)}</div>
              {zurueck}
            </>
          )}
        </div>
      </div>
    </Fenster>
  );
}
