---
paths:
  - "website/assets/covers.js"
  - "src/library/cover.jsx"
  - "src/library/detail.jsx"
  - "src/library/recommendations.jsx"
  - "src/lib/environment.js"
  - "tools/source/admin/covers.jsx"
  - "tests/unit/covers.test.js"
  - "tests/e2e/detail.spec.js"
---

# Covers

- **Covers only via an existing ISBN, NO Google** (Johann, 2026-10-23: visitor IPs not to Google): (1) ekz
  `cover.ekz.de/<ISBN>.jpg` (its "kein Bild" substitute detected by size + hash); (2) Open Library only for ekz misses, always
  `/api/books?jscmd=viewapi`, NEVER `/b/isbn/` (rate limit, school = one IP). Not DNB (bot protection). No ISBN completion.
- `noCover` ISBNs (books.js) skipped everywhere, also from the cache.
- covers.js: tick timers only while work is pending.
- Zoom only for real, shown covers (placeholders never): FLIP into the center of the VISIBLE section, small images at most 2.5×.
- Tests: cover APIs are always mocked (`tests/e2e/helpers.js`).
