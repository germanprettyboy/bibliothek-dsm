import * as React from "react";

import { cn } from "@/lib/utils";
import { field } from "@/components/ui/input";

function Textarea({ className, ...props }) {
  return <textarea data-slot="textarea" className={cn(field, "min-h-[4.6em] resize-y px-3 py-2 leading-normal", className)} {...props} />;
}

export { Textarea };
