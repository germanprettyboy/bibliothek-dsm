/* Tab "Cover": cover coverage (ekz, Open Library, none; history per published books.js) and hiding wrong covers.
   Both are published with books.js (coverage/history, noCover), so the tab has its own publish card.
   Head of the coverage card: donut ring (ekz mauve, Open Library green, none red; before a check: share with ISBN, blue)
   next to the big percentage. Without any list (nothing published, nothing imported): empty state with a way to "Bestand". */
import "./strings-import";
import * as React from "react";
import { ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language";
import { Big, Lines } from "./catalog";
import { Publish } from "./publish";

const normE = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();

export function Covers({ B }) {
  const { t } = useLanguage();
  // The publish card stays once it appeared (its message must stay visible after publishing)
  const [pubShown, setPubShown] = React.useState(false);
  if (B.changed && !pubShown) setPubShown(true);
  if (!B.books.length) {
    return (
      <div className="steps grid gap-3.5 pb-10" id="tab-covers">
        <Card id="cov-empty" className="items-center px-6 py-10 text-center">
          <ImageIcon aria-hidden="true" strokeWidth={1.6} className="size-[34px] text-muted-foreground" />
          <CardTitle className="mt-1">{t("cvEmptyT")}</CardTitle>
          <CardDescription className="max-w-120">{t("cvEmptyP")}</CardDescription>
          <Button variant="outline" className="mt-2.5" id="cov-go" onClick={() => B.setTab("catalog")}><span>{t("cvEmptyGo")}</span></Button>
        </Card>
      </div>
    );
  }
  return (
    <div className="steps grid gap-3.5 pb-10" id="tab-covers">
      <Coverage B={B} />
      <HiddenCovers B={B} />
      {B.changed || pubShown ? (
        <Publish
          file="books.js" build={B.booksFile} ids={{ button: "dl-covers", how: "cv-howto", preview: "cv-preview" }} alt="download" howKey="howto"
          after={<p className="note mt-2.5 mb-0 text-s text-muted-foreground">{t("pubBooksP")}</p>}
        />
      ) : null}
    </div>
  );
}

// ---------- Cover coverage ----------
function Coverage({ B }) {
  const { t, nf, df, lang } = useLanguage();
  const { cov, survey } = B;
  const pct = x => new Intl.NumberFormat(lang === "it" ? "it-IT" : "de-DE", { style: "percent", maximumFractionDigits: 1 }).format(x || 0);
  const n = B.books.length, e = B.entry();
  const segs = { ekz: 0, ol: 0, none: 0 };
  let big, sub, ring, lines = [];
  if (cov) {
    const tot = cov.total || 1, c = (cov.ekz || 0) + cov.ol;
    big = (cov.complete ? "" : "≥ ") + pct(c / tot);
    sub = t(cov.complete ? "covSub" : "covSubPart", { c: nf(c), n: nf(cov.total), a: pct(c / n) }) +
      (cov.complete ? "" : " · " + (survey ? t("covProgress", { d: nf(cov.done), n: nf(cov.total) }) : t("covPartial", { d: nf(cov.done), n: nf(cov.total) })));
    segs.ekz = (cov.ekz || 0) / tot; segs.ol = cov.ol / tot; segs.none = cov.none / tot;
    ring = { parts: [[segs.ekz, "--mauve"], [segs.ol, "--green"], [segs.none, "--red"]], label: t("cvRing", { p: big }) };
    lines = [[t("lEkz"), nf(cov.ekz || 0), "--mauve"], [t("lOl"), nf(cov.ol), "--green"], [t("lNone"), nf(cov.none), "--red"]];
    if (cov.err) lines.push([t("lErr"), nf(cov.err)]);
    if (cov.total - cov.done > 0) lines.push([t("lOpen"), nf(cov.total - cov.done)]);
  } else {
    big = pct(e.isbn / n);
    sub = t("covIsbn", { p: pct(e.isbn / n) });
    ring = { parts: [[e.isbn / n, "--blue"]], label: t("cvRingIsbn", { p: big }) };
  }
  const history = B.history().reverse();
  const cell = "border-t border-border py-[7px] pl-3 text-right whitespace-nowrap first:pl-0 first:text-left";
  return (
    <Card id="cov">
      <div className="flex items-center gap-4">
        <Ring {...ring} />
        <div className="grid min-w-0 gap-1.5">
          <CardTitle>{t("covT")}</CardTitle>
          <Big id="c-big">{big}</Big>
          <CardDescription id="c-sub">{sub}</CardDescription>
        </div>
      </div>
      <div className="meter mt-3 flex h-2 overflow-hidden rounded-xs bg-border" id="c-meter" aria-hidden="true" hidden={!cov}>
        {[["ekz", "--mauve"], ["ol", "--green"], ["none", "--red"]].map(([k, f]) => (
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

// Donut ring: parts = [[fraction, color token]] one after another from 12 o'clock, the rest is the track.
// The segments grow from zero after mounting and glide on every update (styles.css .cv-ring).
const RR = 40, RC = 2 * Math.PI * RR;
function Ring({ parts, label }) {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => { const id = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(id); }, []);
  let start = 0;
  return (
    <div className="relative grid size-24 shrink-0 place-items-center" id="c-ring">
      <svg className="cv-ring absolute inset-0 size-full" viewBox="0 0 100 100" role="img" aria-label={label}>
        <g transform="rotate(-90 50 50)">
          <circle className="track" cx="50" cy="50" r={RR} />
          {parts.map(([f, c], i) => {
            const len = ready ? Math.max(0, Math.min(1, f || 0)) * RC : 0, off = -start * RC;
            start += f || 0;
            return <circle key={i} className="seg" cx="50" cy="50" r={RR} style={{ stroke: `var(${c})`, strokeDasharray: `${len} ${RC}`, strokeDashoffset: off }} />;
          })}
        </g>
      </svg>
      <ImageIcon aria-hidden="true" strokeWidth={1.6} className="size-7 text-muted-foreground" />
    </div>
  );
}

// ---------- Hide a wrong cover: its ISBNs go into books.js noCover, covers.js then shows the placeholder ----------
const SOURCE = { coverEKZ: "lEkz", coverOL: "lOl" };
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
  const row = "flex items-center justify-between gap-2.5 border-t border-border py-2 first:border-t-0";
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
              <Button variant="outline" size="sm" onClick={() => show(b)}>{t("ncShow")}</Button>
            </li>
          )) : <li className="border-t border-border py-2 text-s text-muted-foreground">{t("eNoResults")}</li>}
        </ul>
      ) : null}
      {sel ? (
        <div className="mt-3 flex items-start gap-3.5 rounded-lg bg-surface p-3" id="nc-sel">
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
                ? <Button variant="outline" size="sm" id="nc-unhide" onClick={() => B.hideCover(sel.b.i, false)}>{t("ncUnhide")}</Button>
                : <Button variant="outline" size="sm" id="nc-hide" disabled={!sel.found} onClick={() => B.hideCover(sel.b.i, true)}>{t("ncHide")}</Button>}
            </div>
          </div>
        </div>
      ) : null}
      <h3 className="m-0 mt-3.5 mb-1 text-s font-medium text-muted-foreground">{t("ncHidden")}</h3>
      {B.extra.noCover.length ? (
        <ul className="m-0 list-none p-0" id="nc-list">
          {B.extra.noCover.map(i => {
            const b = byIsbn.get(i);
            return (
              <li key={i} className={row} data-isbn={i}>
                <span className="min-w-0"><b>{b ? b.t : i}</b><small className="block text-s text-muted-foreground tabular-nums">{i}</small></span>
                <Button variant="outline" size="sm" onClick={() => B.hideCover([i], false)}>{t("ncUnhide")}</Button>
              </li>
            );
          })}
        </ul>
      ) : <p className="note m-0 text-s text-muted-foreground">{t("ncEmpty")}</p>}
    </Card>
  );
}
