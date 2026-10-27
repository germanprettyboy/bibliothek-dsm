import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full bg-border shadow-[inset_0_0_0_1px_var(--glass-edge)] transition-colors duration-[250ms] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-foreground",
        className
      )}
      {...props}
    >
      {/* Checked: the thumb in the page color – white on the anthracite track, dark on the light track of dark mode */}
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-6 translate-x-[3px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.25)] transition-transform duration-[280ms] ease-dsm data-[state=checked]:translate-x-[23px] data-[state=checked]:bg-background"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
