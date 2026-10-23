/* Disclosure arrow "opens something": one look everywhere (16 px, Lucide stroke, muted color). On hover of its group it
   turns to the text color and nudges 2 px to the right (classes from the caller, e.g. group-hover:…). The list rows draw
   the same arrow as a CSS mask (.row::after, --chev in styles.css): 4,500 rows without an extra DOM node. */
import * as React from "react";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function Chevron({ className }) {
  return <ChevronRightIcon aria-hidden="true" className={cn("chev size-4 shrink-0 text-muted-foreground transition-[translate,color] duration-(--t-base) ease-dsm", className)} />;
}
