/* Card "Website" at the top of tab Bestand: what the book list shows right now, with one switch per element
   (announcement, opening hours card, recommendations, archive note in the detail) and one for all of them.
   A switch publishes at once, the same way as the publish cards (publish.jsx: online, website folder, download): the
   PUBLISHED file with only this switch changed – drafts of the tabs stay drafts and get the same switch.
     info.js "hide": ["announcement" | "info" | "archive"]     recommendations.js "off": true
   "Bearbeiten" jumps to the editor of the element (go), "Live-Vorschau" opens index.html#preview, which follows the
   drafts over BroadcastChannel (app.jsx).
   Test hooks: #site, #site-all, [data-site=<key>] with [data-site-switch] [data-site-status] [data-site-edit],
   #site-open, #site-live, #site-note. */
import "./strings-site";
import * as React from "react";
import { ArchiveIcon, ClockIcon, ExternalLinkIcon, EyeIcon, MegaphoneIcon, PencilIcon, SparklesIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { store } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { publishNow, usePub } from "./publish";
import { HIDE, IDRAFT, emptyInfo, infoText } from "./info";
import { DRAFT as RDRAFT, GROUPS, recsText } from "./recommendations";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toLocaleDateString("sv-SE");
// Location "Archiv", "Archiv 1" …: as in the book list (src/library/data.js inArchive)
const inArchive = b => !!(b.l && b.l.length) && b.l.every(s => /^\s*archiv/i.test(s));
// A stored draft (if any) gets the switch too, otherwise the next publish from its tab would turn it back
const patch = (key, fn) => { const d = store.json(key); if (d) { fn(d); store.set(key, JSON.stringify(d)); } };

// [key, icon, where "Bearbeiten" leads (tab or tab:element id)]
const ITEMS = [
  ["announcement", MegaphoneIcon, "info:i-ann"],
  ["info", ClockIcon, "info:i-hours"],
  ["recs", SparklesIcon, "recs"],
  ["archive", ArchiveIcon, null],
];

// The published state: { on, can (there is something to show), status: [text key, vars] | plain text }
function read(lang, books, df, nf) {
  const I = window.DSM_INFO || null, R = window.DSM_RECOMMENDATIONS || {};
  const hide = (I && Array.isArray(I.hide) && I.hide) || [];
  const a = (I && I.announcement) || {}, text = String(a[lang] || a.de || a.it || "").trim();
  const past = !!text && YMD.test(a.until || "") && a.until < today();
  const nt = (I && I.notice) || {}, ct = (I && I.contact) || {};
  const hasInfo = !!I && (Object.values(I.hours || {}).some(l => (l || []).length) || !!(nt.de || nt.it)
    || Object.keys(ct).length > 0 || (I.closures || []).length > 0);
  const recs = GROUPS.reduce((n, g) => n + (((R.groups || {})[g]) || []).length, 0);
  const arch = books.reduce((n, b) => n + (inArchive(b) ? 1 : 0), 0);
  return {
    hide,
    announcement: { can: !!text, on: !hide.includes("announcement"), status: !text ? ["siteAnnNone"] : past ? ["siteAnnPast", { d: df(a.until) }] : "„" + text + "“" },
    info: { can: hasInfo, on: !hide.includes("info"), status: [hasInfo ? "siteInfoOn" : "siteInfoNone"] },
    recs: { can: true, on: !R.off, status: recs ? ["siteRecsN", { n: nf(recs) }] : ["siteRecsNone"] },
    archive: { can: true, on: !hide.includes("archive"), status: arch ? ["siteArchN", { n: nf(arch) }] : ["siteArchNone"] },
  };
}

export function Site({ books, setInfo, setDraft, go }) {
  const { t, lang, nf, df } = useLanguage();
  usePub(); // a publish from any card changes window.DSM_INFO / DSM_RECOMMENDATIONS: read them again
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState(null); // { type, text }
  const [, again] = React.useState(0);
  const S = read(lang, books, df, nf);
  const usable = ITEMS.filter(([k]) => S[k].can), onCount = usable.filter(([k]) => S[k].on).length;

  // Set the given elements to on/off: one write per file
  const flip = async (keys, on) => {
    if (busy) return;
    setBusy(true); setNote(null);
    const jobs = [];
    const infoKeys = keys.filter(k => k !== "recs");
    if (infoKeys.length) {
      const hide = HIDE.filter(k => (infoKeys.includes(k) ? !on : S.hide.includes(k)));
      const out = { ...(window.DSM_INFO || emptyInfo()), updated: today() };
      delete out.hide;
      if (hide.length) out.hide = hide;
      jobs.push(["info.js", {
        text: infoText(out),
        done: () => { window.DSM_INFO = out; setInfo(d => ({ ...d, hide })); patch(IDRAFT, d => { d.hide = hide; }); },
      }]);
    }
    if (keys.includes("recs")) {
      const { updated, off, ...rest } = window.DSM_RECOMMENDATIONS || {}; // eslint-disable-line no-unused-vars
      const out = { updated: updated || today(), ...(on ? {} : { off: true }), ...rest };
      if (!out.groups) out.groups = {};
      jobs.push(["recommendations.js", {
        text: recsText(out),
        done: () => { window.DSM_RECOMMENDATIONS = out; setDraft(d => ({ ...d, off: !on })); patch(RDRAFT, d => { d.off = !on; }); },
      }]);
    }
    const texts = [];
    let type = "";
    for (const [file, job] of jobs) {
      const r = await publishNow(file, () => job, lang);
      if (r.error) { type = "warn"; texts.push(t(r.error.key, r.error.vars)); break; }
      if (r.cancelled) break;
      if (r.mode === "download") { job.done(); texts.push(t("siteDl", { f: file })); } else texts.push(t(r.message.key, r.message.vars));
    }
    setNote(texts.length ? { type, text: texts.join(" ") } : null);
    setBusy(false);
    again(n => n + 1);
  };

  const row = "flex items-center gap-3 border-t border-border py-2.5";
  // Narrowest phones (320 px): no icon tile, and the names may break – otherwise the row is wider than the screen
  const tile = "grid size-10 shrink-0 place-items-center rounded-lg shadow-[inset_0_0_0_1px_var(--line)] max-[22.5rem]:hidden";
  return (
    <Card id="site" className="mb-3.5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="grid min-w-0 flex-1 basis-64 gap-1.5">
          <CardTitle>{t("siteT")}</CardTitle>
          <CardDescription>{t("siteP")}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className={buttonVariants({ variant: "outline", size: "sm" })} id="site-open" href="index.html" target="_blank" rel="noopener">
            <ExternalLinkIcon aria-hidden="true" strokeWidth={1.8} /><span>{t("siteOpen")}</span>
          </a>
          <a className={buttonVariants({ variant: "outline", size: "sm" })} id="site-live" href="index.html#preview" target="_blank" rel="noopener" title={t("siteLiveP")}>
            <EyeIcon aria-hidden="true" strokeWidth={1.8} /><span>{t("siteLive")}</span>
          </a>
        </div>
      </div>
      <div className="mt-3 grid">
        <div className={cn(row, "border-t-0 pt-0")}>
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="font-semibold [overflow-wrap:anywhere]" id="site-all-t">{t("siteAll")}</span>
            <span className="text-s text-muted-foreground" id="site-all-n">{t("siteAllN", { n: nf(onCount), m: nf(usable.length) })}</span>
          </span>
          <Switch
            id="site-all" aria-labelledby="site-all-t" aria-describedby="site-all-n" disabled={busy || !usable.length}
            checked={!!usable.length && onCount === usable.length}
            onCheckedChange={v => flip(usable.map(([k]) => k), v)}
          />
        </div>
        {ITEMS.map(([k, Icon, to]) => {
          const s = S[k], status = Array.isArray(s.status) ? t(s.status[0], s.status[1]) : s.status;
          return (
            <div key={k} className={row} data-site={k} data-on={s.can && s.on ? "" : undefined}>
              <span className={cn(tile, !(s.can && s.on) && "text-muted-foreground")}><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="font-medium [overflow-wrap:anywhere]" id={"site-t-" + k}>{t("site_" + k)}</span>
                <span className="truncate text-s text-muted-foreground" id={"site-s-" + k} data-site-status>{status}</span>
              </span>
              {to ? (
                <Button variant="ghost" size="sm" className="max-sm:px-2.5" data-site-edit={to} aria-label={t("siteEdit") + ": " + t("site_" + k)} onClick={() => go(to)}>
                  <PencilIcon className="sm:hidden" aria-hidden="true" strokeWidth={1.8} /><span className="max-sm:hidden">{t("siteEdit")}</span>
                </Button>
              ) : null}
              <Switch
                data-site-switch aria-label={t("siteShow", { x: t("site_" + k) })} aria-describedby={"site-s-" + k}
                disabled={busy || !s.can} checked={s.can && s.on} onCheckedChange={v => flip([k], v)}
              />
            </div>
          );
        })}
      </div>
      {note ? <p className={cn("flag mt-3 mb-0", note.type)} id="site-note" role="status">{note.text}</p> : null}
    </Card>
  );
}
