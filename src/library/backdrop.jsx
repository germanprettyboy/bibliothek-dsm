/* Interactive background (settings "Hintergrund"): the abstract scene Punkte behind the book list, off by default
   (`dsm-bg` = { on }). It runs on the GPU (library/dots-gl.js, WebGL) wherever that works, otherwise with canvas 2D
   (library/scenes.js). The settings show a live preview that answers the pointer like the page does; nothing to tweak.
   Layer #bg (fixed, z-index -1, aria-hidden, no pointer events): in front of the body color, behind everything else.
   Under the content column the mask in styles.css lets only --fx-col of it through (the list stays readable), the
   search bar is transparent until it sticks. Pointer, clicks/taps and scrolling are read on window, only while the
   layer is on; a ring wave only for a click on free space (never on a book, button, field or link) and never for one
   that began under a dialog (closing a book by a click beside it).
   Frames: while the pointer moves or a wave runs 60 fps (WebGL) / 30 (canvas 2D), otherwise 20, 10 after 30 s
   without any input; none in a hidden tab, none under a modal dialog (its blur would be recomputed on every frame –
   switching it on in the settings paints one frame). Reduced motion (system or setting):
   one still frame, no pointer. High contrast, print: none. Colors only from the tokens in styles.css, read again on
   every theme change.
   Test hooks: #bg[data-bg], <html data-bg>, #s-bg, #s-bgpick, #bg-preview (the box of the preview canvas),
   window.DSM_BG { frames, gl, waves }. */
import * as React from "react";

import { Section, Option } from "@/components/settings";
import { useAppearance } from "@/lib/appearance";
import { reduced, systemReduced } from "@/lib/environment";
import { addStrings, useLanguage } from "@/lib/language";
import { store, log } from "@/lib/storage";
import { dots, HUES, WAVE } from "@/library/scenes";
import { dotsGL } from "@/library/dots-gl";

addStrings({
  de: {
    bgTitle: "Hintergrund", bgShow: "Bewegter Hintergrund", bgShowH: "Abstrakt – folgt Zeiger, Klick und Fingertipp",
    bgContrast: "Bei hohem Kontrast ausgeschaltet",
  },
  it: {
    bgTitle: "Sfondo", bgShow: "Sfondo animato", bgShowH: "Astratto – segue puntatore, clic e tocco",
    bgContrast: "Disattivato con contrasto elevato",
  },
});

const root = document.documentElement;
const IDLE = 30000; // without any input for so long: 10 fps

// ---------- Choice (localStorage dsm-bg) ----------
// Saved before 2026-10-27 with a scene and tweaks (id, color, k, t, d): only `on` counts
const KEY = "dsm-bg";
let pref = { on: !!(store.json(KEY) || {}).on };
const listeners = new Set();

export function setBackground(on) {
  if (on === pref.on) return;
  pref = { on };
  store.set(KEY, JSON.stringify(pref));
  log("Setting", `Background: ${on ? "dots" : "off"}`);
  listeners.forEach(fn => fn());
  mount();
}
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const useBackground = () => React.useSyncExternalStore(subscribe, () => pref);

// ---------- Engine: one scene per box (the page layer, the preview in the settings) ----------
let P = null; // colors from the tokens, shared by all scenes
function palette() {
  const cs = getComputedStyle(root), v = n => cs.getPropertyValue("--" + n).trim();
  P = { fg: v("fg"), logo: HUES.map(v), fx: parseFloat(v("fx")) || 1 };
}
let input = 0; // last pointer, scroll or key input anywhere
let waveN = 0;
let noGL = false; // WebGL failed once (none, blocked, shaders not compiled): canvas 2D from then on
// Test hooks, also handy in the console (window.DSM_BG): frames the page layer painted, WebGL or not, waves running
const stats = { frames: 0, gl: false, waves: 0 };

// The scene keeps its box and puts the right canvas into it: WebGL (every dot computed on the GPU, sharp at the device
// resolution), canvas 2D wherever WebGL fails.
function scene(box, main) {
  const S = { w: 0, h: 0, dpr: 1, t: 0, now: 0, P: null, k: 1, sy: 0, lens: { x: 0, y: 0, a: 0 }, waves: [] };
  const ptr = { x: 0, y: 0, on: false, at: 0 }; // where the lens wants to go
  let canvas = null, kind = "", c = null, R = null, lost = false;
  let spec = null, st = null, raf = 0, last = 0, later = 0;

  const still = () => reduced.matches;
  // The page layer pauses under a modal dialog (Radix sets pointer-events: none on <body>)
  const paused = () => main && document.body.style.pointerEvents === "none";
  const busy = now => !main || S.waves.length > 0 || S.lens.a > .01 || (ptr.on && now - ptr.at < 6000);

  // a WebGL context goes at once instead of waiting for the garbage collector (browsers allow only a few)
  function lose() { const x = kind === "gl" && R && R.gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); }
  // A canvas of the wanted kind; false = no WebGL here
  function surface(gl) {
    const want = gl ? "gl" : "2d";
    if (kind === want) return true;
    const next = document.createElement("canvas");
    let res = null;
    if (gl) {
      const ctx = next.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
      res = ctx && dotsGL.setup(ctx);
      if (!res) { noGL = true; log("Background", "no WebGL – Punkte drawn with canvas 2D"); return false; }
      next.addEventListener("webglcontextlost", e => { e.preventDefault(); lost = true; });
      next.addEventListener("webglcontextrestored", () => {
        R = dotsGL.setup(ctx); lost = !R;
        if (R && spec === dotsGL && S.w) st = spec.init(S, R);
        api.draw();
      });
    }
    if (canvas) { lose(); canvas.remove(); }
    R = res; c = gl ? null : next.getContext("2d");
    canvas = next; kind = want; lost = false; S.w = 0; // sized anew
    box.append(canvas);
    return true;
  }

  // Canvas as large as its box (page: 100vh = the tall viewport on the phone, no new start when the toolbar moves).
  // WebGL at the full device resolution; canvas 2D lighter on the page (fine shapes at low alpha), sharp in the preview.
  function fit(fresh) {
    const w = box.clientWidth, h = box.clientHeight;
    if (!canvas || !w || !h || (!fresh && w === S.w && h <= S.h)) return false;
    S.dpr = Math.min(window.devicePixelRatio || 1, kind === "gl" ? 3 : main ? 1.25 : 2);
    S.w = w; S.h = h;
    canvas.width = Math.round(w * S.dpr); canvas.height = Math.round(h * S.dpr);
    if (spec) st = spec.init(S, R);
    return true;
  }

  function paint(now) {
    const dt = Math.min(now - last || 16, 100);
    last = now; S.now = now;
    // Preview without a pointer inside: the lens wanders by itself, so the effect shows before anyone tries it
    if (!main && !ptr.on) { ptr.x = S.w * (.5 + .34 * Math.sin(now / 2300)); ptr.y = S.h * (.5 + .3 * Math.sin(now / 1700)); ptr.at = now; }
    const L = S.lens, on = (ptr.on || !main) && now - ptr.at < 6000 && !still(); // a resting mouse: the lens fades after 6 s
    if (still()) { S.waves.length = 0; L.a = 0; } else {
      S.t += dt;
      if (L.a < .01 && on) { L.x = ptr.x; L.y = ptr.y; }
      const f = Math.min(1, dt / 90);
      L.x += (ptr.x - L.x) * f; L.y += (ptr.y - L.y) * f;
      L.a += ((on ? 1 : 0) - L.a) * Math.min(1, dt / 260);
      if (L.a < .01 && !on) L.a = 0;
      while (S.waves.length && now - S.waves[0].t0 >= WAVE.life) S.waves.shift();
    }
    S.sy = main ? window.scrollY || 0 : 0;
    if (kind === "gl") { if (!lost) spec.draw(R, S, st); } else {
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
      c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); c.globalAlpha = 1;
      spec.draw(c, S, st);
    }
    if (main) { stats.frames++; stats.waves = S.waves.length; }
  }

  function frame(now) {
    raf = 0;
    if (!spec || !S.w || still() || document.hidden || paused()) return;
    const moving = busy(now);
    // the pointer at the display rate (at most 60 fps; canvas 2D: 30), drifting at 20, 10 after 30 s without input
    const gap = moving ? (kind === "gl" ? 15 : 33) : now - input > IDLE ? 100 : 50;
    if (now - last >= gap - 4) paint(now);
    raf = requestAnimationFrame(frame);
  }

  const api = {
    // one frame now, then the loop if anything moves
    draw() { if (spec && S.w && P) { paint(performance.now()); api.wake(); } },
    wake() { if (!raf) raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(later); },
    destroy() { api.stop(); lose(); if (canvas) canvas.remove(); canvas = null; kind = ""; },
    // (again after a theme switch: new colors)
    set() {
      const gl = !noGL && surface(true);
      if (!gl) surface(false);
      const next = gl ? dotsGL : dots, fresh = next !== spec;
      S.k = P ? P.fx : 1; S.P = P; spec = next;
      if (main) stats.gl = gl;
      if (!S.w) fit(true); else if (fresh) st = spec.init(S, R);
      // under the settings dialog: one frame once the dialog has settled (each one recomputes the blur above it)
      clearTimeout(later);
      if (paused()) later = setTimeout(api.draw, 150); else api.draw();
    },
    resize() { if (fit(false)) api.draw(); },
    move(x, y, on) { ptr.x = x; ptr.y = y; ptr.on = on; ptr.at = performance.now(); if (on && !still()) api.wake(); },
    tap(x, y) {
      if (still() || paused()) return;
      S.waves.push({ x, y, t0: performance.now(), c: waveN++ % HUES.length });
      if (S.waves.length > WAVE.max) S.waves.shift();
      api.wake();
    },
  };
  return api;
}

// ---------- The page layer ----------
let layer = null, page = null;
const previews = new Set();
const active = () => pref.on && root.dataset.contrast !== "high";

function mount() {
  if (!active()) {
    if (layer) { listen(false); page.destroy(); layer.remove(); layer = page = null; }
    delete root.dataset.bg;
    stats.gl = false;
    return;
  }
  if (!P) palette();
  if (!layer) {
    layer = document.createElement("div"); layer.id = "bg"; layer.setAttribute("aria-hidden", "true");
    document.body.prepend(layer);
    page = scene(layer, true);
    listen(true);
  }
  page.set();
  layer.dataset.bg = root.dataset.bg = "dots";
}

// New colors after a theme switch; contrast and motion decide whether and how it runs at all
function restyle() {
  if (!pref.on) return;
  palette();
  mount();
  for (const s of previews) s.set();
}

// Input, only while the layer is there (off = no listeners at all). A click meant for something – a book, a button,
// a field, a link – starts no wave: only one on free space does. Nor one that began under a dialog: a click beside an
// open book closes it, and by the time it arrives the dialog may already be gone.
const QUIET = "a, button, input, select, textarea, label, summary, [role], [tabindex], [contenteditable]";
const modal = () => document.body.style.pointerEvents === "none" || !!document.querySelector('[role="dialog"], [role="alertdialog"]');
let downFree = false; // the last press began on the page itself, no dialog open
const touched = () => { input = performance.now(); if (page) page.wake(); };
const onMove = e => { touched(); if (page) page.move(e.clientX, e.clientY, true); };
const onDown = e => { downFree = !modal(); onMove(e); };
const onClick = e => {
  const free = downFree;
  downFree = false;
  if (page && free && !modal() && !(e.target.closest && e.target.closest(QUIET))) page.tap(e.clientX, e.clientY);
};
// Mouse and pen: the lens follows while the pointer is over the window; finger: only while it touches
const onLift = e => { if (page && e.pointerType === "touch") page.move(e.clientX, e.clientY, false); };
const onOut = e => { if (page && !e.relatedTarget) page.move(e.clientX, e.clientY, false); };
const onResize = () => { if (page) page.resize(); };
const onVisible = () => { if (page) page.wake(); previews.forEach(s => s.wake()); };
let dialogs = null; // a dialog closes (Radix gives <body> its pointer events back): the layer runs again
function listen(on) {
  const m = on ? "addEventListener" : "removeEventListener", o = { passive: true };
  for (const [type, fn] of [["scroll", touched], ["keydown", touched], ["pointermove", onMove],
    ["pointerup", onLift], ["pointercancel", onLift], ["click", onClick], ["resize", onResize]]) window[m](type, fn, o);
  // capture: seen before the dialog's own listener closes it on this very press
  window[m]("pointerdown", onDown, { passive: true, capture: true });
  document[m]("pointerout", onOut);
  document[m]("visibilitychange", onVisible);
  if (dialogs) { dialogs.disconnect(); dialogs = null; }
  if (on) (dialogs = new MutationObserver(() => page && page.wake())).observe(document.body, { attributes: true, attributeFilter: ["style"] });
}

let started = false;
export function startBackground() {
  if (started) return;
  started = true;
  window.DSM_BG = stats;
  new MutationObserver(restyle).observe(root, { attributes: true, attributeFilter: ["data-theme", "data-contrast", "data-motion"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", restyle);
  systemReduced.addEventListener("change", restyle);
  input = performance.now();
  mount();
}

// ---------- Settings section ----------
// Live preview: the same scene at the page's scale; it answers the pointer inside it
function Preview() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const box = ref.current, s = scene(box, false);
    previews.add(s);
    if (!P) palette();
    s.set();
    const ro = new ResizeObserver(() => s.resize());
    ro.observe(box);
    const at = e => { const r = box.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const move = e => { input = performance.now(); s.move(...at(e), true); };
    const down = e => { move(e); s.tap(...at(e)); };
    const leave = e => s.move(...at(e), false);
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerdown", down);
    box.addEventListener("pointerleave", leave);
    box.addEventListener("pointercancel", leave);
    return () => { ro.disconnect(); s.destroy(); previews.delete(s); };
  }, []);
  return <div ref={ref} id="bg-preview" className="bgprev" aria-hidden="true" />;
}

export function BackgroundSettings() {
  const { t } = useLanguage();
  const p = useBackground();
  const a = useAppearance();
  const on = p.on && !a.contrast;
  return (
    <Section title={t("bgTitle")}>
      <Option
        id="s-bg" title={t("bgShow")} help={t(a.contrast ? "bgContrast" : "bgShowH")}
        checked={on} disabled={a.contrast} onCheckedChange={setBackground}
      />
      <div id="s-bgpick" className="bgpick grid pt-1.5" hidden={!on}>
        {on ? <Preview /> : null}
      </div>
    </Section>
  );
}
