import * as React from "react";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui DropdownMenu in the DSM design: glass surface (.glass .menu), items at least 44 px high (touch),
// animation via data-state in styles.css (.menu).

function DropdownMenu(props) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger(props) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuGroup(props) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuContent({ className, sideOffset = 6, ...props }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn("glass menu z-50 grid max-h-[min(28rem,var(--radix-dropdown-menu-content-available-height))] min-w-56 overflow-y-auto rounded-xl p-1.5 text-foreground", className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

const item = "relative flex min-h-11 cursor-default items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[color-mix(in_srgb,var(--fg)_8%,transparent)] [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

function DropdownMenuItem({ className, ...props }) {
  return <DropdownMenuPrimitive.Item data-slot="dropdown-menu-item" className={cn(item, className)} {...props} />;
}

function DropdownMenuCheckboxItem({ className, children, checked, ...props }) {
  return (
    <DropdownMenuPrimitive.CheckboxItem data-slot="dropdown-menu-checkbox-item" className={cn(item, "group pl-9", className)} checked={checked} {...props}>
      <span className="pointer-events-none absolute left-2.5 grid size-[18px] place-items-center rounded-xs shadow-[inset_0_0_0_1.5px_var(--muted)] group-data-[state=checked]:bg-foreground group-data-[state=checked]:text-background group-data-[state=checked]:shadow-none">
        <DropdownMenuPrimitive.ItemIndicator><CheckIcon aria-hidden="true" strokeWidth={3} className="size-3" /></DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup(props) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({ className, children, ...props }) {
  return (
    <DropdownMenuPrimitive.RadioItem data-slot="dropdown-menu-radio-item" className={cn(item, "pl-9", className)} {...props}>
      <span className="pointer-events-none absolute left-2.5 grid size-[18px] place-items-center">
        <DropdownMenuPrimitive.ItemIndicator><CheckIcon aria-hidden="true" strokeWidth={2.5} className="size-4" /></DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({ className, ...props }) {
  return <DropdownMenuPrimitive.Label data-slot="dropdown-menu-label" className={cn("px-2.5 pt-2 pb-1 text-s font-medium text-muted-foreground", className)} {...props} />;
}

function DropdownMenuSeparator({ className, ...props }) {
  return <DropdownMenuPrimitive.Separator data-slot="dropdown-menu-separator" className={cn("-mx-1.5 my-1.5 h-px bg-border", className)} {...props} />;
}

function DropdownMenuSub(props) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({ className, children, ...props }) {
  return (
    <DropdownMenuPrimitive.SubTrigger data-slot="dropdown-menu-sub-trigger" className={cn(item, "data-[state=open]:bg-[color-mix(in_srgb,var(--fg)_8%,transparent)]", className)} {...props}>
      {children}
      <ChevronRightIcon aria-hidden="true" className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({ className, ...props }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent data-slot="dropdown-menu-sub-content" className={cn("glass menu z-50 grid min-w-48 overflow-y-auto rounded-xl p-1.5 text-foreground", className)} {...props} />
    </DropdownMenuPrimitive.Portal>
  );
}

export {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuTrigger,
};
