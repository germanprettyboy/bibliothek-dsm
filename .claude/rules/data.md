---
paths:
  - "tools/source/extract.js"
  - "tools/generate-books.js"
  - "tools/migrate-data.mjs"
  - "src/library/data.js"
  - "src/library/info.jsx"
  - "tools/source/admin/{catalog,publish,recommendations,info,covers,maintenance,fixes,stats}.jsx"
  - "tools/source/admin/{fixes-core,versions,table-data}.js"
  - "website/books.js"
  - "website/recommendations.js"
  - "tests/unit/{data,extract,generate-books,migrate,real-db}.test.js"
  - "tests/helpers/**"
---

# Data: extraction and file formats

## Privacy (extract.js, generate-books.js)

- Extraction = whitelist: title, subtitle, author, publisher, year, ISBN, category, location. Reader/loan/fee/user/session tables
  only counted; loan columns of `books` never read. Name check reader file ↔ public fields (generate-books.js stops on a hit or
  without name columns). Maintenance (`inspect()`, tab Pflege) reads `INSPECT_COLUMNS` = public columns + `bsignatur`, `bzugang`
  (SQL spy test); nothing published; category/location names containing a reader name only as `#id`.
- Only media type Buch/Graphic Novel; copies merged (title + first author). **No ISBN completion.**
- `npm run books` exits 2 on a reader name in a public field → check, then `-- --names-checked`.

## Formats

- `books.js`: `{updated, count, coverage?, history?, catIt?, noCover?, books:[{t,s?,a?[],p?,y?,i?[],c?,l?[]}]}`; coverage/history =
  `{updated, books, isbn, cover?, ekz?, ol?, none?, checked?, complete?}` (old entries may carry `gb`); catIt = `{German: Italian}`;
  noCover = ISBNs with a wrong cover; both kept by `npm run books`. ≈720 KB in one line: inspect with `node -e`, never cat it.
- `recommendations.js`: `{updated, off?:true, topic?:{de,it}, groups:{middle|upper|adult-fiction|adult-nonfiction|adult-bio:[{k,t,a,de,it}]},
  archive?:[{updated, topic?, groups}]}` (newest first, max 40). Other books = new round (old one to archive); only texts → same round.
  `k` = norm(title)|norm(first author) (lower case, no accents, ß→ss, a–z0–9 and spaces).
- `info.js`: `{updated, hours:{mon..sun:[["HH:MM","HH:MM"]]}, notice:{de,it,from?,to?}, contact?:{email?,phone?,de?,it?},
  closures:[{type:"holiday"|"absent"|"special",from,to,de,it,hours?}], announcement?:{de,it,color,until?}}` (YYYY-MM-DD; `special` with
  1–2 hours = open ONLY then, holiday/absence wins). NOT committed (`.gitignore`); missing = no info card.
- A changed data format = full CI.
