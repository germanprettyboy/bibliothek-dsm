/* Glass dialog for detail, settings, questions, opening hours, archive (shadcn Dialog).
   Logs opening and closing with the reason (Escape, background, button). */
import * as React from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { log } from "@/lib/storage";
import { useLanguage } from "@/lib/language";

export function GlassDialog({ open, onOpenChange, name, titleId, className, overlayClassName, children, onCloseAutoFocus, ...props }) {
  const { t } = useLanguage();
  const reason = React.useRef("button");
  React.useEffect(() => { if (open) log("Dialog", `${name} opened`); }, [open, name]);
  const change = on => {
    if (!on) log("Dialog", `${name} closed (${reason.current})`);
    reason.current = "button";
    onOpenChange(on);
  };
  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent
        className={className}
        overlayClassName={overlayClassName}
        closeLabel={t("close")}
        aria-labelledby={titleId}
        onEscapeKeyDown={() => { reason.current = "Escape"; }}
        onPointerDownOutside={() => { reason.current = "background"; }}
        onCloseAutoFocus={onCloseAutoFocus}
        {...props}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
