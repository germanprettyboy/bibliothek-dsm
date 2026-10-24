/* Texts of tab "Pflege" for the exports (Excel, CSV), the table view buttons and printing (print.jsx).
   The list names and hints (m_*, mh_*) and column names (c*) stay in strings.js. */
import { addStrings } from "@/lib/language";

addStrings({
  de: {
    mxDl: "Herunterladen", mxXlsx: "Excel-Tabelle (.xlsx)", mxCsv: "CSV-Datei (.csv)", mxPdf: "PDF-Datei (.pdf)",
    mxPdfHint: "Im Druckfenster als Ziel „Als PDF speichern“ wählen.",
    mxTable: "In Tabelle ansehen", mxAllTable: "Alle Daten als Tabelle", mxAllDl: "Alle Listen herunterladen",
    mxFirst: "Die ersten {s} von {n} – alle in der Tabelle und beim Herunterladen.",
    mxShelfThis: "Standort „{l}“", mxShelfAll: "Alle Standorte",
    mxGroup: "Bereich", mxCount: "Einträge", mxHint: "Hinweis", mxOverview: "Übersicht", mxLib: "Bibliothek DSM",
    mxDoc: "Fehlerliste", mxShelfDoc: "Standortliste", mxAsOf: "Stand {d}", mxEntries: "{n} Einträge", mxCopiesN: "{n} Exemplare",
    prT: "Fehlerliste drucken",
    prP: "Welche Listen sollen auf das Papier? Die Vorschau zeigt den Anfang der ersten Seite.",
    prPick: "Listen wählen", prChosen: "{n} von {m} Listen · {r} Einträge", prNone: "Keine Liste gewählt.",
    prAll: "Alle", prClear: "Keine", prGo: "Drucken", prPreview: "Vorschau", prBib: "Bibliothek",
    prFooter: "Bibliothek der Deutschen Schule Mailand · Verwaltung", prPrinted: "gedruckt am {d}", prDone: "Erledigt",
  },
  it: {
    mxDl: "Scarica", mxXlsx: "Tabella Excel (.xlsx)", mxCsv: "File CSV (.csv)", mxPdf: "File PDF (.pdf)",
    mxPdfHint: "Nella finestra di stampa scelga come destinazione «Salva come PDF».",
    mxTable: "Vedi in tabella", mxAllTable: "Tutti i dati in tabella", mxAllDl: "Scarica tutte le liste",
    mxFirst: "I primi {s} di {n} – tutti nella tabella e nel file scaricato.",
    mxShelfThis: "Collocazione «{l}»", mxShelfAll: "Tutte le collocazioni",
    mxGroup: "Ambito", mxCount: "Voci", mxHint: "Nota", mxOverview: "Panoramica", mxLib: "Biblioteca DSM",
    mxDoc: "Elenco errori", mxShelfDoc: "Elenco per collocazione", mxAsOf: "Aggiornato al {d}", mxEntries: "{n} voci", mxCopiesN: "{n} esemplari",
    prT: "Stampa elenco errori",
    prP: "Quali liste stampare? L'anteprima mostra l'inizio della prima pagina.",
    prPick: "Scegli le liste", prChosen: "{n} di {m} liste · {r} voci", prNone: "Nessuna lista scelta.",
    prAll: "Tutte", prClear: "Nessuna", prGo: "Stampa", prPreview: "Anteprima", prBib: "Biblioteca",
    prFooter: "Biblioteca della Scuola Germanica di Milano · Amministrazione", prPrinted: "stampato il {d}", prDone: "Fatto",
  },
});
