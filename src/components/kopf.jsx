/* Kopf beider Seiten: Logo (helles/dunkles Bild, Lichtband bis geladen), Sprachwahl DE/IT, Einstellungen. */
import * as React from "react";
import { SettingsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { useSprache } from "@/lib/sprache";

const ALT = "Deutsche Schule Mailand – Scuola Germanica di Milano";

export function Kopf({ onEinstellungen }) {
  const { lang, t, setLang } = useSprache();
  const [da, setDa] = React.useState(false);
  // Nur das sichtbare Logo zählt (das der anderen Farbwelt ist ausgeblendet und lädt ggf. nie)
  const bild = e => { if (e.currentTarget.getClientRects().length) setDa(true); };
  return (
    <header className="wrap flex items-center justify-between gap-3 pt-[18px] pb-1.5 sm:pt-6 sm:pb-2">
      <a className={cn("logo ld-bild", da && "da")} href="./">
        <img className="logo-l" src="assets/logo-hell.webp" width="360" height="200" decoding="async" alt={ALT} onLoad={bild} onError={bild} />
        <img className="logo-d" src="assets/logo-dunkel.webp" width="360" height="200" loading="lazy" decoding="async" alt={ALT} onLoad={bild} onError={bild} />
      </a>
      <div className="flex items-center gap-2">
        <div className="seg relative inline-grid grid-cols-2 rounded-full border border-border bg-background p-[3px]" role="group" aria-label="Sprache · Lingua">
          {["de", "it"].map(l => (
            <Toggle key={l} size="sm" lang={l} data-lang={l} pressed={lang === l} onPressedChange={() => setLang(l)} className="h-8">
              {l.toUpperCase()}
            </Toggle>
          ))}
        </div>
        <Button variant="icon" size="icon" className="settings-btn" aria-label={t("settings")} onClick={onEinstellungen}>
          <SettingsIcon aria-hidden="true" strokeWidth={1.7} />
        </Button>
      </div>
    </header>
  );
}
