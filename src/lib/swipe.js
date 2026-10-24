/* Swipeable phone sheet (every dialog: book detail, settings, categories, questions, opening hours, archive): flies in
   from below, stands half-high, swipe up = as high as the content (at most full screen), swipe down = close. Content that
   fits half-high gets only that one stage (like an iOS sheet sized to its content): upwards it resists like a rubber band
   and springs back, never showing empty glass. The finger leads 1:1, on release the velocity decides; the movement
   afterwards is a spring (WAAPI, transform only). The background scrim fades with the finger.
   Content taller than the screen: a swipe up that runs past the highest stage scrolls the content on in the same gesture,
   and a fast one hands its remaining momentum to the content – the sheet never stops the motion halfway (not when
   dragging by the head: grabber and title only move the sheet).
   From 40rem (centered dialog) and with reduced motion none of this applies. Only with a touch screen: in a slim desktop
   window the mouse can't drag, and a half-high sheet with hidden overflow would cut off its content (styles.css keeps the
   plain bottom sheet there, it scrolls with the wheel). */
import * as React from "react";
import { log } from "@/lib/storage";
import { reduced } from "@/lib/environment";

const phone = matchMedia("(max-width: 39.999rem) and (pointer: coarse)"); // same query as the sheet block in styles.css
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// Spring as CSS linear(): slight overshoot (about 5 %), in ~24 points
const spring = (() => {
  if (!(window.CSS && CSS.supports && CSS.supports("animation-timing-function", "linear(0, 1)"))) return "cubic-bezier(.2, .8, .2, 1)";
  const zeta = .62, w = 2 * Math.PI * 1.6, wd = w * Math.sqrt(1 - zeta * zeta), n = 24, points = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n * 1.1; // 1.1 s of model time squeezed onto 0..1
    const e = Math.exp(-zeta * w * t);
    points.push((1 - e * (Math.cos(wd * t) + zeta * w / wd * Math.sin(wd * t))).toFixed(4));
  }
  points[n] = "1";
  return `linear(${points.join(", ")})`;
})();

export function swipe(sheet, inner, scrimSel) {
  if (!phone.matches) return () => {};
  const scrim = () => document.querySelector(scrimSel);
  // top = highest stage (content-high, 0 = full screen), half = resting stage; fit = only one stage
  let H = 0, top = 0, half = 0, fit = false, target = "half", y = 0, anim = null, glide = 0;

  const setY = (value, withScrim = true) => {
    y = value;
    sheet.style.transform = `translateY(${value}px)`;
    if (!withScrim) return;
    const s = scrim();
    // the scrim stays full down to the half position, then fades out with the finger
    if (s) s.style.opacity = String(clamp(1 - (value - half) / Math.max(1, H - half), 0, 1));
  };
  const measure = () => {
    H = sheet.offsetHeight;
    const content = Math.ceil(inner.scrollHeight) + 14; // + grabber (4 px + 10 px spacing)
    // visible height when half-high: the content, at most 80 % of the sheet; up at most the content
    top = Math.max(0, H - content);
    half = H - Math.min(content, H * .8);
    fit = half - top < 1;
    if (fit) { top = half; sheet.dataset.fit = "1"; } else delete sheet.dataset.fit;
  };
  const position = () => (target === "full" ? top : half);
  // Beyond the highest stage: rubber band (iOS formula), the further the finger, the stiffer
  const rubber = over => (1 - 1 / (over * .55 / H + 1)) * H;
  const mode = () => {
    sheet.dataset.stage = target;
    inner.style.overflowY = target === "full" ? "auto" : "hidden";
  };

  // Animate to a position (or away); v in px/ms (positive = downwards)
  const move = (to, v = 0) => {
    const from = y, away = to === "close";
    const end = away ? H : to === "full" ? top : half;
    if (anim) anim.cancel();
    if (reduced.matches) { setY(end); if (away) scrim() && (scrim().style.opacity = "0"); return Promise.resolve(); }
    const s = scrim();
    const dist = Math.abs(end - from);
    const duration = away ? clamp(dist / Math.max(.9, Math.abs(v)), 140, 260) : clamp(300 + dist * .35, 300, 520);
    anim = sheet.animate(
      [{ transform: `translateY(${from}px)` }, { transform: `translateY(${end}px)` }],
      { duration, easing: away ? "cubic-bezier(.3, 0, .8, .6)" : spring, fill: "forwards" },
    );
    const a = anim;
    if (s) s.animate([{ opacity: s.style.opacity || "1" }, { opacity: away ? "0" : "1" }], { duration, easing: "ease-out", fill: "forwards" })
      .finished.then(() => { if (!away) s.style.opacity = ""; }, () => {});
    return a.finished.then(() => { setY(end, false); a.cancel(); if (anim === a) anim = null; }, () => {});
  };

  // Momentum of the content after the sheet has reached the top: decays like iOS scrolling (0.998 per ms, total way
  // ≈ v · 500 ms). Stops at the content's ends, on the next touch and as soon as something else scrolls the content.
  const stopGlide = () => { cancelAnimationFrame(glide); glide = 0; };
  const coast = v => {
    stopGlide();
    if (reduced.matches || Math.abs(v) < .05) return;
    let pos = inner.scrollTop, last = performance.now();
    const frame = now => {
      const dt = Math.min(50, now - last), max = inner.scrollHeight - inner.clientHeight;
      last = now;
      if (Math.abs(inner.scrollTop - pos) > 2) { glide = 0; return; }
      pos = clamp(pos + v * dt, 0, max);
      inner.scrollTop = pos;
      v *= Math.pow(.998, dt);
      glide = Math.abs(v) < .02 || pos <= 0 || pos >= max ? 0 : requestAnimationFrame(frame);
    };
    glide = requestAnimationFrame(frame);
  };

  const open = () => {
    measure(); target = "half"; mode();
    if (reduced.matches) { setY(half); return; }
    sheet.style.transform = `translateY(${H}px)`; y = H;
    move("half", 0);
  };

  // ---------- Finger ----------
  let t0 = null; // {x, y, y0, samples, take, head}
  const start = e => {
    stopGlide();
    if (e.touches.length !== 1 || anim && target === "close") return;
    if (anim) { y = new DOMMatrix(getComputedStyle(sheet).transform).m42; anim.cancel(); anim = null; setY(y); }
    const f = e.touches[0], top = sheet.getBoundingClientRect().top;
    t0 = { x: f.clientX, y: f.clientY, y0: y, s0: inner.scrollTop, samples: [[performance.now(), f.clientY]], take: null, head: f.clientY - top < 64, over: 0 };
  };
  const drag = e => {
    if (!t0) return;
    const f = e.touches[0], dy = f.clientY - t0.y, dx = f.clientX - t0.x;
    if (t0.take === null) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      // Vertical intent? In full screen, upwards / with scrolled content the content itself scrolls (if it can)
      const vertical = Math.abs(dy) > Math.abs(dx);
      const scrollable = inner.scrollHeight > inner.clientHeight + 1;
      const contentScrolls = target === "full" && scrollable && !t0.head && (dy < 0 || inner.scrollTop > 0);
      t0.take = vertical && !contentScrolls;
      t0.pass = scrollable && !fit && !t0.head; // past the highest stage the content takes over
      if (t0.take) { sheet.classList.add("dragging"); log("Swipe", "detail: finger leads"); }
    }
    if (!t0.take) return;
    if (e.cancelable) e.preventDefault();
    let ny = t0.y0 + dy;
    if (ny < top) {
      // beyond the highest stage: the content scrolls on, if it can't: rubber band
      if (t0.pass) { t0.over = top - ny; inner.scrollTop = t0.s0 + t0.over; ny = top; } else ny = top - rubber(top - ny);
    } else if (t0.over) { t0.over = 0; inner.scrollTop = t0.s0; }
    setY(ny);
    const now = performance.now();
    t0.samples.push([now, f.clientY]);
    while (t0.samples.length > 2 && now - t0.samples[0][0] > 100) t0.samples.shift();
  };
  const end = () => {
    const g = t0; t0 = null;
    sheet.classList.remove("dragging");
    if (!g || !g.take) return;
    const [z0, p0] = g.samples[0], [z1, p1] = g.samples[g.samples.length - 1];
    const v = z1 > z0 ? (p1 - p0) / (z1 - z0) : 0; // px/ms
    if (g.over) {
      // the content took over: it keeps the momentum, the sheet stays at the top
      log("Swipe", `detail: full, content scrolls on (v ${v.toFixed(2)} px/ms)`);
      target = "full"; mode(); coast(-v);
      return;
    }
    const forecast = y + v * 220;
    // nearest position to the forecast: top, half, close (close only clearly below half)
    const positions = [["full", top], ["half", half], ["close", half + (H - half) * .55]];
    let choice = "half", best = Infinity;
    for (const [n, p] of positions) { const d = Math.abs(forecast - p); if (d < best) { best = d; choice = n; } }
    if (v < -.45) choice = "full";                         // fast swipe upwards
    else if (v > .6) choice = target === "full" && y < top + (half - top) * .5 ? "half" : "close"; // fast downwards: from the top only to half first
    if (fit && choice === "full") choice = "half";       // only one stage: spring back
    log("Swipe", `detail: ${choice} (v ${v.toFixed(2)} px/ms)`);
    if (choice === "close") {
      target = "close";
      move("close", v).then(() => {
        // Radix' own closing animations would start again from full opacity / position (short flash on iOS): switch them off
        sheet.dataset.gone = "1"; const s = scrim(); if (s) { s.dataset.gone = "1"; s.style.opacity = "0"; }
        sheet.dispatchEvent(new CustomEvent("swipe-close"));
      });
      return;
    }
    target = choice; mode();
    move(choice, v);
    // fast swipe up: what the momentum carries beyond the way to the top scrolls the content
    if (choice === "full" && g.pass && v < 0) { const rest = -v * 500 - (y - top); if (rest > 0) coast(rest / 500); }
  };

  // Content changes its height (e.g. the next step of the questions): glide to the new position
  const ro = new ResizeObserver(() => {
    if (t0 || anim || target === "close") return;
    measure();
    if (fit && target === "full") { target = "half"; mode(); }
    if (Math.abs(position() - y) > 2 && !reduced.matches) move(target);
    else setY(position(), false);
  });
  ro.observe(inner);
  addEventListener("resize", resize);
  function resize() { if (!t0 && !anim && target !== "close") { measure(); setY(position(), false); } }

  // Keyboard for a search field: the sheet needs the room, so it goes to full screen
  const focusin = e => {
    if (!e.target.matches || !e.target.matches("input, textarea") || target !== "half" || fit) return;
    target = "full"; mode(); move("full");
  };

  sheet.addEventListener("focusin", focusin);
  sheet.addEventListener("touchstart", start, { passive: true });
  sheet.addEventListener("touchmove", drag, { passive: false });
  sheet.addEventListener("touchend", end);
  sheet.addEventListener("touchcancel", end);
  open();

  return () => {
    ro.disconnect();
    removeEventListener("resize", resize);
    sheet.removeEventListener("focusin", focusin);
    sheet.removeEventListener("touchstart", start);
    sheet.removeEventListener("touchmove", drag);
    sheet.removeEventListener("touchend", end);
    sheet.removeEventListener("touchcancel", end);
    if (anim) anim.cancel();
    stopGlide();
    sheet.style.transform = ""; sheet.classList.remove("dragging"); delete sheet.dataset.stage; delete sheet.dataset.fit;
    inner.style.overflowY = "";
    const s = scrim(); if (s) s.style.opacity = "";
  };
}

// Hook: returns a ref callback for the scrolling content element (.inner / .pane) of a dialog;
// onClose is called after a swipe away
export function useSwipe(scrimSel, onClose) {
  const [el, setEl] = React.useState(null);
  const close = React.useRef(onClose);
  close.current = onClose;
  React.useEffect(() => {
    const sheet = el && el.closest(".sheet");
    if (!sheet) return undefined;
    const closed = () => close.current();
    sheet.addEventListener("swipe-close", closed);
    const off = swipe(sheet, el, scrimSel);
    return () => { sheet.removeEventListener("swipe-close", closed); off(); };
  }, [el, scrimSel]);
  return setEl;
}
