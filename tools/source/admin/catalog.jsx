/* Tab "catalog": choose the WinBIAP database, discard personal data (source/extract.js), report,
   check cover coverage, publish a new books.js. Everything runs locally in the browser. */
import * as React from "react";
import { DatabaseIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language";
import { Publish } from "./publish";

// Load sql.js (asm.js build, no WebAssembly needed) only when needed
let sqlPromise = null;
function loadSql() {
  if (sqlPromise) return sqlPromise;
  sqlPromise = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "assets/vendor/sql-asm.js";
    s.onload = () => window.initSqlJs().then(res, rej);
    s.onerror = () => { sqlPromise = null; rej(Object.assign(new Error("lib"), { code: "lib" })); };
    document.head.appendChild(s);
  });
  return sqlPromise;
}

const keyOf = b => (b.t + "|" + ((b.a && b.a[0]) || "")).toLowerCase();
const Lines = ({ id, lines }) => (
  <ul className="lines mt-2 mb-0 list-none p-0" id={id}>
    {lines.map(([label, value, color], n) => (
      <li key={n} className="flex justify-between gap-3 border-t border-border py-2">
        <span>{color ? <span className="mr-2 inline-block size-2.5 rounded-[2px]" style={{ background: `var(${color})` }} /> : null}{label}</span>
        <span className="font-medium whitespace-nowrap tabular-nums">{value}</span>
      </li>
    ))}
  </ul>
);
const Big = props => <div className="big text-l leading-none font-semibold tabular-nums" {...props} />;

export function Catalog({ B }) {
  const { t, nf } = useLanguage();
  const { cur, result } = B;
  const [phase, setPhase] = React.useState(result ? "report" : "choose"); // choose | running | report
  const [status, setStatus] = React.useState(null);
  const [error, setError] = React.useState(null); // [key, values]
  const [over, setOver] = React.useState(false);
  const input = React.useRef(null);

  // File dropped outside the drop zone: the browser should not open it
  React.useEffect(() => {
    const no = e => e.preventDefault();
    addEventListener("dragover", no); addEventListener("drop", no);
    return () => { removeEventListener("dragover", no); removeEventListener("drop", no); };
  }, []);

  const fail = (key, vars) => { setStatus(null); setError([key, vars]); setPhase("choose"); };
  async function handle(file) {
    if (!file) return;
    setError(null); setPhase("running");
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const sig = new TextDecoder().decode(buf.subarray(0, 15));
      if (sig !== "SQLite format 3") return fail("errNotSqlite");
      setStatus("loadingLib");
      const SQL = await loadSql();
      setStatus("reading");
      await new Promise(r => setTimeout(r, 30)); // let the status display render
      const db = new SQL.Database(buf);
      let r;
      try { r = window.DSMExtract.extract(db); } finally { db.close(); }
      B.imported(r);
      setStatus(null);
      setPhase("report");
    } catch (e) {
      if (e && e.code === "not_library_db") return fail("errNotLib");
      if (e && e.code === "lib") return fail("errLib");
      fail("errOther", { m: (e && e.message) || String(e) });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  // ---------- Report ----------
  let report = null;
  if (result && phase === "report") {
    const r = result.report;
    const taken = [[t("records"), nf(r.records)], [t("nonBook"), nf(r.nonBook)]];
    if (r.gone) taken.push([t("gone"), nf(r.gone)]);
    taken.push([t("merged"), nf(r.merged)], [t("withIsbn"), nf(r.withIsbn)]);
    if (cur && cur.books) {
      const before = new Set(cur.books.map(keyOf)), after = new Set(result.books.map(keyOf));
      let a = 0, rm = 0;
      after.forEach(k => { if (!before.has(k)) a++; });
      before.forEach(k => { if (!after.has(k)) rm++; });
      taken.push([t("diff"), t("diffV", { a: nf(a), r: nf(rm) })]);
    }
    const agg = new Map();
    for (const x of r.removedTables) agg.set(x.key, (agg.get(x.key) || 0) + x.rows);
    const removed = [...agg].map(([k, n]) => [t("t_" + k), nf(n)]);
    if (r.loanColumns.length) removed.push([t("loanCols"), t("loanColsV", { n: nf(r.loanColumns.length) })]);
    if (r.namedLoans) removed.push([t("namedLoans"), nf(r.namedLoans)]);
    const hasReaders = r.removedTables.some(x => x.key === "readers");
    let msg = r.nameHits ? t("checkWarn", { n: nf(r.nameHits) }) : (hasReaders ? t("checkOk") : t("checkNoReaders"));
    if (r.nameRemoved) msg += " " + t("checkRemoved", { n: nf(r.nameRemoved) });
    report = (
      <div className="report grid gap-3" id="report">
        <Card>
          <CardTitle>{t("takenT")}</CardTitle>
          <Big id="r-books">{nf(r.books)}</Big>
          <CardDescription>{t("takenP")}</CardDescription>
          <Lines id="r-taken" lines={taken} />
        </Card>
        <Card>
          <CardTitle>{t("removedT")}</CardTitle>
          <Lines id="r-removed" lines={removed.length ? removed : [[t("noneFound"), "–"]]} />
        </Card>
        <div className={cn("flag", r.nameHits && "mid")} id="r-check">{msg}</div>
        <Coverage B={B} />
        <Publish
          file="books.js" build={B.booksFile} ids={{ button: "dl", how: "r-howto", preview: "preview" }} alt="download" howKey="howto" preview
        >
          <Button variant="outline" id="again" onClick={() => { setPhase("choose"); setError(null); setTimeout(() => input.current && input.current.click(), 0); }}>
            <span>{t("again")}</span>
          </Button>
        </Publish>
      </div>
    );
  }

  return (
    <div className="steps grid gap-3.5 pb-10" id="tab-catalog">
      <label
        className={cn("drop relative grid cursor-pointer place-items-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-border bg-surface px-[18px] py-9 text-center transition-[border-color,transform] duration-200 ease-dsm hover:border-blue", over && "over scale-[1.01] border-blue")}
        id="drop" hidden={phase !== "choose"}
        onDragEnter={e => { e.preventDefault(); setOver(true); }} onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={e => { e.preventDefault(); setOver(false); }}
        onDrop={e => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files[0]); }}
      >
        <input
          ref={input} type="file" id="file" className="absolute size-px opacity-0"
          accept=".winbook,.sqlite,.sqlite3,.db,application/vnd.sqlite3,application/x-sqlite3" onChange={e => handle(e.target.files[0])}
        />
        <DatabaseIcon aria-hidden="true" strokeWidth={1.6} className="size-[34px] text-muted-foreground" />
        <strong className="font-semibold">{t("dropT")}</strong>
        <p className="m-0 max-w-120 text-s text-muted-foreground">{t("dropP")}</p>
      </label>
      <div className="status flex items-center gap-2.5 text-muted-foreground" id="status" hidden={!status}>
        <span className="spin" aria-hidden="true" /><span id="statusText">{status ? t(status) : ""}</span>
      </div>
      <div className="flag warn" id="error" hidden={!error}>{error ? t(error[0], error[1]) : ""}</div>
      {report}
    </div>
  );
}

// ---------- Cover coverage ----------
function Coverage({ B }) {
  const { t, nf, df, lang } = useLanguage();
  const { result, cov, survey } = B;
  const pct = x => new Intl.NumberFormat(lang === "it" ? "it-IT" : "de-DE", { style: "percent", maximumFractionDigits: 1 }).format(x || 0);
  const n = result.books.length, e = B.entry();
  const segs = { ekz: 0, ol: 0, gb: 0, none: 0 };
  let big, sub, lines = [];
  if (cov) {
    const tot = cov.total || 1, c = (cov.ekz || 0) + cov.ol + cov.gb;
    big = (cov.complete ? "" : "≥ ") + pct(c / tot);
    sub = t(cov.complete ? "covSub" : "covSubPart", { c: nf(c), n: nf(cov.total), a: pct(c / n) }) +
      (cov.complete ? "" : " · " + (survey ? t("covProgress", { d: nf(cov.done), n: nf(cov.total) }) : t("covPartial", { d: nf(cov.done), n: nf(cov.total) })));
    segs.ekz = (cov.ekz || 0) / tot; segs.ol = cov.ol / tot; segs.gb = cov.gb / tot; segs.none = cov.none / tot;
    lines = [[t("lEkz"), nf(cov.ekz || 0), "--mauve"], [t("lOl"), nf(cov.ol), "--green"], [t("lGb"), nf(cov.gb), "--blue"], [t("lNone"), nf(cov.none), "--red"]];
    if (cov.err) lines.push([t("lErr"), nf(cov.err)]);
    if (cov.total - cov.done > 0) lines.push([t("lOpen"), nf(cov.total - cov.done)]);
  } else {
    big = pct(e.isbn / n);
    sub = t("covIsbn", { p: pct(e.isbn / n) });
  }
  const history = B.history().reverse();
  const cell = "border-t border-border py-[7px] pl-3 text-right whitespace-nowrap first:pl-0 first:text-left";
  return (
    <Card id="cov">
      <CardTitle>{t("covT")}</CardTitle>
      <Big id="c-big">{big}</Big>
      <CardDescription id="c-sub">{sub}</CardDescription>
      <div className="meter mt-3 flex h-2 overflow-hidden rounded-xs bg-border" id="c-meter" aria-hidden="true" hidden={!cov}>
        {[["ekz", "--mauve"], ["ol", "--green"], ["gb", "--blue"], ["none", "--red"]].map(([k, f]) => (
          <i key={k} className={"m-" + k + " block h-full"} style={{ width: segs[k] * 100 + "%", background: `var(${f})` }} />
        ))}
      </div>
      <Lines id="c-lines" lines={lines} />
      <CardFooter>
        <Button variant="outline" id="c-run" hidden={!!survey} onClick={B.check}><span>{t(cov ? "covRerun" : "covRun")}</span></Button>
        <Button variant="outline" id="c-stop" hidden={!survey} onClick={() => survey && survey.stop()}><span>{t("covStop")}</span></Button>
      </CardFooter>
      <p className="note mt-2.5 mb-0 text-s text-muted-foreground" id="c-hint">{t("covHint")}</p>
      <div className="hist mt-[18px]" id="c-hist">
        <h3 className="m-0 mb-1.5 text-m font-semibold">{t("histT")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-s tabular-nums">
            <thead>
              <tr>{["hDate", "hBooks", "hIsbn", "hCover"].map(k => <th key={k} className={cn(cell, "border-t-0 font-medium text-muted-foreground")}>{t(k)}</th>)}</tr>
            </thead>
            <tbody id="c-hbody">
              {history.map((x, i) => (
                <tr key={i}>
                  <td className={cell}>{df(x.updated)}</td>
                  <td className={cell}>{nf(x.books)}</td>
                  <td className={cell}>{nf(x.isbn)} ({pct(x.isbn / x.books)})</td>
                  <td className={cell}>{x.cover != null ? `${nf(x.cover)} (${pct(x.cover / x.books)})${x.complete ? "" : "*"}` : t("hNot")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
