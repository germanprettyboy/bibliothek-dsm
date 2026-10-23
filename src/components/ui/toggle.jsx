import * as React from "react";
import { cva } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "relative z-[1] inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium text-muted-foreground transition-colors duration-(--t-base) hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      variant: {
        // part of a segmented choice: the marker glides under the chosen button via CSS (.seg, .seg3)
        segment: "rounded-full bg-transparent",
        // segment with its own surface per button (tabs, holiday/absence)
        surface: "rounded-md bg-transparent data-[state=on]:bg-background data-[state=on]:shadow-[var(--sh-s),inset_0_0_0_1px_var(--line)]",
      },
      size: {
        // at least 44 px target size, like the buttons
        default: "h-11 px-3",
        // DE/IT in the header: small text, fills its half of the 44 px round pill
        pill: "h-full min-w-11 px-3 text-s",
      },
    },
    defaultVariants: { variant: "segment", size: "default" },
  }
);

function Toggle({ className, variant, size, ...props }) {
  return <TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />;
}

export { Toggle, toggleVariants };
