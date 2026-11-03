/* Tab "Regale": the order of the shelves from the imported WinBook file (analysis: shelves-core.js, attached to the
   maintenance analysis on import as ins.shelves). Four cards:
     Aufstellung (#sh-sum)       how many copies probably stand wrong, the A–Z sections, print/download the check list
     Prüfliste am Regal (#sh-moves)  every flagged copy in shelf order with where it probably belongs, filter by reason,
                                 "Passt so" hides a row for good (localStorage dsm-shelf-ok, "<WinBook no.>|<check>")
     Regalübersicht (#sh-map)    shelves → boards with copies, main category, authors A–Z from–to, median year, flags;
                                 a board opens the board dialog (#sh-board): its copies in shelf order, "Fehlt" per copy,
                                 books found there that WinBook puts elsewhere, "checked" mark, print the board list
     Inventur (#sh-inv)          progress and result of the inventory (localStorage dsm-inventory, inventory() in the core)
   Inventory and marks only hold WinBook numbers and location names and survive a new import. Nothing is published.
   Test hooks: #tab-shelves, #sh-none, #sh-to-catalog, #sh-big, #sh-lines, #sh-print, #sh-dl, #sh-xlsx, #sh-csv,
   [data-reason], .sh-loc[data-loc], .sh-move[data-id][data-key][data-ok], .sh-t (title), [data-ok-btn], #sh-show-ok, #sh-more, #sh-find,
   .sh-unit[data-unit] > button, .sh-board[data-loc], #sh-board, .sh-copy[data-id][data-missing], [data-miss],
   [data-flag], #sh-here-q, #sh-here-hits, #sh-here-none, [data-add-here], [data-here], [data-del-here], #sh-checked, #sh-checked-on, #sh-board-print,
   #sh-inv-lines, .check[data-check="invMissing|invHere"], #sh-inv-dl, #sh-inv-xlsx, #sh-inv-csv, #sh-inv-print,
   #sh-inv-reset. */
import "./strings-shelves";
import * as React from "react";
import { ChevronDownIcon, LibraryBigIcon, PrinterIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GlassDialog } from "@/components/glass-dialog";
import { cn } from "@/lib/utils";
import { log, store } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { useSwipe } from "@/lib/swipe";
import { Big, Lines } from "./catalog";
import { Check, DownloadMenu, useExport } from "./maintenance";
import { PrintJob } from "./print";
import { inventory, norm, shelfOrder } from "./shelves-core";

const OK_KEY = "dsm-shelf-ok", INV_KEY = "dsm-inventory";
const SHOWN = 150; // rows of the check list before "show all"
const HITS = 8; // search results in the board dialog
const today = () => new Date().toLocaleDateString("sv-SE");
const loadOk = () => { const a = store.json(OK_KEY); return new Set(Array.isArray(a) ? a.map(String) : []); };
const loadInv = () => { const o = store.json(INV_KEY); return o && o.boards && typeof o.boards === "object" && !Array.isArray(o.boards) ? o : { boards: {} }; };
const okKey = x => x.r.id + "|" + x.key;
const letters = b => (b.from ? (b.from === b.to ? b.from : b.from + "–" + b.to) : "");
// "1 Exemplar" / "3 Exemplare": key + "1" for one
const plural = (t, nf, key, n) => (n === 1 ? t(key + "1") : t(key, { n: nf(n) }));

export function Shelves({ ins, onCatalog }) {
  const { t, nf, df } = useLanguage();
  const X = useExport();
  const [ok, setOk] = React.useState(loadOk);
  const [inv, setInv] = React.useState(loadInv);
  const [board, setBoard] = React.useState(null); // location of the open board dialog
  const [job, setJob] = React.useState(null); // print job (print.jsx)
  const A = ins && ins.shelves;
  // All flagged rows as { r, key, v }, in shelf order (where WinBook puts the copy)
  const items = React.useMemo(() => {
    if (!A) return [];
    const pos = new Map(A.boards.map((b, i) => [b.loc, i]));
    const all = A.checks.reduce((a, c) => a.concat(c.rows.map(x => ({ r: x.r, key: c.key, v: x.v }))), []);
    return all.sort((x, y) => pos.get(x.r.l) - pos.get(y.r.l) || (x.r.t < y.r.t ? -1 : x.r.t > y.r.t ? 1 : 0) || x.r.id - y.r.id);
  }, [A]);

  if (!A) {
    return (
      <div className="steps grid gap-3.5 pb-10" id="tab-shelves">
        <Card id="sh-none" className="items-center px-6 py-10 text-center">
          <LibraryBigIcon aria-hidden="true" strokeWidth={1.6} className="size-[34px] text-muted-foreground" />
          <CardTitle className="mt-1">{t("shNoneT")}</CardTitle>
          <CardDescription className="max-w-120">{t("shNoneP")}</CardDescription>
          <Button variant="outline" className="mt-2.5" id="sh-to-catalog" onClick={onCatalog}><span>{t("shToCatalog")}</span></Button>
        </Card>
      </div>
    );
  }

  const setMark = (k, on) => setOk(prev => {
    const n = new Set(prev);
    if (on) n.add(k); else n.delete(k);
    store.set(OK_KEY, JSON.stringify([...n]));
    return n;
  });
  // Inventory change: fn gets a copy of the board's entry { d?, miss, here } and returns the new one
  const editBoard = (loc, fn) => setInv(prev => {
    const boards = { ...prev.boards };
    const e = fn({ miss: [], here: [], ...boards[loc] });
    if (!e.d && !e.miss.length && !e.here.length) delete boards[loc]; else boards[loc] = e;
    const next = { boards };
    store.set(INV_KEY, JSON.stringify(next));
    return next;
  });
  const resetInv = () => { store.del(INV_KEY); setInv({ boards: {} }); log("Shelves", "inventory reset"); };

  const open = items.filter(x => !ok.has(okKey(x)));
  const lists = A.checks.map(c => ({ key: c.key, group: "place", rows: c.rows.filter(x => !ok.has(x.r.id + "|" + c.key)) }));
  const flagged = new Set(open.map(x => x.r)).size;
  const located = A.boards.reduce((s, b) => s + b.n, 0);
  const noBoard = A.boards.filter(b => !b.board).reduce((s, b) => s + b.n, 0);
  const lines = [
    [t("shBoards"), nf(A.boards.length)],
    [t("shUnits"), nf(A.units.filter(u => u.boards.some(b => b.board)).length)],
    [t("shNoBoard"), nf(noBoard)],
    [t("shAz"), A.runs.length ? A.runs.map(r => r.base).join(", ") : t("shAzNone")],
  ].concat(items.length > open.length ? [[t("shOkN"), nf(items.length - open.length)]] : []); // marks of this file only
  const sub = lines.map(l => l.join(": ")).join(" · ");
  const printLists = () => setJob({ kind: "lists", lists: lists.filter(c => c.rows.length), doc: t("shDoc") });

  return (
    <div className="steps grid gap-3.5 pb-10" id="tab-shelves">
      <Card id="sh-sum">
        <CardTitle>{t("shT")}</CardTitle>
        <div className="flex items-baseline gap-2.5">
          <Big id="sh-big">{nf(flagged)}</Big>
          <span className="text-s text-muted-foreground">{t("shBig")}</span>
        </div>
        <CardDescription>{t("shP")}</CardDescription>
        <Lines id="sh-lines" lines={[[t("shLocated"), nf(located)]].concat(lines)} />
        <CardFooter>
          <Button variant="outline" id="sh-print" disabled={!open.length} onClick={printLists}><PrinterIcon aria-hidden="true" /><span>{t("shPrint")}</span></Button>
          <DownloadMenu
            triggerProps={{ id: "sh-dl" }} label={t("shDl")}
            sections={[[null, [
              { text: t("mxXlsx"), on: () => X.allXlsx([["place", lists]], sub, t("shFile"), t("shDoc")), props: { id: "sh-xlsx" } },
              { text: t("mxCsv"), on: () => X.allCsv([["place", lists]], t("shFile")), props: { id: "sh-csv" } },
            ]]]}
          />
        </CardFooter>
      </Card>
      <Moves items={items} ok={ok} onMark={setMark} />
      <ShelfMap A={A} inv={inv} onOpen={setBoard} />
      <Inventory A={A} inv={inv} records={ins.records} X={X} onPrint={setJob} onReset={resetInv} />
      <BoardDialog
        A={A} loc={board} inv={inv} records={ins.records} ok={ok}
        onClose={() => setBoard(null)} onEdit={fn => editBoard(board, fn)} onPrint={setJob} df={df}
      />
      <PrintJob job={job} onDone={() => setJob(null)} />
    </div>
  );
}

// ---------- Check list: every flagged copy, grouped by where WinBook puts it ----------
function Moves({ items, ok, onMark }) {
  const { t, nf } = useLanguage();
  const [reason, setReason] = React.useState("all");
  const [showOk, setShowOk] = React.useState(false);
  const [all, setAll] = React.useState(false);
  const isOk = x => ok.has(okKey(x));
  const okN = items.filter(isOk).length;
  const visible = items.filter(x => showOk || !isOk(x));
  const count = k => visible.filter(x => k === "all" || x.key === k).length;
  const shown = visible.filter(x => reason === "all" || x.key === reason);
  const list = all ? shown : shown.slice(0, SHOWN);
  const groups = [];
  for (const x of list) {
    const last = groups[groups.length - 1];
    if (last && last.loc === x.r.l) last.rows.push(x); else groups.push({ loc: x.r.l, rows: [x] });
  }
  return (
    <Card id="sh-moves">
      <CardTitle>{t("shMovesT")}</CardTitle>
      <CardDescription>{t("shMovesP")}</CardDescription>
      {!items.length ? <p className="m-0 mt-2 text-s" id="sh-moves-none">{t("shNothing")}</p> : (
        <>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t("shFilter")}>
            {["all", "placeCategory", "placeOrder", "placeVague"].map(k => (
              <Button
                key={k} variant="outline" data-reason={k} aria-pressed={reason === k}
                className={cn(reason === k && "border-foreground bg-surface")} onClick={() => { setReason(k); setAll(false); }}
              >
                <span>{t(k === "all" ? "shAll" : "shR_" + k)}</span><span className="tabular-nums text-muted-foreground">{nf(count(k))}</span>
              </Button>
            ))}
          </div>
          {!shown.length ? <p className="m-0 mt-2 text-s text-muted-foreground" id="sh-moves-done">{t("shAllOk")}</p> : null}
          {groups.map(g => (
            <section key={g.loc} className="sh-loc mt-3" data-loc={g.loc}>
              <h3 className="m-0 flex items-baseline justify-between gap-3 border-b border-border pb-1 text-s font-medium text-muted-foreground">
                <span className="min-w-0">{g.loc}</span><span className="tabular-nums">{nf(g.rows.length)}</span>
              </h3>
              <ul className="m-0 list-none p-0">
                {g.rows.map(x => <MoveRow key={okKey(x)} x={x} done={isOk(x)} onMark={onMark} />)}
              </ul>
            </section>
          ))}
          {shown.length > list.length ? (
            <Button variant="outline" id="sh-more" className="mt-3 justify-self-start" onClick={() => setAll(true)}><span>{t("shMore", { n: nf(shown.length) })}</span></Button>
          ) : null}
          {okN ? (
            <Button variant="ghost" id="sh-show-ok" className="mt-1 justify-self-start px-0" aria-pressed={showOk} onClick={() => setShowOk(s => !s)}>
              <span>{showOk ? t("shHideOk") : t("shShowOk", { n: nf(okN) })}</span>
            </Button>
          ) : null}
        </>
      )}
    </Card>
  );
}

function MoveRow({ x, done, onMark }) {
  const { t } = useLanguage();
  const r = x.r;
  return (
    <li className="sh-move flex items-start gap-3 border-b border-border py-2.5 last:border-b-0" data-id={r.id} data-key={x.key} data-ok={done ? "1" : undefined}>
      <div className={cn("grid min-w-0 flex-1 gap-0.5", done && "text-muted-foreground")}>
        <span className="sh-t font-medium">{r.t || "–"}</span>
        <span className="text-s text-muted-foreground">{[r.a, r.c, t("cId") + " " + r.id].filter(Boolean).join(" · ")}</span>
        <span className="flex flex-wrap items-baseline gap-x-2 text-s">
          <span className="rounded-full border border-border px-2">{t("shR_" + x.key)}</span>
          <span className="min-w-0">{x.key === "placeOrder" ? x.v : "→ " + x.v}</span>
        </span>
      </div>
      <Button variant="outline" data-ok-btn={okKey(x)} aria-pressed={done} onClick={() => onMark(okKey(x), !done)}>
        <span>{done ? t("shUndo") : t("shOk")}</span>
      </Button>
    </li>
  );
}

// ---------- Shelf overview ----------
function ShelfMap({ A, inv, onOpen }) {
  const { t, nf } = useLanguage();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(() => new Set());
  const nq = norm(q);
  const units = nq ? A.units.filter(u => norm(u.unit).includes(nq) || u.boards.some(b => norm(b.loc).includes(nq))) : A.units;
  const toggle = u => setOpen(s => { const n = new Set(s); if (n.has(u)) n.delete(u); else n.add(u); return n; });
  return (
    <Card id="sh-map">
      <CardTitle>{t("shMapT")}</CardTitle>
      <CardDescription>{t("shMapP")}</CardDescription>
      <label className="mt-2 grid gap-1.5">
        <span className="text-s font-medium">{t("shFind")}</span>
        <Input id="sh-find" type="search" value={q} onChange={e => setQ(e.target.value)} autoComplete="off" />
      </label>
      {!units.length ? <p className="m-0 mt-2 text-s text-muted-foreground">{t("shNoMatch")}</p> : null}
      <div className="mt-2">
        {units.map(u => {
          const single = u.boards.length === 1 && !u.boards[0].board;
          const done = u.boards.filter(b => inv.boards[b.loc] && inv.boards[b.loc].d).length;
          const isOpen = !!nq || open.has(u.unit);
          if (single) return <div key={u.unit} className="sh-unit border-t border-border first:border-t-0" data-unit={u.unit}><BoardRow b={u.boards[0]} inv={inv} onOpen={onOpen} label={u.unit} /></div>;
          return (
            <section key={u.unit} className="sh-unit border-t border-border first:border-t-0" data-unit={u.unit}>
              <button type="button" className="flex min-h-11 w-full items-center gap-3 py-2 text-left" aria-expanded={isOpen} onClick={() => toggle(u.unit)}>
                <span className="grid min-w-0 flex-1">
                  <span className="font-medium">{u.unit}</span>
                  <span className="text-s text-muted-foreground">
                    {[plural(t, nf, "shCopies", u.n), u.flagged ? t("shFlagged", { n: nf(u.flagged) }) : "", done ? t("shBoardsDone", { d: nf(done), n: nf(u.boards.length) }) : ""].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ChevronDownIcon aria-hidden="true" className={cn("size-4 shrink-0 transition-transform duration-150 ease-dsm motion-reduce:transition-none", isOpen && "rotate-180")} />
              </button>
              {isOpen ? (
                <ul className="m-0 mb-2 list-none border-l-2 border-border p-0 pl-3">
                  {u.boards.map(b => <li key={b.loc}><BoardRow b={b} inv={inv} onOpen={onOpen} /></li>)}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </Card>
  );
}

function BoardRow({ b, inv, onOpen, label }) {
  const { t, nf, df } = useLanguage();
  const e = inv.boards[b.loc];
  const cat = b.cats.length ? `${b.cats[0][0]} (${nf(b.cats[0][1])})` : t("shNoCat");
  const meta = [cat, letters(b), b.year ? t("shYear", { y: b.year }) : ""].filter(Boolean).join(" · ");
  const marks = [b.flagged ? t("shFlagged", { n: nf(b.flagged) }) : "", e && e.miss && e.miss.length ? plural(t, nf, "shMissN", e.miss.length) : "", e && e.d ? t("shChecked", { d: df(e.d) }) : ""].filter(Boolean);
  return (
    <button type="button" className="sh-board flex min-h-11 w-full items-start gap-3 py-2 text-left" data-loc={b.loc} data-checked={e && e.d ? "1" : undefined} onClick={() => onOpen(b.loc)}>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="font-medium">{label || (b.board ? t("shBoard", { n: b.board }) : b.loc)}</span>
        <span className="text-s text-muted-foreground">{meta}</span>
        {marks.length ? <span className="text-s">{marks.join(" · ")}</span> : null}
      </span>
      <span className="font-medium tabular-nums">{nf(b.n)}</span>
    </button>
  );
}

// ---------- Board dialog: the board's copies, inventory at the shelf ----------
function BoardDialog({ A, loc, inv, records, ok, onClose, onEdit, onPrint, df }) {
  const { t, nf } = useLanguage();
  const swipeRef = useSwipe(".scrim.swipe", onClose);
  const [q, setQ] = React.useState("");
  React.useEffect(() => { setQ(""); }, [loc]);
  // While closing the dialog keeps showing the last board (its content stays during the closing animation)
  const last = React.useRef(null);
  if (loc) last.current = loc;
  const at = loc || last.current;
  const b = at ? A.boards.find(x => x.loc === at) : null;
  const entry = at ? inv.boards[at] : null;
  const e = { miss: [], here: [], ...entry };
  const miss = new Set(e.miss.map(String)), here = new Set(e.here.map(String));
  const recs = React.useMemo(() => (b ? shelfOrder(b) : []), [b]);
  const byId = React.useMemo(() => new Map(records.map(r => [String(r.id), r])), [records]);
  const nq = norm(q), trimmed = q.trim();
  const hits = !b || (nq.length < 2 && !/^\d+$/.test(trimmed)) ? [] : records.filter(r => r.l !== b.loc && !here.has(String(r.id))
    && (String(r.id) === trimmed || (nq.length >= 2 && norm(r.t + " " + r.a).includes(nq)))).slice(0, HITS);
  const toggleMiss = id => onEdit(x => ({ ...x, miss: miss.has(String(id)) ? x.miss.filter(m => String(m) !== String(id)) : x.miss.concat([id]) }));
  const addHere = id => { onEdit(x => ({ ...x, here: x.here.concat([id]) })); setQ(""); };
  const delHere = id => onEdit(x => ({ ...x, here: x.here.filter(m => String(m) !== String(id)) }));
  const setChecked = on => { onEdit(x => { const n = { ...x }; if (on) n.d = today(); else delete n.d; return n; }); log("Shelves", `${at} ${on ? "checked" : "unchecked"}`); };
  const flagsOf = r => (A.flags.get(r) || []).filter(f => !ok.has(r.id + "|" + f.key));
  const head = b ? [plural(t, nf, "shCopies", b.n), b.cats.length ? b.cats.slice(0, 2).map(([c, n]) => `${c} (${nf(n)})`).join(", ") : "", letters(b)].filter(Boolean).join(" · ") : "";
  return (
    <GlassDialog open={!!loc && !!b} onOpenChange={o => { if (!o) onClose(); }} name="Board" titleId="sh-board-t" id="sh-board" className="board-dialog swipe" overlayClassName="swipe">
      {b ? (
        <div className="pane" ref={swipeRef}>
          <div className="grid gap-1 pr-10">
            <DialogTitle id="sh-board-t">{b.loc}</DialogTitle>
            <p className="m-0 text-s text-muted-foreground">{head}</p>
            <p className="m-0 text-s text-muted-foreground">{t("shBoardP")}</p>
          </div>
          <ul className="m-0 list-none p-0" id="sh-board-list">
            {recs.map(r => {
              const m = miss.has(String(r.id)), fl = flagsOf(r);
              return (
                <li key={r.id} className="sh-copy flex items-start gap-3 border-t border-border py-2 first:border-t-0" data-id={r.id} data-missing={m ? "1" : undefined}>
                  <div className={cn("grid min-w-0 flex-1 gap-0.5", m && "text-muted-foreground")}>
                    <span className="sh-t font-medium">{r.t || "–"}</span>
                    <span className="text-s text-muted-foreground">{[r.a, r.c, r.y, t("cId") + " " + r.id].filter(Boolean).join(" · ")}</span>
                    {fl.map(f => (
                      <span key={f.key} className="text-s" data-flag={f.key}>
                        <span className="mr-2 rounded-full border border-border px-2">{t("shR_" + f.key)}</span>
                        {f.key === "placeOrder" ? f.v : t("shTo", { v: f.v })}
                      </span>
                    ))}
                  </div>
                  <Button variant="outline" data-miss={r.id} aria-pressed={m} className={cn(m && "border-foreground bg-surface")} onClick={() => toggleMiss(r.id)}>
                    <span>{t("shMiss")}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
          <section className="grid gap-2" id="sh-here">
            <h3 className="m-0 text-m font-semibold">{t("shHereT")}</h3>
            <p className="m-0 text-s text-muted-foreground">{t("shHereP")}</p>
            {e.here.length ? (
              <ul className="m-0 list-none p-0">
                {e.here.map(id => {
                  const r = byId.get(String(id));
                  return (
                    <li key={id} className="flex items-center gap-3 border-t border-border py-1.5 first:border-t-0" data-here={id}>
                      <span className="grid min-w-0 flex-1">
                        <span className="font-medium">{r ? r.t : t("cId") + " " + id}</span>
                        {r ? <span className="text-s text-muted-foreground">{t("shHereAt", { l: r.l || t("shHereNoLoc") }) + " · " + t("cId") + " " + r.id}</span> : null}
                      </span>
                      <Button variant="icon" size="icon" data-del-here={id} aria-label={t("shHereDel")} onClick={() => delHere(id)}><XIcon aria-hidden="true" /></Button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <label className="grid gap-1.5">
              <span className="text-s font-medium">{t("shHereQ")}</span>
              <Input id="sh-here-q" type="search" value={q} onChange={ev => setQ(ev.target.value)} autoComplete="off" />
            </label>
            {q.trim() ? (
              !hits.length ? <p className="m-0 text-s text-muted-foreground" id="sh-here-none">{nq.length < 2 && !/^\d+$/.test(trimmed) ? t("shHereFew") : t("shHereNone")}</p> : (
                <ul className="m-0 list-none p-0" id="sh-here-hits">
                  {hits.map(r => (
                    <li key={r.id} className="flex items-center gap-3 border-t border-border py-1.5 first:border-t-0">
                      <span className="grid min-w-0 flex-1">
                        <span className="font-medium">{r.t || "–"}</span>
                        <span className="text-s text-muted-foreground">{[r.a, t("shHereAt", { l: r.l || t("shHereNoLoc") }), t("cId") + " " + r.id].filter(Boolean).join(" · ")}</span>
                      </span>
                      <Button variant="outline" data-add-here={r.id} onClick={() => addHere(r.id)}><span>{t("shHereAdd")}</span></Button>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </section>
          <div className="grid gap-2">
            {e.d ? <p className="m-0 text-s font-medium" id="sh-checked-on">{t("shCheckedOn", { d: df(e.d) })}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" id="sh-board-print" onClick={() => onPrint({ kind: "shelf", loc: b.loc, list: recs })}>
                <PrinterIcon aria-hidden="true" /><span>{t("shBoardPrint")}</span>
              </Button>
              <Button id="sh-checked" variant={e.d ? "outline" : "default"} onClick={() => setChecked(!e.d)}>
                <span>{e.d ? t("shUncheck") : t("shCheck")}</span>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </GlassDialog>
  );
}

// ---------- Inventory result ----------
function Inventory({ A, inv, records, X, onPrint, onReset }) {
  const { t, nf } = useLanguage();
  const [armed, setArmed] = React.useState(false);
  const R = inventory(A, inv, records);
  const lists = [{ key: "invMissing", group: "place", rows: R.missing }, { key: "invHere", group: "place", rows: R.here }];
  const any = Object.keys(inv.boards).length > 0;
  const found = R.missing.length + R.here.length;
  const reset = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
    setArmed(false);
    onReset();
  };
  const sub = [[t("shInvBoards"), t("shInvOf", { d: nf(R.done), n: nf(R.total) })], [t("shInvMissing"), nf(R.missing.length)], [t("shInvHere"), nf(R.here.length)]];
  return (
    <Card id="sh-inv">
      <CardTitle>{t("shInvT")}</CardTitle>
      <CardDescription>{t("shInvP")}</CardDescription>
      <Lines id="sh-inv-lines" lines={sub} />
      {!any ? <p className="m-0 mt-2 text-s text-muted-foreground" id="sh-inv-empty">{t("shInvEmpty")}</p> : (
        <div className="mt-2">
          {lists.map(c => <Check key={c.key} c={c} onCsv={() => X.listCsv(c)} onXlsx={() => X.listXlsx(c, "place")} />)}
        </div>
      )}
      <CardFooter>
        <DownloadMenu
          triggerProps={{ id: "sh-inv-dl", disabled: !found }} label={t("shInvDl")}
          sections={[[null, [
            { text: t("mxXlsx"), on: () => X.allXlsx([["place", lists]], sub.map(l => l.join(": ")).join(" · "), t("shInvFile"), t("shInvDoc")), props: { id: "sh-inv-xlsx" } },
            { text: t("mxCsv"), on: () => X.allCsv([["place", lists]], t("shInvFile")), props: { id: "sh-inv-csv" } },
          ]]]}
        />
        <Button variant="outline" id="sh-inv-print" disabled={!found} onClick={() => onPrint({ kind: "lists", lists: lists.filter(c => c.rows.length), doc: t("shInvDoc") })}>
          <PrinterIcon aria-hidden="true" /><span>{t("shInvPrint")}</span>
        </Button>
        {any ? <Button variant="outline" id="sh-inv-reset" onClick={reset}><span>{t(armed ? "shInvResetSure" : "shInvReset")}</span></Button> : null}
      </CardFooter>
    </Card>
  );
}
