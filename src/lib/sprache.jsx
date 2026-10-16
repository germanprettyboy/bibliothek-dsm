/* Sprache DE/IT: gespeicherte Wahl, sonst Browsersprache. Jede Komponente meldet ihre Texte mit woerter() an
   (beim Laden des Moduls), useSprache() liefert t() und zeichnet bei einem Wechsel neu. */
import { useSyncExternalStore } from "react";

import { store, log } from "@/lib/speicher";

const WOERTER = {
  de: {
    settings: "Einstellungen", close: "Schließen",
    sTitle: "Einstellungen", sLook: "Darstellung", sAuto: "Automatisch", sLight: "Hell", sDark: "Dunkel",
    sA11y: "Barrierefreiheit",
    sFont: "Größere Schrift", sFontH: "Vergrößert alle Texte der Seite.",
    sContrast: "Hoher Kontrast", sContrastH: "Schwarz-Weiß, kräftige Linien, keine durchscheinenden Flächen.",
  },
  it: {
    settings: "Impostazioni", close: "Chiudi",
    sTitle: "Impostazioni", sLook: "Aspetto", sAuto: "Automatico", sLight: "Chiaro", sDark: "Scuro",
    sA11y: "Accessibilità",
    sFont: "Testo più grande", sFontH: "Ingrandisce tutti i testi della pagina.",
    sContrast: "Contrasto elevato", sContrastH: "Bianco e nero, linee marcate, nessuna superficie trasparente.",
  },
};

export function woerter(dict) {
  Object.assign(WOERTER.de, dict.de);
  Object.assign(WOERTER.it, dict.it);
}

const gespeichert = store.get("dsm-lang");
let lang = gespeichert === "it" || gespeichert === "de" ? gespeichert : (/^it\b/i.test(navigator.language || "") ? "it" : "de");
const hoerer = new Set();

export function t(key, vars) {
  let s = WOERTER[lang][key] ?? WOERTER.de[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  return s;
}
export function titelSetzen() {
  document.documentElement.lang = lang;
  if (WOERTER.de.pageTitle) document.title = t("pageTitle");
}
export function setLang(l) {
  if (l === lang) return;
  lang = l;
  store.set("dsm-lang", l);
  log("Sprache", l === "it" ? "Italienisch" : "Deutsch");
  titelSetzen();
  hoerer.forEach(fn => fn());
}
export const getLang = () => lang;

// Zahlen- und Datumsformat je Sprache (Intl-Objekte nur einmal anlegen)
const NF = {};
export const nf = n => (NF[lang] || (NF[lang] = new Intl.NumberFormat(lang === "it" ? "it-IT" : "de-DE"))).format(n);
export function df(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return iso || "";
  return lang === "it" ? `${m[3]}/${m[2]}/${m[1]}` : `${m[3]}.${m[2]}.${m[1]}`;
}

const abo = fn => { hoerer.add(fn); return () => hoerer.delete(fn); };

export function useSprache() {
  const l = useSyncExternalStore(abo, getLang);
  return { lang: l, t, setLang, nf, df };
}
