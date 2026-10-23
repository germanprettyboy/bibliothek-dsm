/* Tab "catalog": choose the WinBIAP database, discard personal data (source/extract.js), report, maintenance
   analysis (tab "Pflege"), Italian category names, publish a new books.js. Cover coverage and hidden covers: tab "Cover"
   (covers.jsx). Without an import the published books.js can be published again with new names.
   Everything runs locally in the browser. */
import * as React from "react";
import { ChevronDownIcon, DatabaseIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
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
const coll = new Intl.Collator("de", { sensitivity: "base", numeric: true });
export const Lines = ({ id, lines }) => (
  <ul className="lines mt-2 mb-0 list-none p-0" id={id}>
    {lines.map(([label, value, color], n) => (
      <li key={n} className="flex justify-between gap-3 border-t border-border py-2">
        <span>{color ? <span className="mr-2 inline-block size-2.5 rounded-[2px]" style={{ background: `var(${color})` }} /> : null}{label}</span>
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
      <div className="report grid gap-3" id="report">
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
        <div className={cn("flag", r.nameHits && "mid")} id="r-check">{msg}</div>
        <CategoriesIt B={B} />
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
      <div className="grid gap-3" id="current">
        <CategoriesIt B={B} />
        {B.changed || pubShown ? (
          <Publish
            file="books.js" build={B.booksFile} ids={{ button: "dl", how: "r-howto", preview: "preview" }} alt="download" howKey="howto"
            after={<p className="note mt-2.5 mb-0 text-s text-muted-foreground" id="r-again">{t("pubBooksP")}</p>}
          />
        ) : null}
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

// Row that opens a part below it (diff titles); whole row as target, chevron turns
export function Opener({ open, onClick, children, ...props }) {
  return (
    <button type="button" aria-expanded={open} onClick={onClick} className="flex min-h-11 w-full items-center gap-3 py-2 text-left" {...props}>
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronDownIcon aria-hidden="true" className={cn("size-4 shrink-0 transition-transform duration-150 ease-dsm motion-reduce:transition-none", open && "rotate-180")} />
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
          <label key={c} className="grid gap-1.5 border-t border-border py-2.5 first:border-t-0 sm:grid-cols-2 sm:items-center sm:gap-3" data-cat={c}>
            <span className="min-w-0">{c}</span>
            <Input className="h-10" lang="it" value={own[c] || ""} placeholder={c} onChange={e => B.setCatIt(c, e.target.value)} />
          </label>
        ))}
      </div>
    </Card>
  );
}
