# Bibliothek DSM

Öffentliche Bücherliste der Schulbibliothek der Deutschen Schule Mailand (DSM) mit passwortgeschützter Verwaltung.
Zweisprachig Deutsch/Italienisch, mobile first.

- **Bücherliste** (`index.html`): alphabetisch, Suche, A–Z-Sprung, Detailansicht mit Cover, Buchempfehlungen, Öffnungszeiten/Ferien.
- **Verwaltung** (`admin.html`): Bestand aus der WinBIAP-Datenbank importieren, Empfehlungen pflegen, Öffnungszeiten eintragen, veröffentlichen.
- **Technik**: React 19, Tailwind CSS v4, shadcn/ui, gebaut mit Vite. Das Ergebnis in `website/` ist reines HTML/CSS/JS und läuft auch per Doppelklick (`file://`).
  Einzige Server-Datei: `website/speichern.php` (Online-Speichern der Verwaltung).

## Datenschutz

Keine Schülerdaten und kein Ausleihstatus öffentlich. Die Extraktion arbeitet mit einer Whitelist (Titel, Untertitel, Autor, Verlag, Jahr, ISBN, Kategorie, Standort);
Leser-, Ausleih- und Gebührentabellen werden nur gezählt. `daten/` (Original-Datenbank) ist in `.gitignore` und wird nie eingecheckt.
`werkzeuge/quelle/` liegt im Klartext: Repository nur privat halten.

## Ordner

| Ordner | Inhalt | Hochladen? |
| --- | --- | --- |
| `website/` | gebaute Seite, Daten (`books.js`, `empfehlungen.js`, `info.js`), `speichern.php`, Assets | ja, nur dieser Ordner |
| `src/` | Quelltext der Seiten (React, Tailwind, shadcn/ui) | nein |
| `werkzeuge/` | Build, Verschlüsselung der Verwaltung, Extraktion, lokaler Server, Tunnel | nein |
| `tests/` | Unit-Tests (`node:test`) und Browser-Tests (Playwright) | nein |
| `doku/`, `anleitung/` | Hintergrund-Analysen, Anleitung | nein |
| `daten/` | Original-Datenbank mit Schülerdaten | niemals |

## Loslegen

```bash
npm install
npm run build        # src/ → website/ (nach jeder Änderung an src/, Ergebnis committen)
npm run serve        # http://localhost:8765
npm run dev          # Build im Watch-Modus mit Live-Reload
npm run lokal        # wie Webspace: PHP + speichern.php echt, Verwaltung unter /admin.html (Passwort „lokal“)
npm run books        # daten/*.winbook → website/books.js
```

Nach Änderungen an `werkzeuge/quelle/**` die Verwaltung neu verschlüsseln (fragt das Passwort verdeckt ab):

```bash
node werkzeuge/admin-verschluesseln.js
```

Das Admin-Passwort steht in keiner Datei.

## Tests

```bash
npm test             # Unit-Tests, ca. 15 s
npm run test:e2e     # Browser-Tests (Chromium), ca. 1 min
npm run test:alle    # beides
npm run test:live    # Browser-Tests über Cloudflare-Tunnel (braucht cloudflared)
```

## Veröffentlichen

Den Ordner `website/` auf den Webspace laden (https). Sobald Online-Speichern eingerichtet ist, sind `books.js`, `empfehlungen.js`, `info.js`
und `sicherung/` auf dem Server das Original: beim Hochladen nicht mit alten lokalen Fassungen überschreiben.
Details in `website/LIESMICH.txt`.

## Arbeitsweise

Jede Aufgabe läuft in einem eigenen Git-Worktree und wird am Ende per `npm run integrieren -- worktree-<name>` mit `--no-ff` in `main` gemerged.
`main` ist immer lauffähig und darf hochgeladen werden. Übersicht offener Branches: `npm run branches`.
Alle Regeln, Designvorgaben und Datenformate stehen in `CLAUDE.md`.

## Auftraggeber

Johann Bucher (Freiwilliger an der DSM).
