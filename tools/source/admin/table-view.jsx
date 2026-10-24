/* Table viewer for all admin data (opened from tab "Pflege"): the WinBook copies of the import (ins.records) or the public
   list (books), searchable, filterable by maintenance list, category and location, sortable by every column, exportable
   as CSV / Excel. Large glass dialog (#table-view): from 40rem nearly the whole window, on phones a screen-high sheet
   with swipe stages and cards instead of table rows; from 40rem a fullscreen toggle left of ×. Only the visible rows are
   rendered (one scroll listener with rAF), so ~20,000 rows stay smooth on the school PCs: every row's height follows from
   its number of problem chips (stacked, one per line), offsets are prefix sums, the visible range a binary search.
   Nothing here is published.
   Props: open, onOpenChange, ins (inspect result or null), books (public list), report (import report), cov (cover survey
   state), check (key of a maintenance list to preselect as filter, optional). Data: table-data.js. */
import "./strings-table";
import * as React from "react";
import {
  ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, Columns3Icon, DownloadIcon, Maximize2Icon, Minimize2Icon, SearchIcon, SlidersHorizontalIcon, XIcon,
} from "lucide-react";

import { GlassDialog } from "@/components/glass-dialog";
import { DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { log } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { useSwipe } from "@/lib/swipe";
import { ALL, COLUMNS, GROUP, LISTS, NONE, buildData, defaultHidden, facets, filterRows, saveBlob, saveCsv, slug, sortRows, today } from "./table-data";
import { xlsx } from "./xlsx";

const OVER = 8; // rows rendered above and below the visible part
const H = { records: 44, books: 56, card: 128 }; // minimum row heights (px): table rows per dataset, phone cards (120 + 8 gap)
const CHIP = 28; // one chip line: 24 px chip + 4 px gap (chips never wrap: nowrap + ellipsis, full text in title)
const WIDE = "(min-width: 40rem)";
const OUT = 400; // ms: the detail panel unmounts at the latest this long after closing (if animationend never fires)

// Height of one row: table rows grow with stacked chips (10 px padding above and below), cards by one chip line per extra chip
const heightOf = (r, ds, wide, chips) => {
  const n = r.probs.length;
  if (!wide) return H.card + Math.max(0, n - 1) * CHIP;
  return chips ? Math.max(H[ds], n * CHIP + 16) : H[ds];
};
// Prefix sums: offs[i] = top of row i, offs[n] = total height
function offsets(view, ds, wide, chips) {
  const offs = new Float64Array(view.length + 1);
  for (let i = 0; i < view.length; i++) offs[i + 1] = offs[i] + heightOf(view[i], ds, wide, chips);
  return offs;
}
// Index of the row that contains y (clamped to 0 … n-1)
function rowAt(offs, y) {
  let lo = 0, hi = offs.length - 2;
  if (hi < 0) return 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offs[mid] <= y) lo = mid; else hi = mid - 1;
  }
  return lo;
}

function useMedia(query) {
  const mq = React.useMemo(() => matchMedia(query), [query]);
  const subscribe = React.useCallback(fn => { mq.addEventListener("change", fn); return () => mq.removeEventListener("change", fn); }, [mq]);
  return React.useSyncExternalStore(subscribe, () => mq.matches);
}

export function TableView({ open, onOpenChange, ins, books, report, cov, check }) {
  const esc = React.useRef(null); // the viewer closes its detail panel first on Escape
  const [full, setFull] = React.useState(false); // fullscreen (from 40rem): class "full" on the sheet
  return (
    <GlassDialog
      open={open} onOpenChange={onOpenChange} name="Table" titleId="tv-title" id="table-view"
      className={cn("table-view swipe", full && "full")} overlayClassName="swipe tv-scrim"
      onEscapeKeyDown={e => { if (esc.current && esc.current()) e.preventDefault(); }}
      onOpenAutoFocus={e => {
        // with a mouse straight into the search; on touch screens no keyboard popping up
        if (!matchMedia(WIDE + " and (pointer: fine)").matches) return;
        const s = document.getElementById("tv-search");
        if (s) { e.preventDefault(); s.focus(); }
      }}
    >
      <Viewer
        ins={ins} books={books || []} report={report} cov={cov} check={check} esc={esc} onClose={() => onOpenChange(false)}
        full={full} setFull={setFull}
      />
    </GlassDialog>
  );
}

function Viewer({ ins, books, report, cov, check, esc, onClose, full, setFull }) {
  const { t, nf, df, lang } = useLanguage();
  const wide = useMedia(WIDE);
  const [set, setSet] = React.useState(ins ? "records" : "books");
  const [q, setQ] = React.useState("");
  const [list, setList] = React.useState(check && GROUP[check] ? check : ALL);
  const [cat, setCat] = React.useState(ALL);
  const [loc, setLoc] = React.useState(ALL);
  const [sort, setSort] = React.useState({ col: null, dir: null });
  const [hidden, setHidden] = React.useState(() => {
    const w = Math.min(1152, innerWidth - 48);
    return { records: defaultHidden("records", w), books: defaultHidden("books", w) };
  });
  const [filters, setFilters] = React.useState(false); // phone: filter row unfolded
  const [sel, setSel] = React.useState(null); // detail: { r, i }
  const [closing, setClosing] = React.useState(false); // detail flies out, unmounts on animationend
  const [fi, setFi] = React.useState(0); // row reachable with Tab (roving tabindex)
  const [range, setRange] = React.useState([0, 40]);
  const [barH, setBarH] = React.useState(0);

  // Rebuild only when the survey result changes, not on every progress step
  const covKey = cov ? `${cov.miss ? cov.miss.length : 0}|${!!cov.complete}` : "";
  const covRef = React.useRef(cov);
  covRef.current = cov;
  const data = React.useMemo(() => buildData(ins, books, report, covRef.current), [ins, books, report, covKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const ds = set === "records" && data.records ? "records" : "books";
  const rows = ds === "records" ? data.records : data.books;
  const fac = React.useMemo(() => facets(rows), [rows]);
  const filtered = React.useMemo(() => filterRows(rows, { q, list, cat, loc }), [rows, q, list, cat, loc]);
  const view = React.useMemo(() => sortRows(filtered, sort.col, sort.dir), [filtered, sort]);
  const cols = React.useMemo(
    () => COLUMNS[ds].filter(c => c.fixed || (!hidden[ds].has(c.id) && (c.needs !== "cov" || cov))),
    [ds, hidden, !!cov], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const chips = cols.some(c => c.id === "probs");
  const offs = React.useMemo(() => offsets(view, ds, wide, chips), [view, ds, wide, chips]);
  const active = (list !== ALL) + (cat !== ALL) + (loc !== ALL);

  // ---------- Windowed rendering: the pane scrolls, row i lies at offs[i] in .tv-list ----------
  const paneRef = React.useRef(null), listRef = React.useRef(null), tableRef = React.useRef(null), barRef = React.useRef(null), headRef = React.useRef(null);
  const swipeRef = useSwipe(".scrim.tv-scrim", onClose);
  const setPane = React.useCallback(el => { paneRef.current = el; swipeRef(el); }, [swipeRef]);
  const metrics = React.useRef(offs);
  metrics.current = offs;
  const sticky = () => (barRef.current ? barRef.current.offsetHeight : 0) + (headRef.current ? headRef.current.offsetHeight : 0);
  const update = React.useCallback(() => {
    const pane = paneRef.current, el = listRef.current;
    if (!pane || !el) return;
    const o = metrics.current, n = o.length - 1, top = el.offsetTop;
    const from = Math.max(0, rowAt(o, pane.scrollTop - top) - OVER);
    const to = Math.min(n, rowAt(o, pane.scrollTop + pane.clientHeight - top) + 1 + OVER);
    setRange(r => (r[0] === from && r[1] === to ? r : [from, to]));
  }, []);
  React.useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return undefined;
    let raf = 0;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
    pane.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => { if (barRef.current) setBarH(barRef.current.offsetHeight); onScroll(); });
    ro.observe(pane);
    if (barRef.current) ro.observe(barRef.current);
    return () => { pane.removeEventListener("scroll", onScroll); ro.disconnect(); cancelAnimationFrame(raf); };
  }, [update]);
  React.useLayoutEffect(update, [update, offs, wide, full]);
  // New search, filter, sort or dataset: back to the first row (only if scrolled further)
  React.useLayoutEffect(() => {
    const pane = paneRef.current, table = tableRef.current;
    setFi(0);
    if (!pane || !table) return;
    const start = Math.max(0, table.offsetTop - (barRef.current ? barRef.current.offsetHeight : 0));
    if (pane.scrollTop > start) pane.scrollTop = start;
    update();
  }, [q, list, cat, loc, sort, ds, update]);

  // ---------- Keyboard: arrows, Home/End, page keys move between rows; Enter/Space open the details ----------
  const wantFocus = React.useRef(null);
  const reveal = i => {
    const pane = paneRef.current, el = listRef.current;
    if (!pane || !el) return;
    const top = el.offsetTop + offs[i], h = offs[i + 1] - offs[i], min = pane.scrollTop + sticky();
    if (top < min) pane.scrollTop = top - sticky();
    else if (top + h > pane.scrollTop + pane.clientHeight) pane.scrollTop = top + h - pane.clientHeight;
    update();
  };
  const moveTo = i => { reveal(i); setFi(i); wantFocus.current = i; };
  React.useEffect(() => {
    if (wantFocus.current == null || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-i="${wantFocus.current}"]`);
    if (el) { el.focus({ preventScroll: true }); wantFocus.current = null; }
  });
  // Details: open at once (fly in), close = fly out first, unmount on its animationend (timer as fallback)
  const outTimer = React.useRef(0);
  const gone = React.useCallback(() => { clearTimeout(outTimer.current); setSel(null); setClosing(false); }, []);
  React.useEffect(() => () => clearTimeout(outTimer.current), []);
  const openRow = i => {
    if (!view[i]) return;
    clearTimeout(outTimer.current); setClosing(false);
    setSel({ r: view[i], i }); setFi(i); log("Table", `details of row ${i + 1}`);
  };
  const rowOf = e => { const el = e.target.closest && e.target.closest("[data-i]"); return el ? +el.dataset.i : -1; };
  const onKey = e => {
    const i = rowOf(e);
    if (i < 0) return;
    const ph = Math.max(H.records, paneRef.current ? paneRef.current.clientHeight - sticky() : 400); // one page of rows
    const to = {
      ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: view.length - 1,
      PageDown: Math.max(i + 1, rowAt(offs, offs[i] + ph) - 1), PageUp: Math.min(i - 1, rowAt(offs, offs[i] - ph) + 1),
    }[e.key];
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRow(i); return; }
    if (to === undefined) return;
    e.preventDefault();
    moveTo(Math.max(0, Math.min(view.length - 1, to)));
  };
  const closeDetail = () => {
    if (!sel || closing) return;
    const i = sel.i;
    setClosing(true);
    clearTimeout(outTimer.current);
    outTimer.current = setTimeout(gone, OUT);
    if (i >= 0 && i < view.length) moveTo(i);
  };
  // Escape: closes the details first, then clears the search (while in it), only then the dialog
  const now = React.useRef(null);
  now.current = { sel: sel && !closing, q };
  esc.current = () => {
    if (now.current.sel) { closeDetail(); return true; }
    if (now.current.q && document.activeElement && document.activeElement.id === "tv-search") { setQ(""); return true; }
    return false;
  };

  // ---------- Actions ----------
  const switchSet = v => {
    if (!v || v === ds) return;
    setSet(v); gone();
    if (sort.col && !COLUMNS[v].some(c => c.id === sort.col)) setSort({ col: null, dir: null });
    log("Table", `dataset ${v}`);
  };
  const toggleSort = id => setSort(s => (s.col !== id ? { col: id, dir: "asc" } : s.dir === "asc" ? { col: id, dir: "desc" } : { col: null, dir: null }));
  const toggleCol = (id, on) => setHidden(h => {
    const next = new Set(h[ds]);
    if (on) next.delete(id); else next.add(id);
    return { ...h, [ds]: next };
  });
  const reset = () => { setQ(""); setList(ALL); setCat(ALL); setLoc(ALL); };

  // Export: the rows of the current view (search, filters, order) with the shown columns; books with their subtitle
  const setName = t(ds === "records" ? "tvRecords" : "tvBooks");
  const text = (r, id, raw) => (id === "probs" ? r.probs.map(p => t("m_" + p.key) + (p.v ? ` (${p.v})` : "")).join("; ")
    : id === "cover" ? (r.cover ? t("tvCov_" + r.cover) : "") : id === "z" && !raw ? df(r.z) : r[id]);
  const exportCols = () => cols.reduce((a, c) => a.concat([c], c.id === "t" && ds === "books" ? [{ id: "s", label: "tvC_sub" }] : []), []);
  const csv = () => {
    const ec = exportCols();
    saveCsv(`${slug(setName)}-${today()}.csv`, [ec.map(c => t(c.label))].concat(view.map(r => ec.map(c => text(r, c.id)))));
  };
  const excel = () => {
    const ec = exportCols();
    const name = `${slug(setName)}-${today()}.xlsx`;
    const blob = xlsx([{
      name: setName, tab: "BA8EA7", title: `${t("tvT")} · ${setName}`, sub: `${t("tvCount", { n: nf(view.length), m: nf(rows.length) })} · ${df(today())}`,
      cols: ec.map(c => ({ head: t(c.label), type: c.id === "id" || c.id === "y" ? "n" : c.id === "z" ? "d" : "s" })),
      rows: view.map(r => ec.map(c => text(r, c.id, true))),
    }], { date: lang === "it" ? "dd/mm/yyyy" : "dd.mm.yyyy", footer: `${t("tvT")} · ${setName}`, title: `${t("tvT")} · ${setName}` });
    saveBlob(name, blob, view.length);
  };

  const first = i => (ins ? i === 0 : i === 1); // the first toolbar row leaves room for the close (and fullscreen) button
  const gridCols = cols.map(c => c.w).join(" ");
  const shown = [];
  const tabRow = Math.min(fi, view.length - 1);
  for (let i = range[0]; i < Math.min(range[1], view.length); i++) {
    const r = view[i];
    shown.push(
      <Row
        key={ds + r.n} r={r} i={i} ds={ds} cols={cols} wide={wide} top={offs[i]} h={offs[i + 1] - offs[i]}
        on={!!sel && !closing && sel.r === r} tab={i === tabRow} lang={lang}
      />,
    );
  }
  const colLabel = c => t(c.label);

  return (
    <>
      <div className="pane tv-pane" ref={setPane}>
        <div className="px-4 pt-4 pr-14 sm:px-6 sm:pt-6 sm:pr-29">
          <DialogTitle id="tv-title">{t("tvT")}</DialogTitle>
        </div>

        <div className="tv-bar grid gap-2.5 px-4 py-3 sm:px-6" id="tv-bar" ref={barRef}>
          {ins ? (
            <div className={cn("flex", first(0) && "pr-10 sm:pr-25")}>
              <ToggleGroup
                type="single" variant="surface" id="tv-set" aria-label={t("tvSet")} value={ds} onValueChange={switchSet}
                className="w-full sm:w-auto"
              >
                <ToggleGroupItem value="records" data-set="records" className="min-w-0 px-3 text-s sm:text-m"><span className="truncate">{t("tvRecords")}</span></ToggleGroupItem>
                <ToggleGroupItem value="books" data-set="books" className="min-w-0 px-3 text-s sm:text-m"><span className="truncate">{t("tvBooks")}</span></ToggleGroupItem>
              </ToggleGroup>
            </div>
          ) : null}
          <div className={cn("flex items-center gap-2", first(1) && "pr-10 sm:pr-25")}>
            <label className="relative min-w-0 flex-1">
              <SearchIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input
                id="tv-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t("tvSearch")}
                aria-label={t("tvSearchL")} autoComplete="off" spellCheck={false} className="pl-10"
              />
            </label>
            {wide ? null : (
              <Button
                variant="outline" size="icon" id="tv-filter" aria-expanded={filters} aria-controls="tv-filters"
                aria-label={active ? t("tvFilterN", { n: active }) : t("tvFilter")} onClick={() => setFilters(o => !o)}
                className={cn("relative", active && "border-foreground")}
              >
                <SlidersHorizontalIcon aria-hidden="true" />
                {active ? <span className="tv-badge" aria-hidden="true">{active}</span> : null}
              </Button>
            )}
            {wide ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" id="tv-cols" aria-label={t("tvColsL")} className="px-3 lg:px-[18px]">
                    <Columns3Icon aria-hidden="true" /><span className="hidden lg:inline">{t("tvCols")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t("tvColsL")}</DropdownMenuLabel>
                  {COLUMNS[ds].filter(c => !c.fixed && (c.needs !== "cov" || cov)).map(c => (
                    <DropdownMenuCheckboxItem
                      key={c.id} data-col={c.id} checked={!hidden[ds].has(c.id)}
                      onCheckedChange={on => toggleCol(c.id, on)} onSelect={e => e.preventDefault()}
                    >
                      {colLabel(c)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" id="tv-export" aria-label={t("tvExport")} disabled={!view.length} size={wide ? "default" : "icon"} className={wide ? "px-3 lg:px-[18px]" : ""}>
                  <DownloadIcon aria-hidden="true" />{wide ? <span className="hidden lg:inline">{t("tvExport")}</span> : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem id="tv-csv" onSelect={csv}>{t("tvCsv")}</DropdownMenuItem>
                <DropdownMenuItem id="tv-xlsx" onSelect={excel}>{t("tvXlsx")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {wide || filters ? (
            <div className="grid gap-2 sm:grid-cols-3" id="tv-filters">
              <Select value={list} onValueChange={setList}>
                <SelectTrigger id="tv-list" aria-label={t("tvList")} className={cn(list !== ALL && "border-foreground")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("tvListAll")}</SelectItem>
                  <SelectItem value="any">{`${t("tvListAny")} · ${nf(fac.any)}`}</SelectItem>
                  <SelectItem value="ok">{`${t("tvListOk")} · ${nf(rows.length - fac.any)}`}</SelectItem>
                  {LISTS.map(([g, keys]) => (
                    <React.Fragment key={g}>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>{t("mG_" + g)}</SelectLabel>
                        {keys.map(k => (
                          <SelectItem key={k} value={k} data-list={k} disabled={!fac.lists[k] && list !== k}>
                            <span className="tv-chipdot" data-g={g} aria-hidden="true" />{`${t("m_" + k)} · ${nf(fac.lists[k] || 0)}`}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
              <Facet id="tv-cat" label={t("cCategory")} all={t("tvCatAll")} value={cat} onChange={setCat} items={fac.cats} />
              <Facet id="tv-loc" label={t("cLocation")} all={t("tvLocAll")} value={loc} onChange={setLoc} items={fac.locs} />
            </div>
          ) : null}

          <div className="flex min-h-6 items-center gap-3">
            <p className="m-0 text-s text-muted-foreground tabular-nums" id="tv-count" role="status">
              {t("tvCount", { n: nf(view.length), m: nf(rows.length) })}
            </p>
            {active || q ? (
              <Button variant="ghost" size="sm" id="tv-reset" className="ml-auto h-8 px-2" onClick={reset}>{t("tvReset")}</Button>
            ) : null}
          </div>
        </div>

        {!rows.length ? (
          <div className="tv-empty" id="tv-empty">
            <p className="m-0 font-semibold">{t("tvEmpty")}</p>
            <p className="m-0 max-w-md text-s text-muted-foreground">{t("tvEmptyP")}</p>
          </div>
        ) : !view.length ? (
          <div className="tv-empty" id="tv-none">
            <p className="m-0 font-semibold">{t("tvNone")}</p>
            <p className="m-0 text-s text-muted-foreground">{t("tvNoneP")}</p>
            {active || q ? <Button variant="outline" className="mt-2" onClick={reset}>{t("tvReset")}</Button> : null}
          </div>
        ) : (
          <div
            ref={tableRef} id="tv-table" className={cn("tv-table", !wide && "cards")}
            role={wide ? "table" : "list"} aria-labelledby="tv-title" aria-rowcount={wide ? view.length + 1 : undefined}
            style={{ "--tv-cols": gridCols, "--tv-bar": barH + "px" }}
          >
            {wide ? (
              <div role="rowgroup" className="tv-head" ref={headRef}>
                <div role="row" aria-rowindex={1} className="tv-hrow">
                  {cols.map(c => {
                    const dir = sort.col === c.id ? sort.dir : null;
                    const Icon = dir === "asc" ? ArrowUpIcon : dir === "desc" ? ArrowDownIcon : ChevronsUpDownIcon;
                    return (
                      <div
                        role="columnheader" key={c.id} data-col={c.id} className={cn("tv-th", c.num && "num")}
                        aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
                      >
                        <button type="button" onClick={() => toggleSort(c.id)} title={t("tvSortBy", { c: colLabel(c) })}>
                          <span className="truncate">{colLabel(c)}</span>
                          <Icon aria-hidden="true" className={cn("size-3.5 shrink-0", !dir && "opacity-40")} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div
              role={wide ? "rowgroup" : "presentation"} className="tv-list" ref={listRef} style={{ height: offs[view.length] }}
              onClick={e => { const i = rowOf(e); if (i >= 0) openRow(i); }}
              onKeyDown={onKey}
              onFocus={e => { const i = rowOf(e); if (i >= 0 && i !== fi) setFi(i); }}
            >
              {shown}
            </div>
          </div>
        )}
      </div>
      {wide ? (
        <Button
          variant="icon" size="icon" className="tv-full" data-fullscreen="" aria-pressed={full}
          aria-label={t(full ? "tvFullOff" : "tvFull")} title={t(full ? "tvFullOff" : "tvFull")}
          onClick={() => { setFull(f => !f); log("Table", full ? "fullscreen off" : "fullscreen on"); }}
        >
          {full ? <Minimize2Icon aria-hidden="true" /> : <Maximize2Icon aria-hidden="true" />}
        </Button>
      ) : null}
      {sel ? <Detail r={sel.r} ds={ds} cov={!!cov} closing={closing} onClose={closeDetail} onGone={gone} /> : null}
    </>
  );
}

// Category or location filter: all, then every value with its count, "(without)" last
function Facet({ id, label, all, value, onChange, items }) {
  const { t, nf } = useLanguage();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label} className={cn(value !== ALL && "border-foreground")}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{all}</SelectItem>
        <SelectSeparator />
        {items.map(([v, n]) => <SelectItem key={v || NONE} value={v || NONE}>{`${v || t("tvEmptyVal")} · ${nf(n)}`}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// Problem chips, one per line: short name with the colour dot of its group; one line each (ellipsis), the full name in title
function Chips({ probs }) {
  const { t } = useLanguage();
  return probs.map(p => (
    <span key={p.key} className="tv-chip" data-g={GROUP[p.key]} data-list={p.key} title={t("m_" + p.key) + (p.v ? ` (${p.v})` : "")}>
      <i className="tv-dot" aria-hidden="true" /><span className="tv-chipt">{t("ts_" + p.key)}</span>
    </span>
  ));
}

// One row (table from 40rem) or card (phone); plain elements only, memoized: scrolling only renders the new ones
const Row = React.memo(function Row({ r, i, ds, cols, wide, top, h, on, tab }) {
  const { t, df } = useLanguage();
  const style = { transform: `translateY(${top}px)`, height: wide ? h : h - 8 };
  if (!wide) {
    const meta = [ds === "records" ? t("tvRecNo", { n: r.id }) : "", r.y, r.c, r.l].filter(Boolean).join(" · ");
    return (
      <div role="listitem" className={cn("tv-card", on && "on")} data-i={i} tabIndex={tab ? 0 : -1} style={style} aria-current={on || undefined}>
        <div className="tv-ct"><span className="font-semibold">{r.t || "–"}</span>{r.s ? <span className="tv-sub"> · {r.s}</span> : null}</div>
        <div className="text-s">{r.a || "–"}</div>
        <div className="text-s text-muted-foreground">{meta}</div>
        <div className="tv-chips">{r.probs.length ? <Chips probs={r.probs} /> : null}</div>
      </div>
    );
  }
  return (
    <div
      role="row" aria-rowindex={i + 2} className={cn("tv-row", i % 2 && "odd", on && "on")} data-i={i} tabIndex={tab ? 0 : -1} style={style}
      aria-current={on || undefined}
    >
      {cols.map(c => {
        if (c.id === "probs") return <div role="cell" key="probs" className="tv-cell tv-chips">{r.probs.length ? <Chips probs={r.probs} /> : null}</div>;
        if (c.id === "t") {
          return (
            <div role="cell" key="t" className={cn("tv-cell", ds === "books" && "two")} title={r.s ? `${r.t} – ${r.s}` : r.t}>
              {ds === "books" ? <><span className="font-medium">{r.t}</span><span className="tv-sub">{r.s}</span></> : <span className="font-medium">{r.t || "–"}</span>}
            </div>
          );
        }
        const v = c.id === "z" ? df(r.z) : c.id === "cover" ? (r.cover ? t("tvCov_" + r.cover) : "") : r[c.id];
        return <div role="cell" key={c.id} className={cn("tv-cell", c.num && "tabular-nums", c.id === "cover" && r.cover === "no" && "font-medium")} title={c.num ? undefined : v}>{v}</div>;
      })}
    </div>
  );
});

/* Detail panel over the table: all fields, the copies in WinBook (public list) and the lists with their hints. Flies in
   from the right (phones: from below); closing = data-state "closed" (flies out), onGone on its animationend. */
function Detail({ r, ds, cov, closing, onClose, onGone }) {
  const { t, df } = useLanguage();
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.focus(); }, [r]);
  const end = e => { if (closing && e.target === e.currentTarget) onGone(); };
  const fields = ds === "records"
    ? [["cId", r.id], ["cTitle", r.t], ["cAuthor", r.a], ["cPublisher", r.p], ["cYear", r.y], ["cCategory", r.c], ["cLocation", r.l], ["cSig", r.sig], ["cAdded", df(r.z)]]
    : [["cTitle", r.t], ["tvC_sub", r.s], ["tvC_authors", r.a], ["cPublisher", r.p], ["cYear", r.y], ["tvC_isbn", r.i], ["cCategory", r.c], ["tvC_locs", r.l]]
      .concat(cov ? [["tvC_cover", r.cover ? t("tvCov_" + r.cover) : ""]] : [], r.ids && r.ids.length ? [["tvCopies", r.ids.map(id => t("tvRecNo", { n: id })).join(", ")]] : []);
  // a scrolling panel scrolls itself instead of dragging the sheet (lib/swipe.js listens on the sheet)
  const touch = e => { const el = ref.current; if (el && el.scrollHeight > el.clientHeight + 1) e.stopPropagation(); };
  return (
    <section
      className="tv-detail" id="tv-detail" aria-labelledby="tv-detail-t" ref={ref} tabIndex={-1} onTouchStart={touch}
      data-state={closing ? "closed" : "open"} aria-hidden={closing || undefined} onAnimationEnd={end}
    >
      <div className="flex items-start gap-3 p-4 pb-2 sm:p-6 sm:pb-2">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-s text-muted-foreground">{t("tvDetail")}</p>
          <h3 className="m-0 text-l font-semibold leading-[1.2] [overflow-wrap:anywhere]" id="tv-detail-t">{r.t || "–"}</h3>
        </div>
        <Button variant="icon" size="icon" id="tv-detail-x" aria-label={t("tvBack")} onClick={onClose}><XIcon aria-hidden="true" /></Button>
      </div>
      <dl className="tv-dl m-0 px-4 sm:px-6">
        {fields.filter(([, v]) => v !== "" && v != null).map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="text-s text-muted-foreground">{t(k)}</dt>
            <dd className="m-0 [overflow-wrap:anywhere]">{v}</dd>
          </React.Fragment>
        ))}
      </dl>
      <div className="grid gap-3 p-4 pt-5 sm:p-6 sm:pt-5" id="tv-detail-probs">
        <h4 className="m-0 text-m font-semibold">{t("tvProbsT")}</h4>
        {r.probs.length ? r.probs.map(p => (
          <div key={p.key} className="tv-prob" data-g={GROUP[p.key]} data-list={p.key}>
            <p className="m-0 font-medium">{t("m_" + p.key)}</p>
            {p.v ? <p className="m-0 text-s [overflow-wrap:anywhere]">{t("tvValue", { v: p.v })}</p> : null}
            <p className="m-0 text-s text-muted-foreground">{t("mh_" + p.key)}</p>
          </div>
        )) : <p className="m-0 text-s text-muted-foreground">{t("tvNoProbs")}</p>}
      </div>
    </section>
  );
}
