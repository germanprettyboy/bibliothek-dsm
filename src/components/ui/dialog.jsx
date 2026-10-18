import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// shadcn/ui Dialog as a glass dialog: bottom sheet with a grabber on phones, centered from 40rem.
// Background (overlay .scrim) blurred and dimmed. Animations via data-state (styles.css),
// Radix waits for the end of the fade-out animation when closing.

function Dialog(props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }) {
  return <DialogPrimitive.Overlay data-slot="dialog-overlay" className={cn("scrim fixed inset-0 z-50", className)} {...props} />;
}

function DialogContent({ className, overlayClassName, children, showCloseButton = true, closeLabel, ...props }) {
  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content data-slot="dialog-content" aria-describedby={undefined} className={cn("glass sheet", className)} {...props}>
        <div className="grab" aria-hidden="true" />
        {showCloseButton && (
          <DialogPrimitive.Close className={cn(buttonVariants({ variant: "icon", size: "icon" }), "close")} aria-label={closeLabel}>
            <XIcon aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }) {
  return <div data-slot="dialog-header" className={cn("grid gap-1", className)} {...props} />;
}

function DialogTitle({ className, ...props }) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("m-0 pr-11 text-l font-semibold leading-[1.2] [overflow-wrap:anywhere] [text-wrap:balance]", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("m-0 text-muted-foreground", className)} {...props} />;
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger };
