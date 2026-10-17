/* Darstellung: Theme (auto/hell/dunkel), größere Schrift, hoher Kontrast. Als Attribute an <html>,
   die Farben wechseln in styles.css. Beim Laden setzt schon kopf.js die Attribute (kein Aufblitzen). */
import { useSyncExternalStore } from "react";

import { store, log } from "@/lib/speicher";

const root = document.documentElement;
let prefs = { theme: store.get("dsm-theme") || "auto", font: store.get("dsm-font") === "large", contrast: store.get("dsm-contrast") === "high" };
const hoerer = new Set();
const dunkelMq = matchMedia("(prefers-color-scheme: dark)");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const dunkel = p => p.theme === "dark" || (p.theme === "auto" && dunkelMq.matches);

function anwenden() {
  if (prefs.theme === "light" || prefs.theme === "dark") root.dataset.theme = prefs.theme; else delete root.dataset.theme;
  if (prefs.font) root.dataset.font = "large"; else delete root.dataset.font;
  if (prefs.contrast) root.dataset.contrast = "high"; else delete root.dataset.contrast;
}

// Farbwechsel als ein Überblenden des ganzen Bildes (View Transition, nur Compositor): Neue Farben werden einmal
// berechnet. Früher animierte body color/background – das hieß Stil aller ~17.000 Elemente in jedem Frame neu.
// Ablauf: Markierung bzw. Schalter reagieren sofort (React) und gleiten erst zu Ende (--t-fast), dann wird die ganze
// Seite in einem Stück überblendet. Sonst stünde die Wahl schon in neuen Farben auf der alten Seite (harter Block)
// oder ihre alte Stellung bliebe als Geisterbild stehen. Das Logo der neuen Farbwelt (dunkel: loading="lazy", noch nie
// geladen) wird vorher geladen, damit es im neuen Bild nicht fehlt und danach hineinspringt.
// Ohne API (Firefox < 144, Safari < 18) oder bei reduzierter Bewegung: sofort.
const GLEITEN = 150;
const warte = ms => new Promise(r => setTimeout(r, ms));
let lauf = 0;

function logosLaden() {
  const bilder = [...document.querySelectorAll(".logo img")];
  bilder.forEach(b => { b.loading = "eager"; });
  return Promise.all(bilder.map(b => b.decode().catch(() => {})));
}

async function farbwechsel() {
  if (!document.startViewTransition || still.matches) return anwenden();
  const nr = ++lauf;
  await Promise.all([warte(GLEITEN), Promise.race([logosLaden(), warte(400)])]);
  if (nr === lauf) document.startViewTransition(anwenden); // schnell hintereinander geklickt: nur der letzte Wechsel
}

export function setPref(k, v) {
  const neu = { ...prefs, [k]: v };
  if (k === "theme") store.set("dsm-theme", v);
  if (k === "font") store.set("dsm-font", v ? "large" : "normal");
  if (k === "contrast") store.set("dsm-contrast", v ? "high" : "normal");
  log("Einstellung", `${{ theme: "Darstellung", font: "Größere Schrift", contrast: "Hoher Kontrast" }[k]}: ${v === true ? "an" : v === false ? "aus" : v}`);
  const farbe = k === "contrast" || (k === "theme" && dunkel(neu) !== dunkel(prefs));
  prefs = neu;
  hoerer.forEach(fn => fn());
  if (farbe) farbwechsel(); else anwenden();
}

const abo = fn => { hoerer.add(fn); return () => hoerer.delete(fn); };
export const useDarstellung = () => useSyncExternalStore(abo, () => prefs);
