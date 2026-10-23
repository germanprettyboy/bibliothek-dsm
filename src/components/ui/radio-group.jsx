import * as React from "react";
import { CheckIcon } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function RadioGroup({ className, ...props }) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-2", className)} {...props} />;
}

// choice as a full row: color bar, text, check mark on the selected option
function RadioGroupItem({ className, children, ...props }) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "group/opt flex w-full items-center gap-3 border-t border-border bg-transparent px-4 py-3 text-left text-foreground transition-colors first:border-t-0 data-[state=checked]:bg-background",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon aria-hidden="true" className="size-4.5 shrink-0 opacity-0 transition-opacity group-data-[state=checked]/opt:opacity-100" />
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
