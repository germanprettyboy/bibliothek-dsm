/* Tab "Pflege": maintenance lists from the WinBIAP file (source/extract.js inspect) – what should be fixed in WinBIAP,
   media types, a location list for the inventory at the shelf (print, CSV). Nothing here is published. */
import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { log } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { Big, Lines } from "./catalog";

const GROUPS = [
  ["isbn", ["isbnBad", "isbnShared", "isbnNone", "coverNone"]],
  ["title", ["yearOdd", "yearNone", "authorNone", "authorFormat", "titleNone", "titleSpaces", "titleCaps", "categoryNone", "locationNone"]],
  ["copies", ["copiesCategory", "copiesLocation"]],
  ["master", ["authorDup", "publisherDup", "categoryDup", "locationDup", "categoryUnused", "locationUnused"]],
  ["names", ["nameHits", "namedCategory", "namedLocation"]],
];
const SHOWN = 100; // rows on the page per list, all of them in the CSV file
const today = () => new Date().toLocaleDateString("sv-SE");
const coll = new Intl.Collator("de", { sensitivity: "base", numeric: true });

// CSV for Excel: BOM, semicolons, CRLF; cells starting with = + - @ are not run as formulas
const cell = v => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
function saveCsv(name, rows) {
  const text = "﻿" + rows.map(r => r.map(cell).join(";")).join("\r\n") + "\r\n";
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  log("Care", `${name} saved (${rows.length - 1} rows)`);
}
const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// All lists: the checks of inspect, plus the cover check (tab "Bestand") and the name check of the import
function allChecks(ins, report, cov) {
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

export function Care({ ins, report, cov, onCatalog }) {
  const { t, nf, df } = useLanguage();
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
  const recordHead = withValue => [t("cId"), t("cTitle"), t("cAuthor"), t("cPublisher"), t("cYear"), t("cCategory"), t("cLocation"), t("cSig"), t("cAdded")].concat(withValue ? [t("cValue")] : []);
  const recordCells = (r, v) => [r.id, r.t, r.a, r.p, r.y, r.c, r.l, r.sig, r.z ? df(r.z) : ""].concat(v === undefined ? [] : [v == null ? "" : v]);
  const csvOf = c => {
    if (!c.rows.length || c.rows[0].r) {
      const withValue = c.rows.some(x => x.v !== undefined);
      return [recordHead(withValue)].concat(c.rows.map(x => recordCells(x.r, withValue ? x.v : undefined)));
    }
    return [[t("cEntry"), t("cCopies")]].concat(c.rows.map(x => [x.v, x.n == null ? "" : x.n]));
  };
  const all = () => {
    const rows = [[t("cCheck")].concat(recordHead(true), [t("cEntry"), t("cCopies")])];
    for (const [, list] of groups) for (const c of list) for (const x of c.rows) {
      rows.push([t("m_" + c.key)].concat(x.r ? recordCells(x.r, x.v).concat(x.v === undefined ? [""] : [], ["", ""]) : ["", "", "", "", "", "", "", "", "", "", x.v, x.n == null ? "" : x.n]));
    }
    saveCsv(`bestandspflege-${today()}.csv`, rows);
  };

  return (
    <div className="steps grid gap-3.5 pb-10" id="tab-care">
      <Card id="m-sum">
        <CardTitle>{t("mT")}</CardTitle>
        <Big id="m-records">{nf(ins.records.length)}</Big>
        <CardDescription>{t("mP")}</CardDescription>
        <Lines id="m-lines" lines={[[t("mRecords"), nf(ins.records.length)]].concat(ins.latest ? [[t("mLatest"), df(ins.latest)]] : [], [[t("mFound"), nf(found)]])} />
        <CardFooter><Button variant="outline" id="m-all" onClick={all}><span>{t("mAll")}</span></Button></CardFooter>
      </Card>
      <Card id="m-checks">
        <CardTitle>{t("mChecksT")}</CardTitle>
        <CardDescription>{t("mChecksP")}</CardDescription>
        {groups.map(([g, list]) => (
          <section key={g} className="mt-3" data-group={g}>
            <h3 className="m-0 mb-1 text-s font-medium text-muted-foreground">{t("mG_" + g)}</h3>
            {list.map(c => <Check key={c.key} c={c} onCsv={() => saveCsv(`${slug(t("m_" + c.key))}-${today()}.csv`, csvOf(c))} />)}
          </section>
        ))}
      </Card>
      <Card id="m-types">
        <CardTitle>{t("mTypesT")}</CardTitle>
        <CardDescription>{t("mTypesP")}</CardDescription>
        <Lines id="m-types-lines" lines={ins.types.map(x => [`${x.name || "–"} · ${t(x.book ? "mTaken" : "mLeft")}`, nf(x.n)])} />
      </Card>
      <Shelf ins={ins} saveCsv={saveCsv} recordHead={recordHead} recordCells={recordCells} />
    </div>
  );
}

// One list: row with name and count; opened: hint, the first rows, CSV
function Check({ c, onCsv }) {
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
                  {records
                    ? [t("cId"), t("cTitle"), t("cAuthor"), t("cLocation")].concat(withValue ? [t("cValue")] : []).map(h => <th key={h} className={th}>{h}</th>)
                    : [t("cEntry"), t("cCopies")].map(h => <th key={h} className={th}>{h}</th>)}
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
          {n > SHOWN ? <p className="m-0 text-s text-muted-foreground">{t("mFirst", { s: nf(SHOWN), n: nf(n) })}</p> : null}
          <div><Button variant="outline" size="sm" data-csv={c.key} onClick={onCsv}>{t("mCsv")}</Button></div>
        </div>
      ) : null}
    </div>
  );
}

// Location list for the inventory: one location, sorted by title; printing shows only this list (styles.css, [data-print])
function Shelf({ ins, saveCsv, recordHead, recordCells }) {
  const { t, nf, df } = useLanguage();
  const byLoc = React.useMemo(() => {
    const m = new Map();
    for (const r of ins.records) { const k = r.l || ""; (m.get(k) || m.set(k, []).get(k)).push(r); }
    for (const list of m.values()) list.sort((x, y) => coll.compare(x.t, y.t) || coll.compare(x.a, y.a));
    return [...m].sort((x, y) => (!x[0] ? 1 : !y[0] ? -1 : coll.compare(x[0], y[0])));
  }, [ins]);
  const [loc, setLoc] = React.useState(byLoc.length ? byLoc[0][0] : "");
  const [printing, setPrinting] = React.useState(false);
  const list = (byLoc.find(x => x[0] === loc) || [loc, []])[1];
  const sig = list.some(r => r.sig);
  const name = l => l || t("mShelfNone");
  React.useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(false);
    addEventListener("afterprint", done);
    const id = setTimeout(() => window.print(), 0); // after the render with data-print
    return () => { clearTimeout(id); removeEventListener("afterprint", done); };
  }, [printing]);
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
      <div className="shelf-list mt-2 overflow-x-auto" id="m-shelf-list" data-print={printing ? "" : undefined}>
        <h2 className="m-0 mb-2 hidden text-m font-semibold print:block">{t("mShelfHead", { l: name(loc), n: nf(list.length), d: df(today()) })}</h2>
        <table className="w-full border-collapse text-s">
          <thead>
            <tr>
              <th className={cn(th, "hidden w-8 print:table-cell")}>{t("cHere")}</th>
              {[t("cTitle"), t("cAuthor"), t("cYear")].concat(sig ? [t("cSig")] : [], [t("cId")]).map(h => <th key={h} className={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id}>
                <td className={cn(td, "hidden print:table-cell")}><span className="inline-block size-3.5 border border-foreground" /></td>
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
        <Button variant="outline" id="m-print" onClick={() => setPrinting(true)}><span>{t("mPrint")}</span></Button>
        <Button variant="outline" id="m-shelf-csv" onClick={() => saveCsv(`${slug(t("cLocation") + "-" + name(loc))}-${today()}.csv`, [recordHead(false)].concat(list.map(r => recordCells(r))))}>
          <span>{t("mCsv")}</span>
        </Button>
        <Button variant="outline" id="m-shelf-all" onClick={() => saveCsv(`${slug(t("mShelfAll"))}-${today()}.csv`, [recordHead(false)].concat(...byLoc.map(([, rs]) => rs.map(r => recordCells(r)))))}>
          <span>{t("mShelfAll")}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
