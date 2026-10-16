import * as React from "react";
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui Button im DSM-Design. Keine „link“-Variante (Unterstreichen ist im Corporate Design ausgeschlossen).
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold text-m transition-[transform,opacity,background-color,box-shadow,color] duration-150 ease-dsm disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "border border-foreground bg-foreground text-background hover:opacity-90 active:scale-[.98]",
        outline: "border border-border bg-transparent text-foreground hover:bg-surface active:scale-[.98]",
        ghost: "font-normal text-muted-foreground hover:text-foreground",
        // Glas-Knöpfe in den Fenstern
        glass: "rounded-full border border-glass-brd text-foreground backdrop-blur-[10px] [background:linear-gradient(180deg,var(--gb-top),var(--gb-bot))] shadow-[inset_0_1px_0_var(--glass-hi),0_2px_10px_rgba(0,0,0,.08)] hover:shadow-[inset_0_1px_0_var(--glass-hi),0_4px_16px_rgba(0,0,0,.12)] active:scale-[.97]",
        "glass-primary": "rounded-full border border-foreground bg-foreground text-background shadow-[0_6px_18px_rgba(0,0,0,.18)] active:scale-[.97]",
        // Runder Symbolknopf mit Rand (Einstellungen, Schließen)
        icon: "rounded-full border border-border bg-background text-foreground hover:bg-surface active:scale-[.94]",
      },
      size: {
        default: "h-11 rounded-md px-[18px]",
        sm: "h-9 rounded-md px-3.5 text-s",
        lg: "min-h-[46px] px-5",
        icon: "size-10",
        "icon-sm": "size-[34px] [&_svg:not([class*='size-'])]:size-[15px]",
        text: "h-auto px-1 py-2",
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
