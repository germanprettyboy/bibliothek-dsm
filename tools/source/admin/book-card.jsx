/* Book card in the command palette (palette.jsx, #cmd-book): everything the admin page knows about one book of the
   list in one place. Cover (covers.js, only via its ISBN) with hide/show (books.js noCover), the data of the public list,
   the Italian category name (or a way to add it), recommending it to a group (recommendations.jsx recommend()), and
   after an import its copies in WinBook (number, location, shelf mark, accession date) with their maintenance entries
   (table-data.js buildData). Props: b, row (its buildData row, null without an import), records (buildData records by
   id), B, draft, setDraft, onTab. Test hooks: #cmd-book, #bk-cover[data-state], #bk-hide, #bk-show, [data-bk-rec],
   #bk-copies [data-id], #bk-probs [data-prob], #bk-it. */
import "./strings-palette";
import * as React from "react";
import { CheckIcon, EyeIcon, EyeOffIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language";
import { notify } from "@/lib/notice";
import { GROUPS, recKey, recommend } from "./recommendations";
import { GROUP } from "./table-data";

function Cover({ b, hidden }) {
  const { t } = useLanguage();
  const [found, setFound] = React.useState(undefined); // undefined = searching, null = none, { src, by }
  React.useEffect(() => {
    let on = true;
    if (!b.i || !b.i.length || !window.DSMCovers) { setFound(null); return undefined; }
    setFound(undefined);
    window.DSMCovers.get(b).then(f => { if (on) setFound(f || null); }, () => { if (on) setFound(null); });
    return () => { on = false; };
  }, [b]);
  const state = hidden ? "hidden" : found === undefined ? "loading" : found ? "found" : "none";
  return (
    <div className="grid w-24 shrink-0 content-start gap-1.5">
      <div className={cn("cover", state === "loading" && "loading")} id="bk-cover" data-state={state}>
        {state === "found" ? <img src={found.src} alt="" referrerPolicy="no-referrer" className="in" /> : (
          <div className="ph" style={{ "--ph-c": "var(--mauve)" }} aria-hidden="true"><b>{b.t}</b><span className="rule" /></div>
        )}
      </div>
      <span className="text-s text-muted-foreground">
        {t(state === "hidden" ? "bkCoverHidden" : state === "loading" ? "bkCoverLoading" : state === "found" ? "bkCover" : b.i && b.i.length ? "bkCoverNone" : "bkCoverNoIsbn")}
      </span>
    </div>
  );
}

export function BookCard({ b, row, records, B, draft, setDraft, onTab }) {
  const { t, nf, df } = useLanguage();
  const isbns = b.i || [];
  const hidden = isbns.length > 0 && isbns.every(i => B.extra.noCover.includes(i));
  const it = (window.DSM_CATEGORIES_IT && window.DSM_CATEGORIES_IT[b.c]) || String(B.extra.catIt[b.c] || "").trim();
  const k = recKey(b);
  const copies = row ? row.ids.map(id => records.get(id)).filter(Boolean) : [];
  const probs = row ? row.probs : [];
  const add = g => {
    if (recommend(draft, setDraft, g, b)) notify(t("bkAdded", { g: t("g_" + g) }), () => onTab("recs"));
  };
  const facts = [
    [t("bkPublisher"), b.p], [t("bkYear"), b.y], [t("bkIsbn"), isbns.join(" · "), "tabular-nums"],
    [t("bkLocations"), (b.l || []).join(" · ")],
  ].filter(f => f[1]);
  const h = "m-0 mb-1.5 text-s font-medium text-muted-foreground";
  return (
    <article className="grid gap-5" id="cmd-book" data-key={k} aria-labelledby="bk-t">
      <div className="flex gap-4">
        <Cover b={b} hidden={hidden} />
        <div className="grid min-w-0 content-start gap-1">
          <h3 className="m-0 text-l font-semibold [overflow-wrap:anywhere] [text-wrap:balance]" id="bk-t">{b.t}</h3>
          {b.s ? <p className="m-0 text-muted-foreground [overflow-wrap:anywhere]">{b.s}</p> : null}
          {b.a && b.a.length ? <p className="m-0 [overflow-wrap:anywhere]">{b.a.join(", ")}</p> : null}
          {isbns.length ? (
            <div className="mt-1.5">
              {hidden
                ? <Button variant="outline" size="sm" id="bk-show" onClick={() => B.hideCover(isbns, false)}><EyeIcon aria-hidden="true" className="size-4" /><span>{t("bkCoverShow")}</span></Button>
                : <Button variant="outline" size="sm" id="bk-hide" onClick={() => B.hideCover(isbns, true)}><EyeOffIcon aria-hidden="true" className="size-4" /><span>{t("bkCoverHide")}</span></Button>}
            </div>
          ) : null}
        </div>
      </div>

      <dl className="cmd-dl m-0">
        {facts.map(([label, v, cls]) => <div key={label}><dt>{label}</dt><dd className={cn("[overflow-wrap:anywhere]", cls)}>{v}</dd></div>)}
        {b.c ? (
          <div>
            <dt>{t("bkCategory")}</dt>
            <dd className="[overflow-wrap:anywhere]" id="bk-it" data-it={it ? "" : undefined}>
              {b.c}
              <span className="block text-s text-muted-foreground" lang="it">
                {it ? `${t("bkIt")}: ${it}` : <>{t("bkItNone")} · <Button variant="ghost" size="text" className="p-0 text-s text-foreground" onClick={() => onTab("catalog")}>{t("bkItAdd")}</Button></>}
              </span>
            </dd>
          </div>
        ) : null}
      </dl>

      <section aria-labelledby="bk-recs-h">
        <h4 className={h} id="bk-recs-h">{t("bkRecs")}</h4>
        <div className="flex flex-wrap gap-2">
          {GROUPS.map(g => {
            const list = draft.groups[g] || [], on = list.some(r => r.k === k), full = !on && list.length >= 4;
            return (
              <Button
                key={g} variant="outline" size="sm" data-bk-rec={g} aria-pressed={on} disabled={full}
                className={cn("h-auto min-h-9 py-1.5 whitespace-normal text-left", on && "border-foreground font-semibold")} onClick={() => (on ? onTab("recs") : add(g))}
              >
                {on ? <CheckIcon aria-hidden="true" className="size-4" /> : <PlusIcon aria-hidden="true" className="size-4" />}
                <span>{t("g_" + g)}{full ? ` · ${t("bkFull")}` : ""}</span>
              </Button>
            );
          })}
        </div>
        <p className="m-0 mt-1.5 text-s text-muted-foreground">{t("bkRecsP")}</p>
      </section>

      <section aria-labelledby="bk-copies-h">
        <h4 className={h} id="bk-copies-h">{t("bkCopies")}{copies.length ? ` · ${nf(copies.length)}` : ""}</h4>
        {!row ? <p className="m-0 text-s text-muted-foreground">{t("bkNoImport")}</p> : !copies.length ? <p className="m-0 text-s text-muted-foreground">{t("bkNoCopies")}</p> : (
          <ul className="m-0 grid list-none p-0" id="bk-copies">
            {copies.map(r => (
              <li key={r.id} data-id={r.id} className="flex flex-wrap justify-between gap-x-3 border-t border-border py-1.5 text-s first:border-t-0">
                <span className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium tabular-nums">{t("bkNo", { n: r.id })}</span>{r.l ? " · " + r.l : ""}{r.sig ? " · " + r.sig : ""}</span>
                {r.z ? <span className="text-muted-foreground tabular-nums">{df(r.z)}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {row ? (
        <section aria-labelledby="bk-probs-h">
          <h4 className={h} id="bk-probs-h">{t("bkProbs")}</h4>
          {probs.length ? (
            <ul className="m-0 grid list-none gap-1 p-0" id="bk-probs">
              {probs.map(p => (
                <li key={p.key} data-prob={p.key} className="flex items-baseline gap-0 text-s">
                  <span className="tv-chipdot shrink-0" data-g={GROUP[p.key]} aria-hidden="true" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{t("m_" + p.key)}{p.v ? <span className="text-muted-foreground">{" · " + p.v}</span> : null}</span>
                </li>
              ))}
            </ul>
          ) : <p className="m-0 text-s text-muted-foreground">{t("bkNoProbs")}</p>}
          {probs.length ? <div className="mt-2"><Button variant="outline" size="sm" onClick={() => onTab("care")}><span>{t("hToTab", { t: t("tabCare") })}</span></Button></div> : null}
        </section>
      ) : null}
    </article>
  );
}
