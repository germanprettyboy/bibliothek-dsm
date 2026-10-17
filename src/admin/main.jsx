/* Einstieg der Verwaltung (admin.html): Kopf, Sperre, nach dem Entsperren die verschlüsselte Verwaltung. */
import "@/styles.css";
import * as React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { Einstellungen } from "@/components/einstellungen";
import { Kopf } from "@/components/kopf";
import { Toaster } from "@/components/ui/sonner";
import { titelSetzen, useSprache } from "@/lib/sprache";
import { GEMEINSAM } from "@/verwaltung/gemeinsam";
import { Sperre, sperren } from "@/verwaltung/sperre";

window.DSM_GEMEINSAM = GEMEINSAM;

function Seite() {
  const { t } = useSprache();
  const [verwaltung, setVerwaltung] = React.useState(null);
  const [einst, setEinst] = React.useState(false);
  const App = verwaltung && verwaltung.App;
  return (
    <>
      <Kopf onEinstellungen={() => setEinst(true)} />
      <section className="wrap intro pt-[18px] pb-3">
        <h1 className="m-0 text-l font-semibold leading-[1.1]">{t("admTitle")}</h1>
      </section>
      <main className="wrap">
        {App ? <div id="app"><App sperren={sperren} /></div> : <Sperre onStart={v => setVerwaltung(v)} />}
      </main>
      <footer className="foot border-t border-border text-s text-muted-foreground">
        <div className="wrap flex flex-wrap justify-between gap-x-4 gap-y-1.5 pt-[18px] pb-7">
          <span>{t("footer")}</span>
          <a className="text-inherit no-underline" href="./">{t("toList")}</a>
        </div>
      </footer>
      <Einstellungen open={einst} onOpenChange={setEinst} />
      <Toaster />
    </>
  );
}

titelSetzen();
const root = createRoot(document.getElementById("seite"));
flushSync(() => root.render(<Seite />));
