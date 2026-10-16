/* Darstellung: Theme (auto/hell/dunkel), größere Schrift, hoher Kontrast. Als Attribute an <html>,
   die Farben wechseln in styles.css. Beim Laden setzt schon kopf.js die Attribute (kein Aufblitzen). */
import { useSyncExternalStore } from "react";

import { store, log } from "@/lib/speicher";

const root = document.documentElement;
let prefs = { theme: store.get("dsm-theme") || "auto", font: store.get("dsm-font") === "large", contrast: store.get("dsm-contrast") === "high" };
const hoerer = new Set();

function anwenden() {
  if (prefs.theme === "light" || prefs.theme === "dark") root.dataset.theme = prefs.theme; else delete root.dataset.theme;
  if (prefs.font) root.dataset.font = "large"; else delete root.dataset.font;
  if (prefs.contrast) root.dataset.contrast = "high"; else delete root.dataset.contrast;
}

export function setPref(k, v) {
  prefs = { ...prefs, [k]: v };
  if (k === "theme") store.set("dsm-theme", v);
  if (k === "font") store.set("dsm-font", v ? "large" : "normal");
  if (k === "contrast") store.set("dsm-contrast", v ? "high" : "normal");
  log("Einstellung", `${{ theme: "Darstellung", font: "Größere Schrift", contrast: "Hoher Kontrast" }[k]}: ${v === true ? "an" : v === false ? "aus" : v}`);
  anwenden();
  hoerer.forEach(fn => fn());
}

const abo = fn => { hoerer.add(fn); return () => hoerer.delete(fn); };
export const useDarstellung = () => useSyncExternalStore(abo, () => prefs);
