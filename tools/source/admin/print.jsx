/* Printing in tab "Pflege": the error lists (dialog with a choice of lists and a preview) and the location list.
   The printable document (PrintDoc) has a header like the website (logo | Bibliothek · Fehlerliste, date and count on the
   right), per list a heading with the colour of its group, the hint and a table whose head repeats on every page.
   PrintJob renders it into body ([data-print], hidden on screen) and sets html.printing: styles.css ("Admin print")
   then prints only the document (no :has(), Firefox ESR 115). Anthracite on white, also in dark mode. */
import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, PrinterIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlassDialog } from "@/components/glass-dialog";
import { log } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { useSwipe } from "@/lib/swipe";
import "./strings-care";

// Group colours (logo colours, as lines only): also the sheet tabs of the Excel file (maintenance.jsx)
export const GROUP_COLOR = { isbn: "blue", title: "mauve", copies: "green", master: "orange", names: "red" };
const ALT = "Deutsche Schule Mailand – Scuola Germanica di Milano";
const PREVIEW_ROWS = 24; // rows per list in the on-screen preview (the printout has all of them)
const today = () => new Date().toLocaleDateString("sv-SE");

// The document. job: { kind: "lists", lists: [{ key, group, rows }] } or { kind: "shelf", loc, list: [records] }
export function PrintDoc({ job, preview }) {
  const { t, nf, df } = useLanguage();
  const cut = rows => (preview ? rows.slice(0, PREVIEW_ROWS) : rows);
  const shelf = job.kind === "shelf";
  const count = shelf ? job.list.length : job.lists.reduce((s, c) => s + c.rows.length, 0);
  return (
    <div className="pdoc">
      <header className="pd-hd">
        <img src="assets/logo-light.webp" width="360" height="200" alt={ALT} />
        <span className="pd-vr" aria-hidden="true" />
        <div className="pd-t"><b>{t("prBib")}</b> · {t(shelf ? "mxShelfDoc" : "mxDoc")}</div>
        <div className="pd-meta">
          <span>{t("mxAsOf", { d: df(today()) })}</span>
          <span>{t(shelf ? "mxCopiesN" : "mxEntries", { n: nf(count) })}</span>
        </div>
      </header>
      {shelf ? <ShelfPart job={job} rows={cut(job.list)} /> : job.lists.map(c => <ListPart key={c.key} c={c} rows={cut(c.rows)} />)}
      <footer className="pd-ft"><span>{t("prFooter")}</span><span>{t("prPrinted", { d: df(today()) })}</span></footer>
    </div>
  );
}

function ListPart({ c, rows }) {
  const { t, nf } = useLanguage();
  const records = !!(c.rows.length && c.rows[0].r), withValue = c.rows.some(x => x.v !== undefined);
  const head = records
    ? [t("cId"), t("cTitle"), t("cAuthor"), t("cLocation")].concat(withValue ? [t("cValue")] : [])
    : [t("cEntry")].concat(c.rows.some(x => x.n != null) ? [t("cCopies")] : []);
  return (
    <section className="pd-sec" data-c={GROUP_COLOR[c.group]} data-print-list={c.key}>
      <span className="pd-grp">{t("mG_" + c.group)}</span>
      <h2 className="pd-h"><span>{t("m_" + c.key)}</span><span className="pd-n">{nf(c.rows.length)}</span></h2>
      <p className="pd-hint">{t("mh_" + c.key)}</p>
      <table className="pd-tb">
        <thead>
          <tr>
            <th scope="col" className="pd-ck">{t("prDone")}</th>
            {head.map(h => <th key={h} scope="col">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((x, i) => (
            <tr key={i}>
              <td className="pd-ck"><span className="pd-box" /></td>
              {records ? (
                <>
                  <td className="num">{x.r.id}</td>
                  <td>{x.r.t || "–"}</td>
                  <td>{x.r.a}</td>
                  <td>{x.r.l}</td>
                  {withValue ? <td className="pd-v">{x.v}</td> : null}
                </>
              ) : (
                <>
                  <td className="pd-v">{x.v}</td>
                  {head.length > 1 ? <td className="num">{x.n == null ? "" : nf(x.n)}</td> : null}
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ShelfPart({ job, rows }) {
  const { t, nf } = useLanguage();
  const sig = job.list.some(r => r.sig);
  return (
    <section className="pd-sec" data-c="mauve" data-print-list="shelf">
      <h2 className="pd-h"><span>{job.loc}</span><span className="pd-n">{nf(job.list.length)}</span></h2>
      <table className="pd-tb">
        <thead>
          <tr>
            <th scope="col" className="pd-ck">{t("cHere")}</th>
            {[t("cTitle"), t("cAuthor"), t("cYear")].concat(sig ? [t("cSig")] : [], [t("cId")]).map(h => <th key={h} scope="col">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td className="pd-ck"><span className="pd-box" /></td>
              <td>{r.t || "–"}</td>
              <td>{r.a}</td>
              <td className="num">{r.y}</td>
              {sig ? <td>{r.sig}</td> : null}
              <td className="num">{r.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// Prints a job: document into body, html.printing, waits for the logo, print(); afterprint ends the job (onDone)
export function PrintJob({ job, onDone }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!job) return undefined;
    const root = document.documentElement;
    let gone = false, id = 0;
    const done = () => { root.classList.remove("printing"); removeEventListener("afterprint", done); if (!gone) onDone(); };
    root.classList.add("printing");
    addEventListener("afterprint", done);
    const img = ref.current && ref.current.querySelector("img");
    const go = () => { if (gone) return; clearTimeout(id); log("Care", `print ${job.kind}`); window.print(); };
    if (img && !img.complete) {
      img.addEventListener("load", go, { once: true });
      img.addEventListener("error", go, { once: true });
      id = setTimeout(go, 1500); // never wait longer for the logo
    } else id = setTimeout(go, 0); // after the render with data-print
    return () => { gone = true; clearTimeout(id); root.classList.remove("printing"); removeEventListener("afterprint", done); };
  }, [job]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!job) return null;
  return createPortal(<div data-print="" ref={ref}><PrintDoc job={job} /></div>, document.body);
}

// Scaled preview of the start of the first page (A4 width 210 mm = 793.7 px)
function Preview({ job }) {
  const { t } = useLanguage();
  const box = React.useRef(null);
  const [scale, setScale] = React.useState(.5);
  // Layout effect: the final height is there before the phone sheet measures its content (lib/swipe.js)
  React.useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => setScale(el.clientWidth / 793.7 || .5);
    fit();
    if (!window.ResizeObserver) return undefined;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <figure className="m-0 grid gap-1.5">
      <figcaption className="text-s text-muted-foreground">{t("prPreview")}</figcaption>
      <div className="pd-preview" ref={box} style={{ height: Math.round(640 * scale) + "px" }} aria-hidden="true">
        <div className="pd-page" style={{ transform: `scale(${scale})` }}><PrintDoc job={job} preview /></div>
      </div>
    </figure>
  );
}

// Dialog: which lists to print. groups = [[group, [{ key, rows }]]] (maintenance.jsx allChecks), only non-empty lists offered
export function PrintDialog({ open, onOpenChange, groups, onPrint }) {
  const { t, nf } = useLanguage();
  const swipeRef = useSwipe(".scrim.swipe", () => onOpenChange(false));
  const offered = groups.map(([g, list]) => [g, list.filter(c => c.rows.length)]).filter(([, list]) => list.length);
  const keys = offered.reduce((a, [, list]) => a.concat(list.map(c => c.key)), []);
  const [picked, setPicked] = React.useState(() => new Set(keys));
  const was = React.useRef(open);
  React.useEffect(() => { if (open && !was.current) setPicked(new Set(keys)); was.current = open; }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const lists = offered.reduce((a, [g, list]) => a.concat(list.filter(c => picked.has(c.key)).map(c => ({ ...c, group: g }))), []);
  const rows = lists.reduce((s, c) => s + c.rows.length, 0);
  const toggle = (k, on) => setPicked(p => { const n = new Set(p); if (on) n.add(k); else n.delete(k); return n; });
  const keep = e => e.preventDefault(); // multiple choice: the menu stays open
  return (
    <GlassDialog open={open} onOpenChange={onOpenChange} name="Print lists" titleId="p-t" id="p-dialog" className="print-dialog swipe" overlayClassName="swipe">
      <div className="pane" ref={swipeRef}>
        <div className="grid gap-1">
          <DialogTitle id="p-t">{t("prT")}</DialogTitle>
          <p className="m-0 text-s text-muted-foreground">{t("prP")}</p>
        </div>
        <div className="grid gap-2">
          {/* modal (default): a non-modal menu loses its focus to the dialog's focus trap and closes at once */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" id="p-pick" className="w-full justify-between">
                <span className="min-w-0 truncate">{t("prPick")}</span>
                <ChevronDownIcon aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]" id="p-menu">
              <div className="grid grid-cols-2 gap-1">
                <DropdownMenuItem id="p-all" onSelect={e => { keep(e); setPicked(new Set(keys)); }}>{t("prAll")}</DropdownMenuItem>
                <DropdownMenuItem id="p-none" onSelect={e => { keep(e); setPicked(new Set()); }}>{t("prClear")}</DropdownMenuItem>
              </div>
              {offered.map(([g, list]) => (
                <React.Fragment key={g}>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="flex items-center gap-2"><i className="pd-dot" data-c={GROUP_COLOR[g]} aria-hidden="true" />{t("mG_" + g)}</DropdownMenuLabel>
                  {list.map(c => (
                    <DropdownMenuCheckboxItem key={c.key} data-pick={c.key} checked={picked.has(c.key)} onSelect={keep} onCheckedChange={on => toggle(c.key, on)}>
                      <span className="min-w-0 flex-1">{t("m_" + c.key)}</span>
                      <span className="text-s tabular-nums text-muted-foreground">{nf(c.rows.length)}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <p className="m-0 text-s text-muted-foreground tabular-nums" id="p-chosen" aria-live="polite">
            {lists.length ? t("prChosen", { n: nf(lists.length), m: nf(keys.length), r: nf(rows) }) : t("prNone")}
          </p>
        </div>
        {lists.length ? <Preview job={{ kind: "lists", lists }} /> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button id="p-go" disabled={!lists.length} onClick={() => { onOpenChange(false); onPrint({ kind: "lists", lists }); }}>
            <PrinterIcon aria-hidden="true" /><span>{t("prGo")}</span>
          </Button>
        </div>
      </div>
    </GlassDialog>
  );
}
