/* Gemeinsam für index.html und admin.html:
   Sprache (DE/IT), Einstellungen (Theme, größere Schrift, hoher Kontrast), Glas-Fenster, Hinweise. */
(function () {
  "use strict";
  const root = document.documentElement;
  const log = window.DSM_LOG || function () {}; // assets/protokoll.js
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* privat/gesperrt */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } },
  };

  // Einstellungen sofort anwenden (Skript steht im <head>, daher kein Aufblitzen)
  const prefs = { theme: store.get("dsm-theme") || "auto", font: store.get("dsm-font") === "large", contrast: store.get("dsm-contrast") === "high" };
  function applyPrefs() {
    if (prefs.theme === "light" || prefs.theme === "dark") root.dataset.theme = prefs.theme; else delete root.dataset.theme;
    if (prefs.font) root.dataset.font = "large"; else delete root.dataset.font;
    if (prefs.contrast) root.dataset.contrast = "high"; else delete root.dataset.contrast;
  }
  applyPrefs();
  // Empfehlungen gewählt? Dann zeigt index.html beim Laden einen Platzhalter an ihrer Stelle (app.js ersetzt ihn)
  try { const e = JSON.parse(store.get("dsm-empf") || "null"); if (e && e.want && e.gruppe) root.dataset.empf = ""; } catch (e) { /* */ }

  // Sprache: gespeicherte Wahl, sonst Browsersprache
  const savedLang = store.get("dsm-lang");
  let lang = savedLang === "it" || savedLang === "de" ? savedLang : (/^it\b/i.test(navigator.language || "") ? "it" : "de");
  root.lang = lang;

  const listeners = [];
  const COMMON = {
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
  let strings = COMMON;

  function t(key, vars) {
    let s = (strings[lang] && strings[lang][key]) ?? strings.de[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
    return s;
  }
  function apply() {
    root.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll("[data-i18n-label]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nLabel)); });
    document.querySelectorAll(".seg [data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    if (strings[lang].pageTitle) document.title = t("pageTitle");
    listeners.forEach(fn => fn(lang));
  }

  // ---------- Glas-Fenster: Öffnen/Schließen mit Animation ----------
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  function openSheet(d) {
    if (d.open) return;
    d.classList.remove("closing");
    d.showModal();
  }
  function closeSheet(d, value) {
    if (!d.open || d.classList.contains("closing")) return;
    if (reduce.matches) { d.close(value); return; }
    d.classList.add("closing");
    // Dauer aus dem CSS, damit kurze Ausblendungen (Buch-Detail) nicht nachhängen
    const ms = parseFloat(getComputedStyle(d).animationDuration) * 1000 || 210;
    setTimeout(() => { d.classList.remove("closing"); d.close(value); }, ms + 10);
  }
  function wireSheet(d) {
    d.addEventListener("cancel", e => { e.preventDefault(); closeSheet(d, "cancel"); });
    d.addEventListener("click", e => { if (e.target === d) closeSheet(d, "backdrop"); });
    d.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeSheet(d, "x")));
  }

  // ---------- Hinweis unten ----------
  let toastEl = null, toastT = 0;
  function toast(msg) {
    log("Hinweis", msg);
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add("show"));
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("show"), 3600);
  }

  // ---------- Einstellungen ----------
  const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const extras = [];
  let sDlg = null;
  function buildSettings() {
    sDlg = document.createElement("dialog");
    sDlg.className = "sheet glass settings";
    sDlg.setAttribute("aria-labelledby", "s-title");
    sDlg.innerHTML = `<div class="grab" aria-hidden="true"></div>
      <button type="button" class="icon-btn close" data-close data-i18n-label="close">${ICON_X}</button>
      <div class="pane">
        <h3 id="s-title" data-i18n="sTitle"></h3>
        <section>
          <h4 data-i18n="sLook"></h4>
          <div class="seg3" role="radiogroup" id="s-theme">
            <button type="button" role="radio" data-v="auto" data-i18n="sAuto"></button>
            <button type="button" role="radio" data-v="light" data-i18n="sLight"></button>
            <button type="button" role="radio" data-v="dark" data-i18n="sDark"></button>
          </div>
        </section>
        <section>
          <h4 data-i18n="sA11y"></h4>
          <label class="opt"><span><b data-i18n="sFont"></b><small data-i18n="sFontH"></small></span><input type="checkbox" role="switch" class="switch" id="s-font"></label>
          <label class="opt"><span><b data-i18n="sContrast"></b><small data-i18n="sContrastH"></small></span><input type="checkbox" role="switch" class="switch" id="s-contrast"></label>
        </section>
        <div id="s-extra"></div>
      </div>`;
    document.body.appendChild(sDlg);
    wireSheet(sDlg);
    const seg = sDlg.querySelector("#s-theme");
    seg.addEventListener("click", e => {
      const b = e.target.closest("button[data-v]"); if (!b) return;
      prefs.theme = b.dataset.v; store.set("dsm-theme", prefs.theme); applyPrefs(); syncSettings();
    });
    sDlg.querySelector("#s-font").addEventListener("change", e => { prefs.font = e.target.checked; store.set("dsm-font", prefs.font ? "large" : "normal"); applyPrefs(); });
    sDlg.querySelector("#s-contrast").addEventListener("change", e => { prefs.contrast = e.target.checked; store.set("dsm-contrast", prefs.contrast ? "high" : "normal"); applyPrefs(); });
  }
  function syncSettings() {
    if (!sDlg) return;
    const seg = sDlg.querySelector("#s-theme"), order = ["auto", "light", "dark"];
    seg.style.setProperty("--i", order.indexOf(prefs.theme));
    seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", String(b.dataset.v === prefs.theme)));
    sDlg.querySelector("#s-font").checked = prefs.font;
    sDlg.querySelector("#s-contrast").checked = prefs.contrast;
    const box = sDlg.querySelector("#s-extra");
    box.innerHTML = "";
    extras.forEach(fn => fn(box));
  }
  function openSettings() { syncSettings(); openSheet(sDlg); }

  window.DSM = {
    store, log,
    get lang() { return lang; },
    t,
    nf: n => new Intl.NumberFormat(lang === "it" ? "it-IT" : "de-DE").format(n),
    df: iso => {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
      if (!m) return iso || "";
      return lang === "it" ? `${m[3]}/${m[2]}/${m[1]}` : `${m[3]}.${m[2]}.${m[1]}`;
    },
    // Kann mehrfach aufgerufen werden (Admin: erst Sperrseite, nach dem Entsperren die Verwaltung)
    init(dict) {
      strings = { de: Object.assign({}, strings.de, dict.de), it: Object.assign({}, strings.it, dict.it) };
      if (!sDlg) {
        buildSettings();
        document.querySelectorAll(".seg [data-lang]").forEach(b => b.addEventListener("click", () => {
          if (lang === b.dataset.lang) return;
          lang = b.dataset.lang; store.set("dsm-lang", lang); apply(); if (sDlg.open) syncSettings();
        }));
        document.querySelectorAll(".settings-btn").forEach(b => b.addEventListener("click", openSettings));
      }
      apply();
    },
    onLang(fn) { listeners.push(fn); },
    addSettingsSection(fn) { extras.push(fn); },
    refreshSettings: syncSettings,
    openSheet, closeSheet, wireSheet, toast,
    ICON_X,
  };
})();
