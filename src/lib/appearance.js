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

function apply() {
  if (prefs.theme === "light" || prefs.theme === "dark") root.dataset.theme = prefs.theme; else delete root.dataset.theme;
  if (prefs.font) root.dataset.font = "large"; else delete root.dataset.font;
  if (prefs.contrast) root.dataset.contrast = "high"; else delete root.dataset.contrast;
}

// Color switch as one cross-fade of the whole picture (View Transition, compositor only): new colors are computed
// once. Previously body color/background was animated – that meant restyling all ~17,000 elements in every frame.
// Sequence: the marker or switch reacts immediately (React) and finishes gliding first (--t-fast), then the whole
// page is cross-faded in one piece. Otherwise the control would already stand in the new colors on the old page (hard
// block) or its old position would linger as a ghost. The logo of the new color scheme (dark: loading="lazy", never
// loaded yet) is loaded beforehand so it isn't missing from the new picture and doesn't pop in afterwards.
// Without the API (Firefox < 144, Safari < 18) or with reduced motion: immediately.
const GLIDE = 150;
const wait = ms => new Promise(r => setTimeout(r, ms));
let run = 0;

function loadLogos() {
  const imgs = [...document.querySelectorAll(".logo img")];
  imgs.forEach(b => { b.loading = "eager"; });
  return Promise.all(imgs.map(b => b.decode().catch(() => {})));
}

// Component transitions (buttons, toggles, bar border …) must not start on the color change: they would run
// hidden under the cross-fade, but on the main thread (color is not compositable): restyle + paint in every frame,
// 300–700 ms frames at 4× CPU. The rule is in the DOM only from the switch until the cross-fade has finished
// (nothing computed changes on removal, so nothing starts then either).
const still = document.createElement("style");
still.textContent = "*, *::before, *::after { transition: none !important; }";

async function colorSwitch() {
  if (!document.startViewTransition || reduced.matches) return apply();
  const nr = ++run;
  await Promise.all([wait(GLIDE), Promise.race([loadLogos(), wait(400)])]);
  if (nr !== run) return; // clicked in quick succession: only the last switch
  const vt = document.startViewTransition(() => { document.head.append(still); apply(); });
  // Removal restyles the whole page once: only when the picture stands still, not in the last frames of the fade
  vt.finished.catch(() => {}).then(() => wait(300)).then(() => { if (nr === run) still.remove(); });
}

export function setPref(k, v) {
  const next = { ...prefs, [k]: v };
  if (k === "theme") store.set("dsm-theme", v);
  if (k === "font") store.set("dsm-font", v ? "large" : "normal");
  if (k === "contrast") store.set("dsm-contrast", v ? "high" : "normal");
  log("Setting", `${{ theme: "Theme", font: "Larger text", contrast: "High contrast" }[k]}: ${v === true ? "on" : v === false ? "off" : v}`);
  const color = k === "contrast" || (k === "theme" && isDark(next) !== isDark(prefs));
  prefs = next;
  listeners.forEach(fn => fn());
  if (color) colorSwitch(); else apply();
}

const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const useAppearance = () => useSyncExternalStore(subscribe, () => prefs);
