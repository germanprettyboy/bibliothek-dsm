import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui Accordion in the DSM design: rows with a line between them, the whole row is the target (44 px),
// the chevron turns. Height animation via --radix-accordion-content-height (styles.css .acc-content).

function Accordion(props) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({ className, ...props }) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={cn("border-t border-border first:border-t-0", className)} {...props} />;
}

function AccordionTrigger({ className, children, ...props }) {
  return (
    <AccordionPrimitive.Header className="m-0 flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn("group flex min-h-11 flex-1 items-center justify-between gap-3 py-2.5 text-left font-medium outline-none", className)}
        {...props}
      >
        <span className="min-w-0 flex-1">{children}</span>
        <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-dsm group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }) {
  return (
    <AccordionPrimitive.Content data-slot="accordion-content" className="acc-content overflow-hidden" {...props}>
      <div className={cn("pb-3.5", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
