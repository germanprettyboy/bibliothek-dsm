# Bibliothek DSM – Bücherliste der Deutschen Schule Mailand

Statische Website (kein Server, kein Build-Schritt) mit der öffentlichen Bücherliste der Schulbibliothek
und einer passwortgeschützten Verwaltungsseite. Zweisprachig Deutsch/Italienisch, mobile first.
Auftraggeber/Nutzer: Johann Bucher (Freiwilliger an der DSM). Antworten auf Deutsch, ohne Floskeln, ohne Emojis.

## Ordner

```
website/            ← NUR dieser Ordner kommt auf den Webspace (https!)
  index.html          Bücherliste
  admin.html          Verwaltung (Passwortsperre)
  books.js            window.DSM_BIBLIOTHEK  – erzeugt, nicht von Hand bearbeiten
  empfehlungen.js     window.DSM_EMPFEHLUNGEN – erzeugt, nicht von Hand bearbeiten
  info.js             window.DSM_INFO – Öffnungszeiten/Ferien/Abwesenheiten, erzeugt
  LIESMICH.txt        Anleitung für Johann / die Bibliothek
  .htaccess           nur Apache: gzip + Cache-Header (per IfModule abgesichert; bei Error 500 löschen)
  assets/
    style.css         gesamtes CSS (Tokens oben, Komponenten unten)
    protokoll.js      DSM_LOG: jede Interaktion formatiert in die Browser-Konsole (vor common.js geladen)
    common.js         Sprache DE/IT, Einstellungen (Theme/Schrift/Kontrast), Glas-Fenster, Toast
    app.js            Liste, Suche, A–Z-Leiste, Floater, Detail, Empfehlungen, Fragen beim 1. Besuch
    info-panel.js     Info über der Liste (geöffnet/geschlossen, Schließtage) + Fenster mit Wochenzeiten
    covers.js         Cover-Laden (Open Library Sammelabfrage + Google Books), Cache, Abdeckungsmessung
    kategorien-it.js  italienische Namen der Kategorien
    admin-lock.js     Passwortsperre: entschlüsselt admin.enc.js und startet es
    admin.enc.js      VERSCHLÜSSELT: quelle/extract.js + quelle/admin.js
    vendor/sql-asm.js sql.js 1.10.3 (asm.js-Build, kein WASM nötig)
    fonts/            Fira Sans 400/500/600 lokal (DSGVO: kein Google Fonts)
werkzeuge/          ← NICHT hochladen
  quelle/extract.js   Whitelist-Extraktion aus der WinBIAP-SQLite (Klartext)
  quelle/admin.js     Verwaltungsoberfläche (Klartext)
  admin-verschluesseln.js   quelle/* → website/assets/admin.enc.js
  books-erzeugen.js   DB → website/books.js per Node (gleiche Logik wie admin.html)
  branches.sh         Übersicht offener Entwicklungs-Branches + Integration in main
tests/              ← NICHT hochladen. unit/ (node:test), e2e/ (Playwright), helfer/, .tmp/ (ignoriert)
daten/              ← NIEMALS einchecken/hochladen (in .gitignore)
  BIBLIOTHEK_DSM_2024.winbook   Original-DB mit Schülerdaten (Leser, Ausleihen, Gebühren)
  Schullogo_original.png
```

## Befehle

```bash
npm install                                   # sql.js, Playwright
npm run books                                 # daten/*.winbook → website/books.js
npm run serve                                 # http://localhost:8765
npm run dev                                   # dasselbe mit Live-Reload (browser-sync über npx)
node werkzeuge/admin-verschluesseln.js "<Passwort>"   # nach JEDER Änderung an werkzeuge/quelle/*
npm test                                      # Unit-Tests (node:test, ~5 s)
npm run test:e2e                              # Browser-Tests (Playwright/Chromium, eigener Server, Port je Checkout, ~1 min)
npm run test:alle                             # beides
npm run branches                              # was ist noch nicht in main?
npm run integrieren -- <branch>               # fertigen Branch in main mergen (siehe unten)
```

Das Admin-Passwort steht absichtlich in keiner Datei. Johann fragen, nicht raten, nicht notieren.
Nach Änderungen an `quelle/admin.js` oder `quelle/extract.js` immer neu verschlüsseln, sonst läuft die alte Version.

## Harte Regeln (vom Auftraggeber)

- **Keine Schülerdaten, kein Ausleihstatus öffentlich.** Extraktion ist Whitelist: nur Titel, Untertitel,
  Autor, Verlag, Jahr, ISBN, Kategorie, Standort. Leser-/Ausleih-/Gebühren-/Benutzer-/Sitzungstabellen
  werden nur gezählt. Ausleihspalten der `books`-Tabelle (verliehenan, verliehenanklasse, bverliehen, …)
  werden nie gelesen. Zusätzlich Namensabgleich Leserdatei ↔ öffentliche Felder.
- Nur Bücher (Medientyp Buch/Graphic Novel), Mehrfachexemplare zusammengefasst (Titel + Erstautor).
- **Keine ISBN-Ergänzung.** Cover nur über vorhandene ISBN; ohne ISBN → gestalteter Platzhalter.
- Liste bleibt reiner Text (Titel + Autor). Cover nur in Detailansicht und Empfehlungen.
- Keine Buchanzahl und kein Stand auf der öffentlichen Seite (nur im Admin).
- Platzhalter-Cover ohne Autor (Autor steht schon daneben). Empfehlungen auf dem Handy: senkrechte
  Liste (kleines Cover links, Titel/Autor rechts, Trennlinien), KEIN Wisch-Band/Karussell; ab 40rem vier große Cover.
- Kopf der Empfehlungs-Karte (Titel + Pfeil) öffnet Fenster „Bisherige Empfehlungen“: Zeitleiste neueste Runde
  zuerst, je Datum, „Aktuell“, Thema, darunter die Bücher der gewählten Gruppe mit Text; Klick → Detail darüber.
- Suchleiste klebt deckend oben; beim Suchen springt die Seite so, dass die Treffer direkt unter der
  Leiste beginnen (`main.books` mindestens bildschirmhoch).
- Empfehlungs-Editor: Gruppe voll (4) → Suchfeld gesperrt mit Hinweis mittig; Bücher schon in der
  Gruppe → Treffer ausgegraut, ohne Knopf.
- Änderungen im Admin werden als Datei heruntergeladen und per FTP hochgeladen (vom Auftraggeber so gewollt).
- Cover-Laden gestaffelt im Hintergrund für Bücher in Sichtweite, kleine Auflösung
  (OL „M“ ≈180 px, Google „thumbnail“ ≈128 px). Open Library NICHT über `/b/isbn/` laden
  (100 Abrufe / 5 min / IP, Schulnetz = eine IP) – immer `/api/books?jscmd=viewapi` (Sammelabfrage) → Cover-ID.
- A–Z-Leiste nur ab 768 px (48rem). Darunter nur Suche + Buchstaben-Floater rechts (nur beim Scrollen sichtbar).
- Theme: Standard = Gerät; in den Einstellungen Automatisch/Hell/Dunkel. Dazu größere Schrift, hoher Kontrast.
- Italienischer Text bleibt Anthrazit (kein Rot für Italienisch auf der Website).
- Keine Farbstreifen-Leiste unter dem Titel. Keine Datenschutzhinweise auf der Admin-Seite.
- Fenster (Detail, Einstellungen, Fragen): Glas-Effekt, Hintergrund unscharf + leicht abgedunkelt.
- Langsame Verbindung: Lade-Platzhalter (Balken mit Lichtband, `.skel` in index.html) für Liste und – wenn gewählt
  (`data-empf` aus common.js) – Empfehlungen, bis books.js (≈700 KB) da ist; nach 6 s Hinweis „Langsame Verbindung“.
  info.js/info-panel.js laden VOR books.js (Öffnungszeiten sofort). Cover: Lichtband bis das Bild wirklich geladen ist.
  Jedes nachladende Element hat einen Platzhalter: Logo (`.ld-bild`, common.js setzt `.da` bei load/error),
  Info-Karte (nur wenn beim letzten Besuch gezeigt, `dsm-info-karte`), Entsperren-Knopf im Admin (gesperrt mit
  Spinner, bis admin-lock.js nach books.js geladen ist; Spinner auch beim Prüfen). Schriften: `font-display: swap`.
- Erster Besuch: Overlay „Möchten Sie Buchempfehlungen sehen?“ → Mittelstufe / Oberstufe /
  Erwachsenenliteratur → (Erw.) Romane / Sachbücher / Biografien & Geschichte. Wahl in localStorage `dsm-empf`.
  In den Einstellungen dieselbe Wahl als Liste: Blöcke Mittelstufe / Oberstufe / Erwachsenenliteratur mit Abstand
  dazwischen, die drei Erwachsenen-Bereiche untereinander in einem Block.
- Admin-Sperre nur „schülersicher“, kein Server: PBKDF2-SHA-256 (310.000) + AES-GCM 256, Logik nur verschlüsselt.

## Design

DSM Corporate Design: Fira Sans (Regular/Medium/SemiBold), Anthrazit #333333 als Textfarbe,
Genau drei Schriftgrößen überall (`--fs-s` .875rem, `--fs-m` 1rem, `--fs-l` 1.5rem), keine anderen Werte.
Logofarben nur für Linien/Balken/Akzente (Mauve #BA8EA7, Gelb #DDD300, Orange #DB9F00,
Blau #B5C9D0, Rot #A93A39, Grün #B3CEA1). Keine Versalien, kein Kursiv, kein Unterstreichen.
Alle Farben als Tokens in `style.css` (`:root`, Dark per `prefers-color-scheme` + `[data-theme]`,
Kontrast per `[data-contrast="high"]`, Schrift per `[data-font="large"]`). Minimalistische Animationen,
`prefers-reduced-motion` respektieren.

## Performance

- Liste: `#list > .rows > ul` Abschnitte zu höchstens 40 Büchern (jeder Buchstabe beginnt einen neuen, Anker
  `ul[data-l] id="L-X"`). `content-visibility: auto` + geschätzte `contain-intrinsic-size` im Stil – nur mit
  `@supports (overflow-anchor: auto)` (Safari ohne Scroll-Verankerung rendert alles). Pfeil per CSS-Maske, kein SVG
  je Zeile. A–Z-Sprung misst das Ziel in jedem Frame neu. Cover-Beobachtung: erst Abschnitte, dann deren Zeilen.
- covers.js: keine Dauer-Intervalle; Takt-Timer (setTimeout 350/1500/1800 ms) nur, solange Arbeit ansteht.
- Logos als WebP 360 px; dunkles Logo `loading="lazy"` (im hellen Modus nicht geladen). PNGs bleiben für die Anleitung.
- Messen: 390 px, CPU 4-fach gedrosselt: DOMContentLoaded ≈0,5 s, Long Tasks ≈0,2 s (vorher 17,9 s / 9,4 s).

## Datenformate

- `books.js`: `{stand, anzahl, abdeckung?, verlauf?, buecher:[{t,u?,a?[],v?,j?,i?[],k?,s?[]}]}`
  (i = ISBN-13, geprüft; s = Standorte). `abdeckung`/`verlauf` = Cover-Abdeckung aus admin.html.
- `empfehlungen.js`: `{stand, thema?:{de,it}, gruppen:{mittelstufe|oberstufe|erw-roman|erw-sach|erw-bio:[{k,t,a,de,it}]},
  archiv?:[{stand, thema?, gruppen}]}` (archiv neueste zuerst, max. 40). Admin: andere Bücher als veröffentlicht =
  neue Runde → veröffentlichte Runde wandert vorne ins archiv, stand = heute; nur Texte/Thema geändert → stand bleibt.
  `k` = norm(Titel) + "|" + norm(Erstautor) (norm: klein, ohne Akzente, ß→ss, nur a–z0–9 und Leerzeichen).
- `info.js`: `{stand, zeiten:{mo..sa:[["HH:MM","HH:MM"]]}, hinweis:{de,it}, schliessungen:[{art:"ferien"|"abwesend",von,bis,de,it}]}`
  (Datum JJJJ-MM-TT, bis ≥ von; leerer Text → „Ferien“ bzw. „Bibliothek geschlossen“).
- localStorage: `dsm-lang`, `dsm-theme`, `dsm-font`, `dsm-contrast`, `dsm-empf`, `dsm-cover-v2` (Cover-Cache), `dsm-info-karte` ("1"/"0", Platzhalter),
  Admin: `dsm-empf-entwurf`, `dsm-info-entwurf`, Vorschau `dsm-vorschau` / `dsm-vorschau-empf` / `dsm-vorschau-info` (index.html#vorschau).
  Protokoll: `dsm-protokoll` (localStorage, "aus" = abgeschaltet), `dsm-protokoll-verlauf` (sessionStorage, letzte 500 Einträge).
- Konsolen-Protokoll (`assets/protokoll.js`): erfasst automatisch Klicks, Eingaben (600 ms entprellt), Schalter, Dateien,
  Tasten (Escape/Enter/Kombinationen), Formulare, `<dialog>` auf/zu mit Grund, Scrollen, Netz (fetch, fremde Bilder),
  Speicher-Schreibzugriffe, Fehler. Eigene Einträge: `DSM.log(bereich, text, daten?)`. Passwortfelder und Schlüssel
  (`/key|pass|pw|token/`) nie im Klartext. Felder mit `data-protokoll="eigen"` (Suchfeld) protokolliert die Seite selbst.

## Prüfen

Nach jeder Änderung `npm run test:alle`. Tests in `tests/`:

- `unit/extract.test.js` – Whitelist-Extraktion gegen synthetische DB (`helfer/testdb.js`, erfundene Leser):
  SQL-Spion prüft, dass Ausleihspalten/Personentabellen nur gezählt werden; Namensabgleich, Zusammenfassen, ISBN, Sortierung, `toScript`.
- `unit/covers.test.js` – covers.js in VM-Sandbox (fetch/Image gestubbt): Sammelabfrage, nie `/b/isbn/`, Google-Rückfall, 429-Sperre, Cache-TTL, Warteschlange, Messung.
- `unit/verschluesseln.test.js` – Roundtrip, falsches Passwort. Mit `DSM_ADMIN_PW=… npm test` zusätzlich: ist `admin.enc.js` aktuell?
- `unit/daten.test.js` – Format von books.js, empfehlungen.js (Schlüssel im Bestand), info.js, Kategorien-Übersetzung.
- `unit/regeln.test.js` – harte Regeln am Quelltext (keine externen Hosts außer OL/Google, keine Google Fonts, Design-Verbote, Klartext nicht in website/).
- `unit/echte-db.test.js` – nur wenn `daten/*.winbook` da ist: books.js aktuell, keine Leser-Namen. Meldungen nennen nur Anzahlen.
- `e2e/*.spec.js` – Liste/Suche/A–Z/Floater (390/768/1280 px), Ladezustand (books.js zurückgehalten), Detail+Cover (APIs gemockt, echtes Netz gesperrt), DE/IT,
  Einstellungen, Fragen-Ablauf, Empfehlungen, Info-Karte (feste Uhrzeit), Admin. Admin-Tests ersetzen `admin.enc.js` per Route durch
  eine mit „test-passwort“ verschlüsselte Fassung der aktuellen Quellen – das echte Passwort wird nicht gebraucht.
  Admin-Import muss byte-gleich zu `npm run books` sein (synthetische DB immer, Original-DB wenn vorhanden).

## Branches integrieren (Pflicht am Ende jeder Aufgabe)

Jede Aufgabe läuft in einem eigenen Worktree (`.claude/worktrees/<name>`, Branch `worktree-<name>`).
Fertige Arbeit wird am Ende derselben Session in `main` integriert, nicht liegen gelassen.
Kein Remote: „integrieren“ heißt `--no-ff`-Merge in den lokalen `main` im Haupt-Checkout.
`main` ist immer der Stand, der per FTP hochgeladen werden darf – also lauffähig.

Ablauf:
1. Im eigenen Worktree alles committen.
2. Im Worktree `git merge main` – neuen Stand holen, Konflikte **hier** lösen, nie in `main`:
   - `CLAUDE.md`, `LIESMICH.txt`, Quelltext: beide Seiten inhaltlich zusammenführen.
   - `admin.enc.js`: nicht mischen, nach dem Merge neu verschlüsseln.
   - `books.js`: neu erzeugen (`npm run books`); `empfehlungen.js`/`info.js`: Inhalt fachlich zusammenführen.
3. Prüfen: `npm run test:alle` muss grün sein; bei sichtbaren Änderungen zusätzlich Seite mit `npm run serve` ansehen.
   `werkzeuge/quelle/*` geändert → neu verschlüsseln (Passwort bei Johann erfragen). Committen.
4. Worktree verlassen (ExitWorktree, `keep`), im Haupt-Checkout `npm run integrieren -- worktree-<name>`.
   Das Skript ändert `main` nicht, wenn: Haupt-Checkout nicht sauber / nicht auf `main`, Branch hat
   Uncommittetes, Konflikt, Syntaxfehler in `website/**.js` oder `werkzeuge/**.js`. Dann zurück in den
   Worktree, Ursache beheben, erneut.
5. Aufräumen: `git worktree remove <pfad>`, `git branch -d <branch>` (`-d`, nie `-D` – verweigert, was
   nicht in `main` ist). ExitWorktree entsperrt den eigenen Worktree; fremde ggf. erst `git worktree unlock <pfad>`.
6. Im Abschlussbericht: Merge-Commit und Warnungen des Skripts (z. B. veraltete Verschlüsselung) nennen.

Regeln:
- Ein SessionStart-Hook (`.claude/settings.json`) ruft `werkzeuge/branches.sh --hook` auf und meldet
  offene Branches. Steht dort „fertig committet, aber nicht in main“: zu Beginn der Session erledigen –
  integrieren, wenn der Branch erkennbar abgeschlossen ist (letzter Commit beschreibt eine fertige Aufgabe),
  sonst Johann fragen.
- Branches mit uncommitteten Dateien gehören einer laufenden Session: nicht anfassen. In fremden
  Worktrees nie committen, stashen, resetten oder mergen.
- Fremder fertiger Branch mit Konflikt: eigenen Worktree von `main` anlegen, den fremden Branch dort
  hineinmergen, Konflikte lösen, testen, dann den eigenen Branch integrieren.
- `main` nur per Merge-Commit ändern. Kein Rebase von `main`, kein `--force`, kein `reset --hard` auf `main`.
- Worktree-Sessions dürfen nur ihren Worktree mit Git anfassen; einfache Befehle ggf. als
  `git -C <worktree-pfad> …`. Der Merge in `main` passiert erst nach ExitWorktree.

## Offen

- Echte Cover-Abfragen (Open Library/Google) nie live getestet – in der Cloud-Umgebung gab es kein Internet.
  Erste Aufgabe: lokal `npm run serve`, Seite öffnen, Netzwerk-Tab prüfen; dann in admin.html
  „Cover-Abdeckung prüfen“ laufen lassen.
- Safari: Unschärfe hinter `<dialog>` (`::backdrop` + backdrop-filter) ungetestet.
- Die 20 Start-Empfehlungstexte (DE/IT) hat Claude geschrieben – Johann soll sie gegenlesen.
- Git-Repo lokal angelegt (Branch main), noch kein Remote. Falls Remote: nur privat – werkzeuge/quelle/ liegt im Klartext.
