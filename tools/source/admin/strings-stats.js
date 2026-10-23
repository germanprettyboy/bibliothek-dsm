/* Texts of the tab "Statistik" (stats.jsx, charts.jsx), German/Italian. Prefix "st". */
import { addStrings } from "@/lib/language";

addStrings({
  de: {
    stEmpty: "Noch keine Bücher. Zuerst im Tab „Bestand“ die WinBIAP-Datei einlesen.",
    stHintT: "Mehr nach dem Einlesen",
    stHintP: "Nach dem Einlesen der WinBIAP-Datei (Tab Bestand) erscheinen hier auch Fehler- und Zugangsstatistiken.",
    stToCatalog: "Zum Tab Bestand",
    stTable: "Als Tabelle", stTableHide: "Tabelle ausblenden",
    stCount: "Anzahl", stShare: "Anteil",

    stKpiT: "Auf einen Blick",
    stKBooks: "Bücher in der Liste", stKCopies: "Exemplare in WinBIAP", stKIsbn: "mit ISBN", stKCover: "mit Cover",
    stKOpen: "Pflegeeinträge", stKLatest: "zuletzt erfasst", stKCats: "Kategorien", stKOf: "{n} Bücher",

    stProbT: "Wo stecken die meisten Fehler?",
    stProbP: "{n} Einträge in {k} Pflegelisten. Ein Balken öffnet den Tab Pflege.",
    stProbNone: "Keine Einträge in den Pflegelisten.",
    stProbGo: "{label}: {n} Einträge, im Tab Pflege ansehen",
    stList: "Liste", stGroup: "Bereich",

    stRateT: "Wo lohnt sich das Aufräumen zuerst?",
    stRateP: "Anteil der Exemplare mit mindestens einem Pflegeeintrag. Insgesamt {p} ({n} von {m}).",
    stRateMin: "Nur Werte mit mindestens {n} Exemplaren.",
    stByCat: "Kategorie", stByLoc: "Standort", stDim: "Aufteilen nach",
    stOf: "{n} von {m}", stNoCat: "Ohne Kategorie", stNoLoc: "Ohne Standort", stCopies: "Exemplare", stBad: "mit Eintrag",

    stAgeT: "Wie alt ist der Bestand?",
    stAgeP: "Median {y}: die Hälfte der Bücher ist älter.", stAgeNone: "{n} ohne Erscheinungsjahr.",
    stBin: "Gruppierung", stDecades: "Jahrzehnte", stFive: "5 Jahre", stBefore: "vor {y}", stMedian: "Median {y}",
    stBooks: "Bücher", stBooksN: "{n} Bücher", stYears: "Erschienen",

    stAcqT: "Wie viele Exemplare kommen pro Jahr dazu?",
    stAcqP: "Im Schnitt {n} pro Jahr ({from}–{to}).", stAcqNow: "{y} bisher: {n}.", stAcqNone: "{n} ohne Zugangsdatum.",
    stAdded: "Zugänge", stTrend: "Trend", stYear: "Jahr", stAddedN: "{n} Zugänge",

    stCatT: "Welche Kategorien sind am größten?",
    stCatP: "Die {k} größten Kategorien haben {p} der Bücher.", stOther: "Weitere ({n})", stCategory: "Kategorie",

    stCovT: "Wie viele Bücher haben ein Cover?",
    stCovP: "{p} der Bücher mit Cover.", stCovOpen: "Cover noch nicht geprüft: Tab Cover.", stCovRun: "Prüfung läuft …",
    stEkz: "Cover von ekz", stOl: "Cover von Open Library", stOtherSrc: "Cover aus anderer Quelle", stNoCover: "ISBN, kein Cover",
    stUnchecked: "ISBN, nicht geprüft", stNoIsbn: "Ohne ISBN", stOfAll: "der Bücher",

    stHistT: "Wie hat sich die Liste entwickelt?",
    stHistP: "{n} Veröffentlichungen seit {d}. Seitdem {delta} Bücher.",
    stSBooks: "Bücher", stSIsbn: "mit ISBN", stSCover: "mit Cover", stDate: "Datum",

    stLocT: "Welche Standorte brauchen Pflege?",
    stLocP: "Exemplare mit Pflegeeintrag je Standort und Bereich, die {k} auffälligsten Standorte.",
    stLocCell: "{loc}, {g}: {n} von {m} Exemplaren",
    stLow: "wenige", stHigh: "viele", stLocation: "Standort",
  },
  it: {
    stEmpty: "Ancora nessun libro. Prima importare il file WinBIAP nella scheda «Catalogo».",
    stHintT: "Di più dopo l'importazione",
    stHintP: "Dopo l'importazione del file WinBIAP (scheda Catalogo) qui compaiono anche le statistiche su errori e acquisizioni.",
    stToCatalog: "Alla scheda Catalogo",
    stTable: "Come tabella", stTableHide: "Nascondi tabella",
    stCount: "Numero", stShare: "Quota",

    stKpiT: "In sintesi",
    stKBooks: "Libri nell'elenco", stKCopies: "Esemplari in WinBIAP", stKIsbn: "con ISBN", stKCover: "con copertina",
    stKOpen: "Voci da sistemare", stKLatest: "ultima registrazione", stKCats: "Categorie", stKOf: "{n} libri",

    stProbT: "Dove si trovano più errori?",
    stProbP: "{n} voci in {k} elenchi di manutenzione. Una barra apre la scheda Cura.",
    stProbNone: "Nessuna voce negli elenchi di manutenzione.",
    stProbGo: "{label}: {n} voci, vedere nella scheda Cura",
    stList: "Elenco", stGroup: "Ambito",

    stRateT: "Da dove conviene iniziare a sistemare?",
    stRateP: "Quota di esemplari con almeno una voce di manutenzione. In totale {p} ({n} su {m}).",
    stRateMin: "Solo valori con almeno {n} esemplari.",
    stByCat: "Categoria", stByLoc: "Collocazione", stDim: "Suddividi per",
    stOf: "{n} su {m}", stNoCat: "Senza categoria", stNoLoc: "Senza collocazione", stCopies: "Esemplari", stBad: "con voce",

    stAgeT: "Quanto è vecchio il patrimonio?",
    stAgeP: "Mediana {y}: metà dei libri è più vecchia.", stAgeNone: "{n} senza anno di pubblicazione.",
    stBin: "Raggruppamento", stDecades: "Decenni", stFive: "5 anni", stBefore: "prima del {y}", stMedian: "Mediana {y}",
    stBooks: "Libri", stBooksN: "{n} libri", stYears: "Pubblicazione",

    stAcqT: "Quanti esemplari si aggiungono ogni anno?",
    stAcqP: "In media {n} all'anno ({from}–{to}).", stAcqNow: "{y} finora: {n}.", stAcqNone: "{n} senza data di acquisizione.",
    stAdded: "Acquisizioni", stTrend: "Tendenza", stYear: "Anno", stAddedN: "{n} acquisizioni",

    stCatT: "Quali categorie sono le più grandi?",
    stCatP: "Le {k} categorie più grandi contengono {p} dei libri.", stOther: "Altre ({n})", stCategory: "Categoria",

    stCovT: "Quanti libri hanno una copertina?",
    stCovP: "{p} dei libri con copertina.", stCovOpen: "Copertine non ancora verificate: scheda Copertine.", stCovRun: "Verifica in corso …",
    stEkz: "Copertina da ekz", stOl: "Copertina da Open Library", stOtherSrc: "Copertina da altra fonte", stNoCover: "ISBN, nessuna copertina",
    stUnchecked: "ISBN, non verificato", stNoIsbn: "Senza ISBN", stOfAll: "dei libri",

    stHistT: "Come si è sviluppato l'elenco?",
    stHistP: "{n} pubblicazioni dal {d}. Da allora {delta} libri.",
    stSBooks: "Libri", stSIsbn: "con ISBN", stSCover: "con copertina", stDate: "Data",

    stLocT: "Quali collocazioni richiedono manutenzione?",
    stLocP: "Esemplari con voce di manutenzione per collocazione e ambito, le {k} collocazioni più critiche.",
    stLocCell: "{loc}, {g}: {n} su {m} esemplari",
    stLow: "pochi", stHigh: "molti", stLocation: "Collocazione",
  },
});
