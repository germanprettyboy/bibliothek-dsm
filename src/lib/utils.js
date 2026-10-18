import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Custom font sizes (exactly three: text-s, text-m, text-l); otherwise tailwind-merge would take them for colors
// and drop one of the two classes in "text-s text-muted-foreground".
const twMerge = extendTailwindMerge({ extend: { theme: { text: ["s", "m", "l"] } } });

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
