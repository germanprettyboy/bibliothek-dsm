/* Filter nach Kategorie: Fenster mit allen Kategorien des Bestands (durchsuchbar, mit Anzahl).
   Kategorien sind in WinBIAP flach, aber oft gegliedert („Fantasy - Magie“, „Biografie: Antike“): Teilen sich mindestens
   zwei Kategorien den Teil vor „ - “/„: “, bilden sie eine Gruppe; der Oberbegriff wählt die ganze Gruppe.
   Auswahl als Kennung: „g:<Oberbegriff>“ (Gruppe) oder „k:<Kategorie>“ (genau eine). */
import * as React from "react";
import { CheckIcon, SearchIcon } from "lucide-react";

import { Fenster } from "@/components/fenster";
import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { woerter, useSprache } from "@/lib/sprache";
import { norm } from "@/bibliothek/daten";

woerter({
  de: {
    katT: "Kategorien", katOpen: "Nach Kategorie filtern", katBtn: "Kategorie", katSuche: "Kategorie suchen",
    katAlle: "Alle Bücher", katAllg: "allgemein", katLeer: "Keine Kategorie gefunden.", katWeg: "Kategorie aufheben",
  },
  it: {
    katT: "Categorie", katOpen: "Filtra per categoria", katBtn: "Categoria", katSuche: "Cerca categoria",
    katAlle: "Tutti i libri", katAllg: "generale", katLeer: "Nessuna categoria trovata.", katWeg: "Rimuovi categoria",
  },
});

const TEIL = /^(.+?)(?: - |: )(.+)$/;
const TEIL_IT = /^(.+?)(?: [-–] |: )(.+)$/;
const oberOf = k => { const m = TEIL.exec(k); return m ? m[1] : k; };
// Italienischer Name (kategorien-it.js), sonst der deutsche
export const katName = (k, lang) => (lang === "it" && window.DSM_KATEGORIEN_IT && window.DSM_KATEGORIEN_IT[k]) || k;

// Gruppen aus den Büchern: [{ ober, kats: [{ k, n }], n }]; Gruppe mit nur einer Kategorie = diese Kategorie allein
export function katModell(books) {
  const zahl = new Map();
  for (const b of books) if (b.k) zahl.set(b.k, (zahl.get(b.k) || 0) + 1);
  const gruppen = new Map();
  for (const [k, n] of zahl) {
    const o = oberOf(k);
    let g = gruppen.get(o);
    if (!g) gruppen.set(o, g = { ober: o, kats: [], n: 0 });
    g.kats.push({ k, n });
    g.n += n;
  }
  const echt = new Set([...gruppen.values()].filter(g => g.kats.length > 1).map(g => g.ober));
  const test = id => {
    if (!id) return null;
    const w = id.slice(2);
    if (id.startsWith("g:")) return b => !!b.k && oberOf(b.k) === w;
    return b => b.k === w;
  };
  // Oberbegriff auf Italienisch: eigene Übersetzung, sonst der erste Teil einer übersetzten Unterkategorie
  const oberName = (g, lang) => {
    if (lang !== "it") return g.ober;
    const K = window.DSM_KATEGORIEN_IT || {};
    if (K[g.ober]) return K[g.ober];
    for (const { k } of g.kats) { const m = K[k] && TEIL_IT.exec(K[k]); if (m) return m[1]; }
    return g.ober;
  };
  // Name einer Unterkategorie ohne Oberbegriff; die Kategorie, die nur aus dem Oberbegriff besteht, heißt „allgemein“
  const unterName = (k, lang, t) => {
    const m = TEIL.exec(k);
    if (!m) return t("katAllg");
    const it = lang === "it" && TEIL_IT.exec(katName(k, lang));
    return it ? it[2] : m[2];
  };
  // Anzeige der Auswahl (Chip über der Liste)
  const label = (id, lang, t) => {
    if (!id) return "";
    const w = id.slice(2), g = gruppen.get(oberOf(w));
    if (id.startsWith("g:")) return g ? oberName(g, lang) : w;
    if (g && echt.has(g.ober) && !TEIL.test(w)) return `${oberName(g, lang)} – ${t("katAllg")}`;
    return katName(w, lang);
  };
  return { gruppen: [...gruppen.values()], echt, test, oberName, unterName, label };
}

function Eintrag({ id, wahl, onWahl, titel, n, unter, ober }) {
  const { nf } = useSprache();
  const an = wahl === id;
  return (
    <button
      type="button" data-kat={id || "alle"} aria-pressed={an} onClick={() => onWahl(id)}
      className={cn("kat flex w-full items-center gap-3 rounded-[10px] border-0 bg-transparent px-2.5 py-3 text-left text-foreground transition-colors hover:bg-surface active:bg-border", unter && "unter pl-6", ober && "font-medium", an && "font-semibold")}
    >
      <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", unter && "text-s")}>{titel}</span>
      <span className="text-s text-muted-foreground tabular-nums">{nf(n)}</span>
      <CheckIcon aria-hidden="true" className={cn("size-[18px] shrink-0", !an && "opacity-0")} />
    </button>
  );
}

export function KategorienFenster({ open, onOpenChange, kat, gesamt, wahl, onWahl }) {
  const { lang, t } = useSprache();
  const [q, setQ] = React.useState("");
  React.useEffect(() => { if (open) setQ(""); }, [open]);

  // Sortiert nach angezeigtem Namen; Unterkategorien unter ihrem Oberbegriff, „allgemein“ zuerst
  const liste = React.useMemo(() => {
    const coll = new Intl.Collator(lang === "it" ? "it" : "de", { sensitivity: "base", numeric: true });
    return kat.gruppen.map(g => {
      const gruppe = kat.echt.has(g.ober);
      const name = gruppe ? kat.oberName(g, lang) : katName(g.kats[0].k, lang);
      const kinder = gruppe ? g.kats.map(x => ({ ...x, name: kat.unterName(x.k, lang, t), allg: x.k === g.ober }))
        .sort((a, b) => (b.allg - a.allg) || coll.compare(a.name, b.name)) : null;
      return { id: gruppe ? "g:" + g.ober : "k:" + g.kats[0].k, name, n: g.n, kinder, s: norm(name + " " + g.ober) };
    }).sort((a, b) => coll.compare(a.name, b.name));
  }, [kat, lang, t]);

  const terms = norm(q).split(" ").filter(Boolean);
  const passt = s => terms.every(w => s.includes(w));
  const gezeigt = !terms.length ? liste : liste.map(g => {
    if (passt(g.s)) return g;
    const kinder = g.kinder && g.kinder.filter(x => passt(norm(x.name + " " + x.k)));
    return kinder && kinder.length ? { ...g, kinder } : null;
  }).filter(Boolean);
  const waehlen = id => { onWahl(id); onOpenChange(false); };

  return (
    <Fenster
      open={open} onOpenChange={onOpenChange} name="Kategorien" titleId="k-title" className="kategorien"
      onEscapeKeyDown={e => { if (q) { e.preventDefault(); setQ(""); } }}
    >
      <div className="pane content-start">
        <DialogTitle id="k-title">{t("katT")}</DialogTitle>
        <label className="search relative">
          <SearchIcon aria-hidden="true" strokeWidth={2} className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            id="k-q" type="search" autoComplete="off" spellCheck="false" enterKeyHint="search" value={q}
            placeholder={t("katSuche")} aria-label={t("katSuche")} onChange={e => setQ(e.target.value)}
            className="h-12 w-full appearance-none rounded-lg border border-border bg-surface pr-4 pl-11 text-m outline-none transition-[border-color,background-color] duration-200 placeholder:text-muted-foreground focus:border-foreground focus:bg-background"
          />
        </label>
        <div className="grid">
          {terms.length ? null : <Eintrag id={null} wahl={wahl} onWahl={waehlen} titel={t("katAlle")} n={gesamt} />}
          {gezeigt.length ? (
            <ul className="kat-liste m-0 list-none p-0">
              {gezeigt.map(g => (
                <li key={g.id}>
                  <Eintrag id={g.id} wahl={wahl} onWahl={waehlen} titel={g.name} n={g.n} ober={!!g.kinder} />
                  {g.kinder ? (
                    <ul className="m-0 list-none p-0">
                      {g.kinder.map(x => <li key={x.k}><Eintrag id={"k:" + x.k} wahl={wahl} onWahl={waehlen} titel={x.name} n={x.n} unter /></li>)}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : <p className="m-0 py-3 text-muted-foreground">{t("katLeer")}</p>}
        </div>
      </div>
    </Fenster>
  );
}
