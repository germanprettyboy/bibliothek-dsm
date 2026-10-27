---
paths:
  - "src/library/backdrop.jsx"
  - "src/library/dots-gl.js"
  - "src/library/scenes.js"
  - "src/library/app.jsx"
  - "src/components/settings.jsx"
  - "tests/e2e/language-settings.spec.js"
---

# Interactive background

`library/backdrop.jsx` engine + settings "Hintergrund", `library/scenes.js` canvas 2D drawing; `dsm-bg` = `{on}`.

- Opt-in, OFF by default, only on the book list. ONE scene since 2026-10-27 (Johann: Linien and all tweaks removed, keep the
  preview): Punkte (halftone dot grid, the pointer a lens showing the logo colors) on the GPU (`library/dots-gl.js`, WebGL, full
  device resolution; canvas 2D only without WebGL). Settings = switch + live preview, nothing to tweak.
- Ring wave only for a click on free space, never on a book/button/field/link, never for a click that began under a dialog
  (closing a book beside it).
- Fixed `#bg` behind the page, under the column only `--fx-col`; none with high contrast/print; one still frame with reduced
  motion; while interacting 60 fps (WebGL) / 30 (2D), else 20, 10 after 30 s idle, none under a dialog or in a hidden tab; input
  listeners only while on. Search bar transparent until `.stuck`. Test hook `window.DSM_BG` {frames, gl, waves}.
