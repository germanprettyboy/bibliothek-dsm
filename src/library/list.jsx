/* Book list: search, filter by category, A–Z bar = filter by initial letter (from tablet width), letter floater (phone), list as plain text.
   The list consists of chunks of at most 40 books; every letter starts a new one (anchor ul#L-X).
   Via CSS (content-visibility) the browser only renders chunks in view; the others carry a height estimated from
   the text length in their style until they have been rendered once. */
import * as React from "react";
import { ListFilterIcon, SearchIcon, XIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { log } from "@/lib/storage";
import { C, reduced } from "@/lib/environment";
import { addStrings, useLanguage } from "@/lib/language";
import { norm } from "@/library/data";
import { CategoryDialog, categoryModel } from "@/library/categories";

addStrings({
  de: {
    search: "Titel, Autor oder ISBN", searchLabel: "Bücher durchsuchen", clear: "Suche löschen",
    index: "Nach Anfangsbuchstaben filtern", hits: "{n} Treffer", count: "{n} Bücher", count1: "1 Buch", listT: "Bücherliste",
    emptyT: "Kein Buch gefunden", emptyP: "Eine andere Schreibweise oder nur einen Teil des Titels versuchen.",
    emptyC: "In dieser Kategorie nichts gefunden – anders suchen oder die Kategorie aufheben.",
    emptyL: "Unter diesem Buchstaben nichts gefunden – anders suchen oder den Buchstaben aufheben.",
    noData: "Die Bücherliste konnte nicht geladen werden (books.js fehlt).",
  },
  it: {
    search: "Titolo, autore o ISBN", searchLabel: "Cerca nei libri", clear: "Cancella ricerca",
    index: "Filtra per lettera iniziale", hits: "{n} risultati", hits1: "1 risultato", count: "{n} libri", count1: "1 libro", listT: "Elenco dei libri",
    emptyT: "Nessun libro trovato", emptyP: "Prova un'altra grafia o solo una parte del titolo.",
    emptyC: "Nessun risultato in questa categoria – prova un'altra ricerca o rimuovi la categoria.",
    emptyL: "Nessun risultato con questa lettera – prova un'altra ricerca o rimuovi la lettera.",
    noData: "Impossibile caricare l'elenco dei libri (manca books.js).",
  },
});

const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const lid = l => "L-" + (l === "#" ? "0" : l);
const CHUNK = 40;
const FIRST = 2, STEP = 20; // chunks in the first frame, chunks per further step
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wide = matchMedia("(min-width: 48rem)");

// Highlight hits the way the search matches (norm): without accents, ß = ss – "kastner" highlights "Kästner".
// Plain ASCII text (most rows): split with a group in the expression, odd parts are hits.
// Otherwise fold every character on its own and map the hits in the folded text back onto the original characters.
const ASCII = /^[\x20-\x7e]*$/;
const FOLD = new Map();
const fold = c => {
  let f = FOLD.get(c);
  if (f === undefined) FOLD.set(c, f = c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]/g, " "));
  return f;
};
function hl(text, query) {
  if (!query) return text;
  const s = String(text);
  if (ASCII.test(s)) return s.split(query.re).map((p, n) => (n % 2 ? <mark key={n}>{p}</mark> : p));
  const chars = [...s], at = [];
  let f = "";
  for (const c of chars) { at.push(f.length); f += fold(c); }
  at.push(f.length);
  const hit = new Uint8Array(f.length);
  for (const w of query.terms) for (let i = f.indexOf(w); i >= 0; i = f.indexOf(w, i + 1)) hit.fill(1, i, i + w.length);
  const out = [];
  let part = "", marked = false;
  chars.forEach((c, n) => {
    // characters without a folded form (a lone combining accent) belong to the previous one
    const m = at[n] < at[n + 1] ? hit.subarray(at[n], at[n + 1]).includes(1) : marked;
    if (m !== marked && part) { out.push(marked ? <mark key={out.length}>{part}</mark> : part); part = ""; }
    marked = m; part += c;
  });
  if (part) out.push(marked ? <mark key={out.length}>{part}</mark> : part);
  return out;
}

// Estimated height of a chunk: characters per line for title (fs-m) and author (fs-s), roughly via the mean character width
function sizer() {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const w = Math.max(160, Math.min(document.documentElement.clientWidth - 32, 46 * rem) - 40);
  const cT = w / (rem * .5), cA = w / (rem * .875 * .5);
  return (t, a) => 25 + rem * 1.35 * Math.ceil((t.length || 1) / cT) + (a ? 2 + rem * .875 * 1.5 * Math.ceil(a.length / cA) : 0);
}
// Head (anchor ul#L-X) only on the first occurrence of a letter: the sort order (Collator) can interrupt it,
// e.g. "Œuvres" between the O's (counts as "#") or Greek titles after Z
function chunks(current) {
  const est = sizer(), out = [], heads = new Set();
  let cur = null, last = null;
  for (const b of current) {
    if (b._l !== last || cur.items.length === CHUNK) {
      const head = b._l !== last && !heads.has(b._l);
      if (head) heads.add(b._l);
      cur = { head: head ? b._l : null, items: [], h: 0 };
      out.push(cur);
      last = b._l;
    }
    const a = b.a ? b.a.join(", ") : "";
    cur.items.push(b);
    cur.h += est(b.t, a);
  }
  return out;
}

// One chunk; only re-renders when its books or the highlighting change
const Chunk = React.memo(function Chunk({ head, items, h, query }) {
  return (
    <ul data-l={head || undefined} id={head ? lid(head) : undefined} style={{ containIntrinsicSize: `auto ${Math.round(h)}px` }}>
      {items.map(b => {
        const a = b.a ? b.a.join(", ") : "";
        return (
          <li key={b._i}>
            <button className="row" type="button" data-i={b._i}>
              <span className="t">{hl(b.t, query)}</span>
              {a ? <span className="a">{hl(a, query)}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
});

// Covers: open connections to the services only once the first cover is needed
let warmed = false;
function warm() {
  if (warmed) return; warmed = true;
  [["https://cover.ekz.de", false], ["https://openlibrary.org", true], ["https://covers.openlibrary.org", false]]
    .forEach(([href, cors]) => { const l = document.createElement("link"); l.rel = "preconnect"; l.href = href; if (cors) l.crossOrigin = ""; document.head.appendChild(l); });
}
export const prefetch = b => { if (b && b.i) { warm(); C().get(b); } };

export function BookList({ books, loaded, onOpen }) {
  const { lang, t, nf } = useLanguage();
  const [q, setQ] = React.useState("");
  const [hasText, setHasText] = React.useState(false);
  const [live, setLive] = React.useState(false);
  const [enter, setEnter] = React.useState(true);
  const [stuck, setStuck] = React.useState(false);
  const [letter, setLetter] = React.useState(null); // initial letter from the A–Z bar | null
  const [category, setCategory] = React.useState(null); // g:<parent> | c:<category> | null
  const [catOpen, setCatOpen] = React.useState(false);
  const input = React.useRef(null), bar = React.useRef(null), anchor = React.useRef(null), list = React.useRef(null), fl = React.useRef(null);
  const marks = React.useRef([]);

  const terms = React.useMemo(() => norm(q).split(" ").filter(Boolean), [q]);
  const query = React.useMemo(() => {
    const long = terms.filter(x => x.length > 1).sort((a, b) => b.length - a.length);
    return long.length ? { re: new RegExp("(" + long.map(reEsc).join("|") + ")", "i"), terms: long } : null;
  }, [terms]);
  const model = React.useMemo(() => categoryModel(books), [books]);
  const catTest = React.useMemo(() => model.test(category), [model, category]);
  const base = React.useMemo(() => {
    const l = catTest ? books.filter(catTest) : books;
    return terms.length ? l.filter(b => terms.every(x => b._s.includes(x))) : l;
  }, [books, terms, catTest]);
  // letters that occur under the search and category (the others are disabled in the bar)
  const present = React.useMemo(() => new Set(base.map(b => b._l)), [base]);
  const current = React.useMemo(() => (letter ? base.filter(b => b._l === letter) : base), [base, letter]);
  const filtered = terms.length > 0 || !!category || !!letter;
  const parts = React.useMemo(() => chunks(current), [current]);

  // Render every new list step by step: first two chunks (visible immediately), then STEP more each, every
  // step in its own task (input gets handled in between). 4500 rows at once would be a block of seconds on weak
  // devices. Deliberately no transition: it would stay pending while updates keep coming.
  const [progress, setProgress] = React.useState({ parts: null, n: FIRST });
  const limit = progress.parts === parts ? progress.n : FIRST;
  React.useEffect(() => {
    if (!loaded || limit >= parts.length) return undefined;
    const id = setTimeout(() => setProgress({ parts, n: limit + STEP }), 0);
    return () => clearTimeout(id);
  }, [loaded, parts, limit]);

  // Fade-in of the first list
  React.useEffect(() => { if (!loaded) return undefined; const id = setTimeout(() => setEnter(false), 600); return () => clearTimeout(id); }, [loaded]);

  // ---------- Search ----------
  const timer = React.useRef(0);
  const filter = v => { setLive(true); setQ(v); };
  const search = v => { setHasText(!!v); clearTimeout(timer.current); timer.current = setTimeout(() => filter(v), 90); };
  const clear = focus => { input.current.value = ""; setHasText(false); clearTimeout(timer.current); filter(""); if (focus) input.current.focus(); };

  // Log: only once the input rests, otherwise one line per keystroke
  const logged = React.useRef("");
  React.useEffect(() => {
    const id = setTimeout(() => {
      const s = terms.join(" ");
      if (s === logged.current) return;
      if (!s) log("Search", "cleared");
      else log("Search", `"${q.trim()}": ${current.length} hits`, current.length ? { First: current.slice(0, 5).map(b => b.t).join(" · ") } : undefined);
      logged.current = s;
    }, 600);
    return () => clearTimeout(id);
  }, [terms]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Category ----------
  const chooseCategory = id => {
    if (id === category) return;
    setLive(true); setCategory(id);
    if (!id) { log("Filter", "category cleared"); return; }
    const n = books.filter(model.test(id)).length;
    log("Filter", `category "${model.label(id, "de", t)}": ${n} books`);
  };

  // ---------- Initial letter ----------
  // The A–Z bar filters instead of jumping; the chosen letter again lifts the filter
  const chooseLetter = l => {
    const next = l === letter ? null : l;
    setLive(true); setLetter(next);
    log("Filter", next ? `letter "${next}": ${base.filter(b => b._l === next).length} books` : "letter cleared");
  };

  // ---------- Sticky bar ----------
  React.useLayoutEffect(() => {
    const setBarH = () => document.documentElement.style.setProperty("--bar-h", bar.current.offsetHeight + "px");
    setBarH();
    const ro = "ResizeObserver" in window ? new ResizeObserver(setBarH) : null;
    if (ro) ro.observe(bar.current);
    // shadow as soon as the bar sticks at the top
    const io = "IntersectionObserver" in window ? new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0)) : null;
    if (io) io.observe(anchor.current);
    return () => { if (ro) ro.disconnect(); if (io) io.disconnect(); };
  }, []);
  const anchorTop = () => anchor.current.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(bar.current).top) || 0);
  // While searching the bar stays at the top and the hits start right below it,
  // instead of the page ending up in the middle of the content as the list gets shorter.
  const firstSearch = React.useRef(true);
  React.useLayoutEffect(() => {
    if (firstSearch.current) { firstSearch.current = false; return; }
    if (document.activeElement !== input.current && !terms.length) return;
    const y = anchorTop();
    if (scrollY > y + 1) scrollTo({ top: y, behavior: "instant" });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  // New category or letter: the hits start right below the bar if the page was already further down;
  // a chosen category on every screen size also brings the bar to the top, like focusing the search does
  const firstCat = React.useRef(true);
  React.useLayoutEffect(() => {
    if (firstCat.current) { firstCat.current = false; return; }
    const y = anchorTop();
    if (category ? Math.abs(scrollY - y) > 1 : scrollY > y + 1) scrollTo({ top: y, behavior: "instant" });
  }, [category, letter]); // eslint-disable-line react-hooks/exhaustive-deps
  const onFocus = () => {
    if (wide.matches) return;
    const y = anchorTop();
    if (Math.abs(scrollY - y) > 1) scrollTo({ top: y, behavior: "instant" });
  };

  // ---------- Letter floater (phone) ----------
  // Floater only visible while scrolling; switches when a new letter begins (DOM directly, without re-rendering)
  const flState = React.useRef({ letter: null, hide: 0 });
  const onScroll = React.useCallback(fromScroll => {
    const el = fl.current, lim = bar.current.getBoundingClientRect().bottom + 2, ms = marks.current;
    let cur = null;
    if (ms.length && list.current.getBoundingClientRect().top <= lim) {
      cur = ms[0].dataset.l;
      for (const m of ms) { if (m.getBoundingClientRect().top <= lim + 40) cur = m.dataset.l; else break; }
    }
    if (!cur || wide.matches || fromScroll !== true) { el.classList.remove("show"); return; }
    const st = flState.current;
    if (cur !== st.letter) {
      st.letter = cur; el.textContent = cur;
      // alternating between two identical animations restarts it without forcing layout
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

  // ---------- Preload covers in view ----------
  // Books in view are preloaded in the background, staggered (assets/covers.js); the list stays plain text.
  // Observe rows individually only in chunks near the view (instead of all 4000+ rows).
  const obs = React.useRef(null), all = React.useRef(books);
  all.current = books;
  if (!obs.current && "IntersectionObserver" in window) {
    const wanted = new Set(); // books that should currently be loaded in the background
    const seen = new IntersectionObserver(entries => {
      for (const e of entries) {
        const b = all.current[+e.target.dataset.i];
        if (e.isIntersecting) { warm(); C().want(b); wanted.add(b); } else { C().unwant(b); wanted.delete(b); }
      }
    }, { rootMargin: "150px 0px" });
    const near = new IntersectionObserver(entries => {
      for (const e of entries) {
        for (const r of e.target.querySelectorAll(".row")) {
          const b = all.current[+r.dataset.i];
          if (!b.i) continue;
          if (e.isIntersecting) seen.observe(r); else { seen.unobserve(r); C().unwant(b); wanted.delete(b); }
        }
      }
    }, { rootMargin: "300px 0px" });
    obs.current = { seen, near, wanted };
  }
  React.useEffect(() => () => { if (obs.current) { obs.current.seen.disconnect(); obs.current.near.disconnect(); } }, []);

  // After every render of the list (every step too): remember anchors, determine the letter anew, cover observation
  // for new chunks (on a new list everything from scratch)
  const watched = React.useRef({ parts: null, uls: new WeakSet() });
  React.useLayoutEffect(() => {
    if (!loaded) return;
    marks.current = [...list.current.querySelectorAll("ul[data-l]")];
    onScroll();
    if (!obs.current || !C().enabled) return;
    if (watched.current.parts !== parts) {
      // stop loading the old list's books in the background (the new one registers its visible ones again right away)
      obs.current.wanted.forEach(b => C().unwant(b)); obs.current.wanted.clear();
      obs.current.seen.disconnect(); obs.current.near.disconnect();
      watched.current = { parts, uls: new WeakSet() };
    }
    list.current.querySelectorAll(".rows > ul").forEach(u => { if (!watched.current.uls.has(u)) { watched.current.uls.add(u); obs.current.near.observe(u); } });
  }, [parts, loaded, limit]); // eslint-disable-line react-hooks/exhaustive-deps
  // New hit list: fade in briefly (React keeps the nodes, hence Web Animations); few hits → covers immediately
  React.useLayoutEffect(() => {
    const first = list.current.firstElementChild;
    if (live && first && !reduced.matches) first.animate([{ opacity: .15, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 180, easing: "ease-out" });
    if (filtered && current.length <= 4) current.forEach(prefetch);
  }, [parts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click on a row (one listener for all rows)
  const row = e => e.target.closest(".row");
  const meta = !loaded ? null : !books.length ? "" : filtered
    ? (current.length === 1 && lang === "it" ? t("hits1") : t("hits", { n: nf(current.length) }))
    : (books.length === 1 ? t("count1") : t("count", { n: nf(books.length) }));

  return (
    <>
      <div id="bar-anchor" ref={anchor} />
      <div className={cn("bar", stuck && "stuck")} id="bar" ref={bar}>
        <div className="wrap grid gap-2 py-3">
          <div className="flex gap-2">
          <label className="search relative min-w-0 flex-1">
            <SearchIcon aria-hidden="true" strokeWidth={2} className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
            {/* Room for × only while there is text: empty, the placeholder gets the width (whole from 320 px, larger text from 360) */}
            <input
              id="q" ref={input} type="search" data-log="own" autoComplete="off" spellCheck="false" enterKeyHint="search"
              placeholder={t("search")} aria-label={t("searchLabel")}
              className="h-12 w-full appearance-none text-ellipsis rounded-lg border border-border bg-surface pr-12 pl-11 text-m outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-muted-foreground placeholder-shown:pr-4 focus:border-foreground focus:bg-background focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--blue)_55%,transparent)]"
              onChange={e => search(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape" && e.currentTarget.value) clear(false); }}
              onFocus={onFocus}
            />
            <button
              type="button" className="clear absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-border hover:text-foreground"
              hidden={!hasText} aria-label={t("clear")} onClick={() => clear(true)}
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>
          </label>
          <div className={cn("cat-pill", category && "on", (!loaded || !model.groups.length) && "off")}>
            <button
              type="button" id="cat-btn" aria-haspopup="dialog" aria-pressed={!!category} disabled={!loaded || !model.groups.length}
              aria-label={category ? `${t("catOpen")}: ${model.label(category, lang, t)}` : t("catOpen")}
              onClick={() => setCatOpen(true)}
            >
              <ListFilterIcon aria-hidden="true" className="size-[18px] shrink-0" />
              <span className="cat-label" aria-hidden="true"><span><span>{category ? model.short(category, lang, t) : t("catBtn")}</span></span></span>
            </button>
            <span className="cat-x" inert={!category} aria-hidden={!category}>
              <span>
                <span className="cat-div" aria-hidden="true" />
                <button type="button" id="cat-clear" aria-label={t("catClear")} tabIndex={category ? 0 : -1} onClick={() => { chooseCategory(null); document.getElementById("cat-btn").focus(); }}>
                  <XIcon aria-hidden="true" className="size-[18px]" />
                </button>
              </span>
            </span>
          </div>
          </div>
          <div className="index" id="index" role="group" aria-label={t("index")}>
            {LETTERS.map(l => (
              <button
                key={l} type="button" data-l={l} className={letter === l ? "on" : undefined} aria-pressed={letter === l}
                disabled={!loaded || (!present.has(l) && letter !== l)} onClick={() => chooseLetter(l)}
              >{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="floater" id="floater" aria-hidden="true" ref={fl} />

      <main className="wrap books" aria-busy={loaded ? undefined : "true"} aria-labelledby="list-t">
        <h2 id="list-t" className="sr-only">{t("listT")}</h2>
        <p className="meta" id="meta" aria-live="polite">
          {meta ?? (
            <>
              <span className="ld" lang="de">Bücherliste wird geladen …</span><span className="ld" lang="it">Caricamento dell'elenco …</span>
              <span className="ld slow" lang="de">Langsame Verbindung – die Liste lädt noch …</span><span className="ld slow" lang="it">Connessione lenta – l'elenco si sta ancora caricando …</span>
            </>
          )}
        </p>
        <div
          className={cn("list", live && "live", loaded && enter && "enter")} id="list" ref={list}
          onClick={e => { const r = row(e); if (r) onOpen(books[+r.dataset.i]); }}
          onPointerDown={e => { const r = row(e); if (r) prefetch(books[+r.dataset.i]); }}
        >
          {!loaded ? (
            <div className="skel" aria-hidden="true">{Array.from({ length: 14 }, (_, n) => <Skeleton key={n} />)}</div>
          ) : current.length ? (
            <div className="rows">{parts.slice(0, limit).map(s => <Chunk key={s.items[0]._i} head={s.head} items={s.items} h={s.h} query={query} />)}</div>
          ) : (
            <div className="empty">
              <strong>{t(books.length ? "emptyT" : "noData")}</strong>
              {books.length ? <span>{t(letter ? "emptyL" : category ? "emptyC" : "emptyP")}</span> : null}
            </div>
          )}
        </div>
      </main>
      <CategoryDialog open={catOpen} onOpenChange={setCatOpen} model={model} total={books.length} choice={category} onChoice={chooseCategory} />
    </>
  );
}
