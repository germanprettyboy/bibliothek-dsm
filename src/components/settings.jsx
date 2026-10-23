/* Settings: theme (automatic/light/dark), larger text, high contrast.
   Pages append their own sections as children (book list: book recommendations). */
import * as React from "react";

import { GlassDialog } from "@/components/glass-dialog";
import { DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAppearance, setPref, loadLogos } from "@/lib/appearance";
import { useLanguage } from "@/lib/language";
import { useSwipe } from "@/lib/swipe";

const THEMES = ["auto", "light", "dark"];

// Open-source software shipped with the pages (licenses: MIT, ISC, Apache-2.0, SIL OFL)
const CREDITS = "Preact, Radix UI, shadcn/ui, Tailwind CSS, Lucide, Sonner, class-variance-authority, clsx, tailwind-merge, sql.js, Fira Sans";

// Section of a dialog with a small heading (h3 below the dialog title h2)
export function Section({ title, children, ...props }) {
  return (
    <section className="grid gap-1" {...props}>
      <h3 className="m-0 mb-1.5 text-s font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

// Row with text on the left and a switch on the right
export function Option({ id, title, help, checked, onCheckedChange }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 border-t border-border py-3 first-of-type:border-t-0">
      <span className="grid gap-0.5">
        <b className="font-medium">{title}</b>
        <small className="text-s text-muted-foreground">{help}</small>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

export function Settings({ open, onOpenChange, children }) {
  const { t } = useLanguage();
  const p = useAppearance();
  const swipeRef = useSwipe(".scrim.swipe", () => onOpenChange(false));
  React.useEffect(() => { if (open) loadLogos(); }, [open]); // the logo of the other color scheme is ready before a switch
  return (
    <GlassDialog open={open} onOpenChange={onOpenChange} name="Settings" titleId="s-title" className="settings swipe" overlayClassName="swipe">
      <div className="pane" ref={swipeRef}>
        <DialogTitle id="s-title">{t("sTitle")}</DialogTitle>
        <Section title={t("sLook")}>
          <ToggleGroup
            type="single" id="s-theme" className="seg3 grid-cols-3" style={{ "--i": THEMES.indexOf(p.theme) }}
            value={p.theme} onValueChange={v => v && setPref("theme", v)}
          >
            <ToggleGroupItem value="auto" data-v="auto">{t("sAuto")}</ToggleGroupItem>
            <ToggleGroupItem value="light" data-v="light">{t("sLight")}</ToggleGroupItem>
            <ToggleGroupItem value="dark" data-v="dark">{t("sDark")}</ToggleGroupItem>
          </ToggleGroup>
        </Section>
        <Section title={t("sA11y")}>
          <Option id="s-font" title={t("sFont")} help={t("sFontH")} checked={p.font} onCheckedChange={v => setPref("font", v)} />
          <Option id="s-contrast" title={t("sContrast")} help={t("sContrastH")} checked={p.contrast} onCheckedChange={v => setPref("contrast", v)} />
        </Section>
        {children}
        <p className="m-0 text-s text-muted-foreground">
          {t("sCredits")} {CREDITS}.
        </p>
      </div>
    </GlassDialog>
  );
}
