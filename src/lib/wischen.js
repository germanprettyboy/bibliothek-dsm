/* Handy-Sheet zum Wischen (Buch-Detail): fliegt von unten ein, steht halbhoch, nach oben wischen = Vollbild,
   nach unten wischen = schließen. Der Finger führt 1:1, beim Loslassen entscheidet die Geschwindigkeit; die Bewegung
   danach ist eine Feder (WAAPI, nur transform). Hintergrund-Schleier blendet mit dem Finger.
   Ab 40rem (mittiges Fenster) und bei reduzierter Bewegung greift nichts davon. */
import { log } from "@/lib/speicher";

const handy = matchMedia("(max-width: 39.999rem)");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const klemme = (x, a, b) => Math.min(b, Math.max(a, x));

// Feder als CSS linear(): leichtes Überschwingen (ca. 5 %), in ~24 Stützpunkten
const feder = (() => {
  if (!(window.CSS && CSS.supports && CSS.supports("animation-timing-function", "linear(0, 1)"))) return "cubic-bezier(.2, .8, .2, 1)";
  const zeta = .62, w = 2 * Math.PI * 1.6, wd = w * Math.sqrt(1 - zeta * zeta), n = 24, punkte = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n * 1.1; // 1,1 s Modellzeit auf 0..1 gestaucht
    const e = Math.exp(-zeta * w * t);
    punkte.push((1 - e * (Math.cos(wd * t) + zeta * w / wd * Math.sin(wd * t))).toFixed(4));
  }
  punkte[n] = "1";
  return `linear(${punkte.join(", ")})`;
})();

export function wischen(sheet, inner, schleierSel) {
  if (!handy.matches) return () => {};
  const schleier = () => document.querySelector(schleierSel);
  let H = 0, halb = 0, ziel = "halb", y = 0, anim = null, griff = null;

  const setY = (wert, mitSchleier = true) => {
    y = wert;
    sheet.style.transform = `translateY(${wert}px)`;
    if (!mitSchleier) return;
    const s = schleier();
    // Schleier bleibt bis zur Halbstellung voll, blendet dann mit dem Finger nach unten aus
    if (s) s.style.opacity = String(klemme(1 - (wert - halb) / Math.max(1, H - halb), 0, 1));
  };
  const messen = () => {
    H = sheet.offsetHeight;
    const inhalt = Math.ceil(inner.scrollHeight) + 14; // + Griff (4 px + 10 px Abstand)
    // sichtbare Höhe halbhoch: Inhalt, höchstens 80 % des Sheets, mindestens 40 %
    halb = H - klemme(inhalt, H * .4, H * .8);
  };
  const stelle = () => (ziel === "voll" ? 0 : halb);
  const modus = () => {
    sheet.dataset.stufe = ziel;
    inner.style.overflowY = ziel === "voll" ? "auto" : "hidden";
  };

  // Zu einer Stellung (oder Weg) animieren; v in px/ms (positiv = nach unten)
  const fahre = (zu, v = 0) => {
    const von = y, weg = zu === "zu";
    const bis = weg ? H : zu === "voll" ? 0 : halb;
    if (anim) anim.cancel();
    if (still.matches) { setY(bis); if (weg) schleier() && (schleier().style.opacity = "0"); return Promise.resolve(); }
    const s = schleier();
    const dist = Math.abs(bis - von);
    const dauer = weg ? klemme(dist / Math.max(.9, Math.abs(v)), 140, 260) : klemme(300 + dist * .35, 300, 520);
    anim = sheet.animate(
      [{ transform: `translateY(${von}px)` }, { transform: `translateY(${bis}px)` }],
      { duration: dauer, easing: weg ? "cubic-bezier(.3, 0, .8, .6)" : feder, fill: "forwards" },
    );
    const a = anim;
    if (s) s.animate([{ opacity: s.style.opacity || "1" }, { opacity: weg ? "0" : "1" }], { duration: dauer, easing: "ease-out", fill: "forwards" })
      .finished.then(() => { if (!weg) s.style.opacity = ""; }, () => {});
    return a.finished.then(() => { setY(bis, false); a.cancel(); if (anim === a) anim = null; }, () => {});
  };

  const oeffnen = () => {
    messen(); ziel = "halb"; modus();
    if (still.matches) { setY(halb); return; }
    sheet.style.transform = `translateY(${H}px)`; y = H;
    fahre("halb", 0);
  };

  // ---------- Finger ----------
  let t0 = null; // {x, y, y0, zeit, proben, nehmen}
  const start = e => {
    if (e.touches.length !== 1 || anim && ziel === "zu") return;
    if (anim) { y = new DOMMatrix(getComputedStyle(sheet).transform).m42; anim.cancel(); anim = null; setY(y); }
    const f = e.touches[0], oben = sheet.getBoundingClientRect().top;
    t0 = { x: f.clientX, y: f.clientY, y0: y, proben: [[performance.now(), f.clientY]], nehmen: null, kopf: f.clientY - oben < 64 };
  };
  const bewege = e => {
    if (!t0) return;
    const f = e.touches[0], dy = f.clientY - t0.y, dx = f.clientX - t0.x;
    if (t0.nehmen === null) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      // Senkrechte Absicht? Im Vollbild blättert nach oben / bei gescrolltem Inhalt der Inhalt selbst
      const senkrecht = Math.abs(dy) > Math.abs(dx);
      const inhaltScrollt = ziel === "voll" && !t0.kopf && (dy < 0 || inner.scrollTop > 0);
      t0.nehmen = senkrecht && !inhaltScrollt;
      if (t0.nehmen) { sheet.classList.add("zieht"); log("Wischen", "Detail: Finger führt"); }
    }
    if (!t0.nehmen) return;
    if (e.cancelable) e.preventDefault();
    let ny = t0.y0 + dy;
    if (ny < 0) ny = ny * .25; // über Vollbild hinaus: zäh
    setY(ny);
    const jetzt = performance.now();
    t0.proben.push([jetzt, f.clientY]);
    while (t0.proben.length > 2 && jetzt - t0.proben[0][0] > 100) t0.proben.shift();
  };
  const ende = () => {
    const g = t0; t0 = null;
    sheet.classList.remove("zieht");
    if (!g || !g.nehmen) return;
    const [z0, p0] = g.proben[0], [z1, p1] = g.proben[g.proben.length - 1];
    const v = z1 > z0 ? (p1 - p0) / (z1 - z0) : 0; // px/ms
    const prognose = y + v * 220;
    // nächste Stellung zur Prognose: Vollbild, halb, Schließen (Schließen erst deutlich unter halb)
    const stellen = [["voll", 0], ["halb", halb], ["zu", halb + (H - halb) * .55]];
    let wahl = "halb", best = Infinity;
    for (const [n, p] of stellen) { const d = Math.abs(prognose - p); if (d < best) { best = d; wahl = n; } }
    if (v < -.45) wahl = "voll";                        // schneller Wisch nach oben
    else if (v > .6) wahl = ziel === "voll" && y < halb * .5 ? "halb" : "zu"; // schnell nach unten: aus dem Vollbild erst halb
    log("Wischen", `Detail: ${wahl} (v ${v.toFixed(2)} px/ms)`);
    if (wahl === "zu") { ziel = "zu"; fahre("zu", v).then(() => sheet.dispatchEvent(new CustomEvent("wisch-zu"))); return; }
    ziel = wahl; modus();
    fahre(wahl, v);
  };

  const ro = new ResizeObserver(() => {
    if (t0 || anim || ziel === "zu") return;
    messen(); setY(stelle(), false);
  });
  ro.observe(inner);
  addEventListener("resize", neu);
  function neu() { if (!t0 && !anim && ziel !== "zu") { messen(); setY(stelle(), false); } }

  sheet.addEventListener("touchstart", start, { passive: true });
  sheet.addEventListener("touchmove", bewege, { passive: false });
  sheet.addEventListener("touchend", ende);
  sheet.addEventListener("touchcancel", ende);
  oeffnen();

  return () => {
    ro.disconnect();
    removeEventListener("resize", neu);
    sheet.removeEventListener("touchstart", start);
    sheet.removeEventListener("touchmove", bewege);
    sheet.removeEventListener("touchend", ende);
    sheet.removeEventListener("touchcancel", ende);
    if (anim) anim.cancel();
    sheet.style.transform = ""; sheet.classList.remove("zieht"); delete sheet.dataset.stufe;
    inner.style.overflowY = "";
    const s = schleier(); if (s) s.style.opacity = "";
  };
}
