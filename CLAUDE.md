# Bibliothek DSM – Bücherliste der Deutschen Schule Mailand

Statische Website (einzige Server-Datei: speichern.php fürs Veröffentlichen) mit der öffentlichen Bücherliste der Schulbibliothek und einer passwortgeschützten
Verwaltungsseite. Zweisprachig Deutsch/Italienisch, mobile first. Oberfläche: React-API (läuft auf Preact 11 via `preact/compat`, Alias in `werkzeuge/bauen.mjs` `preactAlias`) + Tailwind CSS v4 + shadcn/ui,
gebaut mit Vite (`npm run build`) zu festen Dateien in `website/` – das Ergebnis bleibt reines HTML/CSS/JS.
Auftraggeber/Nutzer: Johann Bucher (Freiwilliger an der DSM). Antworten auf Deutsch, ohne Floskeln, ohne Emojis.

## Ordner

```
website/            ← NUR dieser Ordner kommt auf den Webspace (https!). Gebautes wird eingecheckt (FTP lädt website/ hoch).
  index.html          Bücherliste            – GEBAUT aus src/index.html
  admin.html          Verwaltung (Sperre)     – GEBAUT aus src/admin.html
  books.js            window.DSM_BIBLIOTHEK  – erzeugt, nicht von Hand bearbeiten
  empfehlungen.js     window.DSM_EMPFEHLUNGEN – erzeugt, nicht von Hand bearbeiten
  info.js             window.DSM_INFO – Öffnungszeiten/Ferien/Abwesenheiten, erzeugt
  speichern.php       einzige Server-Datei: Verwaltung speichert die drei Datendateien direkt (von Hand, siehe Regeln)
  speichern-zugang.php  SHA-256 des Speicher-Schlüssels – erzeugt von admin-verschluesseln.js (nur mit Passwort)
  sicherung/          nur auf dem Server: alte Fassungen der Datendateien (von speichern.php angelegt)
  LIESMICH.txt        Anleitung für Johann / die Bibliothek
  .htaccess           nur Apache: gzip + Cache-Header (per IfModule abgesichert; bei Error 500 löschen)
  assets/
    bibliothek.js     GEBAUT: Bücherliste (React, IIFE)
    verwaltung.js     GEBAUT: Sperre der Verwaltung + React/shadcn-Bausteine für die verschlüsselte Verwaltung
    style.css         GEBAUT: Tailwind-CSS beider Seiten (aus src/styles.css)
    kopf.js           GEBAUT (Kopie von src/kopf.js): Theme/Sprache vor dem ersten Zeichnen, Platzhalter-Merker
    protokoll.js      DSM_LOG: jede Interaktion formatiert in die Browser-Konsole (von Hand, vor allem anderen geladen)
    covers.js         Cover-Laden (ekz → Open Library Sammelabfrage → Google-Bild), Cache, Abdeckungsmessung (von Hand)
    kategorien-it.js  italienische Namen der Kategorien
    admin.enc.js      VERSCHLÜSSELT: quelle/extract.js + gebaute quelle/verwaltung/
    vendor/sql-asm.js sql.js 1.10.3 (asm.js-Build, kein WASM nötig)
    fonts/            Fira Sans 400/500/600 lokal (DSGVO: kein Google Fonts)
src/                ← Quelltext der Seiten (React + Tailwind + shadcn/ui), NICHT hochladen
  index.html, admin.html   Vorlagen mit festem Lade-Gerüst (#seite), werden nur kopiert
  kopf.js             klassisches Skript im <head> (ohne React)
  styles.css          Tailwind v4: DSM-Tokens, Theme (nur DSM-Werte), Bausteine (Liste, Cover, Glas, Platzhalter)
  components/ui/      shadcn/ui-Komponenten, an DSM angepasst (button, input, dialog, switch, toggle(-group), tabs, …)
  components/         fenster (Glas-Dialog), kopf (Logo/Sprache/Einstellungen), einstellungen
  lib/                utils (cn), speicher (localStorage, log), sprache (DE/IT, t()), darstellung, hinweis (Toast)
  bibliothek/         Bücherliste: main, app, daten, liste, detail (+Zoom), cover, empfehlungen (+Archiv, Fragen), info, wahl
  verwaltung/         main (Seite), sperre (PBKDF2/AES-GCM), gemeinsam (window.DSM_GEMEINSAM für die Verwaltung)
werkzeuge/          ← NICHT hochladen
  bauen.mjs           src/ → website/ (Vite, je Seite ein IIFE-Skript, feste Dateinamen)
  quelle/extract.js   Whitelist-Extraktion aus der WinBIAP-SQLite (Klartext, auch von Node genutzt)
  quelle/verwaltung/  Verwaltungsoberfläche (Klartext, React): app, bestand, empfehlungen, info, veroeffentlichen, woerter
  admin-verschluesseln.js   baut quelle/verwaltung/ (React extern) + extract.js → website/assets/admin.enc.js
  books-erzeugen.js   DB → website/books.js per Node (gleiche Logik wie admin.html)
  tunnel.mjs          öffentliche Test-Adresse (Cloudflare Quick Tunnel) für website/, auch für Playwright
  lokal.mjs + lokal-router.php   npm run lokal: PHP-Webserver (php-wasm, npx, gepinnt) mit website/ als Wurzel;
                      Router liefert admin.enc.js aus tests/.tmp/lokal/ und setzt DSM_ZUGANG_DATEI für speichern.php
  branches.sh         Übersicht offener Entwicklungs-Branches + Integration in main
components.json     shadcn-Konfiguration (JSX statt TSX, Aliase @/components, @/lib); vite.config.js für Editor/CLI
tests/              ← NICHT hochladen. unit/ (node:test), e2e/ (Playwright), helfer/, .tmp/ (ignoriert)
doku/               ← NICHT hochladen. Hintergrund-Analysen
  dsmailand-techstack.md   Techstack der Schul-Website www.dsmailand.it (vollständig, mit Prüfbefehlen)
daten/              ← NIEMALS einchecken/hochladen (in .gitignore)
  BIBLIOTHEK_DSM_2024.winbook   Original-DB mit Schülerdaten (Leser, Ausleihen, Gebühren)
  Schullogo_original.png
```

## Befehle

```bash
npm install                                   # React, Radix, Tailwind, Vite, sql.js, Playwright
npm run build                                 # src/ → website/ (nach JEDER Änderung an src/, Ergebnis committen)
npm run books                                 # daten/*.winbook → website/books.js
npm run serve                                 # http://localhost:8765
npm run dev                                   # Build im Watch-Modus + Live-Reload (browser-sync über npx)
npm run tunnel                                # website/ unter https://….trycloudflare.com (Handy/Schul-PC), Ctrl+C beendet
npm run tunnel:dev                            # dasselbe mit Watch-Build + Live-Reload
npm run lokal                                 # wie Webspace: PHP (php-wasm über npx) + speichern.php echt, Build-Watch,
                                              #   Verwaltung mit Passwort „lokal“ (DSM_LOKAL_PW) → http://127.0.0.1:8765/admin.html
npm run tunnel:php                            # wie lokal, plus öffentliche https-Adresse (cloudflared): „Veröffentlichen“ per speichern.php
                                              #   funktioniert vom Handy/Schul-PC aus, schreibt nach website/ dieses Checkouts; zufälliges Passwort wird gezeigt
npm run ui:add -- <name>                      # neue shadcn-Komponente nach src/components/ui/ (danach an DSM anpassen!)
node werkzeuge/admin-verschluesseln.js                # nach JEDER Änderung an werkzeuge/quelle/* (fragt Passwort verdeckt)
npm test                                      # Unit-Tests (node:test, ~15 s, baut einmal zum Vergleich)
npm run test:e2e                              # Browser-Tests (Playwright/Chromium, eigener Server, Port je Checkout, ~1 min)
npm run test:alle                             # beides
npm run test:live                             # Browser-Tests über eigenen Tunnel (echtes https/Netz, ~3,5 min)
npm run branches                              # was ist noch nicht in main?
npm run integrieren -- <branch>               # fertigen Branch in main mergen (siehe unten)
```

Das Admin-Passwort steht absichtlich in keiner Datei. Johann fragen, nicht raten, nicht notieren.
Nach Änderungen an `werkzeuge/quelle/**` immer neu verschlüsseln, sonst läuft die alte Version. Ändert sich, was die
Verwaltung von der Seite importiert (`@/…`), muss es in `src/verwaltung/gemeinsam.js` stehen (Test prüft das).

## Harte Regeln (vom Auftraggeber)

- **Keine Schülerdaten, kein Ausleihstatus öffentlich.** Extraktion ist Whitelist: nur Titel, Untertitel,
  Autor, Verlag, Jahr, ISBN, Kategorie, Standort. Leser-/Ausleih-/Gebühren-/Benutzer-/Sitzungstabellen
  werden nur gezählt. Ausleihspalten der `books`-Tabelle (verliehenan, verliehenanklasse, bverliehen, …)
  werden nie gelesen. Zusätzlich Namensabgleich Leserdatei ↔ öffentliche Felder.
- Nur Bücher (Medientyp Buch/Graphic Novel), Mehrfachexemplare zusammengefasst (Titel + Erstautor).
- **Keine ISBN-Ergänzung.** Cover nur über vorhandene ISBN; ohne ISBN → gestalteter Platzhalter.
- Liste bleibt reiner Text (Titel + Autor). Cover nur in Detailansicht und Empfehlungen.
- Kein Stand auf der öffentlichen Seite (nur im Admin). Buchanzahl seit 17.10.2026 erlaubt (Auftraggeber): `#meta` über
  der Liste zeigt „4.545 Bücher“ (statt „Alphabetisch nach Titel“), beim Suchen „n Treffer“. Kein Footer.
- Platzhalter-Cover ohne Autor (Autor steht schon daneben). Empfehlungen auf dem Handy: senkrechte
  Liste (kleines Cover links, Titel/Autor rechts, Trennlinien), KEIN Wisch-Band/Karussell; ab 40rem vier große Cover.
- Kopf der Empfehlungs-Karte (Titel + Pfeil) öffnet Fenster „Bisherige Empfehlungen“: Zeitleiste neueste Runde
  zuerst, je Datum, „Aktuell“, Thema, darunter die Bücher der gewählten Gruppe mit Text; Klick → Detail darüber.
- Suchleiste klebt deckend oben; beim Suchen springt die Seite so, dass die Treffer direkt unter der
  Leiste beginnen (`main.books` mindestens bildschirmhoch).
- Verwaltung (17.10.2026): keine Zeile „Aktuell veröffentlicht …“ unter dem Titel, kein „Entwurf im Browser gespeichert“ (nur
  `#i-state` bei unvollständigen Info-Angaben), keine Zähler „(4)“ an den Gruppen. Gruppenwahl `#e-groups` = shadcn
  `ToggleGroup` Variante `flaeche` (Segment-Wahl, bricht auf dem Handy um); Reiter ab ≤420 px über die ganze Breite.
  „Sperren“ (`#lock-btn`) = Schloss-Symbol, der Text gleitet bei Hover/Fokus nach rechts heraus (CSS-Grid 0fr→1fr,
  `motion-reduce` ohne Animation), `aria-label` immer gesetzt. `App` bekommt nur noch `sperren` (kein `setAktuell`).
- Empfehlungs-Editor: Gruppe voll (4) → Suchfeld gesperrt mit Hinweis mittig; Bücher schon in der
  Gruppe → Treffer ausgegraut, ohne Knopf.
- Ergebnis HTML/CSS/JS, keine Push-/Deploy-Dienste, keine Datenbank. Einzige Ausnahme seit 17.10.2026 (Auftraggeber:
  „ein Knopf, Inhalt direkt ändern, ohne lokale Dateien“): `website/speichern.php` – eine Datei, kein Framework,
  schreibt nur books.js/empfehlungen.js/info.js. Sonst kein PHP, kein weiterer Server-Code.
  Build-Schritt (Vite) seit 16.10.2026 erlaubt (Auftraggeber: React + Tailwind + Build, shadcn/ui), läuft lokal;
  gebaute Dateien liegen eingecheckt in website/. Seiten laufen weiter per Doppelklick (file://): klassische Skripte, kein `type="module"`.
- Admin „Veröffentlichen“, in dieser Reihenfolge: (1) online (https) mit eingerichtetem speichern.php → POST, sofort live;
  (2) Chrome/Edge: direkt in den Website-Ordner (File System Access API, Ordner einmal wählen, muss index.html enthalten,
  Handle in IndexedDB); (3) andere Browser: Download. Kein eigener „Stattdessen herunterladen“-Link (17.10.2026
  entfernt); ohne Ordnerzugriff ist der Hauptknopf selbst der Download. Lokal ohne PHP bleibt
  der FTP-Upload Handarbeit.
- speichern.php: GET → `{dsm:"speichern",bereit,grund?}` (Verwaltung erkennt es so; statischer Server/file:// liefert kein
  JSON → alter Weg). POST `?datei=` mit Kopfzeile `X-DSM-Schluessel`, Inhalt = fertige Datei. Angenommen nur exakt
  Kopfkommentar + `window.DSM_… = ` + JSON-Objekt mit Pflichtfeld (buecher/gruppen/zeiten) + `;\n` – nie fremder Code.
  Alte Fassung → `sicherung/` (10 je Datei), Ersetzen atomar (temp + rename, flock). Ab PHP 7.1 (Aruba-Version unbekannt):
  kein str_starts_with/array_is_list/match. Schlüssel = PBKDF2(Passwort, festes Salz „dsm-bibliothek/speichern.php“,
  310.000), steht nur im verschlüsselten Klartext (`var DSM_SPEICHERN_SCHLUESSEL`, Function-Scope, nicht window);
  `website/speichern-zugang.php` enthält nur SHA-256 davon und wird von admin-verschluesseln.js geschrieben.
- Cover-Quellen in dieser Reihenfolge: ekz-Bild direkt (`cover.ekz.de/<ISBN>.jpg`, 404 = keins, Ersatzbild s. u.),
  dann Open Library, dann Google-Bild direkt (`books.google.com/books/content?vid=ISBN…`, Ersatzbilder 128×184 und 128×170 „image not available“
  verwerfen – Google ohne CORS, nur Maße; kostet 6 echte Cover).
  ekz liefert statt 404 oft (17.10.2026: 376 von 2625 Bildern, echte Treffer ≈67 % des Bestands) ein Ersatzbild „leider kein
  aktuelles Bild vorhanden“ (170×270, immer 9977 Byte): Bilder in dieser Größe holt covers.js per `fetch` (ekz: CORS `*`)
  und vergleicht Länge + FNV-1a; nicht prüfbar = Ersatzbild. Echte 170×270-Cover (17 im Bestand) bleiben.
  NICHT: Google-Books-API (ohne Schlüssel immer 429, gemeinsames Tageskontingent), NICHT portal.dnb.de
  (Anubis-Bot-Schutz, Browser bekommen HTML → ERR_BLOCKED_BY_ORB). Open Library nur für ekz-Fehltreffer.
- Cover-Laden gestaffelt im Hintergrund für Bücher in Sichtweite, kleine Auflösung
  (OL „M“ ≈180 px, Google ≈128 px; ekz fest 170–440 px). Open Library NICHT über `/b/isbn/` laden
  (100 Abrufe / 5 min / IP, Schulnetz = eine IP) – immer `/api/books?jscmd=viewapi` (Sammelabfrage) → Cover-ID.
- Echtes Cover im Detail antippen → eigenes Fenster `#zoom` (zweiter Radix-Dialog im Portal über dem Detail, Glas-Schleier), Bild fliegt per FLIP
  (Web Animations, nur transform, `--snap`, 240/180 ms) in die Mitte, max. 27rem breit. Nur dann OL-Größe „L“ nachladen;
  Google-Bilder ohne größere Fassung höchstens 2,5-fach. Platzhalter nicht vergrößerbar.
- A–Z-Leiste nur ab 768 px (48rem). Darunter nur Suche + Buchstaben-Floater rechts (nur beim Scrollen sichtbar).
- Theme: Standard = Gerät; in den Einstellungen Automatisch/Hell/Dunkel. Dazu größere Schrift, hoher Kontrast.
- Italienischer Text bleibt Anthrazit (kein Rot für Italienisch auf der Website).
- Keine Farbstreifen-Leiste unter dem Titel. Keine Datenschutzhinweise auf der Admin-Seite.
- Fenster (Detail, Einstellungen, Fragen, Öffnungszeiten, Archiv): shadcn `Dialog` (Radix) als Glas-Fenster
  (`.glass.sheet`), Schleier `.schleier` unscharf + leicht abgedunkelt; Handy Bottom Sheet, ab 40rem mittig.
  Unschärfe ist immer an (keine Leistungsmessung, siehe Performance). Nur bei „Transparenz reduzieren“ (System) und beim
  Glas in hohem Kontrast entfällt sie.
- Langsame Verbindung: Lade-Platzhalter (Balken mit Lichtband, `.skel`) für Liste und – wenn gewählt
  (`data-empf` aus kopf.js) – Empfehlungen, bis books.js (≈700 KB) da ist; nach 6 s Hinweis „Langsame Verbindung“.
  Festes Gerüst in src/index.html bis React startet; bibliothek.js lädt VOR books.js (Kopf, Öffnungszeiten,
  Platzhalter sofort); books.js meldet sich über einen Setter auf `window.DSM_BIBLIOTHEK` (nicht auf DOMContentLoaded warten).
  Cover: Lichtband bis das Bild wirklich geladen ist.
  Jedes nachladende Element hat einen Platzhalter: Logo (`.ld-bild`, `.da` bei load/error),
  Info-Karte (nur wenn beim letzten Besuch gezeigt, `dsm-info-karte`), Entsperren-Knopf im Admin (gesperrt mit
  Spinner, bis verwaltung.js nach books.js geladen ist; Spinner auch beim Prüfen). Schriften: `font-display: swap`.
- Erster Besuch: Overlay „Möchten Sie Buchempfehlungen sehen?“ (Kopf: Bücherregal `.regal` in Logofarben, Fortschritt
  `.fortschritt` mit drei Strichen, ab Schritt 2 „Zurück“ oben; Ja/Nein auf dem Handy untereinander) → Mittelstufe / Oberstufe /
  Erwachsenenliteratur → (Erw.) Romane / Sachbücher / Biografien & Geschichte. Wahl in localStorage `dsm-empf`.
  In den Einstellungen dieselbe Wahl als Liste: Blöcke Mittelstufe / Oberstufe / Erwachsenenliteratur mit Abstand
  dazwischen, die drei Erwachsenen-Bereiche untereinander in einem Block.
- Admin-Sperre nur „schülersicher“, kein Server: PBKDF2-SHA-256 (310.000) + AES-GCM 256, Logik nur verschlüsselt.

## Design

DSM Corporate Design: Fira Sans (Regular/Medium/SemiBold), Anthrazit #333333 als Textfarbe,
Genau drei Schriftgrößen überall (`--fs-s` .875rem, `--fs-m` 1rem, `--fs-l` 1.5rem), keine anderen Werte.
Logofarben nur für Linien/Balken/Akzente (Mauve #BA8EA7, Gelb #DDD300, Orange #DB9F00,
Blau #B5C9D0, Rot #A93A39, Grün #B3CEA1). Keine Versalien, kein Kursiv, kein Unterstreichen.
Alle Farben als Tokens in `src/styles.css` (`:root`, Dark per `prefers-color-scheme` + `[data-theme]`,
Kontrast per `[data-contrast="high"]`, Schrift per `[data-font="large"]`). Minimalistische Animationen,
`prefers-reduced-motion` respektieren.

Tailwind-Theme ist auf DSM beschränkt (`--text-*`, `--font-weight-*`, `--color-*`, `--radius-*` zurückgesetzt):
Schriftgrößen nur `text-s`/`text-m`/`text-l`, Gewichte `font-normal/medium/semibold`, Farben nur shadcn-Namen
(`background`, `foreground`, `muted-foreground`, `border`, `primary`, `surface` …, alle auf DSM-Tokens) und
Logofarben (`mauve`, `gelb`, `orange`, `blau`, `rot`, `gruen`). Abstände in px (`--spacing: 4px`, `p-3` = 12px).
Kein `dark:` in Klassen – Farben wechseln über die Tokens.
Einheitliches Raster: Karten (Info, Empfehlungen, Einstellungs-Blöcke, Detail-Text) = `.karte` (16 px Radius, `surface`,
Linie innen), innen `p-4`; Blöcke über der Liste je `pb-4`; Suchfeld 48 px, Radius 12 px. Empfehlungen auch auf dem Handy
als Karte (kein randloses Band). Zugänglich: Zielflächen ≥44 px (`Button size="icon"` = 44, `icon-sm` = 40), Fokusrahmen
2 px in Textfarbe (`--focus`), Sprunglink „Zur Suche springen“ (`a[href="#q"]`), Info-Karte ohne `aria-label` (Status wird
gelesen), Liste mit unsichtbarer Überschrift `#list-t`. Logo 44 px (Handy) / 60 px.
shadcn-Komponenten nach `ui:add` immer anpassen
(`cn` aus `@/lib/utils`, keine `text-sm`/`text-xs`, kein `underline`, keine `dark:`-Klassen); regeln.test prüft das.
`cn()` kennt die eigenen Größen (tailwind-merge erweitert), sonst würde `text-s text-muted-foreground` verschluckt.

## Technik (React-API auf Preact + Tailwind + Vite)

- Quelltext importiert weiter `react`/`react-dom`; Vite ersetzt sie durch `preact/compat` (`preactAlias`, auch in `vite.config.js`). Grund: Bundle 407 → 205 KB (gzip 126 → 68 KB), verwaltung.js 378 → 181 KB. Preact 10 scheitert an Radix (ref als Prop an Funktionskomponenten → getComputedStyle-Fehler), Preact 11 läuft. Beim Preact-/Radix-Update `npm run test:alle` prüfen. Die verschlüsselte Verwaltung bleibt unverändert (React extern aus `DSM_GEMEINSAM`).
- Je Seite ein Einstieg (`src/bibliothek/main.jsx`, `src/verwaltung/main.jsx`), gebaut als IIFE mit festem Namen
  (kein Hash: FTP ersetzt Dateien, .htaccess prüft bei jedem Besuch). React mountet in `#seite` und ersetzt das feste Gerüst;
  erstes Zeichnen per `flushSync`.
- Sprache/Darstellung/Empfehlungs-Wahl: kleine Stores mit `useSyncExternalStore` (`lib/sprache`, `lib/darstellung`,
  `bibliothek/wahl`); Texte meldet jedes Modul mit `woerter({de, it})` an.
- Verwaltung: Sperre (öffentlich) entschlüsselt `admin.enc.js`, `new Function(src)()` setzt `window.DSM_VERWALTUNG.App`.
  Die verschlüsselte App bindet React und `@/…` nicht ein, sondern nimmt sie aus `window.DSM_GEMEINSAM` (ein React).
- covers.js, protokoll.js, kategorien-it.js und die Daten-Skripte bleiben klassische Skripte (window.*), unverändert.
- Test-Hooks (IDs/Klassen wie `#list .row`, `#d-cover`, `.ask`, `.settings`, `#e-res`) sind Teil der Schnittstelle zu
  den E2E-Tests – beim Umbau erhalten. Radix-Fenster: `[role=dialog]`, geschlossen = nicht im DOM.

## Performance

- Liste: `#list > .rows > ul` Abschnitte zu höchstens 40 Büchern (jeder Buchstabe beginnt einen neuen, Anker
  `ul[data-l] id="L-X"`). `content-visibility: auto` + geschätzte `contain-intrinsic-size` im Stil – nur mit
  `@supports (overflow-anchor: auto)` (Safari ohne Scroll-Verankerung rendert alles). Pfeil per CSS-Maske, kein SVG
  je Zeile. A–Z-Sprung misst das Ziel in jedem Frame neu. Cover-Beobachtung: erst Abschnitte, dann deren Zeilen
  (neue Abschnitte nur einmal anmelden).
- React: jede neue Liste schrittweise (2 Abschnitte sofort, dann je 20 in eigener Task per setTimeout); `Abschnitt` ist
  `memo`. KEINE `startTransition` dafür – Transitions blieben bei laufenden Updates liegen (Tests hingen zufällig).
  Zeilen bleiben knappe CSS-Klassen (`.row`, `.t`, `.a`) statt Tailwind-Ketten. Ein Klick-Hörer für alle Zeilen.
- covers.js: keine Dauer-Intervalle; Takt-Timer (setTimeout 300/350/600/1500 ms) nur, solange Arbeit ansteht.
- Die Seite hat ~17.000 Elemente (Liste). Jede Änderung einer vererbten Eigenschaft an `<html>`/`<body>` trifft alle:
  KEINE Übergänge auf `body` (color/background), nichts Vererbtes animieren. `.list { pointer-events: auto }` fängt
  Radix' `body { pointer-events: none }` beim Öffnen jedes Fensters ab (29 → 4 ms, 4-fach gedrosselt).
- Theme/Kontrast (`lib/darstellung.js`): Markierung/Schalter sofort (React) und erst zu Ende gleiten lassen (150 ms), dann
  die ganze Seite per `document.startViewTransition` in einem Stück überblenden (`--t-farbe` 350 ms, `--ease-farbe`, alt und
  neu dieselbe Kurve). KEIN eigener Layer für `.seg3` mehr (stand in neuen Farben als harter Block auf der alten Seite).
  Vorher Logo-Bilder `loading="eager"` + `decode()` (max. 400 ms), sonst fehlt das dunkle Logo im neuen Bild. Ohne API /
  reduzierte Bewegung: sofort. Keine Klasse an `<html>` zum Abschalten von Übergängen (`:root.x *` = zweimal alles neu berechnen).
- Sprache (`components/kopf.jsx`): Markierung zuerst (`.seg[data-an]`, `will-change: transform`), `setLang` erst nach dem
  nächsten Frame (rAF + setTimeout). Sonner-Toaster mit festem `dir="ltr"` (sonst `getComputedStyle(html)` je Render).
- Unschärfe klein: Schleier `blur(8px)`, Glas `blur(18px)` (vorher 12/30). Beide stapeln sich und werden in jedem Bild
  einer Fenster-Animation neu gerechnet; ohne Unschärfe drittelt sich die GPU-Zeit (Software-GPU). Nicht wieder erhöhen.
  Versuch „Glas ohne backdrop-filter, nur Schleier unscharf“ (16:54) sah schlechter aus und wurde zurückgenommen (16:57):
  Glas bleibt `blur(18px) saturate(1.8)`, Schleier `blur(8px) saturate(1.15)` – nicht noch einmal ausprobieren.
- KEINE Leistungsmessung der Unschärfe mehr (war `lib/leistung.js`, 17.10.2026 gelöscht). Sie schaltete die Unschärfe ab,
  sobald zweimal Bildabstände > 28 ms vorkamen – auch auf dem iPhone 15: Im Stromsparmodus begrenzt iOS
  `requestAnimationFrame` auf 30 fps (33 ms, WebKit-Bug 215745, Absicht), dazu kommen Aufbau des Fensters und Cover-Laden.
  rAF-Abstände messen nicht die Kosten von `backdrop-filter`. Nicht wieder einführen, auch nicht pro Sitzung. kopf.js löscht
  nur noch die alten Merker `dsm-blur`. Unschärfe-Kosten steuert man über kleine Radien (oben) und Abschalten bei
  „Transparenz reduzieren“/hohem Kontrast, nicht über Messen.
- Markierungen DE/IT und Theme: `--t-fast` (150 ms) mit `--snap`. Buch-Detail ab 40rem: auf 140 ms, zu 110 ms, Schleier 120/110 ms.
- protokoll.js gibt erst nach dem Bild in die Konsole aus (`requestIdleCallback`, sonst 50 ms); Eintrag und Zeit entstehen sofort.
- Dauer: hinein `--t-base` 200 / `--t-slow` 250 ms, hinaus `--t-out` 160 ms. Messskripte zum Wiederholen nicht eingecheckt
  (Muster: Playwright + CDP `setCPUThrottlingRate` 4, PerformanceObserver `long-animation-frame`).
- Logos als WebP 360 px; dunkles Logo `loading="lazy"` (im hellen Modus nicht geladen). PNGs bleiben für die Anleitung.
- Messen: 390 px, CPU 4-fach gedrosselt: DOMContentLoaded ≈0,5 s, Long Tasks ≈0,2 s (vorher 17,9 s / 9,4 s).
  Vergleich alt/React am 16.10.2026 (gleiche Maschine, headless, 4-fach): DOMContentLoaded 2,1 → 2,0 s, Liste komplett
  2,5 → 3,0 s (erste Zeilen sofort), größter Block 0,85 → 0,9 s (= Parsen von books.js), übrige Blöcke ≤0,25 s,
  Suche 1,0 → 0,8 s. Bundle bibliothek.js seit Preact ≈205 KB (≈68 KB gzip; vorher ≈400 KB / 125 KB mit react-dom), style.css ≈11 KB gzip.

## Datenformate

- `books.js`: `{stand, anzahl, abdeckung?, verlauf?, buecher:[{t,u?,a?[],v?,j?,i?[],k?,s?[]}]}`
  (i = ISBN-13, geprüft; s = Standorte). `abdeckung`/`verlauf` = Cover-Abdeckung aus admin.html.
- `empfehlungen.js`: `{stand, thema?:{de,it}, gruppen:{mittelstufe|oberstufe|erw-roman|erw-sach|erw-bio:[{k,t,a,de,it}]},
  archiv?:[{stand, thema?, gruppen}]}` (archiv neueste zuerst, max. 40). Admin: andere Bücher als veröffentlicht =
  neue Runde → veröffentlichte Runde wandert vorne ins archiv, stand = heute; nur Texte/Thema geändert → stand bleibt.
  `k` = norm(Titel) + "|" + norm(Erstautor) (norm: klein, ohne Akzente, ß→ss, nur a–z0–9 und Leerzeichen).
- `info.js`: `{stand, zeiten:{mo..sa:[["HH:MM","HH:MM"]]}, hinweis:{de,it}, schliessungen:[{art:"ferien"|"abwesend",von,bis,de,it}]}`
  (Datum JJJJ-MM-TT, bis ≥ von; leerer Text → „Ferien“ bzw. „Bibliothek geschlossen“).
- localStorage: `dsm-lang`, `dsm-theme`, `dsm-font`, `dsm-contrast`, `dsm-empf`, `dsm-cover-v3` (Cover-Cache; v2 wird gelöscht), `dsm-info-karte` ("1"/"0", Platzhalter),
  Admin: `dsm-empf-entwurf`, `dsm-info-entwurf`, IndexedDB `dsm-admin` (Store `kv`, Schlüssel `website` = Ordner-Handle), Vorschau `dsm-vorschau` / `dsm-vorschau-empf` / `dsm-vorschau-info` (index.html#vorschau).
  Protokoll: `dsm-protokoll` (localStorage, "aus" = abgeschaltet), `dsm-protokoll-verlauf` (sessionStorage, letzte 500 Einträge).
- Konsolen-Protokoll (`assets/protokoll.js`): erfasst automatisch Klicks, Eingaben (600 ms entprellt), Schalter, Dateien,
  Tasten (Escape/Enter/Kombinationen), Formulare, Fenster auf/zu mit Grund (Radix-Fenster meldet `components/fenster.jsx`), Scrollen, Netz (fetch, fremde Bilder),
  Speicher-Schreibzugriffe, Fehler. Eigene Einträge: `log(bereich, text, daten?)` aus `@/lib/speicher`. Passwortfelder und Schlüssel
  (`/key|pass|pw|token/`) nie im Klartext. Felder mit `data-protokoll="eigen"` (Suchfeld) protokolliert die Seite selbst.

## Prüfen

Nach jeder Änderung `npm run build` und `npm run test:alle`. Tests in `tests/`:

- `unit/extract.test.js` – Whitelist-Extraktion gegen synthetische DB (`helfer/testdb.js`, erfundene Leser):
  SQL-Spion prüft, dass Ausleihspalten/Personentabellen nur gezählt werden; Namensabgleich, Zusammenfassen, ISBN, Sortierung, `toScript`.
- `unit/covers.test.js` – covers.js in VM-Sandbox (fetch/Image gestubbt): Reihenfolge ekz → OL → Google-Bild, Ersatzbild-Erkennung, keine Google-API, nie `/b/isbn/`, Cache-TTL, Warteschlangen, Messung.
- `unit/verschluesseln.test.js` – Roundtrip, falsches Passwort, React nur aus `DSM_GEMEINSAM` (jedes Modul dort vorhanden).
  Mit `DSM_ADMIN_PW=… npm test` zusätzlich: ist `admin.enc.js` aktuell?
- `unit/speichern.test.js` – speichern.php gegen Temp-Ordner (Zugang, nur drei Dateien, Format, Sicherung, nichts bei
  Ablehnung). Braucht PHP: `php` im PATH oder `DSM_PHP="npx --yes @php-wasm/cli" npm test` (sonst übersprungen).
- `unit/bau.test.js` – baut src/ in tests/.tmp/bau und vergleicht byte-genau mit website/ (veraltet → `npm run build`).
- `unit/daten.test.js` – Format von books.js, empfehlungen.js (Schlüssel im Bestand), info.js, Kategorien-Übersetzung.
- `unit/regeln.test.js` – harte Regeln an src/ und website/ (keine externen Hosts außer ekz/OL/Google-Bilder – react.dev/tailwindcss.com
  nur als Text –, keine Google Fonts, Design-Verbote auch in Klassen, nur drei Schriftgrößen im gebauten CSS, keine Module
  im HTML (file://), Skript-Reihenfolge, Klartext nicht in website/).
- `unit/echte-db.test.js` – nur wenn `daten/*.winbook` da ist: books.js aktuell, keine Leser-Namen. Meldungen nennen nur Anzahlen.
- `e2e/*.spec.js` – Liste/Suche/A–Z/Floater (390/768/1280 px), Ladezustand (books.js zurückgehalten), Detail+Cover (APIs gemockt, echtes Netz gesperrt), DE/IT,
  Einstellungen, Fragen-Ablauf, Empfehlungen, Info-Karte (feste Uhrzeit), Admin. Admin-Tests ersetzen `admin.enc.js` per Route durch
  eine mit „test-passwort“ verschlüsselte Fassung der aktuellen Quellen – das echte Passwort wird nicht gebraucht.
  Admin-Import muss byte-gleich zu `npm run books` sein (synthetische DB immer, Original-DB wenn vorhanden).
- `unit/tunnel.test.js` – Server hinter dem Tunnel: nur der Ordner, keine Punktdateien/PHP, kein Listing, `no-store`; Adresse aus dem Log.
- Live-Adresse (`werkzeuge/tunnel.mjs`, braucht `brew install cloudflared`, kein Konto): `npm run test:live` öffnet einen Quick
  Tunnel, setzt `DSM_LIVE_URL` und startet Playwright ohne eigenen Server (2 Worker, 60 s, 1 Wiederholung). Gegen eine schon
  laufende Adresse: `DSM_LIVE_URL=https://… npm run test:live` (auch `test:e2e`). Eigener Node-Server statt Python, weil
  Cloudflare `.js`/`.css` ohne `Cache-Control` am Rand zwischenspeichert; Adresse auch in `tests/.tmp/tunnel-url.txt`.
  Vor dem ersten Abruf wartet das Skript auf den autoritativen Nameserver (zu frühe Frage = NXDOMAIN, macOS cacht das ≈90 s).
  Tunnel ist öffentlich, solange er läuft: nur website/ (wird ohnehin öffentlich), ohne Punktdateien, `*.php` und `sicherung/`
  (PHP liefe nicht, käme als Quelltext; speichern.php fehlt also → Verwaltung veröffentlicht wie lokal). `.htaccess` gilt dort nicht.

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
   - Gebautes (`website/index.html`, `admin.html`, `assets/{bibliothek,verwaltung}.js`, `style.css`, `kopf.js`): nicht mischen,
     nach dem Merge `npm run build`.
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

## Schul-Website www.dsmailand.it (Stand 16.10.2026)

- Für dieses Projekt: nichts davon übernehmen (kein GTM, kein Lato/Google Fonts – Fira Sans lokal bleibt).
  Webspace bei Aruba: `.htaccess`-Auswertung unklar, daher `IfModule`-Absicherung beibehalten.

## Offen

- speichern.php live einrichten und prüfen (17.10.2026 nur lokal getestet: PHP-Logik per php-wasm, Verwaltung per
  Playwright mit gespieltem Server): `node werkzeuge/admin-verschluesseln.js` (Johann, Passwort) erzeugt
  speichern-zugang.php; dann admin.enc.js, speichern.php, speichern-zugang.php hochladen. Unbekannt: PHP-Version bei
  Aruba, Schreibrechte im Webspace, ob eine WAF (ModSecurity) POSTs mit JavaScript-Inhalt blockt.
- Seit Online-Speichern ist der Server Original für books.js/empfehlungen.js/info.js: beim FTP-Upload diese drei
  (und sicherung/) nicht mit alten lokalen Fassungen überschreiben.

- Cover live geprüft (16.10.2026, Chromium): ekz/OL/Google-Bild laden. In admin.html „Cover-Abdeckung prüfen“ einmal
  komplett laufen lassen. Nutzungsbedingungen von cover.ekz.de (Hotlinking ohne ekz-Vertrag) mit Johann/Schule klären.
- Safari: Unschärfe der Glas-Fenster (`.schleier`/`.glass`, backdrop-filter) ungetestet.
- Browser-Untergrenze durch Tailwind v4: Safari 16.4+, Chrome 111+, Firefox 128+ (u. a. `color-mix`, `@property`).
  Schul-PC mit Windows 7 (Chrome ≤109) zeigt die Seite ggf. mit Stilfehlern – bei Bedarf prüfen.- Die 20 Start-Empfehlungstexte (DE/IT) hat Claude geschrieben – Johann soll sie gegenlesen.
- Git-Repo lokal angelegt (Branch main), noch kein Remote. Falls Remote: nur privat – werkzeuge/quelle/ liegt im Klartext.
