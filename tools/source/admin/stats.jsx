/* Tab "Statistik": charts about the collection, each answering one question of the library (title = question,
   caption = key number). Without an import from the published list (books.js): key figures, covers, age, categories,
   history. After an import (B.ins) also the maintenance lists: problems per list (a bar opens tab "Pflege"), share of
   copies with problems per category/location, location × area, accessions per year. Nothing here is published.
   Charts: charts.jsx; colors = logo tokens, one hue per single-series chart. Props: B (app state, app.jsx). */
import "./strings-stats";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLanguage } from "@/lib/language";
import { allChecks } from "./maintenance";
import { ChartCard, Columns, Donut, HBars, Heatmap, Kpis, LineChart, Treemap } from "./charts";

const C = { mauve: "var(--mauve)", yellow: "var(--yellow)", orange: "var(--orange)", blue: "var(--blue)", red: "var(--red)", green: "var(--green)", line: "var(--line)" };
// Areas of the maintenance lists that concern single copies (columns of the location heatmap)
const COPY_GROUPS = ["isbn", "title", "copies"];
const TOP_RATE = 12, TOP_LOC = 10, TOP_CAT = 15;
const thisYear = () => new Date().getFullYear();
const sum = a => a.reduce((s, v) => s + v, 0);

// Segmented choice inside a chart card (≥ 44 px targets)
function Seg({ id, label, value, onChange, items }) {
  return (
    <ToggleGroup type="single" variant="surface" id={id} aria-label={label} value={value} onValueChange={v => v && onChange(v)} className="w-full sm:w-auto sm:inline-grid">
      {items.map(([v, text]) => <ToggleGroupItem key={v} value={v} data-v={v} className="h-11 text-s">{text}</ToggleGroupItem>)}
    </ToggleGroup>
  );
}

export function Stats({ B }) {
  const { t, nf, df } = useLanguage();
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
  if (ins && ins.latest) kpis.push({ key: "latest", label: t("stKLatest"), value: df(ins.latest), small: true, color: C.yellow });
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
  if (ins) cards.push(<Acquisitions key="acq" ins={ins} />);
  if (books.length) cards.push(<Coverage key="cov" books={books.length} isbn={pub.isbn} cover={cover} />);
  if (pub.years.length >= 3) cards.push(<Age key="age" years={pub.years} noYear={pub.noYear} />);
  if (pub.cats.size >= 2 || (pub.cats.size === 1 && !pub.cats.has(""))) cards.push(<Categories key="cats" cats={pub.cats} total={books.length} />);
  cards.push(<History key="hist" B={B} />);

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

// Accessions per year (WinBIAP accession date) with a linear trend over the complete years
function Acquisitions({ ins }) {
  const { t, nf } = useLanguage();
  const data = React.useMemo(() => {
    const by = new Map();
    let none = 0;
    for (const r of ins.records) {
      const y = r.z ? parseInt(r.z, 10) : NaN;
      if (y > 1900) by.set(y, (by.get(y) || 0) + 1); else none++;
    }
    if (by.size < 2) return null;
    const ys = [...by.keys()];
    const hi = Math.max(...ys), lo0 = Math.min(...ys), lo = Math.max(lo0, hi - 29);
    const bins = [];
    if (lo0 < lo) bins.push({ key: "before", year: null, label: t("stBefore", { y: lo }), value: ys.filter(y => y < lo).reduce((s, y) => s + by.get(y), 0) });
    for (let y = lo; y <= hi; y++) bins.push({ key: String(y), year: y, label: String(y), value: by.get(y) || 0 });
    // trend: least squares over the complete years (the current year is still running)
    const full = bins.filter(b => b.year != null && !(b.year === thisYear() && bins.length > 3));
    let trend = null;
    if (full.length >= 3) {
      const n = full.length, mx = sum(full.map(b => b.year)) / n, my = sum(full.map(b => b.value)) / n;
      const k = sum(full.map(b => (b.year - mx) * (b.value - my))) / (sum(full.map(b => (b.year - mx) ** 2)) || 1);
      trend = bins.map(b => (b.year == null || b.year > full[n - 1].year ? null : my + k * (b.year - mx)));
    }
    const avg = full.length ? sum(full.map(b => b.value)) / full.length : 0;
    return { bins, trend, none, avg, from: full.length ? full[0].year : lo, to: full.length ? full[full.length - 1].year : hi, hi, now: by.get(thisYear()) };
  }, [ins, t]);
  if (!data) return null;
  const cap = [t("stAcqP", { n: nf(Math.round(data.avg)), from: data.from, to: data.to })];
  if (data.hi === thisYear() && data.now) cap.push(t("stAcqNow", { y: data.hi, n: nf(data.now) }));
  if (data.none) cap.push(t("stAcqNone", { n: nf(data.none) }));
  return (
    <ChartCard
      name="acquisitions" wide title={t("stAcqT")} caption={cap.join(" ")}
      legend={[[t("stAdded"), C.orange, "rect"]].concat(data.trend ? [[t("stTrend"), "var(--muted)", "line"]] : [])}
      table={{ head: [t("stYear"), t("stAdded")], rows: data.bins.map(b => [b.label, nf(b.value)]) }}
    >
      <Columns
        bins={data.bins.map(b => ({ ...b, tip: b.label + ": " + t("stAddedN", { n: nf(b.value) }) }))}
        color={C.orange} trend={data.trend} aria={t("stAcqT")}
      />
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

// Publication years: histogram (decades or 5 years) with the median
function Age({ years, noYear }) {
  const { t, nf } = useLanguage();
  const [step, setStep] = React.useState("10");
  const data = React.useMemo(() => {
    const s = +step, first = Math.max(1900, Math.floor(years[0] / s) * s), last = Math.floor(years[years.length - 1] / s) * s;
    const bins = [];
    const old = years.filter(y => y < first).length;
    if (old) bins.push({ key: "before", start: null, label: t("stBefore", { y: first }), value: old });
    for (let y = first; y <= last; y += s) bins.push({ key: String(y), start: y, label: String(y), value: 0 });
    const off = old ? 1 : 0;
    for (const y of years) if (y >= first) bins[off + Math.floor((y - first) / s)].value++;
    const median = years[Math.floor((years.length - 1) / 2)];
    const at = median < first ? 0.5 : off + (median - first) / s + 0.5 / s;
    return { bins, median, at };
  }, [years, step, t]);
  const cap = t("stAgeP", { y: data.median }) + (noYear ? " " + t("stAgeNone", { n: nf(noYear) }) : "");
  const label = b => (b.start != null && +step === 10 ? `${b.start}–${b.start + 9}` : b.start != null ? `${b.start}–${b.start + 4}` : b.label);
  return (
    <ChartCard
      name="age" title={t("stAgeT")} caption={cap}
      controls={<Seg id="st-age-bin" label={t("stBin")} value={step} onChange={setStep} items={[["10", t("stDecades")], ["5", t("stFive")]]} />}
      table={{ head: [t("stYears"), t("stBooks")], rows: data.bins.map(b => [label(b), nf(b.value)]) }}
    >
      <Columns
        bins={data.bins.map(b => ({ ...b, tip: label(b) + ": " + t("stBooksN", { n: nf(b.value) }) }))}
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

// Publication history (books.js history): books, with ISBN, with cover per publication
function History({ B }) {
  const { t, nf, df } = useLanguage();
  const h = B.history().filter(e => e && e.updated && e.books != null);
  if (h.length < 2 || new Set(h.map(e => e.updated)).size < 2) return null;
  const series = [
    { key: "books", label: t("stSBooks"), color: C.orange, values: h.map(e => e.books) },
    { key: "isbn", label: t("stSIsbn"), color: C.mauve, values: h.map(e => (e.isbn == null ? null : e.isbn)) },
  ];
  if (h.filter(e => e.cover != null).length >= 2) series.push({ key: "cover", label: t("stSCover"), color: C.green, values: h.map(e => (e.cover == null ? null : e.cover)) });
  const delta = h[h.length - 1].books - h[0].books;
  return (
    <ChartCard
      name="history" wide title={t("stHistT")}
      caption={t("stHistP", { n: nf(h.length), d: df(h[0].updated), delta: (delta > 0 ? "+" : delta < 0 ? "−" : "±") + nf(Math.abs(delta)) })}
      legend={series.map(s => [s.label, s.color, "line"])}
      table={{ head: [t("stDate")].concat(series.map(s => s.label)), rows: h.map((e, i) => [df(e.updated)].concat(series.map(s => (s.values[i] == null ? "–" : nf(s.values[i]))))) }}
    >
      <LineChart dates={h.map(e => e.updated)} labels={h.map(e => df(e.updated))} series={series} aria={t("stHistT")} />
    </ChartCard>
  );
}
