/* Small hand-built charts for the tab "Statistik" (stats.jsx), no chart library.
   Marks in the logo colors (var(--mauve) …, passed in by the caller), text only in the text tokens, hairlines in --line.
   SVG charts draw in real pixels (width measured with ResizeObserver), so axis text keeps its size on the phone.
   Every chart: hover/focus tooltip on its marks, focusable marks with an aria-label, and a table twin in the card
   (always there for screen readers, visible via "Als Tabelle"). Entry: marks grow from their baseline (styles.css
   "Admin statistics"), staggered by at most 300 ms. */
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language";

const delay = i => Math.min(i * 18, 300) + "ms";
const BG = "var(--bg)"; // card surface: gaps and rings around marks

// Width of an element in px (0 until measured)
export function useWidth() {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setW(Math.floor(el.clientWidth));
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Tooltip: one per chart, positioned above the hovered/focused mark inside the box (ref). rows = [[value, label, color?]]
export function useTip() {
  const ref = React.useRef(null);
  const [tip, setTip] = React.useState(null);
  const show = (el, rows, i, pt) => {
    const box = ref.current;
    if (!box || !el) return;
    const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    const cx = pt ? r.left + pt.x : r.left + r.width / 2, cy = pt ? r.top + pt.y : r.top;
    const half = Math.min(b.width / 2, 92);
    setTip({ x: Math.max(half, Math.min(b.width - half, cx - b.left)), y: cy - b.top, rows, i });
  };
  const hide = () => setTip(null);
  const on = (rows, i, pt) => ({
    onPointerEnter: e => show(pt ? e.currentTarget.ownerSVGElement : e.currentTarget, rows, i, pt),
    onPointerLeave: hide,
    onFocus: e => show(pt ? e.currentTarget.ownerSVGElement : e.currentTarget, rows, i, pt),
    onBlur: hide,
  });
  const node = tip ? (
    <div className="st-tip text-s" aria-hidden="true" style={{ left: tip.x + "px", top: tip.y + "px" }}>
      {tip.rows.map(([value, label, color], k) => (
        <div key={k} className="flex items-center gap-2">
          {color ? <span className="st-key" style={{ background: color }} /> : null}
          <span className="font-semibold tabular-nums">{value}</span>
          {label ? <span className="st-tip-l">{label}</span> : null}
        </div>
      ))}
    </div>
  ) : null;
  return { ref, on, hide, node, active: tip ? tip.i : null };
}

// Clean axis ticks: 0 … max in 3–5 steps of 1/2/5 × 10^n
export function ticks(max, n = 4) {
  if (!(max > 0)) return [0, 1];
  const raw = max / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  const out = [];
  for (let v = 0; v < max + step * 0.999; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}
// Compact axis numbers: 1.200 → 1,2 Tsd. would be clumsy; the collection stays below 100,000, so 1K style only from 10,000
const axisNum = (nf, v) => (v >= 10000 ? nf(Math.round(v / 1000)) + "k" : nf(v));

// Card around a chart: title (the question), caption (the key number), controls, plot, legend, table twin
export function ChartCard({ name, title, caption, wide, controls, legend, table, children }) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const id = "st-table-" + name;
  return (
    <Card data-chart={name} className={cn("st-card min-w-0", wide && "st-wide")}>
      <CardTitle>{title}</CardTitle>
      {caption ? <CardDescription>{caption}</CardDescription> : null}
      {controls ? <div className="mt-2">{controls}</div> : null}
      <div className="mt-3 min-w-0">{children}</div>
      {legend ? <Legend items={legend} /> : null}
      {table ? (
        <>
          <Button variant="ghost" size="text" className="mt-1 min-h-11 self-start" aria-expanded={open} aria-controls={id} data-table-toggle onClick={() => setOpen(o => !o)}>
            {t(open ? "stTableHide" : "stTable")}
          </Button>
          <DataTable id={id} caption={title} table={table} hidden={!open} />
        </>
      ) : null}
    </Card>
  );
}

// Legend: rect for bars/areas, short line for lines; always next to the marks' colors, text in the text tokens
function Legend({ items }) {
  return (
    <ul className="st-legend" role="list">
      {items.map(([label, color, kind]) => (
        <li key={label} className="flex items-center gap-2">
          <span className={kind === "line" ? "st-key" : "st-swatch"} style={{ background: color }} aria-hidden="true" />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}

// Table twin: head = column titles, rows = [row title, ...values]
function DataTable({ id, caption, table, hidden }) {
  return (
    <div id={id} className={hidden ? "sr-only" : "st-table mt-2 overflow-x-auto"}>
      <table className="w-full border-collapse text-s">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{table.head.map((h, i) => <th key={i} scope="col" className={cn(i && "text-right")}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((r, n) => (
            <tr key={n}>
              {r.map((c, i) => (i ? <td key={i} className="text-right tabular-nums">{c}</td> : <th key={i} scope="row">{c}</th>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// KPI tiles: label, value (proportional figures), optional note; a short accent line in a logo color
export function Kpis({ items }) {
  return (
    <div className="st-kpis" style={{ "--n": Math.min(6, items.length) }}>
      {items.map(k => (
        <div key={k.key} className="st-kpi" data-kpi={k.key} style={{ "--c": k.color }}>
          <span className="text-s text-muted-foreground">{k.label}</span>
          <span className={cn("st-kpi-value font-semibold", k.small ? "text-m" : "text-l")}>{k.value}</span>
          {k.note ? <span className="text-s text-muted-foreground">{k.note}</span> : null}
        </div>
      ))}
    </div>
  );
}

/* Horizontal bars (HTML, labels may wrap): label line above, bar with the value at its tip.
   sections: [{ key, title?, items: [{ key, label, value, text?, sub? }] }]; max = full length; track = draw the
   0–max track (shares); onPick(item) turns every row into a button (≥ 44 px). */
export function HBars({ sections, max, color, track, onPick, pickLabel }) {
  const { nf } = useLanguage();
  let n = 0;
  return (
    <div className="grid gap-3">
      {sections.map(s => (
        <section key={s.key} data-group={s.key}>
          {s.title ? <h3 className="m-0 mb-0.5 text-s font-medium text-muted-foreground">{s.title}</h3> : null}
          <ul className="m-0 list-none p-0" role="list">
            {s.items.map(it => {
              const p = max > 0 ? Math.max(0, Math.min(1, it.value / max)) : 0;
              const inner = (
                <>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">{it.label}</span>
                    {it.sub ? <span className="shrink-0 text-s text-muted-foreground tabular-nums">{it.sub}</span> : null}
                  </span>
                  <span className={cn("st-htrack", track && "st-track")}>
                    <span className="st-hbar st-grow-x" style={{ "--p": p, background: color, animationDelay: delay(n++) }} />
                    <span className="st-hval tabular-nums">{it.text || nf(it.value)}</span>
                  </span>
                </>
              );
              return (
                <li key={it.key} data-bar={it.key}>
                  {onPick ? (
                    <button type="button" className="st-hrow st-pick" onClick={() => onPick(it)} aria-label={pickLabel ? pickLabel(it) : undefined}>{inner}</button>
                  ) : <div className="st-hrow">{inner}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

// Path of a column with 4 px rounded top corners, square at the baseline
function colPath(x, y, w, base) {
  const h = base - y, r = Math.max(0, Math.min(4, w / 2, h));
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

/* Columns over bins (histogram, years). bins: [{ key, label, value, tip }]; marker: { at: position in bins (0 … n),
   label } = vertical reference line (median); trend: value per bin or null = 2 px line; one series = one color. */
export function Columns({ bins, color, marker, trend, height = 200, aria }) {
  const { nf } = useLanguage();
  const [wref, w] = useWidth();
  const tip = useTip();
  const max = Math.max(1, ...bins.map(b => b.value), ...(trend || []).filter(v => v != null));
  const yt = ticks(max);
  const top = yt[yt.length - 1];
  const left = 8 + 8 * String(axisNum(nf, top)).length, right = 4, upper = 24, lower = 26;
  const pw = Math.max(0, w - left - right), ph = height - upper - lower, base = upper + ph;
  const n = bins.length, band = n ? pw / n : 0;
  const bw = Math.max(1, Math.min(24, band - 2, band * 0.72));
  const y = v => base - (v / top) * ph;
  const labelW = Math.max(...bins.map(b => String(b.label).length)) * 8 + 10;
  const every = Math.max(1, Math.ceil(labelW / Math.max(1, band)));
  const maxI = bins.reduce((m, b, i) => (b.value > bins[m].value ? i : m), 0);
  const trendPts = trend ? trend.map((v, i) => (v == null ? null : `${left + band * (i + 0.5)},${y(Math.max(0, v))}`)).filter(Boolean) : [];
  return (
    <div ref={tip.ref} className="relative">
      <div ref={wref} className="w-full">
        {w > 0 ? (
          <svg className="st-svg text-s" width={w} height={height} viewBox={`0 0 ${w} ${height}`} role="group" aria-label={aria}>
            {yt.map(v => (
              <g key={v}>
                <line x1={left} x2={w - right} y1={y(v)} y2={y(v)} className="st-grid-line" />
                <text x={left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="st-axis">{axisNum(nf, v)}</text>
              </g>
            ))}
            {bins.map((b, i) => {
              const x = left + band * i + (band - bw) / 2;
              return (
                <g key={b.key}>
                  {b.value > 0 ? (
                    <path d={colPath(x, y(b.value), bw, base)} fill={color} className={cn("st-grow-y st-mark", tip.active != null && tip.active !== i && "st-dim")} style={{ animationDelay: delay(i) }} />
                  ) : null}
                  {i % every === 0 ? <text x={left + band * (i + 0.5)} y={base + 18} textAnchor="middle" className="st-axis">{b.label}</text> : null}
                </g>
              );
            })}
            {bins[maxI] && bins[maxI].value > 0 && !marker ? (
              <text x={left + band * (maxI + 0.5)} y={y(bins[maxI].value) - 6} textAnchor="middle" className="st-value">{nf(bins[maxI].value)}</text>
            ) : null}
            {trendPts.length > 1 ? <polyline points={trendPts.join(" ")} className="st-trend st-draw" pathLength="1" /> : null}
            {marker ? (() => {
              const mx = left + band * marker.at, end = mx > left + pw / 2;
              return (
                <g className="st-marker">
                  <line x1={mx} x2={mx} y1={upper - 4} y2={base} />
                  <text x={end ? mx - 6 : mx + 6} y={upper - 8} textAnchor={end ? "end" : "start"} className="st-value">{marker.label}</text>
                </g>
              );
            })() : null}
            <line x1={left} x2={w - right} y1={base} y2={base} className="st-base" />
            {bins.map((b, i) => (
              <rect
                key={b.key} x={left + band * i} y={upper} width={band} height={ph} className="st-hit" tabIndex={0} role="img"
                aria-label={b.tip} {...tip.on([[nf(b.value), b.label]], i)}
              />
            ))}
          </svg>
        ) : <div style={{ height: height + "px" }} />}
      </div>
      {tip.node}
    </div>
  );
}

/* Lines over time: x = dates (time scale), series = [{ key, label, color, values: [number|null] }], one y axis from 0.
   Crosshair + one tooltip with every series at the hovered date; the first series has a light area wash. */
export function LineChart({ dates, labels, series, height = 210, aria }) {
  const { nf } = useLanguage();
  const [wref, w] = useWidth();
  const tip = useTip();
  const ts = dates.map(d => Date.parse(d));
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const max = Math.max(1, ...series.map(s => Math.max(0, ...s.values.filter(v => v != null))));
  const yt = ticks(max);
  const top = yt[yt.length - 1];
  const left = 8 + 8 * String(axisNum(nf, top)).length, right = 14, upper = 12, lower = 26;
  const pw = Math.max(0, w - left - right), ph = height - upper - lower, base = upper + ph;
  const x = i => left + (t1 > t0 ? ((ts[i] - t0) / (t1 - t0)) * pw : pw / 2);
  const y = v => base - (v / top) * ph;
  const path = s => {
    let d = "", pen = false;
    s.values.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + x(i) + "," + y(v); pen = true; });
    return d;
  };
  const first = series[0];
  const fi = first.values.map((v, i) => (v == null ? -1 : i)).filter(i => i >= 0);
  const area = fi.length > 1 ? `M${x(fi[0])},${base}` + fi.map(i => `L${x(i)},${y(first.values[i])}`).join("") + `L${x(fi[fi.length - 1])},${base}Z` : "";
  const a = tip.active;
  return (
    <div ref={tip.ref} className="relative">
      <div ref={wref} className="w-full">
        {w > 0 ? (
          <svg className="st-svg text-s" width={w} height={height} viewBox={`0 0 ${w} ${height}`} role="group" aria-label={aria}>
            {yt.map(v => (
              <g key={v}>
                <line x1={left} x2={w - right} y1={y(v)} y2={y(v)} className="st-grid-line" />
                <text x={left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="st-axis">{axisNum(nf, v)}</text>
              </g>
            ))}
            <line x1={left} x2={w - right} y1={base} y2={base} className="st-base" />
            <text x={x(0)} y={base + 18} textAnchor="start" className="st-axis">{labels[0]}</text>
            <text x={x(dates.length - 1)} y={base + 18} textAnchor="end" className="st-axis">{labels[labels.length - 1]}</text>
            {area ? <path d={area} fill={first.color} className="st-area" /> : null}
            {series.map(s => <path key={s.key} d={path(s)} stroke={s.color} className="st-line st-draw" pathLength="1" />)}
            {a != null ? <line x1={x(a)} x2={x(a)} y1={upper} y2={base} className="st-cross" /> : null}
            {series.map(s => {
              const i = a != null ? a : s.values.length - 1;
              const v = s.values[i];
              return v == null ? null : <circle key={s.key} cx={x(i)} cy={y(v)} r={4} fill={s.color} stroke={BG} strokeWidth={2} className="st-dot" />;
            })}
            {dates.map((d, i) => {
              const lo = i ? (x(i - 1) + x(i)) / 2 : left, hi = i < dates.length - 1 ? (x(i) + x(i + 1)) / 2 : w - right;
              const rows = series.filter(s => s.values[i] != null).map(s => [nf(s.values[i]), s.label, s.color]);
              return (
                <rect
                  key={d + i} x={lo} y={upper} width={Math.max(1, hi - lo)} height={ph} className="st-hit" tabIndex={0} role="img"
                  aria-label={labels[i] + ": " + rows.map(r => r[1] + " " + r[0]).join(", ")}
                  {...tip.on([[labels[i], ""]].concat(rows), i, { x: x(i), y: upper })}
                />
              );
            })}
          </svg>
        ) : <div style={{ height: height + "px" }} />}
      </div>
      {tip.node}
    </div>
  );
}

/* Donut (part of a whole, ≤ 6 parts): parts = [{ key, label, value, color }], 2 px gaps between segments;
   center = { value, label } in HTML; the list beside it is the legend with values and shares. */
export function Donut({ parts, center, aria }) {
  const { nf } = useLanguage();
  const tip = useTip();
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const S = 168, R = 64, W = 22, C = 2 * Math.PI * R;
  const shown = parts.filter(p => p.value > 0);
  const gap = shown.length > 1 ? 2 : 0;
  const pct = v => nf(Math.round((v / total) * 1000) / 10) + " %";
  let start = 0;
  return (
    <div ref={tip.ref} className="st-donut relative">
      <div className="relative shrink-0" style={{ width: S + "px", height: S + "px" }}>
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} role="group" aria-label={aria}>
          <circle cx={S / 2} cy={S / 2} r={R} fill="none" stroke="var(--surface)" strokeWidth={W} />
          {shown.map((p, i) => {
            const len = (p.value / total) * C, dash = Math.max(0.5, len - gap);
            const mid = ((start + len / 2) / C) * 2 * Math.PI - Math.PI / 2;
            const pt = { x: S / 2 + Math.cos(mid) * R, y: S / 2 + Math.sin(mid) * R - W / 2 };
            const el = (
              <circle
                key={p.key} cx={S / 2} cy={S / 2} r={R} fill="none" stroke={p.color} strokeWidth={W}
                strokeDasharray={`${dash} ${C}`} strokeDashoffset={-start} transform={`rotate(-90 ${S / 2} ${S / 2})`}
                className={cn("st-seg st-mark", tip.active != null && tip.active !== i && "st-dim")} tabIndex={0} role="img"
                style={{ "--c": C, animationDelay: delay(i * 3) }} data-part={p.key}
                aria-label={`${p.label}: ${nf(p.value)} (${pct(p.value)})`} {...tip.on([[nf(p.value), p.label, p.color]], i, pt)}
              />
            );
            start += len;
            return el;
          })}
        </svg>
        {center ? (
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center" aria-hidden="true">
            <span className="text-l leading-none font-semibold">{center.value}</span>
            <span className="mt-1 text-s text-muted-foreground">{center.label}</span>
          </div>
        ) : null}
      </div>
      <ul className="m-0 grid min-w-0 flex-1 list-none content-center gap-1.5 p-0" role="list">
        {parts.map(p => (
          <li key={p.key} className="flex items-baseline gap-2" data-part={p.key}>
            <span className="st-swatch translate-y-px" style={{ background: p.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1">{p.label}</span>
            <span className="font-medium tabular-nums">{nf(p.value)}</span>
            <span className="w-14 shrink-0 text-right text-s text-muted-foreground tabular-nums">{pct(p.value)}</span>
          </li>
        ))}
      </ul>
      {tip.node}
    </div>
  );
}

// Squarified treemap: rectangles for values (sorted, largest first) in the box w × h
function squarify(values, w, h) {
  const total = values.reduce((s, v) => s + v, 0) || 1, k = (w * h) / total;
  const areas = values.map(v => v * k), out = [];
  let x = 0, y = 0, i = 0;
  const worst = (row, side) => {
    const s = row.reduce((a, b) => a + b, 0), mx = Math.max(...row), mn = Math.min(...row);
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  while (i < areas.length) {
    const side = Math.min(w, h);
    const row = [areas[i]];
    let j = i + 1;
    while (j < areas.length && worst(row.concat(areas[j]), side) <= worst(row, side)) row.push(areas[j++]);
    const s = row.reduce((a, b) => a + b, 0);
    if (w >= h) {
      const cw = s / h;
      let cy = y;
      row.forEach((a, n) => { out.push({ i: i + n, x, y: cy, w: cw, h: a / cw }); cy += a / cw; });
      x += cw; w -= cw;
    } else {
      const rh = s / w;
      let cx = x;
      row.forEach((a, n) => { out.push({ i: i + n, x: cx, y, w: a / rh, h: rh }); cx += a / rh; });
      y += rh; h -= rh;
    }
    i = j;
  }
  return out;
}

/* Treemap (HTML): items = [{ key, label, value, rest? }] largest first; one color, "rest" (the folded tail) neutral.
   A cell shows its name and number only where they fit; every cell has a tooltip and an aria-label. */
export function Treemap({ items, color, total, aria }) {
  const { nf } = useLanguage();
  const [wref, w] = useWidth();
  const tip = useTip();
  const h = Math.round(Math.max(220, Math.min(340, w * 0.62)));
  const cells = w > 0 ? squarify(items.map(it => it.value), w, h) : [];
  const pct = v => nf(Math.round((v / (total || 1)) * 1000) / 10) + " %";
  return (
    <div ref={tip.ref} className="relative">
      <div ref={wref} className="st-tree" style={{ height: h + "px" }} role="list" aria-label={aria}>
        {cells.map(c => {
          const it = items[c.i], lines = Math.floor((c.h - 10) / 21);
          const label = c.w >= 64 && lines >= 2;
          return (
            <div
              key={it.key} role="listitem" tabIndex={0} data-cell={it.key}
              className={cn("st-cell st-pop", it.rest && "st-rest", tip.active != null && tip.active !== c.i && "st-dim")}
              style={{ left: c.x + "px", top: c.y + "px", width: c.w + "px", height: c.h + "px", background: it.rest ? undefined : color, animationDelay: delay(c.i) }}
              aria-label={`${it.label}: ${nf(it.value)} (${pct(it.value)})`} {...tip.on([[nf(it.value), it.label]], c.i)}
            >
              {label ? (
                <span className="st-cell-in" aria-hidden="true">
                  <span className="st-clamp" style={{ WebkitLineClamp: Math.min(3, lines - 1) }}>{it.label}</span>
                  <span className="font-medium tabular-nums">{nf(it.value)}</span>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {tip.node}
    </div>
  );
}

/* Heatmap as a real table (rows × columns, sequential: one hue, more = stronger): cells = [[{ value, share, tip }]].
   The table is its own accessible twin; the cells are focusable for the tooltip. */
export function Heatmap({ rows, cols, cells, color, max, low, high, rowHead }) {
  const { nf } = useLanguage();
  const tip = useTip();
  return (
    <div ref={tip.ref} className="relative">
      <table className="st-heat w-full border-separate text-s">
        <thead>
          <tr>
            <th scope="col" className="text-left font-medium text-muted-foreground">{rowHead}</th>
            {cols.map(c => <th key={c} scope="col" className="font-medium text-muted-foreground">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r + i}>
              <th scope="row" className="text-left font-normal">{r}</th>
              {cells[i].map((c, j) => {
                const k = max > 0 ? c.value / max : 0, strong = k > 0.55;
                return (
                  <td key={j} tabIndex={0} aria-label={c.tip} data-v={c.value} {...tip.on([[nf(c.value), c.tip]], i * 100 + j)}>
                    <span className="st-heat-fill st-pop" style={{ background: color, opacity: c.value ? 0.12 + 0.88 * k : 0, animationDelay: delay(i + j) }} />
                    <span className={cn("relative tabular-nums", strong ? "text-white" : c.value ? "" : "text-muted-foreground")}>{c.value ? nf(c.value) : "–"}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-2 text-s text-muted-foreground" aria-hidden="true">
        <span>{low}</span>
        <span className="st-ramp" style={{ "--c": color }} />
        <span>{high}</span>
      </div>
      {tip.node}
    </div>
  );
}
