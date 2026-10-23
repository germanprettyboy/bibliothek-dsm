/* Cover with a designed placeholder (title, color bar derived from the title). The real image (assets/covers.js)
   fades in on top; until it has really loaded, the shimmer runs (.loading). If it fails, the placeholder stays.
   found: undefined = still searching, null = no cover, {src, by} = found. */
import * as React from "react";

import { cn } from "@/lib/utils";
import { C } from "@/lib/environment";

const COLORS = ["--mauve", "--yellow", "--orange", "--blue", "--red", "--green"];
const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.codePointAt(0)) >>> 0; return h; };

export const Cover = React.forwardRef(function Cover({ title, isbn, found, small, className, style, onShown, ...props }, ref) {
  const box = React.useRef(null);
  const [state, setState] = React.useState("empty"); // empty | image | failed
  React.useImperativeHandle(ref, () => box.current);

  React.useEffect(() => {
    setState("empty");
    if (!found) return undefined;
    // element already preloaded by covers.js, otherwise a new one
    const img = C().img(found);
    img.alt = ""; img.referrerPolicy = "no-referrer";
    img.classList.remove("in");
    box.current.appendChild(img);
    let raf = 0;
    // onShown only together with "in": a tap in between found no image to enlarge (empty large cover)
    const show = () => { setState("image"); raf = requestAnimationFrame(() => { img.classList.add("in"); if (onShown) onShown(img); }); };
    const fail = () => { setState("failed"); img.remove(); };
    if (img.complete) (img.naturalWidth ? show : fail)();
    else { img.onload = show; img.onerror = fail; }
    return () => { cancelAnimationFrame(raf); img.onload = img.onerror = null; img.remove(); };
  }, [found]); // eslint-disable-line react-hooks/exhaustive-deps

  const loading = !!isbn && (found === undefined || (!!found && state === "empty"));
  return (
    <div
      ref={box}
      className={cn("cover", small && "small", loading && "loading", className)}
      style={{ "--ph-c": `var(${COLORS[hash(title) % COLORS.length]})`, ...style }}
      {...props}
    >
      <div className="ph"><b>{title}</b><div className="rule" /></div>
    </div>
  );
});
