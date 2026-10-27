---
paths:
  - "tests/**"
  - "playwright.config.js"
  - ".github/**"
---

# Tests (CI only – never run them locally)

- E2E: wait with `settled(page)`, not `waitForTimeout`; phone `test.use({ ...PHONE })`; WebKit only `engines.spec.js`; cover APIs
  mocked. `swipeStages` in every dialog spec. A new spec needs an area in `tests/suites.js` and ≥ 1 `@smoke` test.
- A component's behavior and selectors = its e2e spec; test hooks must survive refactorings.
- Budgets (`build.test` gzip per file, `data.test` books.js 1000 KB / 250 KB gzip): raise deliberately only.
- Triggers, retries, caches, audit: header of `.github/workflows/test.yml` (third-party and official actions pinned to commit SHAs).
  Stress: `gh workflow run stress.yml -f repeat=5 -f workers=4 [-f grep=…]`.
- Reading CI results: `gh run watch <id> --exit-status`; on failure `gh run view <id> --log-failed | tail -n 150` (or grep for
  `✘|Error|expect`), never the whole log.
