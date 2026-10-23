/* Filter by category: dialog with all categories of the catalog (searchable, with counts).
   Categories are flat in WinBook but often structured ("Fantasy - Magie", "Biografie: Antike"): if at least
   two categories share the part before " - "/": ", they form a group; the parent term selects the whole group.
   Selection as an id: "g:<parent>" (group) or "c:<category>" (exactly one). */
import * as React from "react";
import { CheckIcon, SearchIcon } from "lucide-react";

import { GlassDialog } from "@/components/glass-dialog";
import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSwipe } from "@/lib/swipe";
import { addStrings, useLanguage } from "@/lib/language";
import { norm } from "@/library/data";

addStrings({
  de: {
    catT: "Kategorien", catOpen: "Nach Kategorie filtern", catBtn: "Kategorie", catSearch: "Kategorie suchen",
    catAll: "Alle Bücher", catGeneral: "allgemein", catNone: "Keine Kategorie gefunden.", catClear: "Kategorie aufheben",
  },
  it: {
    catT: "Categorie", catOpen: "Filtra per categoria", catBtn: "Categoria", catSearch: "Cerca categoria",
    catAll: "Tutti i libri", catGeneral: "generale", catNone: "Nessuna categoria trovata.", catClear: "Rimuovi categoria",
  },
});

const PART = /^(.+?)(?: - |: )(.+)$/;
const PART_IT = /^(.+?)(?: [-–] |: )(.+)$/;
const parentOf = k => { const m = PART.exec(k); return m ? m[1] : k; };
// Italian name (categories-it.js), otherwise the German one
export const categoryName = (k, lang) => (lang === "it" && window.DSM_CATEGORIES_IT && window.DSM_CATEGORIES_IT[k]) || k;

// Groups from the books: [{ parent, cats: [{ k, n }], n }]; a group with only one category = that category alone
export function categoryModel(books) {
  const count = new Map();
  for (const b of books) if (b.c) count.set(b.c, (count.get(b.c) || 0) + 1);
  const groups = new Map();
  for (const [k, n] of count) {
    const p = parentOf(k);
    let g = groups.get(p);
    if (!g) groups.set(p, g = { parent: p, cats: [], n: 0 });
    g.cats.push({ k, n });
    g.n += n;
  }
  const real = new Set([...groups.values()].filter(g => g.cats.length > 1).map(g => g.parent));
  const test = id => {
    if (!id) return null;
    const w = id.slice(2);
    if (id.startsWith("g:")) return b => !!b.c && parentOf(b.c) === w;
    return b => b.c === w;
  };
  // Parent term in Italian: its own translation, otherwise the first part of a translated subcategory
  const parentName = (g, lang) => {
    if (lang !== "it") return g.parent;
    const K = window.DSM_CATEGORIES_IT || {};
    if (K[g.parent]) return K[g.parent];
    for (const { k } of g.cats) { const m = K[k] && PART_IT.exec(K[k]); if (m) return m[1]; }
    return g.parent;
  };
  // Name of a subcategory without the parent term; the category consisting only of the parent term is called "general"
  const subName = (k, lang, t) => {
    const m = PART.exec(k);
    if (!m) return t("catGeneral");
    const it = lang === "it" && PART_IT.exec(categoryName(k, lang));
    return it ? it[2] : m[2];
  };
  // Display of the selection (accessible name of the filter button)
  const label = (id, lang, t) => {
    if (!id) return "";
    const w = id.slice(2), g = groups.get(parentOf(w));
    if (id.startsWith("g:")) return g ? parentName(g, lang) : w;
    if (g && real.has(g.parent) && !PART.test(w)) return `${parentName(g, lang)} – ${t("catGeneral")}`;
    return categoryName(w, lang);
  };
  // Short form next to the filter icon: the label if it fits, otherwise the subcategory, squeezed to one word
  const short = (id, lang, t) => {
    const full = label(id, lang, t), w = id ? id.slice(2) : "";
    if (full.length <= SHORT) return full;
    const g = groups.get(parentOf(w));
    return oneWord(id.startsWith("c:") && g && real.has(g.parent) && PART.test(w) ? subName(w, lang, t) : full);
  };
  return { groups: [...groups.values()], real, test, parentName, subName, label, short };
}

// One word for a long name: its first part (before ":", ",", " - ", "/", "und"/"e", "&"), if that is still too long
// its longest word, nouns (capitalized) preferred – "Wichtige Herrschergeschlechter im Mittelalter" → "Herrschergeschlechter"
const SHORT = 18;
export function oneWord(s) {
  s = s.replace(/\s*\(.*?\)/g, "");
  if (s.length <= SHORT) return s;
  const first = s.split(/:\s|,\s|\s[-–]\s|\s?\/\s?|\s&\s|(?<!-)\s(?:und|e)\s/)[0];
  if (first.length <= SHORT) return first;
  const words = first.split(/\s+/), caps = words.filter(x => /^\p{Lu}/u.test(x));
  return (caps.length ? caps : words).reduce((a, x) => x.length >= a.length ? x : a, "");
}

function Entry({ id, choice, onChoice, title, n, sub, parent }) {
  const { nf } = useLanguage();
  const on = choice === id;
  return (
    <button
      type="button" data-cat={id || "all"} aria-pressed={on} onClick={() => onChoice(id)}
      className={cn("cat flex w-full items-center gap-3 rounded-[10px] border-0 bg-transparent px-2.5 py-3 text-left text-foreground transition-colors hover:bg-surface active:bg-border", sub && "sub pl-6", parent && "font-medium", on && "font-semibold")}
    >
      <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", sub && "text-s")}>{title}</span>
      <span className="text-s text-muted-foreground tabular-nums">{nf(n)}</span>
      <CheckIcon aria-hidden="true" className={cn("size-[18px] shrink-0", !on && "opacity-0")} />
    </button>
  );
}

export function CategoryDialog({ open, onOpenChange, model, total, choice, onChoice }) {
  const { lang, t } = useLanguage();
  const [q, setQ] = React.useState("");
  React.useEffect(() => { if (open) setQ(""); }, [open]);

  // Sorted by the displayed name; subcategories under their parent term, "general" first
  const list = React.useMemo(() => {
    const coll = new Intl.Collator(lang === "it" ? "it" : "de", { sensitivity: "base", numeric: true });
    return model.groups.map(g => {
      const group = model.real.has(g.parent);
      const name = group ? model.parentName(g, lang) : categoryName(g.cats[0].k, lang);
      const children = group ? g.cats.map(x => ({ ...x, name: model.subName(x.k, lang, t), general: x.k === g.parent }))
        .sort((a, b) => (b.general - a.general) || coll.compare(a.name, b.name)) : null;
      return { id: group ? "g:" + g.parent : "c:" + g.cats[0].k, name, n: g.n, children, s: norm(name + " " + g.parent) };
    }).sort((a, b) => coll.compare(a.name, b.name));
  }, [model, lang, t]);

  const terms = norm(q).split(" ").filter(Boolean);
  const matches = s => terms.every(w => s.includes(w));
  const shown = !terms.length ? list : list.map(g => {
    if (matches(g.s)) return g;
    const children = g.children && g.children.filter(x => matches(norm(x.name + " " + x.k)));
    return children && children.length ? { ...g, children } : null;
  }).filter(Boolean);
  const swipeRef = useSwipe(".scrim.swipe", () => onOpenChange(false));
  const choose = id => { onChoice(id); onOpenChange(false); };

  return (
    <GlassDialog
      open={open} onOpenChange={onOpenChange} name="Categories" titleId="cat-title" className="categories swipe" overlayClassName="swipe"
      onEscapeKeyDown={e => { if (q) { e.preventDefault(); setQ(""); } }}
    >
      <div className="pane content-start" ref={swipeRef}>
        <DialogTitle id="cat-title">{t("catT")}</DialogTitle>
        <label className="search relative">
          <SearchIcon aria-hidden="true" strokeWidth={2} className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            id="cat-q" type="search" autoComplete="off" spellCheck="false" enterKeyHint="search" value={q}
            placeholder={t("catSearch")} aria-label={t("catSearch")} onChange={e => setQ(e.target.value)}
            className="h-12 w-full appearance-none rounded-lg border border-border bg-surface pr-4 pl-11 text-m outline-none transition-[border-color,background-color] duration-200 placeholder:text-muted-foreground focus:border-foreground focus:bg-background"
          />
        </label>
        <div className="grid">
          {terms.length ? null : <Entry id={null} choice={choice} onChoice={choose} title={t("catAll")} n={total} />}
          {shown.length ? (
            <ul className="cat-list m-0 list-none p-0">
              {shown.map(g => (
                <li key={g.id}>
                  <Entry id={g.id} choice={choice} onChoice={choose} title={g.name} n={g.n} parent={!!g.children} />
                  {g.children ? (
                    <ul className="m-0 list-none p-0">
                      {g.children.map(x => <li key={x.k}><Entry id={"c:" + x.k} choice={choice} onChoice={choose} title={x.name} n={x.n} sub /></li>)}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : <p className="m-0 py-3 text-muted-foreground">{t("catNone")}</p>}
        </div>
      </div>
    </GlassDialog>
  );
}
