/* Daten der Bücherliste: books.js (window.DSM_BIBLIOTHEK), empfehlungen.js, info.js – oder deren Vorschau aus der
   Verwaltung (index.html#vorschau, localStorage dsm-vorschau*). books.js lädt NACH diesem Skript (groß, ≈700 KB),
   damit Kopf, Öffnungszeiten und Platzhalter vorher stehen. */
import { store } from "@/lib/speicher";

export const VORSCHAU = location.hash === "#vorschau";

export const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();
// Schlüssel der Empfehlungen: Titel + Erstautor
export const keyOf = b => norm(b.t) + "|" + norm((b.a && b.a[0]) || "");

const letterOf = t => {
  const c = String(t).replace(/^[^\p{L}\p{N}]+/u, "").normalize("NFD").charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
};

// Vorschau aus der Verwaltung, falls vorhanden und gültig
function vorschau(k, ok) {
  if (!VORSCHAU) return null;
  const p = store.json(k);
  return p && ok(p) ? p : null;
}
export const vorschauBuecher = () => vorschau("dsm-vorschau", p => Array.isArray(p.buecher));
export const vorschauEmpf = () => vorschau("dsm-vorschau-empf", p => !!p.gruppen);
export const vorschauInfo = () => vorschau("dsm-vorschau-info", p => !!p.zeiten);

// Bücher für Liste und Suche vorbereiten: laufende Nummer, Anfangsbuchstabe, Suchtext
export function vorbereiten(data) {
  const books = (data && data.buecher) || [];
  books.forEach((b, i) => {
    b._i = i;
    b._l = letterOf(b.t);
    b._s = norm([b.t, b.u, (b.a || []).join(" "), (b.i || []).join(" "), b.v].join(" "));
  });
  return books;
}

// Wartet auf books.js (klassisches Skript nach diesem). books.js setzt window.DSM_BIBLIOTHEK = …; ein Setter meldet
// das im selben Moment (DOMContentLoaded kann sich danach noch verzögern). Fehlt die Datei, bleibt die Liste leer.
export function buecherLaden(fertig) {
  const p = vorschauBuecher();
  if (p) return fertig(p);
  if (window.DSM_BIBLIOTHEK) return fertig(window.DSM_BIBLIOTHEK);
  let wert, fertigGemeldet = false;
  const los = () => { if (!fertigGemeldet) { fertigGemeldet = true; fertig(wert || null); } };
  Object.defineProperty(window, "DSM_BIBLIOTHEK", { configurable: true, enumerable: true, get: () => wert, set: v => { wert = v; los(); } });
  if (document.readyState !== "loading") los();
  else document.addEventListener("DOMContentLoaded", los, { once: true });
}
