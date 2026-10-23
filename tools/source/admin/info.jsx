/* Tab "info": announcement banner (text DE/IT, color, optional end), opening hours (up to two time ranges per day, Mon–Sun),
   notice DE/IT with optional period, contact, holidays, absences and special opening hours.
   Draft in the browser (localStorage dsm-info-draft), published as info.js. */
import * as React from "react";
import { PlusIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnnouncementBar, ColorDots, ANNOUNCE_COLORS, announceColor } from "@/components/announcement";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { store } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { Publish } from "./publish";

const IDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const IDRAFT = "dsm-info-draft";
const HHMM = /^\d{2}:\d{2}$/, YMD = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toLocaleDateString("sv-SE");
const ANN_MAX = 140; // one or two lines on the phone
export function normInfo(x) {
  const o = { hours: {}, notice: { de: "", it: "", from: "", to: "" }, contact: { email: "", phone: "", de: "", it: "" }, closures: [],
    announcement: { de: "", it: "", color: "neutral", until: "" } };
  IDAYS.forEach(k => { o.hours[k] = (x && x.hours && Array.isArray(x.hours[k]) ? x.hours[k] : []).slice(0, 2).map(r => [r[0] || "", r[1] || ""]); });
  if (x && x.notice) o.notice = { de: x.notice.de || "", it: x.notice.it || "", from: x.notice.from || "", to: x.notice.to || "" };
  if (x && x.contact) o.contact = { email: x.contact.email || "", phone: x.contact.phone || "", de: x.contact.de || "", it: x.contact.it || "" };
  if (x && x.announcement) {
    const a = x.announcement;
    o.announcement = { de: a.de || "", it: a.it || "", color: announceColor(a.color), until: YMD.test(a.until || "") ? a.until : "" };
  }
  if (x && Array.isArray(x.closures)) {
    o.closures = x.closures.map(c => {
      const type = c.type === "absent" || c.type === "special" ? c.type : "holiday";
      const n = { type, from: c.from || "", to: c.to || "", de: c.de || "", it: c.it || "" };
      if (type === "special") n.hours = (Array.isArray(c.hours) ? c.hours : []).slice(0, 2).map(r => [(r && r[0]) || "", (r && r[1]) || ""]);
      return n;
    });
  }
  return o;
}
export const loadInfo = () => normInfo(store.json(IDRAFT) || window.DSM_INFO);
const okRange = r => HHMM.test(r[0]) && HHMM.test(r[1]) && r[0] < r[1];
const endOf = c => (c.to && c.to >= c.from ? c.to : c.from);
const spOk = c => c.type !== "special" || (c.hours || []).some(okRange);
function cloProblem(c) {
  if (!YMD.test(c.from)) return "iNoDate";
  if (c.to && c.to < c.from) return "iBadRange";
  if (!spOk(c)) return "iSpNone";
  if (endOf(c) < today()) return "iPast";
  return "";
}
// Order of the entries (by first day); only renewed on add/remove/type change, not while typing
const sorted = l => l.map((c, n) => n).sort((a, b) => { const x = l[a].from || "9", y = l[b].from || "9"; return x < y ? -1 : x > y ? 1 : a - b; });
function infoOut(info) {
  const hours = {};
  IDAYS.forEach(k => { hours[k] = info.hours[k].filter(okRange).map(r => [r[0], r[1]]).sort(); });
  const closures = info.closures.filter(c => YMD.test(c.from))
    .map(c => {
      const o = { type: c.type, from: c.from, to: endOf(c), de: c.de.trim(), it: c.it.trim() };
      if (c.type === "special") o.hours = (c.hours || []).filter(okRange).map(r => [r[0], r[1]]).sort();
      return o;
    })
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  const notice = { de: info.notice.de.trim(), it: info.notice.it.trim() };
  const nf = info.notice.from, nt = info.notice.to;
  if (YMD.test(nf)) notice.from = nf;
  if (YMD.test(nt) && !(notice.from && nt < notice.from)) notice.to = nt;
  const out = { updated: today(), hours, notice, closures };
  const ct = {};
  ["email", "phone", "de", "it"].forEach(k => { const v = (info.contact[k] || "").trim(); if (v) ct[k] = v; });
  if (Object.keys(ct).length) out.contact = ct;
  // Announcement only with a text; without one there is no banner
  const a = info.announcement, de = a.de.trim(), it = a.it.trim();
  if (de || it) {
    out.announcement = { de, it, color: announceColor(a.color) };
    if (YMD.test(a.until)) out.announcement.until = a.until;
  }
  return out;
}

export function Info({ info, setInfo }) {
  const { t, nf, lang } = useLanguage();
  const [armed, setArmed] = React.useState(false);
  const [order, setOrder] = React.useState(() => sorted(info.closures));
  const focus = React.useRef(null), box = React.useRef(null), resort = React.useRef(false);

  const change = (fn, sortAgain) => {
    if (sortAgain) resort.current = true;
    setInfo(old => {
      const n = { hours: { ...old.hours }, notice: { ...old.notice }, contact: { ...old.contact }, announcement: { ...old.announcement }, changed: true,
        closures: old.closures.map(c => (c.hours ? { ...c, hours: c.hours.map(r => r.slice()) } : { ...c })) };
      IDAYS.forEach(k => { n.hours[k] = old.hours[k].map(r => r.slice()); });
      fn(n);
      return n;
    });
  };
  React.useLayoutEffect(() => {
    if (!resort.current) return;
    resort.current = false;
    setOrder(sorted(info.closures));
  }, [info]);
  React.useEffect(() => {
    if (!info.changed) return undefined;
    const id = setTimeout(() => { const { changed, ...d } = info; store.set(IDRAFT, JSON.stringify(d)); }, 300); // eslint-disable-line no-unused-vars
    return () => clearTimeout(id);
  }, [info]);
  // Edit a new field (time range, entry) right away
  React.useEffect(() => {
    if (!focus.current) return;
    const el = box.current.querySelector(focus.current);
    if (el) { focus.current = null; el.focus(); }
  });
  // New entries stay at the end until the next sort
  const count = info.closures.length;
  const sequence = order.filter(n => n < count).concat(info.closures.map((c, n) => n).filter(n => !order.includes(n)));

  const bad = IDAYS.reduce((a, k) => a + info.hours[k].filter(r => !okRange(r)).length, 0) + info.closures.filter(c => !YMD.test(c.from) || !spOk(c)).length;
  const past = info.closures.some(c => cloProblem(c) === "iPast");
  const add = type => {
    focus.current = `#i-clo .clo[data-n="${info.closures.length}"] input[data-f="from"]`;
    change(d => { d.closures.push(type === "special" ? { type, from: "", to: "", de: "", it: "", hours: [["08:00", "13:00"]] } : { type, from: "", to: "", de: "", it: "" }); }, true);
  };
  const discard = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
    setArmed(false);
    store.del(IDRAFT);
    const fresh = normInfo(window.DSM_INFO);
    setInfo(fresh); setOrder(sorted(fresh.closures));
  };
  const build = () => {
    const out = infoOut(info);
    return {
      // Header line exactly as save.php expects it (DSM_FILES), otherwise publishing online fails with "format"
      text: "/* Opening hours, holidays and absences of the library of the Deutsche Schule Mailand. Maintained via admin.html – do not edit by hand. */\n" +
        "window.DSM_INFO = " + JSON.stringify(out, null, 1).replace(/</g, "\\u003c") + ";\n",
      done: () => { window.DSM_INFO = out; },
    };
  };
  const ann = info.announcement;
  const annText = (ann[lang] || ann.de || ann.it).trim();
  const annPast = YMD.test(ann.until) && ann.until < today();
  const colorNames = Object.fromEntries(ANNOUNCE_COLORS.map(c => [c, t("c_" + c)]));
  const time = "w-28";
  const mini = "rounded-md";
  // Up to two time ranges; edit(fn) changes the list in the draft, focusSel = selector of the new range's first input
  const ranges = ({ rs, label, edit, focusSel }) => (
    <div className="ranges flex flex-wrap items-center gap-2">
      {rs.map((r, n) => (
        <span key={n} className="range inline-flex items-center gap-1.5" data-n={n}>
          {[0, 1].map(f => (
            <React.Fragment key={f}>
              {f ? <span aria-hidden="true">–</span> : null}
              <Input
                type="time" className={time} data-f={f} value={r[f]} aria-invalid={okRange(r) ? undefined : "true"}
                aria-label={label + " " + t(f ? "iTo" : "iFrom")}
                onChange={e => edit(l => { l[n][f] = e.target.value; })}
              />
            </React.Fragment>
          ))}
          <Button variant="outline" size="icon" className={mini} data-op="del" aria-label={t("iDelRange")}
            onClick={() => edit(l => { l.splice(n, 1); })}><XIcon aria-hidden="true" /></Button>
        </span>
      ))}
      {rs.length ? null : <span className="closed text-muted-foreground">{t("iClosed")}</span>}
      {rs.length < 2 ? (
        <Button variant="outline" size="icon" className={mini} data-op="add" aria-label={t("iAddRange")} onClick={() => {
          focus.current = focusSel;
          edit(l => { l.push(l.length ? [l[0][1] || "", ""] : ["08:00", "13:00"]); });
        }}><PlusIcon aria-hidden="true" /></Button>
      ) : null}
    </div>
  );
  const noteFrom = info.notice.from, noteTo = info.notice.to;
  const noteWarn = YMD.test(noteFrom) && YMD.test(noteTo) && noteTo < noteFrom ? "iBadRange" : (YMD.test(noteTo) && noteTo < today() ? "iPast" : "");

  return (
    <div className="steps grid gap-4 pb-10 sm:gap-6" id="tab-info" ref={box}>
      <Card id="i-ann">
        <CardTitle>{t("iAnnT")}</CardTitle>
        <CardDescription>{t("iAnnP")}</CardDescription>
        <div className="mt-1 grid gap-3">
          {["de", "it"].map(l => (
            <Label key={l}>
              <span>{t(l === "de" ? "eTeaserDe" : "eTeaserIt")}</span>
              <Textarea id={"i-ann-" + l} rows={2} maxLength={ANN_MAX} value={ann[l]} onChange={e => change(d => { d.announcement[l] = e.target.value; })} />
            </Label>
          ))}
          <div className="grid gap-1.5 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-4">
            <div className="grid gap-1">
              <span className="text-s font-medium" id="i-ann-color-t">{t("iAnnColor")} <span className="font-normal text-muted-foreground">· {colorNames[announceColor(ann.color)]}</span></span>
              <ColorDots id="i-ann-color" className="-ml-2" aria-labelledby="i-ann-color-t" labels={colorNames} value={ann.color}
                onValueChange={v => v && change(d => { d.announcement.color = v; })} />
            </div>
            <Label>{t("iAnnUntil")}
              <Input type="date" id="i-ann-until" className="sm:w-44" value={ann.until} onChange={e => change(d => { d.announcement.until = e.target.value; })} />
            </Label>
          </div>
          <span className="warn text-s font-medium text-red" hidden={!annPast}>{annPast ? t("iAnnPast") : ""}</span>
          <div className="grid gap-1.5">
            <span className="text-s font-medium text-muted-foreground">{t("iAnnPreview")}</span>
            {annText ? (
              <div className="overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_var(--line)]" id="i-ann-preview" inert>
                <AnnouncementBar text={annText} color={ann.color} closeLabel={t("annClose")} />
              </div>
            ) : <p className="note m-0 text-s text-muted-foreground">{t("iAnnNone")}</p>}
          </div>
        </div>
        {annText ? (
          <CardFooter>
            <Button variant="outline" id="i-ann-clear" onClick={() => change(d => { d.announcement.de = ""; d.announcement.it = ""; d.announcement.until = ""; })}>{t("iAnnClear")}</Button>
          </CardFooter>
        ) : null}
      </Card>
      <Card>
        <CardTitle>{t("iHoursT")}</CardTitle>
        <CardDescription>{t("iHoursP")}</CardDescription>
        <div className="hours mt-2 grid" id="i-hours">
          {IDAYS.map(k => {
            const rs = info.hours[k];
            return (
              <div key={k} className="day grid gap-1.5 border-t border-border py-2 first:border-t-0 sm:grid-cols-[7rem_1fr] sm:items-center sm:gap-3" data-d={k}>
                <b className="font-medium">{t("wd_" + k)}</b>
                {ranges({ rs, label: t("wd_" + k), focusSel: `#i-hours .day[data-d="${k}"] .range:last-of-type input`, edit: fn => change(d => { fn(d.hours[k]); }) })}
              </div>
            );
          })}
          <div>
            <Button variant="ghost" size="text" id="i-copy" onClick={() => change(d => { ["tue", "wed", "thu", "fri"].forEach(k => { d.hours[k] = d.hours.mon.map(r => r.slice()); }); })}>{t("iCopy")}</Button>
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
              <Textarea id={"i-note-" + l} rows={2} value={info.notice[l]} onChange={e => change(d => { d.notice[l] = e.target.value; })} />
            </Label>
          ))}
          <div className="dates grid grid-cols-2 gap-3">
            {["from", "to"].map(f => (
              <Label key={f}>{t(f === "from" ? "iNoteFrom" : "iNoteTo")}
                <Input type="date" id={"i-note-" + f} value={info.notice[f]} onChange={e => change(d => { d.notice[f] = e.target.value; })} />
              </Label>
            ))}
          </div>
          <span className="note text-s text-muted-foreground">{t("iNoteRange")}</span>
          <span className="warn text-s font-medium text-red" id="i-note-warn" hidden={!noteWarn}>{noteWarn ? t(noteWarn) : ""}</span>
        </div>
      </Card>
      <Card>
        <CardTitle>{t("iContactT")}</CardTitle>
        <CardDescription>{t("iContactP")}</CardDescription>
        <div className="mt-1 grid gap-3" id="i-contact">
          <div className="grid gap-3 sm:grid-cols-2">
            <Label>{t("iEmail")}
              <Input type="email" id="i-contact-email" value={info.contact.email} onChange={e => change(d => { d.contact.email = e.target.value; })} />
            </Label>
            <Label>{t("iPhone")}
              <Input type="tel" id="i-contact-phone" value={info.contact.phone} onChange={e => change(d => { d.contact.phone = e.target.value; })} />
            </Label>
          </div>
          {["de", "it"].map(l => (
            <Label key={l}>
              <span>{t(l === "de" ? "eTeaserDe" : "eTeaserIt")}</span>
              <Textarea id={"i-contact-" + l} rows={2} value={info.contact[l]} onChange={e => change(d => { d.contact[l] = e.target.value; })} />
            </Label>
          ))}
        </div>
      </Card>
      <Card>
        <CardTitle>{t("iCloT")}</CardTitle>
        <CardDescription>{t("iCloP")}</CardDescription>
        <div className="mt-2" id="i-clo">
          {sequence.length ? sequence.map(n => {
            const c = info.closures[n], p = cloProblem(c), ab = c.type === "absent", sp = c.type === "special";
            return (
              <div key={n} className={cn("clo grid gap-3 border-t border-border py-4 first:border-t-0", p === "iPast" && "past opacity-50")} data-n={n}>
                <div className="hd flex items-center justify-between gap-3">
                  <ToggleGroup
                    type="single" variant="surface" value={c.type} className="seg2 inline-grid w-fit"
                    onValueChange={v => v && v !== c.type && change(d => {
                      d.closures[n].type = v;
                      if (v === "special" && !d.closures[n].hours) d.closures[n].hours = [["08:00", "13:00"]];
                    }, true)}
                  >
                    <ToggleGroupItem value="holiday" data-type="holiday">{t("iHoliday")}</ToggleGroupItem>
                    <ToggleGroupItem value="absent" data-type="absent">{t("iAbsent")}</ToggleGroupItem>
                    <ToggleGroupItem value="special" data-type="special">{t("iSpecial")}</ToggleGroupItem>
                  </ToggleGroup>
                  <Button variant="outline" size="icon" className={mini} data-op="del" aria-label={t("iDel")}
                    onClick={() => change(d => { d.closures.splice(n, 1); }, true)}><XIcon aria-hidden="true" /></Button>
                </div>
                <div className="dates grid grid-cols-2 gap-3">
                  {["from", "to"].map(f => (
                    <Label key={f}>{t(f === "from" ? "iFirst" : "iLast")}
                      <Input type="date" data-f={f} value={c[f]} onChange={e => change(d => { d.closures[n][f] = e.target.value; })} />
                    </Label>
                  ))}
                </div>
                {sp ? (
                  <div className="sp grid gap-1.5">
                    <span className="text-s text-muted-foreground">{t("iSpTimes")}</span>
                    {ranges({ rs: c.hours || [], label: t("iSpecial"), focusSel: `#i-clo .clo[data-n="${n}"] .range:last-of-type input`, edit: fn => change(d => { fn(d.closures[n].hours); }) })}
                  </div>
                ) : null}
                <div className="texts grid gap-3 sm:grid-cols-2">
                  {["de", "it"].map(l => (
                    <Label key={l}>{t(l === "de" ? "eTeaserDe" : "eTeaserIt")}
                      <Input className="txt" data-f={l} value={c[l]} placeholder={t(l === "de" ? (sp ? "iPhSpecial" : ab ? "iPhAbsent" : "iPhHoliday") : (sp ? "iPhSpecialIt" : ab ? "iPhAbsentIt" : "iPhHolidayIt"))}
                        onChange={e => change(d => { d.closures[n][l] = e.target.value; })} />
                    </Label>
                  ))}
                </div>
                <span className="warn text-s font-medium text-red" hidden={!p}>{p ? t(p) : ""}</span>
              </div>
            );
          }) : <p className="note m-0 text-s text-muted-foreground">{t("iNone")}</p>}
        </div>
        <CardFooter>
          <Button variant="outline" id="i-add-holiday" onClick={() => add("holiday")}>{t("iAddHoliday")}</Button>
          <Button variant="outline" id="i-add-absent" onClick={() => add("absent")}>{t("iAddAbsent")}</Button>
          <Button variant="outline" id="i-add-special" onClick={() => add("special")}>{t("iAddSpecial")}</Button>
          <Button variant="outline" id="i-clean" hidden={!past}
            onClick={() => change(d => { d.closures = d.closures.filter(c => cloProblem(c) !== "iPast"); }, true)}>{t("iClean")}</Button>
        </CardFooter>
      </Card>
      <Publish
        file="info.js" build={build} ids={{ button: "i-dl", how: "i-how", preview: "i-prev" }} alt="iDl" howKey="iHow" preview
        onPreview={() => store.set("dsm-preview-info", JSON.stringify(infoOut(info)))}
        after={bad ? <p className="note mt-2 mb-0 text-s text-muted-foreground" id="i-state">{t("iIncomplete", { n: nf(bad) })}</p> : null}
      >
        <Button variant="outline" id="i-reset" onClick={discard}><span>{t(armed ? "eResetSure" : "eReset")}</span></Button>
      </Publish>
    </div>
  );
}
