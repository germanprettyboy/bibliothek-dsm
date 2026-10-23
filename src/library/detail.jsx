/* Detail view of a book: cover (or placeholder), details, for recommendations "Why this book?".
   Tapping a real cover: the image flies via FLIP (transform only) into its own dialog in the center. */
import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { GlassDialog } from "@/components/glass-dialog";
import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { log } from "@/lib/storage";
import { C, reduced } from "@/lib/environment";
import { useSwipe } from "@/lib/swipe";
import { addStrings, useLanguage, t as tx } from "@/lib/language";
import { Cover } from "@/library/cover";
import { categoryName } from "@/library/categories";

addStrings({
  de: {
    coverZoom: "Cover vergrößern", coverBig: "Cover",
    publisher: "Verlag", year: "Jahr", isbn: "ISBN", category: "Kategorie", location: "Standort",
    coverEKZ: "Cover: ekz-Bibliotheksservice", coverOL: "Cover: Open Library", coverGB: "Cover: Google Books",
    why: "Warum dieses Buch?",
  },
  it: {
    coverZoom: "Ingrandisci copertina", coverBig: "Copertina",
    publisher: "Editore", year: "Anno", isbn: "ISBN", category: "Categoria", location: "Collocazione",
    coverEKZ: "Copertina: ekz-Bibliotheksservice", coverOL: "Copertina: Open Library", coverGB: "Copertina: Google Books",
    why: "Perché questo libro?",
  },
});

// Location texts come from the catalog in German ("Regal 3 Brett 2"): translate the two words for Italian
const shelf = (s, lang) => (lang === "it" ? s.replace(/\s+Brett\s+(\d+)/i, ", ripiano $1").replace(/\s+Regal\s+(\d+)/i, " scaffale $1") : s);
const lines = a => a.map((x, n) => <React.Fragment key={n}>{n ? <br /> : null}{x}</React.Fragment>);

export function Detail({ entry, onClose }) {
  const { lang, t } = useLanguage();
  // content stays while fading out
  const [last, setLast] = React.useState(entry);
  const [found, setFound] = React.useState(undefined);
  const [zoomable, setZoomable] = React.useState(false);
  const [zoom, setZoom] = React.useState(false);
  // Another book: forget the previous cover in this very render. Reset only in the effect, the new detail's
  // first render still had the old cover and "zoomable" (its image was hung into the new cover for a moment).
  if (entry && entry !== last) { setLast(entry); setFound(entry.b.i ? undefined : null); setZoomable(false); }
  const { b, rec } = last || {};
  const box = React.useRef(null);

  // Phone: the sheet flies in from below, swipe up = full screen, down = close (lib/swipe)
  const swipeRef = useSwipe(".scrim.detail", onClose);

  // Fetch the cover (with priority); discard older answers
  React.useEffect(() => {
    if (!entry) return undefined;
    const book = entry.b;
    let current = true;
    if (!book.i) { log("Cover", `"${book.t}": no ISBN, placeholder`); return undefined; }
    const t0 = performance.now();
    C().get(book).then(f => {
      if (!current) return;
      setFound(f || null);
      log("Cover", `"${book.t}": ` + (f ? `${tx(f.by).replace(/^[^:]*:\s*/, "")} · ${Math.round(performance.now() - t0)} ms` : "no cover found, placeholder"));
    });
    return () => { current = false; };
  }, [entry]);

  const txt = rec && (rec[lang] || rec.de);
  const details = b ? [
    ["publisher", b.p], ["year", b.y], ["isbn", b.i && lines(b.i)], ["category", b.c && categoryName(b.c, lang)],
    ["location", b.l && lines(b.l.map(s => shelf(s, lang)))],
  ].filter(x => x[1]) : [];
  const zoomOpen = () => { if (zoomable) setZoom(true); };

  return (
    <>
      <GlassDialog
        open={!!entry} onOpenChange={on => { if (!on) onClose(); }} name={b ? `Detail "${b.t}"` : "Detail"}
        id="detail" titleId="d-title" overlayClassName="detail"
      >
        {b ? (
          <div ref={swipeRef} className="inner relative z-[1] grid grid-cols-[112px_1fr] items-start gap-[18px] px-[max(20px,env(safe-area-inset-right,0px))] pt-3.5 pb-[calc(24px+env(safe-area-inset-bottom,0px))] sm:grid-cols-[150px_1fr] sm:gap-6 sm:p-7">
            {/* fixed height: the row must not depend on width % + aspect-ratio (WebKit sized it from the text
                only, so with a short title the cover ran into "Why this book?") */}
            <Cover
              ref={box} id="d-cover" title={b.t} isbn={!!b.i} found={found} onShown={() => setZoomable(true)}
              className={cn("h-[168px] sm:h-[225px]", zoomable && "zoomable", zoom && "lifted")}
              {...(zoomable ? { role: "button", tabIndex: 0, "aria-label": t("coverZoom") } : {})}
              onClick={zoomOpen}
              onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && zoomable) { e.preventDefault(); zoomOpen(); } }}
            />
            <div>
              <DialogTitle id="d-title" asChild><h3>{b.t}</h3></DialogTitle>
              <p className="mt-1 mb-0 text-muted-foreground [overflow-wrap:anywhere]" id="d-sub" hidden={!b.s}>{b.s || ""}</p>
              <p className="mt-2 mb-0 font-medium [overflow-wrap:anywhere]" id="d-by" hidden={!b.a}>{(b.a || []).join(", ")}</p>
            </div>
            <div className="teaser card col-span-full px-4 py-3.5" id="d-teaser" hidden={!txt}>
              <b className="mb-1 block text-s font-semibold">{t("why")}</b>
              <p className="m-0 leading-normal">{txt || ""}</p>
            </div>
            <dl className="col-span-full mt-1 mb-0 grid grid-cols-[max-content_1fr]" id="d-dl">
              {details.map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt className="m-0 border-t border-border pt-[11px] pr-4 pb-[9px] text-s text-muted-foreground">{t(k)}</dt>
                  <dd className="m-0 border-t border-border py-[9px] tabular-nums [overflow-wrap:anywhere]">{v}</dd>
                </React.Fragment>
              ))}
            </dl>
            <p className="src col-span-full m-0 text-s text-muted-foreground" id="d-src">{found ? t(found.by) : ""}</p>
          </div>
        ) : null}
      </GlassDialog>
      <Zoom open={zoom} box={box} onClosed={() => setZoom(false)} />
    </>
  );
}

// ---------- Large cover ----------
// Tapping lifts the cover out of the detail and pulls it large into the center (FLIP, transform only).
// Open Library covers are reloaded in size "L" (one image, only on request). Tap/Escape puts it back.
function Zoom({ open, box, onClosed }) {
  const { t } = useLanguage();
  const img = React.useRef(null), anim = React.useRef(null), zMax = React.useRef(432);
  const [closing, setClosing] = React.useState(false);
  const reason = React.useRef("Escape"); // reason for closing via Radix (Escape or click beside the image)
  const snap = () => getComputedStyle(document.documentElement).getPropertyValue("--snap").trim() || "ease-out";

  // Target: as large as possible, aspect ratio like .cover (2:3), at most 27rem wide
  // (small Google images without a larger version only a good two and a half times as large, otherwise blurry)
  const place = () => {
    const w = Math.min(innerWidth - 32, (innerHeight - 64) * 2 / 3, zMax.current), h = w * 1.5;
    Object.assign(img.current.style, { left: (innerWidth - w) / 2 + "px", top: (innerHeight - h) / 2 + "px", width: w + "px", height: h + "px" });
  };
  // transform that lays the large image exactly onto the small cover
  const onCover = () => {
    const a = box.current.getBoundingClientRect(), z = img.current;
    return `translate(${a.left - z.offsetLeft}px, ${a.top - z.offsetTop}px) scale(${a.width / z.offsetWidth})`;
  };
  // On opening (image is in the dialog): determine the size, grow from the small cover, load "L" if available
  const growIn = React.useCallback(el => {
    img.current = el;
    if (!el) return;
    const small = box.current && box.current.querySelector("img.in");
    if (!small) return;
    const big = small.src.replace(/-M\.jpg$/, "-L.jpg");
    zMax.current = big !== small.src ? 432 : Math.min(432, Math.max(240, small.naturalWidth * 2.5));
    el.src = small.src;
    place();
    anim.current = reduced.matches ? null : el.animate([{ transform: onCover() }, { transform: "none" }], { duration: 240, easing: snap() });
    if (big === small.src) return;
    const hi = new Image();
    hi.referrerPolicy = "no-referrer"; hi.src = big;
    hi.decode().then(() => { if (img.current === el && hi.naturalWidth > 1 && el.src === small.src) el.src = big; }, () => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!open) return undefined;
    const r = () => { if (!closing) place(); };
    addEventListener("resize", r);
    return () => removeEventListener("resize", r);
  }, [open, closing]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = why => {
    if (!open || closing) return;
    const done = () => { setClosing(false); onClosed(); log("Dialog", `large cover closed (${why})`); };
    if (reduced.matches || !img.current) return done();
    setClosing(true);
    const z = img.current, from = getComputedStyle(z).transform; // in the middle of growing: back from there
    if (anim.current) anim.current.cancel();
    anim.current = z.animate([{ transform: from }, { transform: onCover() }], { duration: 180, easing: snap(), fill: "forwards" });
    anim.current.onfinish = done;
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={on => { if (!on) close(reason.current); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn("scrim fixed inset-0 z-[60]", closing && "closing")} />
        <DialogPrimitive.Content
          className="zoom" id="zoom" aria-label={t("coverBig")} aria-describedby={undefined}
          onEscapeKeyDown={() => { reason.current = "Escape"; }}
          onPointerDownOutside={() => { reason.current = "click beside"; }}
          onCloseAutoFocus={e => { e.preventDefault(); if (box.current) box.current.focus({ preventScroll: true }); }}
        >
          <DialogPrimitive.Title className="sr-only">{t("coverBig")}</DialogPrimitive.Title>
          <button type="button" className="zoom-btn" aria-label={t("close")} onClick={() => close("tap")}>
            <img ref={growIn} alt="" referrerPolicy="no-referrer" />
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
