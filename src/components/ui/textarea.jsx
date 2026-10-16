import * as React from "react";

import { cn } from "@/lib/utils";
import { feld } from "@/components/ui/input";

function Textarea({ className, ...props }) {
  return <textarea data-slot="textarea" className={cn(feld, "min-h-[4.6em] resize-y px-3 py-2.5 leading-[1.45]", className)} {...props} />;
}

export { Textarea };
