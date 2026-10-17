/* Unschärfe nach Leistung: Beim Öffnen jedes Fensters die Bildabstände der Animation messen (requestAnimationFrame).
   Ruckelt es zweimal hintereinander, eine Stufe weniger Unschärfe (voll → wenig → aus, styles.css :root[data-blur]).
   Zweimal, weil das erste Öffnen oft nur wegen Shader-Aufwärmen ruckelt. Die Stufe steht in localStorage dsm-blur
   ({stufe, t}); kopf.js setzt sie beim nächsten Laden vor dem ersten Zeichnen, nach 14 Tagen wird neu gemessen. */
import { store, log } from "@/lib/speicher";
import { still } from "@/lib/umwelt";

const STUFEN = ["voll", "wenig", "aus"];
const DAUER = 400;      // ms: Fenster-Animationen dauern 110–250 ms, danach ruht die Seite
const LANG = 28;        // ms: Bildabstand darüber = sichtbares Ruckeln (unter ~35 Bildern/s)
const root = document.documentElement;
let schlecht = 0, laeuft = false;

const stufe = () => root.dataset.blur || "voll";

export function blurMessen() {
  if (laeuft || still.matches || document.hidden || stufe() === "aus") return;
  laeuft = true;
  const iv = [];
  let t0 = 0, last = 0, n = 0;
  const schritt = now => {
    // Die ersten zwei Bilder baut React das Fenster auf (Hauptthread) – das misst nicht die Unschärfe
    if (n++ === 0) t0 = now; else if (n > 3) iv.push(now - last);
    last = now;
    if (now - t0 < DAUER) requestAnimationFrame(schritt); else auswerten(iv);
  };
  requestAnimationFrame(schritt);
}

function auswerten(iv) {
  laeuft = false;
  // Tab im Hintergrund oder Fenster gleich wieder zu: nichts schließen
  if (document.hidden || iv.length < 4 || iv.some(x => x > 500)) return;
  const lang = iv.filter(x => x > LANG).length, mittel = iv.reduce((s, x) => s + x, 0) / iv.length;
  if (lang < 3 && mittel <= 24) { schlecht = 0; return; }
  if (++schlecht < 2) return;
  schlecht = 0;
  const neu = STUFEN[STUFEN.indexOf(stufe()) + 1];
  root.dataset.blur = neu;
  store.set("dsm-blur", JSON.stringify({ stufe: neu, t: Date.now() }));
  log("Leistung", `Fenster-Animation ruckelt – Unschärfe jetzt „${neu}“`, { Bilder: iv.length, "über 28 ms": lang, "Schnitt": Math.round(mittel) + " ms" });
}
