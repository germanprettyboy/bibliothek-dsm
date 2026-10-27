import * as React from "react";
import { CheckIcon, MinusIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui Checkbox in the DSM design: 20 px box; the target (44 px) comes from the surrounding label.
function Checkbox({ className, ...props }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer inline-grid size-5 shrink-0 place-items-center rounded-xs bg-background shadow-[inset_0_0_0_1.5px_var(--muted)] transition-[background-color,box-shadow] duration-150 ease-dsm disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=checked]:shadow-none data-[state=indeterminate]:bg-foreground data-[state=indeterminate]:text-background data-[state=indeterminate]:shadow-none",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-items-center">
        {props.checked === "indeterminate" ? <MinusIcon aria-hidden="true" strokeWidth={3} className="size-3" /> : <CheckIcon aria-hidden="true" strokeWidth={3} className="size-3" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
