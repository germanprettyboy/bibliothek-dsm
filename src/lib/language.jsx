/* Language DE/IT: saved choice, otherwise the browser language. Every component registers its texts with addStrings()
   (when the module loads); useLanguage() returns t() and re-renders on a switch. */
import { useSyncExternalStore } from "react";

import { store, log } from "@/lib/storage";

const STRINGS = {
  de: {
    settings: "Einstellungen", close: "Schließen",
    sTitle: "Einstellungen", sLook: "Darstellung", sAuto: "Automatisch", sLight: "Hell", sDark: "Dunkel",
    sA11y: "Barrierefreiheit",
    sFont: "Größere Schrift", sFontH: "Vergrößert alle Texte der Seite.",
    sContrast: "Hoher Kontrast", sContrastH: "Schwarz-Weiß, kräftige Linien, keine durchscheinenden Flächen.",
    sMotion: "Keine Animationen", sMotionH: "Fenster, Listen und Bilder erscheinen sofort, ohne Bewegung.",
    sMotionSys: "Ist auf diesem Gerät bereits eingestellt (weniger Bewegung).",
    sCredits: "Verwendete Open-Source-Software:",
  },
  it: {
    settings: "Impostazioni", close: "Chiudi",
    sTitle: "Impostazioni", sLook: "Aspetto", sAuto: "Automatico", sLight: "Chiaro", sDark: "Scuro",
    sA11y: "Accessibilità",
    sFont: "Testo più grande", sFontH: "Ingrandisce tutti i testi della pagina.",
    sContrast: "Contrasto elevato", sContrastH: "Bianco e nero, linee marcate, nessuna superficie trasparente.",
    sMotion: "Nessuna animazione", sMotionH: "Finestre, elenchi e immagini compaiono subito, senza movimento.",
    sMotionSys: "Già impostato su questo dispositivo (meno movimento).",
    sCredits: "Software open source utilizzato:",
  },
};

export function addStrings(dict) {
  Object.assign(STRINGS.de, dict.de);
  Object.assign(STRINGS.it, dict.it);
}

const saved = store.get("dsm-lang");
let lang = saved === "it" || saved === "de" ? saved : (/^it\b/i.test(navigator.language || "") ? "it" : "de");
const listeners = new Set();

export function t(key, vars) {
  let s = STRINGS[lang][key] ?? STRINGS.de[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  return s;
}
export function setTitle() {
  document.documentElement.lang = lang;
  if (STRINGS.de.pageTitle) document.title = t("pageTitle");
}
export function setLang(l) {
  if (l === lang) return;
  lang = l;
  store.set("dsm-lang", l);
  log("Language", l === "it" ? "Italian" : "German");
  setTitle();
  listeners.forEach(fn => fn());
}
export const getLang = () => lang;

// Number and date format per language (create the Intl objects only once)
const NF = {};
// Grouping fixed: left to the browser, Italian 4545 depends on its CLDR version ("4545" Chrome, "4.545" Safari)
export const nf = n => (NF[lang] || (NF[lang] = new Intl.NumberFormat(lang === "it" ? "it-IT" : "de-DE",
  { useGrouping: lang === "it" ? "min2" : "auto" }))).format(n);
export function df(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return iso || "";
  return lang === "it" ? `${m[3]}/${m[2]}/${m[1]}` : `${m[3]}.${m[2]}.${m[1]}`;
}

const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };

export function useLanguage() {
  const l = useSyncExternalStore(subscribe, getLang);
  return { lang: l, t, setLang, nf, df };
}
