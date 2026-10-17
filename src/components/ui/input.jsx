import * as React from "react";

import { cn } from "@/lib/utils";

const feld = "w-full min-w-0 rounded-lg border border-input bg-background text-m text-foreground outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-muted-foreground focus:border-foreground focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--blau)_55%,transparent)] disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-45 aria-invalid:border-rot";

function Input({ className, type, ...props }) {
  return <input type={type} data-slot="input" className={cn(feld, "h-11 px-3.5 appearance-none", className)} {...props} />;
}

export { Input, feld };
