/* Experimental backgrounds (settings "Hintergrund"): 15 variants behind the book list, off by default (`dsm-bg`).
   Layer #bg (fixed, z-index -1, aria-hidden, no pointer events): in front of the body color, behind everything else.
   Under the content column the mask in styles.css lets only --fx-col of it through (the list stays readable), the
   search bar is transparent until it sticks. Three kinds:
     still  = drawn once (again on resize and theme change; "sky" every 5 minutes),
     motion = animated, at most 30 fps, 15 fps while a modal dialog blurs it,
     touch  = reacts to the pointer (click/tap, move); sleeps while nothing happens.
   Reduced motion (system or setting): every variant stands still, one frame, no pointer. High contrast, print: none.
   Hidden tab: no frames. Colors only from the tokens in styles.css, read again on every theme change.
   Test hooks: #bg[data-bg], <html data-bg>, #s-bg, #s-bgpick [data-bg]. */
import * as React from "react";

import { Section, Option } from "@/components/settings";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAppearance } from "@/lib/appearance";
import { reduced, systemReduced } from "@/lib/environment";
import { addStrings, useLanguage } from "@/lib/language";
import { store, log } from "@/lib/storage";

addStrings({
  de: {
    bgTitle: "Hintergrund", bgShow: "Gestalteter Hintergrund", bgShowH: "Experimentell – 15 Varianten zum Ausprobieren",
    bgContrast: "Bei hohem Kontrast ausgeschaltet", bgPick: "Hintergrund wählen", bgStill: "stehen still (Keine Animationen)",
    bgK_still: "Ruhig", bgK_motion: "Bewegt", bgK_touch: "Zum Anfassen",
    bg_notebook: "Schulheft", bgd_notebook: "Linien und roter Rand",
    bg_grid: "Karopapier", bgd_grid: "Kariert wie im Matheheft",
    bg_shelf: "Bücherregal", bgd_shelf: "Buchrücken in den Logofarben",
    bg_milan: "Mailand", bgd_milan: "Dom, Velasca, Pirellone und die Tram",
    bg_sky: "Himmel über Mailand", bgd_sky: "Farbe nach der Uhrzeit in Mailand",
    bg_mosaic: "Mosaik", bgd_mosaic: "Dreiecke in den Logofarben",
    bg_aurora: "Farbnebel", bgd_aurora: "Langsam ziehende Logofarben",
    bg_letters: "Buchstaben", bgd_letters: "A bis Z steigen auf",
    bg_words: "Zweisprachig", bgd_words: "Wörter auf Deutsch und Italienisch",
    bg_ribbons: "Lesebändchen", bgd_ribbons: "Sechs Bänder wehen am Rand",
    bg_pages: "Fliegende Seiten", bgd_pages: "Blätter schweben herab",
    bg_stars: "Sternbild", bgd_stars: "Punkte verbinden sich mit dem Zeiger",
    bg_ink: "Tinte", bgd_ink: "Tippen oder Klicken zieht Kreise",
    bg_lamp: "Leselampe", bgd_lamp: "Warmes Licht folgt dem Zeiger",
    bg_lens: "Punktlupe", bgd_lens: "Das Punktraster wächst unter dem Zeiger",
  },
  it: {
    bgTitle: "Sfondo", bgShow: "Sfondo decorativo", bgShowH: "Sperimentale – 15 varianti da provare",
    bgContrast: "Disattivato con contrasto elevato", bgPick: "Scegli lo sfondo", bgStill: "restano fermi (Nessuna animazione)",
    bgK_still: "Tranquilli", bgK_motion: "In movimento", bgK_touch: "Da toccare",
    bg_notebook: "Quaderno", bgd_notebook: "Righe e margine rosso",
    bg_grid: "Quadretti", bgd_grid: "Come il quaderno di matematica",
    bg_shelf: "Scaffale", bgd_shelf: "Dorsi nei colori del logo",
    bg_milan: "Milano", bgd_milan: "Duomo, Velasca, Pirellone e il tram",
    bg_sky: "Cielo di Milano", bgd_sky: "Colore secondo l'ora a Milano",
    bg_mosaic: "Mosaico", bgd_mosaic: "Triangoli nei colori del logo",
    bg_aurora: "Nebbia di colori", bgd_aurora: "Colori del logo che scorrono piano",
    bg_letters: "Lettere", bgd_letters: "Dalla A alla Z salgono",
    bg_words: "Bilingue", bgd_words: "Parole in tedesco e in italiano",
    bg_ribbons: "Segnalibri", bgd_ribbons: "Sei nastri ondeggiano ai lati",
    bg_pages: "Pagine al vento", bgd_pages: "Fogli che scendono piano",
    bg_stars: "Costellazione", bgd_stars: "I punti si collegano al puntatore",
    bg_ink: "Inchiostro", bgd_ink: "Tocca o clicca: cerchi d'inchiostro",
    bg_lamp: "Lampada da lettura", bgd_lamp: "Una luce calda segue il puntatore",
    bg_lens: "Lente a punti", bgd_lens: "La griglia di punti cresce sotto il puntatore",
  },
});

const root = document.documentElement;
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mod = (x, m) => ((x % m) + m) % m;
// Seeded random numbers: the still variants look the same on every visit
const rnd = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const font = (w, px) => `${w} ${px}px "Fira Sans", system-ui, sans-serif`;

// ---------- The variants ----------
// css: drawn by styles.css alone (#bg[data-bg=…]). init(E) → state; draw(c, s, E): paints one frame on a cleared canvas,
// returns true = nothing moves until the pointer does, a number = sleep that many ms. E = { w, h, P, ptr, t, dt, still, sy }.
// color: the bar in the settings row; measure: lays out text, so again once Fira Sans has loaded.

const shelf = {
  draw(c, s, { w, h, P }) {
    const r = rnd(7), row = 140;
    for (let y = 150; y < h + row; y += row) {
      c.globalAlpha = .7 * P.fx; c.fillStyle = P.line; c.fillRect(0, y, w, 5);
      for (let x = -r() * 30; x < w;) {
        if (r() < .05) { x += 24 + r() * 60; continue; } // a gap on the shelf
        const bw = 9 + r() * 15 | 0, bh = 66 + r() * 52 | 0;
        c.globalAlpha = (.14 + r() * .16) * (P.dark ? .6 : 1) * P.fx; c.fillStyle = P.logo[r() * 6 | 0];
        if (r() < .05) { // leaning book
          c.save(); c.translate(x + 4, y); c.rotate(-.2); c.fillRect(0, -bh, bw, bh); c.restore(); x += bw + 22;
        } else {
          c.fillRect(x, y - bh, bw, bh);
          c.globalAlpha = .45 * P.fx; c.fillStyle = P.bg; c.fillRect(x + 2, y - bh + 10, bw - 4, 2); c.fillRect(x + 2, y - 16, bw - 4, 2);
          x += bw + 1 + (r() < .3 ? 2 : 0);
        }
      }
    }
  },
};

// Milan skyline: buildings as polygons [x, y] on a 0..1000 × 0..400 grid (y up), placed along the bottom edge
const SKYLINE = [
  // Castello Sforzesco, Torre del Filarete
  [60, [[0, 0], [0, 70], [30, 70], [30, 120], [36, 120], [36, 150], [44, 165], [52, 150], [52, 120], [58, 120], [58, 70], [140, 70], [140, 0]]],
  // Torre Velasca: shaft, wider head on struts
  [210, [[0, 0], [0, 190], [-12, 205], [-12, 262], [72, 262], [72, 205], [60, 190], [60, 0]]],
  // Duomo: facade with gables, spires, the Madonnina's spire in the middle
  [370, [[0, 0], [0, 80], [14, 80], [16, 128], [18, 80], [40, 80], [42, 140], [44, 80], [70, 80], [80, 104], [92, 104], [94, 160],
    [96, 104], [112, 104], [114, 150], [116, 118], [132, 118], [134, 200], [136, 250], [138, 200], [140, 118], [156, 118], [158, 150],
    [160, 104], [176, 104], [178, 160], [180, 104], [192, 104], [202, 80], [228, 80], [230, 140], [232, 80], [254, 80], [256, 128],
    [258, 80], [272, 80], [272, 0]]],
  // Galleria dome
  [680, [[0, 0], [0, 56], [24, 56], [30, 80], [44, 98], [60, 104], [76, 98], [90, 80], [96, 56], [120, 56], [120, 0]]],
  // Pirellone: slim, tapered at both ends
  [820, [[0, 0], [-6, 30], [-8, 280], [0, 300], [56, 300], [64, 280], [62, 30], [56, 0]]],
  // Bosco Verticale: two towers
  [900, [[0, 0], [0, 200], [38, 200], [38, 150], [52, 150], [52, 0]]],
  // UniCredit tower with its spire
  [960, [[0, 0], [0, 230], [10, 270], [22, 300], [24, 370], [26, 300], [30, 260], [34, 0]]],
];

const milan = {
  draw(c, s, { w, h, P }) {
    const k = clamp(Math.min(w / 1000, h / 700), .45, 1.4), r = rnd(3), base = h - 4;
    c.save(); c.translate(0, base); c.scale(w / 1000, k);
    c.globalAlpha = .7 * P.fx; c.fillStyle = P.line;
    for (let x = 0; x < 1000;) { const bw = 18 + r() * 40; c.fillRect(x, -(18 + r() * 52), bw + 1, 80); x += bw; } // houses
    c.globalAlpha = .5 * P.fx; c.fillStyle = P.c.blue;
    for (const [x0, pts] of SKYLINE) {
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo : c.moveTo).call(c, x0 + x, -y)); c.fill();
    }
    c.globalAlpha = .9 * P.fx; c.fillStyle = P.c.yellow; // the golden Madonnina
    c.beginPath(); c.arc(370 + 136, -254, 4, 0, TAU); c.fill();
    c.fillStyle = P.c.green; // the trees of the Bosco Verticale
    for (let y = 12; y < 196; y += 14) for (let x = 3; x < 52; x += 12) if (r() < .55 && (x < 38 || y < 148)) { c.beginPath(); c.arc(900 + x + r() * 4, -y, 3, 0, TAU); c.fill(); }
    c.restore();
    // Tram (Milan's orange Ventotto) on its rail
    const tk = clamp(h / 900, .7, 1.2), tx = w * .04, ty = base - 6;
    c.globalAlpha = .6 * P.fx; c.fillStyle = P.muted; c.fillRect(0, base - 2, w, 2);
    c.fillRect(tx + 54 * tk, ty - 58 * tk, 2, 20 * tk); // pantograph
    c.globalAlpha = .75 * P.fx; c.fillStyle = P.c.orange; c.fillRect(tx, ty - 38 * tk, 120 * tk, 34 * tk);
    c.globalAlpha = .8 * P.fx; c.fillStyle = P.bg;
    for (let i = 0; i < 6; i++) c.fillRect(tx + (8 + i * 18) * tk, ty - 32 * tk, 12 * tk, 12 * tk);
  },
};

// Hour in Milan (the opening hours count in this time zone too)
const romeHour = () => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const v = t => +(p.find(x => x.type === t) || { value: 0 }).value;
  return v("hour") + v("minute") / 60;
};
const ramp = (x, a, b) => clamp((x - a) / (b - a), 0, 1);

const sky = {
  every: 300000,
  draw(c, s, { w, h, P }) {
    const hr = romeHour(), r = rnd(11);
    const day = ramp(hr, 6.5, 9) * (1 - ramp(hr, 17, 19.5)), dawn = Math.max(0, 1 - Math.abs(hr - 7) / 1.75);
    const dusk = Math.max(0, 1 - Math.abs(hr - 19) / 2), night = Math.max(0, 1 - day - dawn - dusk);
    const wash = (a, top, bottom) => {
      if (a <= 0) return;
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bottom);
      c.globalAlpha = a * P.fx; c.fillStyle = g; c.fillRect(0, 0, w, h);
    };
    wash(.45 * day, P.c.blue, P.bg);
    wash(.4 * dawn, P.c.mauve, P.c.orange);
    wash(.45 * dusk, P.c.blue, P.c.red);
    wash(.12 * night, P.fg, P.c.blue);
    wash(.25 * night, P.c.blue, P.bg);
    if (night > .2) { // stars
      c.fillStyle = P.dark ? P.fg : P.c.blue;
      for (let i = 0; i < 90; i++) { c.globalAlpha = night * (.25 + r() * .5) * P.fx; c.fillRect(r() * w, r() * h * .7, 2, 2); }
    }
    // Sun along its arc 6–20 h, otherwise the moon
    const f = (hr - 6) / 14, sun = f > 0 && f < 1;
    const x = sun ? w * (.08 + .84 * f) : w * .82, y = sun ? h * (.85 - Math.sin(Math.PI * f) * .7) : h * .16;
    const g = c.createRadialGradient(x, y, 0, x, y, 160);
    g.addColorStop(0, sun ? P.c.yellow : P.c.blue); g.addColorStop(1, "transparent");
    c.globalAlpha = .45 * P.fx; c.fillStyle = g; c.fillRect(x - 160, y - 160, 320, 320);
    c.globalAlpha = (sun ? .7 : .5) * P.fx; c.fillStyle = sun ? P.c.yellow : P.c.blue;
    c.beginPath(); c.arc(x, y, sun ? 34 : 24, 0, TAU); c.fill();
  },
};

const mosaic = {
  draw(c, s, { w, h, P }) {
    const r = rnd(5), n = 76, cols = Math.ceil(w / n) + 2, rows = Math.ceil(h / n) + 2, pt = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) pt.push([(i - .5 + (j % 2) * .5) * n + (r() - .5) * n * .6, (j - .5) * n + (r() - .5) * n * .6]);
    const at = (i, j) => pt[j * cols + i];
    const tri = (a, b, d) => {
      if (r() > .6) return;
      c.globalAlpha = (.04 + r() * .14) * (.35 + .65 * a[1] / h) * P.fx; c.fillStyle = P.logo[r() * 6 | 0];
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.fill();
    };
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      tri(at(i, j), at(i + 1, j), at(i, j + 1)); tri(at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
    }
  },
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ";
const letters = {
  init({ w, h }) {
    const r = Math.random;
    return Array.from({ length: clamp(Math.round(w * h / 26000), 24, 60) }, () => {
      const z = .3 + r() * .7;
      return { ch: ALPHABET[r() * ALPHABET.length | 0], x: r() * w, y: r() * h, z, px: 16 + z * 48 | 0, col: r() * 6 | 0, ph: r() * TAU };
    });
  },
  draw(c, s, { w, h, P, t, dt, sy }) {
    c.textAlign = "center"; c.textBaseline = "middle";
    for (const l of s) {
      l.y -= dt * (.008 + .022 * l.z);
      const y = mod(l.y - sy * .2 * l.z, h + 120) - 60, x = l.x + Math.sin(t / 4000 + l.ph) * 14;
      c.globalAlpha = (.14 + .16 * l.z) * P.fx; c.fillStyle = P.logo[l.col]; c.font = font(600, l.px);
      c.save(); c.translate(x, y); c.rotate(Math.sin(t / 6000 + l.ph) * .25); c.fillText(l.ch, 0, 0); c.restore();
    }
  },
};

// German word, Italian word: lanes drifting left and right
const WORDS = ["Buch", "libro", "lesen", "leggere", "Bibliothek", "biblioteca", "Geschichte", "storia", "Seite", "pagina", "Wort", "parola",
  "Abenteuer", "avventura", "Freundschaft", "amicizia", "Gedicht", "poesia", "Roman", "romanzo", "Fantasie", "fantasia", "Wissen", "sapere",
  "Schule", "scuola", "Sprache", "lingua", "Traum", "sogno", "Reise", "viaggio", "Stille", "silenzio", "Neugier", "curiosità"];
const words = {
  init({ h }, c) {
    const lanes = [], r = rnd(9);
    for (let i = 0, y = 40; y < h + 60; i++, y += 60) {
      const px = i % 3 === 1 ? 16 : 24, items = [];
      let x = 0;
      for (let k = 0; k < 10; k++) {
        const n = (r() * WORDS.length / 2 | 0) * 2;
        for (const [word, it] of [[WORDS[n], false], [WORDS[n + 1], true]]) {
          c.font = font(it ? 400 : 600, px);
          items.push({ word, it, x }); x += c.measureText(word).width + (it ? 56 : 14);
        }
      }
      lanes.push({ y, px, items, len: x, v: (i % 2 ? 1 : -1) * (.006 + r() * .008), col: i % 6 });
    }
    return lanes;
  },
  draw(c, s, { w, h, P, t, sy }) {
    c.textBaseline = "middle";
    const off = mod(-sy * .25, 60);
    for (const l of s) {
      const y = mod(l.y + off, h + 60) - 30, shift = mod(t * l.v, l.len);
      for (const it of [false, true]) { // German words first, then Italian: one font each
        c.font = font(it ? 400 : 600, l.px);
        c.globalAlpha = (it ? .5 : .1) * P.fx; c.fillStyle = it ? P.logo[l.col] : P.fg;
        for (const o of l.items) if (o.it === it) for (let x = o.x - shift - l.len; x < w; x += l.len) if (x > -300) c.fillText(o.word, x, y);
      }
    }
  },
};

// Bookmark ribbons hanging from the top edge, three on each side of the column (on the phone across the width)
const ribbons = {
  init({ w, h }) {
    const col = Math.min(w, 46 * 16 + 32), side = (w - col) / 2, r = rnd(4);
    return [0, 1, 2, 3, 4, 5].map(i => {
      const left = i < 3, j = i % 3;
      const x = side > 120 ? (left ? side * (.25 + j * .25) : w - side * (.25 + j * .25)) : w * (.08 + i * .168);
      return { x, len: h * (.35 + r() * .35), wid: 14 + r() * 6, col: i, ph: r() * TAU, sp: .0008 + r() * .0006 };
    });
  },
  draw(c, s, { P, t }) {
    for (const b of s) {
      const sway = y => Math.sin(y / 90 - t * b.sp + b.ph) * 16 * (y / b.len);
      c.globalAlpha = .42 * P.fx; c.fillStyle = P.logo[b.col];
      c.beginPath(); c.moveTo(b.x - b.wid / 2, 0);
      for (let y = 0; y <= b.len; y += 16) c.lineTo(b.x - b.wid / 2 + sway(y), y);
      c.lineTo(b.x + sway(b.len - b.wid * .7), b.len - b.wid * .7); // the V cut at the end
      for (let y = b.len; y >= 0; y -= 16) c.lineTo(b.x + b.wid / 2 + sway(y), y);
      c.fill();
    }
  },
};

const pages = {
  init({ w, h }) {
    const r = Math.random;
    return Array.from({ length: clamp(Math.round(w * h / 90000), 8, 18) }, () => {
      const z = .5 + r() * .5;
      return { x: r() * w, y: r() * h, z, sz: 40 + z * 40, ph: r() * TAU, rot: r() * TAU, col: r() * 6 | 0, lines: 3 + r() * 4 | 0 };
    });
  },
  draw(c, s, { w, h, P, t, dt }) {
    for (const p of s) {
      p.y += dt * .012 * p.z; p.rot += dt * .00012;
      const y = mod(p.y, h + 160) - 80, x = mod(p.x + Math.sin(t / 3000 + p.ph) * 40, w + 120) - 60, pw = p.sz * .72, ph = p.sz;
      c.save(); c.translate(x, y); c.rotate(Math.sin(p.rot) * .6); c.scale(Math.cos(t / 2600 + p.ph), 1);
      c.globalAlpha = .9 * P.fx; c.fillStyle = P.surface; c.fillRect(-pw / 2, -ph / 2, pw, ph);
      c.strokeStyle = P.line; c.lineWidth = 1; c.strokeRect(-pw / 2, -ph / 2, pw, ph);
      c.fillStyle = P.muted; c.globalAlpha = .35 * P.fx;
      for (let i = 0; i < p.lines; i++) c.fillRect(-pw / 2 + 6, -ph / 2 + 10 + i * 7, (pw - 12) * (i === p.lines - 1 ? .55 : 1), 2);
      c.globalAlpha = .8 * P.fx; c.fillStyle = P.logo[p.col]; c.fillRect(pw / 2 - 12, -ph / 2, 5, 12); // bookmark
      c.restore();
    }
  },
};

const stars = {
  init({ w, h }) {
    const r = Math.random;
    return Array.from({ length: clamp(Math.round(w * h / 15000), 36, 100) }, () => (
      { x: r() * w, y: r() * h, vx: (r() - .5) * .02, vy: (r() - .5) * .02, rad: 1.4 + r() * 1.4, col: r() * 6 | 0 }
    ));
  },
  draw(c, s, { w, h, P, ptr, dt, still }) {
    const near = ptr.on && !still, D = 120;
    for (const p of s) {
      if (!still) { p.x = mod(p.x + p.vx * dt, w); p.y = mod(p.y + p.vy * dt, h); }
      if (near) { const dx = ptr.x - p.x, dy = ptr.y - p.y, d = Math.hypot(dx, dy); if (d < 200 && d > 30) { p.x += dx / d * .02 * dt; p.y += dy / d * .02 * dt; } }
    }
    c.strokeStyle = P.muted; c.lineWidth = 1;
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
      const a = s[i], b = s[j], d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (d < D) { c.globalAlpha = (1 - d / D) * .3 * P.fx; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
    }
    if (near) for (const p of s) {
      const d = Math.hypot(ptr.x - p.x, ptr.y - p.y);
      if (d < 200) { c.globalAlpha = (1 - d / 200) * .7 * P.fx; c.strokeStyle = P.logo[p.col]; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(ptr.x, ptr.y); c.stroke(); }
    }
    for (const p of s) { c.globalAlpha = .75 * P.fx; c.fillStyle = P.logo[p.col]; c.beginPath(); c.arc(p.x, p.y, p.rad, 0, TAU); c.fill(); }
  },
};

// Ink: a click or tap drops a blot that spreads in rings; moving leaves a fine trail; now and then a drop falls by itself
const ink = {
  init: () => ({ drops: [], next: 0, trail: 0 }),
  draw(c, s, { w, h, P, ptr, t, still }) {
    if (still) { // one quiet frame: a few dried blots
      const r = rnd(2);
      for (let i = 0; i < 7; i++) { c.globalAlpha = .18 * P.fx; c.strokeStyle = P.logo[i % 6]; c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(r() * w, r() * h, 30 + k * 24, 0, TAU); c.stroke(); } }
      return true;
    }
    for (const tap of ptr.taps.splice(0)) s.drops.push({ x: tap.x, y: tap.y, t0: t, R: 150 + Math.random() * 90, col: Math.random() * 6 | 0, life: 2600 });
    if (ptr.on && t - ptr.t < 60 && t - s.trail > 45) { s.trail = t; s.drops.push({ x: ptr.x, y: ptr.y, t0: t, R: 10, col: s.drops.length % 6, life: 900 }); }
    if (t > s.next) { s.next = t + 2500 + Math.random() * 2500; s.drops.push({ x: Math.random() * w, y: Math.random() * h, t0: t, R: 120, col: Math.random() * 6 | 0, life: 3200 }); }
    s.drops = s.drops.filter(d => t - d.t0 < d.life);
    for (const d of s.drops) {
      const p = (t - d.t0) / d.life, e = 1 - (1 - p) ** 3;
      c.strokeStyle = c.fillStyle = P.logo[d.col];
      if (p < .35) { c.globalAlpha = (1 - p / .35) * .35 * P.fx; c.beginPath(); c.arc(d.x, d.y, d.R * .22 * e + 3, 0, TAU); c.fill(); }
      c.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const rr = d.R * e * (1 - k * .24);
        if (rr > 1) { c.globalAlpha = (1 - p) * .5 * P.fx; c.beginPath(); c.arc(d.x, d.y, rr, 0, TAU); c.stroke(); }
      }
    }
    return s.drops.length ? false : Math.max(16, s.next - t);
  },
};

// Reading lamp: warm light where the pointer is (otherwise it wanders slowly), dust glitters in it
const lamp = {
  init({ w, h }) {
    const r = Math.random;
    return { x: w / 2, y: h / 3, dust: Array.from({ length: 40 }, () => ({ x: r() * w, y: r() * h, v: .004 + r() * .01, ph: r() * TAU })) };
  },
  draw(c, s, { w, h, P, ptr, t, dt, still }) {
    const follow = ptr.on && !still && t - ptr.t < 8000;
    const tx = follow ? ptr.x : w * (.5 + .36 * Math.sin(t / 9000)), ty = follow ? ptr.y : h * (.42 + .28 * Math.sin(t / 6700));
    const k = still ? 1 : Math.min(1, dt / 220);
    s.x += (tx - s.x) * k; s.y += (ty - s.y) * k;
    const R = clamp(Math.min(w, h) * .55, 220, 420), g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, R);
    g.addColorStop(0, P.c.yellow); g.addColorStop(.45, P.c.orange); g.addColorStop(1, "transparent");
    c.globalAlpha = (P.dark ? .3 : .38) * P.fx; c.fillStyle = g; c.fillRect(s.x - R, s.y - R, R * 2, R * 2);
    c.fillStyle = P.dark ? P.c.yellow : P.c.orange;
    for (const d of s.dust) {
      if (!still) { d.y = mod(d.y - d.v * dt, h); d.x += Math.sin(t / 2000 + d.ph) * .05; }
      const f = 1 - Math.hypot(d.x - s.x, d.y - s.y) / R;
      if (f > 0) { c.globalAlpha = f * .8 * P.fx; c.fillRect(d.x, d.y, 2, 2); }
    }
  },
};

// Dot lens: a dot grid; under the pointer the dots grow, give way and take on the logo colors
const lens = {
  init: ({ w, h }) => ({ x: w / 2, y: h / 2, f: 0 }),
  draw(c, s, { w, h, P, ptr, dt, still }) {
    const on = ptr.on && !still, k = Math.min(1, dt / 90);
    if (on) { s.x += (ptr.x - s.x) * k; s.y += (ptr.y - s.y) * k; }
    s.f += ((on ? 1 : 0) - s.f) * k;
    const G = 24, R = 160, far = [];
    c.fillStyle = P.muted;
    c.globalAlpha = .35 * P.fx; c.beginPath();
    for (let y = G / 2; y < h; y += G) for (let x = G / 2; x < w; x += G) {
      const dx = x - s.x, dy = y - s.y, d = Math.hypot(dx, dy), f = s.f * Math.max(0, 1 - d / R);
      if (f < .02) { c.rect(x - 1, y - 1, 2, 2); continue; }
      far.push([x + dx / (d || 1) * f * 12, y + dy / (d || 1) * f * 12, f, Math.atan2(dy, dx)]);
    }
    c.fill();
    for (const [x, y, f, a] of far) {
      c.globalAlpha = (.35 + f * .5) * P.fx; c.fillStyle = P.logo[mod(Math.round(a / TAU * 6), 6)];
      c.beginPath(); c.arc(x, y, 1.2 + f * f * 4, 0, TAU); c.fill();
    }
    return !on && s.f < .01;
  },
};

const BG = {
  notebook: { kind: "still", css: true, color: "red" },
  grid: { kind: "still", css: true, color: "blue" },
  shelf: { kind: "still", color: "mauve", ...shelf },
  milan: { kind: "still", color: "orange", ...milan },
  sky: { kind: "still", color: "blue", ...sky },
  mosaic: { kind: "still", color: "green", ...mosaic },
  aurora: { kind: "motion", css: true, color: "mauve" },
  letters: { kind: "motion", color: "yellow", ...letters },
  words: { kind: "motion", color: "blue", measure: true, ...words },
  ribbons: { kind: "motion", color: "red", ...ribbons },
  pages: { kind: "motion", color: "green", ...pages },
  stars: { kind: "touch", color: "blue", ...stars },
  ink: { kind: "touch", color: "mauve", ...ink },
  lamp: { kind: "touch", color: "yellow", ...lamp },
  lens: { kind: "touch", color: "orange", ...lens },
};
const KINDS = ["still", "motion", "touch"];

// ---------- Choice (localStorage dsm-bg) ----------
const KEY = "dsm-bg";
const saved = store.json(KEY);
let pref = { on: !!(saved && saved.on), id: saved && BG[saved.id] ? saved.id : "aurora" };
const listeners = new Set();

export function setBackground(next) {
  pref = { ...pref, ...next };
  store.set(KEY, JSON.stringify(pref));
  log("Setting", `Background: ${pref.on ? pref.id : "off"}`);
  listeners.forEach(fn => fn());
  mount();
}
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const useBackground = () => React.useSyncExternalStore(subscribe, () => pref);

// ---------- Engine ----------
let layer = null, canvas = null, ctx = null, spec = null, st = null, raf = 0, sleep = 0, every = 0, last = 0;
const ptr = { x: 0, y: 0, on: false, t: 0, taps: [] };
const E = { w: 0, h: 0, P: null, ptr, t: 0, dt: 16, still: false, sy: 0 };

function palette() {
  const cs = getComputedStyle(root), v = n => cs.getPropertyValue("--" + n).trim();
  const c = {};
  for (const n of ["mauve", "yellow", "orange", "blue", "red", "green"]) c[n] = v(n);
  const bg = v("bg");
  return { fg: v("fg"), bg, muted: v("muted"), line: v("line"), surface: v("surface"), fx: parseFloat(v("fx")) || 1, c, logo: Object.values(c),
    dark: /^#[0-7]/.test(bg) };
}

const active = () => pref.on && root.dataset.contrast !== "high";
const moving = () => !!(spec && spec.draw && spec.kind !== "still" && !reduced.matches && !document.hidden);

function paint(now) {
  E.dt = Math.min(now - last || 16, 100); E.t = now; last = now;
  E.sy = window.scrollY || 0; E.still = !moving();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
  const d = canvas.width / E.w; ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.globalAlpha = 1;
  return spec.draw(ctx, st, E);
}

function frame(now) {
  raf = 0;
  if (!canvas || !moving()) return;
  // A modal dialog (Radix sets pointer-events: none on <body>) blurs the background: its blur is recomputed on every frame
  const gap = document.body.style.pointerEvents === "none" ? 66 : 33;
  if (now - last >= gap - 4) {
    const rest = paint(now);
    if (rest === true) return; // until the pointer moves
    if (typeof rest === "number" && rest > 50) { sleep = setTimeout(wake, rest); return; }
  }
  raf = requestAnimationFrame(frame);
}

function wake() {
  clearTimeout(sleep); sleep = 0;
  if (!raf && moving()) { last = performance.now(); raf = requestAnimationFrame(frame); }
}

// Canvas as large as the layer (100vh = the tall viewport on the phone: no new start when the toolbar moves)
function size(fresh) {
  if (!canvas) return;
  const w = layer.clientWidth, h = layer.clientHeight;
  if (!fresh && w === E.w && h <= E.h) return;
  const d = Math.min(window.devicePixelRatio || 1, spec.kind === "still" ? 2 : 1.5);
  E.w = w; E.h = Math.max(h, 1); E.P = palette();
  canvas.width = Math.round(w * d); canvas.height = Math.round(E.h * d);
  canvas.style.width = w + "px"; canvas.style.height = E.h + "px";
  ctx.setTransform(d, 0, 0, d, 0, 0);
  st = spec.init ? spec.init(E, ctx) : null;
  last = performance.now(); E.still = !moving(); paint(last);
  wake();
}

function mount() {
  cancelAnimationFrame(raf); raf = 0; clearTimeout(sleep); clearInterval(every);
  if (!active()) {
    if (layer) { layer.remove(); layer = canvas = ctx = spec = null; }
    delete root.dataset.bg;
    return;
  }
  if (!layer) {
    layer = document.createElement("div"); layer.id = "bg"; layer.setAttribute("aria-hidden", "true");
    document.body.prepend(layer);
  }
  spec = BG[pref.id]; layer.dataset.bg = root.dataset.bg = pref.id;
  if (spec.css) { if (canvas) { canvas.remove(); canvas = ctx = null; } return; }
  if (!canvas) { canvas = document.createElement("canvas"); ctx = canvas.getContext("2d"); layer.append(canvas); }
  ptr.taps.length = 0;
  size(true);
  if (spec.every) every = setInterval(() => canvas && paint(performance.now()), spec.every);
}

// Colors anew after a theme switch; contrast and motion decide whether and how it runs at all
function restyle() {
  if (!active() || !layer) return mount();
  if (canvas) { E.P = palette(); if (!moving()) paint(performance.now()); }
  wake();
}

let started = false;
export function startBackground() {
  if (started) return;
  started = true;
  new MutationObserver(m => (m.some(r => r.attributeName !== "data-theme") ? mount() : restyle()))
    .observe(root, { attributes: true, attributeFilter: ["data-theme", "data-contrast", "data-motion"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", restyle);
  systemReduced.addEventListener("change", mount);
  document.addEventListener("visibilitychange", wake);
  addEventListener("resize", () => size(false), { passive: true });
  const move = e => {
    if (!spec || spec.kind !== "touch") return;
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; ptr.t = performance.now(); wake();
  };
  addEventListener("pointermove", move, { passive: true });
  addEventListener("pointerdown", e => { move(e); if (spec && spec.kind === "touch") ptr.taps.push({ x: e.clientX, y: e.clientY }); }, { passive: true });
  document.addEventListener("pointerout", e => { if (!e.relatedTarget && spec && spec.kind === "touch") { ptr.on = false; wake(); } });
  // The words are measured in Fira Sans: once it is there, measure again
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (spec && spec.measure && canvas) size(true); });
  mount();
}

// ---------- Settings section ----------
const onSystem = fn => { systemReduced.addEventListener("change", fn); return () => systemReduced.removeEventListener("change", fn); };

export function BackgroundSettings() {
  const { t } = useLanguage();
  const p = useBackground();
  const a = useAppearance();
  const still = React.useSyncExternalStore(onSystem, () => systemReduced.matches) || a.motion;
  const opt = id => (
    <RadioGroupItem key={id} value={id} data-bg={id}>
      <i className="bar-c" style={{ background: `var(--${BG[id].color})` }} />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <b className="font-medium group-data-[state=checked]/opt:font-semibold">{t("bg_" + id)}</b>
        <small className="text-s text-muted-foreground">{t("bgd_" + id)}</small>
      </span>
    </RadioGroupItem>
  );
  return (
    <Section title={t("bgTitle")}>
      <Option
        id="s-bg" title={t("bgShow")} help={t(a.contrast ? "bgContrast" : "bgShowH")}
        checked={p.on && !a.contrast} disabled={a.contrast} onCheckedChange={v => setBackground({ on: v })}
      />
      <RadioGroup id="s-bgpick" className="gpick pt-1.5" aria-label={t("bgPick")} hidden={!p.on || a.contrast} value={p.id} onValueChange={id => id && setBackground({ on: true, id })}>
        {KINDS.map(k => (
          <div key={k}>
            <span className="block px-0.5 pt-1 pb-1.5 text-s text-muted-foreground">
              {t("bgK_" + k)}{still && k !== "still" ? ` – ${t("bgStill")}` : ""}
            </span>
            <div className="card grid overflow-hidden">{Object.keys(BG).filter(id => BG[id].kind === k).map(opt)}</div>
          </div>
        ))}
      </RadioGroup>
    </Section>
  );
}
