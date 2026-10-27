/* Tab "catalog": choose the WinBook database, discard personal data (source/extract.js), report, maintenance
   analysis (tab "Pflege"), Italian category names, publish a new books.js. Cover coverage and hidden covers: tab "Cover"
   (covers.jsx). Without an import the published books.js can be published again with new names.
   Import slot: drop zone → 3D book loader with steps (#status) → success panel (#import-done) in the same place and size.
   The name check (#r-check) only appears when it found something. Everything runs locally in the browser. */
import "./strings-import";
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

// Name of the last imported file: the success panel shows it again after a tab change (the component remounts)
let lastFile = "";
const STEPS = ["loadingLib", "reading", "inspecting"];

export function Catalog({ B }) {
  const { t, nf } = useLanguage();
  const { cur, result } = B;
  const [phase, setPhase] = React.useState(result ? "report" : "choose"); // choose | running | report
  const [status, setStatus] = React.useState(null);
  const [error, setError] = React.useState(null); // [key, values]
  const [over, setOver] = React.useState(false);
  const input = React.useRef(null);
  const dragged = React.useRef(false); // drop zone shown only because a file is dragged over the success panel

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
    if (!file || phase === "running") return;
    dragged.current = false;
    setError(null); setStatus("loadingLib"); setPhase("running");
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const sig = new TextDecoder().decode(buf.subarray(0, 15));
      if (sig !== "SQLite format 3") return fail("errNotSqlite");
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
      lastFile = file.name || "";
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
  const again = () => { setPhase("choose"); setError(null); setTimeout(() => input.current && input.current.click(), 0); };
  // Drag and drop over the whole slot: over the success panel the drop zone comes back, leaving restores the panel
  const drag = {
    onDragEnter(e) {
      e.preventDefault();
      if (phase === "running") return;
      if (phase === "report") { dragged.current = true; setPhase("choose"); }
      setOver(true);
    },
    onDragOver(e) { e.preventDefault(); if (phase !== "running") setOver(true); },
    onDragLeave(e) {
      e.preventDefault();
      if (e.currentTarget.contains(e.relatedTarget)) return;
      setOver(false);
      if (dragged.current && result) { dragged.current = false; setPhase("report"); }
    },
    onDrop(e) { e.preventDefault(); setOver(false); handle(e.dataTransfer.files[0]); },
  };

  // ---------- Report ----------
  let report = null;
  if (result && phase !== "running") {
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
    // Name check: only shown when there is something to check (a name from the reader file in a public field)
    const warn = [];
    if (r.nameHits) warn.push(t("checkWarn", { n: nf(r.nameHits) }));
    if (r.nameRemoved) warn.push(t("checkRemoved", { n: nf(r.nameRemoved) }));
    report = (
      <div className="report grid gap-3" id="report">
        {warn.length ? <div className="flag mid" id="r-check">{warn.join(" ")}</div> : null}
        <Card>
          <CardTitle>{t("takenT")}</CardTitle>
          <Big id="r-books">{nf(r.books)}</Big>
          <CardDescription>{t("takenP")}</CardDescription>
          <Lines id="r-taken" lines={taken} />
          {diff}
        </Card>
        <CategoriesIt B={B} />
        <Publish file="books.js" build={B.booksFile} ids={{ button: "dl", how: "r-howto", preview: "preview" }} alt="download" howKey="howto" preview />
      </div>
    );
  } else if (!result && B.books.length) {
    // Without an import: the published list – Italian names, publish again if something changed
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

  // Drop zone, loader and success panel share one grid cell: the slot keeps the drop zone's size in every state
  const step = Math.max(0, STEPS.indexOf(status));
  const done = phase === "report" && !!result;
  return (
    <div className="steps grid gap-3.5 pb-10" id="tab-catalog">
      <div className="imp" {...drag}>
        <label
          className={cn("drop relative grid cursor-pointer place-items-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-border bg-surface px-[18px] py-9 text-center transition-[border-color,transform] duration-200 ease-dsm hover:border-blue", over && "over scale-[1.01] border-blue", phase !== "choose" && "invisible")}
          id="drop" aria-hidden={phase !== "choose" || undefined}
        >
          <input
            ref={input} type="file" id="file" className="absolute size-px opacity-0" tabIndex={phase !== "choose" ? -1 : undefined}
            accept=".winbook,.sqlite,.sqlite3,.db,application/vnd.sqlite3,application/x-sqlite3" onChange={e => handle(e.target.files[0])}
          />
          <DatabaseIcon aria-hidden="true" strokeWidth={1.6} className="size-[34px] text-muted-foreground" />
          <strong className="font-semibold">{t("dropT")}</strong>
          <p className="m-0 max-w-120 text-s text-muted-foreground">{t("dropP")}</p>
        </label>
        {phase === "running" || done ? (
          <div className={cn("imp-panel grid place-items-center content-center gap-2 px-[18px] py-2 text-center", done && "done")} id={done ? "import-done" : "status"} role="status" aria-live="polite">
            {done ? (
              <>
                <svg className="imp-check" viewBox="0 0 52 52" aria-hidden="true">
                  <circle className="imp-check-c" cx="26" cy="26" r="24" />
                  <path className="imp-check-p" d="M15 27l7 7 15-16" />
                </svg>
                <strong className="imp-in text-m font-semibold">{t("imDoneT")}</strong>
                <p className="imp-in m-0 max-w-120 text-s text-muted-foreground [overflow-wrap:anywhere]" id="import-sub">
                  {lastFile || t("imFile")}
                </p>
                <Button variant="outline" id="again" className="imp-in" onClick={again}><span>{t("again")}</span></Button>
              </>
            ) : (
              <>
                <BookLoader />
                <span className="text-m" id="statusText">{status ? t(status) : ""}</span>
                <ol className="imp-steps m-0 flex list-none gap-1.5 p-0" aria-label={t("imStep", { i: step + 1, n: STEPS.length })}>
                  {STEPS.map((s, i) => <li key={s} className={cn(i < step && "past", i === step && "now")} />)}
                </ol>
              </>
            )}
          </div>
        ) : null}
      </div>
      <div className="flag warn" id="error" hidden={!error}>{error ? t(error[0], error[1]) : ""}</div>
      {report}
    </div>
  );
}

// Loader: an open book whose pages turn in 3D (pure CSS transforms, also Chrome 109 / Firefox 115).
// The top page (n = 0) lies highest (--z) and turns first.
// Reduced motion: the pages stand still, fanned out (styles.css "Admin import loader").
function BookLoader() {
  return (
    <div className="imp-ld" aria-hidden="true">
      <div className="imp-book">
        <i className="imp-base l" /><i className="imp-base r" />
        {["--mauve", "--blue", "--orange"].map((c, n) => (
          <i key={c} className="imp-page" style={{ "--n": n, "--c": `var(${c})`, "--z": (3 - n) * 0.6 + "px", "--fan": -150 + n * 55 + "deg" }} />
        ))}
      </div>
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

// ---------- Italian names of categories that categories-it.js doesn't know (new in WinBook) ----------
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
