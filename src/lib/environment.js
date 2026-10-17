/* Shared access to the environment: "reduce motion" (system) and covers.js (classic script, window.DSMCovers). */
export const reduced = matchMedia("(prefers-reduced-motion: reduce)");
export const C = () => window.DSMCovers;
