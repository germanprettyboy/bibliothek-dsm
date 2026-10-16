/* Bücherliste: Suche, A–Z-Leiste (ab Tablet), Buchstaben-Floater (Handy), Liste als reiner Text.
   Die Liste besteht aus Abschnitten zu höchstens 40 Büchern; jeder Buchstabe beginnt einen neuen (Anker ul#L-X).
   Per CSS (content-visibility) zeichnet der Browser nur Abschnitte in Sichtweite; für die übrigen steht eine aus
   der Textlänge geschätzte Höhe im Stil, bis sie einmal gezeichnet wurden. */
import * as React from "react";
import { flushSync } from "react-dom";
import { SearchIcon, XIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { log } from "@/lib/speicher";
import { woerter, useSprache } from "@/lib/sprache";
import { norm } from "@/bibliothek/daten";

woerter({
  de: {
    search: "Titel, Autor oder ISBN suchen", searchLabel: "Bücher durchsuchen", clear: "Suche löschen",
    index: "Alphabetischer Index", hits: "{n} Treffer", sorted: "Alphabetisch nach Titel",
    emptyT: "Kein Buch gefunden", emptyP: "Eine andere Schreibweise oder nur einen Teil des Titels versuchen.",
    noData: "Die Bücherliste konnte nicht geladen werden (books.js fehlt).",
  },
  it: {
    search: "Cerca titolo, autore o ISBN", searchLabel: "Cerca nei libri", clear: "Cancella ricerca",
    index: "Indice alfabetico", hits: "{n} risultati", hits1: "1 risultato", sorted: "In ordine alfabetico per titolo",
    emptyT: "Nessun libro trovato", emptyP: "Prova un'altra grafia o solo una parte del titolo.",
    noData: "Impossibile caricare l'elenco dei libri (manca books.js).",
  },
});

const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const lid = l => "L-" + (l === "#" ? "0" : l);
const CHUNK = 40;
const ERSTE = 2, STUFE = 20; // Abschnitte im ersten Bild, Abschnitte je weiterem Schritt
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const C = () => window.DSMCovers;
const still = matchMedia("(prefers-reduced-motion: reduce)");
const wide = matchMedia("(min-width: 48rem)");

// Treffer markieren: split mit Klammer im Ausdruck, ungerade Teile sind Treffer
function hl(text, re) {
  if (!re) return text;
  return String(text).split(re).map((p, n) => (n % 2 ? <mark key={n}>{p}</mark> : p));
}

// Geschätzte Höhe eines Abschnitts: Zeichen je Zeile für Titel (fs-m) und Autor (fs-s), grob über die mittlere Zeichenbreite
function sizer() {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const w = Math.max(160, Math.min(document.documentElement.clientWidth - 32, 46 * rem) - 40);
  const cT = w / (rem * .5), cA = w / (rem * .875 * .5);
  return (t, a) => 25 + rem * 1.35 * Math.ceil((t.length || 1) / cT) + (a ? 2 + rem * .875 * 1.5 * Math.ceil(a.length / cA) : 0);
}
function abschnitte(current) {
  const est = sizer(), out = [];
  let cur = null, last = null;
  for (const b of current) {
    if (b._l !== last || cur.items.length === CHUNK) {
      cur = { head: b._l !== last ? b._l : null, items: [], h: 0 };
      out.push(cur);
      last = b._l;
    }
    const a = b.a ? b.a.join(", ") : "";
    cur.items.push(b);
    cur.h += est(b.t, a);
  }
  return out;
}

// Ein Abschnitt; zeichnet nur neu, wenn sich Bücher oder Markierung ändern
const Abschnitt = React.memo(function Abschnitt({ head, items, h, re }) {
  return (
    <ul data-l={head || undefined} id={head ? lid(head) : undefined} style={{ containIntrinsicSize: `auto ${Math.round(h)}px` }}>
      {items.map(b => {
        const a = b.a ? b.a.join(", ") : "";
        return (
          <li key={b._i}>
            <button className="row" type="button" data-i={b._i}>
              <span className="t">{hl(b.t, re)}</span>
              {a ? <span className="a">{hl(a, re)}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
});

// Schneller animierter Sprung: feste kurze Dauer statt Browser-Smooth-Scroll (der bei langen Strecken trödelt).
// Das Ziel wird in jedem Schritt neu gemessen: Abschnitte, die unterwegs zum ersten Mal gezeichnet
// werden (content-visibility), weichen von ihrer geschätzten Höhe ab.
let glideId = 0;
function glide(el) {
  cancelAnimationFrame(glideId);
  const target = () => Math.max(0, Math.min(el.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0),
    document.documentElement.scrollHeight - innerHeight));
  const from = scrollY, d = target() - from;
  if (still.matches || Math.abs(d) < 2) { scrollTo({ top: target(), behavior: "instant" }); return; }
  const dur = Math.min(420, 200 + Math.abs(d) / 50), t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    scrollTo({ top: from + (target() - from) * (1 - Math.pow(1 - p, 3)), behavior: "instant" });
    if (p < 1) glideId = requestAnimationFrame(step);
  };
  glideId = requestAnimationFrame(step);
}
["wheel", "touchstart", "keydown"].forEach(t => addEventListener(t, () => cancelAnimationFrame(glideId), { passive: true }));

// Cover: Verbindungen zu den Diensten erst aufbauen, wenn das erste Cover gebraucht wird
let warmed = false;
function warm() {
  if (warmed) return; warmed = true;
  [["https://cover.ekz.de", false], ["https://openlibrary.org", true], ["https://covers.openlibrary.org", false]]
    .forEach(([href, cors]) => { const l = document.createElement("link"); l.rel = "preconnect"; l.href = href; if (cors) l.crossOrigin = ""; document.head.appendChild(l); });
}
export const prefetch = b => { if (b && b.i) { warm(); C().get(b); } };

export function Liste({ books, geladen, onOpen }) {
  const { lang, t, nf } = useSprache();
  const [q, setQ] = React.useState("");
  const [hatText, setHatText] = React.useState(false);
  const [live, setLive] = React.useState(false);
  const [enter, setEnter] = React.useState(true);
  const [stuck, setStuck] = React.useState(false);
  const [on, setOn] = React.useState(null);
  const input = React.useRef(null), bar = React.useRef(null), anchor = React.useRef(null), list = React.useRef(null), fl = React.useRef(null);
  const marks = React.useRef([]);

  const terms = React.useMemo(() => norm(q).split(" ").filter(Boolean), [q]);
  const re = React.useMemo(() => {
    const long = terms.filter(x => x.length > 1).sort((a, b) => b.length - a.length);
    return long.length ? new RegExp("(" + long.map(reEsc).join("|") + ")", "i") : null;
  }, [terms]);
  const current = React.useMemo(() => (terms.length ? books.filter(b => terms.every(x => b._s.includes(x))) : books), [books, terms]);
  const teile = React.useMemo(() => abschnitte(current), [current]);
  const present = React.useMemo(() => new Set(teile.filter(s => s.head).map(s => s.head)), [teile]);

  // Jede neue Liste schrittweise zeichnen: erst zwei Abschnitte (sofort sichtbar), dann je STUFE weitere, jeder
  // Schritt in einer eigenen Task (Eingaben kommen dazwischen dran). 4500 Zeilen auf einmal wären auf schwachen
  // Geräten ein sekundenlanger Block. Bewusst keine Transition: die bliebe bei laufenden Updates liegen.
  const [stand, setStand] = React.useState({ teile: null, n: ERSTE });
  const grenze = stand.teile === teile ? stand.n : ERSTE;
  React.useEffect(() => {
    if (!geladen || grenze >= teile.length) return undefined;
    const id = setTimeout(() => setStand({ teile, n: grenze + STUFE }), 0);
    return () => clearTimeout(id);
  }, [geladen, teile, grenze]);
  // A–Z-Sprung, bevor alles gezeichnet ist: Rest sofort zeichnen
  const alleZeichnen = () => { if (grenze < teile.length) flushSync(() => setStand({ teile, n: Infinity })); };

  // Einblenden der ersten Liste
  React.useEffect(() => { if (!geladen) return undefined; const id = setTimeout(() => setEnter(false), 600); return () => clearTimeout(id); }, [geladen]);

  // ---------- Suche ----------
  const timer = React.useRef(0);
  const filtern = v => { setLive(true); setQ(v); };
  const suchen = v => { setHatText(!!v); clearTimeout(timer.current); timer.current = setTimeout(() => filtern(v), 90); };
  const leeren = fokus => { input.current.value = ""; setHatText(false); clearTimeout(timer.current); filtern(""); if (fokus) input.current.focus(); };

  // Protokoll: erst wenn die Eingabe ruht, sonst eine Zeile je Tastendruck
  const logged = React.useRef("");
  React.useEffect(() => {
    const id = setTimeout(() => {
      const s = terms.join(" ");
      if (s === logged.current) return;
      if (!s) log("Suche", "geleert");
      else log("Suche", `„${q.trim()}“: ${current.length} Treffer`, current.length ? { Erste: current.slice(0, 5).map(b => b.t).join(" · ") } : undefined);
      logged.current = s;
    }, 600);
    return () => clearTimeout(id);
  }, [terms]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Klebende Leiste ----------
  React.useLayoutEffect(() => {
    const setBarH = () => document.documentElement.style.setProperty("--bar-h", bar.current.offsetHeight + "px");
    setBarH();
    const ro = "ResizeObserver" in window ? new ResizeObserver(setBarH) : null;
    if (ro) ro.observe(bar.current);
    // Schatten, sobald die Leiste oben klebt
    const io = "IntersectionObserver" in window ? new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0)) : null;
    if (io) io.observe(anchor.current);
    return () => { if (ro) ro.disconnect(); if (io) io.disconnect(); };
  }, []);
  const anchorTop = () => anchor.current.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(bar.current).top) || 0);
  // Beim Suchen bleibt die Leiste oben und die Treffer beginnen direkt darunter,
  // statt dass die Seite beim Kürzerwerden der Liste mitten im Inhalt landet.
  const ersteSuche = React.useRef(true);
  React.useLayoutEffect(() => {
    if (ersteSuche.current) { ersteSuche.current = false; return; }
    if (document.activeElement !== input.current && !terms.length) return;
    const y = anchorTop();
    if (scrollY > y + 1) scrollTo({ top: y, behavior: "instant" });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const onFocus = () => {
    if (wide.matches) return;
    const y = anchorTop();
    if (Math.abs(scrollY - y) > 1) scrollTo({ top: y, behavior: "instant" });
  };

  // ---------- Buchstaben-Floater und aktueller Buchstabe ----------
  // Floater nur beim Scrollen sichtbar; springt beim Beginn eines neuen Buchstabens um (DOM direkt, ohne Neuzeichnen)
  const flState = React.useRef({ letter: null, hide: 0 });
  const onScroll = React.useCallback(fromScroll => {
    const el = fl.current, lim = bar.current.getBoundingClientRect().bottom + 2, ms = marks.current;
    let cur = null;
    if (ms.length && list.current.getBoundingClientRect().top <= lim) {
      cur = ms[0].dataset.l;
      for (const m of ms) { if (m.getBoundingClientRect().top <= lim + 40) cur = m.dataset.l; else break; }
    }
    setOn(cur);
    if (!cur || wide.matches || fromScroll !== true) { el.classList.remove("show"); return; }
    const st = flState.current;
    if (cur !== st.letter) {
      st.letter = cur; el.textContent = cur;
      // Wechsel zwischen zwei gleichen Animationen startet neu, ohne Layout zu erzwingen
      const a = el.classList.contains("pop-a");
      el.classList.toggle("pop-a", !a); el.classList.toggle("pop-b", a);
    }
    el.classList.add("show");
    clearTimeout(st.hide);
    st.hide = setTimeout(() => el.classList.remove("show"), 900);
  }, []);
  React.useEffect(() => {
    let ticking = false;
    const h = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(true); }); } };
    addEventListener("scroll", h, { passive: true });
    return () => removeEventListener("scroll", h);
  }, [onScroll]);

  // ---------- Cover in Sichtweite vorladen ----------
  // Bücher in Sichtweite werden im Hintergrund gestaffelt vorgeladen (assets/covers.js), die Liste bleibt reiner Text.
  // Zeilen nur in Abschnitten nahe der Sicht einzeln beobachten (statt aller 4000+ Zeilen).
  const obs = React.useRef(null), alle = React.useRef(books);
  alle.current = books;
  if (!obs.current && "IntersectionObserver" in window) {
    const seen = new IntersectionObserver(entries => {
      for (const e of entries) {
        const b = alle.current[+e.target.dataset.i];
        if (e.isIntersecting) { warm(); C().want(b); } else C().unwant(b);
      }
    }, { rootMargin: "150px 0px" });
    const near = new IntersectionObserver(entries => {
      for (const e of entries) {
        for (const r of e.target.querySelectorAll(".row")) {
          const b = alle.current[+r.dataset.i];
          if (!b.i) continue;
          if (e.isIntersecting) seen.observe(r); else { seen.unobserve(r); C().unwant(b); }
        }
      }
    }, { rootMargin: "300px 0px" });
    obs.current = { seen, near };
  }
  React.useEffect(() => () => { if (obs.current) { obs.current.seen.disconnect(); obs.current.near.disconnect(); } }, []);

  // Nach jedem Zeichnen der Liste (auch jedem Schritt): Anker merken, Buchstaben neu bestimmen, Cover-Beobachtung
  // für neue Abschnitte (bei neuer Liste alles von vorn)
  const beob = React.useRef({ teile: null, uls: new WeakSet() });
  React.useLayoutEffect(() => {
    if (!geladen) return;
    marks.current = [...list.current.querySelectorAll("ul[data-l]")];
    onScroll();
    if (!obs.current || !C().enabled) return;
    if (beob.current.teile !== teile) {
      obs.current.seen.disconnect(); obs.current.near.disconnect();
      beob.current = { teile, uls: new WeakSet() };
    }
    list.current.querySelectorAll(".rows > ul").forEach(u => { if (!beob.current.uls.has(u)) { beob.current.uls.add(u); obs.current.near.observe(u); } });
  }, [teile, geladen, grenze]); // eslint-disable-line react-hooks/exhaustive-deps
  // Neue Trefferliste: kurz einblenden (React behält die Knoten, daher per Web Animations); wenige Treffer → Cover sofort
  React.useLayoutEffect(() => {
    const neu = list.current.firstElementChild;
    if (live && neu && !still.matches) neu.animate([{ opacity: .15, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 180, easing: "ease-out" });
    if (terms.length && current.length <= 4) current.forEach(prefetch);
  }, [teile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Klick auf eine Zeile (ein Hörer für alle Zeilen)
  const zeile = e => e.target.closest(".row");
  const meta = !geladen ? null : !books.length ? "" : terms.length
    ? (current.length === 1 && lang === "it" ? t("hits1") : t("hits", { n: nf(current.length) })) : t("sorted");

  return (
    <>
      <div id="bar-anchor" ref={anchor} />
      <div className={cn("bar", stuck && "stuck")} id="bar" ref={bar}>
        <div className="wrap grid gap-2 py-2.5">
          <label className="search relative">
            <SearchIcon aria-hidden="true" strokeWidth={2} className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              id="q" ref={input} type="search" data-protokoll="eigen" autoComplete="off" spellCheck="false" enterKeyHint="search"
              placeholder={t("search")} aria-label={t("searchLabel")}
              className="h-[46px] w-full appearance-none rounded-lg border border-border bg-surface pr-11 pl-[42px] text-m outline-none transition-[border-color,background-color,box-shadow] duration-200 focus:border-blau focus:bg-background focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--blau)_40%,transparent)]"
              onChange={e => suchen(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape" && e.currentTarget.value) leeren(false); }}
              onFocus={onFocus}
            />
            <button
              type="button" className="clear absolute top-1/2 right-1.5 grid size-[34px] -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-border hover:text-foreground"
              hidden={!hatText} aria-label={t("clear")} onClick={() => leeren(true)}
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>
          </label>
          <nav className="index" id="index" aria-label={t("index")} onClick={e => {
            const a = e.target.closest("a[data-l]");
            if (!a) return;
            e.preventDefault();
            alleZeichnen();
            const el = document.getElementById(lid(a.dataset.l));
            if (el) glide(el);
          }}>
            {LETTERS.map(l => (
              <a key={l} href={"#" + lid(l)} data-l={l} className={on === l ? "on" : undefined} aria-disabled={geladen ? String(!present.has(l)) : undefined}>{l}</a>
            ))}
          </nav>
        </div>
      </div>

      <div className="floater" id="floater" aria-hidden="true" ref={fl} />

      <main className="wrap books" aria-busy={geladen ? undefined : "true"}>
        <p className="meta" id="meta" aria-live="polite">
          {meta ?? (
            <>
              <span className="ld" lang="de">Bücherliste wird geladen …</span><span className="ld" lang="it">Caricamento dell'elenco …</span>
              <span className="ld slow" lang="de">Langsame Verbindung – die Liste lädt noch …</span><span className="ld slow" lang="it">Connessione lenta – l'elenco si sta ancora caricando …</span>
            </>
          )}
        </p>
        <div
          className={cn("list", live && "live", geladen && enter && "enter")} id="list" ref={list}
          onClick={e => { const r = zeile(e); if (r) onOpen(books[+r.dataset.i]); }}
          onPointerDown={e => { const r = zeile(e); if (r) prefetch(books[+r.dataset.i]); }}
        >
          {!geladen ? (
            <div className="skel" aria-hidden="true">{Array.from({ length: 14 }, (_, n) => <Skeleton key={n} />)}</div>
          ) : current.length ? (
            <div className="rows">{teile.slice(0, grenze).map(s => <Abschnitt key={s.items[0]._i} head={s.head} items={s.items} h={s.h} re={re} />)}</div>
          ) : (
            <div className="empty">
              <strong>{t(books.length ? "emptyT" : "noData")}</strong>
              {books.length ? <span>{t("emptyP")}</span> : null}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
