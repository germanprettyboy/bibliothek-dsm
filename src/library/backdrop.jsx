/* Interactive backgrounds (settings "Hintergrund"): two abstract scenes behind the book list (library/scenes.js), off by
   default (`dsm-bg`). Tweakable in the settings: scene, color, strength, tempo, density – with a live preview that
   answers the pointer like the page does.
   Layer #bg (fixed, z-index -1, aria-hidden, no pointer events): in front of the body color, behind everything else.
   Under the content column the mask in styles.css lets only --fx-col of it through (the list stays readable), the
   search bar is transparent until it sticks. Pointer, clicks/taps and scrolling are read on window.
   Frames: 30 fps while the pointer moves or a wave runs, otherwise 20, 10 after 30 s without any input; none in a hidden
   tab, none with tempo 0 while nothing moves, none under a modal dialog (its blur would be recomputed on every frame –
   a change in the settings paints one frame). Reduced motion (system or setting): one still frame, no pointer.
   High contrast, print: none. Colors only from the tokens in styles.css, read again on every theme change.
   Test hooks: #bg[data-bg], <html data-bg>, #s-bg, #s-bgpick, #s-bgscene [data-v], #s-bgcolor [data-c], #s-bgk, #s-bgt,
   #s-bgd, #bg-reset, #bg-preview. */
import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { Section, Option } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAppearance } from "@/lib/appearance";
import { reduced, systemReduced } from "@/lib/environment";
import { addStrings, useLanguage } from "@/lib/language";
import { store, log } from "@/lib/storage";
import { dots, lines, HUES, WAVE } from "@/library/scenes";

addStrings({
  de: {
    bgTitle: "Hintergrund", bgShow: "Bewegter Hintergrund", bgShowH: "Abstrakt – folgt Zeiger, Klick und Fingertipp",
    bgContrast: "Bei hohem Kontrast ausgeschaltet", bgScene: "Motiv", bg_dots: "Punkte", bg_lines: "Linien",
    bgColor: "Farbe", bgc_all: "Alle Logofarben", bgc_mauve: "Mauve", bgc_red: "Rot", bgc_orange: "Orange", bgc_yellow: "Gelb",
    bgc_green: "Grün", bgc_blue: "Blau",
    bgK: "Stärke", bgT: "Tempo", bgD: "Dichte", bgStill: "Steht still (Keine Animationen)", bgReset: "Zurücksetzen",
  },
  it: {
    bgTitle: "Sfondo", bgShow: "Sfondo animato", bgShowH: "Astratto – segue puntatore, clic e tocco",
    bgContrast: "Disattivato con contrasto elevato", bgScene: "Motivo", bg_dots: "Punti", bg_lines: "Linee",
    bgColor: "Colore", bgc_all: "Tutti i colori del logo", bgc_mauve: "Malva", bgc_red: "Rosso", bgc_orange: "Arancione",
    bgc_yellow: "Giallo", bgc_green: "Verde", bgc_blue: "Blu",
    bgK: "Intensità", bgT: "Velocità", bgD: "Densità", bgStill: "Resta fermo (Nessuna animazione)", bgReset: "Ripristina",
  },
});

const root = document.documentElement;
const SCENES = { dots, lines };
export const IDS = Object.keys(SCENES);
const COLORS = ["all", ...HUES];
const IDLE = 30000; // without any input for so long: 10 fps

// ---------- Choice (localStorage dsm-bg) ----------
// k = strength, t = tempo, d = density, each 0..100 (50 = as designed)
const KEY = "dsm-bg";
const TWEAKS = { color: "all", k: 50, t: 50, d: 50 };
const num = (v, def) => (typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : def);
function load() {
  const s = store.json(KEY) || {};
  // ids of the backgrounds until 2026-10-25 (aurora, milan …) no longer exist: the first scene
  return { on: !!s.on, id: IDS.includes(s.id) ? s.id : IDS[0], color: COLORS.includes(s.color) ? s.color : "all",
    k: num(s.k, 50), t: num(s.t, 50), d: num(s.d, 50) };
}
let pref = load();
const listeners = new Set();
let logTimer = 0;

export function setBackground(next) {
  const before = pref;
  pref = { ...pref, ...next };
  store.set(KEY, JSON.stringify(pref));
  if (pref.on !== before.on || pref.id !== before.id) log("Setting", `Background: ${pref.on ? pref.id : "off"}`);
  else { clearTimeout(logTimer); logTimer = setTimeout(() => log("Setting", `Background ${pref.id}: ${pref.color}, strength ${pref.k}, tempo ${pref.t}, density ${pref.d}`), 600); }
  listeners.forEach(fn => fn());
  mount();
}
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const useBackground = () => React.useSyncExternalStore(subscribe, () => pref);

// ---------- Engine: one scene per canvas (the page layer, the preview in the settings) ----------
let P = null; // colors from the tokens, shared by all scenes
function palette() {
  const cs = getComputedStyle(root), v = n => cs.getPropertyValue("--" + n).trim();
  P = { fg: v("fg"), logo: HUES.map(v), fx: parseFloat(v("fx")) || 1 };
}
let input = 0; // last pointer, scroll or key input anywhere
let waveN = 0;

function scene(canvas, main) {
  const c = canvas.getContext("2d");
  const S = { w: 0, h: 0, t: 0, now: 0, P: null, k: 1, d: .5, hue: -1, sy: 0, lens: { x: 0, y: 0, a: 0 }, waves: [] };
  const ptr = { x: 0, y: 0, on: false, at: 0 }; // where the lens wants to go
  let spec = null, st = null, id = "", dens = -1, speed = 1, dpr = 1, raf = 0, last = 0, later = 0;

  const still = () => reduced.matches;
  // The page layer pauses under a modal dialog (Radix sets pointer-events: none on <body>)
  const paused = () => main && document.body.style.pointerEvents === "none";
  const busy = now => !main || S.waves.length > 0 || S.lens.a > .01 || (ptr.on && now - ptr.at < 6000);

  function paint(now) {
    const dt = Math.min(now - last || 16, 100);
    last = now; S.now = now; S.P = P;
    // Preview without a pointer inside: the lens wanders by itself, so the effect shows before anyone tries it
    if (!main && !ptr.on) { ptr.x = S.w * (.5 + .34 * Math.sin(now / 2300)); ptr.y = S.h * (.5 + .3 * Math.sin(now / 1700)); ptr.at = now; }
    const L = S.lens, on = (ptr.on || !main) && now - ptr.at < 6000 && !still(); // a resting mouse: the lens fades after 6 s
    if (still()) { S.waves.length = 0; L.a = 0; } else {
      S.t += dt * speed;
      if (L.a < .01 && on) { L.x = ptr.x; L.y = ptr.y; }
      const f = Math.min(1, dt / 90);
      L.x += (ptr.x - L.x) * f; L.y += (ptr.y - L.y) * f;
      L.a += ((on ? 1 : 0) - L.a) * Math.min(1, dt / 260);
      if (L.a < .01 && !on) L.a = 0;
      S.waves = S.waves.filter(w => now - w.t0 < WAVE.life);
    }
    S.sy = main ? window.scrollY || 0 : 0;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1;
    spec.draw(c, S, st);
  }

  function frame(now) {
    raf = 0;
    if (!spec || !S.w || still() || document.hidden || paused()) return;
    const moving = busy(now);
    // tempo 0 and nothing under the pointer: the picture only changes when something happens (wake)
    if (!speed && !moving && S.sy === (main ? window.scrollY || 0 : 0)) return;
    const gap = moving ? 33 : now - input > IDLE ? 100 : 50;
    if (now - last >= gap - 4) paint(now);
    raf = requestAnimationFrame(frame);
  }

  const api = {
    // one frame now, then the loop if anything moves
    draw() { if (spec && S.w && P) { paint(performance.now()); api.wake(); } },
    wake() { if (!raf) raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(later); },
    set(p) {
      const d = p.d / 100;
      speed = 2 * p.t / 100; S.k = (.35 + 1.3 * p.k / 100) * (P ? P.fx : 1); S.d = d; S.hue = p.color === "all" ? -1 : HUES.indexOf(p.color);
      if (p.id !== id || d !== dens) { id = p.id; dens = d; spec = SCENES[id]; if (S.w) st = spec.init(S); }
      // under the settings dialog: one frame once the slider rests (each one recomputes the blur above it)
      clearTimeout(later);
      if (paused()) later = setTimeout(api.draw, 150); else api.draw();
    },
    // re-inits only when the width changes or the height grows (the phone toolbar moving changes nothing)
    size(w, h, fresh) {
      if (!w || !h || (!fresh && w === S.w && h <= S.h)) return;
      // the page layer lighter (fine lines at low alpha need no full retina resolution), the small preview sharp
      dpr = Math.min(window.devicePixelRatio || 1, main ? 1.25 : 2);
      S.w = w; S.h = h;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      if (spec) st = spec.init(S);
      api.draw();
    },
    move(x, y, on) { ptr.x = x; ptr.y = y; ptr.on = on; ptr.at = performance.now(); if (on && !still()) api.wake(); },
    tap(x, y) {
      if (still() || paused()) return;
      api.move(x, y, ptr.on);
      S.waves.push({ x, y, t0: performance.now(), c: S.hue >= 0 ? S.hue : waveN++ % HUES.length });
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
    if (layer) { page.stop(); layer.remove(); layer = page = null; }
    delete root.dataset.bg;
    return;
  }
  if (!P) palette();
  if (!layer) {
    layer = document.createElement("div"); layer.id = "bg"; layer.setAttribute("aria-hidden", "true");
    const canvas = document.createElement("canvas");
    layer.append(canvas); document.body.prepend(layer);
    page = scene(canvas, true);
    page.set(pref);
    page.size(layer.clientWidth, layer.clientHeight, true);
  } else page.set(pref);
  layer.dataset.bg = root.dataset.bg = pref.id;
}

// New colors after a theme switch; contrast and motion decide whether and how it runs at all
function restyle() {
  palette();
  mount();
  for (const s of previews) s.set(pref);
}

let started = false;
export function startBackground() {
  if (started) return;
  started = true;
  new MutationObserver(restyle).observe(root, { attributes: true, attributeFilter: ["data-theme", "data-contrast", "data-motion"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", restyle);
  systemReduced.addEventListener("change", restyle);
  // a dialog closes: the layer runs again
  new MutationObserver(() => page && page.wake()).observe(document.body, { attributes: true, attributeFilter: ["style"] });
  document.addEventListener("visibilitychange", () => { if (page) page.wake(); previews.forEach(s => s.wake()); });
  addEventListener("resize", () => layer && page.size(layer.clientWidth, layer.clientHeight), { passive: true });
  input = performance.now();
  const touched = () => { input = performance.now(); if (page) page.wake(); };
  addEventListener("scroll", touched, { passive: true });
  addEventListener("keydown", touched, { passive: true });
  // Mouse and pen: the lens follows while the pointer is over the window; finger: only while it touches
  addEventListener("pointermove", e => { touched(); if (page) page.move(e.clientX, e.clientY, true); }, { passive: true });
  addEventListener("pointerdown", e => { touched(); if (page) { page.move(e.clientX, e.clientY, true); page.tap(e.clientX, e.clientY); } }, { passive: true });
  const lift = e => { if (page && e.pointerType === "touch") page.move(e.clientX, e.clientY, false); };
  addEventListener("pointerup", lift, { passive: true });
  addEventListener("pointercancel", lift, { passive: true }); // the finger scrolls the page
  document.addEventListener("pointerout", e => { if (!e.relatedTarget && page) page.move(e.clientX, e.clientY, false); });
  mount();
}

// ---------- Settings section ----------
// Live preview: the same scene with the same tweaks, at the page's scale; it answers the pointer inside it
function Preview({ p }) {
  const ref = React.useRef(null);
  const sc = React.useRef(null);
  React.useEffect(() => {
    const canvas = ref.current, s = scene(canvas, false);
    sc.current = s; previews.add(s);
    if (!P) palette();
    s.set(pref);
    const ro = new ResizeObserver(() => s.size(canvas.clientWidth, canvas.clientHeight));
    ro.observe(canvas);
    const at = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const move = e => { input = performance.now(); s.move(...at(e), true); };
    const down = e => { move(e); s.tap(...at(e)); };
    const leave = e => s.move(...at(e), false);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("pointercancel", leave);
    return () => { ro.disconnect(); s.stop(); previews.delete(s); };
  }, []);
  React.useEffect(() => { if (sc.current) sc.current.set(p); }, [p]);
  return <div className="bgprev"><canvas ref={ref} id="bg-preview" aria-hidden="true" /></div>;
}

function Slider({ id, label, value, disabled, note, onChange }) {
  return (
    <label htmlFor={id} className="bgrow">
      <span className="grid">
        <span className="font-medium">{label}</span>
        {note ? <small className="text-s text-muted-foreground">{note}</small> : null}
      </span>
      <input
        id={id} type="range" min="0" max="100" step="1" className="bgrange" style={{ "--p": value + "%" }}
        value={value} disabled={disabled} onInput={e => onChange(+e.currentTarget.value)}
      />
    </label>
  );
}

const onSystem = fn => { systemReduced.addEventListener("change", fn); return () => systemReduced.removeEventListener("change", fn); };

export function BackgroundSettings() {
  const { t } = useLanguage();
  const p = useBackground();
  const a = useAppearance();
  const still = React.useSyncExternalStore(onSystem, () => systemReduced.matches) || a.motion;
  const on = p.on && !a.contrast;
  const tweaked = Object.keys(TWEAKS).some(k => p[k] !== TWEAKS[k]);
  return (
    <Section title={t("bgTitle")}>
      <Option
        id="s-bg" title={t("bgShow")} help={t(a.contrast ? "bgContrast" : "bgShowH")}
        checked={on} disabled={a.contrast} onCheckedChange={v => setBackground({ on: v })}
      />
      <div id="s-bgpick" className="bgpick grid gap-2 pt-1.5" hidden={!on}>
        {on ? <Preview p={p} /> : null}
        <ToggleGroup
          type="single" id="s-bgscene" aria-label={t("bgScene")} className="seg3 mt-1 grid-cols-2" style={{ "--i": IDS.indexOf(p.id), "--n": 2 }}
          value={p.id} onValueChange={v => v && setBackground({ id: v })}
        >
          {IDS.map(id => <ToggleGroupItem key={id} value={id} data-v={id}>{t("bg_" + id)}</ToggleGroupItem>)}
        </ToggleGroup>
        <RadioGroupPrimitive.Root id="s-bgcolor" className="bgsw" aria-label={t("bgColor")} value={p.color} onValueChange={c => c && setBackground({ color: c })}>
          {COLORS.map(c => (
            <RadioGroupPrimitive.Item key={c} value={c} data-c={c} aria-label={t("bgc_" + c)} title={t("bgc_" + c)}>
              <i style={c === "all" ? undefined : { background: `var(--${c})` }} />
            </RadioGroupPrimitive.Item>
          ))}
        </RadioGroupPrimitive.Root>
        <div className="grid">
          <Slider id="s-bgk" label={t("bgK")} value={p.k} onChange={k => setBackground({ k })} />
          <Slider id="s-bgt" label={t("bgT")} value={p.t} disabled={still} note={still ? t("bgStill") : null} onChange={v => setBackground({ t: v })} />
          <Slider id="s-bgd" label={t("bgD")} value={p.d} onChange={d => setBackground({ d })} />
        </div>
        <Button id="bg-reset" variant="ghost" className="justify-self-end text-s" disabled={!tweaked} onClick={() => setBackground(TWEAKS)}>
          {t("bgReset")}
        </Button>
      </div>
    </Section>
  );
}
