/* Verwaltung: SQLite laden, Personendaten verwerfen, neue books.js erzeugen. Alles läuft lokal im Browser. */
(function () {
  "use strict";
  const D = window.DSM;
  const $ = s => document.querySelector(s);

  D.init({
    de: {
      current: "Aktuell veröffentlicht: {n} Bücher, Stand {d}",
      currentNone: "Noch keine Liste veröffentlicht.",
      dropT: "Datenbank auswählen",
      dropP: "WinBIAP-Datei (.winbook) hierher ziehen oder antippen.",
      loadingLib: "Lesemodul wird geladen …",
      reading: "Datenbank wird gelesen und bereinigt …",
      errNotSqlite: "Das ist keine SQLite-Datenbank. Bitte die .winbook-Datei aus WinBIAP wählen.",
      errNotLib: "Die Datei ist eine SQLite-Datenbank, aber keine Bibliotheksdatenbank (Tabelle „books“ fehlt).",
      errLib: "Das Lesemodul (assets/vendor/sql-asm.js) konnte nicht geladen werden.",
      errOther: "Die Datei konnte nicht gelesen werden: {m}",
      takenT: "Übernommen",
      takenP: "Bücher in der öffentlichen Liste",
      records: "Datensätze in der Datenbank",
      nonBook: "Andere Medien ausgelassen (DVD, CD, Hörbuch …)",
      gone: "Gelöschte oder ausgeschiedene Titel",
      merged: "Mehrfachexemplare zusammengefasst",
      withIsbn: "Titel mit ISBN (Cover möglich)",
      diff: "Gegenüber der aktuellen Liste",
      diffV: "+{a} neu · −{r} entfallen",
      removedT: "Nicht übernommen: Personen- und Ausleihdaten",
      loanCols: "Ausleihfelder in der Büchertabelle (Status, Leser, Klasse, Termine)",
      loanColsV: "{n} Felder",
      namedLoans: "Bucheinträge mit Leser-Namen",
      noneFound: "Keine Personendaten gefunden",
      checkOk: "Abgleich bestanden: Kein Name aus der Leserdatei steht in der öffentlichen Liste. Der Ausleihstatus wird nicht veröffentlicht.",
      checkWarn: "{n} Titel enthalten einen Namen, der auch in der Leserdatei vorkommt – vermutlich Autorinnen oder Autoren gleichen Namens. Bitte über die Vorschau prüfen.",
      checkRemoved: "{n} Standort- oder Kategoriebezeichnungen enthielten einen Leser-Namen und wurden entfernt.",
      checkNoReaders: "Keine Leserdatei in der Datenbank. Der Ausleihstatus wird nicht veröffentlicht.",
      publishT: "Veröffentlichen",
      howto: "Die heruntergeladene Datei books.js im Website-Ordner ersetzen (neben index.html). Danach zeigt die Bücherliste den neuen Bestand.",
      download: "books.js herunterladen",
      preview: "Vorschau ansehen",
      again: "Andere Datei laden",
      footer: "Bibliothek der Deutschen Schule Mailand · Verwaltung",
      toList: "Zur Bücherliste",
      covT: "Cover-Abdeckung",
      covRun: "Cover-Abdeckung prüfen",
      covRerun: "Erneut prüfen",
      covStop: "Abbrechen",
      covIsbn: "{p} der Bücher haben eine ISBN. Nur sie können ein Cover bekommen; wie viele davon tatsächlich eines haben, zeigt die Prüfung.",
      covHint: "Prüft alle ISBN: zuerst Open Library in Sammelabfragen, danach Google Books einzeln und gedrosselt. Dauert je nach Bestand einige Minuten. Das Ergebnis wird mit books.js gespeichert.",
      covProgress: "{d} von {n} geprüft",
      covPaused: "Google Books bremst gerade die Abfragen. Es geht automatisch weiter.",
      covSub: "{c} von {n} Büchern mit ISBN haben ein Cover · {a} aller Bücher",
      covSubPart: "Bisher {c} von {n} Büchern mit ISBN mit Cover gefunden · {a} aller Bücher",
      covPartial: "Abgebrochen nach {d} von {n} – Werte vorläufig.",
      lOl: "Open Library", lGb: "Google Books", lNone: "Kein Cover gefunden", lErr: "Nicht prüfbar (Netzfehler)", lOpen: "Noch offen",
      histT: "Verlauf", hDate: "Stand", hBooks: "Bücher", hIsbn: "mit ISBN", hCover: "mit Cover", hNot: "nicht geprüft",
      tabBestand: "Bestand", tabEmpf: "Empfehlungen", lockAgain: "Sperren",
      eT: "Buchempfehlungen", eP: "Pro Gruppe bis zu vier Bücher aus dem Bestand, jeweils mit einem kurzen Text auf Deutsch und Italienisch.",
      eFind: "Buch aus dem Bestand suchen", eAdd: "Hinzufügen", eFull: "Gruppe voll (4)", eIn: "Schon dabei",
      eThemaDe: "Thema dieser Runde (Deutsch, optional)", eThemaIt: "Thema dieser Runde (Italienisch, optional)",
      eTeaserDe: "Text Deutsch", eTeaserIt: "Text Italienisch", eUp: "Nach oben", eDown: "Nach unten", eRemove: "Entfernen",
      eMissing: "Nicht im aktuellen Bestand – wird nicht angezeigt.", eEmpty: "Noch keine Bücher in dieser Gruppe. Über die Suche hinzufügen.",
      eHow: "Die heruntergeladene Datei empfehlungen.js im Website-Ordner ersetzen (neben index.html).",
      eDl: "empfehlungen.js herunterladen", eReset: "Entwurf verwerfen", eResetSure: "Wirklich verwerfen?",
      eSaved: "Entwurf im Browser gespeichert · {n} Bücher in {g} Gruppen", eNoResults: "Kein Treffer im Bestand.",
      tabInfo: "Info",
      iHoursT: "Öffnungszeiten", iHoursP: "Pro Wochentag bis zu zwei Zeiträume. Ohne Zeitraum gilt der Tag als geschlossen.",
      iClosed: "geschlossen", iFrom: "von", iTo: "bis", iAddRange: "Zeitraum hinzufügen", iDelRange: "Zeitraum entfernen",
      iCopy: "Zeiten vom Montag auf Dienstag bis Freitag übertragen",
      iNoteT: "Hinweis (optional)", iNoteP: "Erscheint im Fenster „Öffnungszeiten“, z. B. „Ausleihe nur mit Schülerausweis“.",
      iCloT: "Ferien und Abwesenheiten", iCloP: "An diesen Tagen zeigt die Website „geschlossen“. Vergangene Einträge blenden sich auf der Website von selbst aus.",
      iFerien: "Ferien", iAbw: "Abwesenheit", iVon: "Erster Tag", iBis: "Letzter Tag (leer = nur ein Tag)",
      iPhFerien: "z. B. Herbstferien", iPhAbw: "Bibliothek geschlossen", iPhFerienIt: "es. Vacanze autunnali", iPhAbwIt: "Biblioteca chiusa",
      iAddFerien: "+ Ferien", iAddAbw: "+ Abwesenheit", iClean: "Vergangene entfernen", iDel: "Eintrag entfernen",
      iNoDate: "Erster Tag fehlt – wird nicht veröffentlicht.", iBadRange: "Letzter Tag liegt vor dem ersten.", iPast: "Vorbei – wird nicht mehr angezeigt.",
      iNone: "Keine Einträge.", iHow: "Die heruntergeladene Datei info.js im Website-Ordner ersetzen (neben index.html).",
      iDl: "info.js herunterladen", iSaved: "Entwurf im Browser gespeichert", iIncomplete: "{n} unvollständige Angaben werden nicht veröffentlicht",
      wd_mo: "Montag", wd_di: "Dienstag", wd_mi: "Mittwoch", wd_do: "Donnerstag", wd_fr: "Freitag", wd_sa: "Samstag",
      g_mittelstufe: "Mittelstufe", g_oberstufe: "Oberstufe", "g_erw-roman": "Erwachsene · Romane", "g_erw-sach": "Erwachsene · Sachbücher", "g_erw-bio": "Erwachsene · Biografien & Geschichte",
      t_leser: "Leserinnen und Leser", t_lesergruppen: "Gruppenzuordnungen", t_ausleihen: "Laufende Ausleihen",
      t_historie: "Ausleihhistorie", t_vormerkungen: "Vormerkungen", t_gebuehren: "Gebührenbuchungen", t_ausgaben: "Ausgaben",
      t_umlauf: "Umlaufdaten", t_benutzer: "Programm-Benutzer (mit Passwörtern)", t_sitzungen: "Anmeldesitzungen (IP-Adressen)",
      t_termine: "Termine", t_klienten: "Klienten", t_rechnungen: "Rechnungen", t_besucher: "Besucherzählung",
      t_dateien: "Dateiverknüpfungen", t_bewertungen: "Bewertungen", t_favoriten: "Favoriten",
    },
    it: {
      current: "Pubblicato ora: {n} libri, aggiornato al {d}",
      currentNone: "Nessun elenco ancora pubblicato.",
      dropT: "Scegli il database",
      dropP: "Trascina qui il file WinBIAP (.winbook) o tocca per sceglierlo.",
      loadingLib: "Caricamento del modulo di lettura …",
      reading: "Lettura e pulizia del database …",
      errNotSqlite: "Questo non è un database SQLite. Scegli il file .winbook di WinBIAP.",
      errNotLib: "Il file è un database SQLite, ma non di una biblioteca (manca la tabella «books»).",
      errLib: "Impossibile caricare il modulo di lettura (assets/vendor/sql-asm.js).",
      errOther: "Impossibile leggere il file: {m}",
      takenT: "Inclusi",
      takenP: "libri nell'elenco pubblico",
      records: "Record nel database",
      nonBook: "Altri media esclusi (DVD, CD, audiolibri …)",
      gone: "Titoli eliminati o dismessi",
      merged: "Copie multiple unificate",
      withIsbn: "Titoli con ISBN (copertina possibile)",
      diff: "Rispetto all'elenco attuale",
      diffV: "+{a} nuovi · −{r} rimossi",
      removedT: "Esclusi: dati personali e di prestito",
      loanCols: "Campi di prestito nella tabella dei libri (stato, lettore, classe, date)",
      loanColsV: "{n} campi",
      namedLoans: "Voci di libri con nomi di lettori",
      noneFound: "Nessun dato personale trovato",
      checkOk: "Verifica superata: nessun nome presente nell'archivio lettori compare nell'elenco pubblico. Lo stato dei prestiti non viene pubblicato.",
      checkWarn: "{n} titoli contengono un nome presente anche nell'archivio lettori – probabilmente autori omonimi. Controlla nell'anteprima.",
      checkRemoved: "{n} denominazioni di collocazione o categoria contenevano il nome di un lettore e sono state rimosse.",
      checkNoReaders: "Nessun archivio lettori nel database. Lo stato dei prestiti non viene pubblicato.",
      publishT: "Pubblicare",
      howto: "Sostituisci il file books.js nella cartella del sito (accanto a index.html) con quello scaricato. L'elenco mostrerà poi il nuovo catalogo.",
      download: "Scarica books.js",
      preview: "Vedi anteprima",
      again: "Carica un altro file",
      footer: "Biblioteca della Scuola Germanica di Milano · Gestione",
      toList: "Vai all'elenco dei libri",
      covT: "Copertura delle copertine",
      covRun: "Verifica copertura",
      covRerun: "Verifica di nuovo",
      covStop: "Annulla",
      covIsbn: "Il {p} dei libri ha un ISBN. Solo questi possono avere una copertina; quanti la abbiano davvero lo mostra la verifica.",
      covHint: "Verifica tutti gli ISBN: prima Open Library con richieste raggruppate, poi Google Books uno per uno e con pause. Richiede alcuni minuti. Il risultato viene salvato in books.js.",
      covProgress: "{d} di {n} verificati",
      covPaused: "Google Books sta rallentando le richieste. Si riprende automaticamente.",
      covSub: "{c} di {n} libri con ISBN hanno una copertina · {a} di tutti i libri",
      covSubPart: "Finora trovata la copertina per {c} di {n} libri con ISBN · {a} di tutti i libri",
      covPartial: "Interrotto dopo {d} di {n} – valori provvisori.",
      lOl: "Open Library", lGb: "Google Books", lNone: "Nessuna copertina trovata", lErr: "Non verificabile (errore di rete)", lOpen: "Ancora da verificare",
      histT: "Andamento", hDate: "Data", hBooks: "Libri", hIsbn: "con ISBN", hCover: "con copertina", hNot: "non verificato",
      tabBestand: "Catalogo", tabEmpf: "Consigli", lockAgain: "Blocca",
      eT: "Consigli di lettura", eP: "Per ogni gruppo fino a quattro libri del catalogo, ciascuno con un breve testo in tedesco e in italiano.",
      eFind: "Cerca un libro nel catalogo", eAdd: "Aggiungi", eFull: "Gruppo completo (4)", eIn: "Già presente",
      eThemaDe: "Tema di questa selezione (tedesco, facoltativo)", eThemaIt: "Tema di questa selezione (italiano, facoltativo)",
      eTeaserDe: "Testo tedesco", eTeaserIt: "Testo italiano", eUp: "Su", eDown: "Giù", eRemove: "Rimuovi",
      eMissing: "Non presente nel catalogo attuale – non verrà mostrato.", eEmpty: "Nessun libro in questo gruppo. Aggiungilo con la ricerca.",
      eHow: "Sostituisci il file empfehlungen.js nella cartella del sito (accanto a index.html) con quello scaricato.",
      eDl: "Scarica empfehlungen.js", eReset: "Scarta la bozza", eResetSure: "Scartare davvero?",
      eSaved: "Bozza salvata nel browser · {n} libri in {g} gruppi", eNoResults: "Nessun risultato nel catalogo.",
      tabInfo: "Info",
      iHoursT: "Orari di apertura", iHoursP: "Per ogni giorno fino a due fasce orarie. Senza fascia il giorno risulta chiuso.",
      iClosed: "chiusa", iFrom: "dalle", iTo: "alle", iAddRange: "Aggiungi fascia oraria", iDelRange: "Rimuovi fascia oraria",
      iCopy: "Copia gli orari del lunedì da martedì a venerdì",
      iNoteT: "Avviso (facoltativo)", iNoteP: "Compare nella finestra «Orari di apertura», ad es. «Prestito solo con tessera studente».",
      iCloT: "Vacanze e assenze", iCloP: "In questi giorni il sito indica «chiusa». Le voci passate scompaiono dal sito da sole.",
      iFerien: "Vacanze", iAbw: "Assenza", iVon: "Primo giorno", iBis: "Ultimo giorno (vuoto = un solo giorno)",
      iPhFerien: "es. Herbstferien", iPhAbw: "Bibliothek geschlossen", iPhFerienIt: "es. Vacanze autunnali", iPhAbwIt: "Biblioteca chiusa",
      iAddFerien: "+ Vacanze", iAddAbw: "+ Assenza", iClean: "Rimuovi voci passate", iDel: "Rimuovi voce",
      iNoDate: "Manca il primo giorno – non verrà pubblicato.", iBadRange: "L'ultimo giorno precede il primo.", iPast: "Passato – non viene più mostrato.",
      iNone: "Nessuna voce.", iHow: "Sostituisci il file info.js nella cartella del sito (accanto a index.html) con quello scaricato.",
      iDl: "Scarica info.js", iSaved: "Bozza salvata nel browser", iIncomplete: "{n} dati incompleti non verranno pubblicati",
      wd_mo: "lunedì", wd_di: "martedì", wd_mi: "mercoledì", wd_do: "giovedì", wd_fr: "venerdì", wd_sa: "sabato",
      g_mittelstufe: "Livello intermedio", g_oberstufe: "Livello superiore", "g_erw-roman": "Adulti · Romanzi", "g_erw-sach": "Adulti · Saggistica", "g_erw-bio": "Adulti · Biografie e storia",
      t_leser: "Lettrici e lettori", t_lesergruppen: "Assegnazioni ai gruppi", t_ausleihen: "Prestiti in corso",
      t_historie: "Storico dei prestiti", t_vormerkungen: "Prenotazioni", t_gebuehren: "Registrazioni di tariffe", t_ausgaben: "Distribuzioni",
      t_umlauf: "Dati di circolazione", t_benutzer: "Utenti del programma (con password)", t_sitzungen: "Sessioni di accesso (indirizzi IP)",
      t_termine: "Appuntamenti", t_klienten: "Clienti", t_rechnungen: "Fatture", t_besucher: "Conteggio visitatori",
      t_dateien: "Collegamenti a file", t_bewertungen: "Valutazioni", t_favoriten: "Preferiti",
    },
  });

  const cur = window.DSM_BIBLIOTHEK;
  // Alte Vorschauen verwerfen, damit index.html#vorschau nur zeigt, was in dieser Sitzung entsteht
  try { ["dsm-vorschau", "dsm-vorschau-empf", "dsm-vorschau-info"].forEach(k => localStorage.removeItem(k)); } catch (e) { /* */ }

  // Reiter und Sperre
  document.querySelectorAll(".tabs [data-tab]").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".tabs [data-tab]").forEach(x => x.setAttribute("aria-selected", String(x === b)));
    ["bestand", "empf", "info"].forEach(t => { $("#tab-" + t).hidden = b.dataset.tab !== t; });
    if (b.dataset.tab === "empf") renderEditor();
    if (b.dataset.tab === "info") renderInfo();
  }));
  $("#lock-btn").addEventListener("click", () => window.DSM_ADMIN_LOCK && window.DSM_ADMIN_LOCK());
  const drop = $("#drop"), input = $("#file"), status = $("#status"), statusText = $("#statusText"), err = $("#error"), report = $("#report");
  let result = null, stand = null, cov = null, survey = null;

  function showCurrent() {
    $("#current").textContent = cur && cur.buecher ? D.t("current", { n: D.nf(cur.buecher.length), d: D.df(cur.stand) }) : D.t("currentNone");
  }

  // sql.js (asm.js-Build, kein WebAssembly nötig) erst bei Bedarf laden
  let sqlPromise = null;
  function loadSql() {
    if (sqlPromise) return sqlPromise;
    sqlPromise = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "assets/vendor/sql-asm.js";
      s.onload = () => window.initSqlJs().then(res, rej);
      s.onerror = () => { sqlPromise = null; rej(Object.assign(new Error("lib"), { code: "lib" })); };
      document.head.appendChild(s);
    });
    return sqlPromise;
  }

  function setStatus(key) { status.hidden = !key; statusText.dataset.i18n = key || ""; statusText.textContent = key ? D.t(key) : ""; }
  function fail(key, vars) { setStatus(null); err.hidden = false; err.dataset.key = key; err.dataset.vars = JSON.stringify(vars || {}); err.textContent = D.t(key, vars); drop.hidden = false; }

  async function handle(file) {
    if (!file) return;
    err.hidden = true; report.hidden = true; drop.hidden = true;
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const sig = new TextDecoder().decode(buf.subarray(0, 15));
      if (sig !== "SQLite format 3") return fail("errNotSqlite");
      setStatus("loadingLib");
      const SQL = await loadSql();
      setStatus("reading");
      await new Promise(r => setTimeout(r, 30)); // Statusanzeige zeichnen lassen
      const db = new SQL.Database(buf);
      try { result = window.DSMExtract.extract(db); } finally { db.close(); }
      stand = new Date().toLocaleDateString("sv-SE"); // JJJJ-MM-TT, lokales Datum
      if (survey) survey.stop();
      survey = null; cov = null;
      try { localStorage.setItem("dsm-vorschau", JSON.stringify({ stand, anzahl: result.books.length, buecher: result.books })); } catch (e) { /* Vorschau nicht möglich */ }
      setStatus(null);
      show();
    } catch (e) {
      if (e && e.code === "not_library_db") return fail("errNotLib");
      if (e && e.code === "lib") return fail("errLib");
      fail("errOther", { m: (e && e.message) || String(e) });
    } finally {
      input.value = "";
    }
  }

  const keyOf = b => (b.t + "|" + ((b.a && b.a[0]) || "")).toLowerCase();
  function show() {
    if (!result) return;
    const r = result.report;
    $("#r-books").textContent = D.nf(r.books);
    const li = (label, value) => `<li><span class="ui">${label}</span><span>${value}</span></li>`;
    const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
    let taken = li(D.t("records"), D.nf(r.records)) + li(D.t("nonBook"), D.nf(r.nonBook));
    if (r.gone) taken += li(D.t("gone"), D.nf(r.gone));
    taken += li(D.t("merged"), D.nf(r.merged)) + li(D.t("withIsbn"), D.nf(r.withIsbn));
    if (cur && cur.buecher) {
      const before = new Set(cur.buecher.map(keyOf)), after = new Set(result.books.map(keyOf));
      let a = 0, rm = 0;
      after.forEach(k => { if (!before.has(k)) a++; });
      before.forEach(k => { if (!after.has(k)) rm++; });
      taken += li(D.t("diff"), D.t("diffV", { a: D.nf(a), r: D.nf(rm) }));
    }
    $("#r-taken").innerHTML = taken;

    const agg = new Map();
    for (const t of r.removedTables) agg.set(t.key, (agg.get(t.key) || 0) + t.rows);
    let removed = "";
    agg.forEach((n, k) => { removed += li(esc(D.t("t_" + k)), D.nf(n)); });
    if (r.loanColumns.length) removed += li(D.t("loanCols"), D.t("loanColsV", { n: D.nf(r.loanColumns.length) }));
    if (r.namedLoans) removed += li(D.t("namedLoans"), D.nf(r.namedLoans));
    $("#r-removed").innerHTML = removed || li(D.t("noneFound"), "–");

    const chk = $("#r-check");
    const hasReaders = r.removedTables.some(t => t.key === "leser");
    let msg = r.nameHits ? D.t("checkWarn", { n: D.nf(r.nameHits) }) : (hasReaders ? D.t("checkOk") : D.t("checkNoReaders"));
    if (r.nameRemoved) msg += " " + D.t("checkRemoved", { n: D.nf(r.nameRemoved) });
    chk.textContent = msg;
    chk.className = "flag ui" + (r.nameHits ? " mid" : "");
    $("#r-howto").textContent = D.t("howto");
    report.hidden = false;
    showCov();
  }

  // Cover-Abdeckung
  const pct = x => new Intl.NumberFormat(D.lang === "it" ? "it-IT" : "de-DE", { style: "percent", maximumFractionDigits: 1 }).format(x || 0);
  function entry() {
    const isbn = result.books.filter(b => b.i).length;
    const e = { stand, buecher: result.books.length, isbn };
    if (cov && cov.done) Object.assign(e, { cover: cov.ol + cov.gb, ol: cov.ol, gb: cov.gb, ohne: cov.none, geprueft: cov.done, vollstaendig: !!cov.complete });
    return e;
  }
  function history() {
    let prev = cur && Array.isArray(cur.verlauf) ? cur.verlauf.slice() : [];
    if (cur && !prev.length && cur.stand && cur.buecher) prev = [{ stand: cur.stand, buecher: cur.buecher.length, isbn: cur.buecher.filter(b => b.i).length }];
    return prev.filter(e => e.stand !== stand).concat([entry()]).slice(-24);
  }
  function showCov() {
    if (!result) return;
    const n = result.books.length, e = entry();
    const segs = { ol: 0, gb: 0, none: 0 };
    let lines = "";
    const li = (sw, label, v) => `<li><span>${sw ? `<span class="sw" style="background:var(${sw})"></span>` : ""}${label}</span><span>${v}</span></li>`;
    if (cov) {
      const tot = cov.total || 1, c = cov.ol + cov.gb;
      $("#c-big").textContent = (cov.complete ? "" : "≥ ") + pct(c / tot);
      $("#c-sub").textContent = D.t(cov.complete ? "covSub" : "covSubPart", { c: D.nf(c), n: D.nf(cov.total), a: pct(c / n) }) +
        (cov.complete ? "" : " · " + (survey ? D.t("covProgress", { d: D.nf(cov.done), n: D.nf(cov.total) }) : D.t("covPartial", { d: D.nf(cov.done), n: D.nf(cov.total) })));
      segs.ol = cov.ol / tot; segs.gb = cov.gb / tot; segs.none = cov.none / tot;
      lines = li("--gruen", D.t("lOl"), D.nf(cov.ol)) + li("--blau", D.t("lGb"), D.nf(cov.gb)) + li("--rot", D.t("lNone"), D.nf(cov.none));
      if (cov.err) lines += li(null, D.t("lErr"), D.nf(cov.err));
      if (cov.total - cov.done > 0) lines += li(null, D.t("lOpen"), D.nf(cov.total - cov.done));
      $("#c-hint").textContent = cov.paused ? D.t("covPaused") : D.t("covHint");
    } else {
      $("#c-big").textContent = pct(e.isbn / n);
      $("#c-sub").textContent = D.t("covIsbn", { p: pct(e.isbn / n) });
      $("#c-hint").textContent = D.t("covHint");
    }
    $("#c-meter").querySelector(".m-ol").style.width = segs.ol * 100 + "%";
    $("#c-meter").querySelector(".m-gb").style.width = segs.gb * 100 + "%";
    $("#c-meter").querySelector(".m-none").style.width = segs.none * 100 + "%";
    $("#c-meter").hidden = !cov;
    $("#c-lines").innerHTML = lines;
    $("#c-run").hidden = !!survey;
    $("#c-stop").hidden = !survey;
    $("#c-run span").textContent = D.t(cov ? "covRerun" : "covRun");
    const h = history().reverse();
    $("#c-hbody").innerHTML = h.map(x => `<tr><td>${D.df(x.stand)}</td><td>${D.nf(x.buecher)}</td><td>${D.nf(x.isbn)} (${pct(x.isbn / x.buecher)})</td>` +
      `<td>${x.cover != null ? `${D.nf(x.cover)} (${pct(x.cover / x.buecher)})${x.vollstaendig ? "" : "*"}` : D.t("hNot")}</td></tr>`).join("");
    $("#c-hist").hidden = false;
  }
  $("#c-run").addEventListener("click", () => {
    if (!result || survey) return;
    survey = window.DSMCovers.survey(result.books, st => { cov = st; showCov(); });
    showCov();
    survey.done.then(() => { survey = null; showCov(); });
  });
  $("#c-stop").addEventListener("click", () => { if (survey) { survey.stop(); } });

  $("#dl").addEventListener("click", () => {
    if (!result) return;
    const e = entry();
    const script = window.DSMExtract.toScript(result, { stand, abdeckung: e, verlauf: history() });
    const url = URL.createObjectURL(new Blob([script], { type: "text/javascript;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "books.js";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });
  $("#again").addEventListener("click", () => { report.hidden = true; drop.hidden = false; err.hidden = true; input.click(); });

  input.addEventListener("change", () => handle(input.files[0]));
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => handle(e.dataTransfer.files[0]));
  addEventListener("dragover", e => e.preventDefault());
  addEventListener("drop", e => e.preventDefault());


  // ---------- Empfehlungen bearbeiten ----------
  const GROUPS = ["mittelstufe", "oberstufe", "erw-roman", "erw-sach", "erw-bio"];
  const DRAFT = "dsm-empf-entwurf";
  const normE = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();
  const keyB = b => normE(b.t) + "|" + normE((b.a && b.a[0]) || "");
  const escE = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const clone = o => JSON.parse(JSON.stringify(o));
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(DRAFT) || "null"); } catch (e) { draft = null; }
  if (!draft || !draft.gruppen) draft = clone(window.DSM_EMPFEHLUNGEN || { gruppen: {} });
  GROUPS.forEach(g => { if (!Array.isArray(draft.gruppen[g])) draft.gruppen[g] = []; });
  if (!draft.thema) draft.thema = { de: "", it: "" };
  let eGroup = "mittelstufe", resetArmed = false;
  const catalog = () => (result ? result.books : (cur && cur.buecher) || []);
  const ICON = {
    up: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3.5 10 8 5.5 12.5 10"/></svg>',
    down: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3.5 6 8 10.5 12.5 6"/></svg>',
    del: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    add: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>',
  };
  let saveT = 0;
  function saveDraft() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(DRAFT, JSON.stringify(draft)); } catch (e) { /* */ }
      stateLine();
    }, 300);
  }
  function stateLine() {
    const n = GROUPS.reduce((a, g) => a + draft.gruppen[g].length, 0), g = GROUPS.filter(x => draft.gruppen[x].length).length;
    $("#e-state").textContent = D.t("eSaved", { n: D.nf(n), g: D.nf(g) });
  }
  function renderEditor() {
    $("#e-thema").querySelectorAll("input").forEach(i => { i.value = draft.thema[i.dataset.f] || ""; });
    $("#e-groups").innerHTML = GROUPS.map(g => `<button type="button" role="radio" data-g="${g}" aria-checked="${g === eGroup}">${escE(D.t("g_" + g))} (${draft.gruppen[g].length})</button>`).join("");
    const keys = new Set(catalog().map(keyB));
    const list = draft.gruppen[eGroup];
    $("#e-list").innerHTML = list.length ? list.map((r, n) => `<div class="rec-ed" data-n="${n}">
        <div class="hd"><span><b>${escE(r.t)}</b><small>${escE(r.a || "")}</small>${keys.has(r.k) ? "" : `<small class="warn">${escE(D.t("eMissing"))}</small>`}</span>
          <span class="ops">
            <button type="button" data-op="up" aria-label="${escE(D.t("eUp"))}"${n === 0 ? " disabled" : ""}>${ICON.up}</button>
            <button type="button" data-op="down" aria-label="${escE(D.t("eDown"))}"${n === list.length - 1 ? " disabled" : ""}>${ICON.down}</button>
            <button type="button" data-op="del" aria-label="${escE(D.t("eRemove"))}">${ICON.del}</button>
          </span></div>
        <label>${escE(D.t("eTeaserDe"))}<textarea data-f="de" rows="3">${escE(r.de || "")}</textarea></label>
        <label>${escE(D.t("eTeaserIt"))}<textarea data-f="it" rows="3">${escE(r.it || "")}</textarea></label>
      </div>`).join("") : `<p class="note">${escE(D.t("eEmpty"))}</p>`;
    findRender();
    stateLine();
  }
  function findRender() {
    const input = $("#e-q"), res = $("#e-res"), fullEl = $("#e-full");
    const list = draft.gruppen[eGroup], full = list.length >= 4;
    // Gruppe voll: Suche gesperrt, Hinweis mittig im Feld
    input.disabled = full; fullEl.hidden = !full; fullEl.textContent = D.t("eFull");
    input.placeholder = full ? "" : D.t("eFind");
    if (full) { input.value = ""; res.innerHTML = ""; return; }
    const q = normE(input.value);
    if (q.length < 2) { res.innerHTML = ""; return; }
    const terms = q.split(" ");
    const hits = catalog().filter(b => { const s = normE([b.t, b.u, (b.a || []).join(" "), (b.i || []).join(" ")].join(" ")); return terms.every(t => s.includes(t)); }).slice(0, 8);
    const have = new Set(list.map(r => r.k));
    // Schon in der Gruppe: ausgegraut, ohne Knopf
    res.innerHTML = hits.length ? hits.map((b, n) => {
      const drin = have.has(keyB(b));
      return `<li${drin ? ' class="drin"' : ""}><span><b>${escE(b.t)}</b><small>${escE((b.a || []).join(", "))}${b.j ? " · " + escE(b.j) : ""}</small></span>
        ${drin ? "" : `<button type="button" class="btn ghost sm" data-add="${n}">${escE(D.t("eAdd"))}</button>`}</li>`;
    }).join("") : `<li><span class="note">${escE(D.t("eNoResults"))}</span></li>`;
    res._hits = hits;
  }
  $("#e-groups").addEventListener("click", e => { const b = e.target.closest("[data-g]"); if (b) { eGroup = b.dataset.g; renderEditor(); } });
  $("#e-q").addEventListener("input", findRender);
  $("#e-res").addEventListener("click", e => {
    const b = e.target.closest("[data-add]"); if (!b) return;
    const book = $("#e-res")._hits[+b.dataset.add];
    if (draft.gruppen[eGroup].length >= 4 || draft.gruppen[eGroup].some(r => r.k === keyB(book))) return;
    draft.gruppen[eGroup].push({ k: keyB(book), t: book.t, a: (book.a || []).join(", "), de: "", it: "" });
    saveDraft(); renderEditor();
    const last = $("#e-list").querySelector(".rec-ed:last-child textarea"); if (last) last.focus();
  });
  $("#e-list").addEventListener("click", e => {
    const b = e.target.closest("[data-op]"); if (!b) return;
    const n = +b.closest(".rec-ed").dataset.n, list = draft.gruppen[eGroup];
    if (b.dataset.op === "del") list.splice(n, 1);
    else { const m = b.dataset.op === "up" ? n - 1 : n + 1; [list[n], list[m]] = [list[m], list[n]]; }
    saveDraft(); renderEditor();
  });
  $("#e-list").addEventListener("input", e => {
    const ta = e.target.closest("textarea"); if (!ta) return;
    draft.gruppen[eGroup][+ta.closest(".rec-ed").dataset.n][ta.dataset.f] = ta.value;
    saveDraft();
  });
  $("#e-thema").addEventListener("input", e => { const i = e.target.closest("input"); if (i) { draft.thema[i.dataset.f] = i.value; saveDraft(); } });
  // Neue Runde (andere Bücher als veröffentlicht): die veröffentlichte Runde wandert vorne ins Archiv.
  // Nur Texte oder Thema geändert: gleiche Runde, Datum und Archiv bleiben.
  function recsOut() {
    const pub = window.DSM_EMPFEHLUNGEN || { gruppen: {} };
    const gruppen = {};
    GROUPS.forEach(g => { gruppen[g] = draft.gruppen[g].map(r => ({ k: r.k, t: r.t, a: r.a, de: (r.de || "").trim(), it: (r.it || "").trim() })); });
    const sig = gr => GROUPS.map(g => ((gr && gr[g]) || []).map(r => r.k).join(",")).join(";");
    const pubHas = !!pub.stand && GROUPS.some(g => ((pub.gruppen && pub.gruppen[g]) || []).length);
    const neu = !pubHas || sig(pub.gruppen) !== sig(gruppen);
    const archiv = Array.isArray(pub.archiv) ? pub.archiv.slice() : [];
    if (neu && pubHas) archiv.unshift(Object.assign({ stand: pub.stand }, pub.thema ? { thema: pub.thema } : {}, { gruppen: pub.gruppen }));
    const out = { stand: neu ? new Date().toLocaleDateString("sv-SE") : pub.stand };
    const thema = { de: (draft.thema.de || "").trim(), it: (draft.thema.it || "").trim() };
    if (thema.de || thema.it) out.thema = thema;
    out.gruppen = gruppen;
    if (archiv.length) out.archiv = archiv.slice(0, 40);
    return out;
  }
  $("#e-dl").addEventListener("click", () => {
    const text = "/* Buchempfehlungen der Bibliothek der Deutschen Schule Mailand. Gepflegt über admin.html – nicht von Hand bearbeiten. */\n" +
      "window.DSM_EMPFEHLUNGEN = " + JSON.stringify(recsOut(), null, 1).replace(/</g, "\\u003c") + ";\n";
    const url = URL.createObjectURL(new Blob([text], { type: "text/javascript;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "empfehlungen.js";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });
  $("#e-prev").addEventListener("click", () => { try { localStorage.setItem("dsm-vorschau-empf", JSON.stringify(recsOut())); } catch (e) { /* */ } });
  $("#e-reset").addEventListener("click", () => {
    const lbl = $("#e-reset span");
    if (!resetArmed) { resetArmed = true; lbl.textContent = D.t("eResetSure"); setTimeout(() => { resetArmed = false; lbl.textContent = D.t("eReset"); }, 4000); return; }
    resetArmed = false; lbl.textContent = D.t("eReset");
    try { localStorage.removeItem(DRAFT); } catch (e) { /* */ }
    draft = clone(window.DSM_EMPFEHLUNGEN || { gruppen: {} });
    GROUPS.forEach(g => { if (!Array.isArray(draft.gruppen[g])) draft.gruppen[g] = []; });
    if (!draft.thema) draft.thema = { de: "", it: "" };
    renderEditor();
  });

  // ---------- Info: Öffnungszeiten, Ferien, Abwesenheiten ----------
  const IDAYS = ["mo", "di", "mi", "do", "fr", "sa"];
  const IDRAFT = "dsm-info-entwurf";
  const HHMM = /^\d{2}:\d{2}$/, YMD = /^\d{4}-\d{2}-\d{2}$/;
  const today = () => new Date().toLocaleDateString("sv-SE");
  function normInfo(x) {
    const o = { zeiten: {}, hinweis: { de: "", it: "" }, schliessungen: [] };
    IDAYS.forEach(k => { o.zeiten[k] = (x && x.zeiten && Array.isArray(x.zeiten[k]) ? x.zeiten[k] : []).slice(0, 2).map(r => [r[0] || "", r[1] || ""]); });
    if (x && x.hinweis) o.hinweis = { de: x.hinweis.de || "", it: x.hinweis.it || "" };
    if (x && Array.isArray(x.schliessungen)) {
      o.schliessungen = x.schliessungen.map(c => ({ art: c.art === "abwesend" ? "abwesend" : "ferien", von: c.von || "", bis: c.bis || "", de: c.de || "", it: c.it || "" }));
    }
    return o;
  }
  let info = null, iResetArmed = false, iSaveT = 0;
  try { info = JSON.parse(localStorage.getItem(IDRAFT) || "null"); } catch (e) { info = null; }
  info = normInfo(info || window.DSM_INFO);
  const okRange = r => HHMM.test(r[0]) && HHMM.test(r[1]) && r[0] < r[1];
  const endOf = c => (c.bis && c.bis >= c.von ? c.bis : c.von);
  function cloProblem(c) {
    if (!YMD.test(c.von)) return "iNoDate";
    if (c.bis && c.bis < c.von) return "iBadRange";
    if (endOf(c) < today()) return "iPast";
    return "";
  }
  function saveInfo() {
    clearTimeout(iSaveT);
    iSaveT = setTimeout(() => { try { localStorage.setItem(IDRAFT, JSON.stringify(info)); } catch (e) { /* */ } infoState(); }, 300);
  }
  function infoState() {
    const bad = IDAYS.reduce((a, k) => a + info.zeiten[k].filter(r => !okRange(r)).length, 0) +
      info.schliessungen.filter(c => !YMD.test(c.von)).length;
    $("#i-state").textContent = D.t("iSaved") + (bad ? " · " + D.t("iIncomplete", { n: D.nf(bad) }) : "");
  }
  function renderHours() {
    $("#i-hours").innerHTML = IDAYS.map(k => {
      const rs = info.zeiten[k];
      return `<div class="day" data-d="${k}"><b>${escE(D.t("wd_" + k))}</b><div class="ranges">` +
        rs.map((r, n) => `<span class="range" data-n="${n}">
          <input type="time" data-f="0" value="${escE(r[0])}" aria-label="${escE(D.t("wd_" + k) + " " + D.t("iFrom"))}"${okRange(r) ? "" : ' aria-invalid="true"'}>
          <span aria-hidden="true">–</span>
          <input type="time" data-f="1" value="${escE(r[1])}" aria-label="${escE(D.t("wd_" + k) + " " + D.t("iTo"))}"${okRange(r) ? "" : ' aria-invalid="true"'}>
          <button type="button" class="mini" data-op="del" aria-label="${escE(D.t("iDelRange"))}">${ICON.del}</button></span>`).join("") +
        (rs.length ? "" : `<span class="zu">${escE(D.t("iClosed"))}</span>`) +
        (rs.length < 2 ? `<button type="button" class="mini" data-op="add" aria-label="${escE(D.t("iAddRange"))}">${ICON.add}</button>` : "") +
        `</div></div>`;
    }).join("") + `<div><button type="button" class="textbtn" id="i-copy">${escE(D.t("iCopy"))}</button></div>`;
  }
  function renderClo() {
    const idx = info.schliessungen.map((c, n) => n)
      .sort((a, b) => { const x = info.schliessungen[a].von || "9", y = info.schliessungen[b].von || "9"; return x < y ? -1 : x > y ? 1 : a - b; });
    $("#i-clo").innerHTML = idx.length ? idx.map(n => {
      const c = info.schliessungen[n], p = cloProblem(c), ab = c.art === "abwesend";
      return `<div class="clo${p === "iPast" ? " vorbei" : ""}" data-n="${n}">
        <div class="hd"><span class="seg2" role="radiogroup">
          <button type="button" role="radio" data-art="ferien" aria-checked="${!ab}">${escE(D.t("iFerien"))}</button>
          <button type="button" role="radio" data-art="abwesend" aria-checked="${ab}">${escE(D.t("iAbw"))}</button></span>
          <button type="button" class="mini" data-op="del" aria-label="${escE(D.t("iDel"))}">${ICON.del}</button></div>
        <div class="dates">
          <label>${escE(D.t("iVon"))}<input type="date" data-f="von" value="${escE(c.von)}"></label>
          <label>${escE(D.t("iBis"))}<input type="date" data-f="bis" value="${escE(c.bis)}"></label></div>
        <div class="texts">
          <label>${escE(D.t("eTeaserDe"))}<input class="txt" data-f="de" value="${escE(c.de)}" placeholder="${escE(D.t(ab ? "iPhAbw" : "iPhFerien"))}"></label>
          <label>${escE(D.t("eTeaserIt"))}<input class="txt" data-f="it" value="${escE(c.it)}" placeholder="${escE(D.t(ab ? "iPhAbwIt" : "iPhFerienIt"))}"></label></div>
        <span class="warn"${p ? "" : " hidden"}>${p ? escE(D.t(p)) : ""}</span>
      </div>`;
    }).join("") : `<p class="note">${escE(D.t("iNone"))}</p>`;
    $("#i-clean").hidden = !info.schliessungen.some(c => cloProblem(c) === "iPast");
  }
  function renderInfo() {
    renderHours();
    $("#i-note-de").value = info.hinweis.de;
    $("#i-note-it").value = info.hinweis.it;
    renderClo();
    infoState();
  }
  $("#i-hours").addEventListener("click", e => {
    if (e.target.closest("#i-copy")) {
      ["di", "mi", "do", "fr"].forEach(k => { info.zeiten[k] = info.zeiten.mo.map(r => r.slice()); });
      saveInfo(); renderHours(); return;
    }
    const b = e.target.closest("[data-op]"); if (!b) return;
    const k = b.closest(".day").dataset.d, rs = info.zeiten[k];
    if (b.dataset.op === "add") rs.push(rs.length ? [rs[0][1] || "", ""] : ["08:00", "13:00"]);
    else rs.splice(+b.closest(".range").dataset.n, 1);
    saveInfo(); renderHours();
    const inp = $(`#i-hours .day[data-d="${k}"] .range:last-of-type input`); if (inp && b.dataset.op === "add") inp.focus();
  });
  $("#i-hours").addEventListener("input", e => {
    const inp = e.target.closest("input[type=time]"); if (!inp) return;
    const r = info.zeiten[inp.closest(".day").dataset.d][+inp.closest(".range").dataset.n];
    r[+inp.dataset.f] = inp.value;
    inp.closest(".range").querySelectorAll("input").forEach(x => { if (okRange(r)) x.removeAttribute("aria-invalid"); else x.setAttribute("aria-invalid", "true"); });
    saveInfo();
  });
  ["de", "it"].forEach(l => $("#i-note-" + l).addEventListener("input", e => { info.hinweis[l] = e.target.value; saveInfo(); }));
  function addClo(art) {
    info.schliessungen.push({ art, von: "", bis: "", de: "", it: "" });
    saveInfo(); renderClo();
    const n = info.schliessungen.length - 1, inp = $(`#i-clo .clo[data-n="${n}"] input[data-f="von"]`);
    if (inp) inp.focus();
  }
  $("#i-add-ferien").addEventListener("click", () => addClo("ferien"));
  $("#i-add-abw").addEventListener("click", () => addClo("abwesend"));
  $("#i-clean").addEventListener("click", () => {
    info.schliessungen = info.schliessungen.filter(c => cloProblem(c) !== "iPast");
    saveInfo(); renderClo();
  });
  $("#i-clo").addEventListener("click", e => {
    const box = e.target.closest(".clo"); if (!box) return;
    const n = +box.dataset.n, c = info.schliessungen[n];
    const art = e.target.closest("[data-art]"), del = e.target.closest("[data-op=del]");
    if (del) { info.schliessungen.splice(n, 1); saveInfo(); renderClo(); return; }
    if (art && c.art !== art.dataset.art) { c.art = art.dataset.art; saveInfo(); renderClo(); }
  });
  $("#i-clo").addEventListener("input", e => {
    const inp = e.target.closest("input[data-f]"); if (!inp) return;
    const box = inp.closest(".clo"), c = info.schliessungen[+box.dataset.n];
    c[inp.dataset.f] = inp.value;
    // Warnung an Ort und Stelle aktualisieren, ohne neu zu zeichnen (sonst geht beim Datumtippen der Fokus verloren)
    const p = cloProblem(c), w = box.querySelector(".warn");
    w.hidden = !p; w.textContent = p ? D.t(p) : "";
    box.classList.toggle("vorbei", p === "iPast");
    $("#i-clean").hidden = !info.schliessungen.some(x => cloProblem(x) === "iPast");
    saveInfo();
  });
  function infoOut() {
    const zeiten = {};
    IDAYS.forEach(k => { zeiten[k] = info.zeiten[k].filter(okRange).map(r => [r[0], r[1]]).sort(); });
    const schliessungen = info.schliessungen.filter(c => YMD.test(c.von))
      .map(c => ({ art: c.art, von: c.von, bis: endOf(c), de: c.de.trim(), it: c.it.trim() }))
      .sort((a, b) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0));
    return { stand: today(), zeiten, hinweis: { de: info.hinweis.de.trim(), it: info.hinweis.it.trim() }, schliessungen };
  }
  $("#i-dl").addEventListener("click", () => {
    const text = "/* Öffnungszeiten, Ferien und Abwesenheiten der Bibliothek der Deutschen Schule Mailand. Gepflegt über admin.html – nicht von Hand bearbeiten. */\n" +
      "window.DSM_INFO = " + JSON.stringify(infoOut(), null, 1).replace(/</g, "\\u003c") + ";\n";
    const url = URL.createObjectURL(new Blob([text], { type: "text/javascript;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "info.js";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });
  $("#i-prev").addEventListener("click", () => { try { localStorage.setItem("dsm-vorschau-info", JSON.stringify(infoOut())); } catch (e) { /* */ } });
  $("#i-reset").addEventListener("click", () => {
    const lbl = $("#i-reset span");
    if (!iResetArmed) { iResetArmed = true; lbl.textContent = D.t("eResetSure"); setTimeout(() => { iResetArmed = false; lbl.textContent = D.t("eReset"); }, 4000); return; }
    iResetArmed = false; lbl.textContent = D.t("eReset");
    try { localStorage.removeItem(IDRAFT); } catch (e) { /* */ }
    info = normInfo(window.DSM_INFO);
    renderInfo();
  });

  D.onLang(() => {
    showCurrent();
    if (!$("#tab-empf").hidden) renderEditor();
    if (!$("#tab-info").hidden) renderInfo();
    if (statusText.dataset.i18n) statusText.textContent = D.t(statusText.dataset.i18n);
    if (!err.hidden && err.dataset.key) err.textContent = D.t(err.dataset.key, JSON.parse(err.dataset.vars || "{}"));
    if (!report.hidden) show();
  });
  showCurrent();
})();
