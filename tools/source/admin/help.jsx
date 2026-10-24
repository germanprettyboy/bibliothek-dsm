/* Help page of the admin page: a large glass dialog (#help) with getting started, how-tos, troubleshooting, FAQ,
   best practices, glossary and "about". Content as data in help-content.js (German/Italian, same ids).
   From 48rem: sidebar (title, search, section navigation with a gliding marker) + scrolling content pane;
   below: search and horizontally scrolling section chips stick above the content (phone: swipe sheet).
   Search filters articles, questions and glossary entries across all sections (case/accent-insensitive) and marks
   the hits. Props: open, onOpenChange, onTab(value) = close and switch to a tab, tabs (TABS of nav.jsx),
   section (optional: open on this section). From 40rem a round button left of × switches to full screen (class `full`
   on the sheet; kept while the page is open). Test hooks: #help, #help-q, #help-count, #help-empty, #help-full
   ([data-fullscreen], aria-pressed), [data-help-section], [data-help-nav], [data-help-item], [data-help-tab]. */
import "./strings-help";
import * as React from "react";
import {
  ArrowRightIcon, BookAIcon, InfoIcon, LifeBuoyIcon, LightbulbIcon, ListOrderedIcon, Maximize2Icon, MessageCircleQuestionMarkIcon,
  Minimize2Icon, RocketIcon, SearchIcon, ThumbsUpIcon, TriangleAlertIcon, XIcon,
} from "lucide-react";

import { GlassDialog } from "@/components/glass-dialog";
import { DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { log } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { useSwipe } from "@/lib/swipe";
import { HELP } from "./help-content";

// Icon and accent (logo color) per section
const LOOK = {
  start: [RocketIcon, "mauve"], howto: [ListOrderedIcon, "blue"], problems: [LifeBuoyIcon, "orange"],
  faq: [MessageCircleQuestionMarkIcon, "yellow"], practice: [ThumbsUpIcon, "green"], terms: [BookAIcon, "mauve"], about: [InfoIcon, "blue"],
};
const IDS = HELP.de.map(s => s.id);

// Search: lower case, without accents, ß = ss; markup [[…]] / {{…}} only as text
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
const plain = s => String(s || "").replace(/\[\[|\]\]|\{\{|\}\}/g, "");
function blockText(b) {
  if (typeof b === "string") return b;
  if (b.h) return b.h;
  if (b.steps) return b.steps.map(x => (typeof x === "string" ? x : x.t)).join(" ");
  if (b.list) return b.list.join(" ");
  if (b.tip || b.warn) return b.tip || b.warn;
  return "";
}
const textOf = blocks => norm(plain(blocks.map(blockText).join(" ")));
const matches = (n, terms) => terms.every(x => n.includes(x));

// Index per language: normalized text of every item, of the prose of a section and of every pair
function index(sections) {
  return sections.map(s => ({
    s,
    title: norm(s.title),
    prose: textOf((s.blocks || []).filter(b => !b.pairs && !b.about)),
    items: (s.items || []).map(it => ({ it, n: norm(plain(it.title)) + " " + textOf(it.blocks) })),
    pairs: (s.blocks || []).filter(b => b.pairs).map(b => b.pairs.map(p => norm(plain(p.join(" "))))),
  }));
}

// Search result: per section what is shown (all of it without a query)
function filter(idx, terms) {
  return idx.map(x => {
    if (!terms.length || matches(x.title, terms)) return { s: x.s, all: true, items: x.s.items || [], hits: 0 };
    const items = x.items.filter(i => matches(i.n, terms)).map(i => i.it);
    const prose = !!x.prose && matches(x.prose, terms);
    const keep = x.pairs.map(list => list.map((n, i) => (matches(n, terms) ? i : -1)).filter(i => i >= 0));
    const pairHits = keep.reduce((a, l) => a + l.length, 0);
    return { s: x.s, all: false, items, prose, keep, hits: items.length + pairHits + (prose ? 1 : 0) };
  });
}

// Marks the search terms in a text (positions found on the normalized text, mapped back to the original)
function mark(text, terms) {
  if (!terms.length) return text;
  let n = "";
  const at = [];
  for (let i = 0; i < text.length; i++) {
    const c = norm(text[i]);
    for (let k = 0; k < c.length; k++) { n += c[k]; at.push(i); }
  }
  const hits = [];
  for (const x of terms) {
    for (let p = n.indexOf(x); p !== -1; p = n.indexOf(x, p + x.length)) hits.push([at[p], at[p + x.length - 1] + 1]);
  }
  if (!hits.length) return text;
  hits.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const h of hits) {
    const last = merged[merged.length - 1];
    if (last && h[0] <= last[1]) last[1] = Math.max(last[1], h[1]); else merged.push(h.slice());
  }
  const out = [];
  let pos = 0;
  merged.forEach(([a, b], i) => {
    if (a > pos) out.push(text.slice(pos, a));
    out.push(<mark key={i}>{text.slice(a, b)}</mark>);
    pos = b;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return out;
}

// Inline markup: [[Button name]] as a chip, {{Key}} as a key, the rest as text (with marks)
function Rich({ text, terms }) {
  const out = [];
  const re = /\[\[(.+?)\]\]|\{\{(.+?)\}\}/g;
  let pos = 0, m, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > pos) out.push(<React.Fragment key={i++}>{mark(text.slice(pos, m.index), terms)}</React.Fragment>);
    out.push(m[1]
      ? <span key={i++} className="help-ui">{mark(m[1], terms)}</span>
      : <kbd key={i++} className="help-key">{mark(m[2], terms)}</kbd>);
    pos = re.lastIndex;
  }
  if (pos < text.length) out.push(<React.Fragment key={i++}>{mark(text.slice(pos), terms)}</React.Fragment>);
  return out;
}

function TabButton({ v, tabs, onTab }) {
  const { t } = useLanguage();
  const tab = tabs.find(x => x[0] === v);
  if (!tab) return null;
  const Icon = tab[2];
  return (
    <div className="help-go">
      <Button variant="outline" data-help-tab={v} onClick={() => onTab(v)} className="h-auto min-h-11 max-w-full py-2 whitespace-normal text-left">
        {Icon ? <Icon aria-hidden="true" strokeWidth={2} /> : null}
        <span>{t("hToTab", { t: t(tab[1]) })}</span>
        <ArrowRightIcon aria-hidden="true" strokeWidth={2} />
      </Button>
    </div>
  );
}

// Dates of the published files (window.DSM_* of this page)
function About() {
  const { t, df } = useLanguage();
  const rows = [
    ["hDLib", "books.js", window.DSM_LIBRARY], ["hDRecs", "recommendations.js", window.DSM_RECOMMENDATIONS], ["hDInfo", "info.js", window.DSM_INFO],
  ];
  return (
    <table className="help-table" data-help-about>
      <thead><tr><th scope="col">{t("hFile")}</th><th scope="col">{t("hDate")}</th></tr></thead>
      <tbody>
        {rows.map(([k, f, d]) => (
          <tr key={f}>
            <th scope="row"><span className="block">{t(k)}</span><span className="block text-s font-normal text-muted-foreground">{f}</span></th>
            <td>{d && d.updated ? df(d.updated) : <span className="text-muted-foreground">{t("hNotYet")}</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Block({ b, terms, keep, tabs, onTab }) {
  const { t } = useLanguage();
  if (typeof b === "string") return <p><Rich text={b} terms={terms} /></p>;
  if (b.h) return <h4 className="help-h"><Rich text={b.h} terms={terms} /></h4>;
  if (b.steps) {
    return (
      <ol className="help-steps">
        {b.steps.map((x, i) => {
          const s = typeof x === "string" ? { t: x } : x;
          return <li key={i}><p><Rich text={s.t} terms={terms} /></p>{s.tab ? <TabButton v={s.tab} tabs={tabs} onTab={onTab} /> : null}</li>;
        })}
      </ol>
    );
  }
  if (b.list) return <ul className="help-list">{b.list.map((x, i) => <li key={i}><Rich text={x} terms={terms} /></li>)}</ul>;
  if (b.tip || b.warn) {
    const Icon = b.tip ? LightbulbIcon : TriangleAlertIcon;
    return (
      <div className={cn("help-call", b.warn && "warn")} role="note">
        <Icon aria-hidden="true" strokeWidth={2} className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" />
        <p><strong>{t(b.tip ? "hTip" : "hWarn")}</strong>{" "}<Rich text={b.tip || b.warn} terms={terms} /></p>
      </div>
    );
  }
  if (b.tab) return <TabButton v={b.tab} tabs={tabs} onTab={onTab} />;
  if (b.about) return <About />;
  if (b.pairs) {
    const pairs = b.pairs.map((p, i) => [p, i]).filter(([, i]) => !keep || keep.includes(i));
    if (b.kind === "rules") {
      return (
        <ol className="help-rules">
          {pairs.map(([[h, x], i]) => (
            <li key={i} style={{ "--n": `"${i + 1}"` }}><strong><Rich text={h} terms={terms} /></strong><span><Rich text={x} terms={terms} /></span></li>
          ))}
        </ol>
      );
    }
    return (
      <dl className="help-terms">
        {pairs.map(([[h, x], i]) => (
          <div key={i}><dt><Rich text={h} terms={terms} /></dt><dd><Rich text={x} terms={terms} /></dd></div>
        ))}
      </dl>
    );
  }
  return null;
}

function Section({ r, terms, searching, open, setOpen, tabs, onTab }) {
  const { s } = r;
  const [Icon, color] = LOOK[s.id] || [InfoIcon, "blue"];
  // While searching, prose blocks only if the prose matches; pairs filtered to the hits
  let pairIdx = 0;
  const blocks = (s.blocks || []).map((b, i) => {
    if (b.pairs) {
      const keep = r.all ? null : r.keep[pairIdx];
      pairIdx++;
      return keep && !keep.length ? null : <Block key={i} b={b} terms={terms} keep={keep} tabs={tabs} onTab={onTab} />;
    }
    if (!r.all && !r.prose) return null;
    return <Block key={i} b={b} terms={terms} tabs={tabs} onTab={onTab} />;
  });
  return (
    <section className="help-sec" id={"help-" + s.id} data-help-section={s.id} aria-labelledby={"help-h-" + s.id} style={{ "--acc": `var(--${color})` }}>
      <h3 className="help-sh" id={"help-h-" + s.id}>
        <span className="help-sh-icon" aria-hidden="true"><Icon strokeWidth={2} /></span>
        <span><Rich text={s.title} terms={terms} /></span>
      </h3>
      {!searching ? <p className="help-intro">{s.intro}</p> : null}
      {blocks}
      {r.items.length ? (
        <Accordion type="multiple" value={open} onValueChange={setOpen} className="help-acc">
          {r.items.map(it => {
            const v = s.id + ":" + it.id;
            return (
              <AccordionItem key={v} value={v} data-help-item={it.id}>
                <AccordionTrigger><Rich text={it.title} terms={terms} /></AccordionTrigger>
                <AccordionContent className="help-art">
                  {it.blocks.map((b, i) => <Block key={i} b={b} terms={terms} tabs={tabs} onTab={onTab} />)}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : null}
    </section>
  );
}

export function Help({ open, onOpenChange, onTab, tabs = [], section }) {
  const { t, lang } = useLanguage();
  const sections = HELP[lang] || HELP.de;
  const idx = React.useMemo(() => index(sections), [sections]);
  const [active, setActive] = React.useState("start");
  const [q, setQ] = React.useState("");
  const [openItems, setOpenItems] = React.useState([]);
  const [full, setFull] = React.useState(false);
  const search = React.useRef(null), main = React.useRef(null), side = React.useRef(null), nav = React.useRef(null);
  const swipeRef = useSwipe(".scrim.swipe", () => onOpenChange(false));

  // Opening: empty search, optionally straight onto a section
  React.useEffect(() => {
    if (!open) return;
    setQ("");
    setOpenItems([]);
    if (section && IDS.includes(section)) setActive(section);
  }, [open, section]);

  const terms = React.useMemo(() => norm(q).split(/\s+/).filter(Boolean), [q]);
  const searching = terms.length > 0;
  const results = React.useMemo(() => filter(idx, terms), [idx, terms]);
  const shown = searching ? results.filter(r => r.all || r.items.length || r.prose || r.keep.some(l => l.length)) : results.filter(r => r.s.id === active);
  const hits = shown.reduce((a, r) => a + (r.all ? 1 : r.hits), 0);

  // While searching all matching articles are open
  const hitKeys = searching ? shown.flatMap(r => r.items.map(it => r.s.id + ":" + it.id)).join("|") : "";
  React.useEffect(() => { setOpenItems(hitKeys ? hitKeys.split("|") : []); }, [hitKeys]);
  React.useEffect(() => {
    if (!searching) return undefined;
    const id = setTimeout(() => log("Help", `search "${q}": ${hits} hits`), 600);
    return () => clearTimeout(id);
  }, [q, hits, searching]);

  // Content start into view: the content pane (from 48rem) or the scrolling sheet below the sticky search bar
  const toTop = () => {
    const m = main.current;
    if (!m) return;
    if (getComputedStyle(m).overflowY === "auto") { m.scrollTop = 0; return; }
    let el = m.parentElement;
    while (el && !(el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
    if (!el) return;
    const bar = side.current && getComputedStyle(side.current).position === "sticky" ? side.current.offsetHeight : 0;
    const top = m.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - bar - 8;
    if (el.scrollTop > top) el.scrollTop = Math.max(0, top);
  };
  const go = id => {
    setQ("");
    setActive(id);
    setOpenItems([]);
    log("Help", `section ${id}`);
    requestAnimationFrame(toTop);
  };
  // Chips (phone): keep the active one in view
  React.useEffect(() => {
    const ul = nav.current, b = ul && ul.querySelector(`[data-help-nav="${active}"]`);
    if (!ul || !b || ul.scrollWidth <= ul.clientWidth) return;
    if (b.offsetLeft < ul.scrollLeft || b.offsetLeft + b.offsetWidth > ul.scrollLeft + ul.clientWidth) ul.scrollLeft = Math.max(0, b.offsetLeft - 20);
  }, [active, open]);

  const key = e => {
    if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && search.current) {
      e.preventDefault();
      search.current.focus();
      search.current.select();
    }
  };
  // Wide screen: the search gets the focus (on the phone it would push up the keyboard)
  const autoFocus = e => {
    if (search.current && matchMedia("(min-width: 48rem)").matches) { e.preventDefault(); search.current.focus(); }
  };
  const browse = id => { go(id); if (search.current && matchMedia("(min-width: 48rem)").matches) search.current.focus(); };
  const i = Math.max(0, IDS.indexOf(active));

  return (
    <GlassDialog
      open={open} onOpenChange={onOpenChange} name="Help" titleId="help-t" id="help" className={cn("help swipe", full && "full")} overlayClassName="swipe"
      onKeyDown={key} onOpenAutoFocus={autoFocus}
    >
      <Button
        variant="icon" size="icon" id="help-full" className="help-fs hidden min-[40rem]:inline-flex" data-fullscreen="" aria-pressed={full}
        aria-label={t(full ? "hFullOff" : "hFull")} title={t(full ? "hFullOff" : "hFull")}
        onClick={() => { setFull(f => !f); log("Help", full ? "full screen off" : "full screen"); }}
      >
        {full ? <Minimize2Icon aria-hidden="true" strokeWidth={2} /> : <Maximize2Icon aria-hidden="true" strokeWidth={2} />}
      </Button>
      <div className="pane help-pane" ref={swipeRef}>
        <header className="help-head">
          <DialogTitle id="help-t">{t("hTitle")}</DialogTitle>
          <p className="m-0 text-s text-muted-foreground">{t("hSub")}</p>
        </header>
        <div className="help-side" ref={side}>
          <label className="relative block">
            <span className="sr-only">{t("hSearch")}</span>
            <SearchIcon aria-hidden="true" strokeWidth={2} className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              ref={search} id="help-q" type="search" value={q} autoComplete="off" spellCheck="false" placeholder={t("hSearchPh")}
              aria-describedby="help-count" onChange={e => setQ(e.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-border bg-surface pr-11 pl-10 text-m text-foreground outline-none transition-[border-color,background-color] duration-200 placeholder:text-muted-foreground focus:border-foreground focus:bg-background [&::-webkit-search-cancel-button]:hidden"
            />
            {q ? (
              <button type="button" className="help-clear" aria-label={t("hClear")} onClick={() => { setQ(""); search.current && search.current.focus(); }}>
                <XIcon aria-hidden="true" strokeWidth={2} className="size-4" />
              </button>
            ) : null}
          </label>
          <nav aria-label={t("hNav")}>
            <ul className={cn("help-nav", searching && "searching")} ref={nav} style={{ "--i": i }}>
              <li className="help-ind" aria-hidden="true" style={{ "--acc": `var(--${(LOOK[active] || LOOK.start)[1]})` }} />
              {sections.map(s => {
                const [Icon, color] = LOOK[s.id] || [InfoIcon, "blue"];
                const on = !searching && s.id === active;
                return (
                  <li key={s.id}>
                    <button type="button" data-help-nav={s.id} aria-current={on ? "true" : undefined} className={cn("help-nb", on && "on")} style={{ "--acc": `var(--${color})` }} onClick={() => go(s.id)}>
                      <Icon aria-hidden="true" strokeWidth={2} />
                      <span>{s.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <p className={cn("help-count m-0 text-s text-muted-foreground", !searching && "sr-only")} id="help-count" aria-live="polite">
            {searching && hits ? (hits === 1 ? t("hHit") : t("hHits", { n: hits })) : ""}
          </p>
        </div>
        <div className="help-main" ref={main}>
          <div className="help-body" key={searching ? "search" : active}>
            {searching && !hits ? (
              <div className="help-empty" id="help-empty">
                <p className="m-0 font-semibold">{t("hNoneT", { q: q.trim() })}</p>
                <p className="m-0 text-muted-foreground">{t("hNoneP")}</p>
                <div className="flex flex-wrap gap-2">
                  {sections.map(s => {
                    const Icon = (LOOK[s.id] || [InfoIcon])[0];
                    return (
                      <Button key={s.id} variant="outline" data-help-browse={s.id} onClick={() => browse(s.id)}>
                        <Icon aria-hidden="true" strokeWidth={2} /><span>{s.title}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : shown.map(r => (
              <Section key={r.s.id} r={r} terms={terms} searching={searching} open={openItems} setOpen={setOpenItems} tabs={tabs} onTab={onTab} />
            ))}
          </div>
        </div>
      </div>
    </GlassDialog>
  );
}
