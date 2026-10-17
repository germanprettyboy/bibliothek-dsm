/* Cover mit gestaltetem Platzhalter (Titel, Farbbalken aus dem Titel abgeleitet). Das echte Bild (assets/covers.js)
   blendet darüber ein; bis es wirklich geladen ist, läuft das Lichtband (.loading). Scheitert es, bleibt der Platzhalter.
   found: undefined = wird noch gesucht, null = kein Cover, {src, by} = gefunden. */
import * as React from "react";

import { cn } from "@/lib/utils";
import { C } from "@/lib/umwelt";

const COLORS = ["--mauve", "--gelb", "--orange", "--blau", "--rot", "--gruen"];
const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.codePointAt(0)) >>> 0; return h; };

export const Cover = React.forwardRef(function Cover({ titel, isbn, found, small, className, style, onShown, ...props }, ref) {
  const box = React.useRef(null);
  const [zustand, setZustand] = React.useState("leer"); // leer | bild | fehler
  React.useImperativeHandle(ref, () => box.current);

  React.useEffect(() => {
    setZustand("leer");
    if (!found) return undefined;
    // schon vorgeladenes Element aus covers.js, sonst neu
    const img = C().img(found);
    img.alt = ""; img.referrerPolicy = "no-referrer";
    img.classList.remove("in");
    box.current.appendChild(img);
    let raf = 0;
    const show = () => { setZustand("bild"); raf = requestAnimationFrame(() => img.classList.add("in")); if (onShown) onShown(img); };
    const fail = () => { setZustand("fehler"); img.remove(); };
    if (img.complete) (img.naturalWidth ? show : fail)();
    else { img.onload = show; img.onerror = fail; }
    return () => { cancelAnimationFrame(raf); img.onload = img.onerror = null; img.remove(); };
  }, [found]); // eslint-disable-line react-hooks/exhaustive-deps

  const loading = !!isbn && (found === undefined || (!!found && zustand === "leer"));
  return (
    <div
      ref={box}
      className={cn("cover", small && "small", loading && "loading", className)}
      style={{ "--ph-c": `var(${COLORS[hash(titel) % COLORS.length]})`, ...style }}
      {...props}
    >
      <div className="ph"><b>{titel}</b><div className="rule" /></div>
    </div>
  );
});
