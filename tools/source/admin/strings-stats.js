/* Texts of the tab "Statistik" (stats.jsx, charts.jsx), German/Italian. Prefix "st". */
import { addStrings } from "@/lib/language";

addStrings({
  de: {
    stEmpty: "Noch keine Bücher. Zuerst im Tab „Bestand“ die WinBook-Datei einlesen.",
    stHintT: "Mehr nach dem Einlesen",
    stHintP: "Nach dem Einlesen der WinBook-Datei (Tab Bestand) erscheinen hier auch Fehlerstatistiken.",
    stToCatalog: "Zum Tab Bestand",
    stTable: "Als Tabelle", stTableHide: "Tabelle ausblenden",
    stCount: "Anzahl", stShare: "Anteil",

    stKpiT: "Auf einen Blick",
    stKBooks: "Bücher in der Liste", stKCopies: "Exemplare in WinBook", stKIsbn: "mit ISBN", stKCover: "mit Cover",
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
    stAgeP: "Median {y}: die Hälfte der Bücher ist älter.",
    stAgeHidden: "Nicht im Diagramm: {list}.", stAgeOld: "{n} vor {y}", stAgeNone: "{n} ohne Erscheinungsjahr",
    stBin: "Gruppierung", stYearly: "Jahre", stFive: "5 Jahre", stBefore: "vor {y}", stMedian: "Median {y}",
    stBooks: "Bücher", stBooksN: "{n} Bücher", stYears: "Erschienen",

    stCatT: "Welche Kategorien sind am größten?",
    stCatP: "Die {k} größten Kategorien haben {p} der Bücher.", stOther: "Weitere ({n})", stCategory: "Kategorie",

    stCovT: "Wie viele Bücher haben ein Cover?",
    stCovP: "{p} der Bücher mit Cover.", stCovOpen: "Cover noch nicht geprüft: Tab Cover.", stCovRun: "Prüfung läuft …",
    stEkz: "Cover von ekz", stOl: "Cover von Open Library", stOtherSrc: "Cover aus anderer Quelle", stNoCover: "ISBN, kein Cover",
    stUnchecked: "ISBN, nicht geprüft", stNoIsbn: "Ohne ISBN",

    stLocT: "Welche Standorte brauchen Pflege?",
    stLocP: "Exemplare mit Pflegeeintrag je Standort und Bereich, die {k} auffälligsten Standorte.",
    stLocCell: "{loc}, {g}: {n} von {m} Exemplaren",
    stLow: "wenige", stHigh: "viele", stLocation: "Standort",
  },
  it: {
    stEmpty: "Ancora nessun libro. Prima importare il file WinBook nella scheda «Catalogo».",
    stHintT: "Di più dopo l'importazione",
    stHintP: "Dopo l'importazione del file WinBook (scheda Catalogo) qui compaiono anche le statistiche sugli errori.",
    stToCatalog: "Alla scheda Catalogo",
    stTable: "Come tabella", stTableHide: "Nascondi tabella",
    stCount: "Numero", stShare: "Quota",

    stKpiT: "In sintesi",
    stKBooks: "Libri nell'elenco", stKCopies: "Esemplari in WinBook", stKIsbn: "con ISBN", stKCover: "con copertina",
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
    stAgeP: "Mediana {y}: metà dei libri è più vecchia.",
    stAgeHidden: "Non nel grafico: {list}.", stAgeOld: "{n} prima del {y}", stAgeNone: "{n} senza anno di pubblicazione",
    stBin: "Raggruppamento", stYearly: "Anni", stFive: "5 anni", stBefore: "prima del {y}", stMedian: "Mediana {y}",
    stBooks: "Libri", stBooksN: "{n} libri", stYears: "Pubblicazione",

    stCatT: "Quali categorie sono le più grandi?",
    stCatP: "Le {k} categorie più grandi contengono {p} dei libri.", stOther: "Altre ({n})", stCategory: "Categoria",

    stCovT: "Quanti libri hanno una copertina?",
    stCovP: "{p} dei libri con copertina.", stCovOpen: "Copertine non ancora verificate: scheda Copertine.", stCovRun: "Verifica in corso …",
    stEkz: "Copertina da ekz", stOl: "Copertina da Open Library", stOtherSrc: "Copertina da altra fonte", stNoCover: "ISBN, nessuna copertina",
    stUnchecked: "ISBN, non verificato", stNoIsbn: "Senza ISBN",

    stLocT: "Quali collocazioni richiedono manutenzione?",
    stLocP: "Esemplari con voce di manutenzione per collocazione e ambito, le {k} collocazioni più critiche.",
    stLocCell: "{loc}, {g}: {n} su {m} esemplari",
    stLow: "pochi", stHigh: "molti", stLocation: "Collocazione",
  },
});
