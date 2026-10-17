/* Gemeinsamer Zugriff auf die Umgebung: „Bewegung reduzieren“ (System) und covers.js (klassisches Skript, window.DSMCovers). */
export const still = matchMedia("(prefers-reduced-motion: reduce)");
export const C = () => window.DSMCovers;
