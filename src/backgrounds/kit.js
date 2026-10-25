/* Drawing kit of the 500 extra backgrounds (assets/backgrounds.js). Every variant is one object:
     { id, topic, kind: "still" | "motion" | "touch", color, de: [name, text], it: [name, text], init?(E, c), draw(c, s, E) }
   The engine (library/backdrop.jsx) calls init once per size and draw per frame on a cleared canvas, exactly as for the
   15 built-in variants: E = { w, h, P, ptr, t, dt, still, sy }; draw returns true = sleep until the pointer moves,
   a number = sleep that many ms. P = colors from the tokens: fg, bg, muted, line, surface, c.{mauve, yellow, orange,
   blue, red, green}, logo (the six as a list), dark, fx (strength of the drawing). Never other colors. */

export const TAU = Math.PI * 2;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const mod = (x, m) => ((x % m) + m) % m;
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = k => 1 - (1 - k) ** 3;
// Seeded random numbers (still variants look the same on every visit)
export const rnd = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const R = Math.random;
export const font = (w, px) => `${w} ${px}px "Fira Sans", system-ui, sans-serif`;
export const many = (n, f) => Array.from({ length: n }, (_, i) => f(i));
// Number of objects for the window size: one per `area` px², at least lo, at most hi
export const dens = (E, area, lo, hi) => clamp(Math.round(E.w * E.h / area), lo, hi);
export const wrap = (v, m, pad = 0) => mod(v + pad, m + 2 * pad) - pad;

// Smooth 2D value noise, 0..1
const PERM = (() => { const r = rnd(1234), p = many(256, i => i); for (let i = 255; i > 0; i--) { const j = r() * (i + 1) | 0; [p[i], p[j]] = [p[j], p[i]]; } return p.concat(p); })();
const VAL = many(256, i => rnd(i + 99)());
const sm = k => k * k * (3 - 2 * k);
export function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
  const v = (a, b) => VAL[PERM[(PERM[a & 255] + b) & 255]];
  return lerp(lerp(v(xi, yi), v(xi + 1, yi), xf), lerp(v(xi, yi + 1), v(xi + 1, yi + 1), xf), yf);
}
export const fbm = (x, y) => noise(x, y) * .55 + noise(x * 2.1, y * 2.1) * .3 + noise(x * 4.3, y * 4.3) * .15;

// Alpha and color
export const A = (c, a, P) => { c.globalAlpha = clamp(a, 0, 1) * P.fx; };
export const L = (P, i) => P.logo[mod(Math.floor(i), 6)];
// The same color fully transparent: canvas gradients towards "transparent" (= transparent black) turn gray halfway
export const clear = col => /^#[0-9a-f]{6}$/i.test(col) ? `rgba(${parseInt(col.slice(1, 3), 16)}, ${parseInt(col.slice(3, 5), 16)}, ${parseInt(col.slice(5, 7), 16)}, 0)` : "rgba(0, 0, 0, 0)";
export function fill(c, P, color, a) { c.fillStyle = color; A(c, a, P); }
export function stroke(c, P, color, a, lw = 1) { c.strokeStyle = color; c.lineWidth = lw; A(c, a, P); }

// Shapes (paths: begin, no fill/stroke unless named so)
export function dot(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(r, .1), 0, TAU); c.fill(); }
export function ring(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(r, .1), 0, TAU); c.stroke(); }
export function seg(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
export function path(c, pts, close) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (close) c.closePath();
}
export function ngon(c, x, y, r, n, rot = 0) {
  c.beginPath();
  for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.closePath();
}
export function starPath(c, x, y, r1, r2, n, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = rot + i / n * Math.PI, r = i % 2 ? r2 : r1; i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.closePath();
}
export function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
// y = f(x) from x0 to x1 as one path
export function curve(c, f, x0, x1, step = 8) {
  c.beginPath();
  for (let x = x0; x <= x1 + step; x += step) { const y = f(x); x === x0 ? c.moveTo(x, y) : c.lineTo(x, y); }
}
// Parametric curve p(k), k = 0..1
export function param(c, p, n = 200) {
  c.beginPath();
  for (let i = 0; i <= n; i++) { const [x, y] = p(i / n); i ? c.lineTo(x, y) : c.moveTo(x, y); }
}
export function text(c, s, x, y, px, w = 600, align = "center") {
  c.font = font(w, px); c.textAlign = align; c.textBaseline = "middle"; c.fillText(s, x, y);
}
// Rotated, scaled drawing around (x, y)
export function at(c, x, y, rot, k, fn) { c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (k && k !== 1) c.scale(k, k); fn(); c.restore(); }

// Particles: n objects with x, y, z (depth .3–1), vx, vy, i, ph and whatever mk adds; step moves and wraps them
export const swarm = (E, n, mk = () => ({})) => many(n, i => ({ x: R() * E.w, y: R() * E.h, z: .3 + R() * .7, vx: (R() - .5) * .02, vy: (R() - .5) * .02, ph: R() * TAU, i, ...mk(i) }));
export function step(p, E, pad = 40) { p.x = wrap(p.x + p.vx * E.dt, E.w, pad); p.y = wrap(p.y + p.vy * E.dt, E.h, pad); }
// Pointer influence 0..1 within radius r (0 without a pointer or while still)
export function near(E, x, y, r) {
  if (!E.ptr.on || E.still) return 0;
  return Math.max(0, 1 - Math.hypot(E.ptr.x - x, E.ptr.y - y) / r);
}
// Grid of cells across the window
export function grid(E, s, fn, ox = 0, oy = 0) {
  for (let j = -1, y = oy - s; y < E.h + s; j++, y += s) for (let i = -1, x = ox - s; x < E.w + s; i++, x += s) fn(x, y, i, j);
}
// Eased follower: s.x/s.y move to the pointer, or to (fx, fy) without one; returns its strength 0..1 (s.f)
export function follow(s, E, fx, fy, ms = 120) {
  const on = E.ptr.on && !E.still, k = E.still ? 1 : Math.min(1, E.dt / ms);
  if (s.x === undefined) { s.x = fx; s.y = fy; s.f = 0; }
  s.x += ((on ? E.ptr.x : fx) - s.x) * k; s.y += ((on ? E.ptr.y : fy) - s.y) * k;
  s.f += ((on ? 1 : 0) - s.f) * k;
  return s.f;
}

export const def = (topic, list) => list.map(([id, kind, color, de, it, impl]) => ({ id: topic + "-" + id, topic, kind, color, de, it, ...impl }));
