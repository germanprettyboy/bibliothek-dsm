/* Texts of the database import (tab "Bestand") and of the tab "Cover" (German/Italian). */
import { addStrings } from "@/lib/language";

addStrings({
  de: {
    imDoneT: "Upload erfolgreich",
    imDoneP: "{f} · {n} Bücher übernommen",
    imStep: "Schritt {i} von {n}",
    cvEmptyT: "Noch keine Bücherliste",
    cvEmptyP: "Die Cover-Abdeckung lässt sich prüfen, sobald eine Bücherliste veröffentlicht oder im Tab „Bestand“ eine WinBIAP-Datenbank geladen ist.",
    cvEmptyGo: "Zum Bestand",
    cvRing: "{p} der Bücher mit ISBN haben ein Cover",
    cvRingIsbn: "{p} der Bücher haben eine ISBN",
  },
  it: {
    imDoneT: "Caricamento riuscito",
    imDoneP: "{f} · {n} libri acquisiti",
    imStep: "Passo {i} di {n}",
    cvEmptyT: "Ancora nessun elenco di libri",
    cvEmptyP: "La copertura delle copertine si può verificare non appena è pubblicato un elenco di libri o è caricato un database WinBIAP nella scheda «Catalogo».",
    cvEmptyGo: "Vai al catalogo",
    cvRing: "Il {p} dei libri con ISBN ha una copertina",
    cvRingIsbn: "Il {p} dei libri ha un ISBN",
  },
});
