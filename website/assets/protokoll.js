/*
 * Protokoll: dokumentiert jede Interaktion fortlaufend und formatiert in der Browser-Konsole.
 * Steht im <head> vor common.js, damit auch frühe Ereignisse erfasst werden.
 *
 * Automatisch erfasst: Klicks (Maus, Tastatur, Skript), Eingaben (entprellt), Schalter, Auswahl,
 * Dateien, besondere Tasten, Formulare, Fenster (<dialog>) auf/zu, Scrollen, Fenstergröße,
 * Sichtbarkeit, Netzabfragen (fetch) und fremde Bilder, Schreibzugriffe auf den Browser-Speicher,
 * Fehler. Seiten-Skripte ergänzen mit DSM_LOG("Bereich", "Text", {daten}).
 *
 * Konsole: DSM_LOG.verlauf() Tabelle der Sitzung · DSM_LOG.alsText() zum Kopieren
 *          DSM_LOG.aus() abschalten (bleibt gespeichert) · DSM_LOG.an() einschalten
 * Passwörter und Schlüssel werden nie mitgeschrieben.
 */
(function () {
  "use strict";
  const SP = Storage.prototype, origSet = SP.setItem, origGet = SP.getItem, origDel = SP.removeItem;
  const KEY = "dsm-protokoll", HIST = "dsm-protokoll-verlauf", MAX = 500;
  const STILL = new Set([KEY, HIST, "dsm-cover-v3"]); // eigene Schlüssel und Cover-Cache (zu häufig)
  const GEHEIM = /key|pass|pw|token/i;
  // s = Speicher oder sein Name ("localStorage"); schon der Zugriff auf window.localStorage kann im privaten Modus werfen
  const read = (s, k) => { try { return origGet.call(typeof s === "string" ? window[s] : s, k); } catch (e) { return null; } };
  const write = (s, k, v) => { try { origSet.call(typeof s === "string" ? window[s] : s, k, v); } catch (e) { /* privat/gesperrt */ } };

  let on = read("localStorage", KEY) !== "aus";

  // ---------- Ausgabe ----------
  const MONO = "font-family:ui-monospace,Menlo,Consolas,monospace";
  const SANS = "font-family:'Fira Sans',system-ui,sans-serif";
  const S = {
    zeit: `color:#8a8a8a;${MONO}`,
    badge: `padding:1px 6px;border-radius:3px;font-weight:600;${MONO}`,
    text: SANS,
    key: `color:#8a8a8a;${MONO}`,
    code: `background:rgba(128,128,128,.18);padding:1px 4px;border-radius:3px;${MONO}`,
  };
  // Logofarben als Hintergrund, Anthrazit als Schrift (in heller und dunkler Konsole lesbar)
  const FARBE = {
    Seite: ["#333333", "#fff"], Klick: ["#B5C9D0", "#333"], Taste: ["#B5C9D0", "#333"],
    Eingabe: ["#DDD300", "#333"], Suche: ["#DDD300", "#333"], Auswahl: ["#B3CEA1", "#333"],
    Formular: ["#B3CEA1", "#333"], Datei: ["#B3CEA1", "#333"], Fenster: ["#BA8EA7", "#333"],
    Hinweis: ["#BA8EA7", "#333"], Empfehlung: ["#BA8EA7", "#333"], Scrollen: ["#e2e2e2", "#333"],
    Netz: ["#DB9F00", "#333"], Bild: ["#DB9F00", "#333"], Cover: ["#DB9F00", "#333"],
    Speicher: ["#e2e2e2", "#333"], Sperre: ["#333333", "#fff"], Fehler: ["#A93A39", "#fff"],
  };
  const BREITE = 10;
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  const uhr = d => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  const dauer = ms => ms < 1000 ? Math.round(ms) + " ms" : ms < 60000 ? (ms / 1000).toFixed(1).replace(".", ",") + " s"
    : Math.floor(ms / 60000) + " min " + Math.round(ms % 60000 / 1000) + " s";
  const kurz = (s, n = 60) => { s = String(s ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
  const groesse = n => n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1).replace(".", ",") + " kB" : (n / 1048576).toFixed(1).replace(".", ",") + " MB";

  const seite = location.pathname.split("/").pop() || "index.html";
  let hist = [];
  try { hist = JSON.parse(read("sessionStorage", HIST) || "[]") || []; } catch (e) { hist = []; }
  const frueher = hist.length;
  let saveT = 0, last = performance.now();

  function details(daten) {
    if (daten && typeof daten === "object" && !Array.isArray(daten) && !(daten instanceof Error)) {
      const keys = Object.keys(daten).filter(k => daten[k] !== undefined && daten[k] !== "");
      const w = Math.max(0, ...keys.map(k => k.length));
      keys.forEach(k => console.log(`%c${k.padEnd(w)}%c`, S.key, "", daten[k]));
    } else console.log(daten);
  }

  function log(bereich, text, daten) {
    const now = performance.now(), d = new Date();
    const e = { zeit: uhr(d), seite, bereich, text: String(text) };
    hist.push(e); if (hist.length > MAX) hist.splice(0, hist.length - MAX);
    clearTimeout(saveT);
    saveT = setTimeout(() => write("sessionStorage", HIST, JSON.stringify(hist)), 800);
    const abstand = "+" + dauer(now - last);
    last = now;
    if (!on) return;
    const f = FARBE[bereich] || ["#333333", "#fff"];
    const kopf = [`%c${e.zeit} %c${abstand.padStart(9)} %c${bereich.padEnd(BREITE)}%c ${e.text}`,
      S.zeit, S.zeit, `background:${f[0]};color:${f[1]};${S.badge}`, S.text];
    const hat = daten !== undefined && daten !== null && (typeof daten !== "object" || Object.keys(daten).length || daten instanceof Error);
    if (hat) { console.groupCollapsed(...kopf); details(daten); console.groupEnd(); }
    else console.log(...kopf);
  }

  log.an = () => { on = true; write("localStorage", KEY, "an"); log("Seite", "Protokoll eingeschaltet"); };
  log.aus = () => { log("Seite", "Protokoll abgeschaltet – DSM_LOG.an() schaltet es wieder ein"); on = false; write("localStorage", KEY, "aus"); };
  log.verlauf = () => { console.table(hist.map(e => ({ Zeit: e.zeit, Seite: e.seite, Bereich: e.bereich, Text: e.text }))); return hist.length + " Einträge"; };
  log.alsText = () => hist.map(e => `${e.zeit}  ${e.seite.padEnd(10)}  ${e.bereich.padEnd(BREITE)}  ${e.text}`).join("\n");
  log.leeren = () => { hist = []; write("sessionStorage", HIST, "[]"); return "Verlauf geleert"; };
  window.DSM_LOG = log;

  // ---------- Elemente beschreiben ----------
  const txt = el => kurz(el && (el.innerText || el.textContent), 70);
  function art(el) {
    const role = el.getAttribute("role");
    if (el.tagName === "INPUT") {
      if (el.type === "checkbox") return role === "switch" ? "Schalter" : "Kästchen";
      return ({ radio: "Option", search: "Suchfeld", password: "Passwortfeld", file: "Dateiauswahl", submit: "Knopf", button: "Knopf",
        date: "Datumsfeld", time: "Zeitfeld", number: "Zahlenfeld" })[el.type] || "Feld";
    }
    if (el.tagName === "A") return el.hasAttribute("download") ? "Download" : "Link";
    if (role === "radio") return "Option";
    if (role === "switch") return "Schalter";
    if (role === "tab") return "Reiter";
    return ({ BUTTON: "Knopf", SELECT: "Auswahl", TEXTAREA: "Textfeld", SUMMARY: "Aufklapper", LABEL: "Beschriftung", DIALOG: "Fenster" })[el.tagName] || "Element";
  }
  function name(el) {
    const al = el.getAttribute("aria-label");
    if (al) return kurz(al);
    if (el.labels && el.labels.length) { const l = el.labels[0]; return txt(l.querySelector("b, strong") || l); }
    if (el.tagName === "A" && el.download) return el.download;
    // Knöpfe mit Titelzeile (Liste, Empfehlungen, Auswahl): nur die Titelzeile
    const kopf = /^(BUTTON|A)$/.test(el.tagName) && el.querySelector("b, strong, .t");
    return txt(kopf) || txt(el) || el.getAttribute("title") || el.placeholder || (el.id ? "#" + el.id : "") || el.tagName.toLowerCase();
  }
  function fensterName(d) {
    const id = d.getAttribute("aria-labelledby"), h = id && document.getElementById(id);
    return txt(h) || d.getAttribute("aria-label") || (d.id ? "#" + d.id : "Fenster");
  }
  const ORTE = [["header", "Kopf"], [".bar", "Suchleiste"], ["#recs", "Empfehlungen"], ["#info", "Öffnungszeiten"],
    ["main.books", "Liste"], ["footer", "Fuß"]];
  function ort(el) {
    const d = el.closest("dialog");
    if (d) return "Fenster „" + fensterName(d) + "“";
    for (const [sel, n] of ORTE) if (el.closest(sel)) return n;
    // sonst der nächste Abschnitt mit Überschrift (Verwaltung), ersatzweise dessen id
    for (let s = el.parentElement && el.parentElement.closest("section, fieldset, form, [id]"); s && s !== document.body; s = s.parentElement && s.parentElement.closest("section, fieldset, form, [id]")) {
      const h = s.querySelector("h1, h2, h3, legend");
      if (h && txt(h)) return "Bereich „" + txt(h) + "“";
      if (s.id) return "#" + s.id;
    }
    return "";
  }
  const wer = el => `${art(el)} „${name(el)}“`;
  const wo = el => { const o = ort(el); return o ? " · " + o : ""; };

  // ---------- Klicks ----------
  const KLICKBAR = "a, button, input, select, textarea, summary, label, [role=button], [role=radio], [role=switch], [role=tab], [tabindex]";
  document.addEventListener("click", e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.tagName === "DIALOG") { log("Klick", `neben das Fenster „${fensterName(t)}“`); return; }
    const el = t.closest(KLICKBAR);
    if (!el) return;
    if (el.tagName === "LABEL" && el.control) return;                                  // folgt als Klick/Änderung am Feld
    if (el.tagName === "INPUT" && /^(checkbox|radio|file)$/.test(el.type)) return;      // wird als Änderung erfasst
    if (el.tagName === "INPUT" && !/^(submit|button|reset|image)$/.test(el.type)) return; // Fokus ins Feld, keine Aktion
    const wie = !e.isTrusted ? " (per Skript)" : e.detail === 0 ? " (Tastatur)" : "";
    const ziel = el.tagName === "A" && !el.hasAttribute("download") && el.getAttribute("href") ? { Ziel: el.getAttribute("href") } : undefined;
    log(el.matches("a[download]") ? "Datei" : "Klick", wer(el) + wo(el) + wie, ziel);
  }, true);

  // ---------- Eingaben ----------
  const TEXT = /^(text|search|email|url|tel|number|password|date|time|datetime-local|month|week)$/;
  const inputT = new WeakMap();
  document.addEventListener("input", e => {
    const el = e.target;
    if (!(el instanceof Element) || el.closest("[data-protokoll=eigen]")) return;
    const isText = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && TEXT.test(el.type)) || el.isContentEditable;
    if (!isText) return;
    clearTimeout(inputT.get(el));
    inputT.set(el, setTimeout(() => {
      if (el.type === "password") { log("Eingabe", `${wer(el)}${wo(el)}: Inhalt wird nicht protokolliert`); return; }
      const v = el.isContentEditable ? el.textContent : el.value;
      log("Eingabe", `${wer(el)}${wo(el)} = „${kurz(v, 60)}“`, v.length > 60 ? { Länge: v.length + " Zeichen" } : undefined);
    }, 600));
  }, true);

  document.addEventListener("change", e => {
    const el = e.target;
    if (!(el instanceof Element) || el.closest("[data-protokoll=eigen]")) return;
    if (el.type === "checkbox") log("Auswahl", `${wer(el)}${wo(el)}: ${el.checked ? "an" : "aus"}`);
    else if (el.type === "radio") { if (el.checked) log("Auswahl", `${wer(el)}${wo(el)} gewählt`); }
    else if (el.tagName === "SELECT") log("Auswahl", `${wer(el)}${wo(el)} = „${kurz([...el.selectedOptions].map(o => o.text).join(", "))}“`);
    else if (el.type === "file") dateien("gewählt", el.files, wer(el));
  }, true);

  function dateien(wie, files, quelle) {
    const fs = [...(files || [])];
    if (!fs.length) { log("Datei", `keine Datei ${wie}`); return; }
    log("Datei", `${fs.map(f => `„${f.name}“ (${groesse(f.size)})`).join(", ")} ${wie}${quelle ? " · " + quelle : ""}`,
      fs.length === 1 ? { Typ: fs[0].type || "unbekannt", Geändert: new Date(fs[0].lastModified).toLocaleString("de-DE") } : undefined);
  }
  document.addEventListener("drop", e => { if (e.dataTransfer) dateien("hineingezogen", e.dataTransfer.files, ort(e.target instanceof Element ? e.target : document.body)); }, true);

  document.addEventListener("submit", e => {
    const f = e.target;
    log("Formular", `„${f.getAttribute("aria-label") || f.id || "Formular"}“ abgeschickt`);
  }, true);

  // ---------- Tasten ----------
  document.addEventListener("keydown", e => {
    if (e.repeat || /^(Shift|Control|Alt|Meta|CapsLock)$/.test(e.key)) return;
    const el = e.target instanceof Element ? e.target : document.body;
    const kombi = e.ctrlKey || e.metaKey || e.altKey;
    const feld = el.closest("input, textarea, [contenteditable]");
    if (!kombi && e.key !== "Escape" && !(e.key === "Enter" && feld && el.tagName !== "TEXTAREA")) return;
    const k = [e.ctrlKey && "Strg", e.metaKey && "Cmd", e.altKey && "Alt", e.shiftKey && kombi && "Umschalt", e.key.length === 1 ? e.key.toUpperCase() : e.key].filter(Boolean).join("+");
    log("Taste", k + (el !== document.body ? " · " + wer(el) + wo(el) : ""));
  }, true);

  // ---------- Fenster ----------
  const GRUND = { x: "Schließen-Knopf", backdrop: "Klick daneben", cancel: "Escape", done: "Auswahl getroffen", no: "abgelehnt" };
  if (window.HTMLDialogElement) {
    const P = HTMLDialogElement.prototype;
    ["showModal", "show"].forEach(m => {
      const orig = P[m];
      P[m] = function () { const r = orig.apply(this, arguments); log("Fenster", `geöffnet: „${fensterName(this)}“`); return r; };
    });
    document.addEventListener("close", e => {
      const d = e.target;
      if (d instanceof HTMLDialogElement) log("Fenster", `geschlossen: „${fensterName(d)}“` + (d.returnValue ? ` (${GRUND[d.returnValue] || d.returnValue})` : ""));
    }, true);
  }

  // ---------- Scrollen, Größe, Sichtbarkeit, Navigation ----------
  let scrollT = 0, scrollVon = null;
  addEventListener("scroll", () => {
    if (scrollVon === null) scrollVon = scrollY;
    clearTimeout(scrollT);
    scrollT = setTimeout(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const d = Math.round(scrollY - scrollVon);
      scrollVon = null;
      if (Math.abs(d) < 8) return;
      log("Scrollen", `${d > 0 ? "nach unten" : "nach oben"} um ${Math.abs(d)} px · jetzt bei ${max > 0 ? Math.round(scrollY / max * 100) : 0} %`);
    }, 500);
  }, { passive: true, capture: true });

  let resizeT = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => log("Seite", `Fenstergröße ${innerWidth} × ${innerHeight}`), 500);
  });
  let hidden0 = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hidden0 = performance.now(); log("Seite", "in den Hintergrund (Tab gewechselt oder minimiert)"); }
    else log("Seite", `wieder sichtbar nach ${dauer(performance.now() - hidden0)}`);
  });
  addEventListener("hashchange", () => log("Seite", `Sprungmarke ${location.hash || "(keine)"}`));
  addEventListener("online", () => log("Netz", "Verbindung wieder da"));
  addEventListener("offline", () => log("Netz", "Verbindung verloren"));
  addEventListener("pagehide", () => { log("Seite", `verlassen nach ${dauer(performance.now())}`); write("sessionStorage", HIST, JSON.stringify(hist)); });
  const dunkel = matchMedia("(prefers-color-scheme: dark)");
  if (dunkel.addEventListener) dunkel.addEventListener("change", m => log("Seite", `Gerät auf ${m.matches ? "dunkel" : "hell"} umgestellt`));

  // ---------- Fehler ----------
  addEventListener("error", e => {
    const el = e.target;
    if (el && el !== window && el instanceof Element) { log("Fehler", `${el.tagName.toLowerCase()} nicht geladen: ${kurz(el.currentSrc || el.src || el.href, 90)}`); return; }
    log("Fehler", kurz(e.message, 120), { Datei: e.filename && `${e.filename}:${e.lineno}:${e.colno}`, Fehler: e.error });
  }, true);
  addEventListener("unhandledrejection", e => log("Fehler", "Promise abgelehnt: " + kurz(e.reason && (e.reason.message || e.reason), 120), { Grund: e.reason }));

  // ---------- Netz ----------
  function ziel(url) {
    try {
      const u = new URL(url, location.href), p = u.searchParams;
      let extra = "";
      if (p.has("bibkeys")) extra = ` · ${p.get("bibkeys").split(",").length} ISBN`;
      else if (p.has("q")) extra = ` · ${kurz(p.get("q"), 40)}`;
      return (u.origin === location.origin ? "" : u.host) + u.pathname + extra;
    } catch (e) { return kurz(url, 80); }
  }
  if (window.fetch) {
    const origFetch = window.fetch;
    window.fetch = function (input, init) {
      const url = typeof input === "string" ? input : (input && input.url) || String(input);
      const t0 = performance.now();
      return origFetch.apply(this, arguments).then(r => {
        log("Netz", `${r.status}${r.ok ? "" : " " + (r.statusText || "Fehler")} ${ziel(url)} · ${dauer(performance.now() - t0)}`, { Adresse: url });
        return r;
      }, err => {
        const grund = err && err.name === "AbortError" ? "abgebrochen (Zeitlimit)" : "nicht erreichbar (offline, gesperrt oder CORS)";
        log("Netz", `${grund}: ${ziel(url)} · ${dauer(performance.now() - t0)}`, { Adresse: url, Fehler: err });
        throw err;
      });
    };
  }
  // Fremde Bilder (Cover) über Resource Timing, ohne die Lade-Logik anzufassen
  if (window.PerformanceObserver) {
    try {
      new PerformanceObserver(list => list.getEntries().forEach(r => {
        if (r.initiatorType !== "img" || r.name.startsWith(location.origin)) return;
        log("Bild", `${ziel(r.name)} · ${dauer(r.duration)}`, { Adresse: r.name });
      })).observe({ type: "resource", buffered: false });
    } catch (e) { /* alter Browser */ }
  }

  // ---------- Browser-Speicher ----------
  const speicherName = s => { try { return s === sessionStorage ? "Sitzung" : "Browser"; } catch (e) { return "Browser"; } };
  function wert(k, v) {
    if (GEHEIM.test(k)) return "(verdeckt)";
    v = String(v);
    return v.length > 120 ? `(${groesse(v.length)})` : "„" + v + "“";
  }
  SP.setItem = function (k, v) {
    const vorher = STILL.has(k) ? null : read(this, k);
    const r = origSet.call(this, k, v);
    if (!STILL.has(k) && vorher !== String(v)) log("Speicher", `${speicherName(this)}: ${k} = ${wert(k, v)}`);
    return r;
  };
  SP.removeItem = function (k) {
    const da = !STILL.has(k) && read(this, k) !== null;
    const r = origDel.call(this, k);
    if (da) log("Speicher", `${speicherName(this)}: ${k} gelöscht`);
    return r;
  };

  // ---------- Start ----------
  if (on) {
    console.log("%cBibliothek DSM%c  Protokoll aller Interaktionen",
      `font-size:16px;font-weight:600;${SANS};border-left:4px solid #BA8EA7;padding:2px 0 2px 8px`, `color:#8a8a8a;${SANS}`);
    console.log("%cDSM_LOG.verlauf()%c Tabelle  %cDSM_LOG.alsText()%c zum Kopieren  %cDSM_LOG.aus()%c abschalten",
      S.code, "", S.code, "", S.code, "");
  }
  {
    // Sofort, vor allen anderen Einträgen; Einstellungen direkt aus dem Speicher (common.js läuft erst danach)
    const L = k => read("localStorage", k), coarse = matchMedia("(pointer: coarse)").matches;
    const conn = navigator.connection, lang = L("dsm-lang");
    log("Seite", `${seite} geöffnet` + (frueher ? ` · ${frueher} frühere Einträge dieser Sitzung (DSM_LOG.verlauf())` : ""), {
      Adresse: location.href,
      Sprache: lang === "de" || lang === "it" ? lang : (/^it\b/i.test(navigator.language || "") ? "it" : "de") + " (vom Browser)",
      Darstellung: (({ light: "hell", dark: "dunkel" })[L("dsm-theme")] || "automatisch") + " · Gerät " + (dunkel.matches ? "dunkel" : "hell"),
      Schrift: L("dsm-font") === "large" ? "groß" : "normal",
      Kontrast: L("dsm-contrast") === "high" ? "hoch" : "normal",
      Fenster: `${innerWidth} × ${innerHeight} · Pixeldichte ${devicePixelRatio}`,
      Bedienung: coarse ? "Touch" : "Maus/Trackpad",
      Bewegung: matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduziert" : "normal",
      Verbindung: conn ? [conn.effectiveType, conn.saveData && "Datensparen"].filter(Boolean).join(" · ") : undefined,
      Herkunft: document.referrer || undefined,
      Browser: navigator.userAgent,
    });
  }
  addEventListener("load", () => log("Seite", `fertig geladen nach ${dauer(performance.now())}`));
})();
