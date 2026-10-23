/* Tab "catalog": choose the WinBIAP database, discard personal data (source/extract.js), report, maintenance
   analysis (tab "Pflege"), check cover coverage, Italian category names, hide wrong covers, publish a new books.js.
   Without an import the published books.js can be published again with new coverage, names or hidden covers.
   Everything runs locally in the browser. */
import * as React from "react";
import { ChevronDownIcon, DatabaseIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
const normE = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();
const coll = new Intl.Collator("de", { sensitivity: "base", numeric: true });
export const Lines = ({ id, lines }) => (
  <ul className="lines mt-2 mb-0 list-none p-0" id={id}>
    {lines.map(([label, value, color], n) => (
      <li key={n} className="flex justify-between gap-3 border-t border-border py-2">
        <span>{color ? <span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: `var(${color})` }} /> : null}{label}</span>
        <span className="font-medium whitespace-nowrap tabular-nums">{value}</span>
      </li>
    ))}
  </ul>
);
export const Big = props => <div className="big text-l leading-none font-semibold tabular-nums" {...props} />;

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

  // The publish card without an import stays once it appeared (its message must stay visible after publishing)
  const [pubShown, setPubShown] = React.useState(false);
  if (B.changed && !pubShown) setPubShown(true);
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
      let r, ins;
      try {
        r = window.DSMExtract.extract(db);
        setStatus("inspecting");
        await new Promise(res => setTimeout(res, 30));
        ins = window.DSMExtract.inspect(db);
      } finally { db.close(); }
      B.imported(r, ins);
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
    let diff = null;
    if (cur && cur.books) {
      const before = new Set(cur.books.map(keyOf)), after = new Set(result.books.map(keyOf));
      const added = result.books.filter(b => !before.has(keyOf(b))), gone = cur.books.filter(b => !after.has(keyOf(b)));
      taken.push([t("diff"), t("diffV", { a: nf(added.length), r: nf(gone.length) })]);
      if (added.length || gone.length) diff = <Diff added={added} gone={gone} />;
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
      <div className="report grid gap-4 sm:gap-6" id="report">
        <Card>
          <CardTitle>{t("takenT")}</CardTitle>
          <Big id="r-books">{nf(r.books)}</Big>
          <CardDescription>{t("takenP")}</CardDescription>
          <Lines id="r-taken" lines={taken} />
          {diff}
        </Card>
        <Card>
          <CardTitle>{t("removedT")}</CardTitle>
          <Lines id="r-removed" lines={removed.length ? removed : [[t("noneFound"), "–"]]} />
        </Card>
        <Alert variant={r.nameHits ? "mid" : undefined} role="status" id="r-check">{msg}</Alert>
        <Coverage B={B} />
        <CategoriesIt B={B} />
        <HiddenCovers B={B} />
        <Publish
          file="books.js" build={B.booksFile} ids={{ button: "dl", how: "r-howto", preview: "preview" }} alt="download" howKey="howto" preview
        >
          <Button variant="outline" id="again" onClick={() => { setPhase("choose"); setError(null); setTimeout(() => input.current && input.current.click(), 0); }}>
            <span>{t("again")}</span>
          </Button>
        </Publish>
      </div>
    );
  } else if (!result && B.books.length) {
    // Without an import: the published list – check coverage, names, hidden covers, publish again if something changed
    report = (
      <div className="grid gap-4 sm:gap-6" id="current">
        <Coverage B={B} />
        <CategoriesIt B={B} />
        <HiddenCovers B={B} />
        {B.changed || pubShown ? (
          <Publish
            file="books.js" build={B.booksFile} ids={{ button: "dl", how: "r-howto", preview: "preview" }} alt="download" howKey="howto"
            after={<p className="note mt-2 mb-0 text-s text-muted-foreground" id="r-again">{t("pubBooksP")}</p>}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="steps grid gap-4 pb-10 sm:gap-6" id="tab-catalog">
      <label
        className={cn("drop relative grid cursor-pointer place-items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface px-6 py-9 text-center transition-[border-color,transform] duration-(--t-base) ease-dsm hover:border-blue", over && "over scale-[1.01] border-blue")}
        id="drop" hidden={phase !== "choose"}
        onDragEnter={e => { e.preventDefault(); setOver(true); }} onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={e => { e.preventDefault(); setOver(false); }}
        onDrop={e => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files[0]); }}
      >
        <input
          ref={input} type="file" id="file" className="absolute size-px opacity-0"
          accept=".winbook,.sqlite,.sqlite3,.db,application/vnd.sqlite3,application/x-sqlite3" onChange={e => handle(e.target.files[0])}
        />
        <DatabaseIcon aria-hidden="true" className="size-8 text-muted-foreground" />
        <strong className="font-semibold">{t("dropT")}</strong>
        <p className="m-0 max-w-120 text-s text-muted-foreground">{t("dropP")}</p>
      </label>
      <div className="status flex items-center gap-2 text-muted-foreground" id="status" hidden={!status}>
        <span className="spin" aria-hidden="true" /><span id="statusText">{status ? t(status) : ""}</span>
      </div>
      <Alert variant="warn" id="error" hidden={!error}>{error ? t(error[0], error[1]) : ""}</Alert>
      {report}
    </div>
  );
}

// ---------- Cover coverage ----------
function Coverage({ B }) {
  const { t, nf, df, lang } = useLanguage();
  const { cov, survey } = B;
  const pct = x => new Intl.NumberFormat(lang === "it" ? "it-IT" : "de-DE", { style: "percent", maximumFractionDigits: 1 }).format(x || 0);
  const n = B.books.length, e = B.entry();
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
  const cell = "border-t border-border py-2 pl-3 text-right whitespace-nowrap first:pl-0 first:text-left";
  return (
    <Card id="cov">
      <CardTitle>{t("covT")}</CardTitle>
      <Big id="c-big">{big}</Big>
      <CardDescription id="c-sub">{sub}</CardDescription>
      <div className="meter mt-3 flex h-2 overflow-hidden rounded-full bg-border" id="c-meter" aria-hidden="true" hidden={!cov}>
        {[["ekz", "--mauve"], ["ol", "--green"], ["gb", "--blue"], ["none", "--red"]].map(([k, f]) => (
          <i key={k} className={"m-" + k + " block h-full"} style={{ width: segs[k] * 100 + "%", background: `var(${f})` }} />
        ))}
      </div>
      <Lines id="c-lines" lines={lines} />
      <CardFooter>
        <Button variant="outline" id="c-run" hidden={!!survey} onClick={B.check}><span>{t(cov ? "covRerun" : "covRun")}</span></Button>
        <Button variant="outline" id="c-stop" hidden={!survey} onClick={() => survey && survey.stop()}><span>{t("covStop")}</span></Button>
      </CardFooter>
      <p className="note mt-2 mb-0 text-s text-muted-foreground" id="c-hint">{t("covHint")}</p>
      <div className="hist mt-4" id="c-hist">
        <h3 className="m-0 mb-1.5 text-s font-medium text-muted-foreground">{t("histT")}</h3>
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

// Row that opens a part below it (diff titles); whole row as target, chevron turns
export function Opener({ open, onClick, children, ...props }) {
  return (
    <button type="button" aria-expanded={open} onClick={onClick} className="flex min-h-11 w-full items-center gap-3 py-2 text-left" {...props}>
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronDownIcon aria-hidden="true" className={cn("size-4 shrink-0 transition-transform duration-(--t-fast) ease-dsm motion-reduce:transition-none", open && "rotate-180")} />
    </button>
  );
}

// ---------- New and dropped titles compared with the published list ----------
const DIFF_MAX = 200;
function Diff({ added, gone }) {
  const { t, nf } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const list = (id, head, books) => (books.length ? (
    <div id={id}>
      <h3 className="m-0 mb-1 text-s font-medium text-muted-foreground">{head}</h3>
      <ul className="m-0 list-none p-0">
        {books.slice().sort((x, y) => coll.compare(x.t, y.t)).slice(0, DIFF_MAX).map((b, i) => (
          <li key={i} className="border-t border-border py-1.5 first:border-t-0">
            {b.t}<small className="block text-s text-muted-foreground">{(b.a || []).join(", ")}</small>
          </li>
        ))}
      </ul>
      {books.length > DIFF_MAX ? <p className="m-0 mt-1 text-s text-muted-foreground">{t("diffMore", { n: nf(books.length - DIFF_MAX) })}</p> : null}
    </div>
  ) : null);
  return (
    <div className="border-t border-border" id="r-diff">
      <Opener open={open} onClick={() => setOpen(o => !o)}>{t("diffShow")}</Opener>
      {open ? <div className="grid gap-3 pb-1">{list("r-added", t("diffAdded"), added)}{list("r-gone", t("diffGone"), gone)}</div> : null}
    </div>
  );
}

// ---------- Italian names of categories that categories-it.js doesn't know (new in WinBIAP) ----------
function CategoriesIt({ B }) {
  const { t } = useLanguage();
  const own = B.extra.catIt;
  const cats = React.useMemo(() => {
    const file = window.DSM_CATEGORIES_IT || {};
    return [...new Set(B.books.map(b => b.c).filter(Boolean))].filter(c => !file[c]).sort(coll.compare);
  }, [B.books]);
  if (!cats.length) return null;
  return (
    <Card id="cat-it">
      <CardTitle>{t("ciT")}</CardTitle>
      <CardDescription>{t("ciP")}</CardDescription>
      <div className="mt-2 grid">
        {cats.map(c => (
          <label key={c} className="grid gap-1.5 border-t border-border py-2 first:border-t-0 sm:grid-cols-2 sm:items-center sm:gap-3" data-cat={c}>
            <span className="min-w-0">{c}</span>
            <Input lang="it" value={own[c] || ""} placeholder={c} onChange={e => B.setCatIt(c, e.target.value)} />
          </label>
        ))}
      </div>
    </Card>
  );
}

// ---------- Hide a wrong cover: its ISBNs go into books.js noCover, covers.js then shows the placeholder ----------
const SOURCE = { coverEKZ: "lEkz", coverOL: "lOl", coverGB: "lGb" };
function HiddenCovers({ B }) {
  const { t } = useLanguage();
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState(null); // { b, found: undefined = searching | null | {src, by} }
  const withIsbn = React.useMemo(() => B.books.filter(b => b.i && b.i.length), [B.books]);
  const byIsbn = React.useMemo(() => new Map(withIsbn.flatMap(b => b.i.map(i => [i, b]))), [withIsbn]);
  const hits = React.useMemo(() => {
    const s = normE(q);
    if (s.length < 2) return null;
    const terms = s.split(" ");
    return withIsbn.filter(b => { const x = normE([b.t, (b.a || []).join(" "), b.i.join(" ")].join(" ")); return terms.every(w => x.includes(w)); }).slice(0, 8);
  }, [q, withIsbn]);
  const hidden = new Set(B.extra.noCover);
  const show = b => {
    setSel({ b, found: undefined });
    window.DSMCovers.get(b).then(f => setSel(s => (s && s.b === b ? { b, found: f || null } : s)));
  };
  const row = "flex items-center justify-between gap-3 border-t border-border py-2 first:border-t-0";
  return (
    <Card id="nocover">
      <CardTitle>{t("ncT")}</CardTitle>
      <CardDescription>{t("ncP")}</CardDescription>
      <Input id="nc-q" type="search" className="mt-2" autoComplete="off" placeholder={t("ncFind")} value={q} onChange={e => setQ(e.target.value)} />
      {hits ? (
        <ul className="mt-2 mb-0 list-none p-0" id="nc-res">
          {hits.length ? hits.map(b => (
            <li key={b.i.join()} className={row}>
              <span className="min-w-0"><b>{b.t}</b><small className="block text-s text-muted-foreground">{(b.a || []).concat(b.i).join(" · ")}</small></span>
              <Button variant="outline" onClick={() => show(b)}>{t("ncShow")}</Button>
            </li>
          )) : <li className="border-t border-border py-2 text-s text-muted-foreground">{t("eNoResults")}</li>}
        </ul>
      ) : null}
      {sel ? (
        <div className="mt-3 flex items-start gap-4 rounded-lg bg-background p-3" id="nc-sel">
          <div className="grid h-[150px] w-[100px] shrink-0 place-items-center overflow-hidden bg-border">
            {sel.found && !sel.b.i.every(i => hidden.has(i)) ? <img src={sel.found.src} alt="" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" /> : null}
          </div>
          <div className="grid min-w-0 gap-1.5">
            <b>{sel.b.t}</b>
            <small className="text-s text-muted-foreground" id="nc-state">
              {sel.found === undefined ? t("ncLoading") : sel.found ? t("ncFrom", { s: t(SOURCE[sel.found.by] || "lNone") }) : t("ncNone")}
            </small>
            <div>
              {sel.b.i.every(i => hidden.has(i))
                ? <Button variant="outline" id="nc-unhide" onClick={() => B.hideCover(sel.b.i, false)}>{t("ncUnhide")}</Button>
                : <Button variant="outline" id="nc-hide" disabled={!sel.found} onClick={() => B.hideCover(sel.b.i, true)}>{t("ncHide")}</Button>}
            </div>
          </div>
        </div>
      ) : null}
      <h3 className="m-0 mt-4 mb-1 text-s font-medium text-muted-foreground">{t("ncHidden")}</h3>
      {B.extra.noCover.length ? (
        <ul className="m-0 list-none p-0" id="nc-list">
          {B.extra.noCover.map(i => {
            const b = byIsbn.get(i);
            return (
              <li key={i} className={row} data-isbn={i}>
                <span className="min-w-0"><b>{b ? b.t : i}</b><small className="block text-s text-muted-foreground tabular-nums">{i}</small></span>
                <Button variant="outline" onClick={() => B.hideCover([i], false)}>{t("ncUnhide")}</Button>
              </li>
            );
          })}
        </ul>
      ) : <p className="note m-0 text-s text-muted-foreground">{t("ncEmpty")}</p>}
    </Card>
  );
}
