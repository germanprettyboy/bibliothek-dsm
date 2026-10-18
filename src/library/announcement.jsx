/* Announcement at the very top of the book list (info.js "announcement", maintained in admin.html). Floats in once the
   list has arrived (books.js parsing would stall the animation) and pushes the page down; × or Esc collapses it
   back up. Closed stays closed for this text (localStorage dsm-announce = hash of the texts): a new text shows
   again. Past "until" date = no banner. The preview (#preview) always shows it and remembers nothing. */
import * as React from "react";

import { AnnouncementBar } from "@/components/announcement";
import { cn } from "@/lib/utils";
import { store, log } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import { reduced } from "@/lib/environment";
import { PREVIEW } from "@/library/data";

const KEY = "dsm-announce";
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const p2 = n => (n < 10 ? "0" : "") + n;
const today = () => { const d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); };
// FNV-1a over both texts: the same announcement in either language counts as one
const idOf = a => { let h = 0x811c9dc5; for (const c of (a.de || "") + "|" + (a.it || "")) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0; return h.toString(36); };

export function announcementOf(I, lang) {
  const a = I && I.announcement;
  if (!a) return null;
  const text = String(a[lang] || a.de || a.it || "").trim();
  if (!text || (ISO.test(a.until || "") && a.until < today())) return null;
  return { text, color: a.color, id: idOf(a) };
}

export function Announcement({ I, ready }) {
  const { lang, t } = useLanguage();
  const a = announcementOf(I, lang);
  const [gone, setGone] = React.useState(() => !a || (!PREVIEW && store.get(KEY) === a.id));
  // Reduced motion: there from the start, no transition (styles.css)
  const [open, setOpen] = React.useState(reduced.matches);
  const box = React.useRef(null);

  // Float in after the list has arrived: first the collapsed state is painted, then it opens
  React.useEffect(() => {
    if (gone || open || !ready) return undefined;
    const id = setTimeout(() => setOpen(true), 300);
    return () => clearTimeout(id);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = React.useCallback(how => {
    if (!PREVIEW) store.set(KEY, a.id);
    log("announce", "closed", { how });
    // Keyboard focus on the ×: it would fall back to <body>, the search is the next sensible place
    // (not after a tap: the phone keyboard would pop up)
    const f = document.activeElement, keys = !!box.current && box.current.contains(f) && (how === "Escape" || f.matches(":focus-visible"));
    setOpen(false);
    setTimeout(() => {
      setGone(true);
      const q = document.getElementById("q");
      if (keys && q) q.focus({ preventScroll: true });
    }, reduced.matches ? 0 : 260);
  }, [a && a.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc on the computer – not while a dialog is open (it closes first) or inside a text field (Esc clears the search)
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = e => {
      if (e.key !== "Escape" || e.defaultPrevented || document.querySelector("[role=dialog]")) return;
      if (e.target && e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
      close("Escape");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (gone || !a) return null;
  return (
    <aside ref={box} className={cn("announce", open && "open")} id="announce" aria-label={t("annLabel")} inert={!open} data-log="own">
      <div>
        <AnnouncementBar text={a.text} color={a.color} closeLabel={t("annClose")} onClose={() => close("button")} />
      </div>
    </aside>
  );
}
