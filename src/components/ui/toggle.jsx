import * as React from "react";
import { cva } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "relative z-[1] inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium text-muted-foreground transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:font-semibold data-[state=on]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Teil einer Segment-Wahl: die Markierung gleitet per CSS (.seg, .seg3) unter den gewählten Knopf
        segment: "rounded-full bg-transparent",
        // Segment mit eigener Fläche je Knopf (Reiter, Ferien/Abwesenheit)
        flaeche: "rounded-md bg-transparent data-[state=on]:bg-background data-[state=on]:shadow-[0_1px_4px_rgba(0,0,0,.08),inset_0_0_0_1px_var(--line)]",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-8 min-w-10 px-2.5 text-s",
        xs: "h-[34px] px-3",
      },
    },
    defaultVariants: { variant: "segment", size: "default" },
  }
);

function Toggle({ className, variant, size, ...props }) {
  return <TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />;
}

export { Toggle, toggleVariants };
