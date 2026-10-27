/* Navigation bar of the admin page: one bar over the full content width that floats 12 px below the top edge while
   scrolling (sticky, subtle shadow; styles.css "Admin navigation"). Tabs with icons, a pill glides behind the active tab;
   then help and lock, separated by thin lines. All items 44 px high, icons 18 px.
   Labels open sideways; how many show depends on the room (data-fit, measured here):
     all    = every tab label; help and lock slide theirs out on hover/focus
     lead   = every tab label but the last tab's (Statistik); it, help and lock slide theirs out on hover/focus
     active = only the active tab's label; the other tabs, help and lock slide theirs out on hover/focus (like the lock)
     none   = phones: icons only, nothing slides out (no room; touch has no hover)
   The measure adds natural widths (paddings + icon + label text), not the current ones: it doesn't depend on the state
   it switches, so it can't flip back and forth. Test hooks: .tabs, [data-tab], #help-btn, #lock-btn, .adm-nav[data-fit]
   [data-active], .adm-pill. */
import "./strings-nav";
import * as React from "react";
import { ChartColumnIcon, CircleHelpIcon, DatabaseIcon, ImageIcon, InfoIcon, LockIcon, SparklesIcon, WrenchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language";

// Order of the tabs: [value, label key, icon]; data-tab and #tab-<value> are test hooks
export const TABS = [
  ["catalog", "tabCatalog", DatabaseIcon],
  ["care", "tabCare", WrenchIcon],
  ["covers", "tabCovers", ImageIcon],
  ["recs", "tabRecs", SparklesIcon],
  ["info", "tabInfo", InfoIcon],
  ["stats", "tabStats", ChartColumnIcon],
];

const ICON = { size: 18, strokeWidth: 1.8, "aria-hidden": "true" };
// Text that opens sideways (grid 0fr → 1fr); the innermost span keeps its natural width (measured below)
const Label = ({ children }) => <span className="adm-lbl"><span><span>{children}</span></span></span>;

const px = v => parseFloat(v) || 0;
// Natural width of an item without its label: paddings, borders, icon
function bare(el) {
  const s = getComputedStyle(el), svg = el.querySelector("svg");
  return px(s.paddingLeft) + px(s.paddingRight) + px(s.borderLeftWidth) + px(s.borderRightWidth) + (svg ? svg.getBoundingClientRect().width : 0);
}
const labelOf = el => { const l = el.querySelector(".adm-lbl > span > span"); return l ? l.offsetWidth : 0; };

// How many labels fit: "all" needs every tab label plus room for help/lock sliding out; "lead" every label but the last
// tab's plus room for the widest of it, help and lock sliding out; "active" the two widest labels (active tab + one
// sliding out); otherwise "none"
function fitOf(bar) {
  const s = getComputedStyle(bar);
  const room = bar.clientWidth - px(s.paddingLeft) - px(s.paddingRight);
  const kids = Array.from(bar.children);
  let fixed = px(s.columnGap) * (kids.length - 1);
  const tabs = [], acts = [];
  kids.forEach(k => {
    const ks = getComputedStyle(k);
    fixed += px(ks.marginLeft) + px(ks.marginRight);
    if (k.getAttribute("role") === "tablist") {
      const items = Array.from(k.querySelectorAll("[data-tab]"));
      fixed += px(ks.paddingLeft) + px(ks.paddingRight) + px(ks.columnGap) * (items.length - 1);
      items.forEach(i => { fixed += bare(i); tabs.push(labelOf(i)); });
    } else if (k.querySelector(".adm-lbl")) { fixed += bare(k); acts.push(labelOf(k)); }
    else fixed += k.offsetWidth;
  });
  const sum = tabs.reduce((a, b) => a + b, 0);
  const top = tabs.concat(acts).sort((a, b) => b - a);
  if (fixed + sum + Math.max(0, ...acts) + 2 <= room) return "all";
  const last = tabs[tabs.length - 1] || 0;
  if (fixed + sum - last + Math.max(last, ...acts) + 2 <= room) return "lead";
  if (fixed + top[0] + (top[1] || 0) + 2 <= room) return "active";
  return "none";
}

export function AdminNav({ tab, lock, onHelp }) {
  const { t } = useLanguage();
  const bar = React.useRef(null), pill = React.useRef(null);
  const [fit, setFit] = React.useState("active");

  // Pill behind the active tab: its real position (follows widths that are still opening, see the observer below)
  const place = () => {
    const b = bar.current, p = pill.current;
    const a = b && b.querySelector('[role="tablist"] [data-state="active"]');
    if (!a || !p) return;
    p.style.width = a.offsetWidth + "px";
    p.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  React.useLayoutEffect(place, [tab, fit]);

  // Measure on every size change of the bar, the items (labels opening, hover) and the label texts (language, font).
  // One frame later, outside the observer callback: changing the layout inside it would loop.
  React.useLayoutEffect(() => {
    const b = bar.current;
    let raf = 0;
    const run = () => { setFit(fitOf(b)); place(); };
    setFit(fitOf(b));
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(run); });
    ro.observe(b);
    b.querySelectorAll(".adm-item, .adm-lbl > span > span").forEach(e => ro.observe(e));
    // The pill glides only once it has its first place (not in from the left edge)
    const ready = requestAnimationFrame(() => b.setAttribute("data-ready", ""));
    return () => { ro.disconnect(); cancelAnimationFrame(raf); cancelAnimationFrame(ready); };
  }, []);

  // shrink: Button brings shrink-0. Phones: every item takes an equal share of the row, without side padding
  // (styles.css .adm-tabs flex 6), otherwise the bar is wider than the screen
  const item = "adm-item h-11 shrink rounded-lg px-[13px] font-medium text-m hover:text-foreground max-sm:flex-1 max-sm:px-0";
  return (
    <div ref={bar} className="adm-nav" data-fit={fit} data-active={tab}>
      <TabsList aria-label={t("navTabs")} className="tabs adm-tabs flex w-auto rounded-lg bg-transparent p-0 shadow-none">
        <span ref={pill} className="adm-pill" aria-hidden="true" />
        {TABS.map(([v, k, Icon], n) => (
          <TabsTrigger
            key={v} value={v} data-tab={v}
            className={`${item} adm-tab${n < TABS.length - 1 ? " adm-lead" : ""} data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none`}
          >
            <Icon {...ICON} /><Label>{t(k)}</Label>
          </TabsTrigger>
        ))}
      </TabsList>
      <span className="adm-vr" aria-hidden="true" />
      {/* Help and lock: icon only, the text slides out to the right on hover/focus */}
      <Button variant="ghost" id="help-btn" onClick={onHelp} aria-label={t("help")} className={`${item} adm-act gap-0`}>
        <CircleHelpIcon {...ICON} /><Label>{t("help")}</Label>
      </Button>
      <span className="adm-vr" aria-hidden="true" />
      <Button variant="ghost" id="lock-btn" onClick={lock} aria-label={t("lockAgain")} className={`${item} adm-act gap-0`}>
        <LockIcon {...ICON} /><Label>{t("lockAgain")}</Label>
      </Button>
    </div>
  );
}
