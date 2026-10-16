/* Läuft im <head> vor dem ersten Zeichnen (index.html, admin.html), ohne React:
   Theme, Schrift, Kontrast und Sprache sofort setzen (kein Aufblitzen), Platzhalter für Empfehlungen und
   Info-Karte vorbereiten, Lichtband des Logos beenden, sobald das sichtbare Bild geladen ist.
   React (assets/bibliothek.js bzw. verwaltung.js) übernimmt danach dieselben Werte. */
(function () {
  "use strict";
  var root = document.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  var theme = get("dsm-theme");
  if (theme === "light" || theme === "dark") root.setAttribute("data-theme", theme);
  if (get("dsm-font") === "large") root.setAttribute("data-font", "large");
  if (get("dsm-contrast") === "high") root.setAttribute("data-contrast", "high");
  var lang = get("dsm-lang");
  root.lang = lang === "it" || lang === "de" ? lang : (/^it\b/i.test(navigator.language || "") ? "it" : "de");
  // Empfehlungen gewählt? Dann steht beim Laden ein Platzhalter an ihrer Stelle
  try { var e = JSON.parse(get("dsm-empf") || "null"); if (e && e.want && e.gruppe) root.setAttribute("data-empf", ""); } catch (err) { /* */ }
  // Info-Karte beim letzten Besuch gezeigt? Dann Platzhalter, bis die Seite sie zeichnet
  if (get("dsm-info-karte") === "1") root.setAttribute("data-info", "");
  // Logo (.ld-bild) im festen HTML, bevor React startet; unsichtbare Bilder (andere Farbwelt) zählen nicht
  function bildDa(ev) {
    var img = ev.target, box = img.tagName === "IMG" && img.closest(".ld-bild");
    if (box && img.getClientRects().length) box.classList.add("da");
  }
  document.addEventListener("load", bildDa, true);
  document.addEventListener("error", bildDa, true);
})();
