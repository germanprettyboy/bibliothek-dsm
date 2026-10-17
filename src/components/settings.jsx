/* Einstellungen: Darstellung (Automatisch/Hell/Dunkel), größere Schrift, hoher Kontrast.
   Seiten hängen eigene Abschnitte als children an (Bücherliste: Buchempfehlungen). */
import * as React from "react";

import { Fenster } from "@/components/fenster";
import { DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDarstellung, setPref } from "@/lib/darstellung";
import { useSprache } from "@/lib/sprache";

const THEMES = ["auto", "light", "dark"];

// Abschnitt mit kleiner Überschrift
export function Abschnitt({ titel, children }) {
  return (
    <section className="grid gap-1">
      <h4 className="m-0 mb-1.5 text-s font-medium text-muted-foreground">{titel}</h4>
      {children}
    </section>
  );
}

// Zeile mit Text links und Schalter rechts
export function Option({ id, titel, hilfe, checked, onCheckedChange }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 border-t border-border py-3 first-of-type:border-t-0">
      <span className="grid gap-0.5">
        <b className="font-semibold">{titel}</b>
        <small className="text-s text-muted-foreground">{hilfe}</small>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

export function Einstellungen({ open, onOpenChange, children }) {
  const { t } = useSprache();
  const p = useDarstellung();
  return (
    <Fenster open={open} onOpenChange={onOpenChange} name="Einstellungen" titleId="s-title" className="settings">
      <div className="pane">
        <DialogTitle id="s-title">{t("sTitle")}</DialogTitle>
        <Abschnitt titel={t("sLook")}>
          <ToggleGroup
            type="single" id="s-theme" className="seg3 grid-cols-3" style={{ "--i": THEMES.indexOf(p.theme) }}
            value={p.theme} onValueChange={v => v && setPref("theme", v)}
          >
            <ToggleGroupItem value="auto" data-v="auto">{t("sAuto")}</ToggleGroupItem>
            <ToggleGroupItem value="light" data-v="light">{t("sLight")}</ToggleGroupItem>
            <ToggleGroupItem value="dark" data-v="dark">{t("sDark")}</ToggleGroupItem>
          </ToggleGroup>
        </Abschnitt>
        <Abschnitt titel={t("sA11y")}>
          <Option id="s-font" titel={t("sFont")} hilfe={t("sFontH")} checked={p.font} onCheckedChange={v => setPref("font", v)} />
          <Option id="s-contrast" titel={t("sContrast")} hilfe={t("sContrastH")} checked={p.contrast} onCheckedChange={v => setPref("contrast", v)} />
        </Abschnitt>
        {children}
      </div>
    </Fenster>
  );
}
