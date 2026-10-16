import * as React from "react";

import { cn } from "@/lib/utils";

// Lade-Platzhalter: zwei Balken (Titel, Autor) wie eine Listenzeile. Das Lichtband kommt vom umgebenden .skel.
function Skeleton({ className, ...props }) {
  return (
    <span data-slot="skeleton" className={cn("skel-row", className)} {...props}>
      <span />
      <span />
    </span>
  );
}

export { Skeleton };
