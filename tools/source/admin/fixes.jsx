/* Tab "Pflege": automatic corrections of simple formatting inconsistencies in the PUBLIC list (fixes-core.js), not in
   WinBIAP. Each applicable fix is a row (checkbox, count, before → after examples, the full list on demand). One run
   button: Play → spinner while the list is corrected in chunks (at least MIN ms of progress) → green with a drawn check.
   Result = B.setFixed({ books, applied, counts, changed }); undo = B.setFixed(null). It is published with books.js.
   Below: what the list already cleans by itself on every import (yearOdd, titleSpaces from inspect), with a jump to the
   correction list for WinBIAP. Props: B (app state), ins (inspect result or null).
   Test hooks: #fixes, #fix-run[data-state=idle|running|done], #fix-undo, #fix-sum, #fix-none, [data-fix], #fix-on-<key>,
   [data-auto]. */
import "./strings-fixes";
import * as React from "react";
import {
  ArrowRightIcon, BuildingIcon, CalendarIcon, ChevronDownIcon, CopyMinusIcon, EraserIcon, MapPinIcon, PlayIcon, ScanTextIcon,
  SpaceIcon, TagIcon, Undo2Icon, UserIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { log } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { STEPS, apply, plan } from "./fixes-core";

const ICONS = { chars: ScanTextIcon, punct: EraserIcon, subtitle: CopyMinusIcon, category: TagIcon, location: MapPinIcon, publisher: BuildingIcon, author: UserIcon };
const AUTO = [["yearOdd", CalendarIcon], ["titleSpaces", SpaceIcon]];
const MIN = 600; // ms of visible progress, so the button doesn't flash
const CHUNK = 1500; // books per step
const SHOWN = 3; // examples per row
const CAP = 1000; // rows in the full list
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const idle = fn => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 60 }) : setTimeout(fn, 0));

// Category names with an Italian name: their spelling wins in a group
function knownCategories(extra) {
  const s = new Set(Object.keys(window.DSM_CATEGORIES_IT || {}));
  const own = (extra && extra.catIt) || {};
  for (const k of Object.keys(own)) if (String(own[k] || "").trim()) s.add(k);
  return s;
}

export function Fixes({ B, ins }) {
  const { t, nf, lang } = useLanguage();
  const fixed = B.fixed;
  const [off, setOff] = React.useState(() => new Set(fixed ? STEPS.filter(k => !fixed.applied.includes(k)) : []));
  const [busy, setBusy] = React.useState(false);
  const known = React.useMemo(() => knownCategories(B.extra), [B.extra]);
  const an = React.useMemo(() => plan(B.base, k => !off.has(k), known), [B.base, off, known]);
  const rows = an.rows.filter(r => r.count);
  const keys = rows.filter(r => !off.has(r.key)).map(r => r.key);
  const state = busy ? "running" : fixed ? "done" : "idle";
  const btn = React.useRef(null), bar = React.useRef(null), alive = React.useRef(true), prevW = React.useRef(0);
  React.useEffect(() => () => { alive.current = false; }, []);

  // Button width glides between the labels (measured, then from the old to the new width)
  React.useLayoutEffect(() => {
    const el = btn.current;
    if (!el) return undefined;
    el.style.width = "";
    const w = el.offsetWidth;
    const from = prevW.current;
    prevW.current = w;
    if (!from || from === w || reduced()) return undefined;
    el.style.width = from + "px";
    void el.offsetWidth; // apply the old width before the transition starts
    el.style.width = w + "px";
    const end = e => { if (e.propertyName === "width") el.style.width = ""; };
    el.addEventListener("transitionend", end);
    return () => el.removeEventListener("transitionend", end);
  }, [state, lang]);

  const progress = p => {
    const el = bar.current;
    if (!el) return;
    el.firstChild.style.transform = `scaleX(${p})`;
    el.setAttribute("aria-valuenow", String(Math.round(p * 100)));
  };

  function run() {
    if (state !== "idle" || !keys.length) return;
    const src = B.base, fns = an.fns, applied = keys.slice(), out = new Array(src.length);
    const counts = Object.fromEntries(rows.filter(r => applied.includes(r.key)).map(r => [r.key, r.count]));
    const min = reduced() ? 0 : MIN, t0 = performance.now();
    let i = 0;
    setBusy(true);
    const step = () => {
      const end = Math.min(src.length, i + CHUNK);
      apply(src, fns, i, end, out);
      i = end;
      const time = min ? (performance.now() - t0) / min : 1;
      progress(Math.min(src.length ? i / src.length : 1, time));
      if (i < src.length) return idle(step);
      if (time < 1) return requestAnimationFrame(step);
      let changed = 0;
      for (let j = 0; j < src.length; j++) if (out[j] !== src[j]) changed++;
      B.setFixed({ books: out, applied, counts, changed });
      log("Fixes", `${applied.join(", ")}: ${changed} books changed`);
      if (alive.current) setBusy(false);
    };
    requestAnimationFrame(() => { progress(0); idle(step); });
  }
  function undo() {
    B.setFixed(null);
    log("Fixes", "undone");
    setTimeout(() => btn.current && btn.current.focus(), 0);
  }
  const toggle = (key, on) => setOff(s => { const n = new Set(s); if (on) n.delete(key); else n.add(key); return n; });

  const autos = ins ? AUTO.map(([key, Icon]) => {
    const c = ins.checks.find(x => x.key === key);
    return { key, Icon, n: c ? c.rows.length : 0 };
  }).filter(x => x.n) : [];
  const label = t(state === "running" ? "fxRunning" : state === "done" ? "fxDone" : "fxRun");
  const changed = fixed ? (fixed.changed != null ? fixed.changed : an.changed) : 0;

  return (
    <Card id="fixes" aria-labelledby="fixes-t">
      <CardTitle id="fixes-t">{t("fxT")}</CardTitle>
      <CardDescription>{t("fxP")}</CardDescription>
      {rows.length ? (
        <ul className="m-0 mt-2 list-none p-0">
          {rows.map(r => (
            <FixRow key={r.key} row={r} on={!off.has(r.key)} disabled={state !== "idle"} onToggle={v => toggle(r.key, v)} />
          ))}
        </ul>
      ) : (
        <p className="flag m-0 mt-2" id="fix-none">{t("fxNone")}</p>
      )}
      {rows.length || fixed ? (
        <div className="mt-3.5 grid gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              ref={btn} type="button" id="fix-run" data-state={state} className={cn(buttonVariants(), "fix-run")}
              aria-disabled={state !== "idle" || !keys.length ? "true" : undefined} aria-describedby="fix-live" onClick={run}
            >
              <span className="fix-icons" aria-hidden="true">
                <PlayIcon className="fix-play" />
                <span className="fix-spin"><span /></span>
                <svg className="fix-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" />
                </svg>
              </span>
              <span key={state} className="fix-label">{label}</span>
            </button>
            {state === "done" ? (
              <Button variant="outline" id="fix-undo" onClick={undo}><Undo2Icon aria-hidden="true" /><span>{t("fxUndo")}</span></Button>
            ) : null}
          </div>
          <div
            ref={bar} className="fix-bar" role="progressbar" aria-label={t("fxProgress")} aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={0} hidden={state !== "running"}
          >
            <span />
          </div>
          <p className="sr-only" id="fix-live" role="status">{state === "done" ? t("fxSum", { n: nf(changed) }) : state === "running" ? t("fxRunning") : ""}</p>
          {state === "done" ? (
            <div className="flag fix-sum grid gap-1.5" id="fix-sum">
              <span className="font-medium">{t("fxSum", { n: nf(changed) })}</span>
              <span className="text-s text-muted-foreground">{t("fxPub")}</span>
              <div>
                <Button variant="outline" id="fix-to-catalog" onClick={() => B.setTab("catalog")}>
                  <span>{t("fxToCatalog")}</span><ArrowRightIcon aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {autos.length ? (
        <section className="mt-4" id="fix-auto" aria-labelledby="fix-auto-t">
          <h3 className="m-0 mb-1 text-s font-medium text-muted-foreground" id="fix-auto-t">{t("fxAutoT")}</h3>
          <p className="m-0 mb-1 text-s text-muted-foreground">{t("fxAutoP")}</p>
          <ul className="m-0 list-none p-0">
            {autos.map(({ key, Icon, n }) => (
              <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border py-2.5" data-auto={key}>
                <Icon aria-hidden="true" className="size-[18px] shrink-0 text-muted-foreground" />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span>{t("fxa_" + key)}</span>
                  <span className="text-s text-muted-foreground">{t("fxah_" + key)}</span>
                </span>
                <span className="font-medium tabular-nums" data-n="">{nf(n)}</span>
                <Button variant="outline" data-list={key} onClick={() => jump(key)}><span>{t("fxList")}</span></Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Card>
  );
}

// Opens the correction list of a check further down in tab "Pflege" (maintenance.jsx, [data-check]) and moves there
function jump(key) {
  const el = document.querySelector(`[data-check="${key}"]`);
  if (!el) return;
  const b = el.querySelector("button[aria-expanded]");
  if (b && b.getAttribute("aria-expanded") === "false") b.click();
  el.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" });
  if (b) b.focus({ preventScroll: true });
}

// One fix: checkbox, icon, name, description, count; examples before → after, the full list in a scrolling box
function FixRow({ row, on, disabled, onToggle }) {
  const { t, nf } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const Icon = ICONS[row.key];
  const id = "fix-on-" + row.key;
  const list = open ? row.pairs.slice(0, CAP) : row.pairs.slice(0, SHOWN);
  const pair = ([from, to, n], i) => (
    <li key={i} className="flex flex-wrap items-baseline gap-x-1.5 border-t border-border py-1 first:border-t-0">
      <span className="min-w-0 break-words text-muted-foreground">{from}</span>
      <ArrowRightIcon aria-hidden="true" className="size-3.5 shrink-0 self-center text-muted-foreground" />
      <span className="min-w-0 break-words">{to || t("fxRemoved")}</span>
      {n > 1 ? <span className="text-muted-foreground tabular-nums">· {nf(n)}×</span> : null}
    </li>
  );
  return (
    <li className="fix-row border-t border-border py-2.5 first:border-t-0" data-fix={row.key} data-on={on ? "" : undefined}>
      <label htmlFor={id} className={cn("flex min-h-11 items-start gap-3", disabled ? "cursor-default" : "cursor-pointer")}>
        <Checkbox id={id} className="mt-0.5" checked={on} disabled={disabled} onCheckedChange={v => onToggle(v === true)} />
        <Icon aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="font-medium">{t("fx_" + row.key)}</span>
          <span className="text-s text-muted-foreground">{t("fxh_" + row.key)}</span>
        </span>
        <span className="font-medium tabular-nums" data-n="">{nf(row.count)}</span>
      </label>
      <div className="mt-1.5 pl-[62px] text-s">
        {open ? (
          <div className="fix-all max-h-64 overflow-y-auto rounded-md border border-border px-2.5 py-1" role="region" tabIndex={0} aria-label={t("fxAllOf", { name: t("fx_" + row.key) })}>
            <ul className="m-0 list-none p-0">{list.map(pair)}</ul>
            {row.pairs.length > CAP ? <p className="m-0 py-1 text-muted-foreground">{t("fxCap", { s: nf(CAP), n: nf(row.pairs.length) })}</p> : null}
          </div>
        ) : (
          <ul className="m-0 list-none p-0">{list.map(pair)}</ul>
        )}
        {row.pairs.length > SHOWN ? (
          <button
            type="button" className="flex min-h-11 items-center gap-2 text-s text-muted-foreground hover:text-foreground"
            aria-expanded={open} data-more={row.key} onClick={() => setOpen(o => !o)}
          >
            <span>{open ? t("fxLess") : t("fxMore", { n: nf(row.pairs.length) })}</span>
            <ChevronDownIcon aria-hidden="true" className={cn("size-4 transition-transform duration-150 ease-dsm motion-reduce:transition-none", open && "rotate-180")} />
          </button>
        ) : null}
      </div>
    </li>
  );
}
