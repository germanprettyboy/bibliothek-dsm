---
paths:
  - "src/library/**"
  - "src/components/**"
  - "src/head.js"
  - "src/index.html"
  - "tests/e2e/{list,header,loading,announcement,categories,detail,blur,recommendations,info,language-settings,performance}.spec.js"
---

# Book list (index.html)

- List = plain text (title + author); covers only in detail/recommendations. No "as of" date in public. `#meta` "4.545 Bücher" /
  "n Treffer". Privacy policy and imprint come from the school's main website (it links here): no footer, no own privacy page.
- Search bar sticks opaquely, hits start right below it. A–Z bar from 48rem FILTERS by initial (doesn't jump); below 48rem a letter
  floater. Category filter = glass dialog with search and groups (`categories.jsx`). Neither filter is saved.
- Recommendations: phone = vertical list (small cover left), NO carousel; from 40rem four large covers. Card head opens "Bisherige
  Empfehlungen" (timeline newest first). Chosen group without books in the catalog = empty state in the card (`#recs-none`:
  shelf, "Gerade keine Empfehlungen", button to the settings); no recommendation at all = no first-visit questions. Admin switch
  `#rec-on` "Empfehlungen auf der Website" (`off: true`): no card, archive, settings section or questions; data stays.
- First visit: overlay "Möchten Sie Buchempfehlungen sehen?" → Mittelstufe / Oberstufe / Erwachsenenliteratur → Romane / Sachbücher /
  Biografien & Geschichte (`dsm-recs`); no language question, no progress bar. Settings: same choice. Swiping the questions away = "no".
- Announcement: `aside#announce` above the header, 1–2 lines (max 140), × / Esc closes (remembered by hash); edited in admin Info.
- Opening hours in Milan time (`Intl` Europe/Rome).
- Slow connection: placeholders, after 6 s "Langsame Verbindung". library.js loads BEFORE books.js (setter on `window.DSM_LIBRARY`).
- Header: "DSM | Bibliothek" next to the logo when it fits (container query, header.spec), otherwise title below. No stripe under
  the title. Logo 44/60 px, square; search 48 px, radius 12.
- List (~17,000 elements): chunks ≤ 40 (`list.jsx`), `content-visibility` only in `@supports (overflow-anchor: auto)`, `Chunk` =
  `memo`, NO `startTransition`, one click listener.
- Performance reference (390 px, CPU 4×): DOMContentLoaded ≈ 0.5 s, largest block ≈ 0.9 s = parsing books.js.
