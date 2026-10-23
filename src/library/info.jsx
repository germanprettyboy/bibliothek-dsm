/* Info above the list: opening hours (open/closed today), holidays, absences and special opening hours, plus a dialog
   with all hours, notice (optional period) and contact. Data: info.js (window.DSM_INFO, loaded before this script),
   maintained in admin.html. Past closing days hide themselves. */
import * as React from "react";

import { Chevron } from "@/components/chevron";
import { GlassDialog } from "@/components/glass-dialog";
import { Section } from "@/components/settings";
import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { store } from "@/lib/storage";
import { addStrings, useLanguage, t } from "@/lib/language";
import { useSwipe } from "@/lib/swipe";
import { PREVIEW } from "@/library/data";

addStrings({
  de: {
    infoT: "Öffnungszeiten", infoOpen: "Öffnungszeiten und Schließtage anzeigen",
    openNow: "Jetzt geöffnet", until: "bis {t}", openLater: "Heute ab {t} geöffnet", today: "Heute",
    closedNow: "Jetzt geschlossen", closedToday: "Heute geschlossen", again: "Wieder geöffnet {w}",
    wTomorrow: "morgen ab {t}", wDay: "am {w} ab {t}", wDate: "am {w}, {d}, ab {t}",
    closed: "geschlossen", holiday: "Ferien", absent: "Bibliothek geschlossen",
    typeHoliday: "Ferien", typeAbsent: "Abwesenheit", typeSpecial: "Andere Zeiten", special: "Geänderte Öffnungszeiten",
    closuresT: "Ferien und Schließtage", closuresSpT: "Ferien, Schließtage und geänderte Zeiten", contactT: "Kontakt", noClosures: "Keine Schließtage geplant.",
    wd_mon: "Montag", wd_tue: "Dienstag", wd_wed: "Mittwoch", wd_thu: "Donnerstag", wd_fri: "Freitag", wd_sat: "Samstag", wd_sun: "Sonntag",
    ws_mon: "Mo", ws_tue: "Di", ws_wed: "Mi", ws_thu: "Do", ws_fri: "Fr", ws_sat: "Sa", ws_sun: "So",
  },
  it: {
    infoT: "Orari di apertura", infoOpen: "Mostra orari e giorni di chiusura",
    openNow: "Aperta ora", until: "fino alle {t}", openLater: "Oggi aperta dalle {t}", today: "Oggi",
    closedNow: "Chiusa ora", closedToday: "Oggi chiusa", again: "Riapre {w}",
    wTomorrow: "domani alle {t}", wDay: "{w} alle {t}", wDate: "{w} {d} alle {t}",
    closed: "chiusa", holiday: "Vacanze", absent: "Biblioteca chiusa",
    typeHoliday: "Vacanze", typeAbsent: "Assenza", typeSpecial: "Altri orari", special: "Orari modificati",
    closuresT: "Vacanze e giorni di chiusura", closuresSpT: "Vacanze, chiusure e orari modificati", contactT: "Contatti", noClosures: "Nessuna chiusura prevista.",
    wd_mon: "lunedì", wd_tue: "martedì", wd_wed: "mercoledì", wd_thu: "giovedì", wd_fri: "venerdì", wd_sat: "sabato", wd_sun: "domenica",
    ws_mon: "lun", ws_tue: "mar", ws_wed: "mer", ws_thu: "gio", ws_fri: "ven", ws_sat: "sab", ws_sun: "dom",
  },
});

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const ISO = /^\d{4}-\d{2}-\d{2}$/, HM = /^\d{2}:\d{2}$/;
const p2 = n => (n < 10 ? "0" : "") + n;
const iso = d => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); // YYYY-MM-DD, local date (no Intl: runs up to 120 times per call)
const keyOf = d => DAYS[(d.getDay() + 6) % 7];
const hm = d => p2(d.getHours()) + ":" + p2(d.getMinutes());
const tm = s => s.replace(/^0(\d)/, "$1");
const span = r => tm(r[0]) + "–" + tm(r[1]);

// Everything computed from info.js; texts via t() in the current language
function evaluate(I, lang, today) {
  const valid = l => (l || []).filter(r => r && HM.test(r[0]) && HM.test(r[1]) && r[0] < r[1]).map(r => [r[0], r[1]]).sort();
  const dayRanges = k => valid((I.hours || {})[k]);
  const hasWeek = DAYS.some(k => dayRanges(k).length);
  const nt = I.notice || {};
  // The notice only shows within its optional period (a missing bound = open)
  const inPeriod = (!ISO.test(nt.from || "") || nt.from <= today) && (!ISO.test(nt.to || "") || today <= nt.to);
  const notice = inPeriod ? ((nt[lang] || nt.de || "") + "").trim() : "";
  const ct = I.contact || {};
  const contact = { email: ((ct.email || "") + "").trim(), phone: ((ct.phone || "") + "").trim(), text: ((ct[lang] || ct.de || "") + "").trim() };
  const hasContact = !!(contact.email || contact.phone || contact.text);
  // All entries by first day; "special" = other opening hours on these days (invalid hours: entry ignored)
  const closures = (I.closures || []).filter(c => c && ISO.test(c.from))
    .map(c => Object.assign({}, c, { to: ISO.test(c.to || "") && c.to >= c.from ? c.to : c.from }, c.type === "special" ? { hours: valid(c.hours) } : {}))
    .filter(c => c.type !== "special" || c.hours.length)
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  const closed = closures.filter(c => c.type !== "special"), specials = closures.filter(c => c.type === "special");
  const closedOn = s => closed.find(c => c.from <= s && s <= c.to);
  const specialOn = s => specials.find(c => c.from <= s && s <= c.to);
  // Effective ranges of a date: closing day wins, then special hours, then the regular weekday
  const rangesOn = (s, k) => { if (closedOn(s)) return []; const sp = specialOn(s); return sp ? sp.hours : dayRanges(k); };
  const label = c => ((c[lang] || c.de || "") + "").trim() || t(c.type === "absent" ? "absent" : c.type === "special" ? "special" : "holiday");
  function dd(s, year) {
    const [y, m, d] = s.split("-");
    const short = lang === "it" ? `${+d}/${+m}` : `${+d}.${+m}.`;
    return year ? (lang === "it" ? `${short}/${y}` : `${short}${y}`) : short;
  }
  function rangeText(c) {
    const yr = c.to.slice(0, 4) !== String(new Date().getFullYear());
    if (c.from === c.to) {
      const d = new Date(c.from + "T12:00:00");
      return t("ws_" + keyOf(d)) + ", " + dd(c.from, yr);
    }
    return dd(c.from, c.from.slice(0, 4) !== c.to.slice(0, 4)) + "–" + dd(c.to, yr);
  }
  // Date, plus "closed" unless the name already says so
  const closedText = c => rangeText(c) + (label(c) === t("absent") ? "" : " · " + t("closed"));
  const specialText = c => rangeText(c) + " · " + c.hours.map(span).join(", ");
  // Next opening from now (closing days skipped, at most 120 days ahead)
  function nextOpen(now) {
    const nowHm = hm(now);
    for (let i = 0; i <= 120; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
      const r = rangesOn(iso(d), keyOf(d)).find(x => i > 0 || x[0] > nowHm);
      if (r) return { d, r, i };
    }
    return null;
  }
  function when(n) {
    const tt = tm(n.r[0]), w = t("wd_" + keyOf(n.d));
    if (n.i === 1) return t("wTomorrow", { t: tt });
    return n.i <= 6 ? t("wDay", { w, t: tt }) : t("wDate", { w, d: dd(iso(n.d)), t: tt });
  }
  function status(now) {
    const nowHm = hm(now), c = closedOn(today);
    const any = hasWeek || specials.some(x => x.to >= today);
    const again = () => { const n = any && nextOpen(now); return n ? t("again", { w: when(n) }) : ""; };
    if (c) return { k: "closed", t: t("closedToday"), sub: [label(c) === t("absent") ? "" : label(c), again()].filter(Boolean).join(" · ") };
    if (!any) return null;
    const rs = rangesOn(today, keyOf(now)), all = t("today") + " " + rs.map(span).join(", ");
    const cur = rs.find(r => r[0] <= nowHm && nowHm < r[1]);
    if (cur) return { k: "open", t: t("openNow"), sub: rs.length > 1 ? all : t("until", { t: tm(cur[1]) }) };
    const later = rs.find(r => nowHm < r[0]);
    if (later) return { k: "later", t: t("openLater", { t: tm(later[0]) }), sub: all };
    return { k: "closed", t: t("closedNow"), sub: again() };
  }
  return { dayRanges, hasWeek, notice, contact, hasContact, closures, closedOn, label, rangeText, closedText, specialText, status };
}

// The library is in Milan: "open now" in Italian time, also on a device set to another time zone.
// Returns the wall-clock time there as a local Date (everything here reads the local fields). Old browser: device time.
let milan;
function milanNow() {
  const d = new Date();
  try {
    milan = milan || new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hourCycle: "h23",
      year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    const p = {};
    for (const x of milan.formatToParts(d)) p[x.type] = +x.value;
    return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  } catch (e) { return d; }
}

// Recompute every minute (and on returning to the tab)
function useNow() {
  const [, setN] = React.useState(0);
  React.useEffect(() => {
    const tick = () => { if (!document.hidden) setN(n => n + 1); };
    const id = setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, []);
  return milanNow();
}

export function InfoCard({ I, onOpen }) {
  const { lang } = useLanguage();
  const now = useNow();
  const today = iso(now);
  const A = I ? evaluate(I, lang, today) : null;
  const st = A && A.status(now);
  const active = A && A.closedOn(today);
  const soonLimit = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21, 12));
  const soon = A && A.closures.find(c => c !== active && c.to >= today && c.from <= soonLimit);
  const show = !!A && !!(st || soon || A.closures.some(c => c.to >= today) || A.notice || A.hasContact);
  // Remember for the next visit whether a card comes (placeholder, head.js); the preview doesn't count
  React.useEffect(() => {
    if (!PREVIEW && store.get("dsm-info-card") !== (show ? "1" : "0")) store.set("dsm-info-card", show ? "1" : "0");
  }, [show]);
  if (!show) return <section className="wrap info" id="info" hidden />;
  const Chev = <Chevron className="go group-hover:translate-x-0.5 group-hover:text-foreground" />;
  return (
    <section className="wrap info pb-4 sm:pb-6" id="info">
      {/* No aria-label: screen readers read the status themselves, the hint about the dialog follows invisibly */}
      <button type="button" className="info-card card group grid w-full p-0 text-left transition-transform duration-(--t-fast) ease-dsm active:scale-[.99]" aria-haspopup="dialog" onClick={onOpen}>
        {st ? (
          <Line><i className={cn("dot", st.k !== "open" && st.k)} /><Text b={st.t} small={st.sub} />{Chev}</Line>
        ) : (
          <Line><Text b={t(A.hasWeek ? "infoT" : A.closures.some(c => c.to >= today) || A.notice ? "closuresT" : "contactT")} />{Chev}</Line>
        )}
        {soon ? <Line><i className={cn("bar-c", soon.type === "absent" && "absent", soon.type === "special" && "special")} /><Text b={A.label(soon)} small={soon.type === "special" ? A.specialText(soon) : A.closedText(soon)} /></Line> : null}
        <span className="sr-only">{t("infoOpen")}</span>
      </button>
    </section>
  );
}
const Line = ({ children }) => <span className="info-line flex min-w-0 items-center gap-3 border-t border-border px-4 py-3 first:border-t-0">{children}</span>;
const Text = ({ b, small }) => (
  <span className="tx min-w-0 flex-1">
    <b className="block font-medium">{b}</b>
    {small ? <small className="block text-s text-muted-foreground">{small}</small> : null}
  </span>
);

// Dialog with all hours and closing days
export function InfoDialog({ I, open, onOpenChange }) {
  const { lang } = useLanguage();
  const now = useNow();
  const swipeRef = useSwipe(".scrim.swipe", () => onOpenChange(false));
  if (!I) return null;
  const today = iso(now), A = evaluate(I, lang, today), tk = keyOf(now);
  const shown = DAYS.filter((k, n) => n < 5 || A.dayRanges(k).length);
  const fut = A.closures.filter(c => c.to >= today).slice(0, 10);
  const { email, phone, text } = A.contact;
  const link = "inline-block py-1 font-medium text-foreground [text-decoration:none]";
  const cell = "m-0 border-t border-border py-2 tabular-nums";
  return (
    <GlassDialog open={open} onOpenChange={onOpenChange} name="Opening hours" titleId="info-t" className="info-dialog swipe" overlayClassName="swipe">
      <div className="pane" ref={swipeRef}>
        <DialogTitle id="info-t">{t("infoT")}</DialogTitle>
        {A.notice ? <p className="hint m-0">{A.notice}</p> : null}
        {A.hasWeek ? (
          <section>
            <dl className="week m-0 grid grid-cols-[max-content_1fr]">
              {shown.map(k => {
                const rs = A.dayRanges(k), isToday = k === tk;
                return (
                  <React.Fragment key={k}>
                    <dt className={cn(cell, "pr-5 text-muted-foreground", isToday && "today font-medium text-foreground")}>{t("wd_" + k)}</dt>
                    <dd className={cn(cell, isToday && "today font-medium", !rs.length && "closed text-muted-foreground")}>{rs.length ? rs.map(span).join(", ") : t("closed")}</dd>
                  </React.Fragment>
                );
              })}
            </dl>
          </section>
        ) : null}
        <Section title={t(fut.some(c => c.type === "special") ? "closuresSpT" : "closuresT")}>
          {fut.length ? (
            <ul className="closures m-0 grid list-none gap-2 p-0">
              {fut.map((c, n) => (
                <li key={n} className="flex gap-3 rounded-2xl px-4 py-3 [background:var(--gb-bot)] shadow-[inset_0_0_0_1px_var(--line)]">
                  <i className={cn("bar-c", c.type === "absent" && "absent", c.type === "special" && "special")} />
                  <span className="grid min-w-0 gap-0.5">
                    <b className="font-medium">{A.label(c)}</b>
                    <small className="text-s text-muted-foreground tabular-nums">{c.type === "special" ? A.specialText(c) : A.rangeText(c)} · {t(c.type === "absent" ? "typeAbsent" : c.type === "special" ? "typeSpecial" : "typeHoliday")}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="note m-0 text-s text-muted-foreground">{t("noClosures")}</p>}
        </Section>
        {A.hasContact ? (
          <Section title={t("contactT")} id="info-contact">
            {text ? <p className="m-0 whitespace-pre-line">{text}</p> : null}
            {email ? (/^[^\s@]+@[^\s@]+$/.test(email) ? <a className={link} href={"mailto:" + email}>{email}</a> : <span>{email}</span>) : null}
            {phone ? (/\d/.test(phone) ? <a className={link} href={"tel:" + phone.replace(/[^\d+]/g, "")}>{phone}</a> : <span>{phone}</span>) : null}
          </Section>
        ) : null}
      </div>
    </GlassDialog>
  );
}
