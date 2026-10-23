import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full bg-border shadow-[inset_0_0_0_1px_var(--glass-edge)] transition-colors duration-(--t-slow) disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-foreground",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-6 translate-x-[3px] rounded-full bg-white shadow-s transition-transform duration-(--t-slow) ease-dsm data-[state=checked]:translate-x-[23px]"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
