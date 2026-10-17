# Bibliothek DSM – Bücherliste der Deutschen Schule Mailand

Statische Website: öffentliche Bücherliste der Schulbibliothek + passwortgeschützte Verwaltung. Zweisprachig DE/IT, mobile first.
React-API auf Preact 11 (`preact/compat`, Alias `preactAlias` in `werkzeuge/bauen.mjs`) + Tailwind CSS v4 + shadcn/ui, Vite baut
feste Dateien nach `website/` (reines HTML/CSS/JS). Einzige Server-Datei: `speichern.php`.
Auftraggeber/Nutzer: Johann Bucher (Freiwilliger an der DSM). Antworten auf Deutsch, ohne Floskeln, ohne Emojis.

## Ordner

- `website/` – NUR dieser Ordner kommt auf den Webspace (https, FTP). Gebautes wird eingecheckt.
  - GEBAUT aus `src/`: `index.html`, `admin.html`, `assets/{bibliothek,verwaltung}.js`, `assets/style.css`, `assets/kopf.js`.
  - Erzeugt, nie von Hand: `books.js`, `empfehlungen.js`, `info.js` (`window.DSM_BIBLIOTHEK/DSM_EMPFEHLUNGEN/DSM_INFO`),
    `speichern-zugang.php` (SHA-256 des Speicher-Schlüssels, von admin-verschluesseln.js).
  - Von Hand: `speichern.php`, `assets/protokoll.js` (DSM_LOG, vor allem anderen geladen), `assets/covers.js` (Cover, Cache,
    Abdeckungsmessung), `assets/kategorien-it.js`, `LIESMICH.txt`, `.htaccess` (gzip + Cache per IfModule; bei Error 500 löschen).
  - `assets/admin.enc.js` VERSCHLÜSSELT (quelle/extract.js + gebaute quelle/verwaltung/). `vendor/sql-asm.js` = sql.js 1.10.3
    (asm.js, kein WASM). `fonts/` = Fira Sans 400/500/600 lokal (DSGVO). `sicherung/` nur auf dem Server (speichern.php).
- `src/` – Quelltext. `index.html`/`admin.html` = Vorlagen mit festem Lade-Gerüst (`#seite`), nur kopiert. `kopf.js` = klassisches
  Skript im `<head>` (Theme/Sprache vor dem ersten Zeichnen, Platzhalter-Merker). `styles.css` = Tokens/Theme/Bausteine.
  `verwaltung/`: main, sperre, gemeinsam (`window.DSM_GEMEINSAM`). `lib/umwelt`: `still` = reduzierte Bewegung, `C()` = covers.js.
- `werkzeuge/` – `bauen.mjs` (Vite, je Seite IIFE, feste Namen), `quelle/` (extract.js + Verwaltungs-UI, KLARTEXT),
  `admin-verschluesseln.js`, `books-erzeugen.js` (gleiche Logik wie admin.html), `tunnel.mjs`, `branches.sh`,
  `lokal.mjs`/`lokal-router.php`/`lokal-adresse.cjs` (php-wasm nur auf 127.0.0.1 – übergeht sonst „-S“ und lauscht im ganzen Netz).
  lokal: Datendateien aus/nach `tests/.tmp/lokal/daten/` (`DSM_DATEN_ORDNER`, je Start frisch aus website/) – Testen ändert
  nie die eingecheckten books.js/empfehlungen.js/info.js (vorher blockierte geänderte info.js ständig die Integration).
  npx (php-wasm, browser-sync, shadcn) immer exakte Version + `--prefer-offline` (ein Cache je Paketangabe in ~/.npm/_npx, sonst
  Registry-Abfrage je Start bzw. Neuinstallation, php-wasm ≈470 MB). Bewusst nicht in package.json.
- `tests/`, `doku/`: nicht hochladen. `daten/` (`*.winbook` mit Schülerdaten): NIEMALS einchecken/hochladen.

## Befehle

```bash
npm run build          # src/ → website/ (nach JEDER Änderung an src/, Ergebnis committen)
npm run books          # daten/*.winbook → website/books.js
npm run serve          # :8765;  dev = Watch + Live-Reload (browser-sync);  tunnel(:dev) = https://….trycloudflare.com für Handy/Schul-PC
npm run lokal          # wie Webspace: PHP + echtes speichern.php, Watch, Passwort „lokal“ → http://127.0.0.1:8765/admin.html
npm run tunnel:php     # lokal + öffentliche https-Adresse, schreibt nach tests/.tmp/lokal/daten/, zufälliges Passwort
npm run ui:add -- <n>  # neue shadcn-Komponente (danach an DSM anpassen!)
node werkzeuge/admin-verschluesseln.js   # nach JEDER Änderung an werkzeuge/quelle/* (fragt Passwort verdeckt)
npm test / test:e2e / test:alle / test:live   # Unit ~15 s / Playwright ~1 min / beides / über eigenen Tunnel ~3,5 min
```

Admin-Passwort steht absichtlich in keiner Datei: Johann fragen, nicht raten, nicht notieren. Was die Verwaltung von der Seite
importiert (`@/…`), muss in `src/verwaltung/gemeinsam.js` stehen (Test prüft das).

## Harte Regeln (vom Auftraggeber)

- **Keine Schülerdaten, kein Ausleihstatus öffentlich.** Extraktion = Whitelist: Titel, Untertitel, Autor, Verlag, Jahr, ISBN,
  Kategorie, Standort. Leser-/Ausleih-/Gebühren-/Benutzer-/Sitzungstabellen nur gezählt; Ausleihspalten der `books`-Tabelle
  (verliehenan, verliehenanklasse, bverliehen, …) nie gelesen. Zusätzlich Namensabgleich Leserdatei ↔ öffentliche Felder.
- Nur Bücher (Medientyp Buch/Graphic Novel), Mehrfachexemplare zusammengefasst (Titel + Erstautor).
- **Keine ISBN-Ergänzung.** Cover nur über vorhandene ISBN, sonst gestalteter Platzhalter (ohne Autor).
- Liste = reiner Text (Titel + Autor); Cover nur in Detail und Empfehlungen. Kein Stand öffentlich (nur Admin), kein Footer.
  `#meta` über der Liste: „4.545 Bücher“ (erlaubt seit 17.10.2026), beim Suchen „n Treffer“.
- Empfehlungen: Handy = senkrechte Liste (kleines Cover links, Titel/Autor rechts, Trennlinien), KEIN Karussell; ab 40rem vier
  große Cover. Kopf der Karte öffnet „Bisherige Empfehlungen“: Zeitleiste neueste Runde zuerst (Datum, „Aktuell“, Thema),
  darunter Bücher der gewählten Gruppe mit Text; Klick → Detail darüber.
- Suchleiste klebt deckend oben; beim Suchen beginnen Treffer direkt darunter (`main.books` mind. bildschirmhoch).
  A–Z-Leiste nur ab 48rem, darunter Buchstaben-Floater rechts (nur beim Scrollen).
- Kategorie-Filter (`src/bibliothek/kategorien.jsx`): `#k-btn` neben der Suche (Handy nur Symbol, ab 40rem „Kategorie“) →
  Glas-Fenster mit Suchfeld `#k-q`, alle Kategorien mit Anzahl (`[data-kat]` = `alle` | `g:<Oberbegriff>` | `k:<Kategorie>`).
  ≥2 Kategorien mit gleichem Teil vor „ - “/„: “ = Gruppe (Oberbegriff wählt alle, Unterkategorien eingerückt, reine
  Oberbegriff-Kategorie = „allgemein“). Eine Wahl, Chip `.k-chip` unter der Suche (`#k-weg` hebt auf), wirkt mit der Suche
  zusammen („n Treffer“), nicht gespeichert. Ohne Kategorie (≈1.500) nur unter „Alle Bücher“.
- Verwaltung: keine Zeile „Aktuell veröffentlicht …“, kein „Entwurf im Browser gespeichert“ (nur `#i-state` bei unvollständigen
  Info-Angaben), keine Zähler „(4)“, keine Datenschutzhinweise. `#e-groups` = `ToggleGroup` Variante `flaeche` (bricht um);
  Reiter ≤420 px volle Breite, Wechsel ohne Übergang (kein `transition-*` an `TabsTrigger`). `#lock-btn` = Schloss, Text gleitet bei Hover/Fokus heraus (Grid 0fr→1fr, `motion-reduce` ohne),
  `aria-label` immer. `App` bekommt nur `sperren`. Editor: Gruppe voll (4) → Suche gesperrt, Hinweis mittig; Enthaltenes grau.
- Nur HTML/CSS/JS: keine Push-/Deploy-Dienste, keine Datenbank, kein weiterer Server-Code. Ausnahme `speichern.php` (17.10.2026,
  „ein Knopf, Inhalt direkt ändern“): eine Datei, kein Framework, schreibt nur die drei Datendateien. Vite-Build lokal erlaubt.
  Seiten laufen per Doppelklick (file://): klassische Skripte, kein `type="module"`.
- „Veröffentlichen“ in dieser Reihenfolge: (1) online mit speichern.php → POST, sofort live; (2) Chrome/Edge: File System Access
  in den Website-Ordner (einmal wählen, muss index.html enthalten, Handle in IndexedDB); (3) sonst Download = Hauptknopf (kein
  eigener „Stattdessen herunterladen“-Link). Lokal ohne PHP bleibt FTP Handarbeit.
- speichern.php: GET → `{dsm:"speichern",bereit,grund?}` (kein JSON → alter Weg). POST `?datei=` mit `X-DSM-Schluessel`, Inhalt =
  fertige Datei; nur exakt Kopfkommentar + `window.DSM_… = ` + JSON-Objekt mit Pflichtfeld (buecher/gruppen/zeiten) + `;\n`.
  Alte Fassung → `sicherung/` (10 je Datei), atomar (temp + rename, flock). PHP ≥7.1 (kein str_starts_with/array_is_list/match).
  Schlüssel = PBKDF2(Passwort, Salz „dsm-bibliothek/speichern.php“, 310.000), nur im verschlüsselten Klartext
  (`var DSM_SPEICHERN_SCHLUESSEL`, Function-Scope, nicht window).
- Admin-Sperre nur „schülersicher“: PBKDF2-SHA-256 (310.000) + AES-GCM 256, Logik nur verschlüsselt.
- Cover-Quellen in dieser Reihenfolge: (1) ekz `cover.ekz.de/<ISBN>.jpg` (404 = keins). Ersatzbild „leider kein aktuelles Bild“
  = 170×270, immer 9977 Byte: solche Bilder per `fetch` (CORS `*`) prüfen, Länge + FNV-1a; nicht prüfbar = Ersatzbild; echte
  170×270-Cover bleiben. (2) Open Library nur für ekz-Fehltreffer, immer `/api/books?jscmd=viewapi` → Cover-ID, NIE `/b/isbn/`
  (100 Abrufe/5 min/IP, Schulnetz = eine IP). (3) `books.google.com/books/content?vid=ISBN…`, Ersatzbilder 128×184/128×170
  verwerfen (kein CORS, nur Maße). NICHT Google-Books-API (429), NICHT portal.dnb.de (Anubis → ERR_BLOCKED_BY_ORB).
  Gestaffelt im Hintergrund für Bücher in Sichtweite, klein (OL „M“ ≈180 px, Google ≈128 px, ekz fest 170–440 px).
- Echtes Cover im Detail antippen → `#zoom` (zweiter Radix-Dialog, Glas-Schleier), FLIP-Flug (nur transform, `--snap`, 240/180 ms)
  in die Mitte, max. 27rem. Nur dann OL „L“; Google höchstens 2,5-fach. Platzhalter nicht vergrößerbar.
- Detail auf dem Handy (<40rem, `lib/wischen.js`): Sheet bildschirmhoch, halbhoch geparkt (transform), fliegt von unten ein
  (Feder als `linear()`), Finger führt 1:1; hoch = Vollbild (Inhalt scrollt), runter = halb, weiter/schnell = schließen, Schleier
  folgt. Ab 40rem / reduzierte Bewegung unverändert. Test: detail.spec „Wischen“.
- Fenster (Detail, Einstellungen, Fragen, Öffnungszeiten, Archiv): `Dialog` als `.glass.sheet`, Schleier `.schleier` unscharf +
  dunkler; Handy Bottom Sheet, ab 40rem mittig. Unschärfe immer an, außer „Transparenz reduzieren“ und Glas in hohem Kontrast.
- Theme: Standard = Gerät; Einstellungen Automatisch/Hell/Dunkel, größere Schrift, hoher Kontrast. Italienisch bleibt
  Anthrazit (kein Rot). Keine Farbstreifen-Leiste unter dem Titel.
- Langsame Verbindung: `.skel`-Platzhalter für Liste und (wenn `data-empf` aus kopf.js) Empfehlungen, bis books.js (≈700 KB) da
  ist; nach 6 s „Langsame Verbindung“. bibliothek.js lädt VOR books.js; books.js meldet sich per Setter auf `window.DSM_BIBLIOTHEK`.
  Platzhalter für alles Nachladende: Cover (bis geladen), Logo (`.ld-bild`, `.da` bei load/error), Info-Karte (wenn zuletzt
  gezeigt, `dsm-info-karte`), Entsperren-Knopf (Spinner bis verwaltung.js geladen, beim Prüfen). Schriften `font-display: swap`.
- Erster Besuch: Overlay, zuerst „Sprache · Lingua“ (fest zweisprachig, Deutsch/Italiano, aktuelle hervorgehoben, → `dsm-lang`;
  Regal `.regal` in Logofarben, ohne Bodenlinie) → „Möchten Sie Buchempfehlungen sehen?“ (ab hier „Zurück“ oben; Ja/Nein am Handy
  untereinander) → Mittelstufe / Oberstufe / Erwachsenenliteratur → Romane / Sachbücher / Biografien & Geschichte. In `dsm-empf`.
  Kein Fortschrittsbalken (17.10.2026 entfernt). Beim Öffnen Fokus aufs Fenster (`.pane`, tabIndex -1), nicht auf einen Knopf –
  Chrome zeigt sonst beim Laden sofort den Fokusrahmen. Einstellungen: gleiche Wahl als Liste, Blöcke mit Abstand, Erwachsene in einem Block.

## Design

- DSM Corporate Design: Fira Sans 400/500/600, Text Anthrazit #333333. Genau drei Schriftgrößen (`--fs-s` .875rem, `--fs-m`
  1rem, `--fs-l` 1.5rem). Logofarben nur für Linien/Akzente: Mauve #BA8EA7, Gelb #DDD300, Orange #DB9F00, Blau #B5C9D0,
  Rot #A93A39, Grün #B3CEA1. Keine Versalien, kein Kursiv, kein Unterstreichen. Wenig Animation, `prefers-reduced-motion`.
- Farben nur als Tokens in `src/styles.css` (`:root`, `prefers-color-scheme` + `[data-theme]`, `[data-contrast="high"]`,
  `[data-font="large"]`). Tailwind-Theme auf DSM zurückgesetzt: nur `text-s/m/l`, `font-normal/medium/semibold`,
  shadcn-Farbnamen (`background`, `foreground`, `muted-foreground`, `border`, `primary`, `surface` …) und Logofarben (`mauve`,
  `gelb`, `orange`, `blau`, `rot`, `gruen`). `--spacing: 4px` (`p-3` = 12 px). Kein `dark:`.
- Raster: Karten (Info, Empfehlungen auch auf dem Handy, Einstellungs-Blöcke, Detail-Text) = `.karte` (16 px Radius, `surface`,
  Linie innen, `p-4`); Blöcke über der Liste `pb-4`; Suchfeld 48 px, Radius 12 px; Logo 44 px / 60 px.
- Zugänglich: Ziele ≥44 px (`size="icon"` 44, `icon-sm` 40), Fokus 2 px Textfarbe (`--focus`), Sprunglink `a[href="#q"]`,
  Info-Karte ohne `aria-label`, unsichtbare Listen-Überschrift `#list-t`.
- shadcn nach `ui:add`: `cn` aus `@/lib/utils`, keine `text-sm`/`text-xs`, kein `underline`, kein `dark:` (regeln.test prüft).
  `cn()` kennt die eigenen Größen (tailwind-merge erweitert), sonst verschluckt es `text-s text-muted-foreground`.

## Technik

- `react`/`react-dom` → `preact/compat` (Bundle halbiert, ≈205 KB / 68 KB gzip). Preact 10 scheitert an Radix (ref als Prop →
  getComputedStyle-Fehler). Bei Preact-/Radix-Update `npm run test:alle`.
- Je Seite ein Einstieg (`src/{bibliothek,verwaltung}/main.jsx`) als IIFE, fester Name (kein Hash: FTP ersetzt Dateien).
  Mount in `#seite` ersetzt das Gerüst, erstes Zeichnen per `flushSync`. Stores per `useSyncExternalStore` (`lib/sprache`,
  `lib/darstellung`, `bibliothek/wahl`); Texte je Modul per `woerter({de, it})`.
- Verwaltung: Sperre entschlüsselt `admin.enc.js`, `new Function(src)()` setzt `window.DSM_VERWALTUNG.App`; App nimmt React und
  `@/…` aus `window.DSM_GEMEINSAM` (ein React). covers/protokoll/kategorien-it und Daten bleiben klassische Skripte.
- Test-Hooks (`#list .row`, `#d-cover`, `.ask`, `.settings`, `#e-res` …) beim Umbau erhalten. Radix-Fenster `[role=dialog]`,
  geschlossen = nicht im DOM.

## Performance

- Liste (~17.000 Elemente): `#list > .rows > ul` Abschnitte ≤40 Bücher, jeder Buchstabe neu (`ul[data-l] id="L-X"`).
  `content-visibility: auto` + `contain-intrinsic-size` nur in `@supports (overflow-anchor: auto)`. Pfeil per CSS-Maske.
  A–Z-Sprung misst Ziel jeden Frame neu. Cover-Beobachtung: erst Abschnitte, dann Zeilen (Abschnitte einmal anmelden).
- Neue Liste schrittweise (2 Abschnitte sofort, dann je 20 per setTimeout), `Abschnitt` = `memo`. KEINE `startTransition`
  (blieb liegen, Tests hingen). Zeilen knappe Klassen (`.row`, `.t`, `.a`), ein Klick-Hörer für alle.
- covers.js: keine Dauer-Intervalle; Takt-Timer (300/350/600/1500 ms) nur bei anstehender Arbeit.
- Vererbtes an `<html>`/`<body>` trifft alle: KEINE Übergänge auf `body`, nichts Vererbtes animieren, keine Klasse an `<html>`
  zum Abschalten von Übergängen. `.list { pointer-events: auto }` fängt Radix' `body { pointer-events: none }` ab.
- Theme/Kontrast (`lib/darstellung.js`): Markierung sofort, 150 ms gleiten, dann `document.startViewTransition` (`--t-farbe`
  350 ms, `--ease-farbe`). KEIN eigener Layer für `.seg3`. Vorher Logos `loading="eager"` + `decode()` (max. 400 ms).
  Sprache (`components/kopf.jsx`): Markierung zuerst (`.seg[data-an]`, `will-change: transform`), `setLang` nach dem Frame
  (rAF + setTimeout). Sonner-Toaster mit `dir="ltr"` (sonst `getComputedStyle(html)` je Render).
- Unschärfe: Schleier `blur(8px) saturate(1.15)`, Glas `blur(18px) saturate(1.8)` – nicht erhöhen; Glas ohne backdrop-filter sah
  schlechter aus, nicht wiederholen. KEINE Messung der Unschärfe (`lib/leistung.js` gelöscht, nie pro Sitzung): iOS drosselt
  rAF im Stromsparmodus auf 30 fps (WebKit-Bug 215745), rAF misst nicht backdrop-filter. kopf.js löscht alte `dsm-blur`.
- Dauern: `--t-fast` 150 (mit `--snap`), hinein `--t-base` 200 / `--t-slow` 250, hinaus `--t-out` 160 ms; Detail ab 40rem
  140/110, Schleier 120/110 ms. protokoll.js gibt per `requestIdleCallback` aus (Eintrag/Zeit sofort).
- Logos WebP 360 px, dunkles `loading="lazy"`. Richtwerte (390 px, CPU 4-fach, CDP `setCPUThrottlingRate`): DOMContentLoaded
  ≈0,5 s, Long Tasks ≈0,2 s, größter Block ≈0,9 s = Parsen von books.js.

## Datenformate

- `books.js`: `{stand, anzahl, abdeckung?, verlauf?, buecher:[{t,u?,a?[],v?,j?,i?[],k?,s?[]}]}` (i = ISBN-13 geprüft,
  s = Standorte, abdeckung/verlauf = Cover-Abdeckung aus admin.html).
- `empfehlungen.js`: `{stand, thema?:{de,it}, gruppen:{mittelstufe|oberstufe|erw-roman|erw-sach|erw-bio:[{k,t,a,de,it}]},
  archiv?:[{stand, thema?, gruppen}]}` (neueste zuerst, max. 40). Andere Bücher als veröffentlicht = neue Runde (alte vorne
  ins archiv, stand = heute); nur Texte/Thema → stand bleibt. `k` = norm(Titel)|norm(Erstautor), norm: klein, ohne Akzente,
  ß→ss, nur a–z0–9 und Leerzeichen.
- `info.js`: `{stand, zeiten:{mo..sa:[["HH:MM","HH:MM"]]}, hinweis:{de,it}, schliessungen:[{art:"ferien"|"abwesend",von,bis,de,it}]}`
  (JJJJ-MM-TT, bis ≥ von; leer → „Ferien“ bzw. „Bibliothek geschlossen“).
- localStorage: `dsm-lang`, `dsm-theme`, `dsm-font`, `dsm-contrast`, `dsm-empf`, `dsm-cover-v3` (v2 wird gelöscht),
  `dsm-info-karte`; Admin: `dsm-empf-entwurf`, `dsm-info-entwurf`, `dsm-vorschau(-empf|-info)` (index.html#vorschau), IndexedDB
  `dsm-admin`/`kv`/`website` = Ordner-Handle. Protokoll: `dsm-protokoll` ("aus"), sessionStorage `dsm-protokoll-verlauf` (500).
- protokoll.js erfasst Interaktionen, Fenster (meldet `components/fenster.jsx`), Netz, Speicher, Fehler. Eigene Einträge:
  `log(bereich, text, daten?)` aus `@/lib/speicher`. `/key|pass|pw|token/` nie im Klartext; `data-protokoll="eigen"` = Seite selbst.

## Prüfen

Nach jeder Änderung `npm run build` + `npm run test:alle`. `tests/unit/`: Whitelist per SQL-Spion (`helfer/testdb.js`), Cover,
Verschlüsselung, speichern.php, Bau byte-genau gegen website/, Datenformate, harte Regeln (`regeln.test.js`), Tunnel.
- speichern-Test braucht `php` im PATH oder `DSM_PHP="npx --yes --prefer-offline @php-wasm/cli@3.1.56"`, sonst übersprungen.
- `DSM_ADMIN_PW=… npm test` prüft zusätzlich admin.enc.js. `echte-db.test` nur mit `daten/*.winbook` (nennt nur Anzahlen).
- E2E: Admin-Tests verschlüsseln die Quellen mit „test-passwort“; Admin-Import byte-gleich zu `npm run books`; Cover-APIs gemockt.
- Live: `brew install cloudflared`, fremde Adresse per `DSM_LIVE_URL=https://…`. Tunnel öffentlich: nur website/ ohne
  Punktdateien, `*.php`, `sicherung/`; eigener Node-Server mit `no-store` (Cloudflare cacht sonst `.js`/`.css`).

## Branches integrieren (Pflicht am Ende jeder Aufgabe)

Jede Aufgabe in eigenem Worktree (`.claude/worktrees/<name>`, Branch `worktree-<name>`), am Ende derselben Session per
`--no-ff`-Merge in den lokalen `main` (Haupt-Checkout). `main` ist immer hochladbar, also lauffähig.
1. Im Worktree committen, `git merge main`, Konflikte **hier** lösen (nie in `main`): Quelltext/CLAUDE.md/LIESMICH inhaltlich;
   `admin.enc.js` neu verschlüsseln, Gebautes `npm run build`, `books.js` `npm run books`, `empfehlungen.js`/`info.js` fachlich.
2. `npm run test:alle` grün, Sichtbares per `npm run serve` ansehen; `werkzeuge/quelle/*` geändert → neu verschlüsseln. Committen.
3. ExitWorktree (`keep`), im Haupt-Checkout `npm run integrieren -- worktree-<name>`. Bricht ab bei unsauberem Haupt-Checkout,
   Uncommittetem, Konflikt, Syntaxfehler in `website/**.js`/`werkzeuge/**.js` → im Worktree beheben, erneut. Sind im
   Haupt-Checkout NUR die drei Datendateien geändert (Verwaltung per Ordnerzugriff = gewollter Inhalt), übernimmt es sie
   vorher per Branch `daten-<Zeit>` + Merge. Datendateien in `main` nie verwerfen/zurücksetzen.
4. `git worktree remove <pfad>` (fremde erst `git worktree unlock`), `git branch -d` (nie `-D`). Bericht: Merge-Commit, Warnungen.
- `npm run branches` bzw. Hook (`.claude/settings.json` → `branches.sh --hook`) meldet offene Branches: „fertig committet,
  nicht in main“ zu Beginn integrieren, wenn erkennbar abgeschlossen, sonst Johann fragen.
- Branches mit Uncommittetem gehören einer laufenden Session: nicht anfassen; in fremden Worktrees nie committen/stashen/
  resetten/mergen. Fremder fertiger Branch mit Konflikt: eigener Worktree von `main`, hineinmergen, lösen, testen, integrieren.
- `main` nur per Merge-Commit: kein Rebase, kein `--force`, kein `reset --hard`. Worktree-Sessions fassen nur ihren Worktree an
  (`git -C <pfad> …`); Merge in `main` erst nach ExitWorktree.

## Offen

- speichern.php live einrichten (nur lokal getestet): Johann führt admin-verschluesseln.js aus (erzeugt speichern-zugang.php),
  dann admin.enc.js, speichern.php, speichern-zugang.php hochladen. Unbekannt bei Aruba: PHP-Version, Schreibrechte, WAF.
- Server ist Original für books.js/empfehlungen.js/info.js: beim FTP-Upload diese und sicherung/ nicht überschreiben.
- Cover: in admin.html „Cover-Abdeckung prüfen“ komplett laufen lassen; Nutzungsbedingungen cover.ekz.de klären.
- Ungetestet: Unschärfe in Safari; Schul-PC mit Windows 7 (Tailwind v4 braucht Chrome 111+, Safari 16.4+, Firefox 128+).
- 20 Start-Empfehlungstexte (DE/IT) von Claude – Johann soll gegenlesen. Remote `origin` (GitHub) muss privat bleiben (Klartext).
- Schul-Website: `doku/dsmailand-techstack.md`. Nichts übernehmen (kein GTM, keine Google Fonts); Aruba-`.htaccess` unklar → `IfModule`.
