/* Bücherliste: Suche, A–Z-Leiste (ab Tablet), Buchstaben-Floater (Handy), Detailansicht mit Cover. */
(function () {
  "use strict";
  const D = window.DSM;
  const $ = s => document.querySelector(s);

  D.init({
    de: {
      pageTitle: "Bibliothek – Deutsche Schule Mailand",
      title: "Bibliothek",
      search: "Titel, Autor oder ISBN suchen",
      searchLabel: "Bücher durchsuchen",
      clear: "Suche löschen",
      index: "Alphabetischer Index",
      hits: "{n} Treffer",
      sorted: "Alphabetisch nach Titel",
      emptyT: "Kein Buch gefunden",
      emptyP: "Eine andere Schreibweise oder nur einen Teil des Titels versuchen.",
      close: "Schließen",
      verlag: "Verlag", jahr: "Jahr", isbn: "ISBN", kategorie: "Kategorie", standort: "Standort",
      coverEKZ: "Cover: ekz-Bibliotheksservice", coverOL: "Cover: Open Library", coverGB: "Cover: Google Books",
      footer: "Bibliothek der Deutschen Schule Mailand",
      preview: "Vorschau der neuen Liste – noch nicht veröffentlicht.", previewEnd: "Vorschau beenden",
      noData: "Die Bücherliste konnte nicht geladen werden (books.js fehlt).",
      why: "Warum dieses Buch?",
      recsT: "Empfehlungen", recsClose: "Empfehlungen ausblenden",
      recsOff: "Empfehlungen ausgeblendet. Über die Einstellungen lassen sie sich wieder einschalten.",
      askNo: "Alles klar. Empfehlungen lassen sich jederzeit in den Einstellungen einschalten.",
      g_mittelstufe: "Mittelstufe", g_oberstufe: "Oberstufe", g_erw: "Erwachsenenliteratur", g_erwShort: "Erwachsene",
      "g_erw-roman": "Romane", "g_erw-sach": "Sachbücher", "g_erw-bio": "Biografien & Geschichte",
      d_mittelstufe: "Jugendromane und erste Klassiker", d_oberstufe: "Romane und Klassiker für Fortgeschrittene", d_erw: "In drei Kernbereichen",
      "d_erw-roman": "Erzählende Literatur", "d_erw-sach": "Natur, Gesellschaft, Technik", "d_erw-bio": "Lebensgeschichten und Zeitgeschichte",
      askT1: "Buchempfehlungen", askP1: "Möchten Sie Buchempfehlungen sehen?", yes: "Ja, gerne", no: "Nein, danke",
      askT2: "Für wen?", askP2: "Wählen Sie die passende Stufe.", askT3: "Welcher Bereich?", askP3: "Erwachsenenliteratur in drei Kernbereichen.", back: "Zurück",
      sRecs: "Buchempfehlungen", sRecsShow: "Empfehlungen anzeigen", sRecsShowH: "Drei bis vier ausgewählte Bücher über der Liste.",
      sRecsFor: "Empfehlungen für",
      arcT: "Bisherige Empfehlungen", arcOpen: "Alle bisherigen Empfehlungen", arcNow: "Aktuell", arcGone: "Nicht mehr im Bestand",
    },
    it: {
      pageTitle: "Biblioteca – Scuola Germanica di Milano",
      title: "Biblioteca",
      search: "Cerca titolo, autore o ISBN",
      searchLabel: "Cerca nei libri",
      clear: "Cancella ricerca",
      index: "Indice alfabetico",
      hits: "{n} risultati",
      hits1: "1 risultato",
      sorted: "In ordine alfabetico per titolo",
      emptyT: "Nessun libro trovato",
      emptyP: "Prova un'altra grafia o solo una parte del titolo.",
      close: "Chiudi",
      verlag: "Editore", jahr: "Anno", isbn: "ISBN", kategorie: "Categoria", standort: "Collocazione",
      coverEKZ: "Copertina: ekz-Bibliotheksservice", coverOL: "Copertina: Open Library", coverGB: "Copertina: Google Books",
      footer: "Biblioteca della Scuola Germanica di Milano",
      preview: "Anteprima del nuovo elenco – non ancora pubblicato.", previewEnd: "Chiudi anteprima",
      noData: "Impossibile caricare l'elenco dei libri (manca books.js).",
      why: "Perché questo libro?",
      recsT: "Consigli di lettura", recsClose: "Nascondi i consigli",
      recsOff: "Consigli nascosti. Puoi riattivarli nelle impostazioni.",
      askNo: "D'accordo. Puoi attivare i consigli in qualsiasi momento nelle impostazioni.",
      g_mittelstufe: "Livello intermedio", g_oberstufe: "Livello superiore", g_erw: "Letteratura per adulti", g_erwShort: "Adulti",
      "g_erw-roman": "Romanzi", "g_erw-sach": "Saggistica", "g_erw-bio": "Biografie e storia",
      d_mittelstufe: "Romanzi per ragazzi e primi classici", d_oberstufe: "Romanzi e classici per lettori esperti", d_erw: "In tre aree principali",
      "d_erw-roman": "Narrativa", "d_erw-sach": "Natura, società, tecnica", "d_erw-bio": "Vite e storia contemporanea",
      askT1: "Consigli di lettura", askP1: "Desidera vedere dei consigli di lettura?", yes: "Sì, volentieri", no: "No, grazie",
      askT2: "Per chi?", askP2: "Scelga il livello adatto.", askT3: "Quale area?", askP3: "Letteratura per adulti in tre aree principali.", back: "Indietro",
      sRecs: "Consigli di lettura", sRecsShow: "Mostra i consigli", sRecsShowH: "Da tre a quattro libri scelti sopra l'elenco.",
      sRecsFor: "Consigli per",
      arcT: "Consigli precedenti", arcOpen: "Tutti i consigli precedenti", arcNow: "Attuali", arcGone: "Non più in catalogo",
    },
  });

  // Daten (Vorschau aus der Admin-Seite oder veröffentlichte books.js)
  let data = window.DSM_BIBLIOTHEK;
  if (location.hash === "#vorschau") {
    try {
      const p = JSON.parse(localStorage.getItem("dsm-vorschau") || "null");
      if (p && Array.isArray(p.buecher)) { data = p; $("#preview").hidden = false; }
    } catch (e) { /* keine Vorschau */ }
  }
  const books = (data && data.buecher) || [];

  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const COLORS = ["--mauve", "--gelb", "--orange", "--blau", "--rot", "--gruen"];
  const letterOf = t => {
    const c = String(t).replace(/^[^\p{L}\p{N}]+/u, "").normalize("NFD").charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : "#";
  };
  books.forEach((b, i) => {
    b._i = i;
    b._l = letterOf(b.t);
    b._s = norm([b.t, b.u, (b.a || []).join(" "), (b.i || []).join(" "), b.v].join(" "));
  });

  const meta = $("#meta"), list = $("#list"), q = $("#q"), clr = $(".search .clear"), idx = $("#index");
  const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
  const lid = l => "L-" + (l === "#" ? "0" : l);

  // A–Z-Leiste (per CSS nur ab Tablet-Breite sichtbar)
  idx.innerHTML = LETTERS.map(l => `<a href="#${lid(l)}" data-l="${l}">${l}</a>`).join("");
  idx.addEventListener("click", e => {
    const a = e.target.closest("a[data-l]");
    if (!a) return;
    e.preventDefault();
    const el = document.getElementById(lid(a.dataset.l));
    if (el) glide(el);
  });
  // Schneller animierter Sprung: feste kurze Dauer statt Browser-Smooth-Scroll (der bei langen Strecken trödelt).
  // Das Ziel wird in jedem Schritt neu gemessen: Abschnitte, die unterwegs zum ersten Mal gezeichnet
  // werden (content-visibility), weichen von ihrer geschätzten Höhe ab.
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let glideId = 0;
  function glide(el) {
    cancelAnimationFrame(glideId);
    const target = () => Math.max(0, Math.min(el.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0),
      document.documentElement.scrollHeight - innerHeight));
    const from = scrollY, d = target() - from;
    if (still.matches || Math.abs(d) < 2) { scrollTo({ top: target(), behavior: "instant" }); return; }
    const dur = Math.min(420, 200 + Math.abs(d) / 50), t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      scrollTo({ top: from + (target() - from) * (1 - Math.pow(1 - p, 3)), behavior: "instant" });
      if (p < 1) glideId = requestAnimationFrame(step);
    };
    glideId = requestAnimationFrame(step);
  }
  ["wheel", "touchstart", "keydown"].forEach(t => addEventListener(t, () => cancelAnimationFrame(glideId), { passive: true }));

  // Liste
  // Die Liste besteht aus Abschnitten zu höchstens CHUNK Büchern; jeder Buchstabe beginnt einen neuen.
  // Per CSS (content-visibility) zeichnet der Browser nur Abschnitte in Sichtweite. Für die übrigen
  // steht eine aus der Textlänge geschätzte Höhe im Stil, bis sie einmal gezeichnet wurden.
  const CHUNK = 40;
  let current = [], terms = [], marks = [], hlRe = null;
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function hl(text) {
    if (!hlRe) return esc(text);
    // split mit Klammer im Ausdruck: ungerade Teile sind Treffer
    return String(text).split(hlRe).map((p, n) => n % 2 ? `<mark>${esc(p)}</mark>` : esc(p)).join("");
  }
  function sizer() {
    // Zeichen je Zeile für Titel (fs-m) und Autor (fs-s), grob über die mittlere Zeichenbreite
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const w = Math.max(160, list.clientWidth - 40);
    const cT = w / (rem * .5), cA = w / (rem * .875 * .5);
    return (t, a) => 25 + rem * 1.35 * Math.ceil((t.length || 1) / cT) + (a ? 2 + rem * .875 * 1.5 * Math.ceil(a.length / cA) : 0);
  }
  function render(animate) {
    const est = sizer();
    let html = "", rows = "", h = 0, n = 0, head = null, last = null;
    const flush = () => {
      if (!n) return;
      html += `<ul${head ? ` data-l="${head}" id="${lid(head)}"` : ""} style="contain-intrinsic-size:auto ${Math.round(h)}px">${rows}</ul>`;
      rows = ""; h = 0; n = 0; head = null;
    };
    for (const b of current) {
      if (b._l !== last) { flush(); head = last = b._l; } else if (n === CHUNK) flush();
      const a = b.a ? b.a.join(", ") : "";
      rows += `<li><button class="row" type="button" data-i="${b._i}"><span class="t">${hl(b.t)}</span>${a ? `<span class="a">${hl(a)}</span>` : ""}</button></li>`;
      h += est(b.t, a); n++;
    }
    flush();
    list.innerHTML = current.length ? `<div class="rows">${html}</div>` :
      (books.length ? `<div class="empty"><strong>${esc(D.t("emptyT"))}</strong><span>${esc(D.t("emptyP"))}</span></div>` :
        `<div class="empty"><strong>${esc(D.t("noData"))}</strong></div>`);
    marks = [...list.querySelectorAll("ul[data-l]")];
    const present = new Set(marks.map(m => m.dataset.l));
    idx.querySelectorAll("a").forEach(a => a.setAttribute("aria-disabled", String(!present.has(a.dataset.l))));
    if (animate) { list.classList.add("enter"); setTimeout(() => list.classList.remove("enter"), 600); }
    updateMeta();
    onScroll();
    observeRows();
    // Bei wenigen Treffern Cover sofort holen
    if (terms.length && current.length <= 4) current.forEach(b => prefetch(b));
  }
  function updateMeta() {
    const n = current.length;
    meta.textContent = !books.length ? "" : terms.length ? (n === 1 && D.lang === "it" ? D.t("hits1") : D.t("hits", { n: D.nf(n) })) : D.t("sorted");
  }
  function filter() {
    clr.hidden = !q.value;
    terms = norm(q.value).split(" ").filter(Boolean);
    const long = terms.filter(t => t.length > 1).sort((a, b) => b.length - a.length);
    hlRe = long.length ? new RegExp("(" + long.map(reEsc).join("|") + ")", "i") : null;
    current = terms.length ? books.filter(b => terms.every(t => b._s.includes(t))) : books;
    list.classList.add("live");
    render(false);
    toBar();
    logSearch();
  }
  // Protokoll: erst wenn die Eingabe ruht, sonst eine Zeile je Tastendruck
  let logT = 0, logged = "";
  function logSearch() {
    clearTimeout(logT);
    logT = setTimeout(() => {
      const s = terms.join(" ");
      if (s === logged) return;
      if (!s) D.log("Suche", "geleert");
      else D.log("Suche", `„${q.value.trim()}“: ${current.length} Treffer`, current.length ? { Erste: current.slice(0, 5).map(b => b.t).join(" · ") } : undefined);
      logged = s;
    }, 600);
  }
  let timer;
  q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(filter, 90); });
  q.addEventListener("keydown", e => { if (e.key === "Escape" && q.value) { q.value = ""; filter(); } });
  clr.addEventListener("click", () => { q.value = ""; filter(); q.focus(); });

  // Höhe der klebenden Suchleiste
  const bar = $("#bar"), anchor = $("#bar-anchor");
  const setBarH = () => document.documentElement.style.setProperty("--bar-h", bar.offsetHeight + "px");
  if ("ResizeObserver" in window) new ResizeObserver(setBarH).observe(bar);
  setBarH();
  // Schatten, sobald die Leiste oben klebt
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => bar.classList.toggle("stuck", !e.isIntersecting && e.boundingClientRect.top < 0))
      .observe(anchor);
  }
  // Beim Suchen bleibt die Leiste oben und die Treffer beginnen direkt darunter,
  // statt dass die Seite beim Kürzerwerden der Liste mitten im Inhalt landet.
  const anchorTop = () => anchor.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(bar).top) || 0);
  function toBar() {
    if (document.activeElement !== q && !terms.length) return;
    const y = anchorTop();
    if (scrollY > y + 1) scrollTo({ top: y, behavior: "instant" });
  }
  q.addEventListener("focus", () => {
    if (wide.matches) return;
    const y = anchorTop();
    if (Math.abs(scrollY - y) > 1) scrollTo({ top: y, behavior: "instant" });
  });

  // Buchstaben-Floater: nur beim Scrollen sichtbar, springt beim Beginn eines neuen Buchstabens um
  const fl = $("#floater");
  let flLetter = null, flHide = 0, ticking = false, idxOn = null;
  const wide = matchMedia("(min-width: 48rem)");
  function onScroll(fromScroll) {
    ticking = false;
    const lim = bar.getBoundingClientRect().bottom + 2;
    let on = null;
    if (marks.length && list.getBoundingClientRect().top <= lim) {
      on = marks[0].dataset.l;
      for (const m of marks) { if (m.getBoundingClientRect().top <= lim + 40) on = m.dataset.l; else break; }
    }
    if (on !== idxOn) {
      idxOn = on;
      idx.querySelectorAll("a.on").forEach(a => a.classList.remove("on"));
      if (on) idx.querySelector(`a[data-l="${on}"]`).classList.add("on");
    }
    if (!on || wide.matches || fromScroll !== true) { fl.classList.remove("show"); return; }
    if (on !== flLetter) {
      flLetter = on; fl.textContent = on;
      // Wechsel zwischen zwei gleichen Animationen startet neu, ohne Layout zu erzwingen
      const a = fl.classList.contains("pop-a");
      fl.classList.toggle("pop-a", !a); fl.classList.toggle("pop-b", a);
    }
    fl.classList.add("show");
    clearTimeout(flHide);
    flHide = setTimeout(() => fl.classList.remove("show"), 900);
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => onScroll(true)); } }, { passive: true });

  // Cover (assets/covers.js): Bücher in Sichtweite werden im Hintergrund gestaffelt vorgeladen,
  // beim Antippen wird das Cover mit Vorrang geholt. Die Liste selbst bleibt reiner Text.
  const C = window.DSMCovers;
  let warmed = false;
  function warm() {
    if (warmed) return; warmed = true;
    [["https://cover.ekz.de", false], ["https://openlibrary.org", true], ["https://covers.openlibrary.org", false]]
      .forEach(([href, cors]) => { const l = document.createElement("link"); l.rel = "preconnect"; l.href = href; if (cors) l.crossOrigin = ""; document.head.appendChild(l); });
  }
  const IO = "IntersectionObserver" in window;
  const seen = IO ? new IntersectionObserver(entries => {
    for (const e of entries) {
      const b = books[+e.target.dataset.i];
      if (e.isIntersecting) { warm(); C.want(b); } else C.unwant(b);
    }
  }, { rootMargin: "150px 0px" }) : null;
  // Zeilen nur in Abschnitten nahe der Sicht einzeln beobachten (statt aller 4000+ Zeilen)
  const near = IO ? new IntersectionObserver(entries => {
    for (const e of entries) {
      for (const r of e.target.querySelectorAll(".row")) {
        const b = books[+r.dataset.i];
        if (!b.i) continue;
        if (e.isIntersecting) seen.observe(r); else { seen.unobserve(r); C.unwant(b); }
      }
    }
  }, { rootMargin: "300px 0px" }) : null;
  function observeRows() {
    if (!IO || !C.enabled) return;
    seen.disconnect(); near.disconnect();
    list.querySelectorAll(".rows > ul").forEach(u => near.observe(u));
  }
  const prefetch = b => { if (b && b.i) { warm(); C.get(b); } };
  list.addEventListener("pointerdown", e => { const r = e.target.closest(".row"); if (r) prefetch(books[+r.dataset.i]); });

  // ---------- Detail ----------
  const dlg = $("#detail");
  D.wireSheet(dlg);
  let open = null, openRec = null, token = 0;
  const shelf = s => D.lang === "it" ? s.replace(/\s+Brett\s+(\d+)/i, ", ripiano $1").replace(/\s+Regal\s+(\d+)/i, " scaffale $1") : s;
  const cat = k => D.lang === "it" && window.DSM_KATEGORIEN_IT && window.DSM_KATEGORIEN_IT[k] || k;
  const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.codePointAt(0)) >>> 0; return h; };

  function fill(b, rec) {
    $("#d-title").textContent = b.t;
    const subEl = $("#d-sub"); subEl.textContent = b.u || ""; subEl.hidden = !b.u;
    const by = $("#d-by"); by.textContent = (b.a || []).join(", "); by.hidden = !b.a;
    const te = $("#d-teaser"), txt = rec && (rec[D.lang] || rec.de);
    te.hidden = !txt; te.querySelector("p").textContent = txt || "";
    const rows = [];
    const add = (k, v) => { if (v) rows.push(`<dt>${esc(D.t(k))}</dt><dd>${v}</dd>`); };
    add("verlag", b.v && esc(b.v));
    add("jahr", b.j && esc(b.j));
    add("isbn", b.i && b.i.map(esc).join("<br>"));
    add("kategorie", b.k && esc(cat(b.k)));
    add("standort", b.s && b.s.map(s => esc(shelf(s))).join("<br>"));
    $("#d-dl").innerHTML = rows.join("");
  }
  function placeholder(box, b) {
    box.style.setProperty("--ph-c", `var(${COLORS[hash(b.t) % COLORS.length]})`);
    box.innerHTML = `<div class="ph"><b></b><div class="rule"></div></div>`;
    box.querySelector("b").textContent = b.t;
  }
  // Lichtband (.loading) läuft, bis das Bild wirklich geladen ist – bei langsamer Verbindung
  // dauert das nach der Abfrage noch. Scheitert das Bild, bleibt der Platzhalter.
  function showImg(box, found) {
    const img = C.img(found); // schon vorgeladenes Element, sonst neu
    img.alt = ""; img.referrerPolicy = "no-referrer";
    box.appendChild(img);
    const show = () => { box.classList.remove("loading"); requestAnimationFrame(() => img.classList.add("in")); };
    const fail = () => { box.classList.remove("loading"); img.remove(); };
    if (img.complete) (img.naturalWidth ? show : fail)();
    else { img.onload = show; img.onerror = fail; }
  }
  async function cover(b) {
    const my = ++token;
    const box = $("#d-cover"), src = $("#d-src");
    placeholder(box, b); // sofort sichtbar, echtes Cover blendet darüber ein
    src.textContent = ""; delete src.dataset.i18n;
    box.classList.toggle("loading", !!b.i);
    const t0 = performance.now();
    const found = b.i ? await C.get(b) : null;
    if (my !== token) return;
    if (!found) box.classList.remove("loading");
    D.log("Cover", `„${b.t}“: ` + (!b.i ? "keine ISBN, Platzhalter" : found ? `${D.t(found.by).replace(/^[^:]*:\s*/, "")} · ${Math.round(performance.now() - t0)} ms` : "kein Cover gefunden, Platzhalter"));
    if (!found) return;
    showImg(box, found);
    src.dataset.i18n = found.by; src.textContent = D.t(found.by);
  }
  function openDetail(b, rec) {
    open = b; openRec = rec || null;
    fill(b, openRec);
    dlg.scrollTop = 0;
    D.openSheet(dlg);
    cover(b);
  }
  list.addEventListener("click", e => {
    const r = e.target.closest(".row");
    if (r) openDetail(books[+r.dataset.i]);
  });
  dlg.addEventListener("close", () => { token++; open = null; openRec = null; });

  // ---------- Empfehlungen ----------
  const GROUPS = ["mittelstufe", "oberstufe", "erw-roman", "erw-sach", "erw-bio"];
  const keyOf = b => norm(b.t) + "|" + norm((b.a && b.a[0]) || "");
  const byKey = new Map(books.map(b => [keyOf(b), b]));
  let R = window.DSM_EMPFEHLUNGEN || { gruppen: {} };
  if (!$("#preview").hidden || location.hash === "#vorschau") {
    try { const pr = JSON.parse(localStorage.getItem("dsm-vorschau-empf") || "null"); if (pr && pr.gruppen) { R = pr; $("#preview").hidden = false; } } catch (e) { /* */ }
  }
  function pref() { try { return JSON.parse(D.store.get("dsm-empf") || "null"); } catch (e) { return null; } }
  function setPref(p) { D.store.set("dsm-empf", JSON.stringify(p)); }
  const gLabel = g => g.startsWith("erw-") ? D.t("g_erw") + " · " + D.t("g_" + g) : D.t("g_" + g);
  function recsFor(g) { return ((R.gruppen && R.gruppen[g]) || []).map(r => ({ r, b: byKey.get(r.k) })).filter(x => x.b).slice(0, 4); }
  const recsEl = $("#recs");
  const CHEV = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>';
  let shownRecs = [], loggedRecs = null;
  function renderRecs(animate) {
    recsEl.classList.remove("laedt"); // Lade-Platzhalter aus index.html
    const p = pref();
    shownRecs = p && p.want && p.gruppe ? recsFor(p.gruppe) : [];
    if (!shownRecs.length) { recsEl.hidden = true; recsEl.innerHTML = ""; loggedRecs = null; return; }
    if (p.gruppe !== loggedRecs) { loggedRecs = p.gruppe; D.log("Empfehlung", `${gLabel(p.gruppe)}: ${shownRecs.length} Bücher`, { Bücher: shownRecs.map(x => x.b.t).join(" · ") }); }
    recsEl.innerHTML = `<div class="recs-card"${animate ? "" : ' style="animation:none"'}>
      <div class="recs-head"><h2 id="recs-title"><button type="button" class="recs-open" id="recs-open" aria-haspopup="dialog" title="${esc(D.t("arcOpen"))}"><span>${esc(D.t("recsT"))}${CHEV}</span><small>${esc(gLabel(p.gruppe))}</small></button></h2>
      <button type="button" class="icon-btn" id="recs-x" aria-label="${esc(D.t("recsClose"))}">${D.ICON_X}</button></div>
      <div class="recs-row">${shownRecs.map((x, n) => `<button type="button" class="rec" data-n="${n}"><div class="cover small"></div><span class="rt"><b>${esc(x.b.t)}</b><span>${esc((x.b.a || [])[0] || "")}</span></span></button>`).join("")}</div></div>`;
    recsEl.hidden = false;
    const boxes = [...recsEl.querySelectorAll(".rec .cover")];
    shownRecs.forEach((x, n) => { placeholder(boxes[n], x.b); boxes[n].classList.toggle("loading", !!x.b.i); });
    C.prime(shownRecs.map(x => x.b)).then(res => res.forEach((f, n) => {
      if (!boxes[n].isConnected) return;
      if (f) showImg(boxes[n], f); else boxes[n].classList.remove("loading");
    }));
  }
  recsEl.addEventListener("click", e => {
    if (e.target.closest("#recs-x")) {
      const p = pref() || {};
      setPref({ want: false, gruppe: p.gruppe || null });
      loggedRecs = null;
      const card = recsEl.querySelector(".recs-card");
      card.classList.add("hide");
      setTimeout(() => { recsEl.hidden = true; recsEl.innerHTML = ""; }, 300);
      D.toast(D.t("recsOff"));
      return;
    }
    if (e.target.closest("#recs-open")) { openArchiv(); return; }
    const r = e.target.closest(".rec");
    if (r) { const x = shownRecs[+r.dataset.n]; openDetail(x.b, x.r); }
  });

  // Bisherige Empfehlungen: aktuelle Runde und Archiv, neueste zuerst, nur die gewählte Gruppe
  let arc = null, arcItems = [], arcSeen = null;
  function rounds(g) {
    const all = [{ stand: R.stand, thema: R.thema, gruppen: R.gruppen, now: true }].concat(Array.isArray(R.archiv) ? R.archiv : []);
    return all.map(x => ({ ...x, recs: ((x.gruppen && x.gruppen[g]) || []).map(r => ({ r, b: byKey.get(r.k) })) })).filter(x => x.recs.length);
  }
  function arcRender() {
    const p = pref() || {}, g = p.gruppe;
    arcItems = [];
    const html = rounds(g).map((x, n) => {
      const thema = x.thema && (x.thema[D.lang] || x.thema.de);
      const items = x.recs.map(it => {
        const i = arcItems.push(it) - 1, txt = it.r[D.lang] || it.r.de || "";
        const inner = `<div class="cover small"></div><span class="rt"><b>${esc(it.b ? it.b.t : it.r.t)}</b><span>${esc(it.b ? (it.b.a || [])[0] || "" : it.r.a || "")}</span>${it.b ? "" : `<small>${esc(D.t("arcGone"))}</small>`}${txt ? `<p>${esc(txt)}</p>` : ""}</span>`;
        return it.b ? `<button type="button" class="arc-item" data-i="${i}">${inner}</button>` : `<div class="arc-item gone" data-i="${i}">${inner}</div>`;
      }).join("");
      return `<li class="arc-round${x.now ? " now" : ""}" style="--i:${Math.min(n, 8)}"><div class="arc-hd"><time datetime="${esc(x.stand || "")}">${esc(D.df(x.stand))}</time>${x.now ? `<span class="arc-now">${esc(D.t("arcNow"))}</span>` : ""}${thema ? `<b>${esc(thema)}</b>` : ""}</div>${items}</li>`;
    }).join("");
    arc.querySelector(".pane").innerHTML = `<div><h3 id="arc-t">${esc(D.t("arcT"))}</h3><p class="sub">${esc(g ? gLabel(g) : "")}</p></div><ol class="arc">${html}</ol>`;
    // Cover erst laden, wenn die Runde in Sichtweite kommt
    if (arcSeen) arcSeen.disconnect();
    arcSeen = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      arcSeen.unobserve(e.target);
      const els = [...e.target.querySelectorAll(".arc-item")], its = els.map(el => arcItems[+el.dataset.i]);
      const boxes = els.map(el => el.querySelector(".cover"));
      its.forEach((it, n) => placeholder(boxes[n], it.b || { t: it.r.t }));
      const have = its.map((it, n) => [it.b, boxes[n]]).filter(x => x[0]);
      C.prime(have.map(x => x[0])).then(res => res.forEach((f, n) => { if (f && have[n][1].isConnected) showImg(have[n][1], f); }));
    }), { root: arc, rootMargin: "200px 0px" });
    arc.querySelectorAll(".arc-round").forEach(li => arcSeen.observe(li));
  }
  function openArchiv() {
    if (!arc) {
      arc = document.createElement("dialog");
      arc.className = "sheet glass archiv";
      arc.id = "archiv";
      arc.setAttribute("aria-labelledby", "arc-t");
      arc.innerHTML = `<div class="grab" aria-hidden="true"></div><button type="button" class="icon-btn close" data-close aria-label="${esc(D.t("close"))}">${D.ICON_X}</button><div class="pane"></div>`;
      document.body.appendChild(arc);
      D.wireSheet(arc);
      arc.addEventListener("click", e => {
        const el = e.target.closest("button.arc-item");
        if (el) { const it = arcItems[+el.dataset.i]; openDetail(it.b, it.r); }
      });
    }
    arcRender();
    arc.scrollTop = 0;
    D.openSheet(arc);
  }

  // Einstellungen: Abschnitt Buchempfehlungen
  const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>';
  D.addSettingsSection(box => {
    const p = pref() || {};
    const opt = (g, c) => `<button type="button" role="radio" data-g="${g}" aria-checked="${p.gruppe === g}"><i class="bar-c" style="background:var(${c})"></i><span><b>${esc(D.t("g_" + g))}</b><small>${esc(D.t("d_" + g))}</small></span>${CHECK}</button>`;
    const sec = document.createElement("section");
    sec.innerHTML = `<h4>${esc(D.t("sRecs"))}</h4>
      <label class="opt"><span><b>${esc(D.t("sRecsShow"))}</b><small>${esc(D.t("sRecsShowH"))}</small></span><input type="checkbox" role="switch" class="switch" id="s-recs"${p.want ? " checked" : ""}></label>
      <div class="gpick" role="radiogroup" aria-label="${esc(D.t("sRecsFor"))}"${p.want ? "" : " hidden"}>
        <div class="gp-box">${opt("mittelstufe", "--gelb")}</div>
        <div class="gp-box">${opt("oberstufe", "--orange")}</div>
        <div><span class="gp-h">${esc(D.t("g_erw"))}</span>
        <div class="gp-box">${opt("erw-roman", "--rot")}${opt("erw-sach", "--gruen")}${opt("erw-bio", "--blau")}</div></div>
      </div>`;
    box.appendChild(sec);
    sec.querySelector("#s-recs").addEventListener("change", e => {
      setPref({ want: e.target.checked, gruppe: p.gruppe || "mittelstufe" });
      D.refreshSettings(); renderRecs(true);
    });
    sec.querySelector(".gpick").addEventListener("click", e => {
      const b = e.target.closest("[data-g]"); if (!b) return;
      setPref({ want: true, gruppe: b.dataset.g });
      D.refreshSettings(); renderRecs(true);
    });
  });

  // Fragen beim ersten Besuch
  const ARROW = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>';
  let ask = null, askStep = 1, askDone = false;
  function askRender() {
    const el = ask.querySelector(".pane");
    const choice = (g, c) => `<button type="button" class="choice" data-g="${g}"><i class="bar-c" style="background:var(${c})"></i><span><b>${esc(D.t("g_" + g))}</b><small>${esc(D.t("d_" + g))}</small></span>${ARROW}</button>`;
    if (askStep === 1) {
      el.innerHTML = `<div class="step"><h3 id="ask-t">${esc(D.t("askT1"))}</h3><p class="lead">${esc(D.t("askP1"))}</p>
        <div class="row2"><button type="button" class="gbtn" data-a="no">${esc(D.t("no"))}</button><button type="button" class="gbtn primary" data-a="yes" autofocus>${esc(D.t("yes"))}</button></div></div>`;
    } else if (askStep === 2) {
      el.innerHTML = `<div class="step"><h3 id="ask-t">${esc(D.t("askT2"))}</h3><p class="lead">${esc(D.t("askP2"))}</p>
        <div class="choice-list">${choice("mittelstufe", "--gelb")}${choice("oberstufe", "--orange")}${choice("erw", "--mauve")}</div>
        <div><button type="button" class="textbtn" data-a="back">← ${esc(D.t("back"))}</button></div></div>`;
    } else {
      el.innerHTML = `<div class="step"><h3 id="ask-t">${esc(D.t("askT3"))}</h3><p class="lead">${esc(D.t("askP3"))}</p>
        <div class="choice-list">${choice("erw-roman", "--rot")}${choice("erw-sach", "--gruen")}${choice("erw-bio", "--blau")}</div>
        <div><button type="button" class="textbtn" data-a="back">← ${esc(D.t("back"))}</button></div></div>`;
    }
    if (ask.open) { const f = el.querySelector(".primary, .choice"); if (f) f.focus({ preventScroll: true }); }
  }
  function askFinish(g) {
    askDone = true;
    setPref({ want: true, gruppe: g });
    D.closeSheet(ask, "done");
    setTimeout(() => { renderRecs(true); scrollTo({ top: 0, behavior: still.matches ? "instant" : "smooth" }); }, 230);
  }
  function buildAsk() {
    ask = document.createElement("dialog");
    ask.className = "sheet glass ask";
    ask.setAttribute("aria-labelledby", "ask-t");
    ask.innerHTML = `<div class="grab" aria-hidden="true"></div><button type="button" class="icon-btn close" data-close aria-label="${esc(D.t("close"))}">${D.ICON_X}</button><div class="pane"></div>`;
    document.body.appendChild(ask);
    D.wireSheet(ask);
    ask.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.a === "yes") { askStep = 2; askRender(); }
      else if (b.dataset.a === "no") { D.closeSheet(ask, "no"); }
      else if (b.dataset.a === "back") { askStep = askStep === 3 ? 2 : 1; askRender(); }
      else if (b.dataset.g === "erw") { askStep = 3; askRender(); }
      else if (b.dataset.g) askFinish(b.dataset.g);
    });
    ask.addEventListener("close", () => {
      if (askDone) return;
      setPref({ want: false, gruppe: null });
      D.toast(D.t("askNo"));
    });
  }
  function startAsk() { buildAsk(); askStep = 1; askRender(); D.openSheet(ask); }

  D.onLang(() => {
    if (list.firstChild) { updateMeta(); if (!current.length) render(false); }
    if (open) { fill(open, openRec); const src = $("#d-src"); if (src.dataset.i18n) src.textContent = D.t(src.dataset.i18n); }
    if (!recsEl.hidden) renderRecs(false);
    if (arc && arc.open) arcRender();
    if (ask && ask.open) askRender();
  });

  current = books;
  render(true);
  list.closest("main").removeAttribute("aria-busy");
  renderRecs(false);
  if (!pref() && books.length) setTimeout(startAsk, 450);
})();
