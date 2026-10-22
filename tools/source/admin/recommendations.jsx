/* Tab "recommendations": per group up to four books from the catalog with text DE/IT, topic of the round.
   Draft in the browser (localStorage dsm-recs-draft). Publish: other books than published = new round,
   the published round moves to the front of the archive; only texts/topic changed = same round. */
import * as React from "react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { store } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { Publish } from "./publish";

export const GROUPS = ["middle", "upper", "adult-fiction", "adult-nonfiction", "adult-bio"];
const DRAFT = "dsm-recs-draft";
const normE = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();
const keyB = b => normE(b.t) + "|" + normE((b.a && b.a[0]) || "");
const clone = o => JSON.parse(JSON.stringify(o));

function fromPublished() {
  const d = clone(window.DSM_RECOMMENDATIONS || { groups: {} });
  if (!d.groups) d.groups = {};
  GROUPS.forEach(g => { if (!Array.isArray(d.groups[g])) d.groups[g] = []; });
  if (!d.topic) d.topic = { de: "", it: "" };
  return d;
}
export function loadDraft() {
  const d = store.json(DRAFT);
  if (!d || !d.groups) return fromPublished();
  GROUPS.forEach(g => { if (!Array.isArray(d.groups[g])) d.groups[g] = []; });
  if (!d.topic) d.topic = { de: "", it: "" };
  return d;
}

function recsOut(draft) {
  const pub = window.DSM_RECOMMENDATIONS || { groups: {} };
  const groups = {};
  GROUPS.forEach(g => { groups[g] = draft.groups[g].map(r => ({ k: r.k, t: r.t, a: r.a, de: (r.de || "").trim(), it: (r.it || "").trim() })); });
  const sig = gr => GROUPS.map(g => ((gr && gr[g]) || []).map(r => r.k).join(",")).join(";");
  const pubHas = !!pub.updated && GROUPS.some(g => ((pub.groups && pub.groups[g]) || []).length);
  const isNew = !pubHas || sig(pub.groups) !== sig(groups);
  const archive = Array.isArray(pub.archive) ? pub.archive.slice() : [];
  if (isNew && pubHas) archive.unshift(Object.assign({ updated: pub.updated }, pub.topic ? { topic: pub.topic } : {}, { groups: pub.groups }));
  const out = { updated: isNew ? new Date().toLocaleDateString("sv-SE") : pub.updated };
  const topic = { de: (draft.topic.de || "").trim(), it: (draft.topic.it || "").trim() };
  if (topic.de || topic.it) out.topic = topic;
  out.groups = groups;
  if (archive.length) out.archive = archive.slice(0, 40);
  return out;
}

export function Recommendations({ draft, setDraft, catalog }) {
  const { t } = useLanguage();
  const [g, setG] = React.useState("middle");
  const [q, setQ] = React.useState("");
  const [armed, setArmed] = React.useState(false);
  const listRef = React.useRef(null), focusNew = React.useRef(false);
  const list = draft.groups[g], full = list.length >= 4;

  // Change = new draft object (group copied), saved after 300 ms of quiet
  const change = fn => setDraft(d => { const n = { ...d, topic: { ...d.topic }, groups: { ...d.groups, [g]: d.groups[g].map(r => ({ ...r })) } }; fn(n); n.changed = true; return n; });
  React.useEffect(() => {
    if (!draft.changed) return undefined;
    const id = setTimeout(() => { const { changed, ...d } = draft; store.set(DRAFT, JSON.stringify(d)); }, 300); // eslint-disable-line no-unused-vars
    return () => clearTimeout(id);
  }, [draft]);
  // After adding: edit the text of the new book right away
  React.useEffect(() => {
    if (!focusNew.current) return;
    focusNew.current = false;
    const ta = listRef.current && listRef.current.querySelector(".rec-ed:last-child textarea");
    if (ta) ta.focus();
  });

  const keys = React.useMemo(() => new Set(catalog.map(keyB)), [catalog]);
  const hits = React.useMemo(() => {
    const s = normE(q);
    if (full || s.length < 2) return null;
    const terms = s.split(" ");
    return catalog.filter(b => { const x = normE([b.t, b.s, (b.a || []).join(" "), (b.i || []).join(" ")].join(" ")); return terms.every(w => x.includes(w)); }).slice(0, 8);
  }, [q, catalog, full]);
  const have = new Set(list.map(r => r.k));

  const discard = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
    setArmed(false);
    store.del(DRAFT);
    setDraft(fromPublished());
  };
  const build = () => {
    const out = recsOut(draft);
    return {
      text: "/* Book recommendations of the library of the Deutsche Schule Mailand. Maintained via admin.html – do not edit by hand. */\n" +
        "window.DSM_RECOMMENDATIONS = " + JSON.stringify(out, null, 1).replace(/</g, "\\u003c") + ";\n",
      // afterwards the new state counts as published (otherwise the round would move into the archive twice next time)
      done: () => { window.DSM_RECOMMENDATIONS = out; },
    };
  };
  const op = "size-[34px] rounded-md";

  return (
    <div className="steps grid gap-3.5 pb-10" id="tab-recs">
      <Card>
        <CardTitle>{t("eT")}</CardTitle>
        <CardDescription>{t("eP")}</CardDescription>
        <div className="mt-1 grid gap-2.5 sm:grid-cols-2" id="rec-topic">
          {["de", "it"].map(l => (
            <Label key={l}>
              <span>{t(l === "de" ? "eTopicDe" : "eTopicIt")}</span>
              <Input className="h-10" data-f={l} value={draft.topic[l] || ""} onChange={e => change(d => { d.topic[l] = e.target.value; })} />
            </Label>
          ))}
        </div>
        {/* Same segregated list as the settings/questions (middle, upper, adults in one block), without the color bars */}
        <ToggleGroup
          type="single" variant="surface" id="rec-groups" value={g} onValueChange={v => v && setG(v)}
          className="mt-3 grid gap-2.5 rounded-none bg-transparent p-0 shadow-none grid-flow-row auto-cols-auto"
        >
          {[["middle"], ["upper"], ["adult-fiction", "adult-nonfiction", "adult-bio"]].map(box => (
            <div key={box[0]} className="card grid overflow-hidden">
              {box.map(x => (
                <ToggleGroupItem
                  key={x} value={x} data-g={x}
                  className="group/opt h-auto min-h-12 w-full justify-start gap-3 rounded-none border-t border-border px-3.5 py-3 text-left text-m font-medium text-foreground first:border-t-0 data-[state=on]:bg-background data-[state=on]:font-semibold data-[state=on]:shadow-none"
                >
                  <span className="min-w-0 flex-1 whitespace-normal">{t("g_" + x)}</span>
                  <CheckIcon aria-hidden="true" className="size-[18px] shrink-0 opacity-0 transition-opacity group-data-[state=on]/opt:opacity-100" />
                </ToggleGroupItem>
              ))}
            </div>
          ))}
        </ToggleGroup>
        <div className="mt-3" id="rec-list" ref={listRef}>
          {list.length ? list.map((r, i) => (
            <div key={r.k} className="rec-ed grid gap-3 border-t border-border py-3.5 first:border-t-0" data-n={i}>
              <div className="hd flex items-start justify-between gap-2.5">
                <span>
                  <b className="font-semibold">{r.t}</b>
                  <small className="block text-s text-muted-foreground">{r.a || ""}</small>
                  {keys.has(r.k) ? null : <small className="warn block text-s font-medium text-red">{t("eMissing")}</small>}
                </span>
                <span className="ops flex shrink-0 gap-1.5">
                  <Button variant="outline" size="icon-sm" className={op} data-op="up" aria-label={t("eUp")} disabled={i === 0}
                    onClick={() => change(d => { const l = d.groups[g]; [l[i], l[i - 1]] = [l[i - 1], l[i]]; })}><ChevronUpIcon aria-hidden="true" /></Button>
                  <Button variant="outline" size="icon-sm" className={op} data-op="down" aria-label={t("eDown")} disabled={i === list.length - 1}
                    onClick={() => change(d => { const l = d.groups[g]; [l[i], l[i + 1]] = [l[i + 1], l[i]]; })}><ChevronDownIcon aria-hidden="true" /></Button>
                  <Button variant="outline" size="icon-sm" className={op} data-op="del" aria-label={t("eRemove")}
                    onClick={() => change(d => { d.groups[g].splice(i, 1); })}><XIcon aria-hidden="true" /></Button>
                </span>
              </div>
              {["de", "it"].map(l => (
                <Label key={l}>
                  {t(l === "de" ? "eTeaserDe" : "eTeaserIt")}
                  <Textarea data-f={l} rows={3} value={r[l] || ""} onChange={e => change(d => { d.groups[g][i][l] = e.target.value; })} />
                </Label>
              ))}
            </div>
          )) : <p className="note m-0 text-s text-muted-foreground">{t("eEmpty")}</p>}
        </div>
        {/* Group full: search disabled, note centered in the field. Already in the group: greyed out, no button */}
        <div className="find relative mt-2.5">
          <Input id="rec-q" type="search" autoComplete="off" disabled={full} placeholder={full ? "" : t("eFind")} value={full ? "" : q} onChange={e => setQ(e.target.value)} />
          <span className="full pointer-events-none absolute inset-x-0 top-0 grid h-11 place-items-center text-muted-foreground" id="rec-full" hidden={!full}>{t("eFull")}</span>
          <ul className="mt-2 mb-0 list-none p-0" id="rec-res">
            {hits ? (hits.length ? hits.map(b => {
              const present = have.has(keyB(b));
              return (
                <li key={keyB(b)} className={cn("flex items-center justify-between gap-2.5 border-t border-border py-2", present && "present opacity-45")}>
                  <span className="min-w-0">
                    <b>{b.t}</b>
                    <small className="block text-s text-muted-foreground">{(b.a || []).join(", ")}{b.y ? " · " + b.y : ""}</small>
                  </span>
                  {present ? null : (
                    <Button variant="outline" size="sm" onClick={() => {
                      if (list.length >= 4 || have.has(keyB(b))) return;
                      focusNew.current = true;
                      change(d => { d.groups[g].push({ k: keyB(b), t: b.t, a: (b.a || []).join(", "), de: "", it: "" }); });
                    }}>{t("eAdd")}</Button>
                  )}
                </li>
              );
            }) : <li className="border-t border-border py-2"><span className="note text-s text-muted-foreground">{t("eNoResults")}</span></li>) : null}
          </ul>
        </div>
      </Card>
      <Publish
        file="recommendations.js" build={build} ids={{ button: "rec-dl", how: "rec-how", preview: "rec-prev" }} alt="eDl" howKey="eHow" preview
        onPreview={() => store.set("dsm-preview-recs", JSON.stringify(recsOut(draft)))}
      >
        <Button variant="outline" id="rec-reset" onClick={discard}><span>{t(armed ? "eResetSure" : "eReset")}</span></Button>
      </Publish>
    </div>
  );
}
