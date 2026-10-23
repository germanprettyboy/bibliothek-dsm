import * as React from "react";
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui Button in the DSM design. No "link" variant (underlining is ruled out by the corporate design).
// Like shadcn: controls in font-medium (500, 600 only for headings), no size below 44 px (target size), icons 18 px.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium text-m transition-[transform,opacity,background-color,box-shadow,color] duration-(--t-fast) ease-dsm disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      variant: {
        default: "border border-foreground bg-foreground text-background hover:opacity-90 active:scale-[.98]",
        outline: "border border-border bg-background text-foreground hover:bg-surface active:scale-[.98]",
        // quiet text button (back, inline actions in a sentence): the color sets it apart (no underlining)
        ghost: "text-muted-foreground hover:text-foreground",
        // glass buttons in the dialogs
        glass: "rounded-full border border-glass-brd text-foreground backdrop-blur-[10px] [background:linear-gradient(180deg,var(--gb-top),var(--gb-bot))] shadow-[inset_0_1px_0_var(--glass-hi),var(--sh-s)] hover:shadow-[inset_0_1px_0_var(--glass-hi),var(--sh-m)] active:scale-[.97]",
        "glass-primary": "rounded-full border border-foreground bg-foreground text-background shadow-m active:scale-[.97]",
        // round icon button with border (settings, close)
        icon: "rounded-full border border-border bg-background text-foreground hover:bg-surface active:scale-[.94]",
        // round icon button without border (clear the search, close the announcement): background only on hover
        "icon-ghost": "rounded-full text-current hover:bg-[color-mix(in_srgb,currentColor_14%,transparent)] active:scale-[.94]",
      },
      size: {
        default: "h-11 rounded-md px-5",
        lg: "min-h-12 px-6",
        // at least 44 px target size (WCAG 2.5.5)
        icon: "size-11",
        // may wrap: long text buttons (admin page "copy hours …") made the page too wide on phones
        text: "min-h-11 px-1 py-2 whitespace-normal text-left",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({ className, variant = "default", size = "default", asChild = false, ...props }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...(asChild ? {} : { type: "button" })}
      {...props}
    />
  );
}

export { Button, buttonVariants };
