/* Info über der Liste: Öffnungszeiten (heute geöffnet/geschlossen), Ferien und Abwesenheiten.
   Daten: info.js (window.DSM_INFO), gepflegt in admin.html. Vergangene Schließtage blenden sich selbst aus. */
(function () {
  "use strict";
  const D = window.DSM;
  const $ = s => document.querySelector(s);

  D.init({
    de: {
      infoT: "Öffnungszeiten", infoOpen: "Öffnungszeiten und Schließtage anzeigen",
      openNow: "Jetzt geöffnet", until: "bis {t}", openLater: "Heute ab {t} geöffnet", today: "Heute",
      closedNow: "Jetzt geschlossen", closedToday: "Heute geschlossen", again: "Wieder geöffnet {w}",
      wTomorrow: "morgen ab {t}", wDay: "am {w} ab {t}", wDate: "am {w}, {d}, ab {t}",
      closed: "geschlossen", ferien: "Ferien", abwesend: "Bibliothek geschlossen",
      artFerien: "Ferien", artAbw: "Abwesenheit",
      closuresT: "Ferien und Schließtage", noClosures: "Keine Schließtage geplant.",
      wd_mo: "Montag", wd_di: "Dienstag", wd_mi: "Mittwoch", wd_do: "Donnerstag", wd_fr: "Freitag", wd_sa: "Samstag", wd_so: "Sonntag",
      ws_mo: "Mo", ws_di: "Di", ws_mi: "Mi", ws_do: "Do", ws_fr: "Fr", ws_sa: "Sa", ws_so: "So",
    },
    it: {
      infoT: "Orari di apertura", infoOpen: "Mostra orari e giorni di chiusura",
      openNow: "Aperta ora", until: "fino alle {t}", openLater: "Oggi aperta dalle {t}", today: "Oggi",
      closedNow: "Chiusa ora", closedToday: "Oggi chiusa", again: "Riapre {w}",
      wTomorrow: "domani alle {t}", wDay: "{w} alle {t}", wDate: "{w} {d} alle {t}",
      closed: "chiusa", ferien: "Vacanze", abwesend: "Biblioteca chiusa",
      artFerien: "Vacanze", artAbw: "Assenza",
      closuresT: "Vacanze e giorni di chiusura", noClosures: "Nessuna chiusura prevista.",
      wd_mo: "lunedì", wd_di: "martedì", wd_mi: "mercoledì", wd_do: "giovedì", wd_fr: "venerdì", wd_sa: "sabato", wd_so: "domenica",
      ws_mo: "lun", ws_di: "mar", ws_mi: "mer", ws_do: "gio", ws_fr: "ven", ws_sa: "sab", ws_so: "dom",
    },
  });

  // Daten (Vorschau aus der Admin-Seite oder veröffentlichte info.js)
  let I = window.DSM_INFO || null;
  if (location.hash === "#vorschau") {
    try {
      const p = JSON.parse(localStorage.getItem("dsm-vorschau-info") || "null");
      if (p && p.zeiten) { I = p; $("#preview").hidden = false; }
    } catch (e) { /* keine Vorschau */ }
  }
  const box = $("#info");
  if (!I || !box) return;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const DAYS = ["mo", "di", "mi", "do", "fr", "sa", "so"];
  const ISO = /^\d{4}-\d{2}-\d{2}$/, HM = /^\d{2}:\d{2}$/;
  const iso = d => d.toLocaleDateString("sv-SE"); // JJJJ-MM-TT, lokales Datum
  const keyOf = d => DAYS[(d.getDay() + 6) % 7];
  const hm = d => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  const tm = s => s.replace(/^0(\d)/, "$1");
  const span = r => tm(r[0]) + "–" + tm(r[1]);
  const dayRanges = k => ((I.zeiten || {})[k] || []).filter(r => r && HM.test(r[0]) && HM.test(r[1]) && r[0] < r[1]).sort();
  const hasHours = DAYS.some(k => dayRanges(k).length);
  const hinweis = () => ((I.hinweis && (I.hinweis[D.lang] || I.hinweis.de)) || "").trim();

  const closures = (I.schliessungen || []).filter(c => c && ISO.test(c.von))
    .map(c => Object.assign({}, c, { bis: ISO.test(c.bis || "") && c.bis >= c.von ? c.bis : c.von }))
    .sort((a, b) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0));
  const closedOn = s => closures.find(c => c.von <= s && s <= c.bis);
  const label = c => ((c[D.lang] || c.de || "") + "").trim() || D.t(c.art === "abwesend" ? "abwesend" : "ferien");

  function dd(s, year) {
    const [y, m, d] = s.split("-");
    const short = D.lang === "it" ? `${+d}/${+m}` : `${+d}.${+m}.`;
    return year ? (D.lang === "it" ? `${short}/${y}` : `${short}${y}`) : short;
  }
  function rangeText(c) {
    const yr = c.bis.slice(0, 4) !== String(new Date().getFullYear());
    if (c.von === c.bis) {
      const d = new Date(c.von + "T12:00:00");
      return D.t("ws_" + keyOf(d)) + ", " + dd(c.von, yr);
    }
    return dd(c.von, c.von.slice(0, 4) !== c.bis.slice(0, 4)) + "–" + dd(c.bis, yr);
  }

  // Datum, dazu „geschlossen“, sofern der Name es nicht schon sagt
  const closedText = c => rangeText(c) + (label(c) === D.t("abwesend") ? "" : " · " + D.t("closed"));

  // Nächste Öffnung ab jetzt (Schließtage übersprungen, höchstens 120 Tage voraus)
  function nextOpen(now) {
    const nowHm = hm(now);
    for (let i = 0; i <= 120; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
      if (closedOn(iso(d))) continue;
      const r = dayRanges(keyOf(d)).find(x => i > 0 || x[0] > nowHm);
      if (r) return { d, r, i };
    }
    return null;
  }
  function when(n) {
    const t = tm(n.r[0]), w = D.t("wd_" + keyOf(n.d));
    if (n.i === 1) return D.t("wTomorrow", { t });
    return n.i <= 6 ? D.t("wDay", { w, t }) : D.t("wDate", { w, d: dd(iso(n.d)), t });
  }
  function status(now) {
    const today = iso(now), nowHm = hm(now), c = closedOn(today);
    const again = () => { const n = hasHours && nextOpen(now); return n ? D.t("again", { w: when(n) }) : ""; };
    if (c) return { k: "zu", t: D.t("closedToday"), sub: [label(c), again()].filter(Boolean).join(" · ") };
    if (!hasHours) return null;
    const rs = dayRanges(keyOf(now)), all = D.t("today") + " " + rs.map(span).join(", ");
    const cur = rs.find(r => r[0] <= nowHm && nowHm < r[1]);
    if (cur) return { k: "auf", t: D.t("openNow"), sub: rs.length > 1 ? all : D.t("until", { t: tm(cur[1]) }) };
    const later = rs.find(r => nowHm < r[0]);
    if (later) return { k: "spaeter", t: D.t("openLater", { t: tm(later[0]) }), sub: all };
    return { k: "zu", t: D.t("closedNow"), sub: again() };
  }

  const CHEV = '<svg class="go" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>';
  function renderCard() {
    const now = new Date(), today = iso(now);
    const st = status(now);
    const active = closedOn(today);
    const soonLimit = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21, 12));
    const soon = closures.find(c => c !== active && c.bis >= today && c.von <= soonLimit);
    const future = closures.some(c => c.bis >= today);
    if (!st && !soon && !future && !hinweis()) { box.hidden = true; box.innerHTML = ""; return; }
    let lines = "";
    if (st) lines += `<span class="info-line"><i class="dot ${st.k === "auf" ? "" : st.k}"></i><span class="tx"><b>${esc(st.t)}</b>${st.sub ? `<small>${esc(st.sub)}</small>` : ""}</span>${CHEV}</span>`;
    else lines += `<span class="info-line"><span class="tx"><b>${esc(D.t(hasHours ? "infoT" : "closuresT"))}</b></span>${CHEV}</span>`;
    if (soon) lines += `<span class="info-line"><i class="bar-c ${soon.art === "abwesend" ? "abwesend" : ""}"></i><span class="tx"><b>${esc(label(soon))}</b><small>${esc(closedText(soon))}</small></span></span>`;
    const first = box.hidden;
    box.innerHTML = `<button type="button" class="info-card" aria-label="${esc(D.t("infoOpen"))}"${first ? "" : ' style="animation:none"'}>${lines}</button>`;
    box.hidden = false;
  }

  // Fenster mit allen Zeiten und Schließtagen
  let dlg = null;
  function renderSheet() {
    const now = new Date(), today = iso(now), tk = keyOf(now);
    const shown = DAYS.filter((k, n) => n < 5 || dayRanges(k).length);
    const week = hasHours ? `<dl class="week">${shown.map(k => {
      const rs = dayRanges(k), cls = k === tk ? "heute" : "";
      return `<dt class="${cls}">${esc(D.t("wd_" + k))}</dt><dd class="${cls} ${rs.length ? "" : "zu"}">${esc(rs.length ? rs.map(span).join(", ") : D.t("closed"))}</dd>`;
    }).join("")}</dl>` : "";
    const fut = closures.filter(c => c.bis >= today).slice(0, 10);
    const list = fut.length ? `<ul class="closures">${fut.map(c => `<li><i class="bar-c ${c.art === "abwesend" ? "abwesend" : ""}"></i><span><b>${esc(label(c))}</b><small>${esc(rangeText(c))} · ${esc(D.t(c.art === "abwesend" ? "artAbw" : "artFerien"))}</small></span></li>`).join("")}</ul>`
      : `<p class="note">${esc(D.t("noClosures"))}</p>`;
    const h = hinweis();
    dlg.querySelector(".pane").innerHTML = `<h3 id="info-t">${esc(D.t("infoT"))}</h3>
      ${h ? `<p class="hint">${esc(h)}</p>` : ""}
      ${week ? `<section>${week}</section>` : ""}
      <section><h4>${esc(D.t("closuresT"))}</h4>${list}</section>`;
  }
  function openInfo() {
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.className = "sheet glass";
      dlg.setAttribute("aria-labelledby", "info-t");
      dlg.innerHTML = `<div class="grab" aria-hidden="true"></div><button type="button" class="icon-btn close" data-close aria-label="${esc(D.t("close"))}">${D.ICON_X}</button><div class="pane"></div>`;
      document.body.appendChild(dlg);
      D.wireSheet(dlg);
    }
    renderSheet();
    dlg.scrollTop = 0;
    D.openSheet(dlg);
  }
  box.addEventListener("click", e => { if (e.target.closest(".info-card")) openInfo(); });

  D.onLang(() => { renderCard(); if (dlg && dlg.open) renderSheet(); });
  setInterval(() => { if (!document.hidden) renderCard(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) renderCard(); });
  renderCard();
})();
