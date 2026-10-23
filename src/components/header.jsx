/* Header of both pages: logo (light/dark image, shimmer until loaded), language choice DE/IT, settings.
   With `title` (index.html) the page title sits next to the logo, or below it when the row is too narrow (.hd in styles.css). */
import * as React from "react";
import { SettingsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language";

const ALT = "Deutsche Schule Mailand – Scuola Germanica di Milano";

export function Header({ onSettings, title }) {
  const { lang, t, setLang } = useLanguage();
  const [loaded, setLoaded] = React.useState(false);
  // Language switch in two steps: marker immediately (only the header re-renders, .seg[data-on]), all texts only
  // after the next frame. That way the marker already glides while the page is being recomputed.
  const [target, setTarget] = React.useState(null);
  const latest = React.useRef(null);
  const on = target ?? lang;
  const choose = l => {
    if (l === on) return;
    setTarget(l);
    latest.current = l;
    requestAnimationFrame(() => setTimeout(() => { setLang(latest.current); setTarget(null); }, 0));
  };
  // Only the visible logo counts (the one of the other color scheme is hidden and may never load)
  const img = e => { if (e.currentTarget.getClientRects().length) setLoaded(true); };
  const logo = (
    <a className={cn("logo ld-img", loaded && "loaded")} href="./">
      <img className="logo-l" src="assets/logo-light.webp" width="360" height="200" decoding="async" alt={ALT} onLoad={img} onError={img} />
      <img className="logo-d" src="assets/logo-dark.webp" width="360" height="200" loading="lazy" decoding="async" alt={ALT} onLoad={img} onError={img} />
    </a>
  );
  const tools = (
    <div className="hd-tools flex items-center gap-2">
      {/* the toggles fill the 44 px pill (target size); the marker sits 3 px inside (.seg::before) */}
      <div className="seg relative inline-grid h-11 grid-cols-2 rounded-full border border-border bg-background" data-on={on} role="group" aria-label="Sprache · Lingua">
        {["de", "it"].map(l => (
          <Toggle key={l} size="pill" lang={l} data-lang={l} pressed={on === l} onPressedChange={() => choose(l)}>
            {l.toUpperCase()}
          </Toggle>
        ))}
      </div>
      <Button variant="icon" size="icon" className="settings-btn" aria-label={t("settings")} onClick={onSettings}>
        <SettingsIcon aria-hidden="true" />
      </Button>
    </div>
  );
  if (!title) return <header className="wrap flex items-center justify-between gap-3 pt-4 pb-2 sm:pt-6 sm:pb-3">{logo}{tools}</header>;
  return (
    <header className="wrap hd pt-4 sm:pt-6">
      <div className="hd-row">{logo}<Separator orientation="vertical" className="hd-vr" /><h1 className="hd-t">{title}</h1>{tools}</div>
    </header>
  );
}
