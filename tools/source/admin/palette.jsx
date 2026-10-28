/* Command palette of the admin page (#cmd): Ctrl+K / ⌘K anywhere, "/" outside a field, or the search button of the
   navigation bar (#cmd-btn). One search over the tabs, actions, help articles and the whole list of books (title,
   subtitle, author, publisher, year; an ISBN – typed with hyphens or scanned – finds its book directly). Empty search:
   "Anstehend" (todos.js: what is worth doing now, each with its tab), the books looked at last, the tabs and actions.
   A book opens its card in the same dialog (book-card.jsx); Escape or "Zurück" goes back to the search with the same
   query, a second Escape clears the query, a third one closes.
   Keyboard: ↑/↓ move (wrapping), Enter opens; pointer: hovering moves the choice, a click opens (combobox + listbox).
   Desktop: a wide glass panel at a fixed height from the top (it grows downwards, the field never jumps); phone: the
   screen-high swipe sheet of every dialog. Props: open, onOpenChange, B (app state), draft/setDraft (recommendations),
   info, ins, report, cov, onTab(v), onHelp(section, item), onInventory(), lock.
   Test hooks: #cmd, #cmd-q, #cmd-list, [data-cmd] (item id: tab:…, act:…, todo:…, help:…, book:…), [data-cmd-group],
   [aria-selected], #cmd-empty, #cmd-more, #cmd-back, #cmd-book. */
import "./strings-palette";
import * as React from "react";
import {
  ArrowLeftIcon, BookOpenIcon, ChartColumnIcon, CircleHelpIcon, CornerDownLeftIcon, DatabaseIcon, ExternalLinkIcon, HistoryIcon,
  ImageIcon, InfoIcon, LifeBuoyIcon, LockIcon, ScanBarcodeIcon, SearchIcon, SparklesIcon, UploadIcon, WrenchIcon, XIcon,
} from "lucide-react";

import { GlassDialog } from "@/components/glass-dialog";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { log, store } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { useSwipe } from "@/lib/swipe";
import { BookCard } from "./book-card";
import { HELP } from "./help-content";
import { mark } from "./help";
import { useInventory } from "./inventory";
import { recKey } from "./recommendations";
import { buildData, coll, normE } from "./table-data";
import { todos } from "./todos";

const MAX_BOOKS = 40, MAX_HELP = 6, MAX_RECENT = 5;
const RECENT = "dsm-cmd-recent"; // keys (title|first author) of the books opened last, newest first
const TAB_ICON = { catalog: DatabaseIcon, care: WrenchIcon, covers: ImageIcon, recs: SparklesIcon, info: InfoIcon, stats: ChartColumnIcon };
const fine = () => matchMedia("(min-width: 48rem)").matches;

// Search text of an item: normalized like every admin search, words of title, subtitle and keywords
const words = (...parts) => normE(parts.filter(Boolean).join(" "));
// Rank: title starts with the first term, a word of the title does, the rest; -1 = no match
function rank(it, terms) {
  if (!terms.every(w => it.s.includes(w))) return -1;
  return it.tn.startsWith(terms[0]) ? 0 : (" " + it.tn).includes(" " + terms[0]) ? 1 : 2;
}

export function Palette({ open, onOpenChange, B, draft, setDraft, info, ins, report, cov, onTab, onHelp, onInventory, lock }) {
  const { t, nf, df, lang } = useLanguage();
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [book, setBook] = React.useState(null); // index in B.books of the open book card
  const [recent, setRecent] = React.useState(() => store.json(RECENT) || []);
  const input = React.useRef(null), list = React.useRef(null), back = React.useRef(null);
  const inv = useInventory();
  const swipeRef = useSwipe(".scrim.swipe", () => onOpenChange(false));
  const books = B.books || [];

  React.useEffect(() => { if (open) { setQ(""); setActive(0); setBook(null); } }, [open]);

  // ---------- items ----------
  const index = React.useMemo(() => (open ? books.map((b, i) => ({ i, b, tn: normE(b.t), s: words(b.t, b.s, (b.a || []).join(" "), b.p, b.y, (b.i || []).join(" ")) })) : null), [open, books]);
  const byKey = React.useMemo(() => (index ? new Map(index.map(x => [recKey(x.b), x.i])) : new Map()), [index]);
  // Copies and maintenance entries for the book card: built once the first card opens
  const data = React.useMemo(() => {
    if (book == null || !ins) return null;
    const d = buildData(ins, books, report, cov);
    return { d, records: new Map(d.records.map(r => [r.id, r])) };
  }, [book != null, ins, books, report, cov]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => onOpenChange(false);
  const go = v => { close(); onTab(v); };
  const tabs = ["catalog", "care", "covers", "recs", "info", "stats"].map(v => ({
    id: "tab:" + v, group: "tabs", Icon: TAB_ICON[v], title: t({ catalog: "tabCatalog", care: "tabCare", covers: "tabCovers", recs: "tabRecs", info: "tabInfo", stats: "tabStats" }[v]),
    sub: t("kTab_" + v), run: () => go(v),
  }));
  const pickFile = () => {
    go("catalog");
    // after the tab has mounted; the success panel's "Andere Datei laden" first shows the drop zone again
    setTimeout(() => { const a = document.getElementById("again"); if (a) a.click(); else { const f = document.getElementById("file"); if (f) f.click(); } }, 80);
  };
  const actions = [
    { id: "act:import", Icon: UploadIcon, run: pickFile },
    ins ? { id: "act:inventory", Icon: ScanBarcodeIcon, run: () => { close(); onInventory(); } } : null,
    books.some(b => b.i && b.i.length) && !B.survey ? { id: "act:check", Icon: ImageIcon, run: () => { go("covers"); B.check(); } } : null,
    { id: "act:site", Icon: ExternalLinkIcon, run: () => { close(); window.open("./", "_blank", "noopener"); } },
    { id: "act:help", Icon: CircleHelpIcon, run: () => { close(); onHelp(); } },
    { id: "act:lock", Icon: LockIcon, run: () => { close(); lock(); } },
  ].filter(Boolean).map(a => {
    const k = a.id.slice(4);
    return { ...a, group: "actions", title: t("kA_" + k), sub: t("kA_" + k + "P"), w: t("kW_" + k) };
  });
  const todo = React.useMemo(() => (open ? todos({ B, draft, info, ins, report, cov, inv }) : []), [open, B, draft, info, ins, report, cov, inv]);
  const todoItems = todo.map(x => {
    const vars = { ...(x.vars || {}) };
    if (vars.n != null) vars.n = nf(vars.n);
    if (vars.f != null) vars.f = nf(vars.f);
    if (vars.d) vars.d = df(vars.d);
    if (vars.c) vars.s = String(vars.c[lang] || vars.c.de || "").trim() || t(vars.c.type === "absent" ? "iAbsent" : "iHoliday");
    return {
      id: "todo:" + x.id, group: "todo", level: x.level, title: t(x.key, vars), sub: t("tdLevel_" + x.level), n: x.n,
      run: () => { if (x.act === "inventory") { close(); onInventory(); } else go(x.tab); },
    };
  });
  const helpItems = React.useMemo(() => (HELP[lang] || HELP.de).flatMap(s => (s.items || []).map(it => ({
    id: `help:${s.id}:${it.id}`, group: "help", title: it.title.replace(/\[\[|\]\]|\{\{|\}\}/g, ""), sub: s.title, sec: s.id, item: it.id,
  }))), [lang]);
  const bookItem = x => ({
    id: "book:" + x.i, group: "books", i: x.i, title: x.b.t, sub: [(x.b.a || []).join(", "), x.b.y].filter(Boolean).join(" · "),
    run: () => openBook(x.i),
  });

  // ---------- search ----------
  const terms = React.useMemo(() => normE(q).split(" ").filter(Boolean), [q]);
  const isbn = React.useMemo(() => {
    const d = q.replace(/[\s-]/g, "").toUpperCase();
    return /^[\dX]{10,13}$/.test(d) && window.DSMExtract ? window.DSMExtract.isbn13(d) : "";
  }, [q]);
  const sections = React.useMemo(() => {
    if (!open) return [];
    const out = [];
    const put = (id, items, more) => { if (items.length) out.push({ id, items, more }); };
    if (!terms.length) {
      put("todo", todoItems);
      put("recent", recent.map(k => byKey.get(k)).filter(i => i != null).slice(0, MAX_RECENT).map(i => ({ ...bookItem(index[i]), group: "recent", id: "recent:" + i })));
      put("tabs", tabs);
      put("actions", actions);
      return out;
    }
    const pick = (items, prep) => items.map(it => { const x = prep(it); return [rank(x, terms), it]; }).filter(([r]) => r >= 0).sort((a, b) => a[0] - b[0]).map(([, it]) => it);
    put("tabs", pick(tabs, it => ({ tn: normE(it.title), s: words(it.title, it.sub, t("kW_" + it.id.slice(4))) })));
    put("actions", pick(actions, it => ({ tn: normE(it.title), s: words(it.title, it.sub, it.w) })));
    put("todo", pick(todoItems, it => ({ tn: normE(it.title), s: words(it.title, it.sub) })));
    put("help", pick(helpItems, it => ({ tn: normE(it.title), s: words(it.title, it.sub) })).slice(0, MAX_HELP));
    let found;
    if (isbn) found = index.filter(x => (x.b.i || []).includes(isbn));
    else {
      found = index.map(x => [rank(x, terms), x]).filter(([r]) => r >= 0)
        .sort((a, b) => a[0] - b[0] || coll.compare(a[1].b.t, b[1].b.t)).map(([, x]) => x);
    }
    put("books", found.slice(0, MAX_BOOKS).map(bookItem), Math.max(0, found.length - MAX_BOOKS));
    return out;
  }, [open, terms, isbn, index, todoItems, recent, byKey, lang, B.survey, ins, books.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const flat = sections.flatMap(s => s.items);
  const more = sections.reduce((n, s) => n + (s.more || 0), 0);
  const at = Math.min(active, Math.max(0, flat.length - 1));
  React.useEffect(() => { setActive(0); }, [q]);
  // The chosen item stays in view
  React.useEffect(() => {
    const el = list.current && list.current.querySelector('[aria-selected="true"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [at, flat.length]);

  // ---------- book card ----------
  function openBook(i) {
    const k = recKey(books[i]);
    const next = [k].concat(recent.filter(x => x !== k)).slice(0, MAX_RECENT);
    setRecent(next);
    store.set(RECENT, JSON.stringify(next));
    setBook(i);
    log("Palette", "book card opened");
    requestAnimationFrame(() => back.current && back.current.focus());
  }
  const leave = () => { setBook(null); requestAnimationFrame(() => input.current && input.current.focus()); };
  const run = it => {
    if (!it) return;
    log("Palette", `${it.id.split(":")[0]} ${it.group === "books" || it.group === "recent" ? "" : it.id.split(":").slice(1).join(":")}`.trim());
    if (it.group === "help") { close(); onHelp(it.sec, it.item); return; }
    it.run();
  };
  const key = e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!flat.length) return;
      setActive((at + (e.key === "ArrowDown" ? 1 : -1) + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(flat[at]);
    }
  };
  const escape = e => {
    if (book != null) { e.preventDefault(); leave(); return; }
    if (q) { e.preventDefault(); setQ(""); }
  };
  const autoFocus = e => { if (fine() && input.current) { e.preventDefault(); input.current.focus(); } };

  const LABEL = { todo: "kG_todo", recent: "kG_recent", tabs: "kG_tabs", actions: "kG_actions", help: "kG_help", books: "kG_books" };
  let k = -1;
  return (
    <GlassDialog
      open={open} onOpenChange={onOpenChange} name="Palette" titleId="cmd-t" id="cmd" className="cmd swipe" overlayClassName="swipe"
      onEscapeKeyDown={escape} onOpenAutoFocus={autoFocus}
    >
      <div className="pane cmd-pane" ref={swipeRef}>
        <DialogTitle id="cmd-t" className="sr-only">{t("kTitle")}</DialogTitle>
        {book != null && books[book] ? (
          <div className="grid gap-4 pt-4 pb-5">
            <div className="pr-14"><Button ref={back} variant="outline" size="sm" id="cmd-back" onClick={leave}><ArrowLeftIcon aria-hidden="true" className="size-4" /><span>{t("kBack")}</span></Button></div>
            <BookCard
              b={books[book]} row={data ? data.d.books[book] : null} records={data ? data.records : null}
              B={B} draft={draft} setDraft={setDraft} onTab={go}
            />
          </div>
        ) : (
          <>
            <div className="cmd-bar">
              <label className="relative block">
                <span className="sr-only">{t("kLabel")}</span>
                <SearchIcon aria-hidden="true" strokeWidth={2} className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={input} id="cmd-q" type="search" value={q} autoComplete="off" spellCheck="false" enterKeyHint="go" placeholder={t("kPh")}
                  role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-autocomplete="list"
                  aria-activedescendant={flat.length ? "cmd-o-" + at : undefined}
                  onChange={e => setQ(e.target.value)} onKeyDown={key}
                  className="h-12 w-full appearance-none rounded-lg border border-border bg-surface pr-11 pl-11 text-m text-foreground outline-none transition-[border-color,background-color] duration-200 placeholder:text-muted-foreground focus:border-foreground focus:bg-background [&::-webkit-search-cancel-button]:hidden"
                />
                {q ? (
                  <button type="button" className="help-clear top-0.5" aria-label={t("hClear")} onClick={() => { setQ(""); input.current && input.current.focus(); }}>
                    <XIcon aria-hidden="true" strokeWidth={2} className="size-4" />
                  </button>
                ) : null}
              </label>
            </div>
            {/* Notes outside the listbox (it may only own groups and options); a group is named by aria-label, its visible
                head is decoration */}
            {!flat.length && terms.length ? (
              <div className="cmd-empty" id="cmd-empty" role="status">
                <SearchIcon aria-hidden="true" strokeWidth={1.6} className="size-[34px] text-muted-foreground" />
                <p className="m-0 font-semibold">{t("kNoneT", { q: q.trim() })}</p>
                <p className="m-0 text-s text-muted-foreground">{t("kNoneP")}</p>
              </div>
            ) : null}
            {!terms.length && !todoItems.length ? <p className="cmd-calm m-0" id="cmd-calm">{t("kAllGood")}</p> : null}
            <div id="cmd-list" ref={list} role="listbox" aria-label={t("kTitle")} className="cmd-list">
              {sections.map(s => (
                <div key={s.id} role="group" aria-label={t(LABEL[s.id])} data-cmd-group={s.id} className="cmd-group">
                  <div className="cmd-gh" aria-hidden="true">{t(LABEL[s.id])}</div>
                  {s.items.map(it => {
                    k++;
                    const n = k, on = n === at;
                    const Icon = it.Icon || (it.group === "help" ? LifeBuoyIcon : it.group === "recent" ? HistoryIcon : it.group === "books" ? BookOpenIcon : null);
                    return (
                      <div
                        key={it.id} id={"cmd-o-" + n} role="option" aria-selected={on} data-cmd={it.id} className={cn("cmd-item", on && "on")}
                        onPointerMove={() => { if (!on) setActive(n); }} onClick={() => run(it)}
                      >
                        <span className="cmd-ic" data-level={it.level} aria-hidden="true">{Icon ? <Icon strokeWidth={1.8} /> : null}</span>
                        <span className="grid min-w-0 flex-1">
                          <span className="cmd-t">{terms.length ? mark(it.title, terms) : it.title}</span>
                          {it.sub ? <span className="cmd-s">{terms.length ? mark(it.sub, terms) : it.sub}</span> : null}
                        </span>
                        {it.n != null ? <span className="cmd-n tabular-nums">{nf(it.n)}</span> : null}
                        <CornerDownLeftIcon aria-hidden="true" strokeWidth={1.8} className="cmd-enter" />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {more ? <p className="cmd-more m-0" id="cmd-more">{t("kMoreBooks", { n: nf(more) })}</p> : null}
            <p className="cmd-foot" aria-hidden="true">
              <span><kbd className="help-key">↑</kbd> <kbd className="help-key">↓</kbd> {t("kNav")}</span>
              <span><kbd className="help-key">↵</kbd> {t("kOpen")}</span>
              <span><kbd className="help-key">Esc</kbd> {t("kClose")}</span>
            </p>
          </>
        )}
      </div>
    </GlassDialog>
  );
}
