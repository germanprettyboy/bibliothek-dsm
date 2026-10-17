/* Glas-Fenster für Detail, Einstellungen, Fragen, Öffnungszeiten, Archiv (shadcn Dialog).
   Protokolliert Öffnen und Schließen mit Grund (Escape, Hintergrund, Knopf). */
import * as React from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { log } from "@/lib/speicher";
import { useSprache } from "@/lib/sprache";

export function Fenster({ open, onOpenChange, name, titleId, className, overlayClassName, children, onCloseAutoFocus, onEscapeKeyDown, ...props }) {
  const { t } = useSprache();
  const grund = React.useRef("Knopf");
  React.useEffect(() => { if (open) log("Fenster", `${name} geöffnet`); }, [open, name]);
  const wechsel = an => {
    if (!an) log("Fenster", `${name} geschlossen (${grund.current})`);
    grund.current = "Knopf";
    onOpenChange(an);
  };
  return (
    <Dialog open={open} onOpenChange={wechsel}>
      <DialogContent
        className={className}
        overlayClassName={overlayClassName}
        closeLabel={t("close")}
        aria-labelledby={titleId}
        onEscapeKeyDown={e => { if (onEscapeKeyDown) onEscapeKeyDown(e); if (!e.defaultPrevented) grund.current = "Escape"; }}
        onPointerDownOutside={() => { grund.current = "Hintergrund"; }}
        onCloseAutoFocus={onCloseAutoFocus}
        {...props}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
