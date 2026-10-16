/* Reiter „Empfehlungen“: pro Gruppe bis zu vier Bücher aus dem Bestand mit Text DE/IT, Thema der Runde.
   Entwurf im Browser (localStorage dsm-empf-entwurf). Veröffentlichen: andere Bücher als veröffentlicht = neue Runde,
   die veröffentlichte Runde wandert vorne ins Archiv; nur Texte/Thema geändert = gleiche Runde. */
import * as React from "react";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { store } from "@/lib/speicher";
import { useSprache } from "@/lib/sprache";
import { Veroeffentlichen } from "./veroeffentlichen";

export const GROUPS = ["mittelstufe", "oberstufe", "erw-roman", "erw-sach", "erw-bio"];
const DRAFT = "dsm-empf-entwurf";
const normE = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();
const keyB = b => normE(b.t) + "|" + normE((b.a && b.a[0]) || "");
const clone = o => JSON.parse(JSON.stringify(o));

function ausVeroeffentlicht() {
  const d = clone(window.DSM_EMPFEHLUNGEN || { gruppen: {} });
  if (!d.gruppen) d.gruppen = {};
  GROUPS.forEach(g => { if (!Array.isArray(d.gruppen[g])) d.gruppen[g] = []; });
  if (!d.thema) d.thema = { de: "", it: "" };
  return d;
}
export function entwurfLaden() {
  const d = store.json(DRAFT);
  if (!d || !d.gruppen) return ausVeroeffentlicht();
  GROUPS.forEach(g => { if (!Array.isArray(d.gruppen[g])) d.gruppen[g] = []; });
  if (!d.thema) d.thema = { de: "", it: "" };
  return d;
}

function recsOut(draft) {
  const pub = window.DSM_EMPFEHLUNGEN || { gruppen: {} };
  const gruppen = {};
  GROUPS.forEach(g => { gruppen[g] = draft.gruppen[g].map(r => ({ k: r.k, t: r.t, a: r.a, de: (r.de || "").trim(), it: (r.it || "").trim() })); });
  const sig = gr => GROUPS.map(g => ((gr && gr[g]) || []).map(r => r.k).join(",")).join(";");
  const pubHas = !!pub.stand && GROUPS.some(g => ((pub.gruppen && pub.gruppen[g]) || []).length);
  const neu = !pubHas || sig(pub.gruppen) !== sig(gruppen);
  const archiv = Array.isArray(pub.archiv) ? pub.archiv.slice() : [];
  if (neu && pubHas) archiv.unshift(Object.assign({ stand: pub.stand }, pub.thema ? { thema: pub.thema } : {}, { gruppen: pub.gruppen }));
  const out = { stand: neu ? new Date().toLocaleDateString("sv-SE") : pub.stand };
  const thema = { de: (draft.thema.de || "").trim(), it: (draft.thema.it || "").trim() };
  if (thema.de || thema.it) out.thema = thema;
  out.gruppen = gruppen;
  if (archiv.length) out.archiv = archiv.slice(0, 40);
  return out;
}

export function Empfehlungen({ draft, setDraft, catalog }) {
  const { t, nf } = useSprache();
  const [g, setG] = React.useState("mittelstufe");
  const [q, setQ] = React.useState("");
  const [armed, setArmed] = React.useState(false);
  const liste = React.useRef(null), fokusNeu = React.useRef(false);
  const list = draft.gruppen[g], full = list.length >= 4;

  // Ändern = neues Entwurfsobjekt (Gruppe kopiert), gespeichert nach 300 ms Ruhe
  const aendern = fn => setDraft(d => { const n = { ...d, thema: { ...d.thema }, gruppen: { ...d.gruppen, [g]: d.gruppen[g].map(r => ({ ...r })) } }; fn(n); n.geaendert = true; return n; });
  React.useEffect(() => {
    if (!draft.geaendert) return undefined;
    const id = setTimeout(() => { const { geaendert, ...d } = draft; store.set(DRAFT, JSON.stringify(d)); }, 300); // eslint-disable-line no-unused-vars
    return () => clearTimeout(id);
  }, [draft]);
  // Nach dem Hinzufügen: Text des neuen Buches gleich bearbeiten
  React.useEffect(() => {
    if (!fokusNeu.current) return;
    fokusNeu.current = false;
    const ta = liste.current && liste.current.querySelector(".rec-ed:last-child textarea");
    if (ta) ta.focus();
  });

  const keys = React.useMemo(() => new Set(catalog.map(keyB)), [catalog]);
  const treffer = React.useMemo(() => {
    const s = normE(q);
    if (full || s.length < 2) return null;
    const terms = s.split(" ");
    return catalog.filter(b => { const x = normE([b.t, b.u, (b.a || []).join(" "), (b.i || []).join(" ")].join(" ")); return terms.every(w => x.includes(w)); }).slice(0, 8);
  }, [q, catalog, full]);
  const have = new Set(list.map(r => r.k));
  const n = GROUPS.reduce((a, x) => a + draft.gruppen[x].length, 0), ng = GROUPS.filter(x => draft.gruppen[x].length).length;

  const verwerfen = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
    setArmed(false);
    store.del(DRAFT);
    setDraft(ausVeroeffentlicht());
  };
  const bau = () => {
    const out = recsOut(draft);
    return {
      text: "/* Buchempfehlungen der Bibliothek der Deutschen Schule Mailand. Gepflegt über admin.html – nicht von Hand bearbeiten. */\n" +
        "window.DSM_EMPFEHLUNGEN = " + JSON.stringify(out, null, 1).replace(/</g, "\\u003c") + ";\n",
      // Danach gilt der neue Stand als veröffentlicht (sonst wanderte die Runde beim nächsten Mal doppelt ins Archiv)
      fertig: () => { window.DSM_EMPFEHLUNGEN = out; },
    };
  };
  const op = "size-[34px] rounded-md";

  return (
    <div className="steps grid gap-3.5 pb-10" id="tab-empf">
      <Card>
        <CardTitle>{t("eT")}</CardTitle>
        <CardDescription>{t("eP")}</CardDescription>
        <div className="mt-1 grid gap-2.5 sm:grid-cols-2" id="e-thema">
          {["de", "it"].map(l => (
            <Label key={l}>
              <span>{t(l === "de" ? "eThemaDe" : "eThemaIt")}</span>
              <Input className="h-10" data-f={l} value={draft.thema[l] || ""} onChange={e => aendern(d => { d.thema[l] = e.target.value; })} />
            </Label>
          ))}
        </div>
        <ToggleGroup
          type="single" id="e-groups" value={g} onValueChange={v => v && setG(v)}
          className="mt-3 flex flex-wrap gap-2 bg-transparent p-0 pt-1.5 shadow-none"
        >
          {GROUPS.map(x => (
            <ToggleGroupItem
              key={x} value={x} data-g={x}
              className="h-auto rounded-full border border-border bg-background px-3.5 py-2 text-m font-normal text-foreground data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:font-medium data-[state=on]:text-background"
            >
              {t("g_" + x)} ({draft.gruppen[x].length})
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="mt-2" id="e-list" ref={liste}>
          {list.length ? list.map((r, i) => (
            <div key={r.k} className="rec-ed grid gap-3 border-t border-border py-3.5 first:border-t-0" data-n={i}>
              <div className="hd flex items-start justify-between gap-2.5">
                <span>
                  <b className="font-semibold">{r.t}</b>
                  <small className="block text-s text-muted-foreground">{r.a || ""}</small>
                  {keys.has(r.k) ? null : <small className="warn block text-s font-medium text-rot">{t("eMissing")}</small>}
                </span>
                <span className="ops flex shrink-0 gap-1.5">
                  <Button variant="outline" size="icon-sm" className={op} data-op="up" aria-label={t("eUp")} disabled={i === 0}
                    onClick={() => aendern(d => { const l = d.gruppen[g]; [l[i], l[i - 1]] = [l[i - 1], l[i]]; })}><ChevronUpIcon aria-hidden="true" /></Button>
                  <Button variant="outline" size="icon-sm" className={op} data-op="down" aria-label={t("eDown")} disabled={i === list.length - 1}
                    onClick={() => aendern(d => { const l = d.gruppen[g]; [l[i], l[i + 1]] = [l[i + 1], l[i]]; })}><ChevronDownIcon aria-hidden="true" /></Button>
                  <Button variant="outline" size="icon-sm" className={op} data-op="del" aria-label={t("eRemove")}
                    onClick={() => aendern(d => { d.gruppen[g].splice(i, 1); })}><XIcon aria-hidden="true" /></Button>
                </span>
              </div>
              {["de", "it"].map(l => (
                <Label key={l}>
                  {t(l === "de" ? "eTeaserDe" : "eTeaserIt")}
                  <Textarea data-f={l} rows={3} value={r[l] || ""} onChange={e => aendern(d => { d.gruppen[g][i][l] = e.target.value; })} />
                </Label>
              ))}
            </div>
          )) : <p className="note m-0 text-s text-muted-foreground">{t("eEmpty")}</p>}
        </div>
        {/* Gruppe voll: Suche gesperrt, Hinweis mittig im Feld. Schon in der Gruppe: ausgegraut, ohne Knopf */}
        <div className="find relative mt-2.5">
          <Input id="e-q" type="search" autoComplete="off" disabled={full} placeholder={full ? "" : t("eFind")} value={full ? "" : q} onChange={e => setQ(e.target.value)} />
          <span className="full pointer-events-none absolute inset-x-0 top-0 grid h-11 place-items-center text-muted-foreground" id="e-full" hidden={!full}>{t("eFull")}</span>
          <ul className="mt-2 mb-0 list-none p-0" id="e-res">
            {treffer ? (treffer.length ? treffer.map(b => {
              const drin = have.has(keyB(b));
              return (
                <li key={keyB(b)} className={cn("flex items-center justify-between gap-2.5 border-t border-border py-2", drin && "drin opacity-45")}>
                  <span className="min-w-0">
                    <b>{b.t}</b>
                    <small className="block text-s text-muted-foreground">{(b.a || []).join(", ")}{b.j ? " · " + b.j : ""}</small>
                  </span>
                  {drin ? null : (
                    <Button variant="outline" size="sm" onClick={() => {
                      if (list.length >= 4 || have.has(keyB(b))) return;
                      fokusNeu.current = true;
                      aendern(d => { d.gruppen[g].push({ k: keyB(b), t: b.t, a: (b.a || []).join(", "), de: "", it: "" }); });
                    }}>{t("eAdd")}</Button>
                  )}
                </li>
              );
            }) : <li className="border-t border-border py-2"><span className="note text-s text-muted-foreground">{t("eNoResults")}</span></li>) : null}
          </ul>
        </div>
      </Card>
      <Veroeffentlichen
        datei="empfehlungen.js" bau={bau} ids={{ knopf: "e-dl", how: "e-how", vorschau: "e-prev" }} alt="eDl" howKey="eHow" vorschau
        onVorschau={() => store.set("dsm-vorschau-empf", JSON.stringify(recsOut(draft)))}
        nachher={<p className="note mt-2.5 mb-0 text-s text-muted-foreground" id="e-state">{t("eSaved", { n: nf(n), g: nf(ng) })}</p>}
      >
        <Button variant="outline" id="e-reset" onClick={verwerfen}><span>{t(armed ? "eResetSure" : "eReset")}</span></Button>
      </Veroeffentlichen>
    </div>
  );
}
