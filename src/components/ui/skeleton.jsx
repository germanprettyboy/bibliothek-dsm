import * as React from "react";

import { cn } from "@/lib/utils";

// loading placeholder: two bars (title, author) like a list row. The shimmer comes from the surrounding .skel.
function Skeleton({ className, ...props }) {
  return (
    <span data-slot="skeleton" className={cn("skel-row", className)} {...props}>
      <span />
      <span />
    </span>
  );
}

export { Skeleton };
