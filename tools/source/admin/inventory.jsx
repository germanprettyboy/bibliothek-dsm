/* Inventory in tab "Pflege" (needs an import): which copies really stand on the shelf. Card #m-inv (state, start,
   start over) and a large sheet #inventory: choose a location, then scan the barcodes – a USB barcode scanner types the
   code plus Enter into #inv-code, on phones with BarcodeDetector (Chrome on Android) the camera reads them (#inv-cam),
   or type the ISBN, WinBook number or shelf mark. Every scan answers at once in #inv-last (found, belongs elsewhere,
   already counted, unknown; a short vibration on phones). Lists: missing (tick by hand), found (take back), misplaced
   (with their own shelf), unknown codes; Excel/CSV of the result, the missing ones printed as a location list.
   The state lives in inventory-core.js (localStorage, survives reloads and new imports). Nothing is published.
   Typing anywhere in the sheet goes into the code field, so a scanner never presses a focused button by its Enter.
   Test hooks: #m-inv, #inv-open, #inv-reset, #inventory, #inv-loc, #inv-code, #inv-add, #inv-cam, #inv-last[data-kind],
   #inv-ring[data-found][data-total], #inv-view [data-v], #inv-list [data-id] / [data-code], [data-mark], [data-undo],
   [data-forget], #inv-dl, #inv-xlsx, #inv-csv, #inv-print. */
import "./strings-inventory";
import * as React from "react";
import { CameraIcon, CameraOffIcon, CheckIcon, PrinterIcon, ScanBarcodeIcon, Undo2Icon, XIcon } from "lucide-react";

import { GlassDialog } from "@/components/glass-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { log } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { useSwipe } from "@/lib/swipe";
import { DownloadMenu } from "./download-menu";
import { apply, current, forget, fresh, mark, matcher, save, subscribe, tally } from "./inventory-core";
import { coll, saveBlob, saveCsv, slug, today } from "./table-data";
import { xlsx } from "./xlsx";

const SHOWN = 200; // rows per list in the sheet; all of them in the files
const VIEWS = ["missing", "found", "odd", "unknown"];
const FORMATS = ["ean_13", "ean_8", "upc_a", "code_128", "code_39", "itf", "codabar"];
const camera = () => typeof window.BarcodeDetector === "function" && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext !== false;
const fine = () => matchMedia("(pointer: fine)").matches;
const isField = el => !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

export const useInventory = () => React.useSyncExternalStore(subscribe, current);
// Start an inventory over all locations unless one is running (card, command palette)
export function startInventory() {
  if (current()) return;
  save(fresh(null));
  log("Inventory", "started");
}

// Locations of the import with their number of copies, "" (without location) last
function useLocations(records) {
  return React.useMemo(() => {
    const m = new Map();
    for (const r of records) m.set(r.l || "", (m.get(r.l || "") || 0) + 1);
    return [...m].sort((x, y) => (!x[0] ? 1 : !y[0] ? -1 : coll.compare(x[0], y[0])));
  }, [records]);
}

// Card in tab "Pflege": state of the running inventory, start/continue, start over (two clicks within 4 s)
export function Inventory({ ins, open, onOpenChange, onPrint }) {
  const { t, nf, df } = useLanguage();
  const inv = useInventory();
  const [sure, setSure] = React.useState(false);
  const timer = React.useRef(0);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const T = React.useMemo(() => (inv ? tally(ins.records, inv) : null), [ins, inv]);
  const start = () => { startInventory(); onOpenChange(true); };
  const reset = () => {
    if (!sure) { setSure(true); clearTimeout(timer.current); timer.current = setTimeout(() => setSure(false), 4000); return; }
    clearTimeout(timer.current);
    setSure(false);
    save(null);
    log("Inventory", "discarded");
  };
  const p = T && T.scope.length ? T.found.length / T.scope.length : 0;
  return (
    <Card id="m-inv">
      <CardTitle>{t("ivT")}</CardTitle>
      <CardDescription>{t("ivP")}</CardDescription>
      {T ? (
        <div className="mt-2 grid gap-1.5" id="inv-state">
          <span className="flex flex-wrap justify-between gap-x-3 text-s">
            <span className="font-medium tabular-nums">{t("ivState", { f: nf(T.found.length), n: nf(T.scope.length) })}</span>
            <span className="text-muted-foreground">{(inv.loc == null ? t("ivAll") : inv.loc || t("ivNoLoc")) + " · " + t("ivSince", { d: df(inv.started) })}</span>
          </span>
          <span className="fix-bar" aria-hidden="true"><span style={{ transform: `scaleX(${p})` }} /></span>
        </div>
      ) : null}
      <CardFooter>
        <Button id="inv-open" onClick={start}><ScanBarcodeIcon aria-hidden="true" /><span>{t(inv ? "ivGo" : "ivStart")}</span></Button>
        {inv ? <Button variant="outline" id="inv-reset" onClick={reset}><span>{t(sure ? "ivResetSure" : "ivReset")}</span></Button> : null}
      </CardFooter>
      {inv ? <Sheet ins={ins} inv={inv} T={T} open={open} onOpenChange={onOpenChange} onPrint={onPrint} /> : null}
    </Card>
  );
}

function Sheet({ ins, inv, T, open, onOpenChange, onPrint }) {
  const { t, nf, df, lang } = useLanguage();
  const locs = useLocations(ins.records);
  const match = React.useMemo(() => matcher(ins.records), [ins]);
  const [code, setCode] = React.useState("");
  const [last, setLast] = React.useState(null); // { kind, rec?, how?, code, n }
  const [view, setView] = React.useState("missing");
  const [cam, setCam] = React.useState(false);
  const [camErr, setCamErr] = React.useState("");
  const field = React.useRef(null), seq = React.useRef(0);
  const swipeRef = useSwipe(".scrim.swipe", () => onOpenChange(false));
  React.useEffect(() => { if (!open) { setCam(false); setCamErr(""); } }, [open]);

  const locName = l => (l == null ? t("ivAll") : l || t("ivNoLoc"));
  const scan = raw => {
    const c = String(raw || "").trim();
    if (!c) return;
    const inv0 = current();
    if (!inv0) return;
    const m = match(inv0, c);
    save(apply(inv0, m));
    setLast({ ...m, n: ++seq.current });
    log("Inventory", `${m.kind}${m.how ? " via " + m.how : ""}`);
    if (navigator.vibrate) navigator.vibrate(m.kind === "found" ? 30 : m.kind === "again" ? 15 : [40, 60, 40]);
  };
  const submit = e => { e.preventDefault(); scan(code); setCode(""); };
  const refocus = () => { if (fine() && field.current) field.current.focus({ preventScroll: true }); };
  // A character typed outside a field (scanner after a click on a button) goes into the code field; Space and Enter keep
  // pressing a focused button (keyboard use: by then a scanner's first character has moved the focus into the field)
  const keys = e => {
    if (isField(e.target) || e.target.closest('[role="menu"]') || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || e.key === " " || !field.current) return;
    e.preventDefault();
    setCode(c => c + e.key);
    field.current.focus({ preventScroll: true });
  };
  // Computer: straight into the code field (a scanner can start at once); phones: no keyboard popping up
  const autoFocus = e => { if (fine() && field.current) { e.preventDefault(); field.current.focus(); } };
  const setLoc = v => { const inv0 = current(); if (inv0) save({ ...inv0, loc: v === "*" ? null : v }); setLast(null); refocus(); };
  const toggle = (id, on) => { const inv0 = current(); if (inv0) save(mark(inv0, id, on)); log("Inventory", on ? "marked by hand" : "taken back"); refocus(); };

  const missing = React.useMemo(() => T.missing.slice().sort((a, b) => coll.compare(a.t, b.t) || coll.compare(a.a, b.a)), [T]);
  const lists = { missing, found: T.found, odd: T.odd, unknown: T.unknown };
  const total = T.scope.length, found = T.found.length;

  // Files: missing, misplaced, unknown codes (Excel: one sheet each; CSV: the missing ones)
  const cols = () => [
    { head: t("cId"), type: "n" }, { head: t("cTitle"), max: 50 }, { head: t("cAuthor"), max: 34 }, { head: t("cLocation"), max: 32 },
    { head: t("cSig"), max: 20 }, { head: t("cYear"), type: "n" },
  ];
  const vals = r => [r.id, r.t, r.a, r.l, r.sig, r.y];
  const time = ms => new Date(ms).toLocaleString(lang === "it" ? "it-IT" : "de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const name = `${slug(t("ivXDoc"))}-${slug(locName(inv.loc))}-${today()}`;
  const title = what => `${t("mxLib")} · ${t("ivXDoc")} · ${locName(inv.loc)} · ${what} · ${t("mxAsOf", { d: df(today()) })}`;
  const toXlsx = () => {
    const sheets = [
      { name: t("ivXMissing"), tab: "A93A39", title: title(t("ivXMissing")), cols: cols(), rows: missing.map(vals) },
      { name: t("ivXOdd"), tab: "DB9F00", title: title(t("ivXOdd")), cols: cols(), rows: T.odd.map(vals) },
      { name: t("ivXUnknown"), tab: "B5C9D0", title: title(t("ivXUnknown")), cols: [{ head: t("ivXCode"), max: 30 }, { head: t("ivXTime"), max: 20 }], rows: T.unknown.map(u => [u.code, time(u.time)]) },
    ];
    const opts = { date: lang === "it" ? "dd/mm/yyyy" : "dd.mm.yyyy", title: `${t("mxLib")} · ${t("ivXDoc")}`, footer: `${t("mxLib")} · ${t("ivXDoc")} · ${t("mxAsOf", { d: df(today()) })}` };
    saveBlob(name + ".xlsx", xlsx(sheets, opts), missing.length + T.odd.length + T.unknown.length);
  };
  const toCsv = () => saveCsv(name + ".csv", [cols().map(c => c.head)].concat(missing.map(vals)));

  const sub = r => [r.a, r.sig, t("ivNo", { n: r.id })].concat(inv.loc == null || view === "odd" ? [r.l || t("ivNoLoc")] : []).filter(Boolean).join(" · ");
  const rows = lists[view];
  return (
    <GlassDialog
      open={open} onOpenChange={onOpenChange} name="Inventory" titleId="inv-t" id="inventory" className="inv swipe" overlayClassName="swipe"
      onOpenAutoFocus={autoFocus} onKeyDown={keys}
    >
      <div className="pane inv-pane" ref={swipeRef}>
        <header className="grid gap-1">
          <DialogTitle id="inv-t">{t("ivT")}</DialogTitle>
          <p className="m-0 text-s text-muted-foreground">{t("ivSince", { d: df(inv.started) })} · {t("ivSub")}</p>
        </header>
        <div className="inv-top">
          <div className="grid min-w-0 content-start gap-3">
            <label className="grid gap-1.5">
              <span className="text-s font-medium">{t("ivLoc")}</span>
              <select
                id="inv-loc" value={inv.loc == null ? "*" : inv.loc} onChange={e => setLoc(e.target.value)}
                className="h-11 w-full min-w-0 rounded-md border border-border bg-background px-3 text-m text-foreground"
              >
                <option value="*">{`${t("ivAll")} · ${nf(ins.records.length)}`}</option>
                {locs.map(([l, n]) => <option key={l} value={l}>{`${locName(l)} · ${nf(n)}`}</option>)}
              </select>
            </label>
            <form id="inv-form" className="flex gap-2" onSubmit={submit}>
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">{t("ivCode")}</span>
                <ScanBarcodeIcon aria-hidden="true" strokeWidth={2} className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={field} id="inv-code" value={code} onChange={e => setCode(e.target.value)} autoComplete="off" spellCheck="false"
                  autoCapitalize="off" enterKeyHint="done" placeholder={t("ivCodePh")} className="h-12 pl-10"
                />
              </label>
              <Button type="submit" id="inv-add" className="h-12" disabled={!code.trim()}>{t("ivAdd")}</Button>
            </form>
            {camera() ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" id="inv-cam" aria-pressed={cam} onClick={() => { setCamErr(""); setCam(c => !c); }}>
                  {cam ? <CameraOffIcon aria-hidden="true" /> : <CameraIcon aria-hidden="true" />}<span>{t(cam ? "ivCamOff" : "ivCam")}</span>
                </Button>
                {cam ? <span className="text-s text-muted-foreground">{t("ivCamHint")}</span> : null}
              </div>
            ) : null}
            {cam ? <Camera onCode={scan} onError={m => { setCam(false); setCamErr(t("ivCamErr", { m })); }} /> : null}
            {camErr ? <p className="flag warn m-0" role="status">{camErr}</p> : null}
            <Last last={last} locName={locName} />
          </div>
          <Ring found={found} total={total} />
        </div>
        <div className="grid gap-2">
          <ToggleGroup type="single" variant="surface" id="inv-view" aria-label={t("ivT")} value={view} onValueChange={v => v && setView(v)} className="grid-flow-row grid-cols-2 min-[30rem]:grid-cols-4">
            {VIEWS.map(v => (
              <ToggleGroupItem key={v} value={v} data-v={v} className="h-11 gap-1.5 px-2 text-s">
                <span>{t("ivV_" + v)}</span><span className="tabular-nums text-muted-foreground">{nf(lists[v].length)}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="m-0 text-s text-muted-foreground">{rows.length ? t("ivH_" + view) : ""}</p>
          <ul className="m-0 list-none p-0" id="inv-list" data-view={view}>
            {!rows.length ? <li className="py-3 text-muted-foreground" data-empty>{t("ivE_" + view)}</li> : null}
            {view === "unknown" ? rows.slice(0, SHOWN).map(u => (
              <li key={u.code} className="inv-row" data-code={u.code}>
                <span className="min-w-0 flex-1"><b className="font-medium tabular-nums [overflow-wrap:anywhere]">{u.code}</b><small className="block text-s text-muted-foreground">{time(u.time)}</small></span>
                <Button variant="outline" size="icon-sm" data-forget aria-label={t("ivForgetL", { c: u.code })} title={t("ivForget")}
                  onClick={() => { const inv0 = current(); if (inv0) save(forget(inv0, u.code)); refocus(); }}><XIcon aria-hidden="true" /></Button>
              </li>
            )) : rows.slice(0, SHOWN).map(r => (
              <li key={r.id} className="inv-row" data-id={r.id}>
                <span className="min-w-0 flex-1">
                  <b className="font-medium [overflow-wrap:anywhere]">{r.t || "–"}</b>
                  <small className="block text-s text-muted-foreground [overflow-wrap:anywhere]">{sub(r)}</small>
                </span>
                {view === "missing" ? (
                  <Button variant="outline" size="sm" data-mark aria-label={t("ivMarkL", { t: r.t || r.id })} onClick={() => toggle(r.id, true)}>
                    <CheckIcon aria-hidden="true" className="size-4" /><span>{t("ivMark")}</span>
                  </Button>
                ) : (
                  <Button variant="outline" size="icon-sm" data-undo aria-label={t("ivUndoL", { t: r.t || r.id })} title={t("ivUndo")} onClick={() => toggle(r.id, false)}>
                    <Undo2Icon aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {rows.length > SHOWN ? <p className="m-0 text-s text-muted-foreground">{t("ivFirst", { s: nf(SHOWN), n: nf(rows.length) })}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <DownloadMenu
            triggerProps={{ id: "inv-dl" }} label={t("ivDl")}
            sections={[[null, [
              { text: t("mxXlsx"), on: toXlsx, props: { id: "inv-xlsx" } },
              { text: t("mxCsv"), on: toCsv, props: { id: "inv-csv" } },
            ]]]}
          />
          <Button variant="outline" id="inv-print" disabled={!missing.length}
            onClick={() => onPrint({ kind: "shelf", loc: t("ivPrintLoc", { l: locName(inv.loc) }), list: missing })}>
            <PrinterIcon aria-hidden="true" /><span>{t("ivPrint")}</span>
          </Button>
        </div>
      </div>
    </GlassDialog>
  );
}

// Answer to the last scan: green found, yellow belongs elsewhere, blue already counted, red unknown
const LOOK = { found: "", odd: "mid", again: "info", unknown: "warn" };
const HEAD = { found: "ivFound", odd: "ivOdd", again: "ivAgain", unknown: "ivUnknown" };
function Last({ last, locName }) {
  const { t } = useLanguage();
  if (!last) return <p className="flag info m-0 text-muted-foreground" id="inv-last" role="status">{t("ivReady")}</p>;
  const r = last.rec;
  return (
    <div className={cn("flag inv-last m-0 grid gap-0.5", LOOK[last.kind])} id="inv-last" data-kind={last.kind} role="status" key={last.n}>
      <strong className="font-semibold">{t(HEAD[last.kind])}{last.how ? <span className="font-normal text-muted-foreground">{" · " + t("ivHow_" + last.how)}</span> : null}</strong>
      {r ? (
        <>
          <span className="[overflow-wrap:anywhere]">{r.t || "–"}</span>
          <span className="text-s text-muted-foreground [overflow-wrap:anywhere]">{[r.a, r.sig, t("ivNo", { n: r.id })].filter(Boolean).join(" · ")}</span>
          {last.kind === "odd" ? <span className="text-s font-medium">{t("ivOddTo", { l: locName(r.l || "") })}</span> : null}
        </>
      ) : <span className="tabular-nums [overflow-wrap:anywhere]">{last.code}</span>}
    </div>
  );
}

// Progress ring: share of the chosen location's copies found
function Ring({ found, total }) {
  const { t, nf } = useLanguage();
  const R = 46, C = 2 * Math.PI * R, p = total ? found / total : 0;
  const pct = nf(Math.floor(p * 1000) / 10) + " %";
  return (
    <div className="inv-ring" id="inv-ring" data-found={found} data-total={total}>
      <div className="relative size-[120px]">
        <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
          <circle className="track" cx="60" cy="60" r={R} />
          <circle className="arc" cx="60" cy="60" r={R} strokeDasharray={`${p * C} ${C}`} transform="rotate(-90 60 60)" />
        </svg>
        <span className="absolute inset-0 grid place-content-center text-center">
          <span className="text-l leading-none font-semibold tabular-nums">{pct}</span>
          <span className="mt-1 text-s text-muted-foreground">{t("ivPct")}</span>
        </span>
      </div>
      <span className="text-s tabular-nums">{t("ivState", { f: nf(found), n: nf(total) })}</span>
    </div>
  );
}

// Camera: reads barcodes with BarcodeDetector (5 times a second); the same code again only after 2.5 s
function Camera({ onCode, onError }) {
  const { t } = useLanguage();
  const video = React.useRef(null);
  const cb = React.useRef({ onCode, onError });
  cb.current = { onCode, onError };
  React.useEffect(() => {
    let alive = true, stream = null, timer = 0, last = "", at = 0;
    (async () => {
      try {
        const supported = window.BarcodeDetector.getSupportedFormats ? await window.BarcodeDetector.getSupportedFormats() : FORMATS;
        const formats = FORMATS.filter(f => supported.includes(f));
        const det = new window.BarcodeDetector(formats.length ? { formats } : undefined);
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!alive) { stream.getTracks().forEach(x => x.stop()); return; }
        const v = video.current;
        v.srcObject = stream;
        await v.play();
        log("Inventory", "camera on");
        const tick = async () => {
          if (!alive) return;
          try {
            const codes = v.readyState >= 2 ? await det.detect(v) : [];
            const c = codes.length ? String(codes[0].rawValue || "") : "";
            if (c && (c !== last || Date.now() - at > 2500)) { last = c; at = Date.now(); cb.current.onCode(c); }
          } catch (e) { /* frame not ready */ }
          if (alive) timer = setTimeout(tick, 200);
        };
        tick();
      } catch (e) {
        if (alive) cb.current.onError((e && (e.message || e.name)) || String(e));
        log("Inventory", `camera failed: ${(e && (e.name || e.message)) || e}`);
      }
    })();
    return () => { alive = false; clearTimeout(timer); if (stream) stream.getTracks().forEach(x => x.stop()); };
  }, []);
  return (
    <div className="inv-cam">
      <video ref={video} muted playsInline aria-label={t("ivCamHint")} />
      <span className="inv-aim" aria-hidden="true" />
    </div>
  );
}
