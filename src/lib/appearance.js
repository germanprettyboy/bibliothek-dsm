/* Appearance: theme (auto/light/dark), larger text, high contrast. Set as attributes on <html>,
   the colors switch in styles.css. On load head.js already sets the attributes (no flash). */
import { useSyncExternalStore } from "react";

import { store, log } from "@/lib/storage";
import { reduced } from "@/lib/environment";

const root = document.documentElement;
let prefs = { theme: store.get("dsm-theme") || "auto", font: store.get("dsm-font") === "large", contrast: store.get("dsm-contrast") === "high" };
const listeners = new Set();
const darkMq = matchMedia("(prefers-color-scheme: dark)");
const isDark = p => p.theme === "dark" || (p.theme === "auto" && darkMq.matches);

let waiting = false; // a color switch is waiting for the marker glide: nothing else may apply the attributes before it

function apply() {
  waiting = false;
  if (prefs.theme === "light" || prefs.theme === "dark") root.dataset.theme = prefs.theme; else delete root.dataset.theme;
  if (prefs.font) root.dataset.font = "large"; else delete root.dataset.font;
  if (prefs.contrast) root.dataset.contrast = "high"; else delete root.dataset.contrast;
  barColor();
}

// Browser bar (iPhone status bar, Safari toolbar) in the chosen scheme, not the device's – otherwise it switches
// separately from the page. The meta tags keep their own media in data-media (head.js does the same on load).
function barColor() {
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    if (!m.dataset.media) m.dataset.media = m.getAttribute("media") || "";
    const own = m.dataset.media, dark = /dark/.test(own);
    m.setAttribute("media", prefs.theme === "auto" ? own : dark === (prefs.theme === "dark") ? "all" : "not all");
  });
}

// Color switch (theme, contrast). Two rules, the same on every path:
// 1. No component transition ever runs on a color change. `still` is in the DOM from the change until the new picture
//    stands. Otherwise every button, toggle, bar border … fades at its own speed while the rest jumps (patchy), and
//    under the cross-fade it runs hidden on the main thread (300–700 ms frames at 4× CPU). Removing the rule changes
//    no computed value, so nothing starts then either.
// 2. If possible the whole page cross-fades once as a picture (View Transition, compositor only), after the marker
//    of the theme choice has finished gliding (otherwise its old position lingers as a ghost in the old picture).
//    Without the API (Firefox < 144, Safari < 18), with reduced motion, in a hidden tab or when the device itself
//    switches light/dark (already applied, nothing to fade from): instantly, but also without transitions.
//    Not in WebKit (Safari, every browser on the iPhone): its View Transition is no single picture – on the iPhone
//    parts switched one after another and the glass lost its blur for the duration (2026-10-22, client), Playwright's
//    WebKit even hung. There all colors switch at once, in one frame, as soon as the other logo is decoded.
// Each switch takes a number; an older one that is still waiting gives up (quick clicks: only the last one counts).
const GLIDE = 150;
let run = 0;
const UA = navigator.userAgent;
const WEBKIT = /AppleWebKit/.test(UA) && !/Chrome\/|Chromium\/|Edg\//.test(UA);

// The marker of the theme choice (.seg3, transform only) keeps gliding where there is no cross-fade
const still = document.createElement("style");
still.textContent = "*, :not(.seg3)::before, *::after { transition: none !important; }";

// The rule must survive the next style computation: two frames (rAF runs before the style of its own frame)
function instant() {
  const nr = ++run;
  document.head.append(still);
  apply();
  requestAnimationFrame(() => requestAnimationFrame(() => { if (nr === run) still.remove(); }));
}

// The logo of the new scheme decoded (otherwise it pops in a moment after the colors), waiting at most GLIDE
function logosReady() {
  const all = [...document.querySelectorAll(".logo img")].map(img => (img.decode ? img.decode().catch(() => {}) : null));
  return Promise.race([Promise.all(all), new Promise(res => setTimeout(res, GLIDE))]);
}

function fade() {
  if (reduced.matches || document.hidden) return instant();
  const nr = ++run;
  waiting = true;
  loadLogos();
  if (!document.startViewTransition || WEBKIT) return void logosReady().then(() => { if (nr === run) instant(); });
  setTimeout(() => {
    if (nr !== run) return;
    let vt;
    try { vt = document.startViewTransition(() => { document.head.append(still); apply(); }); } catch { return instant(); }
    vt.finished.catch(() => {}).then(() => { if (nr === run) still.remove(); });
  }, GLIDE);
}

// The logo of the other color scheme is loading="lazy" and hidden, so it never loaded: load it before the switch
// (the settings call this on opening), otherwise it is missing from the new picture and pops in afterwards
export function loadLogos() {
  document.querySelectorAll(".logo img").forEach(b => { b.loading = "eager"; });
}

// The device switches light/dark itself (theme "auto"): the colors are already new, only keep transitions out
darkMq.addEventListener("change", () => { if (prefs.theme === "auto") instant(); });

export function setPref(k, v) {
  const next = { ...prefs, [k]: v };
  if (k === "theme") store.set("dsm-theme", v);
  if (k === "font") store.set("dsm-font", v ? "large" : "normal");
  if (k === "contrast") store.set("dsm-contrast", v ? "high" : "normal");
  log("Setting", `${{ theme: "Theme", font: "Larger text", contrast: "High contrast" }[k]}: ${v === true ? "on" : v === false ? "off" : v}`);
  const color = k === "contrast" || (k === "theme" && isDark(next) !== isDark(prefs));
  prefs = next;
  listeners.forEach(fn => fn());
  if (color) fade();
  else if (!waiting) apply(); // otherwise the waiting switch applies it in a moment
}

const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const useAppearance = () => useSyncExternalStore(subscribe, () => prefs);
