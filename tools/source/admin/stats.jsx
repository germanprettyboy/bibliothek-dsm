/* Tab "Statistik": charts about the collection, each answering one question of the library (title = question,
   caption = key number). Without an import from the published list (books.js): key figures, covers, age, categories.
   After an import (B.ins) also the maintenance lists: problems per list (a bar opens tab "Pflege"), share of copies
   with problems per category/location, location × area. Nothing here is published.
   Charts: charts.jsx; colors = logo tokens, one hue per single-series chart. Props: B (app state, app.jsx). */
import "./strings-stats";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLanguage } from "@/lib/language";
import { allChecks } from "./maintenance";
import { ChartCard, Columns, Donut, HBars, Heatmap, Kpis, Treemap } from "./charts";

const C = { mauve: "var(--mauve)", yellow: "var(--yellow)", orange: "var(--orange)", blue: "var(--blue)", red: "var(--red)", green: "var(--green)", line: "var(--line)" };
// Areas of the maintenance lists that concern single copies (columns of the location heatmap)
const COPY_GROUPS = ["isbn", "title", "copies"];
const TOP_RATE = 12, TOP_LOC = 10, TOP_CAT = 15;
const AGE_FROM = 1970; // the age chart starts here; older books only counted in its caption
const thisYear = () => new Date().getFullYear();
const sum = a => a.reduce((s, v) => s + v, 0);

// Date as two unbreakable parts "09.10." + "2026" (it: "09/10/" + "2026"), a wrap opportunity between them
function SplitDate({ iso, lang, df }) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return df(iso);
  const dm = lang === "it" ? `${m[3]}/${m[2]}/` : `${m[3]}.${m[2]}.`;
  return <><span className="st-nowrap" data-date="dm">{dm}</span><wbr /><span className="st-nowrap" data-date="y">{m[1]}</span></>;
}

// Segmented choice inside a chart card (≥ 44 px targets)
function Seg({ id, label, value, onChange, items }) {
  return (
    <ToggleGroup type="single" variant="surface" id={id} aria-label={label} value={value} onValueChange={v => v && onChange(v)} className="w-full sm:w-auto sm:inline-grid">
      {items.map(([v, text]) => <ToggleGroupItem key={v} value={v} data-v={v} className="h-11 text-s">{text}</ToggleGroupItem>)}
    </ToggleGroup>
  );
}

export function Stats({ B }) {
  const { t, nf, df, lang } = useLanguage();
  const books = B.books || [];
  const ins = B.ins;
  const report = B.result && B.result.report;
  const pct = (a, b) => (b ? nf(Math.round((a / b) * 1000) / 10) + " %" : "–");

  // ---------- Public list (always) ----------
  const pub = React.useMemo(() => {
    const years = [], cats = new Map();
    let isbn = 0, noYear = 0;
    for (const b of books) {
      if (b.i && b.i.length) isbn++;
      const y = parseInt(b.y, 10);
      if (y >= 1450 && y <= thisYear() + 1) years.push(y); else noYear++;
      const c = b.c || "";
      cats.set(c, (cats.get(c) || 0) + 1);
    }
    years.sort((a, b) => a - b);
    return { isbn, years, noYear, cats };
  }, [books]);

  // Cover coverage: the running/finished survey, else the published one (only valid for the published list)
  const cover = (() => {
    const cov = B.cov;
    if (cov && cov.done) return { ekz: cov.ekz || 0, ol: cov.ol || 0, other: 0, none: cov.none || 0, done: !!cov.complete, run: !!B.survey };
    const c = B.cur && B.cur.coverage;
    if (!B.result && !B.fixed && c && c.cover != null) {
      const ekz = c.ekz || 0, ol = c.ol || 0;
      return { ekz, ol, other: Math.max(0, c.cover - ekz - ol), none: c.none || 0, done: !!c.complete || c.checked == null, run: false };
    }
    return null;
  })();

  // ---------- Import: maintenance lists ----------
  const groups = React.useMemo(() => (ins ? allChecks(ins, report, B.cov) : null), [ins, report, B.cov]);
  // Per copy: bit mask of the areas with an entry (the rows' r are the record objects; cover/name rows are not)
  const flags = React.useMemo(() => {
    if (!ins) return null;
    const idx = new Map(ins.records.map((r, i) => [r, i]));
    const f = new Uint8Array(ins.records.length);
    for (const [g, list] of allChecks(ins, report, null)) {
      const bit = COPY_GROUPS.indexOf(g);
      if (bit < 0) continue;
      for (const c of list) for (const x of c.rows) { const i = x.r ? idx.get(x.r) : undefined; if (i !== undefined) f[i] |= 1 << bit; }
    }
    return f;
  }, [ins, report]);

  const cards = [];
  const hint = !ins;

  // KPI row
  const kpis = [{ key: "books", label: t("stKBooks"), value: nf(books.length), color: C.orange }];
  if (ins) kpis.push({ key: "copies", label: t("stKCopies"), value: nf(ins.records.length), color: C.blue });
  kpis.push({ key: "isbn", label: t("stKIsbn"), value: pct(pub.isbn, books.length), note: t("stKOf", { n: nf(pub.isbn) }), color: C.mauve });
  if (cover) {
    const n = cover.ekz + cover.ol + cover.other;
    kpis.push({ key: "cover", label: t("stKCover"), value: (cover.done ? "" : "≥ ") + pct(n, books.length), note: t("stKOf", { n: nf(n) }), color: C.green });
  }
  if (groups) kpis.push({ key: "open", label: t("stKOpen"), value: nf(sum(groups.map(([, l]) => sum(l.map(c => c.rows.length))))), color: C.red });
  if (ins && ins.latest) kpis.push({ key: "latest", label: t("stKLatest"), value: <SplitDate iso={ins.latest} lang={lang} df={df} />, color: C.yellow });
  if (!ins) kpis.push({ key: "cats", label: t("stKCats"), value: nf([...pub.cats.keys()].filter(Boolean).length), color: C.blue });
  cards.push(<ChartCard key="kpi" name="kpi" wide title={t("stKpiT")}><Kpis items={kpis} /></ChartCard>);

  if (!books.length && !ins) {
    return (
      <div className="steps grid gap-3.5 pb-10" id="tab-stats">
        <Card id="st-empty"><CardDescription>{t("stEmpty")}</CardDescription></Card>
      </div>
    );
  }

  if (hint) {
    cards.push(
      <Card key="hint" id="st-hint" className="st-wide">
        <CardTitle>{t("stHintT")}</CardTitle>
        <CardDescription>{t("stHintP")}</CardDescription>
        <CardFooter><Button variant="outline" id="st-to-catalog" onClick={() => B.setTab("catalog")}><span>{t("stToCatalog")}</span></Button></CardFooter>
      </Card>,
    );
  }

  if (groups) cards.push(<Problems key="problems" groups={groups} onPick={() => B.setTab("care")} />);
  if (ins && flags) cards.push(<Rate key="rate" ins={ins} flags={flags} />);
  if (ins && flags) cards.push(<Locations key="locations" ins={ins} flags={flags} />);
  if (books.length) cards.push(<Coverage key="cov" books={books.length} isbn={pub.isbn} cover={cover} />);
  if (pub.years.length >= 3) cards.push(<Age key="age" years={pub.years} noYear={pub.noYear} />);
  if (pub.cats.size >= 2 || (pub.cats.size === 1 && !pub.cats.has(""))) cards.push(<Categories key="cats" cats={pub.cats} total={books.length} />);

  return <div className="st-grid steps pb-10" id="tab-stats">{cards}</div>;
}

// Problems per list, grouped by area; every bar opens tab "Pflege"
function Problems({ groups, onPick }) {
  const { t, nf } = useLanguage();
  const sections = groups
    .map(([g, list]) => ({ key: g, title: t("mG_" + g), items: list.filter(c => c.rows.length).map(c => ({ key: c.key, label: t("m_" + c.key), value: c.rows.length })).sort((a, b) => b.value - a.value) }))
    .filter(s => s.items.length);
  const all = sections.reduce((a, s) => a.concat(s.items.map(i => [s.title, i])), []);
  const total = sum(all.map(([, i]) => i.value));
  const max = Math.max(1, ...all.map(([, i]) => i.value));
  return (
    <ChartCard
      name="problems" wide title={t("stProbT")}
      caption={total ? t("stProbP", { n: nf(total), k: nf(all.length) }) : t("stProbNone")}
      table={all.length ? { head: [t("stList"), t("stGroup"), t("stCount")], rows: all.map(([g, i]) => [i.label, g, nf(i.value)]) } : null}
    >
      {all.length ? (
        <HBars sections={sections} max={max} color={C.red} onPick={onPick} pickLabel={i => t("stProbGo", { label: i.label, n: nf(i.value) })} />
      ) : null}
    </ChartCard>
  );
}

// Share of copies with at least one entry, per category or location (only values with enough copies)
function Rate({ ins, flags }) {
  const { t, nf } = useLanguage();
  const [dim, setDim] = React.useState("c");
  const data = React.useMemo(() => {
    const by = new Map();
    let bad = 0;
    ins.records.forEach((r, i) => {
      const k = r[dim] || "";
      const e = by.get(k) || by.set(k, { n: 0, bad: 0 }).get(k);
      e.n++;
      if (flags[i]) { e.bad++; bad++; }
    });
    const min = ins.records.length >= 300 ? 10 : 1;
    const items = [...by].filter(([, e]) => e.n >= min && e.bad).map(([k, e]) => ({ key: k || "–", name: k, ...e, rate: e.bad / e.n }))
      .sort((a, b) => b.rate - a.rate || b.bad - a.bad).slice(0, TOP_RATE);
    return { items, bad, min };
  }, [ins, flags, dim]);
  const pct = v => nf(Math.round(v * 1000) / 10) + " %";
  const name = it => it.name || t(dim === "c" ? "stNoCat" : "stNoLoc");
  const m = ins.records.length;
  return (
    <ChartCard
      name="rate" title={t("stRateT")}
      caption={t("stRateP", { p: pct(m ? data.bad / m : 0), n: nf(data.bad), m: nf(m) }) + (data.min > 1 ? " " + t("stRateMin", { n: nf(data.min) }) : "")}
      controls={<Seg id="st-rate-dim" label={t("stDim")} value={dim} onChange={setDim} items={[["c", t("stByCat")], ["l", t("stByLoc")]]} />}
      table={{ head: [t(dim === "c" ? "stByCat" : "stByLoc"), t("stShare"), t("stBad"), t("stCopies")], rows: data.items.map(it => [name(it), pct(it.rate), nf(it.bad), nf(it.n)]) }}
    >
      <HBars
        sections={[{ key: dim, items: data.items.map(it => ({ key: it.key, label: name(it), value: it.rate, text: pct(it.rate), sub: t("stOf", { n: nf(it.bad), m: nf(it.n) }) })) }]}
        max={1} track color={C.red}
      />
    </ChartCard>
  );
}

// Location × area: copies with an entry; the locations with the most problem copies
function Locations({ ins, flags }) {
  const { t, nf } = useLanguage();
  const data = React.useMemo(() => {
    const by = new Map();
    ins.records.forEach((r, i) => {
      const k = r.l || "";
      const e = by.get(k) || by.set(k, { n: 0, bad: 0, g: COPY_GROUPS.map(() => 0) }).get(k);
      e.n++;
      if (!flags[i]) return;
      e.bad++;
      COPY_GROUPS.forEach((g, j) => { if (flags[i] & (1 << j)) e.g[j]++; });
    });
    return [...by].filter(([, e]) => e.bad).sort((a, b) => b[1].bad - a[1].bad).slice(0, TOP_LOC);
  }, [ins, flags]);
  if (!data.length) return null;
  const cols = COPY_GROUPS.map(g => t("mG_" + g));
  const rows = data.map(([k]) => k || t("stNoLoc"));
  const max = Math.max(1, ...data.map(([, e]) => Math.max(...e.g)));
  const cells = data.map(([, e], i) => e.g.map((v, j) => ({ value: v, tip: t("stLocCell", { loc: rows[i], g: cols[j], n: nf(v), m: nf(e.n) }) })));
  return (
    <ChartCard name="locations" title={t("stLocT")} caption={t("stLocP", { k: nf(data.length) })}>
      <Heatmap rows={rows} cols={cols} cells={cells} color={C.red} max={max} low={t("stLow")} high={t("stHigh")} rowHead={t("stLocation")} />
    </ChartCard>
  );
}

// Covers: where they come from, and what is missing
function Coverage({ books, isbn, cover }) {
  const { t, nf } = useLanguage();
  const parts = [];
  if (cover) {
    parts.push({ key: "ekz", label: t("stEkz"), value: cover.ekz, color: C.mauve });
    parts.push({ key: "ol", label: t("stOl"), value: cover.ol, color: C.green });
    if (cover.other) parts.push({ key: "other", label: t("stOtherSrc"), value: cover.other, color: C.yellow });
    parts.push({ key: "none", label: t("stNoCover"), value: cover.none, color: C.red });
  }
  const checked = sum(parts.map(p => p.value));
  if (isbn - checked > 0) parts.push({ key: "open", label: t("stUnchecked"), value: isbn - checked, color: C.line });
  parts.push({ key: "noisbn", label: t("stNoIsbn"), value: books - isbn, color: C.blue });
  const found = cover ? cover.ekz + cover.ol + cover.other : 0;
  const pct = v => nf(Math.round((v / (books || 1)) * 1000) / 10) + " %";
  const caption = cover ? t("stCovP", { p: (cover.done ? "" : "≥ ") + pct(found) }) + (cover.run ? " " + t("stCovRun") : "") : t("stCovOpen");
  return (
    <ChartCard
      name="coverage" title={t("stCovT")} caption={caption}
      table={{ head: ["", t("stBooks"), t("stShare")], rows: parts.map(p => [p.label, nf(p.value), pct(p.value)]) }}
    >
      <Donut parts={parts} aria={t("stCovT")} center={cover ? { value: pct(found), label: t("stKCover") } : { value: pct(isbn), label: t("stKIsbn") }} />
    </ChartCard>
  );
}

/* Publication years from AGE_FROM to the current year: one column per year (default) or per 5 years. Older books are
   not drawn, only counted in the caption (and the table's first row); the median is over all books with a year. */
function Age({ years, noYear }) {
  const { t, nf } = useLanguage();
  const [step, setStep] = React.useState("1");
  const data = React.useMemo(() => {
    const s = +step, last = Math.max(thisYear(), years[years.length - 1]);
    const bins = [];
    for (let y = AGE_FROM; y <= last; y += s) bins.push({ key: String(y), label: String(y), name: s > 1 ? `${y}–${y + s - 1}` : String(y), value: 0 });
    let old = 0;
    for (const y of years) if (y < AGE_FROM) old++; else bins[Math.floor((y - AGE_FROM) / s)].value++;
    const median = years[Math.floor((years.length - 1) / 2)];
    const at = median < AGE_FROM ? 0 : (median - AGE_FROM + 0.5) / s;
    return { bins, median, at, old };
  }, [years, step]);
  const hidden = [];
  if (data.old) hidden.push(t("stAgeOld", { n: nf(data.old), y: AGE_FROM }));
  if (noYear) hidden.push(t("stAgeNone", { n: nf(noYear) }));
  const cap = t("stAgeP", { y: data.median }) + (hidden.length ? " " + t("stAgeHidden", { list: hidden.join(", ") }) : "");
  const rows = (data.old ? [[t("stBefore", { y: AGE_FROM }), nf(data.old)]] : []).concat(data.bins.map(b => [b.name, nf(b.value)]));
  return (
    <ChartCard
      name="age" title={t("stAgeT")} caption={cap}
      controls={<Seg id="st-age-bin" label={t("stBin")} value={step} onChange={setStep} items={[["1", t("stYearly")], ["5", t("stFive")]]} />}
      table={{ head: [t("stYears"), t("stBooks")], rows }}
    >
      <Columns
        bins={data.bins.map(b => ({ ...b, tip: b.name + ": " + t("stBooksN", { n: nf(b.value) }) }))}
        color={C.mauve} marker={{ at: data.at, label: t("stMedian", { y: data.median }) }} aria={t("stAgeT")}
      />
    </ChartCard>
  );
}

// Books per category: treemap of the largest, the tail folded into "Weitere"
function Categories({ cats, total }) {
  const { t, nf } = useLanguage();
  const items = React.useMemo(() => {
    const all = [...cats].map(([k, n]) => ({ key: k || "–", label: k || t("stNoCat"), value: n })).sort((a, b) => b.value - a.value);
    const top = all.slice(0, TOP_CAT), rest = all.slice(TOP_CAT);
    if (rest.length) top.push({ key: "rest", label: t("stOther", { n: nf(rest.length) }), value: sum(rest.map(r => r.value)), rest: true });
    return top;
  }, [cats, t, nf]);
  const named = items.filter(i => !i.rest);
  const k = Math.min(5, named.length);
  const share = nf(Math.round((sum(named.slice(0, k).map(i => i.value)) / (total || 1)) * 1000) / 10) + " %";
  return (
    <ChartCard
      name="categories" wide title={t("stCatT")} caption={t("stCatP", { k: nf(k), p: share })}
      table={{ head: [t("stCategory"), t("stBooks"), t("stShare")], rows: items.map(i => [i.label, nf(i.value), nf(Math.round((i.value / (total || 1)) * 1000) / 10) + " %"]) }}
    >
      <Treemap items={items} color={C.blue} total={total} aria={t("stCatT")} />
    </ChartCard>
  );
}
