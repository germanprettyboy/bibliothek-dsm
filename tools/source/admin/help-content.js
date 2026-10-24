/* Content of the help page (help.jsx) as data, German and Italian with the same structure and ids.
   Section: { id, title, intro, blocks?, items? }; item (accordion article/question): { id, title, blocks }.
   Blocks: "text" = paragraph; { h } = subheading; { steps: [text | { t, tab }] } = numbered steps (tab = "Zum Tab" button);
   { list: [text] }; { tip } / { warn } = callouts; { tab } = button to a tab; { pairs: [[term, text]], kind: "terms" | "rules" };
   { about: true } = dates of the published files.
   Inline in texts: [[Name]] = a button or field exactly as it appears on screen, {{Key}} = keyboard key. */

export const HELP = {
  de: [
    {
      id: "start",
      title: "Erste Schritte",
      intro: "Was die Verwaltung macht und wie ein Durchgang abläuft.",
      blocks: [
        "Die Verwaltung erzeugt die drei Dateien der öffentlichen Bücherliste: den Bestand (books.js), die Buchempfehlungen (recommendations.js) sowie Öffnungszeiten, Ferien und Banner (info.js). Die Bücherliste aktualisiert sich nicht von selbst – den Bestand übertragen Sie von Hand aus WinBook, am besten einmal im Monat.",
        { h: "Die Tabs im Überblick" },
        {
          list: [
            "[[Bestand]]: WinBook-Datei einlesen, Bericht prüfen, italienische Kategorienamen ergänzen, veröffentlichen.",
            "[[Cover]]: Cover-Abdeckung prüfen und falsche Cover ausblenden.",
            "[[Pflege]]: Listen, was in WinBook korrigiert werden sollte, Inventurlisten und automatische Korrekturen. Die Listen werden nicht veröffentlicht.",
            "[[Statistik]]: Diagramme zum Bestand.",
            "[[Empfehlungen]]: Buchtipps für fünf Lesergruppen.",
            "[[Info]]: Öffnungszeiten, Ferien, Hinweis, Kontakt und Banner.",
          ],
        },
        { h: "Die monatliche Routine" },
        {
          steps: [
            { t: "WinBook-Datei kopieren: WinBook auf allen Computern schließen, dann die .winbook-Datei auf einen USB-Stick kopieren. Nur kopieren – nie verschieben, nie umbenennen." },
            { t: "Bestand einlesen: Im Tab „Bestand“ auf [[Datenbank auswählen]] klicken und die Datei wählen. Den Bericht prüfen: Die Zahl der Bücher bleibt ungefähr gleich, bei „entfallen“ steht eine kleine Zahl.", tab: "catalog" },
            { t: "Cover prüfen: Im Tab „Cover“ auf [[Cover-Abdeckung prüfen]] klicken (einige Minuten) und falsche Cover ausblenden.", tab: "covers" },
            { t: "Pflegen: Im Tab „Pflege“ eine oder zwei Listen abarbeiten und die Fehler in WinBook korrigieren.", tab: "care" },
            { t: "Veröffentlichen: Mit [[Vorschau ansehen]] kontrollieren, dann [[Veröffentlichen]]. Zum Schluss [[Sperren]] und die Kopie der WinBook-Datei löschen.", tab: "catalog" },
          ],
        },
        { warn: "Die WinBook-Datei enthält Schülerdaten. Die Verwaltung liest sie nur in diesem Browser und lädt sie nie hoch. Die Datei nicht per E-Mail, Messenger oder Cloud weitergeben und die Kopie nach Gebrauch löschen." },
        { tip: "{{/}} springt in die Suche dieser Hilfe, {{Esc}} schließt sie." },
      ],
    },
    {
      id: "howto",
      title: "Anleitungen",
      intro: "Schritt für Schritt durch die wichtigsten Aufgaben.",
      items: [
        {
          id: "update",
          title: "Bestand aktualisieren",
          blocks: [
            {
              steps: [
                "WinBook auf allen Computern beenden und die .winbook-Datei auf einen USB-Stick kopieren (Rechtsklick, Kopieren, Einfügen – nicht mit der Maus ziehen).",
                "Im Tab „Bestand“ auf [[Datenbank auswählen]] klicken oder die Datei auf die Fläche ziehen. Die Datei wird nur im Browser gelesen, nicht hochgeladen.",
                "Warten, bis „Lesemodul wird geladen …“ und „Datenbank wird gelesen und bereinigt …“ durch sind. Auf älteren Computern dauert das bis zu einer Minute.",
                "Den Bericht prüfen: „Übernommen“ nennt die Zahl der Bücher, „Gegenüber der aktuellen Liste“ die neuen und entfallenen Titel – [[Titel anzeigen]] klappt sie auf. Unten sollte „Abgleich bestanden“ stehen.",
                "[[Vorschau ansehen]] öffnet die Bücherliste mit dem neuen Bestand in einem neuen Tab.",
                "[[Veröffentlichen]] klicken.",
              ],
            },
            { warn: "Fallen Hunderte Titel weg, ist es vermutlich die falsche Datei (Demo-Datenbank, leere Datenbank, alte Kopie). Dann nicht veröffentlichen, sondern die Datei neu kopieren." },
            { tab: "catalog" },
          ],
        },
        {
          id: "covers",
          title: "Cover-Abdeckung prüfen und falsche Cover ausblenden",
          blocks: [
            "Cover gibt es nur über die ISBN aus WinBook: zuerst vom ekz-Bibliotheksservice, für die übrigen von Open Library. Ohne ISBN zeigt die Website einen gestalteten Platzhalter.",
            {
              steps: [
                "Im Tab „Cover“ auf [[Cover-Abdeckung prüfen]] klicken.",
                "Warten, bis „… von … geprüft“ durchgelaufen ist – je nach Bestand einige Minuten bis etwa eine Viertelstunde. Den Tab so lange offen lassen.",
                "Das Ergebnis zeigt, wie viele Bücher mit ISBN ein Cover haben, aufgeteilt nach ekz-Bibliotheksservice, Open Library, „Kein Cover gefunden“ und „Nicht prüfbar (Netzfehler)“.",
                "Danach veröffentlichen: Das Ergebnis wird mit books.js gespeichert und im Verlauf fortgeführt.",
              ],
            },
            { tip: "[[Abbrechen]] ist erlaubt. Die Werte gelten dann als vorläufig und sind im Verlauf mit * markiert." },
            { h: "Falsches Cover ausblenden" },
            {
              steps: [
                "Im Feld [[Buch suchen (Titel, Autor, ISBN)]] das Buch suchen.",
                "[[Cover ansehen]] zeigt das Bild mit seiner Quelle.",
                "Ist es falsch: [[Ausblenden]]. Auf der Website erscheint dann der Platzhalter. [[Wieder anzeigen]] macht das rückgängig.",
                "Mit books.js veröffentlichen.",
              ],
            },
            { tab: "covers" },
          ],
        },
        {
          id: "catit",
          title: "Italienische Kategorienamen",
          blocks: [
            "Die Kategorien kommen auf Deutsch aus WinBook. Für die italienische Seite gibt es eine Übersetzungsliste; neue Kategorien ohne Übersetzung erscheinen dort auf Deutsch.",
            {
              steps: [
                "Fehlt eine Übersetzung, zeigt der Tab „Bestand“ den Kasten [[Kategorien auf Italienisch]].",
                "Bei jeder Kategorie den italienischen Namen eintragen. Leere Felder bleiben deutsch.",
                "Die Namen werden mit books.js veröffentlicht – ein eigener Schritt ist nicht nötig.",
              ],
            },
            { tab: "catalog" },
          ],
        },
        {
          id: "care",
          title: "Pflegelisten nutzen",
          blocks: [
            "Beim Einlesen entstehen im Tab „Pflege“ Listen mit allem, was in WinBook korrigiert werden sollte – jeweils mit der Nummer in WinBook, damit Sie den Eintrag schnell finden. Die Listen werden nicht veröffentlicht.",
            {
              list: [
                "[[Für WinBook]]: die Listen in Gruppen (ISBN und Cover, Angaben zum Titel, Exemplare, Stammdaten, Namensprüfung). Ein Klick auf eine Zeile klappt sie auf; darunter steht, was zu tun ist.",
                "Excel und CSV: Über das Download-Menü lassen sich einzelne Listen oder alle Listen als Excel- oder CSV-Datei speichern, zum Sortieren und Abhaken.",
                "Datentabelle: zeigt die Einträge als Tabelle zum Durchsehen, Sortieren und Filtern – ohne etwas herunterzuladen.",
                "Drucken: [[Fehlerliste drucken]] druckt die ausgewählten Listen zum Abarbeiten. Die [[Standortliste für die Inventur]] druckt ein Regal mit der Spalte „Vorhanden“ zum Abhaken.",
                "Automatische Korrekturen: vereinheitlichen nur sichere Fälle, etwa überzählige Leerzeichen oder dieselbe Angabe in mehreren Schreibweisen. Sie wirken nur auf die öffentliche Liste und gehen mit books.js online; die WinBook-Datei wird nie verändert.",
              ],
            },
            { tip: "Nicht alles ist ein Fehler: Bei Sammelbänden fehlt der Autor zu Recht, bei Pseudonymen passt „Nachname, Vorname“ nicht. Die Hinweise unter jeder Liste sagen, wann es so richtig ist." },
            { tab: "care" },
          ],
        },
        {
          id: "recs",
          title: "Empfehlungen zusammenstellen",
          blocks: [
            "Besucherinnen und Besucher wählen beim ersten Besuch eine Gruppe; über der Liste erscheinen dann bis zu vier Bücher mit Cover und einem kurzen Text.",
            {
              steps: [
                "Im Tab „Empfehlungen“ eine der fünf Gruppen wählen: Mittelstufe, Oberstufe, Erwachsene · Romane, Erwachsene · Sachbücher, Erwachsene · Biografien & Geschichte.",
                "Im Feld [[Buch aus dem Bestand suchen]] Titel, Autor oder ISBN tippen und [[Hinzufügen]] klicken. Höchstens vier Bücher pro Gruppe.",
                "Für jedes Buch [[Text Deutsch]] und [[Text Italienisch]] schreiben – zwei, drei Sätze genügen.",
                "Optional ein [[Thema dieser Runde]] eintragen, zum Beispiel „Sommerlektüre“.",
                "[[Vorschau ansehen]], dann [[Veröffentlichen]].",
              ],
            },
            { h: "Runden und Archiv" },
            {
              list: [
                "Werden andere Bücher veröffentlicht, beginnt eine neue Runde. Die bisherige sehen Besucher unter „Bisherige Empfehlungen“. Ändern Sie nur Texte oder das Thema, bleibt es dieselbe Runde.",
                "Im Kasten [[Bisherige Runden]] lassen sich frühere Runden öffnen, ihre Texte ändern oder mit [[Runde löschen]] entfernen.",
                "[[Als aktuelle Runde zurückholen]] (nur bei der neuesten früheren Runde) macht eine versehentlich begonnene Runde rückgängig. Die jetzige aktuelle Runde wird dabei verworfen.",
              ],
            },
            { h: "Ganz ausschalten" },
            {
              list: [
                "Der Schalter [[Empfehlungen auf der Website]] blendet nach dem Veröffentlichen alles aus: keine Empfehlungen über der Liste, keine Frage beim ersten Besuch, kein Abschnitt in den Einstellungen. Bücher, Texte und Runden bleiben gespeichert.",
                "Hat eine Gruppe keine Bücher, sehen Besucher dieser Gruppe einen Hinweis „Gerade keine Empfehlungen“ statt der Bücher.",
              ],
            },
            { tip: "Der Entwurf wird automatisch in diesem Browser gespeichert. [[Entwurf verwerfen]] (zweimal klicken) holt den veröffentlichten Stand zurück." },
            { tab: "recs" },
          ],
        },
        {
          id: "info",
          title: "Öffnungszeiten, Ferien, Hinweis, Kontakt und Banner",
          blocks: [
            {
              steps: [
                "[[Öffnungszeiten]]: pro Wochentag bis zu zwei Zeiträume. Ein Tag ohne Zeitraum gilt als geschlossen. [[Zeiten vom Montag auf Dienstag bis Freitag übertragen]] spart Tipparbeit, überschreibt aber Dienstag bis Freitag.",
                "[[+ Ferien]], [[+ Abwesenheit]] oder [[+ Andere Zeiten]]: ersten und letzten Tag wählen (letzter Tag leer = nur ein Tag) und eine kurze Bezeichnung auf Deutsch und Italienisch eintragen. Bei „Andere Zeiten“ ist die Bibliothek nur zu den dort eingetragenen Zeiten geöffnet, etwa verkürzt vor den Ferien.",
                "[[Hinweis (optional)]]: ein kurzer Satz im Fenster „Öffnungszeiten“. [[Anzeigen ab]] und [[Anzeigen bis]] begrenzen ihn zeitlich.",
                "[[Kontakt]]: E-Mail, Telefon und ein kurzer Text, zum Beispiel Raum und Ansprechperson.",
                "[[Mitteilung (Banner)]]: ein bis zwei Zeilen ganz oben auf der Bücherliste, mit Farbe und optionalem Enddatum. [[Banner entfernen]] löscht ihn.",
                "[[Vorschau ansehen]], dann [[Veröffentlichen]].",
              ],
            },
            { tip: "Vergangene Einträge blendet die Website von selbst aus; [[Vergangene entfernen]] räumt sie im Editor weg. Ob gerade geöffnet ist, rechnet die Website immer in italienischer Zeit." },
            { tab: "info" },
          ],
        },
        {
          id: "publish",
          title: "Veröffentlichen und frühere Versionen wiederherstellen",
          blocks: [
            "Jeder Tab, der etwas veröffentlicht, hat einen Kasten [[Veröffentlichen]]. Der Text darin sagt, welcher Weg genutzt wird:",
            {
              list: [
                "Online (Normalfall, wenn die Verwaltung auf der Website geöffnet ist): Ein Klick speichert die Datei direkt auf der Website – sofort für alle sichtbar. Die Meldung lautet zum Beispiel „info.js ist online, 10:42 Uhr.“",
                "Website-Ordner (Chrome oder Edge am Computer): Ein Klick schreibt die Datei in den Website-Ordner. Beim ersten Mal fragt der Browser nach dem Ordner – den Ordner mit index.html und admin.html wählen und den Zugriff erlauben. [[Anderen Ordner wählen]] wechselt ihn.",
                "Download (andere Browser): Der Knopf lädt die Datei herunter, zum Beispiel [[books.js herunterladen]]. Sie muss genau so heißen und kommt dann auf den Webspace oder an die Betreuung der Website.",
              ],
            },
            { h: "Frühere Versionen wiederherstellen" },
            {
              steps: [
                "Im Kasten „Veröffentlichen“ auf [[Frühere Versionen]] klicken. Die Liste zeigt die zuletzt veröffentlichten Fassungen dieser Datei mit Datum und Uhrzeit.",
                "Bei der gewünschten Fassung [[Wiederherstellen]] klicken und zur Bestätigung noch einmal ([[Wirklich wiederherstellen?]]).",
                "Die Seite mit [[Neu laden]] neu laden.",
              ],
            },
            "Die bisherige Fassung geht dabei nicht verloren: Sie steht danach selbst unter den früheren Versionen. Online bewahrt die Website die letzten 10 Fassungen je Datei auf; zusätzlich merkt sich dieser Browser die Fassungen, die hier veröffentlicht wurden.",
          ],
        },
        {
          id: "preview",
          title: "Vorschau",
          blocks: [
            "[[Vorschau ansehen]] öffnet die Bücherliste in einem neuen Tab mit Ihren noch nicht veröffentlichten Änderungen – Bestand, Empfehlungen oder Öffnungszeiten. Ein gelber Streifen zeigt, dass es eine Vorschau ist. Sie ist nur auf diesem Computer zu sehen.",
            { list: ["Zur Probe ein neu angeschafftes Buch suchen oder die Öffnungszeiten ansehen.", "Danach den Vorschau-Tab schließen und hier veröffentlichen."] },
            { tip: "Die Vorschau zeigt nur, was in dieser Sitzung erzeugt wurde. Die Bücherliste über ein Lesezeichen zeigt immer den veröffentlichten Stand." },
          ],
        },
        {
          id: "lock",
          title: "Sperren und Sitzung (4 Stunden)",
          blocks: [
            {
              list: [
                "[[Sperren]] (das Schloss oben rechts) sperrt die Verwaltung sofort. Danach den Browser-Tab schließen.",
                "Ohne Sperren bleibt die Verwaltung in diesem Browser-Tab entsperrt, auch nach dem Neuladen.",
                "Wurde die Seite länger als 4 Stunden verlassen, fragt sie wieder nach dem Passwort – auch wenn der Browser die Sitzung nach einem Neustart wiederherstellt.",
                "Nach falschen Eingaben wartet die Seite jedes Mal etwas länger.",
              ],
            },
            { warn: "An gemeinsam genutzten Computern immer sperren und das Passwort nie im Browser speichern lassen." },
          ],
        },
      ],
    },
    {
      id: "problems",
      title: "Probleme lösen",
      intro: "Meldungen und Störungen – was dahintersteckt und was hilft.",
      items: [
        {
          id: "nosqlite",
          title: "„Das ist keine SQLite-Datenbank“",
          blocks: [
            "Es wurde die falsche Datei gewählt – zum Beispiel die Datei mit „-journal“ am Ende, eine Verknüpfung oder eine Datei in einem alten Format.",
            { steps: ["Die Datei mit der Endung .winbook wählen.", "Ist die Endung nicht zu sehen: im Windows-Explorer die Dateiendungen einblenden."] },
            "Heißt die Meldung „… aber keine Bibliotheksdatenbank (Tabelle „books“ fehlt)“, stammt die Datei aus einem anderen Programm.",
          ],
        },
        {
          id: "module",
          title: "Das Lesemodul lädt nicht",
          blocks: [
            "Meldung: „Das Lesemodul (assets/vendor/sql-asm.js) konnte nicht geladen werden.“ Meist war die Internetverbindung kurz weg.",
            { steps: ["Internetverbindung prüfen.", "Die Seite mit {{F5}} neu laden und, falls nötig, wieder entsperren.", "Die Datei noch einmal wählen."] },
            "Hilft das nicht, der Betreuung der Website Bescheid geben.",
          ],
        },
        {
          id: "slow",
          title: "Datei zu groß oder Einlesen sehr langsam",
          blocks: [
            "Der Browser liest die ganze Datei im Arbeitsspeicher. Auf älteren Computern dauert das bis zu einer Minute – in dieser Zeit nicht neu laden.",
            {
              list: [
                "Andere Tabs und Programme schließen.",
                "Wenn möglich einen neueren Computer nehmen (Windows 10 oder 11).",
                "Ist die Datei viel größer oder kleiner als sonst, ist es vermutlich die falsche (Demo-Datenbank, alte Kopie).",
                "„Die Datei konnte nicht gelesen werden: …“ heißt meist: Die Kopie ist unvollständig, weil WinBook beim Kopieren noch offen war. WinBook schließen und neu kopieren.",
              ],
            },
          ],
        },
        {
          id: "nocover",
          title: "Cover fehlen",
          blocks: [
            {
              list: [
                "Ohne ISBN gibt es kein Cover, nur den Platzhalter. Die ISBN in WinBook nachtragen (vom Buch abschreiben).",
                "Falsch abgeschriebene ISBN: Die Listen „Ungültige ISBN“ und „ISBN, aber kein Cover gefunden“ im Tab „Pflege“ helfen beim Finden.",
                "Auch mit richtiger ISBN haben ekz und Open Library nicht jedes Bild, besonders bei italienischen, älteren oder kleinen Ausgaben.",
                "„Nicht prüfbar (Netzfehler)“: Das Netz hat die Abfragen unterbrochen. Später [[Erneut prüfen]] klicken oder in einem anderen Netz prüfen.",
              ],
            },
            { tip: "Die Verwaltung ergänzt bewusst keine ISBN von selbst. Nur die ISBN aus WinBook zählt." },
            { tab: "covers" },
          ],
        },
        {
          id: "wrongcover",
          title: "Ein Buch zeigt ein falsches Cover",
          blocks: [
            { steps: ["Im Tab „Cover“ im Kasten [[Falsches Cover ausblenden]] das Buch suchen.", "[[Ausblenden]] klicken.", "Mit books.js veröffentlichen."] },
            "Besser auf Dauer: die ISBN in WinBook prüfen. Haben Bände einer Reihe die ISBN der Gesamtausgabe, zeigen alle dasselbe Cover – die Liste „Gleiche ISBN bei verschiedenen Titeln“ im Tab „Pflege“ findet sie.",
            { tab: "covers" },
          ],
        },
        {
          id: "publishfail",
          title: "Veröffentlichen klappt nicht",
          blocks: [
            {
              list: [
                "„Im Ordner … liegt keine index.html“: Es wurde ein falscher Ordner gewählt. [[Anderen Ordner wählen]] und den Ordner mit index.html und admin.html nehmen.",
                "„Der Browser hat das Speichern nicht erlaubt“: Noch einmal klicken und bei der Frage des Browsers den Zugriff erlauben.",
                "„Speichern hat nicht geklappt: …“: Oft liegt der Website-Ordner auf einem abgezogenen USB-Stick oder Netzlaufwerk. Verbinden und erneut klicken.",
                "„Direkt online speichern ist noch nicht eingerichtet …“, „… darf im Website-Ordner nicht schreiben …“ oder „… geht erst, wenn die Verwaltung neu verschlüsselt und hochgeladen ist“: Auf der Website fehlt noch eine Einrichtung. Die Betreuung der Website informieren; bis dahin speichert der Knopf in den Ordner oder lädt die Datei herunter.",
                "„Die Website hat das Speichern abgelehnt …“: Der Zugang passt nicht zu dieser Verwaltung. Die Betreuung der Website informieren.",
                "„Speichern auf der Website hat nicht geklappt (…)“: Meist eine kurze Verbindungsstörung. Noch einmal versuchen.",
              ],
            },
          ],
        },
        {
          id: "stale",
          title: "Die Website zeigt den alten Stand",
          blocks: [
            {
              list: [
                "Der Browser merkt sich Dateien eine Weile. Mit {{Strg}} + {{F5}} neu laden (Mac: {{Cmd}} + {{Umschalt}} + {{R}}).",
                "Hat das Veröffentlichen eine Erfolgsmeldung gezeigt? Sonst noch einmal veröffentlichen.",
                "Nach einem Download muss die Datei genau books.js heißen (nicht „books (1).js“) und neben index.html liegen.",
              ],
            },
          ],
        },
        {
          id: "names",
          title: "Namen aus der Leserdatei in Titeln",
          blocks: [
            "Die Warnung „… Titel enthalten einen Namen, der auch in der Leserdatei vorkommt“ ist meist harmlos: Eine Autorin oder ein Autor heißt zufällig wie eine Leserin oder ein Leser.",
            { steps: ["Die Liste „Titel mit einem Namen aus der Leserdatei“ im Tab „Pflege“ ansehen.", "Im Zweifel über [[Vorschau ansehen]] prüfen, wie der Titel öffentlich erscheint."] },
            "Kategorien und Standorte mit einem Namen aus der Leserdatei werden automatisch nicht veröffentlicht; sie stehen ebenfalls im Tab „Pflege“ und sollten in WinBook umbenannt werden. Der Ausleihstatus wird nie veröffentlicht.",
            { tab: "care" },
          ],
        },
        {
          id: "dupcat",
          title: "Eine Kategorie erscheint doppelt",
          blocks: [
            "In WinBook steht dieselbe Kategorie in mehreren Schreibweisen – oft nur mit einem Leerzeichen am Ende oder anderer Groß- und Kleinschreibung.",
            {
              list: [
                "Die Liste „Kategorien in mehreren Schreibweisen“ im Tab „Pflege“ nennt sie.",
                "In WinBook zu einem Eintrag zusammenführen; beim nächsten Einlesen ist die Dopplung weg.",
                "Bis dahin können die automatischen Korrekturen die Schreibweise in der öffentlichen Liste vereinheitlichen.",
              ],
            },
            { tab: "care" },
          ],
        },
        {
          id: "banner",
          title: "Der Banner erscheint nicht",
          blocks: [
            {
              list: [
                "Das Datum bei „Anzeigen bis“ ist vorbei. Der Editor zeigt dann „Datum vorbei – der Banner wird nicht mehr angezeigt.“",
                "Das Textfeld ist leer – ohne Text kein Banner.",
                "Die Änderung ist noch nicht veröffentlicht (info.js).",
                "Der Banner wurde in diesem Browser auf der Website geschlossen. Er bleibt geschlossen, bis sich der Text ändert.",
                "Der Browser zeigt noch den alten Stand: neu laden.",
              ],
            },
            { tab: "info" },
          ],
        },
      ],
    },
    {
      id: "faq",
      title: "Fragen & Antworten",
      intro: "Kurze Antworten auf häufige Fragen.",
      items: [
        {
          id: "students",
          title: "Werden Schülerdaten veröffentlicht?",
          blocks: [
            "Nein. In die öffentliche Liste kommen nur Titel, Untertitel, Autor, Verlag, Jahr, ISBN, Kategorie und Standort. Tabellen mit Lesern, Ausleihen, Gebühren, WinBook-Benutzern und Anmeldungen werden nur gezählt. Der Ausleihstatus wird nie gelesen und nie veröffentlicht.",
            "Zusätzlich prüft die Verwaltung, ob ein Name aus der Leserdatei in den öffentlichen Angaben vorkommt.",
          ],
        },
        {
          id: "drafts",
          title: "Wo werden Entwürfe gespeichert?",
          blocks: ["Im Browser dieses Computers – automatisch, ohne Speichern-Knopf. An einem anderen Computer sehen Sie den zuletzt veröffentlichten Stand. Wer den Browserverlauf samt Website-Daten löscht, löscht auch die Entwürfe; Veröffentlichtes ist davon nicht betroffen."],
        },
        {
          id: "lock",
          title: "Was passiert beim Sperren?",
          blocks: ["Die Verwaltung schließt sich und fragt beim nächsten Mal wieder nach dem Passwort. Entwürfe bleiben in diesem Browser erhalten. Eine eingelesene WinBook-Datei ist danach nicht mehr geladen – zum Weiterarbeiten neu einlesen."],
        },
        {
          id: "undo",
          title: "Kann ich etwas rückgängig machen?",
          blocks: [
            {
              list: [
                "Veröffentlichtes: über [[Frühere Versionen]] im Kasten „Veröffentlichen“ wiederherstellen.",
                "Empfehlungen: [[Als aktuelle Runde zurückholen]] macht eine neue Runde rückgängig.",
                "Ausgeblendete Cover: [[Wieder anzeigen]].",
                "Entwürfe: [[Entwurf verwerfen]] holt den veröffentlichten Stand zurück.",
                "Automatische Korrekturen lassen sich vor dem Veröffentlichen wieder zurücknehmen.",
              ],
            },
          ],
        },
        {
          id: "missing",
          title: "Warum fehlt ein Buch?",
          blocks: [
            {
              list: [
                "Nur die Medientypen Buch und Graphic Novel kommen in die Liste. Der Kasten „Medientypen“ im Tab „Pflege“ zeigt, was ausgelassen wurde.",
                "Gelöschte oder ausgeschiedene Exemplare fehlen absichtlich.",
                "Das Buch wurde nach dem letzten Einlesen erfasst: Bestand neu einlesen und veröffentlichen.",
                "Mehrere Exemplare mit gleichem Titel und erstem Autor stehen als ein Eintrag in der Liste.",
              ],
            },
          ],
        },
        {
          id: "often",
          title: "Wie oft sollte ich aktualisieren?",
          blocks: ["Am besten einmal im Monat und nach größeren Neuanschaffungen, mindestens zu Beginn jedes Halbjahres. Öfter schadet nicht: Der Verlauf merkt sich die letzten 24 Aktualisierungen."],
        },
        {
          id: "winbook",
          title: "Warum ändert WinBook nichts, wenn ich hier korrigiere?",
          blocks: ["Die WinBook-Datei wird nur gelesen, nie verändert. Italienische Kategorienamen, ausgeblendete Cover und automatische Korrekturen wirken nur auf die öffentliche Liste. Dauerhaft richtig werden die Daten erst durch die Korrektur in WinBook – beim nächsten Einlesen ist sie dann in der Liste."],
        },
        {
          id: "loan",
          title: "Warum sieht man nicht, ob ein Buch ausgeliehen ist?",
          blocks: ["Wer welches Buch wann hat, sind personenbezogene Daten. Der Ausleihstatus wird deshalb absichtlich nie gelesen und nie veröffentlicht. Ob ein Buch da ist, erfährt man in der Bibliothek."],
        },
        {
          id: "edit",
          title: "Kann ich ein Buch hier hinzufügen oder ändern?",
          blocks: ["Nein. Bücher werden nur in WinBook erfasst, korrigiert oder ausgeschieden. Die nächste Aktualisierung übernimmt die Änderung."],
        },
        {
          id: "two",
          title: "Können zwei Personen gleichzeitig arbeiten?",
          blocks: ["Technisch ja, aber auf der Website gilt immer die zuletzt veröffentlichte Datei, und Entwürfe liegen getrennt auf dem jeweiligen Computer. Bitte absprechen, wer was macht."],
        },
        {
          id: "mobile",
          title: "Geht das auch am Handy oder Tablet?",
          blocks: ["Ja, die Verwaltung funktioniert dort. Für das Einlesen liegt die WinBook-Datei aber meist auf einem USB-Stick – dafür ist ein Computer praktischer. Der Website-Ordner lässt sich nur in Chrome oder Edge am Computer verwenden."],
        },
        {
          id: "browser",
          title: "Welcher Browser funktioniert?",
          blocks: ["Aktuelles Google Chrome, Microsoft Edge, Mozilla Firefox und Safari. Auf Windows 7 laufen Chrome 109 und Firefox 115 in der Regel noch, bekommen aber keine Sicherheits-Updates mehr. Der Internet Explorer funktioniert nicht."],
        },
        {
          id: "internet",
          title: "Braucht man Internet?",
          blocks: ["Zum Öffnen der Verwaltung, für die Cover-Prüfung und zum Veröffentlichen online: ja. Das Einlesen der WinBook-Datei selbst geschieht im Browser, ohne dass Daten übertragen werden."],
        },
        {
          id: "stats",
          title: "Was zeigt der Tab „Statistik“?",
          blocks: ["Diagramme zum aktuellen Bestand – aus der eingelesenen Datei oder, ohne Einlesen, aus der veröffentlichten Liste. Die Statistik dient nur der Übersicht und wird nicht veröffentlicht."],
        },
        {
          id: "mail",
          title: "Darf ich die Dateien per E-Mail schicken?",
          blocks: ["books.js, recommendations.js und info.js ja – sie enthalten nur Buchdaten, Empfehlungstexte und Öffnungszeiten. Die .winbook-Datei nie: Sie enthält Schülerdaten."],
        },
      ],
    },
    {
      id: "practice",
      title: "Gute Praxis",
      intro: "Gewohnheiten, die die Liste aktuell und sauber halten.",
      blocks: [
        {
          kind: "rules",
          pairs: [
            ["Regelmäßig aktualisieren", "Etwa einmal im Monat und nach größeren Neuanschaffungen. Die Liste ist nur so aktuell wie das letzte Einlesen."],
            ["Pflegelisten nach Wirkung abarbeiten", "Zuerst die ISBN (ungültig, fehlend) – jede korrigierte ISBN kann ein Cover bringen. Danach Kategorien und Standorte, zuletzt Schreibweisen."],
            ["Schreibweisen in WinBook vereinheitlichen", "Pro Autor, Verlag, Kategorie und Standort nur eine Schreibweise; Autoren als „Nachname, Vorname“. Das macht Filter und Suche besser."],
            ["Erst prüfen, dann veröffentlichen", "Cover-Prüfung vor dem Veröffentlichen, damit ihr Ergebnis mitgespeichert wird. Und vorher kurz in die Vorschau schauen."],
            ["Empfehlungen pro Halbjahr erneuern", "Eine neue Runde zu Beginn des Halbjahres hält die Startseite lebendig; die alte bleibt unter „Bisherige Empfehlungen“ sichtbar."],
            ["Texte kurz halten", "Zwei bis drei Sätze: Worum geht es, und warum lohnt es sich? Immer auf Deutsch und Italienisch."],
            ["Banner sparsam einsetzen", "Nur für wichtige, zeitlich begrenzte Mitteilungen, mit Enddatum. Ein Banner, das immer da ist, wird übersehen."],
            ["Ferien rechtzeitig eintragen", "Am besten alle Ferien des Schuljahres zu Beginn eintragen und vor jeden Ferien kurz prüfen."],
            ["Passwort nicht weitergeben", "Nur persönlich weitergeben, nicht aufschreiben, nicht im Browser speichern. Nach der Arbeit sperren."],
            ["Nach dem Veröffentlichen kontrollieren", "Die Website öffnen, neu laden und zur Probe ein neues Buch suchen oder die Öffnungszeiten ansehen."],
            ["WinBook-Kopie löschen", "Die Kopie auf dem USB-Stick nach Gebrauch löschen. Sie enthält Schülerdaten."],
          ],
        },
      ],
    },
    {
      id: "terms",
      title: "Begriffe",
      intro: "Fachwörter kurz erklärt.",
      blocks: [
        {
          kind: "terms",
          pairs: [
            ["WinBook", "Das Bibliotheksprogramm der Schule (WinBook 6.0). Es verwaltet Bücher, Leser und Ausleihen; die Verwaltung liest nur eine Kopie seiner Datenbank."],
            [".winbook-Datei", "Die Datenbank von WinBook in einer einzigen Datei. Enthält Schülerdaten und bleibt in der Schule."],
            ["ISBN", "Die 10- oder 13-stellige Buchnummer, meist hinten über dem Strichcode. Über sie wird das Cover gefunden."],
            ["ekz-Bibliotheksservice", "Dienstleister für Bibliotheken; liefert die meisten Cover über die ISBN."],
            ["Open Library", "Freie Online-Bibliothek; zweite Quelle für Cover."],
            ["Cover-Abdeckung", "Anteil der Bücher, für die ein Cover gefunden wurde."],
            ["Kategorie", "Sachgruppe aus WinBook. Grundlage des Kategoriefilters auf der Website."],
            ["Standort", "Wo das Buch steht, zum Beispiel Regal und Brett. Erscheint in der Detailansicht."],
            ["Signatur", "Kennzeichnung eines Exemplars in WinBook für die Aufstellung. Erscheint in den Pflegelisten, nicht auf der Website."],
            ["Exemplar", "Ein einzelnes Buch im Regal. Exemplare mit gleichem Titel und erstem Autor ergeben einen Eintrag in der Liste."],
            ["Medientyp", "Art des Mediums in WinBook. Nur Buch und Graphic Novel kommen in die Liste."],
            ["Leserdatei", "Die Tabelle der Leserinnen und Leser in WinBook. Sie dient nur dem Namensabgleich; nichts daraus wird veröffentlicht."],
            ["books.js", "Datei der öffentlichen Bücherliste mit Cover-Abdeckung, italienischen Kategorienamen und ausgeblendeten Covern."],
            ["recommendations.js", "Datei der Buchempfehlungen mit ihren Texten und den früheren Runden."],
            ["info.js", "Datei mit Öffnungszeiten, Ferien, Abwesenheiten, anderen Zeiten, Hinweis, Kontakt und Banner."],
            ["save.php", "Kleines Programm auf der Website: Es speichert beim Veröffentlichen direkt online und bewahrt frühere Versionen auf."],
            ["Website-Ordner", "Der Ordner mit index.html und admin.html. Ziel beim Veröffentlichen in Chrome oder Edge."],
            ["Webspace", "Der Speicherplatz im Internet, auf dem die Website liegt."],
            ["Entwurf", "Noch nicht veröffentlichte Änderungen, automatisch in diesem Browser gespeichert."],
            ["Runde", "Eine Auswahl von Empfehlungen. Frühere Runden sehen Besucher unter „Bisherige Empfehlungen“."],
            ["Vorschau", "Die Bücherliste mit noch nicht veröffentlichten Änderungen, nur auf diesem Computer."],
            ["CSV / Excel", "Tabellendateien der Pflegelisten zum Öffnen, Sortieren und Abhaken in Excel."],
          ],
        },
      ],
    },
    {
      id: "about",
      title: "Über diese Seite",
      intro: "Stand der Daten, Tastenkürzel und was mit den Daten passiert.",
      blocks: [
        { h: "Stand der veröffentlichten Dateien" },
        { about: true },
        { h: "Tastenkürzel" },
        {
          list: [
            "{{Esc}} schließt die Hilfe und andere Fenster.",
            "{{/}} springt in die Suche dieser Hilfe.",
            "{{Tab}} wechselt zwischen Knöpfen und Feldern, {{Enter}} oder die {{Leertaste}} löst sie aus.",
          ],
        },
        { h: "Was mit den Daten passiert" },
        {
          list: [
            "Die WinBook-Datei wird nur in diesem Browser gelesen und nie hochgeladen.",
            "Öffentlich sind nur Buchdaten, Empfehlungen und Öffnungszeiten – keine Namen, keine Ausleihen.",
            "Entwürfe bleiben in diesem Browser, bis sie veröffentlicht oder verworfen werden.",
            "Cover lädt die Website nur vom ekz-Bibliotheksservice und von Open Library.",
            "Die Verwaltung ist nur mit Passwort zugänglich.",
          ],
        },
      ],
    },
  ],

  it: [
    {
      id: "start",
      title: "Primi passi",
      intro: "Che cosa fa la gestione e come si svolge un aggiornamento.",
      blocks: [
        "La gestione crea i tre file dell'elenco pubblico dei libri: il catalogo (books.js), i consigli di lettura (recommendations.js) e orari, vacanze e banner (info.js). L'elenco non si aggiorna da solo: il catalogo va trasferito a mano da WinBook, idealmente una volta al mese.",
        { h: "Le schede in breve" },
        {
          list: [
            "[[Catalogo]]: leggere il file WinBook, controllare il resoconto, aggiungere i nomi italiani delle categorie, pubblicare.",
            "[[Copertine]]: verificare la copertura delle copertine e nascondere quelle sbagliate.",
            "[[Cura]]: liste di ciò che andrebbe corretto in WinBook, elenchi per l'inventario e correzioni automatiche. Le liste non vengono pubblicate.",
            "[[Statistiche]]: grafici sul catalogo.",
            "[[Consigli]]: suggerimenti di lettura per cinque gruppi di lettori.",
            "[[Info]]: orari di apertura, vacanze, avviso, contatti e banner.",
          ],
        },
        { h: "La routine mensile" },
        {
          steps: [
            { t: "Copiare il file WinBook: chiuda WinBook su tutti i computer, poi copi il file .winbook su una chiavetta USB. Solo copiare – mai spostare, mai rinominare." },
            { t: "Leggere il catalogo: nella scheda «Catalogo» clicchi su [[Scegli il database]] e scelga il file. Controlli il resoconto: il numero dei libri resta più o meno uguale, i «rimossi» sono pochi.", tab: "catalog" },
            { t: "Verificare le copertine: nella scheda «Copertine» clicchi su [[Verifica copertura]] (alcuni minuti) e nasconda le copertine sbagliate.", tab: "covers" },
            { t: "Curare i dati: nella scheda «Cura» elabori una o due liste e corregga gli errori in WinBook.", tab: "care" },
            { t: "Pubblicare: controlli con [[Vedi anteprima]], poi clicchi su [[Pubblica]]. Alla fine clicchi su [[Blocca]] e cancelli la copia del file WinBook.", tab: "catalog" },
          ],
        },
        { warn: "Il file WinBook contiene dati degli studenti. La gestione lo legge solo in questo browser e non lo carica mai in rete. Non lo inoltri per e-mail, messaggistica o cloud e cancelli la copia dopo l'uso." },
        { tip: "{{/}} porta alla ricerca di questo aiuto, {{Esc}} lo chiude." },
      ],
    },
    {
      id: "howto",
      title: "Guide",
      intro: "Le attività principali, passo dopo passo.",
      items: [
        {
          id: "update",
          title: "Aggiornare il catalogo",
          blocks: [
            {
              steps: [
                "Chiuda WinBook su tutti i computer e copi il file .winbook su una chiavetta USB (clic destro, Copia, Incolla – non trascinare con il mouse).",
                "Nella scheda «Catalogo» clicchi su [[Scegli il database]] o trascini il file sull'area. Il file viene letto solo nel browser, non caricato in rete.",
                "Attenda la fine di «Caricamento del modulo di lettura …» e «Lettura e pulizia del database …». Sui computer meno recenti può volerci fino a un minuto.",
                "Controlli il resoconto: «Inclusi» indica il numero dei libri, «Rispetto all'elenco attuale» i titoli nuovi e rimossi – [[Mostra i titoli]] li elenca. In fondo dovrebbe comparire «Verifica superata».",
                "[[Vedi anteprima]] apre l'elenco con il nuovo catalogo in una nuova scheda.",
                "Clicchi su [[Pubblica]].",
              ],
            },
            { warn: "Se spariscono centinaia di titoli, probabilmente è il file sbagliato (database demo, database vuoto, copia vecchia). In tal caso non pubblichi e copi di nuovo il file." },
            { tab: "catalog" },
          ],
        },
        {
          id: "covers",
          title: "Verificare la copertura e nascondere copertine sbagliate",
          blocks: [
            "Le copertine arrivano solo tramite l'ISBN registrato in WinBook: prima da ekz-Bibliotheksservice, per le altre da Open Library. Senza ISBN il sito mostra un segnaposto grafico.",
            {
              steps: [
                "Nella scheda «Copertine» clicchi su [[Verifica copertura]].",
                "Attenda che «… di … verificati» arrivi alla fine – a seconda del catalogo da alcuni minuti a circa un quarto d'ora. Lasci aperta la scheda.",
                "Il risultato mostra quanti libri con ISBN hanno una copertina, suddivisi in ekz-Bibliotheksservice, Open Library, «Nessuna copertina trovata» e «Non verificabile (errore di rete)».",
                "Poi pubblichi: il risultato viene salvato con books.js e prosegue nell'andamento.",
              ],
            },
            { tip: "Si può cliccare su [[Annulla]]. I valori risultano allora provvisori e nell'andamento sono segnati con *." },
            { h: "Nascondere una copertina sbagliata" },
            {
              steps: [
                "Cerchi il libro nel campo [[Cerca un libro (titolo, autore, ISBN)]].",
                "[[Vedi copertina]] mostra l'immagine con la sua fonte.",
                "Se è sbagliata: [[Nascondi]]. Sul sito compare allora il segnaposto. [[Mostra di nuovo]] annulla l'operazione.",
                "Pubblichi con books.js.",
              ],
            },
            { tab: "covers" },
          ],
        },
        {
          id: "catit",
          title: "Nomi italiani delle categorie",
          blocks: [
            "Le categorie arrivano da WinBook in tedesco. Per la pagina italiana esiste un elenco di traduzioni; le nuove categorie senza traduzione vi compaiono in tedesco.",
            {
              steps: [
                "Se manca una traduzione, la scheda «Catalogo» mostra il riquadro [[Categorie in italiano]].",
                "Inserisca il nome italiano per ogni categoria. I campi vuoti restano in tedesco.",
                "I nomi vengono pubblicati con books.js – non serve un passaggio a parte.",
              ],
            },
            { tab: "catalog" },
          ],
        },
        {
          id: "care",
          title: "Usare le liste di manutenzione",
          blocks: [
            "Durante la lettura, nella scheda «Cura» nascono liste di tutto ciò che andrebbe corretto in WinBook – ciascuna voce con il suo numero in WinBook, per trovarla subito. Le liste non vengono pubblicate.",
            {
              list: [
                "[[Per WinBook]]: le liste per gruppi (ISBN e copertine, dati del titolo, esemplari, dati anagrafici, controllo dei nomi). Un clic su una riga la apre; sotto è spiegato che cosa fare.",
                "Excel e CSV: dal menu di download si salvano singole liste o tutte le liste come file Excel o CSV, da ordinare e spuntare.",
                "Tabella dati: mostra le voci in una tabella da consultare, ordinare e filtrare – senza scaricare nulla.",
                "Stampa: l'elenco degli errori si stampa con le liste selezionate, da elaborare con calma. L'[[Elenco per collocazione (inventario)]] stampa uno scaffale con la colonna «Presente» da spuntare.",
                "Correzioni automatiche: uniformano solo casi sicuri, per esempio spazi superflui o lo stesso dato scritto in modi diversi. Valgono solo per l'elenco pubblico e vanno online con books.js; il file WinBook non viene mai modificato.",
              ],
            },
            { tip: "Non tutto è un errore: nelle raccolte l'autore manca a ragione, per gli pseudonimi «Cognome, Nome» non si applica. Le note sotto ogni lista spiegano quando va bene così." },
            { tab: "care" },
          ],
        },
        {
          id: "recs",
          title: "Preparare i consigli di lettura",
          blocks: [
            "Alla prima visita chi consulta il sito sceglie un gruppo; sopra l'elenco compaiono poi fino a quattro libri con copertina e un breve testo.",
            {
              steps: [
                "Nella scheda «Consigli» scelga uno dei cinque gruppi: Livello intermedio, Livello superiore, Adulti · Romanzi, Adulti · Saggistica, Adulti · Biografie e storia.",
                "Nel campo [[Cerca un libro nel catalogo]] digiti titolo, autore o ISBN e clicchi su [[Aggiungi]]. Al massimo quattro libri per gruppo.",
                "Per ogni libro scriva [[Testo tedesco]] e [[Testo italiano]] – bastano due o tre frasi.",
                "Facoltativo: inserisca un [[Tema di questa selezione]], per esempio «Letture estive».",
                "[[Vedi anteprima]], poi [[Pubblica]].",
              ],
            },
            { h: "Turni e archivio" },
            {
              list: [
                "Se si pubblicano altri libri, inizia un nuovo turno. Quello precedente resta visibile ai visitatori in «Consigli precedenti». Se cambiano solo i testi o il tema, il turno resta lo stesso.",
                "Nel riquadro [[Turni precedenti]] si possono aprire i turni passati, modificarne i testi o eliminarli con [[Elimina il turno]].",
                "[[Ripristina come turno attuale]] (solo per il turno precedente più recente) annulla un turno iniziato per errore. Il turno attuale viene scartato.",
              ],
            },
            { h: "Disattivare del tutto" },
            {
              list: [
                "L'interruttore [[Consigli sul sito]] nasconde tutto dopo la pubblicazione: nessun consiglio sopra l'elenco, nessuna domanda alla prima visita, nessuna sezione nelle impostazioni. Libri, testi e turni restano salvati.",
                "Se un gruppo non ha libri, chi l'ha scelto vede l'avviso «Al momento nessun consiglio» al posto dei libri.",
              ],
            },
            { tip: "La bozza viene salvata automaticamente in questo browser. [[Scarta la bozza]] (due clic) ripristina lo stato pubblicato." },
            { tab: "recs" },
          ],
        },
        {
          id: "info",
          title: "Orari, vacanze, avviso, contatti e banner",
          blocks: [
            {
              steps: [
                "[[Orari di apertura]]: per ogni giorno fino a due fasce orarie. Un giorno senza fascia risulta chiuso. [[Copia gli orari del lunedì da martedì a venerdì]] fa risparmiare tempo, ma sovrascrive da martedì a venerdì.",
                "[[+ Vacanze]], [[+ Assenza]] o [[+ Altri orari]]: scelga il primo e l'ultimo giorno (ultimo vuoto = un solo giorno) e inserisca una breve descrizione in tedesco e in italiano. Con «Altri orari» la biblioteca è aperta solo negli orari indicati, per esempio con orario ridotto prima delle vacanze.",
                "[[Avviso (facoltativo)]]: una breve frase nella finestra «Orari di apertura». [[Visibile dal]] e [[Visibile fino al]] ne limitano il periodo.",
                "[[Contatti]]: e-mail, telefono e un breve testo, per esempio aula e referente.",
                "[[Avviso (banner)]]: una o due righe in cima all'elenco dei libri, con colore e data di fine facoltativa. [[Rimuovi il banner]] lo elimina.",
                "[[Vedi anteprima]], poi [[Pubblica]].",
              ],
            },
            { tip: "Le voci passate scompaiono dal sito da sole; [[Rimuovi voci passate]] le toglie anche dall'editor. Il sito calcola sempre «aperta/chiusa» con l'ora italiana." },
            { tab: "info" },
          ],
        },
        {
          id: "publish",
          title: "Pubblicare e ripristinare versioni precedenti",
          blocks: [
            "Ogni scheda che pubblica qualcosa ha un riquadro [[Pubblica]]. Il testo al suo interno indica quale via viene usata:",
            {
              list: [
                "Online (caso normale, quando la gestione è aperta sul sito): un clic salva il file direttamente sul sito – subito visibile a tutti. Il messaggio è per esempio «info.js è online dalle 10:42.»",
                "Cartella del sito (Chrome o Edge su computer): un clic scrive il file nella cartella del sito. La prima volta il browser chiede la cartella – scelga quella con index.html e admin.html e consenta l'accesso. [[Scegli un'altra cartella]] la cambia.",
                "Download (altri browser): il pulsante scarica il file, per esempio [[Scarica books.js]]. Il file deve chiamarsi esattamente così e va poi caricato sul webspace o consegnato a chi cura il sito.",
              ],
            },
            { h: "Ripristinare versioni precedenti" },
            {
              steps: [
                "Nel riquadro «Pubblica» clicchi su [[Versioni precedenti]]. L'elenco mostra le ultime versioni pubblicate di questo file con data e ora.",
                "Clicchi su [[Ripristina]] accanto alla versione desiderata e, per confermare, ancora una volta ([[Ripristinare davvero?]]).",
                "Ricarichi la pagina con [[Ricarica]].",
              ],
            },
            "La versione sostituita non va persa: compare a sua volta tra le versioni precedenti. Online il sito conserva le ultime 10 versioni di ogni file; inoltre questo browser ricorda le versioni pubblicate da qui.",
          ],
        },
        {
          id: "preview",
          title: "Anteprima",
          blocks: [
            "[[Vedi anteprima]] apre l'elenco dei libri in una nuova scheda con le modifiche non ancora pubblicate – catalogo, consigli o orari. Una striscia gialla indica che si tratta di un'anteprima. È visibile solo su questo computer.",
            { list: ["Per prova cerchi un libro appena acquistato o controlli gli orari.", "Poi chiuda la scheda dell'anteprima e pubblichi qui."] },
            { tip: "L'anteprima mostra solo ciò che è stato creato in questa sessione. L'elenco aperto da un segnalibro mostra sempre lo stato pubblicato." },
          ],
        },
        {
          id: "lock",
          title: "Bloccare e sessione (4 ore)",
          blocks: [
            {
              list: [
                "[[Blocca]] (il lucchetto in alto a destra) blocca subito la gestione. Poi chiuda la scheda del browser.",
                "Senza blocco la gestione resta sbloccata in questa scheda, anche dopo averla ricaricata.",
                "Se la pagina è stata lasciata per più di 4 ore, chiede di nuovo la password – anche se il browser ripristina la sessione dopo un riavvio.",
                "Dopo inserimenti errati la pagina attende ogni volta un po' di più.",
              ],
            },
            { warn: "Sui computer condivisi blocchi sempre la gestione e non lasci mai salvare la password nel browser." },
          ],
        },
      ],
    },
    {
      id: "problems",
      title: "Risolvere problemi",
      intro: "Messaggi e malfunzionamenti – che cosa significano e che cosa aiuta.",
      items: [
        {
          id: "nosqlite",
          title: "«Questo non è un database SQLite»",
          blocks: [
            "È stato scelto il file sbagliato – per esempio quello che termina con «-journal», un collegamento o un file in un formato vecchio.",
            { steps: ["Scelga il file con estensione .winbook.", "Se l'estensione non si vede: in Esplora risorse di Windows attivi la visualizzazione delle estensioni."] },
            "Se il messaggio dice «… ma non di una biblioteca (manca la tabella «books»)», il file proviene da un altro programma.",
          ],
        },
        {
          id: "module",
          title: "Il modulo di lettura non si carica",
          blocks: [
            "Messaggio: «Impossibile caricare il modulo di lettura (assets/vendor/sql-asm.js).» Di solito la connessione a internet si è interrotta per un attimo.",
            { steps: ["Controlli la connessione a internet.", "Ricarichi la pagina con {{F5}} e, se necessario, la sblocchi di nuovo.", "Scelga di nuovo il file."] },
            "Se non basta, avvisi chi cura il sito.",
          ],
        },
        {
          id: "slow",
          title: "File troppo grande o lettura molto lenta",
          blocks: [
            "Il browser legge l'intero file in memoria. Sui computer meno recenti può volerci fino a un minuto – nel frattempo non ricarichi la pagina.",
            {
              list: [
                "Chiuda altre schede e programmi.",
                "Se possibile usi un computer più recente (Windows 10 o 11).",
                "Se il file è molto più grande o più piccolo del solito, probabilmente è quello sbagliato (database demo, copia vecchia).",
                "«Impossibile leggere il file: …» di solito significa che la copia è incompleta perché WinBook era ancora aperto. Chiuda WinBook e copi di nuovo il file.",
              ],
            },
          ],
        },
        {
          id: "nocover",
          title: "Mancano le copertine",
          blocks: [
            {
              list: [
                "Senza ISBN non c'è copertina, solo il segnaposto. Inserisca l'ISBN in WinBook (copiandolo dal libro).",
                "ISBN trascritto male: le liste «ISBN non valido» e «ISBN, ma nessuna copertina trovata» nella scheda «Cura» aiutano a trovarlo.",
                "Anche con l'ISBN giusto ekz e Open Library non hanno tutte le immagini, soprattutto per edizioni italiane, vecchie o piccole.",
                "«Non verificabile (errore di rete)»: la rete ha interrotto le richieste. Più tardi clicchi su [[Verifica di nuovo]] o verifichi da un'altra rete.",
              ],
            },
            { tip: "La gestione non completa mai un ISBN da sola. Conta solo l'ISBN registrato in WinBook." },
            { tab: "covers" },
          ],
        },
        {
          id: "wrongcover",
          title: "Un libro mostra una copertina sbagliata",
          blocks: [
            { steps: ["Nella scheda «Copertine», riquadro [[Nascondi una copertina sbagliata]], cerchi il libro.", "Clicchi su [[Nascondi]].", "Pubblichi con books.js."] },
            "Meglio a lungo termine: controlli l'ISBN in WinBook. Se i volumi di una serie hanno l'ISBN dell'opera completa, mostrano tutti la stessa copertina – la lista «Stesso ISBN per titoli diversi» nella scheda «Cura» li trova.",
            { tab: "covers" },
          ],
        },
        {
          id: "publishfail",
          title: "La pubblicazione non riesce",
          blocks: [
            {
              list: [
                "«Nella cartella … non c'è index.html»: è stata scelta una cartella sbagliata. Clicchi su [[Scegli un'altra cartella]] e prenda quella con index.html e admin.html.",
                "«Il browser non ha consentito il salvataggio»: clicchi di nuovo e consenta l'accesso quando il browser lo chiede.",
                "«Salvataggio non riuscito: …»: spesso la cartella del sito si trova su una chiavetta USB scollegata o su un'unità di rete. La ricolleghi e clicchi di nuovo.",
                "«Il salvataggio online diretto non è ancora configurato …», «… save.php non può scrivere nella cartella del sito …» o «… funzionerà quando la gestione sarà cifrata di nuovo e caricata»: sul sito manca ancora una configurazione. Informi chi cura il sito; nel frattempo il pulsante salva nella cartella o scarica il file.",
                "«Il sito ha rifiutato il salvataggio …»: l'accesso non corrisponde a questa gestione. Informi chi cura il sito.",
                "«Salvataggio sul sito non riuscito (…)»: di solito un breve problema di connessione. Riprovi.",
              ],
            },
          ],
        },
        {
          id: "stale",
          title: "Il sito mostra ancora la versione vecchia",
          blocks: [
            {
              list: [
                "Il browser conserva i file per un po'. Ricarichi con {{Ctrl}} + {{F5}} (Mac: {{Cmd}} + {{Maiusc}} + {{R}}).",
                "La pubblicazione ha mostrato un messaggio di successo? Altrimenti pubblichi di nuovo.",
                "Dopo un download il file deve chiamarsi esattamente books.js (non «books (1).js») e trovarsi accanto a index.html.",
              ],
            },
          ],
        },
        {
          id: "names",
          title: "Nomi dell'archivio lettori nei titoli",
          blocks: [
            "L'avviso «… titoli contengono un nome presente anche nell'archivio lettori» di solito è innocuo: un'autrice o un autore ha per caso lo stesso nome di una lettrice o di un lettore.",
            { steps: ["Consulti la lista «Titoli con un nome dell'archivio lettori» nella scheda «Cura».", "Nel dubbio verifichi con [[Vedi anteprima]] come appare il titolo pubblicamente."] },
            "Categorie e collocazioni con un nome dell'archivio lettori non vengono mai pubblicate; compaiono anch'esse nella scheda «Cura» e andrebbero rinominate in WinBook. Lo stato dei prestiti non viene mai pubblicato.",
            { tab: "care" },
          ],
        },
        {
          id: "dupcat",
          title: "Una categoria compare due volte",
          blocks: [
            "In WinBook la stessa categoria è scritta in modi diversi – spesso solo con uno spazio finale o con maiuscole e minuscole diverse.",
            {
              list: [
                "La lista «Categorie scritte in più modi» nella scheda «Cura» le elenca.",
                "Le unisca in WinBook in un'unica voce; alla lettura successiva il doppione sparisce.",
                "Nel frattempo le correzioni automatiche possono uniformare la grafia nell'elenco pubblico.",
              ],
            },
            { tab: "care" },
          ],
        },
        {
          id: "banner",
          title: "Il banner non compare",
          blocks: [
            {
              list: [
                "La data di «Mostra fino al» è passata. L'editor mostra allora «Data passata – il banner non viene più mostrato.»",
                "Il campo del testo è vuoto – senza testo nessun banner.",
                "La modifica non è ancora pubblicata (info.js).",
                "Il banner è stato chiuso sul sito in questo browser. Resta chiuso finché il testo non cambia.",
                "Il browser mostra ancora la versione vecchia: ricarichi la pagina.",
              ],
            },
            { tab: "info" },
          ],
        },
      ],
    },
    {
      id: "faq",
      title: "Domande e risposte",
      intro: "Risposte brevi alle domande più frequenti.",
      items: [
        {
          id: "students",
          title: "Vengono pubblicati dati degli studenti?",
          blocks: [
            "No. Nell'elenco pubblico entrano solo titolo, sottotitolo, autore, editore, anno, ISBN, categoria e collocazione. Le tabelle di lettori, prestiti, tariffe, utenti di WinBook e accessi vengono solo contate. Lo stato dei prestiti non viene mai letto né pubblicato.",
            "Inoltre la gestione controlla che nessun nome dell'archivio lettori compaia nei dati pubblici.",
          ],
        },
        {
          id: "drafts",
          title: "Dove vengono salvate le bozze?",
          blocks: ["Nel browser di questo computer – automaticamente, senza pulsante Salva. Su un altro computer vede lo stato pubblicato più recente. Chi cancella la cronologia insieme ai dati dei siti cancella anche le bozze; ciò che è pubblicato non ne risente."],
        },
        {
          id: "lock",
          title: "Che cosa succede quando blocco?",
          blocks: ["La gestione si chiude e la volta successiva chiede di nuovo la password. Le bozze restano in questo browser. Un file WinBook letto non è più caricato – per continuare va letto di nuovo."],
        },
        {
          id: "undo",
          title: "Posso annullare qualcosa?",
          blocks: [
            {
              list: [
                "Ciò che è pubblicato: si ripristina con [[Versioni precedenti]] nel riquadro «Pubblica».",
                "Consigli: [[Ripristina come turno attuale]] annulla un nuovo turno.",
                "Copertine nascoste: [[Mostra di nuovo]].",
                "Bozze: [[Scarta la bozza]] ripristina lo stato pubblicato.",
                "Le correzioni automatiche si possono ritirare prima della pubblicazione.",
              ],
            },
          ],
        },
        {
          id: "missing",
          title: "Perché manca un libro?",
          blocks: [
            {
              list: [
                "Nell'elenco entrano solo i tipi di media Libro e Graphic novel. Il riquadro «Tipi di media» nella scheda «Cura» mostra che cosa è stato escluso.",
                "Gli esemplari eliminati o dismessi mancano di proposito.",
                "Il libro è stato registrato dopo l'ultima lettura: legga di nuovo il catalogo e pubblichi.",
                "Più esemplari con lo stesso titolo e lo stesso primo autore formano una sola voce nell'elenco.",
              ],
            },
          ],
        },
        {
          id: "often",
          title: "Ogni quanto conviene aggiornare?",
          blocks: ["Idealmente una volta al mese e dopo acquisti importanti, almeno all'inizio di ogni semestre. Più spesso non nuoce: l'andamento ricorda gli ultimi 24 aggiornamenti."],
        },
        {
          id: "winbook",
          title: "Perché WinBook non cambia quando correggo qui?",
          blocks: ["Il file WinBook viene solo letto, mai modificato. Nomi italiani delle categorie, copertine nascoste e correzioni automatiche valgono solo per l'elenco pubblico. I dati diventano corretti in modo duraturo solo con la correzione in WinBook – che entra nell'elenco alla lettura successiva."],
        },
        {
          id: "loan",
          title: "Perché non si vede se un libro è in prestito?",
          blocks: ["Chi ha quale libro e quando sono dati personali. Per questo lo stato dei prestiti non viene mai letto né pubblicato, di proposito. Se un libro è disponibile lo si scopre in biblioteca."],
        },
        {
          id: "edit",
          title: "Posso aggiungere o modificare un libro qui?",
          blocks: ["No. I libri si registrano, correggono o dismettono solo in WinBook. L'aggiornamento successivo riprende la modifica."],
        },
        {
          id: "two",
          title: "Possono lavorare due persone contemporaneamente?",
          blocks: ["Tecnicamente sì, ma sul sito vale sempre l'ultimo file pubblicato, e le bozze restano separate sui rispettivi computer. È bene accordarsi su chi fa che cosa."],
        },
        {
          id: "mobile",
          title: "Funziona anche su smartphone o tablet?",
          blocks: ["Sì, la gestione funziona anche lì. Per la lettura però il file WinBook di solito si trova su una chiavetta USB – per questo è più pratico un computer. La cartella del sito si può usare solo con Chrome o Edge su computer."],
        },
        {
          id: "browser",
          title: "Quale browser funziona?",
          blocks: ["Google Chrome, Microsoft Edge, Mozilla Firefox e Safari aggiornati. Su Windows 7 Chrome 109 e Firefox 115 di norma funzionano ancora, ma non ricevono più aggiornamenti di sicurezza. Internet Explorer non funziona."],
        },
        {
          id: "internet",
          title: "Serve internet?",
          blocks: ["Per aprire la gestione, per la verifica delle copertine e per pubblicare online: sì. La lettura del file WinBook avviene invece nel browser, senza trasmettere dati."],
        },
        {
          id: "stats",
          title: "Che cosa mostra la scheda «Statistiche»?",
          blocks: ["Grafici sul catalogo attuale – dal file letto oppure, senza lettura, dall'elenco pubblicato. Le statistiche servono solo come panoramica e non vengono pubblicate."],
        },
        {
          id: "mail",
          title: "Posso inviare i file per e-mail?",
          blocks: ["books.js, recommendations.js e info.js sì – contengono solo dati dei libri, testi dei consigli e orari. Il file .winbook mai: contiene dati degli studenti."],
        },
      ],
    },
    {
      id: "practice",
      title: "Buone pratiche",
      intro: "Abitudini che mantengono l'elenco aggiornato e pulito.",
      blocks: [
        {
          kind: "rules",
          pairs: [
            ["Aggiornare regolarmente", "Circa una volta al mese e dopo acquisti importanti. L'elenco è aggiornato solo quanto l'ultima lettura."],
            ["Elaborare le liste in base all'effetto", "Prima gli ISBN (non validi, mancanti) – ogni ISBN corretto può portare una copertina. Poi categorie e collocazioni, infine le grafie."],
            ["Uniformare le grafie in WinBook", "Una sola grafia per autore, editore, categoria e collocazione; autori come «Cognome, Nome». Così filtri e ricerca funzionano meglio."],
            ["Prima verificare, poi pubblicare", "La verifica delle copertine prima della pubblicazione, così il risultato viene salvato. E prima uno sguardo all'anteprima."],
            ["Rinnovare i consigli ogni semestre", "Un nuovo turno all'inizio del semestre mantiene viva la pagina; quello vecchio resta visibile in «Consigli precedenti»."],
            ["Testi brevi", "Due o tre frasi: di che cosa parla e perché vale la pena? Sempre in tedesco e in italiano."],
            ["Usare il banner con parsimonia", "Solo per comunicazioni importanti e limitate nel tempo, con data di fine. Un banner sempre presente passa inosservato."],
            ["Inserire le vacanze per tempo", "Meglio inserire tutte le vacanze dell'anno scolastico all'inizio e controllarle prima di ogni pausa."],
            ["Non condividere la password", "Solo di persona, non annotarla, non salvarla nel browser. Bloccare la gestione dopo il lavoro."],
            ["Controllare dopo la pubblicazione", "Aprire il sito, ricaricarlo e per prova cercare un libro nuovo o controllare gli orari."],
            ["Cancellare la copia di WinBook", "Cancellare la copia sulla chiavetta USB dopo l'uso. Contiene dati degli studenti."],
          ],
        },
      ],
    },
    {
      id: "terms",
      title: "Glossario",
      intro: "Termini tecnici spiegati in breve.",
      blocks: [
        {
          kind: "terms",
          pairs: [
            ["WinBook", "Il programma della biblioteca della scuola (WinBook 6.0). Gestisce libri, lettori e prestiti; la gestione legge solo una copia del suo database."],
            ["File .winbook", "Il database di WinBook in un unico file. Contiene dati degli studenti e resta a scuola."],
            ["ISBN", "Il codice del libro di 10 o 13 cifre, di solito sul retro sopra il codice a barre. Serve a trovare la copertina."],
            ["ekz-Bibliotheksservice", "Fornitore di servizi per biblioteche; fornisce la maggior parte delle copertine tramite l'ISBN."],
            ["Open Library", "Biblioteca online libera; seconda fonte delle copertine."],
            ["Copertura delle copertine", "Quota dei libri per cui è stata trovata una copertina."],
            ["Categoria", "Gruppo tematico di WinBook. Base del filtro per categorie sul sito."],
            ["Collocazione", "Dove si trova il libro, per esempio scaffale e ripiano. Compare nella scheda del libro."],
            ["Segnatura", "Contrassegno di un esemplare in WinBook per la sistemazione a scaffale. Compare nelle liste di manutenzione, non sul sito."],
            ["Esemplare", "Una singola copia fisica. Esemplari con lo stesso titolo e lo stesso primo autore formano una voce nell'elenco."],
            ["Tipo di media", "Il tipo di supporto in WinBook. Nell'elenco entrano solo Libro e Graphic novel."],
            ["Archivio lettori", "La tabella delle lettrici e dei lettori in WinBook. Serve solo al controllo dei nomi; nulla viene pubblicato."],
            ["books.js", "File dell'elenco pubblico dei libri con copertura delle copertine, nomi italiani delle categorie e copertine nascoste."],
            ["recommendations.js", "File dei consigli di lettura con i loro testi e i turni precedenti."],
            ["info.js", "File con orari, vacanze, assenze, altri orari, avviso, contatti e banner."],
            ["save.php", "Piccolo programma sul sito: alla pubblicazione salva direttamente online e conserva le versioni precedenti."],
            ["Cartella del sito", "La cartella con index.html e admin.html. Destinazione della pubblicazione con Chrome o Edge."],
            ["Webspace", "Lo spazio in internet su cui si trova il sito."],
            ["Bozza", "Modifiche non ancora pubblicate, salvate automaticamente in questo browser."],
            ["Turno", "Una selezione di consigli. I turni precedenti sono visibili ai visitatori in «Consigli precedenti»."],
            ["Anteprima", "L'elenco dei libri con modifiche non ancora pubblicate, solo su questo computer."],
            ["CSV / Excel", "File di tabella delle liste di manutenzione da aprire, ordinare e spuntare in Excel."],
          ],
        },
      ],
    },
    {
      id: "about",
      title: "Informazioni",
      intro: "Stato dei dati, scorciatoie da tastiera e che cosa succede ai dati.",
      blocks: [
        { h: "Stato dei file pubblicati" },
        { about: true },
        { h: "Scorciatoie da tastiera" },
        {
          list: [
            "{{Esc}} chiude l'aiuto e le altre finestre.",
            "{{/}} porta alla ricerca di questo aiuto.",
            "{{Tab}} passa da un pulsante o campo all'altro, {{Invio}} o la {{barra spaziatrice}} li attiva.",
          ],
        },
        { h: "Che cosa succede ai dati" },
        {
          list: [
            "Il file WinBook viene letto solo in questo browser e mai caricato in rete.",
            "Sono pubblici solo dati dei libri, consigli e orari – nessun nome, nessun prestito.",
            "Le bozze restano in questo browser finché non vengono pubblicate o scartate.",
            "Il sito carica le copertine solo da ekz-Bibliotheksservice e da Open Library.",
            "La gestione è accessibile solo con password.",
          ],
        },
      ],
    },
  ],
};
