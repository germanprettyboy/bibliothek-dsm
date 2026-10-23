/* Tab "Pflege": maintenance lists from the WinBIAP file (source/extract.js inspect) – what should be fixed in WinBIAP,
   media types, a location list for the inventory at the shelf. Every list: table view (table-view.jsx), download as
   Excel (xlsx.js, formatted, one sheet per list) or CSV, printing (print.jsx). Nothing here is published. */
import * as React from "react";
import { ChevronDownIcon, DownloadIcon, PrinterIcon, TableIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { log } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { Big, Lines } from "./catalog";
import { Fixes } from "./fixes";
import { TableView } from "./table-view";
import { GROUP_COLOR, PrintDialog, PrintJob } from "./print";
import { sheetNames, xlsx } from "./xlsx";
import "./strings-care";

const GROUPS = [
  ["isbn", ["isbnBad", "isbnShared", "isbnNone", "coverNone"]],
  ["title", ["yearOdd", "yearNone", "authorNone", "authorFormat", "titleNone", "titleSpaces", "titleCaps", "categoryNone", "locationNone"]],
  ["copies", ["copiesCategory", "copiesLocation"]],
  ["master", ["authorDup", "publisherDup", "categoryDup", "locationDup", "categoryUnused", "locationUnused"]],
  ["names", ["nameHits", "namedCategory", "namedLocation"]],
];
const HEX = { blue: "B5C9D0", mauve: "BA8EA7", green: "B3CEA1", orange: "DB9F00", red: "A93A39" }; // logo colours (styles.css)
const SHOWN = 100; // rows on the page per list, all of them in the table view and the files
const today = () => new Date().toLocaleDateString("sv-SE");
const coll = new Intl.Collator("de", { sensitivity: "base", numeric: true });

function saveBlob(name, blob, rows) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  log("Care", `${name} saved (${rows} rows)`);
}
/* CSV for Excel (Windows and Mac, German and Italian): UTF-8 with BOM, semicolons, CRLF. Plain values on purpose, so any
   program reads them unchanged: no ="…" wrapping (Numbers/LibreOffice would show it literally, and the file would contain
   formulas). Cells starting with = + - @ tab or CR get a leading ' so Excel never runs them as a formula; Excel then shows
   the '. Excel may still turn a 13-digit ISBN into 9,78E+12 or "5-6" into a date – the Excel export keeps such values as
   text, which is why it is the first choice in the menu. */
const csvCell = v => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[";\r\n]|^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csvBlob = rows => new Blob(["﻿" + rows.map(r => r.map(csvCell).join(";")).join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// All lists: the checks of inspect, plus the cover check (tab "Cover") and the name check of the import (also stats.jsx)
export function allChecks(ins, report, cov) {
  const by = new Map(ins.checks.map(c => [c.key, c.rows]));
  by.set("nameHits", ((report && report.nameHitTitles) || []).map(t => ({ r: { id: "", t, a: "", p: "", y: "", c: "", l: "", sig: "", z: "" } })));
  if (cov && cov.miss) {
    by.set("coverNone", cov.miss.map(b => ({
      r: { id: "", t: b.t, a: (b.a || []).join(", "), p: b.p || "", y: b.y || "", c: b.c || "", l: (b.l || []).join(", "), sig: "", z: "" },
      v: b.i.join(" "),
    })).sort((x, y) => coll.compare(x.r.t, y.r.t)));
  }
  return GROUPS.map(([g, keys]) => [g, keys.filter(k => by.has(k)).map(k => ({ key: k, rows: by.get(k) }))]);
}

/* Tables for the files: columns { head, type: s|n|d, max } and raw rows (dates as YYYY-MM-DD). The same table becomes the
   CSV (dates in the page's format) and an Excel sheet (real dates, ISBN and value columns as text). */
function useExport() {
  const { t, df, lang } = useLanguage();
  const d = today();
  const recCols = () => [
    { head: t("cId"), type: "n" }, { head: t("cTitle"), max: 50 }, { head: t("cAuthor"), max: 34 }, { head: t("cPublisher"), max: 28 },
    { head: t("cYear"), type: "n" }, { head: t("cCategory"), max: 30 }, { head: t("cLocation"), max: 32 }, { head: t("cSig"), max: 20 },
    { head: t("cAdded"), type: "d" },
  ];
  const recVals = r => [r.id, r.t, r.a, r.p, r.y, r.c, r.l, r.sig, r.z];
  const tableOf = c => {
    if (c.rows.length && !c.rows[0].r) return { cols: [{ head: t("cEntry"), max: 70 }, { head: t("cCopies"), type: "n" }], rows: c.rows.map(x => [x.v, x.n == null ? "" : x.n]) };
    const withValue = c.rows.some(x => x.v !== undefined);
    return {
      cols: recCols().concat(withValue ? [{ head: t("cValue"), max: 40 }] : []),
      rows: c.rows.map(x => recVals(x.r).concat(withValue ? [x.v == null ? "" : x.v] : [])),
    };
  };
  // One CSV for all lists: same columns in every row; "Wert" holds the value to fix or the master data entry
  const allTable = groups => ({
    cols: [{ head: t("cCheck"), max: 40 }, { head: t("mxGroup"), max: 22 }].concat(recCols(), [{ head: t("cValue"), max: 40 }, { head: t("cCopies"), type: "n" }]),
    rows: groups.reduce((a, [g, list]) => a.concat(...list.map(c => c.rows.map(x => [t("m_" + c.key), t("mG_" + g)]
      .concat(x.r ? recVals(x.r).concat([x.v == null ? "" : x.v, ""]) : ["", "", "", "", "", "", "", "", "", x.v, x.n == null ? "" : x.n])))), []),
  });
  const csv = (name, tb) => saveBlob(name, csvBlob([tb.cols.map(c => c.head)].concat(tb.rows.map(r => r.map((v, i) => (tb.cols[i].type === "d" ? df(v) : v))))), tb.rows.length);
  const opts = doc => ({ date: lang === "it" ? "dd/mm/yyyy" : "dd.mm.yyyy", title: `${t("mxLib")} · ${doc}`, footer: `${t("mxLib")} · ${doc} · ${t("mxAsOf", { d: df(d) })}` });
  const title = (doc, what) => `${t("mxLib")} · ${doc} · ${what} · ${t("mxAsOf", { d: df(d) })}`;
  const book = (name, sheets, doc) => saveBlob(name, xlsx(sheets, opts(doc)), sheets.reduce((s, x) => s + x.rows.length, 0));
  const listSheet = (c, g, name) => ({ name, tab: HEX[GROUP_COLOR[g]], title: title(t("mxDoc"), t("m_" + c.key)), sub: t("mh_" + c.key), ...tableOf(c) });
  return {
    d, tableOf, recCols, recVals,
    listCsv: c => csv(`${slug(t("m_" + c.key))}-${d}.csv`, tableOf(c)),
    listXlsx: (c, g) => book(`${slug(t("m_" + c.key))}-${d}.xlsx`, [listSheet(c, g, t("m_" + c.key))], t("mxDoc")),
    allCsv: groups => csv(`bestandspflege-${d}.csv`, allTable(groups)),
    // Overview first (group stripe, link to each list's sheet), then one sheet per non-empty list
    allXlsx(groups, sub) {
      const lists = groups.reduce((a, [g, list]) => a.concat(list.map(c => ({ c, g }))), []);
      const full = lists.filter(x => x.c.rows.length);
      const names = sheetNames([t("mxOverview")].concat(full.map(x => t("m_" + x.c.key))));
      const sheetOf = new Map(full.map((x, i) => [x.c.key, names[i + 1]]));
      const overview = {
        name: names[0], tab: HEX.mauve, title: `${t("mxLib")} · ${t("mxDoc")} · ${t("mxAsOf", { d: df(d) })}`, sub,
        cols: [{ head: "", min: 2.5, max: 2.5 }, { head: t("mxGroup"), max: 24 }, { head: t("cCheck"), max: 46 }, { head: t("mxCount"), type: "n" }, { head: t("mxHint"), max: 90 }],
        rows: lists.map(({ c, g }) => [{ v: "", fill: HEX[GROUP_COLOR[g]] }, t("mG_" + g), sheetOf.has(c.key) ? { v: t("m_" + c.key), link: sheetOf.get(c.key) } : t("m_" + c.key), c.rows.length, t("mh_" + c.key)]),
      };
      book(`bestandspflege-${d}.xlsx`, [overview].concat(full.map(x => listSheet(x.c, x.g, sheetOf.get(x.c.key)))), t("mxDoc"));
    },
    shelfCsv: (name, recs) => csv(`${slug(name)}-${d}.csv`, { cols: recCols(), rows: recs.map(recVals) }),
    shelfXlsx: (name, what, recs) => book(`${slug(name)}-${d}.xlsx`, [{ name: what, tab: HEX.mauve, title: title(t("mxShelfDoc"), what), cols: recCols(), rows: recs.map(recVals) }], t("mxShelfDoc")),
  };
}

// "Herunterladen ▾": Excel first, CSV second. sections: [[label | null, [{ text, on, props }]]]
// Not modal (the tab is no dialog): a modal menu locks clicks on the page until its closing animation has ended, so
// opening it again right after a download did nothing. The download runs after the menu has closed.
function DownloadMenu({ triggerProps, label, sections }) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const pick = fn => () => { setOpen(false); setTimeout(fn, 0); };
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" {...triggerProps}>
          <DownloadIcon aria-hidden="true" /><span>{label || t("mxDl")}</span><ChevronDownIcon aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {sections.map(([head, items], i) => (
          <React.Fragment key={i}>
            {i ? <DropdownMenuSeparator /> : null}
            {head ? <DropdownMenuLabel>{head}</DropdownMenuLabel> : null}
            {items.map(it => <DropdownMenuItem key={it.text} onSelect={pick(it.on)} {...it.props}>{it.text}</DropdownMenuItem>)}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Care({ B, ins, report, cov, onCatalog }) {
  const { t, nf, df } = useLanguage();
  const X = useExport();
  const [view, setView] = React.useState(null); // table view: { check } (null check = all data)
  const [printOpen, setPrintOpen] = React.useState(false);
  const [job, setJob] = React.useState(null); // print job (print.jsx)
  if (!ins) {
    return (
      <div className="steps grid gap-3.5 pb-10" id="tab-care">
        <Card id="m-none">
          <CardTitle>{t("mNoneT")}</CardTitle>
          <CardDescription>{t("mNoneP")}</CardDescription>
          <CardFooter><Button variant="outline" id="m-to-catalog" onClick={onCatalog}><span>{t("mToCatalog")}</span></Button></CardFooter>
        </Card>
      </div>
    );
  }
  const groups = allChecks(ins, report, cov);
  const found = groups.reduce((s, [, list]) => s + list.reduce((n, c) => n + c.rows.length, 0), 0);
  const lines = [[t("mRecords"), nf(ins.records.length)]].concat(ins.latest ? [[t("mLatest"), df(ins.latest)]] : [], [[t("mFound"), nf(found)]]);

  return (
    <div className="steps grid gap-3.5 pb-10" id="tab-care">
      <Card id="m-sum">
        <CardTitle>{t("mT")}</CardTitle>
        <Big id="m-records">{nf(ins.records.length)}</Big>
        <CardDescription>{t("mP")}</CardDescription>
        <Lines id="m-lines" lines={lines} />
        <CardFooter>
          <Button variant="outline" id="m-table" onClick={() => setView({ check: null })}><TableIcon aria-hidden="true" /><span>{t("mxAllTable")}</span></Button>
          <DownloadMenu
            triggerProps={{ id: "m-dl" }} label={t("mxAllDl")}
            sections={[[null, [
              { text: t("mxXlsx"), on: () => X.allXlsx(groups, lines.map(l => l.join(": ")).join(" · ")), props: { id: "m-all-xlsx" } },
              { text: t("mxCsv"), on: () => X.allCsv(groups), props: { id: "m-all" } },
            ]]]}
          />
          <Button variant="outline" id="m-print-lists" disabled={!found} onClick={() => setPrintOpen(true)}><PrinterIcon aria-hidden="true" /><span>{t("mPrint")}</span></Button>
        </CardFooter>
      </Card>
      <Fixes B={B} ins={ins} />
      <Card id="m-checks">
        <CardTitle>{t("mChecksT")}</CardTitle>
        <CardDescription>{t("mChecksP")}</CardDescription>
        {groups.map(([g, list]) => (
          <section key={g} className="mt-3" data-group={g}>
            <h3 className="m-0 mb-1 flex items-center gap-2 text-s font-medium text-muted-foreground">
              <i className="pd-dot" data-c={GROUP_COLOR[g]} aria-hidden="true" />{t("mG_" + g)}
            </h3>
            {list.map(c => (
              <Check key={c.key} c={c} onTable={() => setView({ check: c.key })} onCsv={() => X.listCsv(c)} onXlsx={() => X.listXlsx(c, g)} />
            ))}
          </section>
        ))}
      </Card>
      <Card id="m-types">
        <CardTitle>{t("mTypesT")}</CardTitle>
        <CardDescription>{t("mTypesP")}</CardDescription>
        <Lines id="m-types-lines" lines={ins.types.map(x => [`${x.name || "–"} · ${t(x.book ? "mTaken" : "mLeft")}`, nf(x.n)])} />
      </Card>
      <Shelf ins={ins} X={X} onPrint={setJob} />
      <TableView open={!!view} onOpenChange={o => { if (!o) setView(null); }} ins={ins} books={B.books} report={report} cov={cov} check={view ? view.check : null} />
      <PrintDialog open={printOpen} onOpenChange={setPrintOpen} groups={groups} onPrint={setJob} />
      <PrintJob job={job} onDone={() => setJob(null)} />
    </div>
  );
}

// One list: row with name and count; opened: hint, the first rows, table view, download
function Check({ c, onTable, onCsv, onXlsx }) {
  const { t, nf } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const n = c.rows.length, records = !!(n && c.rows[0].r), withValue = c.rows.some(x => x.v !== undefined);
  const th = "border-b border-border py-1.5 pr-3 text-left font-medium text-muted-foreground";
  const td = "border-b border-border py-1.5 pr-3 align-top";
  return (
    <div className="check border-t border-border first-of-type:border-t-0" data-check={c.key}>
      <button
        type="button" className={cn("flex min-h-11 w-full items-center gap-3 py-2 text-left", !n && "cursor-default text-muted-foreground")}
        aria-expanded={n ? open : undefined} disabled={!n} onClick={() => setOpen(o => !o)}
      >
        <span className="min-w-0 flex-1">{t("m_" + c.key)}</span>
        <span className="font-medium tabular-nums">{nf(n)}</span>
        <ChevronDownIcon aria-hidden="true" className={cn("size-4 shrink-0 transition-transform duration-150 ease-dsm motion-reduce:transition-none", open && "rotate-180", !n && "invisible")} />
      </button>
      {open && n ? (
        <div className="grid gap-2.5 pb-3.5">
          <p className="m-0 text-s text-muted-foreground">{t("mh_" + c.key)}</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-s">
              <thead>
                <tr>
                  {(records ? [t("cId"), t("cTitle"), t("cAuthor"), t("cLocation")].concat(withValue ? [t("cValue")] : []) : [t("cEntry"), t("cCopies")])
                    .map(h => <th key={h} scope="col" className={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {c.rows.slice(0, SHOWN).map((x, i) => (records ? (
                  <tr key={i}>
                    <td className={cn(td, "tabular-nums")}>{x.r.id}</td>
                    <td className={td}>{x.r.t}</td>
                    <td className={td}>{x.r.a}</td>
                    <td className={td}>{x.r.l}</td>
                    {withValue ? <td className={cn(td, "font-medium")}>{x.v}</td> : null}
                  </tr>
                ) : (
                  <tr key={i}>
                    <td className={td}>{x.v}</td>
                    <td className={cn(td, "tabular-nums")}>{x.n == null ? "" : nf(x.n)}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
          {n > SHOWN ? <p className="m-0 text-s text-muted-foreground">{t("mxFirst", { s: nf(SHOWN), n: nf(n) })}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" data-table={c.key} onClick={onTable}><TableIcon aria-hidden="true" /><span>{t("mxTable")}</span></Button>
            <DownloadMenu
              triggerProps={{ "data-dl": c.key }}
              sections={[[null, [
                { text: t("mxXlsx"), on: onXlsx, props: { "data-xlsx": c.key } },
                { text: t("mxCsv"), on: onCsv, props: { "data-csv": c.key } },
              ]]]}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Location list for the inventory: one location, sorted by title; printed with the header of print.jsx
function Shelf({ ins, X, onPrint }) {
  const { t, nf } = useLanguage();
  const byLoc = React.useMemo(() => {
    const m = new Map();
    for (const r of ins.records) { const k = r.l || ""; (m.get(k) || m.set(k, []).get(k)).push(r); }
    for (const list of m.values()) list.sort((x, y) => coll.compare(x.t, y.t) || coll.compare(x.a, y.a));
    return [...m].sort((x, y) => (!x[0] ? 1 : !y[0] ? -1 : coll.compare(x[0], y[0])));
  }, [ins]);
  const [loc, setLoc] = React.useState(byLoc.length ? byLoc[0][0] : "");
  const list = (byLoc.find(x => x[0] === loc) || [loc, []])[1];
  const sig = list.some(r => r.sig);
  const name = l => l || t("mShelfNone");
  const every = () => byLoc.reduce((a, [, rs]) => a.concat(rs), []);
  const th = "border-b border-border py-1.5 pr-3 text-left font-medium text-muted-foreground";
  const td = "border-b border-border py-1.5 pr-3 align-top";
  return (
    <Card id="m-shelf">
      <CardTitle>{t("mShelfT")}</CardTitle>
      <CardDescription>{t("mShelfP")}</CardDescription>
      <label className="mt-2 grid gap-1.5">
        <span className="text-s font-medium">{t("mShelfPick")}</span>
        <select
          id="m-loc" value={loc} onChange={e => setLoc(e.target.value)}
          className="h-11 w-full min-w-0 rounded-md border border-border bg-background px-3 text-m text-foreground"
        >
          {byLoc.map(([l, rs]) => <option key={l} value={l}>{`${name(l)} · ${nf(rs.length)}`}</option>)}
        </select>
      </label>
      <div className="shelf-list mt-2 overflow-x-auto" id="m-shelf-list">
        <table className="w-full border-collapse text-s">
          <thead>
            <tr>{[t("cTitle"), t("cAuthor"), t("cYear")].concat(sig ? [t("cSig")] : [], [t("cId")]).map(h => <th key={h} scope="col" className={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id}>
                <td className={td}>{r.t}</td>
                <td className={td}>{r.a}</td>
                <td className={cn(td, "tabular-nums")}>{r.y}</td>
                {sig ? <td className={td}>{r.sig}</td> : null}
                <td className={cn(td, "tabular-nums")}>{r.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CardFooter>
        <Button variant="outline" id="m-print" disabled={!list.length} onClick={() => onPrint({ kind: "shelf", loc: name(loc), list })}>
          <PrinterIcon aria-hidden="true" /><span>{t("mPrint")}</span>
        </Button>
        <DownloadMenu
          triggerProps={{ id: "m-shelf-dl" }}
          sections={[
            [t("mxShelfThis", { l: name(loc) }), [
              { text: t("mxXlsx"), on: () => X.shelfXlsx(t("cLocation") + "-" + name(loc), name(loc), list), props: { id: "m-shelf-xlsx" } },
              { text: t("mxCsv"), on: () => X.shelfCsv(t("cLocation") + "-" + name(loc), list), props: { id: "m-shelf-csv" } },
            ]],
            [t("mxShelfAll"), [
              { text: t("mxXlsx"), on: () => X.shelfXlsx(t("mxShelfAll"), t("mxShelfAll"), every()), props: { id: "m-shelf-all-xlsx" } },
              { text: t("mxCsv"), on: () => X.shelfCsv(t("mxShelfAll"), every()), props: { id: "m-shelf-all" } },
            ]],
          ]}
        />
      </CardFooter>
    </Card>
  );
}
