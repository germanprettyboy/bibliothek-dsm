/* Book recommendations above the list (at most 4 of the chosen group), dialog "Previous recommendations",
   section in the settings and the questions on the first visit.
   Data: recommendations.js (window.DSM_RECOMMENDATIONS) or the preview from the admin page. */
import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";

import { Section, Option } from "@/components/settings";
import { GlassDialog } from "@/components/glass-dialog";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { log } from "@/lib/storage";
import { notify } from "@/lib/notice";
import { useSwipe } from "@/lib/swipe";
import { C, reduced } from "@/lib/environment";
import { addStrings, useLanguage, t as tx } from "@/lib/language";
import { Cover } from "@/library/cover";
import { useChoice, setChoice, getChoice } from "@/library/choice";

addStrings({
  de: {
    recsT: "Empfehlungen", recsClose: "Empfehlungen ausblenden",
    recsOff: "Empfehlungen ausgeblendet. Über die Einstellungen lassen sie sich wieder einschalten.",
    askNo: "Empfehlungen ausgeschaltet. Sie lassen sich jederzeit in den Einstellungen wieder einschalten.",
    g_middle: "Mittelstufe", g_upper: "Oberstufe", g_adult: "Erwachsenenliteratur", g_adultShort: "Erwachsene",
    "g_adult-fiction": "Romane", "g_adult-nonfiction": "Sachbücher", "g_adult-bio": "Biografien & Geschichte",
    d_middle: "Jugendromane und erste Klassiker", d_upper: "Romane und Klassiker für Fortgeschrittene", d_adult: "In drei Kernbereichen",
    "d_adult-fiction": "Erzählende Literatur", "d_adult-nonfiction": "Natur, Gesellschaft, Technik", "d_adult-bio": "Lebensgeschichten und Zeitgeschichte",
    askT1: "Buchempfehlungen", askP1: "Möchten Sie Buchempfehlungen sehen?",
    askH1: "Drei bis vier ausgewählte Bücher über der Liste, passend zur Stufe. Jederzeit in den Einstellungen änderbar.", yes: "Ja, gerne", no: "Nein, danke",
    askT2: "Für wen?", askP2: "Wählen Sie die passende Stufe.", askT3: "Welcher Bereich?", askP3: "Erwachsenenliteratur in drei Kernbereichen.", back: "Zurück",
    sRecs: "Buchempfehlungen", sRecsShow: "Empfehlungen anzeigen", sRecsShowH: "Drei bis vier ausgewählte Bücher über der Liste.",
    sRecsFor: "Empfehlungen für",
    arcT: "Bisherige Empfehlungen", arcOpen: "Alle bisherigen Empfehlungen", arcNow: "Aktuell", arcGone: "Nicht mehr im Bestand",
  },
  it: {
    recsT: "Consigli di lettura", recsClose: "Nascondi i consigli",
    recsOff: "Consigli nascosti. Puoi riattivarli nelle impostazioni.",
    askNo: "Consigli disattivati. Si possono riattivare in qualsiasi momento nelle impostazioni.",
    g_middle: "Livello intermedio", g_upper: "Livello superiore", g_adult: "Letteratura per adulti", g_adultShort: "Adulti",
    "g_adult-fiction": "Romanzi", "g_adult-nonfiction": "Saggistica", "g_adult-bio": "Biografie e storia",
    d_middle: "Romanzi per ragazzi e primi classici", d_upper: "Romanzi e classici per lettori esperti", d_adult: "In tre aree principali",
    "d_adult-fiction": "Narrativa", "d_adult-nonfiction": "Natura, società, tecnica", "d_adult-bio": "Vite e storia contemporanea",
    askT1: "Consigli di lettura", askP1: "Desidera vedere dei consigli di lettura?",
    askH1: "Da tre a quattro libri scelti sopra l'elenco, adatti al livello. Modificabile in qualsiasi momento nelle impostazioni.", yes: "Sì, volentieri", no: "No, grazie",
    askT2: "Per chi?", askP2: "Scelga il livello adatto.", askT3: "Quale area?", askP3: "Letteratura per adulti in tre aree principali.", back: "Indietro",
    sRecs: "Consigli di lettura", sRecsShow: "Mostra i consigli", sRecsShowH: "Da tre a quattro libri scelti sopra l'elenco.",
    sRecsFor: "Consigli per",
    arcT: "Consigli precedenti", arcOpen: "Tutti i consigli precedenti", arcNow: "Attuali", arcGone: "Non più in catalogo",
  },
});

export const gLabel = g => (g.startsWith("adult-") ? tx("g_adult") + " · " + tx("g_" + g) : tx("g_" + g));
const COLOR = { middle: "--yellow", upper: "--orange", adult: "--mauve", "adult-fiction": "--red", "adult-nonfiction": "--green", "adult-bio": "--blue" };
const ColorBar = ({ g }) => <i className="bar-c" style={{ background: `var(${COLOR[g]})` }} />;

// Fetch the covers of several books with one batch request; result per book (undefined = running)
function useCoverList(books, on = true) {
  const [found, setFound] = React.useState([]);
  React.useEffect(() => {
    setFound([]);
    if (!on || !books.length) return undefined;
    let current = true;
    C().prime(books).then(res => { if (current) setFound(res.map(f => f || null)); });
    return () => { current = false; };
  }, [books, on]);
  return found;
}

// ---------- Card above the list ----------
export function Recommendations({ R, byKey, loaded, onOpen, onArchive, onSettings }) {
  const { t } = useLanguage();
  const p = useChoice();
  const [gone, setGone] = React.useState(false);
  const chosen = !!(p && p.want && p.group);
  const shown = React.useMemo(() => (loaded && chosen ? ((R.groups && R.groups[p.group]) || []).map(r => ({ r, b: byKey.get(r.k) })).filter(x => x.b).slice(0, 4) : []),
    [R, byKey, loaded, chosen, p]);
  const books = React.useMemo(() => shown.map(x => x.b), [shown]);
  const found = useCoverList(books);
  const logged = React.useRef(null);
  React.useEffect(() => {
    if (!shown.length) { logged.current = null; return; }
    if (p.group !== logged.current) { logged.current = p.group; log("Recommendation", `${gLabel(p.group)}: ${shown.length} books`, { Books: books.map(b => b.t).join(" · ") }); }
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (chosen) setGone(false); }, [chosen]);

  const hide = () => {
    setGone(true);
    setTimeout(() => setChoice({ want: false, group: (getChoice() || {}).group || null }), reduced.matches ? 0 : 300);
    notify(t("recsOff"), onSettings);
  };

  // While books.js loads: placeholder in place of the recommendations (only if some are chosen)
  if (!loaded) {
    return (
      <section className="wrap recs pb-4" id="recs" hidden={!chosen} aria-hidden="true">
        <div className="recs-card card skel relative overflow-hidden p-4">
          <div className="recs-head flex items-center gap-3"><Skeleton /></div>
          <div className="mt-2 grid sm:mt-4 sm:grid-cols-4 sm:gap-4">
            {[0, 1, 2, 3].map(n => (
              <div key={n} className="rec grid grid-cols-[44px_1fr] items-center gap-4 border-t border-border py-3 first:border-t-0 sm:block sm:border-0 sm:p-0">
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
      <div className={cn("recs-card card relative overflow-hidden p-4", gone && "hide")}>
        <div className="recs-head flex items-center justify-between gap-3">
          <h2 id="recs-title" className="m-0 min-w-0 text-m font-semibold leading-[1.2]">
            {/* The head opens the previous recommendations */}
            <button
              type="button" id="recs-open" aria-haspopup="dialog" title={t("arcOpen")} onClick={onArchive}
              className="group/head -mx-2 -my-1.5 grid gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-background active:bg-background"
            >
              <span className="inline-flex items-center gap-1">
                {t("recsT")}
                <ChevronRightIcon aria-hidden="true" className="size-3.5 text-muted-foreground transition-transform duration-150 group-hover/head:translate-x-0.5" />
              </span>
              <small className="text-s font-normal text-muted-foreground">{gLabel(p.group)}</small>
            </button>
          </h2>
          <Button variant="icon" size="icon-sm" className="-my-1 -mr-1" id="recs-x" aria-label={t("recsClose")} onClick={hide}><XIcon aria-hidden="true" /></Button>
        </div>
        <div className="recs-row mt-2 grid sm:mt-4 sm:grid-cols-4 sm:gap-4">
          {shown.map((x, n) => (
            <button
              key={x.r.k} type="button" onClick={() => onOpen(x.b, x.r)}
              className="rec group/rec grid min-w-0 grid-cols-[44px_1fr] items-center gap-4 border-t border-border py-3 text-left transition-opacity first:border-t-0 active:opacity-60 sm:flex sm:flex-col sm:items-stretch sm:justify-start sm:border-0 sm:p-0 sm:active:opacity-100"
            >
              <Cover
                small title={x.b.t} isbn={!!x.b.i} found={found[n]}
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

// ---------- Previous recommendations: current round and archive, newest first, only the chosen group ----------
export function Archive({ open, onOpenChange, R, byKey, onOpen }) {
  const { t, df, lang } = useLanguage();
  const p = useChoice() || {}, g = p.group;
  const swipeRef = useSwipe(".scrim.swipe", () => onOpenChange(false));
  const rounds = React.useMemo(() => {
    const all = [{ updated: R.updated, topic: R.topic, groups: R.groups, now: true }].concat(Array.isArray(R.archive) ? R.archive : []);
    return all.map(x => ({ ...x, recs: ((x.groups && x.groups[g]) || []).map(r => ({ r, b: byKey.get(r.k) })) })).filter(x => x.recs.length);
  }, [R, byKey, g]);
  return (
    <GlassDialog open={open} onOpenChange={onOpenChange} name="Previous recommendations" titleId="arc-t" className="archive swipe" overlayClassName="swipe">
      <div className="pane" ref={swipeRef}>
        <div>
          <DialogTitle id="arc-t" asChild><h3>{t("arcT")}</h3></DialogTitle>
          <p className="sub mt-1 mb-0 text-muted-foreground">{g ? gLabel(g) : ""}</p>
        </div>
        <ol className="arc m-0 grid list-none p-0">
          {rounds.map((x, n) => (
            <Round key={(x.updated || "") + n} x={x} n={n} topic={x.topic && (x.topic[lang] || x.topic.de)} df={df} t={t} lang={lang} onOpen={onOpen} />
          ))}
        </ol>
      </div>
    </GlassDialog>
  );
}

// One round of the timeline; load covers only once it comes into view
function Round({ x, n, topic, df, t, lang, onOpen }) {
  const li = React.useRef(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    // Phone (swipe sheet): the pane scrolls, otherwise the dialog itself
    const pane = li.current.closest(".pane");
    const root = pane && getComputedStyle(pane).overflowY !== "visible" ? pane : li.current.closest("[role=dialog]");
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setVisible(true); io.disconnect(); } },
      { root, rootMargin: "200px 0px" });
    io.observe(li.current);
    return () => io.disconnect();
  }, []);
  const books = React.useMemo(() => x.recs.filter(it => it.b).map(it => it.b), [x]);
  const found = useCoverList(books, visible);
  return (
    <li ref={li} className={cn("arc-round relative pb-[22px] pl-[22px]", x.now && "now")} style={{ "--i": Math.min(n, 8) }}>
      <div className="arc-hd mb-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <time className="font-semibold tabular-nums" dateTime={x.updated || ""}>{df(x.updated)}</time>
        {x.now ? <span className="arc-now text-s text-muted-foreground">{t("arcNow")}</span> : null}
        {topic ? <b className="basis-full font-medium">{topic}</b> : null}
      </div>
      {x.recs.map((it, k) => {
        const txt = it.r[lang] || it.r.de || "";
        const inner = (
          <>
            <Cover small title={it.b ? it.b.t : it.r.t} isbn={!!(it.b && it.b.i)} found={it.b ? found[books.indexOf(it.b)] : null} className="shadow-[0_3px_8px_rgba(0,0,0,.14)]" />
            <span className="rt grid min-w-0 gap-0.5">
              <b className="font-medium [overflow-wrap:anywhere]">{it.b ? it.b.t : it.r.t}</b>
              <span className="text-s text-muted-foreground">{it.b ? (it.b.a || [])[0] || "" : it.r.a || ""}</span>
              {it.b ? null : <small className="text-s text-muted-foreground">{t("arcGone")}</small>}
              {txt ? <p className="mt-1 mb-0 text-s leading-normal">{txt}</p> : null}
            </span>
          </>
        );
        const cls = "arc-item grid w-full grid-cols-[44px_1fr] items-start gap-4 border-t border-border py-3 text-left";
        return it.b
          ? <button key={k} type="button" className={cn(cls, "transition-opacity active:opacity-60")} onClick={() => onOpen(it.b, it.r)}>{inner}</button>
          : <div key={k} className={cn(cls, "gone [&_.cover]:opacity-50")}>{inner}</div>;
      })}
    </li>
  );
}

// ---------- Settings: section book recommendations ----------
const box = "card grid overflow-hidden";
export function RecommendationSettings() {
  const { t } = useLanguage();
  const p = useChoice() || {};
  const opt = g => (
    <RadioGroupItem value={g} data-g={g}>
      <ColorBar g={g} />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <b className="font-medium group-data-[state=checked]/opt:font-semibold">{t("g_" + g)}</b>
        <small className="text-s text-muted-foreground">{t("d_" + g)}</small>
      </span>
    </RadioGroupItem>
  );
  return (
    <Section title={t("sRecs")}>
      <Option id="s-recs" title={t("sRecsShow")} help={t("sRecsShowH")} checked={!!p.want} onCheckedChange={v => setChoice({ want: v, group: p.group || "middle" })} />
      <RadioGroup className="gpick pt-1.5" aria-label={t("sRecsFor")} hidden={!p.want} value={p.group || ""} onValueChange={g => setChoice({ want: true, group: g })}>
        <div className={box}>{opt("middle")}</div>
        <div className={box}>{opt("upper")}</div>
        <div>
          <span className="block px-0.5 pt-1 pb-1.5 text-s text-muted-foreground">{t("g_adult")}</span>
          <div className={box}>{opt("adult-fiction")}{opt("adult-nonfiction")}{opt("adult-bio")}</div>
        </div>
      </RadioGroup>
    </Section>
  );
}

// ---------- Questions on the first visit ----------
// Bookshelf as the head of the first question: width, height and logo color per spine, the last one leans
const SHELF = [[14, 52, "--mauve"], [10, 60, "--yellow"], [16, 44, "--orange"], [12, 56, "--blue"], [18, 48, "--red"], [11, 58, "--green"], [14, 42, "--mauve", true]];
const Shelf = () => (
  <div className="shelf" aria-hidden="true">
    {SHELF.map(([b, h, c, leaning], n) => (
      <i key={n} className={leaning ? "leaning" : undefined} style={{ "--b": b + "px", "--h": h + "px", "--c": `var(${c})`, "--n": n }} />
    ))}
  </div>
);

export function Questions({ open, onOpenChange, onSettings }) {
  const { t } = useLanguage();
  const [step, setStep] = React.useState(1);
  const finished = React.useRef(false);
  const pane = React.useRef(null);
  const swipeRef = useSwipe(".scrim.swipe", () => change(false));
  const paneRef = React.useCallback(el => { pane.current = el; swipeRef(el); }, [swipeRef]);
  // On opening, focus on the dialog itself (a focused button would show the focus ring right away), on every
  // further step on its main choice (the ring then only appears after keyboard use)
  const focus = () => { const f = pane.current && pane.current.querySelector(".primary, .choice"); if (f) f.focus({ preventScroll: true }); };
  React.useEffect(() => { if (open && step > 1) focus(); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = on => {
    if (!on && !finished.current) { setChoice({ want: false, group: null }); notify(t("askNo"), onSettings); }
    onOpenChange(on);
  };
  const choose = g => {
    finished.current = true;
    setChoice({ want: true, group: g });
    onOpenChange(false);
    setTimeout(() => scrollTo({ top: 0, behavior: reduced.matches ? "instant" : "smooth" }), 230);
  };
  const choice = g => (
    <button
      type="button" key={g} data-g={g} onClick={() => (g === "adult" ? setStep(3) : choose(g))}
      className="choice flex min-h-[72px] w-full items-center justify-between gap-3.5 rounded-2xl border border-glass-brd px-4 py-3.5 text-left text-foreground transition-[transform,box-shadow] duration-150 ease-dsm [background:linear-gradient(180deg,var(--gb-top),var(--gb-bot))] shadow-[inset_0_1px_0_var(--glass-hi),0_2px_10px_rgba(0,0,0,.06)] hover:shadow-[inset_0_1px_0_var(--glass-hi),0_6px_18px_rgba(0,0,0,.1)] active:scale-[.985]"
    >
      <ColorBar g={g} />
      <span className="min-w-0 flex-1">
        <b className="block font-semibold">{t("g_" + g)}</b>
        <small className="mt-0.5 block text-s text-muted-foreground">{t("d_" + g)}</small>
      </span>
      <ChevronRightIcon aria-hidden="true" className="size-[18px] shrink-0 text-muted-foreground" />
    </button>
  );
  return (
    <GlassDialog
      open={open} onOpenChange={change} name="Questions on the first visit" titleId="ask-t" className="ask swipe" overlayClassName="swipe"
      onOpenAutoFocus={e => { e.preventDefault(); if (pane.current) pane.current.focus({ preventScroll: true }); }}
    >
      <div className="pane min-h-60 outline-none" ref={paneRef} tabIndex={-1}>
        <div className="step grid gap-5" key={step}>
          {/* Head: shelf on the first question, afterwards "Back" at the height of the close button */}
          {step === 1 ? <Shelf /> : (
            <div className="flex min-h-11 items-center">
              <Button variant="ghost" size="text" className="-ml-1 gap-1" data-a="back" onClick={() => setStep(step === 3 ? 2 : step - 1)}>
                <ChevronLeftIcon aria-hidden="true" />{t("back")}
              </Button>
            </div>
          )}
          <div className="grid gap-2">
            <DialogTitle id="ask-t" asChild><h3>{t("askT" + step)}</h3></DialogTitle>
            <p className={cn("lead m-0", step === 1 ? "font-medium" : "text-muted-foreground")}>{t("askP" + step)}</p>
            {step === 1 ? <p className="m-0 text-s text-muted-foreground">{t("askH1")}</p> : null}
          </div>
          {step === 1 ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Button variant="glass-primary" size="lg" className="primary" data-a="yes" onClick={() => setStep(2)}>{t("yes")}</Button>
              <Button variant="glass" size="lg" data-a="no" onClick={() => change(false)}>{t("no")}</Button>
            </div>
          ) : (
            <div className="grid gap-2.5">{(step === 2 ? ["middle", "upper", "adult"] : ["adult-fiction", "adult-nonfiction", "adult-bio"]).map(choice)}</div>
          )}
        </div>
      </div>
    </GlassDialog>
  );
}
