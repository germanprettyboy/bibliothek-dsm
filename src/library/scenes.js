/* The two interactive backgrounds (library/backdrop.jsx runs them): abstract, few elements, logo colors only as accents.
     dots  = Punkte: a grid of small dots whose size follows a slowly drifting landscape, like a halftone print. Under the
             pointer a lens pushes the dots apart, lets them grow and reveals the colors hidden in the landscape.
     lines = Linien: contour lines of the same kind of landscape. The pointer raises a hill (the lines gather around it)
             and lights the lines near it; every fourth line is a logo color, from blue in the valleys to mauve on the peaks.
   Both: a click or tap sends a ring wave out, scrolling moves the landscape along a little (parallax).
   init(S) → state (again on resize and density change); draw(c, S, st) paints one frame on a cleared canvas.
   S = { w, h, t: scene time (ms × tempo), now: real time, P: colors, k: strength (alpha factor), d: density 0..1,
         hue: -1 = all logo colors, 0..5 = one of HUES, sy: scroll offset px, lens: { x, y, a: presence 0..1 },
         waves: [{ x, y, t0, c }] }
   Budget whatever the screen size: at most ~6000 dots or ~9000 grid points (larger cells on big screens). */

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mod = (x, m) => ((x % m) + m) % m;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// "#rrggbb" → rgba() with alpha a (tokens are hex; anything else falls back to the text color of the light theme)
const rgba = (hex, a) => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex) || [0, "33", "33", "33"];
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${clamp(a, 0, 1)})`;
};

// Logo colors in the order of the color wheel: neighbors in the landscape blend well (mauve – red – orange – yellow …)
export const HUES = ["mauve", "red", "orange", "yellow", "green", "blue"];
export const PARALLAX = .12; // share of the scroll distance the landscape moves along
// Ring wave of a click or tap: speed px/ms, lifetime ms, at most this many at once
export const WAVE = { v: .42, life: 2600, max: 6 };

// ---------- 3D simplex noise (Gustavson), fixed seed: about -1..1 ----------
const GRAD = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];
const PERM = (() => {
  const q = Array.from({ length: 256 }, (_, i) => i), p = new Uint8Array(512);
  let s = 7;
  for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [q[i], q[j]] = [q[j], q[i]]; }
  for (let i = 0; i < 512; i++) p[i] = q[i & 255];
  return p;
})();
const G3 = 1 / 6;
function corner(x, y, z, h) {
  let t = .6 - x * x - y * y - z * z;
  if (t < 0) return 0;
  const g = (h % 12) * 3;
  t *= t;
  return t * t * (GRAD[g] * x + GRAD[g + 1] * y + GRAD[g + 2] * z);
}
export function noise(x, y, z) {
  const s = (x + y + z) / 3, i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
  const t = (i + j + k) * G3, x0 = x - i + t, y0 = y - j + t, z0 = z - k + t;
  let i1, j1, k1, i2, j2, k2;
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
  } else if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
  const ii = i & 255, jj = j & 255, kk = k & 255, P = PERM;
  return 32 * (corner(x0, y0, z0, P[ii + P[jj + P[kk]]])
    + corner(x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3, P[ii + i1 + P[jj + j1 + P[kk + k1]]])
    + corner(x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3, P[ii + i2 + P[jj + j2 + P[kk + k2]]])
    + corner(x0 - 1 + 3 * G3, y0 - 1 + 3 * G3, z0 - 1 + 3 * G3, P[ii + 1 + P[jj + 1 + P[kk + 1]]]));
}

// Hidden color landscape (dots): the angle of two slow noise fields, spread evenly over the six colors
const hueAt = (x, y, z) => (Math.floor((Math.atan2(noise(x / 700, y / 700, z), noise(x / 700 + 31, y / 700 - 17, z)) / TAU + .5) * 6) + 6) % 6;

// Strongest ring wave at x, y: ring.q 0..1 and its color ring.c
const ring = { q: 0, c: 0 };
function waveAt(S, x, y, width) {
  ring.q = 0;
  for (const w of S.waves) {
    const age = S.now - w.t0, band = Math.abs(Math.hypot(x - w.x, y - w.y) - age * WAVE.v);
    if (band >= width || age >= WAVE.life) continue;
    const q = (1 - band / width) * (1 - age / WAVE.life);
    if (q > ring.q) { ring.q = q; ring.c = w.c; }
  }
  return ring.q;
}

// ---------- Punkte ----------
export const dots = {
  init({ w, h, d }) {
    let g = 34 - 18 * d; // density: 34 px (sparse) … 16 px (dense) between the dots
    while ((w / g + 1) * (h / g + 2) > 6000) g *= 1.1;
    return { g };
  },
  draw(c, S, { g }) {
    const { w, h, P, k, lens } = S, shift = S.sy * PARALLAX, oy = mod(-shift, g);
    const nx = Math.ceil(w / g) + 1, ny = Math.ceil(h / g) + 2, x0 = (w - (nx - 1) * g) / 2;
    const R = clamp(Math.min(w, h) * .3, 110, 220), z = S.t * 6e-5, f = 1 / 260, base = g * .085;
    // 0 = neutral, then three strengths per color: one path each, filled once
    const paths = Array.from({ length: 19 }, () => new Path2D());
    for (let j = 0; j < ny; j++) {
      const gy = j * g + oy - g, wy = gy + shift;
      for (let i = 0; i < nx; i++) {
        let x = x0 + i * g, y = gy;
        const v = (noise(x * f, wy * f, z) + 1) / 2;
        let r = base * (.45 + 1.9 * v * v), acc = smooth(.7, .95, v) * .45, hue = -1;
        if (lens.a > .01) {
          const dx = x - lens.x, dy = y - lens.y, dist = Math.hypot(dx, dy);
          if (dist < R) {
            const q = (1 - dist / R) ** 2 * lens.a, push = q * g * .9 / (dist || 1);
            x += dx * push; y += dy * push; r *= 1 + 1.5 * q; acc = Math.max(acc, q * 1.1);
          }
        }
        if (S.waves.length && waveAt(S, x, y, 56) > 0) { r *= 1 + 2.4 * ring.q; if (ring.q > acc) { acc = ring.q; hue = ring.c; } }
        if (r < .35) continue;
        let b = 0;
        if (acc > .12) {
          if (hue < 0) hue = S.hue >= 0 ? S.hue : hueAt(x0 + i * g, wy, z * .5);
          b = 1 + hue * 3 + Math.min(2, acc * 3 | 0);
        }
        paths[b].moveTo(x + r, y); paths[b].arc(x, y, r, 0, TAU);
      }
    }
    c.fillStyle = P.fg; c.globalAlpha = clamp(.2 * k, 0, 1); c.fill(paths[0]);
    for (let b = 1; b < 19; b++) {
      c.fillStyle = P.logo[(b - 1) / 3 | 0]; c.globalAlpha = clamp((.4 + (b - 1) % 3 * .28) * k, 0, 1); c.fill(paths[b]);
    }
  },
};

// ---------- Linien ----------
// Marching squares: corners TL, TR, BR, BL as bits 8, 4, 2, 1 (above the level); edges 0 top, 1 right, 2 bottom,
// 3 left. 5 and 10 are saddles, decided by the middle of the cell.
const CASES = [[], [3, 2], [2, 1], [3, 1], [0, 1], null, [0, 2], [0, 3], [0, 3], [0, 2], null, [0, 1], [3, 1], [2, 1], [3, 2], []];
let ex = 0, ey = 0;
function edge(e, a, b, cc, d, L, x, y, s) {
  if (e === 0) { ex = x + s * (L - a) / (b - a); ey = y; } else if (e === 1) { ex = x + s; ey = y + s * (L - b) / (cc - b); } else if (e === 2) { ex = x + s * (L - d) / (cc - d); ey = y + s; } else { ex = x; ey = y + s * (L - a) / (d - a); }
}

export const lines = {
  init({ w, h }) {
    let s = 12;
    while ((w / s + 2) * (h / s + 3) > 9000) s *= 1.1;
    const nx = Math.ceil(w / s) + 1, ny = Math.ceil(h / s) + 2;
    return { s, nx, ny, v: new Float32Array(nx * ny) };
  },
  draw(c, S, { s, nx, ny, v }) {
    const { w, h, P, k, lens } = S, shift = S.sy * PARALLAX, oy = mod(-shift, s), z = S.t * 4e-5, f = 1 / 430;
    const R = clamp(Math.min(w, h) * .16, 80, 150);
    for (let j = 0; j < ny; j++) {
      const y = j * s + oy - s, wy = y + shift;
      for (let i = 0; i < nx; i++) {
        const x = i * s;
        let e = noise(x * f, wy * f, z) * .85 + noise(x * f * 2.3, wy * f * 2.3, z * 1.6 + 7.3) * .2;
        if (lens.a > .01) e += lens.a * Math.exp(-((x - lens.x) ** 2 + (y - lens.y) ** 2) / (R * R));
        if (S.waves.length) e += waveAt(S, x, y, 44) * .6;
        v[j * nx + i] = e;
      }
    }
    // density: 7 … 22 levels between -1.2 and 1.2 (the hill under the pointer reaches beyond 1)
    const n = Math.round(7 + 15 * S.d), step = 2.4 / n, lo = -1.2 + step / 2;
    const paths = Array.from({ length: n }, () => new Path2D());
    for (let j = 0; j < ny - 1; j++) {
      const y = j * s + oy - s;
      if (y > h) break;
      for (let i = 0; i < nx - 1; i++) {
        const o = j * nx + i, a = v[o], b = v[o + 1], cc = v[o + nx + 1], d = v[o + nx];
        const l0 = Math.max(0, Math.ceil((Math.min(a, b, cc, d) - lo) / step));
        const l1 = Math.min(n - 1, Math.floor((Math.max(a, b, cc, d) - lo) / step));
        const x = i * s;
        for (let l = l0; l <= l1; l++) {
          const L = lo + l * step, m = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (cc > L ? 2 : 0) | (d > L ? 1 : 0);
          let seg = CASES[m];
          if (!seg) {
            const mid = (a + b + cc + d) / 4 > L;
            seg = (m === 5) === mid ? [0, 3, 2, 1] : [0, 1, 3, 2];
          }
          const p = paths[l];
          for (let q = 0; q < seg.length; q += 2) {
            edge(seg[q], a, b, cc, d, L, x, y, s); p.moveTo(ex, ey);
            edge(seg[q + 1], a, b, cc, d, L, x, y, s); p.lineTo(ex, ey);
          }
        }
      }
    }
    // Near the pointer the lines are stronger: a radial gradient as the stroke, one per color
    const ink = {}, lit = lens.a > .01, accents = Math.ceil((n - 2) / 4);
    const style = (col, a) => {
      if (!lit) return rgba(col, a * k);
      if (!ink[col + a]) {
        const g = c.createRadialGradient(lens.x, lens.y, 0, lens.x, lens.y, R * 2.2);
        g.addColorStop(0, rgba(col, a * k * (1 + 1.8 * lens.a))); g.addColorStop(1, rgba(col, a * k));
        ink[col + a] = g;
      }
      return ink[col + a];
    };
    c.lineCap = "round"; c.globalAlpha = 1;
    for (let l = 0; l < n; l++) {
      const accent = l % 4 === 2;
      c.lineWidth = accent ? 1.6 : 1;
      // all colors: by height, blue in the valleys … mauve on the peaks
      c.strokeStyle = accent ? style(P.logo[S.hue >= 0 ? S.hue : 5 - Math.floor((l >> 2) * 6 / accents)], .6) : style(P.fg, .17);
      c.stroke(paths[l]);
    }
  },
};
