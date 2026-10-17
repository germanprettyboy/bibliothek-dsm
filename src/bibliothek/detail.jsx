/* Detailansicht eines Buches: Cover (bzw. Platzhalter), Angaben, bei Empfehlungen „Warum dieses Buch?“.
   Echtes Cover antippen: Bild fliegt per FLIP (nur transform) in ein eigenes Fenster in der Mitte. */
import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { Fenster } from "@/components/fenster";
import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { log } from "@/lib/speicher";
import { woerter, useSprache, t as tx } from "@/lib/sprache";
import { Cover } from "@/bibliothek/cover";

woerter({
  de: {
    coverZoom: "Cover vergrößern", coverBig: "Cover",
    verlag: "Verlag", jahr: "Jahr", isbn: "ISBN", kategorie: "Kategorie", standort: "Standort",
    coverEKZ: "Cover: ekz-Bibliotheksservice", coverOL: "Cover: Open Library", coverGB: "Cover: Google Books",
    why: "Warum dieses Buch?",
  },
  it: {
    coverZoom: "Ingrandisci copertina", coverBig: "Copertina",
    verlag: "Editore", jahr: "Anno", isbn: "ISBN", kategorie: "Categoria", standort: "Collocazione",
    coverEKZ: "Copertina: ekz-Bibliotheksservice", coverOL: "Copertina: Open Library", coverGB: "Copertina: Google Books",
    why: "Perché questo libro?",
  },
});

const C = () => window.DSMCovers;
const still = matchMedia("(prefers-reduced-motion: reduce)");
const shelf = (s, lang) => (lang === "it" ? s.replace(/\s+Brett\s+(\d+)/i, ", ripiano $1").replace(/\s+Regal\s+(\d+)/i, " scaffale $1") : s);
const cat = (k, lang) => (lang === "it" && window.DSM_KATEGORIEN_IT && window.DSM_KATEGORIEN_IT[k]) || k;
const zeilen = a => a.map((x, n) => <React.Fragment key={n}>{n ? <br /> : null}{x}</React.Fragment>);

export function Detail({ eintrag, onClose }) {
  const { lang, t } = useSprache();
  // Inhalt bleibt beim Ausblenden stehen
  const [zuletzt, setZuletzt] = React.useState(eintrag);
  if (eintrag && eintrag !== zuletzt) setZuletzt(eintrag);
  const { b, rec } = zuletzt || {};
  const [found, setFound] = React.useState(undefined);
  const [zoomable, setZoomable] = React.useState(false);
  const [zoom, setZoom] = React.useState(false);
  const box = React.useRef(null);

  // Cover holen (mit Vorrang); ältere Antworten verwerfen
  React.useEffect(() => {
    if (!eintrag) return undefined;
    const buch = eintrag.b;
    let aktuell = true;
    setZoomable(false);
    setFound(buch.i ? undefined : null);
    if (!buch.i) { log("Cover", `„${buch.t}“: keine ISBN, Platzhalter`); return undefined; }
    const t0 = performance.now();
    C().get(buch).then(f => {
      if (!aktuell) return;
      setFound(f || null);
      log("Cover", `„${buch.t}“: ` + (f ? `${tx(f.by).replace(/^[^:]*:\s*/, "")} · ${Math.round(performance.now() - t0)} ms` : "kein Cover gefunden, Platzhalter"));
    });
    return () => { aktuell = false; };
  }, [eintrag]);

  const txt = rec && (rec[lang] || rec.de);
  const angaben = b ? [
    ["verlag", b.v], ["jahr", b.j], ["isbn", b.i && zeilen(b.i)], ["kategorie", b.k && cat(b.k, lang)],
    ["standort", b.s && zeilen(b.s.map(s => shelf(s, lang)))],
  ].filter(x => x[1]) : [];
  const zoomAuf = () => { if (zoomable) setZoom(true); };

  return (
    <>
      <Fenster
        open={!!eintrag} onOpenChange={an => { if (!an) onClose(); }} name={b ? `Detail „${b.t}“` : "Detail"}
        id="detail" titleId="d-title" overlayClassName="detail"
      >
        {b ? (
          <div className="inner relative z-[1] grid grid-cols-[112px_1fr] items-start gap-[18px] px-[max(20px,env(safe-area-inset-right,0px))] pt-3.5 pb-[calc(24px+env(safe-area-inset-bottom,0px))] sm:grid-cols-[150px_1fr] sm:gap-6 sm:p-7">
            <Cover
              ref={box} id="d-cover" titel={b.t} isbn={!!b.i} found={found} onShown={() => setZoomable(true)}
              className={cn(zoomable && "zoomable", zoom && "lifted")}
              {...(zoomable ? { role: "button", tabIndex: 0, "aria-label": t("coverZoom") } : {})}
              onClick={zoomAuf}
              onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && zoomable) { e.preventDefault(); zoomAuf(); } }}
            />
            <div>
              <DialogTitle id="d-title" asChild><h3>{b.t}</h3></DialogTitle>
              <p className="mt-1 mb-0 text-muted-foreground [overflow-wrap:anywhere]" id="d-sub" hidden={!b.u}>{b.u || ""}</p>
              <p className="mt-2 mb-0 font-medium [overflow-wrap:anywhere]" id="d-by" hidden={!b.a}>{(b.a || []).join(", ")}</p>
            </div>
            <div className="teaser karte col-span-full px-4 py-3.5" id="d-teaser" hidden={!txt}>
              <b className="mb-1 block text-s font-semibold">{t("why")}</b>
              <p className="m-0 leading-normal">{txt || ""}</p>
            </div>
            <dl className="col-span-full mt-1 mb-0 grid grid-cols-[max-content_1fr]" id="d-dl">
              {angaben.map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt className="m-0 border-t border-border pt-[11px] pr-4 pb-[9px] text-s text-muted-foreground">{t(k)}</dt>
                  <dd className="m-0 border-t border-border py-[9px] tabular-nums [overflow-wrap:anywhere]">{v}</dd>
                </React.Fragment>
              ))}
            </dl>
            <p className="src col-span-full m-0 text-s text-muted-foreground" id="d-src">{found ? t(found.by) : ""}</p>
          </div>
        ) : null}
      </Fenster>
      <Zoom open={zoom} box={box} onClosed={() => setZoom(false)} />
    </>
  );
}

// ---------- Cover groß ----------
// Antippen hebt das Cover aus dem Detail und zieht es groß in die Mitte (FLIP, nur transform).
// Open-Library-Cover kommen dabei in Größe „L“ nach (ein Bild, nur auf Wunsch). Antippen/Escape legt es zurück.
function Zoom({ open, box, onClosed }) {
  const { t } = useSprache();
  const img = React.useRef(null), anim = React.useRef(null), zMax = React.useRef(432);
  const [closing, setClosing] = React.useState(false);
  const snap = () => getComputedStyle(document.documentElement).getPropertyValue("--snap").trim() || "ease-out";

  // Ziel: so groß wie möglich, Seitenverhältnis wie .cover (2:3), höchstens 27rem breit
  // (kleine Google-Bilder ohne größere Fassung nur gut doppelt so groß, sonst unscharf)
  const place = () => {
    const w = Math.min(innerWidth - 32, (innerHeight - 64) * 2 / 3, zMax.current), h = w * 1.5;
    Object.assign(img.current.style, { left: (innerWidth - w) / 2 + "px", top: (innerHeight - h) / 2 + "px", width: w + "px", height: h + "px" });
  };
  // transform, der das große Bild genau auf das kleine Cover legt
  const onCover = () => {
    const a = box.current.getBoundingClientRect(), z = img.current;
    return `translate(${a.left - z.offsetLeft}px, ${a.top - z.offsetTop}px) scale(${a.width / z.offsetWidth})`;
  };
  // Beim Öffnen (Bild steht im Fenster): Größe bestimmen, vom kleinen Cover aus aufziehen, ggf. „L“ nachladen
  const aufziehen = React.useCallback(el => {
    img.current = el;
    if (!el) return;
    const klein = box.current && box.current.querySelector("img.in");
    if (!klein) return;
    const big = klein.src.replace(/-M\.jpg$/, "-L.jpg");
    zMax.current = big !== klein.src ? 432 : Math.min(432, Math.max(240, klein.naturalWidth * 2.5));
    el.src = klein.src;
    place();
    anim.current = still.matches ? null : el.animate([{ transform: onCover() }, { transform: "none" }], { duration: 240, easing: snap() });
    if (big === klein.src) return;
    const hi = new Image();
    hi.referrerPolicy = "no-referrer"; hi.src = big;
    hi.decode().then(() => { if (img.current === el && hi.naturalWidth > 1 && el.src === klein.src) el.src = big; }, () => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!open) return undefined;
    const r = () => { if (!closing) place(); };
    addEventListener("resize", r);
    return () => removeEventListener("resize", r);
  }, [open, closing]); // eslint-disable-line react-hooks/exhaustive-deps

  const zu = why => {
    if (!open || closing) return;
    const done = () => { setClosing(false); onClosed(); log("Fenster", `Cover groß geschlossen (${why})`); };
    if (still.matches || !img.current) return done();
    setClosing(true);
    const z = img.current, from = getComputedStyle(z).transform; // mitten im Aufziehen: von dort zurück
    if (anim.current) anim.current.cancel();
    anim.current = z.animate([{ transform: from }, { transform: onCover() }], { duration: 180, easing: snap(), fill: "forwards" });
    anim.current.onfinish = done;
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={an => { if (!an) zu("Escape"); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn("schleier fixed inset-0 z-[60]", closing && "closing")} />
        <DialogPrimitive.Content
          className="zoom" id="zoom" aria-label={t("coverBig")} aria-describedby={undefined}
          onCloseAutoFocus={e => { e.preventDefault(); if (box.current) box.current.focus({ preventScroll: true }); }}
        >
          <DialogPrimitive.Title className="sr-only">{t("coverBig")}</DialogPrimitive.Title>
          <button type="button" className="zoom-btn" aria-label={t("close")} onClick={() => zu("Antippen")}>
            <img ref={aufziehen} alt="" referrerPolicy="no-referrer" />
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
