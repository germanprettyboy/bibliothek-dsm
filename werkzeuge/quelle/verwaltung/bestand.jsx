/* Reiter „Bestand“: WinBIAP-Datenbank wählen, Personendaten verwerfen (quelle/extract.js), Bericht,
   Cover-Abdeckung prüfen, neue books.js veröffentlichen. Alles läuft lokal im Browser. */
import * as React from "react";
import { DatabaseIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSprache } from "@/lib/sprache";
import { Veroeffentlichen } from "./veroeffentlichen";

// sql.js (asm.js-Build, kein WebAssembly nötig) erst bei Bedarf laden
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
const Zeilen = ({ id, zeilen }) => (
  <ul className="lines mt-2 mb-0 list-none p-0" id={id}>
    {zeilen.map(([label, wert, farbe], n) => (
      <li key={n} className="flex justify-between gap-3 border-t border-border py-2">
        <span>{farbe ? <span className="mr-2 inline-block size-2.5 rounded-[2px]" style={{ background: `var(${farbe})` }} /> : null}{label}</span>
        <span className="font-medium whitespace-nowrap tabular-nums">{wert}</span>
      </li>
    ))}
  </ul>
);
const Gross = props => <div className="big text-l leading-none font-semibold tabular-nums" {...props} />;

export function Bestand({ B }) {
  const { t, nf, df, lang } = useSprache();
  const { cur, result, stand, cov, survey } = B;
  const [phase, setPhase] = React.useState(result ? "bericht" : "wahl"); // wahl | laeuft | bericht
  const [status, setStatus] = React.useState(null);
  const [fehler, setFehler] = React.useState(null); // [Schlüssel, Werte]
  const [ueber, setUeber] = React.useState(false);
  const input = React.useRef(null);

  // Datei außerhalb der Ablage fallen lassen: Browser soll sie nicht öffnen
  React.useEffect(() => {
    const nein = e => e.preventDefault();
    addEventListener("dragover", nein); addEventListener("drop", nein);
    return () => { removeEventListener("dragover", nein); removeEventListener("drop", nein); };
  }, []);

  const fail = (key, vars) => { setStatus(null); setFehler([key, vars]); setPhase("wahl"); };
  async function handle(file) {
    if (!file) return;
    setFehler(null); setPhase("laeuft");
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const sig = new TextDecoder().decode(buf.subarray(0, 15));
      if (sig !== "SQLite format 3") return fail("errNotSqlite");
      setStatus("loadingLib");
      const SQL = await loadSql();
      setStatus("reading");
      await new Promise(r => setTimeout(r, 30)); // Statusanzeige zeichnen lassen
      const db = new SQL.Database(buf);
      let r;
      try { r = window.DSMExtract.extract(db); } finally { db.close(); }
      B.eingelesen(r);
      setStatus(null);
      setPhase("bericht");
    } catch (e) {
      if (e && e.code === "not_library_db") return fail("errNotLib");
      if (e && e.code === "lib") return fail("errLib");
      fail("errOther", { m: (e && e.message) || String(e) });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  // ---------- Bericht ----------
  let bericht = null;
  if (result && phase === "bericht") {
    const r = result.report;
    const taken = [[t("records"), nf(r.records)], [t("nonBook"), nf(r.nonBook)]];
    if (r.gone) taken.push([t("gone"), nf(r.gone)]);
    taken.push([t("merged"), nf(r.merged)], [t("withIsbn"), nf(r.withIsbn)]);
    if (cur && cur.buecher) {
      const before = new Set(cur.buecher.map(keyOf)), after = new Set(result.books.map(keyOf));
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
    const hasReaders = r.removedTables.some(x => x.key === "leser");
    let msg = r.nameHits ? t("checkWarn", { n: nf(r.nameHits) }) : (hasReaders ? t("checkOk") : t("checkNoReaders"));
    if (r.nameRemoved) msg += " " + t("checkRemoved", { n: nf(r.nameRemoved) });
    bericht = (
      <div className="report grid gap-3" id="report">
        <Card>
          <CardTitle>{t("takenT")}</CardTitle>
          <Gross id="r-books">{nf(r.books)}</Gross>
          <CardDescription>{t("takenP")}</CardDescription>
          <Zeilen id="r-taken" zeilen={taken} />
        </Card>
        <Card>
          <CardTitle>{t("removedT")}</CardTitle>
          <Zeilen id="r-removed" zeilen={removed.length ? removed : [[t("noneFound"), "–"]]} />
        </Card>
        <div className={cn("flag", r.nameHits && "mid")} id="r-check">{msg}</div>
        <Abdeckung B={B} />
        <Veroeffentlichen
          datei="books.js" bau={B.booksDatei} ids={{ knopf: "dl", how: "r-howto", vorschau: "preview" }} alt="download" howKey="howto" vorschau
        >
          <Button variant="outline" id="again" onClick={() => { setPhase("wahl"); setFehler(null); setTimeout(() => input.current && input.current.click(), 0); }}>
            <span>{t("again")}</span>
          </Button>
        </Veroeffentlichen>
      </div>
    );
  }

  return (
    <div className="steps grid gap-3.5 pb-10" id="tab-bestand">
      <label
        className={cn("drop relative grid cursor-pointer place-items-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-border bg-surface px-[18px] py-9 text-center transition-[border-color,transform] duration-200 ease-dsm hover:border-blau", ueber && "over scale-[1.01] border-blau")}
        id="drop" hidden={phase !== "wahl"}
        onDragEnter={e => { e.preventDefault(); setUeber(true); }} onDragOver={e => { e.preventDefault(); setUeber(true); }}
        onDragLeave={e => { e.preventDefault(); setUeber(false); }}
        onDrop={e => { e.preventDefault(); setUeber(false); handle(e.dataTransfer.files[0]); }}
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
      <div className="flag warn" id="error" hidden={!fehler}>{fehler ? t(fehler[0], fehler[1]) : ""}</div>
      {bericht}
    </div>
  );
}

// ---------- Cover-Abdeckung ----------
function Abdeckung({ B }) {
  const { t, nf, df, lang } = useSprache();
  const { result, cov, survey } = B;
  const pct = x => new Intl.NumberFormat(lang === "it" ? "it-IT" : "de-DE", { style: "percent", maximumFractionDigits: 1 }).format(x || 0);
  const n = result.books.length, e = B.entry();
  const segs = { ekz: 0, ol: 0, gb: 0, none: 0 };
  let gross, sub, zeilen = [];
  if (cov) {
    const tot = cov.total || 1, c = (cov.ekz || 0) + cov.ol + cov.gb;
    gross = (cov.complete ? "" : "≥ ") + pct(c / tot);
    sub = t(cov.complete ? "covSub" : "covSubPart", { c: nf(c), n: nf(cov.total), a: pct(c / n) }) +
      (cov.complete ? "" : " · " + (survey ? t("covProgress", { d: nf(cov.done), n: nf(cov.total) }) : t("covPartial", { d: nf(cov.done), n: nf(cov.total) })));
    segs.ekz = (cov.ekz || 0) / tot; segs.ol = cov.ol / tot; segs.gb = cov.gb / tot; segs.none = cov.none / tot;
    zeilen = [[t("lEkz"), nf(cov.ekz || 0), "--mauve"], [t("lOl"), nf(cov.ol), "--gruen"], [t("lGb"), nf(cov.gb), "--blau"], [t("lNone"), nf(cov.none), "--rot"]];
    if (cov.err) zeilen.push([t("lErr"), nf(cov.err)]);
    if (cov.total - cov.done > 0) zeilen.push([t("lOpen"), nf(cov.total - cov.done)]);
  } else {
    gross = pct(e.isbn / n);
    sub = t("covIsbn", { p: pct(e.isbn / n) });
  }
  const verlauf = B.history().reverse();
  const zelle = "border-t border-border py-[7px] pl-3 text-right whitespace-nowrap first:pl-0 first:text-left";
  return (
    <Card id="cov">
      <CardTitle>{t("covT")}</CardTitle>
      <Gross id="c-big">{gross}</Gross>
      <CardDescription id="c-sub">{sub}</CardDescription>
      <div className="meter mt-3 flex h-2 overflow-hidden rounded-xs bg-border" id="c-meter" aria-hidden="true" hidden={!cov}>
        {[["ekz", "--mauve"], ["ol", "--gruen"], ["gb", "--blau"], ["none", "--rot"]].map(([k, f]) => (
          <i key={k} className={"m-" + k + " block h-full"} style={{ width: segs[k] * 100 + "%", background: `var(${f})` }} />
        ))}
      </div>
      <Zeilen id="c-lines" zeilen={zeilen} />
      <CardFooter>
        <Button variant="outline" id="c-run" hidden={!!survey} onClick={B.pruefen}><span>{t(cov ? "covRerun" : "covRun")}</span></Button>
        <Button variant="outline" id="c-stop" hidden={!survey} onClick={() => survey && survey.stop()}><span>{t("covStop")}</span></Button>
      </CardFooter>
      <p className="note mt-2.5 mb-0 text-s text-muted-foreground" id="c-hint">{t("covHint")}</p>
      <div className="hist mt-[18px]" id="c-hist">
        <h3 className="m-0 mb-1.5 text-m font-semibold">{t("histT")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-s tabular-nums">
            <thead>
              <tr>{["hDate", "hBooks", "hIsbn", "hCover"].map(k => <th key={k} className={cn(zelle, "border-t-0 font-medium text-muted-foreground")}>{t(k)}</th>)}</tr>
            </thead>
            <tbody id="c-hbody">
              {verlauf.map((x, i) => (
                <tr key={i}>
                  <td className={zelle}>{df(x.stand)}</td>
                  <td className={zelle}>{nf(x.buecher)}</td>
                  <td className={zelle}>{nf(x.isbn)} ({pct(x.isbn / x.buecher)})</td>
                  <td className={zelle}>{x.cover != null ? `${nf(x.cover)} (${pct(x.cover / x.buecher)})${x.vollstaendig ? "" : "*"}` : t("hNot")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
