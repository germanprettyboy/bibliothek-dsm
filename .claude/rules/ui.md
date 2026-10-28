---
paths:
  - "src/**"
  - "tools/source/admin/**"
  - "website/assets/logger.js"
---

# UI of both pages: design, dialogs, technology

## Design

- DSM corporate design: Fira Sans 400/500/600, text anthracite #333333. Three font sizes (`--fs-s` .875rem, `--fs-m` 1rem, `--fs-l`
  1.5rem). Logo colors only for lines/accents: mauve #BA8EA7, yellow #DDD300, orange #DB9F00, blue #B5C9D0, red #A93A39, green #B3CEA1.
  No all caps, italics, underlining. Little animation, `prefers-reduced-motion`. Italian stays anthracite.
- Colors only as tokens in `src/styles.css` (`:root`, `prefers-color-scheme` + `[data-theme]`, `[data-contrast="high"]`,
  `[data-font="large"]`). Tailwind theme reset: only `text-s/m/l`, `font-normal/medium/semibold`, shadcn color names, logo colors +
  `anthracite`. `--spacing: 4px`. No `dark:`, no `text-sm`/`text-xs`, no `underline` (rules.test checks); `cn()` knows the custom sizes.
- `.card` = 16 px radius, `surface`, inner line, `p-4`.
- Accessible: targets ≥ 44 px, focus 2 px (`--focus`), skip link to the search. Theme default = device; settings auto/light/dark,
  larger text, high contrast.
- No marking/copying of text on both pages (Johann, 2026-10-27): `user-select: none` on body (fields stay selectable,
  `styles.css`), `head.js` refuses `copy`/`cut` outside fields.
- Durations only via tokens `--t-fast/base/slow/out` (`styles.css`). Nothing inherited animated on `<html>`/`<body>`.
- Blur always on except "reduce transparency"/high contrast. Scrim `blur(8px) saturate(1.15)`, glass `blur(18px) saturate(1.8)` –
  don't increase, don't remove, never measure.
- Color switch (`lib/appearance.js`): every change freezes transitions; View Transition only outside WebKit (UA check). Never switch
  `meta[name=theme-color]` by script.
- Targets incl. the school PC (Windows 7: Chrome 109 / Firefox ESR 115; `@supports` fallbacks, es2020) and iPhone Safari – both
  untested on real devices. Print without `:has()` (Firefox ESR 115). No regex lookbehind `(?<=`/`(?<!` (Safari < 16.4 then
  can't parse the whole script; rules.test checks).
- UI variants for decisions: `docs/entwuerfe/` (see docs/sitemap.md).

## Dialogs

Every dialog = `Dialog` `.glass.sheet` + `.scrim`; phone bottom sheet with swipe stages (`lib/swipe.js`), centered from 40rem. New
dialogs the same, `swipeStages` in every dialog spec. A swipe up past the top stage never stops: taller content scrolls on in the
same gesture / takes the momentum (not when dragging the head). Closed Radix dialog = not in DOM.

## Technology

- `react` → `preact/compat` (Preact 10 fails with Radix; Preact/Radix update = full CI). One IIFE per page, fixed names (FTP, no hash).
- Mount into `#page` via `flushSync`; stores via `useSyncExternalStore`; texts per module via `addStrings({de, it})`.
- Sonner CSS is unlayered: toast position/width in `styles.css` `.toaster[data-sonner-toaster]`.
- Test hooks (ids, classes, data attributes the specs use) must survive refactorings.
- Storage keys all start with `dsm-` (`lib/storage.js`, admin drafts `dsm-*-draft`). logger.js: `/key|pass|pw|token/` never in plaintext.
- After every change to src/: `npm run build`, commit the built files with it.
