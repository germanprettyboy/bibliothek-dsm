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
- Archive note (Johann, 2026-11-11): a title whose EVERY location starts with "Archiv" (WinBook "Standort": Archiv, Archiv 1 …;
  `inArchive` in `data.js`) shows the card `#d-archive` in the detail, above the details: stylized drawer on the left, "Archiv" and
  below, smaller and muted, "Der Titel entspricht nicht dem Bibliothekskonzept, er ist im Archiv zu erhalten." A copy on a shelf =
  no note. The list itself stays plain text.
- Switched off in the admin page (card "Website", info.js `hide`: `announcement` | `info` | `archive`): no banner / no opening
  hours card / no archive note; the data stays in the file.
- Preview `index.html#preview`: banner `#preview`; while the admin page is open in another tab it follows its drafts live
  (BroadcastChannel `dsm-preview`), and the banner's links `#preview-edit [data-edit]` open the editor there.
- Announcement: `aside#announce` above the header, 1–2 lines (max 140), × / Esc closes (remembered by hash); edited in admin Info.
- Opening hours in Milan time (device clock when it is on Milan time, otherwise `Intl` Europe/Rome).
- Slow connection: placeholders, after 6 s "Langsame Verbindung". library.js loads BEFORE books.js (setter on `window.DSM_LIBRARY`).
- Header: "DSM | Bibliothek" next to the logo when it fits (container query, header.spec), otherwise title below. No stripe under
  the title. Logo 44/60 px, square; search 48 px, radius 12.
- List (~17,000 elements): chunks ≤ 40 (`list.jsx`), `content-visibility` only in `@supports (overflow-anchor: auto)`, `Chunk` =
  `memo`, NO `startTransition`, one click listener. The rows of a chunk are ONE HTML string (`dangerouslySetInnerHTML`, every
  text through `esc()`): rows as elements cost three times the script time. Nothing may measure the layout after a list step.
- No `Intl` object while the page loads (the first one starts ICU, ≈ 12 ms / ≈ 50 ms on a slow phone): whole numbers by hand
  (`nf`), Milan time from the device clock when it is on Milan time (EU rule, otherwise `Intl`), the category dialog sorts only
  once it has been opened. Books are prepared in one pass (`prepare`: search text `_s`, key `_k`, letter `_l`).
- Performance reference (390 px, CPU 4×, measured 2026-11-11): first rows ≈ 0.75 s, all rows ≈ 1.1 s; largest block ≈ 0.25 s =
  evaluating library.js with the first render (books.js itself parses in ≈ 15 ms). Typing in the search: blocks ≤ 55 ms.
