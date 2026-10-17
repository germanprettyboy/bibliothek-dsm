# Bibliothek DSM – Bücherliste der Deutschen Schule Mailand

Statische Website: öffentliche Bücherliste der Schulbibliothek + passwortgeschützte Verwaltung. Zweisprachig DE/IT, mobile first.
React-API auf Preact 11 (`preact/compat`, Alias `preactAlias` in `werkzeuge/bauen.mjs`) + Tailwind CSS v4 + shadcn/ui, Vite baut
feste Dateien nach `website/` (reines HTML/CSS/JS). Einzige Server-Datei: `speichern.php`.
Auftraggeber/Nutzer: Johann Bucher (Freiwilliger an der DSM). Antworten auf Deutsch, ohne Floskeln, ohne Emojis.

## Ordner

```
website/   ← NUR dieser Ordner kommt auf den Webspace (https). Gebautes wird eingecheckt (FTP lädt website/ hoch).
  index.html, admin.html     GEBAUT aus src/
  books.js, empfehlungen.js, info.js   window.DSM_BIBLIOTHEK / DSM_EMPFEHLUNGEN / DSM_INFO – erzeugt, nie von Hand
  speichern.php              Verwaltung speichert die drei Datendateien direkt (von Hand, Regeln unten)
  speichern-zugang.php       SHA-256 des Speicher-Schlüssels – erzeugt von admin-verschluesseln.js
  sicherung/                 nur auf dem Server: alte Fassungen (von speichern.php)
  LIESMICH.txt               Anleitung für Johann / die Bibliothek
  .htaccess                  nur Apache: gzip + Cache-Header (per IfModule; bei Error 500 löschen)
  assets/  bibliothek.js (Liste), verwaltung.js (Sperre + React/shadcn-Bausteine), style.css, kopf.js   GEBAUT
           protokoll.js   DSM_LOG, Interaktionen in die Konsole (von Hand, vor allem anderen geladen)
           covers.js      Cover-Laden, Cache, Abdeckungsmessung (von Hand)
           kategorien-it.js, vendor/sql-asm.js (sql.js 1.10.3, asm.js, kein WASM), fonts/ (Fira Sans 400/500/600, DSGVO)
           admin.enc.js   VERSCHLÜSSELT: quelle/extract.js + gebaute quelle/verwaltung/
src/       ← Quelltext, NICHT hochladen
  index.html, admin.html     Vorlagen mit festem Lade-Gerüst (#seite), nur kopiert
  kopf.js                    klassisches Skript im <head>: Theme/Sprache vor dem ersten Zeichnen, Platzhalter-Merker
  styles.css                 Tailwind v4: DSM-Tokens, Theme, Bausteine (Liste, Cover, Glas, Platzhalter)
  components/ui/             shadcn/ui, an DSM angepasst; components/: fenster (Glas-Dialog), kopf, einstellungen
  lib/                       utils (cn), speicher (localStorage, log), sprache (t()), darstellung, hinweis (Toast),
                             umwelt (`still` = reduzierte Bewegung, `C()` = covers.js), wischen (Handy-Sheet Detail)
  bibliothek/                main, app, daten, liste, kategorien (Filter), detail (+Zoom), cover, empfehlungen (+Archiv, Fragen), info, wahl
  verwaltung/                main, sperre (PBKDF2/AES-GCM), gemeinsam (window.DSM_GEMEINSAM)
werkzeuge/ ← NICHT hochladen
  bauen.mjs                  src/ → website/ (Vite, je Seite ein IIFE, feste Dateinamen)
  quelle/extract.js          Whitelist-Extraktion aus der WinBIAP-SQLite (Klartext, auch Node)
  quelle/verwaltung/         Verwaltungs-UI (Klartext, React): app, bestand, empfehlungen, info, veroeffentlichen, woerter
  admin-verschluesseln.js    quelle/ (React extern) → website/assets/admin.enc.js
  books-erzeugen.js          DB → website/books.js (gleiche Logik wie admin.html)
  tunnel.mjs                 Cloudflare Quick Tunnel für website/ (auch Playwright)
  lokal.mjs, lokal-router.php  PHP-Server (php-wasm über npx, gepinnt), Wurzel website/; Router liefert admin.enc.js aus
                             tests/.tmp/lokal/, setzt DSM_ZUGANG_DATEI. lokal-adresse.cjs (NODE_OPTIONS): nur 127.0.0.1
                             (php-wasm übergeht sonst „-S“ und lauscht im ganzen Netz), Log gefiltert, belegter Port → Meldung
  branches.sh                offene Branches + Integration in main
  npx (php-wasm, browser-sync, shadcn) immer mit exakter Version + `--prefer-offline`: ein Cache-Ordner je Paketangabe
  (~/.npm/_npx), sonst Registry-Abfrage je Start bzw. Neuinstallation (php-wasm ≈470 MB). Bewusst nicht in package.json.
components.json, vite.config.js   shadcn (JSX, Aliase @/components, @/lib) / Editor+CLI
tests/     unit/ (node:test), e2e/ (Playwright), helfer/, .tmp/ (ignoriert)     ← NICHT hochladen
doku/      Hintergrund, u. a. dsmailand-techstack.md                           ← NICHT hochladen
daten/     BIBLIOTHEK_DSM_2024.winbook (Schülerdaten!), Schullogo_original.png  ← NIEMALS einchecken/hochladen
```

## Befehle

```bash
npm install
npm run build          # src/ → website/ (nach JEDER Änderung an src/, Ergebnis committen)
npm run books          # daten/*.winbook → website/books.js
npm run serve          # http://localhost:8765
npm run dev            # Watch-Build + Live-Reload (browser-sync über npx, gepinnt)
npm run tunnel         # website/ unter https://….trycloudflare.com (Handy/Schul-PC); tunnel:dev mit Watch + Live-Reload
npm run lokal          # wie Webspace: PHP + echtes speichern.php, Watch-Build, Passwort „lokal“ (DSM_LOKAL_PW),
                       #   http://127.0.0.1:8765/admin.html
npm run tunnel:php     # lokal + öffentliche https-Adresse: Veröffentlichen per speichern.php vom Handy, schreibt nach
                       #   website/ dieses Checkouts; zufälliges Passwort wird gezeigt
npm run ui:add -- <name>                # neue shadcn-Komponente (danach an DSM anpassen!)
node werkzeuge/admin-verschluesseln.js  # nach JEDER Änderung an werkzeuge/quelle/* (fragt Passwort verdeckt)
npm test               # Unit (~15 s);  test:e2e Playwright (~1 min, Port je Checkout);  test:alle beides
npm run test:live      # E2E über eigenen Tunnel (~3,5 min)
npm run branches       # was fehlt in main?;  npm run integrieren -- <branch>
```

Admin-Passwort steht absichtlich in keiner Datei: Johann fragen, nicht raten, nicht notieren. Ändert sich, was die Verwaltung
von der Seite importiert (`@/…`), muss es in `src/verwaltung/gemeinsam.js` stehen (Test prüft das).

## Harte Regeln (vom Auftraggeber)

- **Keine Schülerdaten, kein Ausleihstatus öffentlich.** Extraktion = Whitelist: Titel, Untertitel, Autor, Verlag, Jahr, ISBN,
  Kategorie, Standort. Leser-/Ausleih-/Gebühren-/Benutzer-/Sitzungstabellen nur gezählt; Ausleihspalten der `books`-Tabelle
  (verliehenan, verliehenanklasse, bverliehen, …) nie gelesen. Zusätzlich Namensabgleich Leserdatei ↔ öffentliche Felder.
- Nur Bücher (Medientyp Buch/Graphic Novel), Mehrfachexemplare zusammengefasst (Titel + Erstautor).
- **Keine ISBN-Ergänzung.** Cover nur über vorhandene ISBN, sonst gestalteter Platzhalter (ohne Autor).
- Liste = reiner Text (Titel + Autor); Cover nur in Detail und Empfehlungen. Kein Stand öffentlich (nur Admin), kein Footer.
  `#meta` über der Liste: „4.545 Bücher“ (erlaubt seit 17.10.2026), beim Suchen „n Treffer“.
- Empfehlungen: Handy = senkrechte Liste (kleines Cover links, Titel/Autor rechts, Trennlinien), KEIN Karussell; ab 40rem
  vier große Cover. Kopf der Karte (Titel + Pfeil) öffnet „Bisherige Empfehlungen“: Zeitleiste neueste Runde zuerst, je
  Datum, „Aktuell“, Thema, darunter Bücher der gewählten Gruppe mit Text; Klick → Detail darüber.
- Suchleiste klebt deckend oben; beim Suchen beginnen Treffer direkt unter der Leiste (`main.books` mind. bildschirmhoch).
- A–Z-Leiste nur ab 48rem (768 px), darunter Suche + Buchstaben-Floater rechts (nur beim Scrollen).
- Kategorie-Filter (17.10.2026, `bibliothek/kategorien.jsx`): `#k-btn` rechts neben der Suche (Handy nur Symbol, ab 40rem
  „Kategorie“) → Glas-Fenster mit Suchfeld `#k-q`, alle Kategorien mit Anzahl (`[data-kat]` = `alle` | `g:<Oberbegriff>` |
  `k:<Kategorie>`). ≥2 Kategorien mit gleichem Teil vor „ - “/„: “ = Gruppe: Oberbegriff wählt alle, Unterkategorien
  eingerückt, reine Oberbegriff-Kategorie heißt „allgemein“. Eine Wahl, als Chip `.k-chip` unter der Suche (`#k-weg` hebt
  auf), wirkt mit der Suche zusammen (`#meta` „n Treffer“). Nicht gespeichert. Ohne Kategorie (≈1.500) nur unter „Alle
  Bücher“. IT-Oberbegriff = erster Teil einer übersetzten Unterkategorie (kategorien-it.js).
- Verwaltung: keine Zeile „Aktuell veröffentlicht …“, kein „Entwurf im Browser gespeichert“ (nur `#i-state` bei
  unvollständigen Info-Angaben), keine Zähler „(4)“ an Gruppen, keine Datenschutzhinweise. `#e-groups` = shadcn `ToggleGroup`
  Variante `flaeche` (bricht auf dem Handy um); Reiter ≤420 px volle Breite. `#lock-btn` = Schloss, Text gleitet bei
  Hover/Fokus rechts heraus (Grid 0fr→1fr, `motion-reduce` ohne), `aria-label` immer. `App` bekommt nur `sperren`.
  Empfehlungs-Editor: Gruppe voll (4) → Suchfeld gesperrt, Hinweis mittig; schon enthaltene Treffer ausgegraut ohne Knopf.
- Ergebnis HTML/CSS/JS: keine Push-/Deploy-Dienste, keine Datenbank, kein weiterer Server-Code. Ausnahme `speichern.php`
  (17.10.2026, „ein Knopf, Inhalt direkt ändern“): eine Datei, kein Framework, schreibt nur die drei Datendateien.
  Vite-Build lokal erlaubt (16.10.2026), Gebautes eingecheckt. Seiten laufen per Doppelklick (file://): klassische Skripte,
  kein `type="module"`.
- „Veröffentlichen“ in dieser Reihenfolge: (1) online mit eingerichtetem speichern.php → POST, sofort live; (2) Chrome/Edge:
  File System Access API in den Website-Ordner (einmal wählen, muss index.html enthalten, Handle in IndexedDB); (3) sonst
  Download = Hauptknopf (kein eigener „Stattdessen herunterladen“-Link). Lokal ohne PHP bleibt FTP Handarbeit.
- speichern.php: GET → `{dsm:"speichern",bereit,grund?}` (kein JSON = statischer Server → alter Weg). POST `?datei=` mit
  `X-DSM-Schluessel`, Inhalt = fertige Datei; angenommen nur exakt Kopfkommentar + `window.DSM_… = ` + JSON-Objekt mit
  Pflichtfeld (buecher/gruppen/zeiten) + `;\n`. Alte Fassung → `sicherung/` (10 je Datei), Ersetzen atomar (temp + rename,
  flock). PHP ≥7.1 (kein str_starts_with/array_is_list/match). Schlüssel = PBKDF2(Passwort, Salz „dsm-bibliothek/speichern.php“,
  310.000), nur im verschlüsselten Klartext (`var DSM_SPEICHERN_SCHLUESSEL`, Function-Scope, nicht window).
- Admin-Sperre nur „schülersicher“: PBKDF2-SHA-256 (310.000) + AES-GCM 256, Logik nur verschlüsselt.
- Cover-Quellen in dieser Reihenfolge:
  1. ekz direkt `cover.ekz.de/<ISBN>.jpg` (404 = keins). Oft Ersatzbild „leider kein aktuelles Bild“ (170×270, immer 9977
     Byte; 376 von 2625): Bilder dieser Größe per `fetch` (CORS `*`) prüfen, Länge + FNV-1a; nicht prüfbar = Ersatzbild.
     Echte 170×270-Cover (17) bleiben.
  2. Open Library nur für ekz-Fehltreffer, immer `/api/books?jscmd=viewapi` (Sammelabfrage) → Cover-ID, NIE `/b/isbn/`
     (100 Abrufe/5 min/IP, Schulnetz = eine IP).
  3. Google-Bild direkt `books.google.com/books/content?vid=ISBN…`; Ersatzbilder 128×184 und 128×170 verwerfen (kein CORS,
     nur Maße).
  NICHT: Google-Books-API (ohne Schlüssel 429), NICHT portal.dnb.de (Anubis → ERR_BLOCKED_BY_ORB).
  Laden gestaffelt im Hintergrund für Bücher in Sichtweite, klein (OL „M“ ≈180 px, Google ≈128 px, ekz fest 170–440 px).
- Echtes Cover im Detail antippen → `#zoom` (zweiter Radix-Dialog über dem Detail, Glas-Schleier), FLIP-Flug (Web
  Animations, nur transform, `--snap`, 240/180 ms) in die Mitte, max. 27rem. Nur dann OL „L“ laden; Google höchstens
  2,5-fach. Platzhalter nicht vergrößerbar.
- Buch-Detail auf dem Handy (<40rem, `lib/wischen.js`): Sheet bildschirmhoch, per transform halbhoch geparkt, fliegt von
  unten ein (Feder als `linear()`), Finger führt 1:1, hoch wischen = Vollbild (Inhalt scrollt), runter = halb, weiter =
  schließen (Geschwindigkeit entscheidet), Schleier blendet mit. Ab 40rem / reduzierte Bewegung unverändert. Test: detail.spec „Wischen“.
- Fenster (Detail, Einstellungen, Fragen, Öffnungszeiten, Archiv): shadcn `Dialog` als Glas (`.glass.sheet`), Schleier
  `.schleier` unscharf + leicht dunkel; Handy Bottom Sheet, ab 40rem mittig. Unschärfe immer an, entfällt nur bei
  „Transparenz reduzieren“ und beim Glas in hohem Kontrast.
- Theme: Standard = Gerät; Einstellungen Automatisch/Hell/Dunkel, größere Schrift, hoher Kontrast.
- Italienischer Text bleibt Anthrazit (kein Rot). Keine Farbstreifen-Leiste unter dem Titel.
- Langsame Verbindung: Lade-Platzhalter (`.skel`, Lichtband) für Liste und – wenn gewählt (`data-empf` aus kopf.js) –
  Empfehlungen, bis books.js (≈700 KB) da ist; nach 6 s „Langsame Verbindung“. Festes Gerüst in src/index.html bis React
  startet; bibliothek.js lädt VOR books.js; books.js meldet sich per Setter auf `window.DSM_BIBLIOTHEK` (nicht
  DOMContentLoaded). Jedes nachladende Element hat Platzhalter: Cover (bis Bild geladen), Logo (`.ld-bild`, `.da` bei
  load/error), Info-Karte (nur wenn letztes Mal gezeigt, `dsm-info-karte`), Entsperren-Knopf (Spinner bis verwaltung.js
  nach books.js geladen; auch beim Prüfen). Schriften `font-display: swap`.
- Erster Besuch: Overlay „Möchten Sie Buchempfehlungen sehen?“ (Kopf: Regal `.regal` in Logofarben, `.fortschritt` mit drei
  Strichen, ab Schritt 2 „Zurück“ oben; Ja/Nein auf dem Handy untereinander) → Mittelstufe / Oberstufe /
  Erwachsenenliteratur → (Erw.) Romane / Sachbücher / Biografien & Geschichte. Gespeichert in `dsm-empf`. Einstellungen:
  dieselbe Wahl als Liste, Blöcke Mittelstufe / Oberstufe / Erwachsene mit Abstand, die drei Erwachsenen-Bereiche in einem Block.

## Design

DSM Corporate Design: Fira Sans (400/500/600), Text Anthrazit #333333. Genau drei Schriftgrößen (`--fs-s` .875rem,
`--fs-m` 1rem, `--fs-l` 1.5rem). Logofarben nur für Linien/Balken/Akzente: Mauve #BA8EA7, Gelb #DDD300, Orange #DB9F00,
Blau #B5C9D0, Rot #A93A39, Grün #B3CEA1. Keine Versalien, kein Kursiv, kein Unterstreichen. Minimalistische Animationen,
`prefers-reduced-motion` respektieren.

- Alle Farben als Tokens in `src/styles.css`: `:root`, Dark per `prefers-color-scheme` + `[data-theme]`, `[data-contrast="high"]`,
  `[data-font="large"]`.
- Tailwind-Theme auf DSM beschränkt (`--text-*`, `--font-weight-*`, `--color-*`, `--radius-*` zurückgesetzt): nur `text-s/m/l`,
  `font-normal/medium/semibold`, shadcn-Farbnamen (`background`, `foreground`, `muted-foreground`, `border`, `primary`,
  `surface` …) und Logofarben (`mauve`, `gelb`, `orange`, `blau`, `rot`, `gruen`). `--spacing: 4px` (`p-3` = 12 px).
  Kein `dark:` – Farben wechseln über Tokens.
- Raster: Karten (Info, Empfehlungen – auch auf dem Handy –, Einstellungs-Blöcke, Detail-Text) = `.karte` (16 px Radius,
  `surface`, Linie innen), innen `p-4`; Blöcke über der Liste je `pb-4`; Suchfeld 48 px, Radius 12 px. Logo 44 px / 60 px.
- Zugänglich: Zielflächen ≥44 px (`Button size="icon"` = 44, `icon-sm` = 40), Fokusrahmen 2 px Textfarbe (`--focus`),
  Sprunglink „Zur Suche springen“ (`a[href="#q"]`), Info-Karte ohne `aria-label`, Liste mit unsichtbarer Überschrift `#list-t`.
- shadcn nach `ui:add` anpassen: `cn` aus `@/lib/utils`, keine `text-sm`/`text-xs`, kein `underline`, kein `dark:` (regeln.test
  prüft). `cn()` kennt die eigenen Größen (tailwind-merge erweitert), sonst verschluckt es `text-s text-muted-foreground`.

## Technik

- Quelltext importiert `react`/`react-dom`, Vite ersetzt durch `preact/compat` (Bundle halbiert, ≈205 KB / 68 KB gzip).
  Preact 10 scheitert an Radix (ref als Prop → getComputedStyle-Fehler). Bei Preact-/Radix-Update `npm run test:alle`.
- Je Seite ein Einstieg (`src/bibliothek/main.jsx`, `src/verwaltung/main.jsx`) als IIFE mit festem Namen (kein Hash: FTP
  ersetzt Dateien). React mountet in `#seite`, ersetzt das Gerüst, erstes Zeichnen per `flushSync`.
- Stores mit `useSyncExternalStore` (`lib/sprache`, `lib/darstellung`, `bibliothek/wahl`); Texte je Modul per `woerter({de, it})`.
- Verwaltung: Sperre entschlüsselt `admin.enc.js`, `new Function(src)()` setzt `window.DSM_VERWALTUNG.App`. Die App nimmt
  React und `@/…` aus `window.DSM_GEMEINSAM` (ein React) und bindet sie nicht ein.
- covers.js, protokoll.js, kategorien-it.js und Daten-Skripte bleiben klassische Skripte (window.*).
- Test-Hooks (`#list .row`, `#d-cover`, `.ask`, `.settings`, `#e-res` …) sind Schnittstelle zu E2E – erhalten.
  Radix-Fenster: `[role=dialog]`, geschlossen = nicht im DOM.

## Performance

- Liste (~17.000 Elemente): `#list > .rows > ul` Abschnitte ≤40 Bücher, jeder Buchstabe beginnt neu (`ul[data-l] id="L-X"`).
  `content-visibility: auto` + `contain-intrinsic-size` nur in `@supports (overflow-anchor: auto)` (Safari ohne
  Scroll-Verankerung). Pfeil per CSS-Maske, kein SVG je Zeile. A–Z-Sprung misst Ziel jeden Frame neu. Cover-Beobachtung:
  erst Abschnitte, dann deren Zeilen (Abschnitte nur einmal anmelden).
- React: neue Liste schrittweise (2 Abschnitte sofort, dann je 20 per setTimeout-Task), `Abschnitt` ist `memo`. KEINE
  `startTransition` (blieb bei laufenden Updates liegen, Tests hingen). Zeilen knappe Klassen (`.row`, `.t`, `.a`) statt
  Tailwind-Ketten. Ein Klick-Hörer für alle Zeilen.
- covers.js: keine Dauer-Intervalle; Takt-Timer (300/350/600/1500 ms) nur, solange Arbeit ansteht.
- Vererbte Eigenschaften an `<html>`/`<body>` treffen alle Elemente: KEINE Übergänge auf `body`, nichts Vererbtes animieren,
  keine Klasse an `<html>` zum Abschalten von Übergängen. `.list { pointer-events: auto }` fängt Radix' `body { pointer-events:
  none }` ab (29 → 4 ms).
- Theme/Kontrast (`lib/darstellung.js`): Markierung sofort, 150 ms gleiten lassen, dann Seite per `document.startViewTransition`
  überblenden (`--t-farbe` 350 ms, `--ease-farbe`, alt/neu gleiche Kurve). KEIN eigener Layer für `.seg3`. Vorher Logos
  `loading="eager"` + `decode()` (max. 400 ms). Ohne API / reduzierte Bewegung: sofort.
- Sprache (`components/kopf.jsx`): Markierung zuerst (`.seg[data-an]`, `will-change: transform`), `setLang` nach dem nächsten
  Frame (rAF + setTimeout). Sonner-Toaster mit festem `dir="ltr"` (sonst `getComputedStyle(html)` je Render).
- Unschärfe: Schleier `blur(8px) saturate(1.15)`, Glas `blur(18px) saturate(1.8)` – nicht erhöhen; „Glas ohne backdrop-filter“
  sah schlechter aus, nicht erneut versuchen. KEINE Leistungsmessung der Unschärfe (`lib/leistung.js` gelöscht: iOS drosselt
  rAF im Stromsparmodus auf 30 fps, WebKit-Bug 215745 – rAF-Abstände messen nicht backdrop-filter). Auch nicht pro Sitzung.
  kopf.js löscht nur alte Merker `dsm-blur`.
- Dauern: `--t-fast` 150 ms (DE/IT, Theme, mit `--snap`), hinein `--t-base` 200 / `--t-slow` 250, hinaus `--t-out` 160.
  Detail ab 40rem auf 140 / zu 110 ms, Schleier 120/110 ms.
- protokoll.js gibt erst nach dem Bild aus (`requestIdleCallback`, sonst 50 ms); Eintrag und Zeit entstehen sofort.
- Logos WebP 360 px; dunkles Logo `loading="lazy"`. PNGs bleiben für die Anleitung.
- Richtwerte (390 px, CPU 4-fach): DOMContentLoaded ≈0,5 s, Long Tasks ≈0,2 s, größter Block ≈0,9 s = Parsen von books.js;
  style.css ≈11 KB gzip. Messmuster (nicht eingecheckt): Playwright + CDP `setCPUThrottlingRate` 4, `long-animation-frame`.

## Datenformate

- `books.js`: `{stand, anzahl, abdeckung?, verlauf?, buecher:[{t,u?,a?[],v?,j?,i?[],k?,s?[]}]}` (i = ISBN-13 geprüft,
  s = Standorte, abdeckung/verlauf = Cover-Abdeckung aus admin.html).
- `empfehlungen.js`: `{stand, thema?:{de,it}, gruppen:{mittelstufe|oberstufe|erw-roman|erw-sach|erw-bio:[{k,t,a,de,it}]},
  archiv?:[{stand, thema?, gruppen}]}` (neueste zuerst, max. 40). Andere Bücher als veröffentlicht = neue Runde: alte wandert
  vorne ins archiv, stand = heute; nur Texte/Thema geändert → stand bleibt. `k` = norm(Titel) + "|" + norm(Erstautor)
  (klein, ohne Akzente, ß→ss, nur a–z0–9 und Leerzeichen).
- `info.js`: `{stand, zeiten:{mo..sa:[["HH:MM","HH:MM"]]}, hinweis:{de,it}, schliessungen:[{art:"ferien"|"abwesend",von,bis,de,it}]}`
  (JJJJ-MM-TT, bis ≥ von; leerer Text → „Ferien“ bzw. „Bibliothek geschlossen“).
- localStorage: `dsm-lang`, `dsm-theme`, `dsm-font`, `dsm-contrast`, `dsm-empf`, `dsm-cover-v3` (v2 wird gelöscht),
  `dsm-info-karte` ("1"/"0"); Admin: `dsm-empf-entwurf`, `dsm-info-entwurf`, IndexedDB `dsm-admin` (Store `kv`, Schlüssel
  `website` = Ordner-Handle), Vorschau `dsm-vorschau(-empf|-info)` (index.html#vorschau). Protokoll: `dsm-protokoll`
  ("aus" = ab), sessionStorage `dsm-protokoll-verlauf` (letzte 500).
- Konsolen-Protokoll (`assets/protokoll.js`): Klicks, Eingaben (600 ms entprellt), Schalter, Dateien, Tasten, Formulare,
  Fenster auf/zu mit Grund (Radix meldet `components/fenster.jsx`), Scrollen, Netz, Speicher-Schreibzugriffe, Fehler. Eigene
  Einträge: `log(bereich, text, daten?)` aus `@/lib/speicher`. Passwörter/Schlüssel (`/key|pass|pw|token/`) nie im Klartext.
  `data-protokoll="eigen"` (Suchfeld) protokolliert die Seite selbst.

## Prüfen

Nach jeder Änderung `npm run build` und `npm run test:alle`.

- `unit/extract` – Whitelist gegen synthetische DB (`helfer/testdb.js`): SQL-Spion (Ausleihspalten/Personentabellen nur
  gezählt), Namensabgleich, Zusammenfassen, ISBN, Sortierung, `toScript`.
- `unit/covers` – covers.js in VM-Sandbox: Reihenfolge, Ersatzbild, keine Google-API, nie `/b/isbn/`, Cache-TTL, Warteschlangen.
- `unit/verschluesseln` – Roundtrip, falsches Passwort, React nur aus `DSM_GEMEINSAM`. Mit `DSM_ADMIN_PW=…`: admin.enc.js aktuell?
- `unit/speichern` – speichern.php gegen Temp-Ordner. Braucht `php` im PATH oder `DSM_PHP="npx --yes --prefer-offline @php-wasm/cli@3.1.56"`, sonst übersprungen.
- `unit/bau` – baut nach tests/.tmp/bau, byte-genau gegen website/ (veraltet → `npm run build`).
- `unit/daten` – Format der Datendateien, Empfehlungs-Schlüssel im Bestand, Kategorien-Übersetzung.
- `unit/regeln` – harte Regeln an src/ und website/: keine externen Hosts außer ekz/OL/Google-Bilder, keine Google Fonts,
  Design-Verbote, drei Schriftgrößen im CSS, keine Module im HTML, Skript-Reihenfolge, kein Klartext in website/.
- `unit/echte-db` – nur mit `daten/*.winbook`: books.js aktuell, keine Leser-Namen (Meldungen nur Anzahlen).
- `unit/tunnel` – nur der Ordner, keine Punktdateien/PHP, kein Listing, `no-store`.
- `e2e/*` – Liste/Suche/A–Z/Floater (390/768/1280 px), Ladezustand, Detail+Cover (APIs gemockt, Netz gesperrt), DE/IT,
  Einstellungen, Fragen, Empfehlungen, Info-Karte, Admin. Admin-Tests verschlüsseln die Quellen mit „test-passwort“ (echtes
  Passwort unnötig); Admin-Import byte-gleich zu `npm run books`.
- Live (`brew install cloudflared`, kein Konto): `npm run test:live` oder `DSM_LIVE_URL=https://… npm run test:live|test:e2e`.
  Eigener Node-Server (Cloudflare cacht `.js`/`.css` ohne `Cache-Control`), Adresse auch in `tests/.tmp/tunnel-url.txt`,
  wartet auf autoritativen Nameserver (sonst NXDOMAIN-Cache ≈90 s). Tunnel öffentlich: nur website/ ohne Punktdateien,
  `*.php`, `sicherung/` (Verwaltung veröffentlicht dort wie lokal). `.htaccess` gilt dort nicht.

## Branches integrieren (Pflicht am Ende jeder Aufgabe)

Jede Aufgabe in eigenem Worktree (`.claude/worktrees/<name>`, Branch `worktree-<name>`), am Ende derselben Session per
`--no-ff`-Merge in den lokalen `main` im Haupt-Checkout. `main` ist immer hochladbar, also lauffähig.

1. Im Worktree alles committen.
2. Im Worktree `git merge main`, Konflikte **hier** lösen, nie in `main`:
   - `CLAUDE.md`, `LIESMICH.txt`, Quelltext: inhaltlich zusammenführen.
   - `admin.enc.js`: nicht mischen, nach dem Merge neu verschlüsseln.
   - Gebautes (`website/index.html`, `admin.html`, `assets/{bibliothek,verwaltung}.js`, `style.css`, `kopf.js`): nicht mischen,
     `npm run build`.
   - `books.js`: `npm run books`; `empfehlungen.js`/`info.js`: fachlich zusammenführen.
3. `npm run test:alle` grün; sichtbare Änderungen mit `npm run serve` ansehen. `werkzeuge/quelle/*` geändert → neu
   verschlüsseln (Passwort bei Johann). Committen.
4. ExitWorktree (`keep`), im Haupt-Checkout `npm run integrieren -- worktree-<name>`. Das Skript ändert `main` nicht bei:
   Haupt-Checkout unsauber/nicht auf `main`, Uncommittetem im Branch, Konflikt, Syntaxfehler in `website/**.js` oder
   `werkzeuge/**.js` – dann im Worktree beheben, erneut.
5. `git worktree remove <pfad>`, `git branch -d <branch>` (nie `-D`). Fremde Worktrees ggf. erst `git worktree unlock`.
6. Abschlussbericht: Merge-Commit und Warnungen des Skripts nennen.

Regeln:
- SessionStart-Hook (`.claude/settings.json` → `werkzeuge/branches.sh --hook`) meldet offene Branches. „Fertig committet, aber nicht in main“: zu Beginn
  integrieren, wenn erkennbar abgeschlossen (letzter Commit beschreibt fertige Aufgabe), sonst Johann fragen.
- Branches mit Uncommittetem gehören einer laufenden Session: nicht anfassen. In fremden Worktrees nie committen, stashen,
  resetten oder mergen.
- Fremder fertiger Branch mit Konflikt: eigenen Worktree von `main`, fremden Branch hineinmergen, lösen, testen, integrieren.
- `main` nur per Merge-Commit ändern: kein Rebase, kein `--force`, kein `reset --hard`.
- Worktree-Sessions fassen nur ihren Worktree an (ggf. `git -C <pfad> …`); Merge in `main` erst nach ExitWorktree.

## Schul-Website www.dsmailand.it

Nichts übernehmen (kein GTM, keine Google Fonts – Fira Sans lokal). `.htaccess`-Auswertung bei Aruba unklar → `IfModule` beibehalten.

## Offen

- speichern.php live einrichten (bisher nur lokal getestet): Johann führt `node werkzeuge/admin-verschluesseln.js` aus (erzeugt
  speichern-zugang.php), dann admin.enc.js, speichern.php, speichern-zugang.php hochladen. Unbekannt: PHP-Version bei Aruba,
  Schreibrechte, ob eine WAF (ModSecurity) POSTs mit JavaScript-Inhalt blockt.
- Server ist Original für books.js/empfehlungen.js/info.js: beim FTP-Upload diese drei (und sicherung/) nicht mit alten
  lokalen Fassungen überschreiben.
- Cover: in admin.html „Cover-Abdeckung prüfen“ einmal komplett laufen lassen. Nutzungsbedingungen cover.ekz.de (Hotlinking
  ohne ekz-Vertrag) mit Johann/Schule klären.
- Safari: Unschärfe der Glas-Fenster ungetestet.
- Tailwind v4 braucht Safari 16.4+, Chrome 111+, Firefox 128+ (`color-mix`, `@property`). Schul-PC mit Windows 7 (Chrome ≤109) ggf. mit Stilfehlern prüfen.
- Die 20 Start-Empfehlungstexte (DE/IT) hat Claude geschrieben – Johann soll sie gegenlesen.
- Remote `origin` (GitHub germanprettyboy/bibliothek-dsm) muss privat bleiben: werkzeuge/quelle/ liegt im Klartext.
