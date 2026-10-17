/* Reiter „Info“: Öffnungszeiten (bis zu zwei Zeiträume je Tag), Hinweis DE/IT, Ferien und Abwesenheiten.
   Entwurf im Browser (localStorage dsm-info-entwurf), Veröffentlichen als info.js. */
import * as React from "react";
import { PlusIcon, XIcon } from "lucide-react";

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

const IDAYS = ["mo", "di", "mi", "do", "fr", "sa"];
const IDRAFT = "dsm-info-entwurf";
const HHMM = /^\d{2}:\d{2}$/, YMD = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toLocaleDateString("sv-SE");
export function normInfo(x) {
  const o = { zeiten: {}, hinweis: { de: "", it: "" }, schliessungen: [] };
  IDAYS.forEach(k => { o.zeiten[k] = (x && x.zeiten && Array.isArray(x.zeiten[k]) ? x.zeiten[k] : []).slice(0, 2).map(r => [r[0] || "", r[1] || ""]); });
  if (x && x.hinweis) o.hinweis = { de: x.hinweis.de || "", it: x.hinweis.it || "" };
  if (x && Array.isArray(x.schliessungen)) {
    o.schliessungen = x.schliessungen.map(c => ({ art: c.art === "abwesend" ? "abwesend" : "ferien", von: c.von || "", bis: c.bis || "", de: c.de || "", it: c.it || "" }));
  }
  return o;
}
export const infoLaden = () => normInfo(store.json(IDRAFT) || window.DSM_INFO);
const okRange = r => HHMM.test(r[0]) && HHMM.test(r[1]) && r[0] < r[1];
const endOf = c => (c.bis && c.bis >= c.von ? c.bis : c.von);
function cloProblem(c) {
  if (!YMD.test(c.von)) return "iNoDate";
  if (c.bis && c.bis < c.von) return "iBadRange";
  if (endOf(c) < today()) return "iPast";
  return "";
}
// Reihenfolge der Einträge (nach erstem Tag); nur bei Hinzufügen/Entfernen/Art neu, nicht beim Tippen
const sortiert = l => l.map((c, n) => n).sort((a, b) => { const x = l[a].von || "9", y = l[b].von || "9"; return x < y ? -1 : x > y ? 1 : a - b; });
function infoOut(info) {
  const zeiten = {};
  IDAYS.forEach(k => { zeiten[k] = info.zeiten[k].filter(okRange).map(r => [r[0], r[1]]).sort(); });
  const schliessungen = info.schliessungen.filter(c => YMD.test(c.von))
    .map(c => ({ art: c.art, von: c.von, bis: endOf(c), de: c.de.trim(), it: c.it.trim() }))
    .sort((a, b) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0));
  return { stand: today(), zeiten, hinweis: { de: info.hinweis.de.trim(), it: info.hinweis.it.trim() }, schliessungen };
}

export function Info({ info, setInfo }) {
  const { t, nf } = useSprache();
  const [armed, setArmed] = React.useState(false);
  const [reihe, setReihe] = React.useState(() => sortiert(info.schliessungen));
  const fokus = React.useRef(null), box = React.useRef(null), sortieren = React.useRef(false);

  const aendern = (fn, neuSortieren) => {
    if (neuSortieren) sortieren.current = true;
    setInfo(alt => {
      const n = { zeiten: { ...alt.zeiten }, hinweis: { ...alt.hinweis }, schliessungen: alt.schliessungen.map(c => ({ ...c })), geaendert: true };
      IDAYS.forEach(k => { n.zeiten[k] = alt.zeiten[k].map(r => r.slice()); });
      fn(n);
      return n;
    });
  };
  React.useLayoutEffect(() => {
    if (!sortieren.current) return;
    sortieren.current = false;
    setReihe(sortiert(info.schliessungen));
  }, [info]);
  React.useEffect(() => {
    if (!info.geaendert) return undefined;
    const id = setTimeout(() => { const { geaendert, ...d } = info; store.set(IDRAFT, JSON.stringify(d)); }, 300); // eslint-disable-line no-unused-vars
    return () => clearTimeout(id);
  }, [info]);
  // Neues Feld (Zeitraum, Eintrag) gleich bearbeiten
  React.useEffect(() => {
    if (!fokus.current) return;
    const el = box.current.querySelector(fokus.current);
    if (el) { fokus.current = null; el.focus(); }
  });
  // Neue Einträge stehen bis zum nächsten Sortieren am Ende
  const anzahl = info.schliessungen.length;
  const folge = reihe.filter(n => n < anzahl).concat(info.schliessungen.map((c, n) => n).filter(n => !reihe.includes(n)));

  const bad = IDAYS.reduce((a, k) => a + info.zeiten[k].filter(r => !okRange(r)).length, 0) + info.schliessungen.filter(c => !YMD.test(c.von)).length;
  const vorbei = info.schliessungen.some(c => cloProblem(c) === "iPast");
  const neu = art => { fokus.current = `#i-clo .clo[data-n="${info.schliessungen.length}"] input[data-f="von"]`; aendern(d => { d.schliessungen.push({ art, von: "", bis: "", de: "", it: "" }); }, true); };
  const verwerfen = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
    setArmed(false);
    store.del(IDRAFT);
    const frisch = normInfo(window.DSM_INFO);
    setInfo(frisch); setReihe(sortiert(frisch.schliessungen));
  };
  const bau = () => {
    const out = infoOut(info);
    return {
      text: "/* Öffnungszeiten, Ferien und Abwesenheiten der Bibliothek der Deutschen Schule Mailand. Gepflegt über admin.html – nicht von Hand bearbeiten. */\n" +
        "window.DSM_INFO = " + JSON.stringify(out, null, 1).replace(/</g, "\\u003c") + ";\n",
      fertig: () => { window.DSM_INFO = out; },
    };
  };
  const zeit = "h-10 w-28 px-2.5";
  const mini = "size-[34px] rounded-md";

  return (
    <div className="steps grid gap-3.5 pb-10" id="tab-info" ref={box}>
      <Card>
        <CardTitle>{t("iHoursT")}</CardTitle>
        <CardDescription>{t("iHoursP")}</CardDescription>
        <div className="hours mt-2.5 grid" id="i-hours">
          {IDAYS.map(k => {
            const rs = info.zeiten[k];
            return (
              <div key={k} className="day grid gap-1.5 border-t border-border py-2.5 first:border-t-0 sm:grid-cols-[7rem_1fr] sm:items-center sm:gap-2.5" data-d={k}>
                <b className="font-medium">{t("wd_" + k)}</b>
                <div className="ranges flex flex-wrap items-center gap-2">
                  {rs.map((r, n) => (
                    <span key={n} className="range inline-flex items-center gap-1.5" data-n={n}>
                      {[0, 1].map(f => (
                        <React.Fragment key={f}>
                          {f ? <span aria-hidden="true">–</span> : null}
                          <Input
                            type="time" className={zeit} data-f={f} value={r[f]} aria-invalid={okRange(r) ? undefined : "true"}
                            aria-label={t("wd_" + k) + " " + t(f ? "iTo" : "iFrom")}
                            onChange={e => aendern(d => { d.zeiten[k][n][f] = e.target.value; })}
                          />
                        </React.Fragment>
                      ))}
                      <Button variant="outline" size="icon-sm" className={mini} data-op="del" aria-label={t("iDelRange")}
                        onClick={() => aendern(d => { d.zeiten[k].splice(n, 1); })}><XIcon aria-hidden="true" /></Button>
                    </span>
                  ))}
                  {rs.length ? null : <span className="zu text-muted-foreground">{t("iClosed")}</span>}
                  {rs.length < 2 ? (
                    <Button variant="outline" size="icon-sm" className={mini} data-op="add" aria-label={t("iAddRange")} onClick={() => {
                      fokus.current = `#i-hours .day[data-d="${k}"] .range:last-of-type input`;
                      aendern(d => { const l = d.zeiten[k]; l.push(l.length ? [l[0][1] || "", ""] : ["08:00", "13:00"]); });
                    }}><PlusIcon aria-hidden="true" /></Button>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div>
            <Button variant="ghost" size="text" id="i-copy" onClick={() => aendern(d => { ["di", "mi", "do", "fr"].forEach(k => { d.zeiten[k] = d.zeiten.mo.map(r => r.slice()); }); })}>{t("iCopy")}</Button>
          </div>
        </div>
      </Card>
      <Card>
        <CardTitle>{t("iNoteT")}</CardTitle>
        <CardDescription>{t("iNoteP")}</CardDescription>
        <div className="mt-1 grid gap-3">
          {["de", "it"].map(l => (
            <Label key={l}>
              <span>{t(l === "de" ? "eTeaserDe" : "eTeaserIt")}</span>
              <Textarea id={"i-note-" + l} rows={2} value={info.hinweis[l]} onChange={e => aendern(d => { d.hinweis[l] = e.target.value; })} />
            </Label>
          ))}
        </div>
      </Card>
      <Card>
        <CardTitle>{t("iCloT")}</CardTitle>
        <CardDescription>{t("iCloP")}</CardDescription>
        <div className="mt-2" id="i-clo">
          {folge.length ? folge.map(n => {
            const c = info.schliessungen[n], p = cloProblem(c), ab = c.art === "abwesend";
            return (
              <div key={n} className={cn("clo grid gap-2.5 border-t border-border py-3.5 first:border-t-0", p === "iPast" && "vorbei opacity-50")} data-n={n}>
                <div className="hd flex items-center justify-between gap-2.5">
                  <ToggleGroup
                    type="single" variant="flaeche" size="xs" value={c.art} className="seg2 inline-grid w-fit rounded-lg p-[3px]"
                    onValueChange={v => v && v !== c.art && aendern(d => { d.schliessungen[n].art = v; }, true)}
                  >
                    <ToggleGroupItem value="ferien" data-art="ferien">{t("iFerien")}</ToggleGroupItem>
                    <ToggleGroupItem value="abwesend" data-art="abwesend">{t("iAbw")}</ToggleGroupItem>
                  </ToggleGroup>
                  <Button variant="outline" size="icon-sm" className={mini} data-op="del" aria-label={t("iDel")}
                    onClick={() => aendern(d => { d.schliessungen.splice(n, 1); }, true)}><XIcon aria-hidden="true" /></Button>
                </div>
                <div className="dates grid grid-cols-2 gap-2.5">
                  {["von", "bis"].map(f => (
                    <Label key={f}>{t(f === "von" ? "iVon" : "iBis")}
                      <Input type="date" className="h-10 px-2.5" data-f={f} value={c[f]} onChange={e => aendern(d => { d.schliessungen[n][f] = e.target.value; })} />
                    </Label>
                  ))}
                </div>
                <div className="texts grid gap-2.5 sm:grid-cols-2">
                  {["de", "it"].map(l => (
                    <Label key={l}>{t(l === "de" ? "eTeaserDe" : "eTeaserIt")}
                      <Input className="txt h-10 px-2.5" data-f={l} value={c[l]} placeholder={t(l === "de" ? (ab ? "iPhAbw" : "iPhFerien") : (ab ? "iPhAbwIt" : "iPhFerienIt"))}
                        onChange={e => aendern(d => { d.schliessungen[n][l] = e.target.value; })} />
                    </Label>
                  ))}
                </div>
                <span className="warn text-s font-medium text-rot" hidden={!p}>{p ? t(p) : ""}</span>
              </div>
            );
          }) : <p className="note m-0 text-s text-muted-foreground">{t("iNone")}</p>}
        </div>
        <CardFooter className="mt-3">
          <Button variant="outline" size="sm" id="i-add-ferien" onClick={() => neu("ferien")}>{t("iAddFerien")}</Button>
          <Button variant="outline" size="sm" id="i-add-abw" onClick={() => neu("abwesend")}>{t("iAddAbw")}</Button>
          <Button variant="outline" size="sm" id="i-clean" hidden={!vorbei}
            onClick={() => aendern(d => { d.schliessungen = d.schliessungen.filter(c => cloProblem(c) !== "iPast"); }, true)}>{t("iClean")}</Button>
        </CardFooter>
      </Card>
      <Veroeffentlichen
        datei="info.js" bau={bau} ids={{ knopf: "i-dl", how: "i-how", vorschau: "i-prev" }} alt="iDl" howKey="iHow" vorschau
        onVorschau={() => store.set("dsm-vorschau-info", JSON.stringify(infoOut(info)))}
        nachher={bad ? <p className="note mt-2.5 mb-0 text-s text-muted-foreground" id="i-state">{t("iIncomplete", { n: nf(bad) })}</p> : null}
      >
        <Button variant="outline" id="i-reset" onClick={verwerfen}><span>{t(armed ? "eResetSure" : "eReset")}</span></Button>
      </Veroeffentlichen>
    </div>
  );
}
