/* Shared access to the environment: "reduce motion" and covers.js (classic script, window.DSMCovers).
   Reduced motion = the system wish OR the setting "Keine Animationen" (data-motion="reduce" on <html>, set by head.js
   before the first paint and by appearance.js). styles.css stops every animation and transition for both. */
export const systemReduced = matchMedia("(prefers-reduced-motion: reduce)");
export const reduced = { get matches() { return systemReduced.matches || document.documentElement.dataset.motion === "reduce"; } };
export const C = () => window.DSMCovers;
