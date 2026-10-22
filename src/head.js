/* Runs in <head> before the first paint (index.html, admin.html), without React:
   sets theme, font size, contrast and language immediately (no flash), prepares placeholders for recommendations and
   the info card, ends the logo's shimmer as soon as the visible image has loaded.
   React (assets/library.js or admin.js) then takes over the same values. */
(function () {
  "use strict";
  var root = document.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  // One-time migration of the German-named keys (until October 2026): carry over the visitor's choices, drop the rest
  try {
    var GROUPS = { mittelstufe: "middle", oberstufe: "upper", "erw-roman": "adult-fiction", "erw-sach": "adult-nonfiction", "erw-bio": "adult-bio" };
    var old = get("dsm-empf");
    if (old !== null) {
      var o = JSON.parse(old);
      if (o && get("dsm-recs") === null) localStorage.setItem("dsm-recs", JSON.stringify({ want: !!o.want, group: GROUPS[o.gruppe] || null }));
      localStorage.removeItem("dsm-empf");
    }
    if (get("dsm-info-karte") !== null) { localStorage.setItem("dsm-info-card", get("dsm-info-karte")); localStorage.removeItem("dsm-info-karte"); }
    ["dsm-empf-entwurf", "dsm-info-entwurf", "dsm-vorschau", "dsm-vorschau-empf", "dsm-vorschau-info"].forEach(function (k) { localStorage.removeItem(k); });
  } catch (err) { /* */ }
  var theme = get("dsm-theme");
  if (theme === "light" || theme === "dark") {
    root.setAttribute("data-theme", theme);
    // Browser bar (iPhone status bar) in the chosen scheme, not the device's; own media kept for lib/appearance.js
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      var own = metas[i].getAttribute("media") || "";
      metas[i].setAttribute("data-media", own);
      metas[i].setAttribute("media", /dark/.test(own) === (theme === "dark") ? "all" : "not all");
    }
  }
  if (get("dsm-font") === "large") root.setAttribute("data-font", "large");
  if (get("dsm-contrast") === "high") root.setAttribute("data-contrast", "high");
  var lang = get("dsm-lang");
  root.lang = lang === "it" || lang === "de" ? lang : (/^it\b/i.test(navigator.language || "") ? "it" : "de");
  // Recommendations chosen? Then a placeholder stands in their place while loading
  try { var r = JSON.parse(get("dsm-recs") || "null"); if (r && r.want && r.group) root.setAttribute("data-recs", ""); } catch (err) { /* */ }
  // Info card shown on the last visit? Then a placeholder until the page draws it
  if (get("dsm-info-card") === "1") root.setAttribute("data-info", "");
  // Delete old flags of the former performance measurement (disabling blur): blur is always on
  try { localStorage.removeItem("dsm-blur"); sessionStorage.removeItem("dsm-blur"); } catch (err) { /* */ }
  // Logo (.ld-img) in the static HTML before React starts; invisible images (other color scheme) don't count
  function imgLoaded(ev) {
    var img = ev.target, box = img.tagName === "IMG" && img.closest(".ld-img");
    if (box && img.getClientRects().length) box.classList.add("loaded");
  }
  document.addEventListener("load", imgLoaded, true);
  document.addEventListener("error", imgLoaded, true);
})();
