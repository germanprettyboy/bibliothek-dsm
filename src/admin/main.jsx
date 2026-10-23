/* Entry of the admin page (admin.html): header, lock, after unlocking the encrypted admin app. */
import "@/styles.css";
import * as React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { Settings } from "@/components/settings";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { setTitle, useLanguage } from "@/lib/language";
import { SHARED } from "@/admin/shared";
import { Lock, lock } from "@/admin/lock";

window.DSM_SHARED = SHARED;

function Page() {
  const { t } = useLanguage();
  const [admin, setAdmin] = React.useState(null);
  const [settings, setSettings] = React.useState(false);
  const App = admin && admin.App;
  return (
    <>
      <Header onSettings={() => setSettings(true)} title={t("admTitle")} />
      <div className="pb-3" aria-hidden="true" />
      <main className="wrap">
        {App ? <div id="app"><App lock={lock} /></div> : <Lock onStart={v => setAdmin(v)} />}
      </main>
      <footer className="foot border-t border-border text-s text-muted-foreground">
        <div className="wrap flex flex-wrap justify-between gap-x-4 gap-y-1.5 pt-5 pb-7">
          <span>{t("footer")}</span>
          <a className="text-inherit no-underline" href="./">{t("toList")}</a>
        </div>
      </footer>
      <Settings open={settings} onOpenChange={setSettings} />
      <Toaster />
    </>
  );
}

setTitle();
const root = createRoot(document.getElementById("page"));
flushSync(() => root.render(<Page />));
