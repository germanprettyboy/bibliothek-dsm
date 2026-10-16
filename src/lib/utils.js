import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Eigene Schriftgrößen (genau drei: text-s, text-m, text-l), sonst hielte tailwind-merge sie für Farben
// und würfe bei „text-s text-muted-foreground“ eine der beiden Klassen weg.
const twMerge = extendTailwindMerge({ extend: { theme: { text: ["s", "m", "l"] } } });

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
