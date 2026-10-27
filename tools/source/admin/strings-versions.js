/* Texts of the local version history ("Frühere Versionen", publish.jsx + versions.js) */
import { addStrings } from "@/lib/language";

addStrings({
  de: {
    verLocal: "Auf diesem Computer", verServer: "Auf der Website",
    verLoading: "Wird geladen …", verNone: "Auf diesem Computer noch keine früheren Versionen.",
    verNoDb: "Dieser Browser speichert keine früheren Versionen (privates Fenster oder gesperrte Website-Daten).",
    verPublished: "veröffentlicht", verOpened: "beim Öffnen", verDownloaded: "heruntergeladen", verRestoredBadge: "wiederhergestellt",
    verCurrent: "aktuell",
    verBooks: "{n} Bücher · Stand {d}",
    verInfoAnn: "Banner: {s} · {n} Einträge", verInfoNote: "Hinweis: {s} · {n} Einträge", verInfo: "{n} Einträge",
    verRecs: "Runde vom {d}, {n} Bücher",
    verRestoredLive: "Version vom {d} wiederhergestellt – {f} ist online.",
    verRestoredFolder: "Version vom {d} wiederhergestellt – {f} im Ordner „{o}“ gespeichert.",
    verRestoredDl: "Version vom {d} wiederhergestellt – {f} wurde heruntergeladen. Bitte in den Website-Ordner legen.",
    verParseErr: "Diese Version lässt sich nicht lesen ({m}) – nichts geändert.",
  },
  it: {
    verLocal: "Su questo computer", verServer: "Sul sito",
    verLoading: "Caricamento …", verNone: "Su questo computer ancora nessuna versione precedente.",
    verNoDb: "Questo browser non salva versioni precedenti (finestra privata o dati del sito bloccati).",
    verPublished: "pubblicata", verOpened: "all'apertura", verDownloaded: "scaricata", verRestoredBadge: "ripristinata",
    verCurrent: "attuale",
    verBooks: "{n} libri · aggiornato al {d}",
    verInfoAnn: "Banner: {s} · {n} voci", verInfoNote: "Avviso: {s} · {n} voci", verInfo: "{n} voci",
    verRecs: "Turno del {d}, {n} libri",
    verRestoredLive: "Versione del {d} ripristinata – {f} è online.",
    verRestoredFolder: "Versione del {d} ripristinata – {f} salvato nella cartella «{o}».",
    verRestoredDl: "Versione del {d} ripristinata – {f} è stato scaricato. Lo metta nella cartella del sito.",
    verParseErr: "Questa versione non è leggibile ({m}) – nulla è cambiato.",
  },
});
