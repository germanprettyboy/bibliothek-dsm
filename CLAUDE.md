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
  LIESMICH.txt        Anleitung für Johann / die Bibliothek
  assets/
    style.css         gesamtes CSS (Tokens oben, Komponenten unten)
    common.js         Sprache DE/IT, Einstellungen (Theme/Schrift/Kontrast), Glas-Fenster, Toast
    app.js            Liste, Suche, A–Z-Leiste, Floater, Detail, Empfehlungen, Fragen beim 1. Besuch
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
node werkzeuge/admin-verschluesseln.js "<Passwort>"   # nach JEDER Änderung an werkzeuge/quelle/*
npm test                                      # Unit-Tests (node:test, ~5 s)
npm run test:e2e                              # Browser-Tests (Playwright/Chromium, eigener Server auf :8766, ~1 min)
npm run test:alle                             # beides
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
- Cover-Laden gestaffelt im Hintergrund für Bücher in Sichtweite, kleine Auflösung
  (OL „M“ ≈180 px, Google „thumbnail“ ≈128 px). Open Library NICHT über `/b/isbn/` laden
  (100 Abrufe / 5 min / IP, Schulnetz = eine IP) – immer `/api/books?jscmd=viewapi` (Sammelabfrage) → Cover-ID.
- A–Z-Leiste nur ab 768 px (48rem). Darunter nur Suche + Buchstaben-Floater rechts (nur beim Scrollen sichtbar).
- Theme: Standard = Gerät; in den Einstellungen Automatisch/Hell/Dunkel. Dazu größere Schrift, hoher Kontrast.
- Italienischer Text bleibt Anthrazit (kein Rot für Italienisch auf der Website).
- Keine Farbstreifen-Leiste unter dem Titel. Keine Datenschutzhinweise auf der Admin-Seite.
- Fenster (Detail, Einstellungen, Fragen): Glas-Effekt, Hintergrund unscharf + leicht abgedunkelt.
- Erster Besuch: Overlay „Möchten Sie Buchempfehlungen sehen?“ → Mittelstufe / Oberstufe /
  Erwachsenenliteratur → (Erw.) Romane / Sachbücher / Biografien & Geschichte. Wahl in localStorage `dsm-empf`.
- Admin-Sperre nur „schülersicher“, kein Server: PBKDF2-SHA-256 (310.000) + AES-GCM 256, Logik nur verschlüsselt.

## Design

DSM Corporate Design: Fira Sans (Regular/Medium/SemiBold), Anthrazit #333333 als Textfarbe,
Logofarben nur für Linien/Balken/Akzente (Mauve #BA8EA7, Gelb #DDD300, Orange #DB9F00,
Blau #B5C9D0, Rot #A93A39, Grün #B3CEA1). Keine Versalien, kein Kursiv, kein Unterstreichen.
Alle Farben als Tokens in `style.css` (`:root`, Dark per `prefers-color-scheme` + `[data-theme]`,
Kontrast per `[data-contrast="high"]`, Schrift per `[data-font="large"]`). Minimalistische Animationen,
`prefers-reduced-motion` respektieren.

## Datenformate

- `books.js`: `{stand, anzahl, abdeckung?, verlauf?, buecher:[{t,u?,a?[],v?,j?,i?[],k?,s?[]}]}`
  (i = ISBN-13, geprüft; s = Standorte). `abdeckung`/`verlauf` = Cover-Abdeckung aus admin.html.
- `empfehlungen.js`: `{stand, gruppen:{mittelstufe|oberstufe|erw-roman|erw-sach|erw-bio:[{k,t,a,de,it}]}}`,
  `k` = norm(Titel) + "|" + norm(Erstautor) (norm: klein, ohne Akzente, ß→ss, nur a–z0–9 und Leerzeichen).
- localStorage: `dsm-lang`, `dsm-theme`, `dsm-font`, `dsm-contrast`, `dsm-empf`, `dsm-cover-v2` (Cover-Cache),
  Admin: `dsm-empf-entwurf`, Vorschau `dsm-vorschau` / `dsm-vorschau-empf` (index.html#vorschau).

## Prüfen

Nach jeder Änderung `npm run test:alle`. Tests in `tests/`:

- `unit/extract.test.js` – Whitelist-Extraktion gegen synthetische DB (`helfer/testdb.js`, erfundene Leser):
  SQL-Spion prüft, dass Ausleihspalten/Personentabellen nur gezählt werden; Namensabgleich, Zusammenfassen, ISBN, Sortierung, `toScript`.
- `unit/covers.test.js` – covers.js in VM-Sandbox (fetch/Image gestubbt): Sammelabfrage, nie `/b/isbn/`, Google-Rückfall, 429-Sperre, Cache-TTL, Warteschlange, Messung.
- `unit/verschluesseln.test.js` – Roundtrip, falsches Passwort. Mit `DSM_ADMIN_PW=… npm test` zusätzlich: ist `admin.enc.js` aktuell?
- `unit/daten.test.js` – Format von books.js, empfehlungen.js (Schlüssel im Bestand), info.js, Kategorien-Übersetzung.
- `unit/regeln.test.js` – harte Regeln am Quelltext (keine externen Hosts außer OL/Google, keine Google Fonts, Design-Verbote, Klartext nicht in website/).
- `unit/echte-db.test.js` – nur wenn `daten/*.winbook` da ist: books.js aktuell, keine Leser-Namen. Meldungen nennen nur Anzahlen.
- `e2e/*.spec.js` – Liste/Suche/A–Z/Floater (390/768/1280 px), Detail+Cover (APIs gemockt, echtes Netz gesperrt), DE/IT,
  Einstellungen, Fragen-Ablauf, Empfehlungen, Info-Karte (feste Uhrzeit), Admin. Admin-Tests ersetzen `admin.enc.js` per Route durch
  eine mit „test-passwort“ verschlüsselte Fassung der aktuellen Quellen – das echte Passwort wird nicht gebraucht.
  Admin-Import muss byte-gleich zu `npm run books` sein (synthetische DB immer, Original-DB wenn vorhanden).

## Offen

- Echte Cover-Abfragen (Open Library/Google) nie live getestet – in der Cloud-Umgebung gab es kein Internet.
  Erste Aufgabe: lokal `npm run serve`, Seite öffnen, Netzwerk-Tab prüfen; dann in admin.html
  „Cover-Abdeckung prüfen“ laufen lassen.
- Safari: Unschärfe hinter `<dialog>` (`::backdrop` + backdrop-filter) ungetestet.
- Die 20 Start-Empfehlungstexte (DE/IT) hat Claude geschrieben – Johann soll sie gegenlesen.
- Git-Repo lokal angelegt (Branch main), noch kein Remote. Falls Remote: nur privat – werkzeuge/quelle/ liegt im Klartext.
