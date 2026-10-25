/* Experimental backgrounds (settings "Hintergrund"): 9 variants behind the book list, off by default (`dsm-bg`).
   The best three of each kind, chosen from 515 drafts (2026-10-25): what fits the school, the library and Milan, stays
   readable behind the list, works on the phone and costs little.
   Layer #bg (fixed, z-index -1, aria-hidden, no pointer events): in front of the body color, behind everything else.
   Under the content column the mask in styles.css lets only --fx-col of it through (the list stays readable), the
   search bar is transparent until it sticks. Three kinds:
     still  = drawn once (again on resize and theme change),
     motion = animated at 20 fps, 15 fps while a modal dialog blurs it, 10 fps after 30 s without any input,
     touch  = reacts to the pointer (click/tap, move) at 30 fps; sleeps while nothing happens.
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
    bgTitle: "Hintergrund", bgShow: "Gestalteter Hintergrund", bgShowH: "Experimentell – 9 Varianten zum Ausprobieren",
    bgContrast: "Bei hohem Kontrast ausgeschaltet", bgPick: "Hintergrund wählen", bgStill: "stehen still (Keine Animationen)",
    bgK_still: "Ruhig", bgK_motion: "Bewegt", bgK_touch: "Zum Anfassen",
    bg_notebook: "Schulheft", bgd_notebook: "Linien und roter Rand",
    bg_milan: "Mailand", bgd_milan: "Dom, Velasca, Pirellone und die Tram",
    bg_metro: "U-Bahn-Plan", bgd_metro: "M1 bis M5 in den Logofarben",
    bg_pullout: "Bücher herausziehen", bgd_pullout: "Bücher rutschen dem Zeiger entgegen",
    bg_aurora: "Farbnebel", bgd_aurora: "Langsam ziehende Logofarben",
    bg_words: "Zweisprachig", bgd_words: "Wörter auf Deutsch und Italienisch",
    bg_ribbons: "Lesebändchen", bgd_ribbons: "Sechs Bänder wehen am Rand",
    bg_ink: "Tinte", bgd_ink: "Tippen oder Klicken zieht Kreise",
    bg_lamp: "Leselampe", bgd_lamp: "Warmes Licht folgt dem Zeiger",
  },
  it: {
    bgTitle: "Sfondo", bgShow: "Sfondo decorativo", bgShowH: "Sperimentale – 9 varianti da provare",
    bgContrast: "Disattivato con contrasto elevato", bgPick: "Scegli lo sfondo", bgStill: "restano fermi (Nessuna animazione)",
    bgK_still: "Tranquilli", bgK_motion: "In movimento", bgK_touch: "Da toccare",
    bg_notebook: "Quaderno", bgd_notebook: "Righe e margine rosso",
    bg_milan: "Milano", bgd_milan: "Duomo, Velasca, Pirellone e il tram",
    bg_metro: "Mappa della metro", bgd_metro: "Dalla M1 alla M5 nei colori del logo",
    bg_pullout: "Estrarre i libri", bgd_pullout: "I libri scivolano verso il puntatore",
    bg_aurora: "Nebbia di colori", bgd_aurora: "Colori del logo che scorrono piano",
    bg_words: "Bilingue", bgd_words: "Parole in tedesco e in italiano",
    bg_ribbons: "Segnalibri", bgd_ribbons: "Sei nastri ondeggiano ai lati",
    bg_ink: "Inchiostro", bgd_ink: "Tocca o clicca: cerchi d'inchiostro",
    bg_lamp: "Lampada da lettura", bgd_lamp: "Una luce calda segue il puntatore",
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
// The same color fully transparent: canvas gradients towards "transparent" (= transparent black) turn gray halfway
const clear = col => /^#[0-9a-f]{6}$/i.test(col) ? `rgba(${parseInt(col.slice(1, 3), 16)}, ${parseInt(col.slice(3, 5), 16)}, ${parseInt(col.slice(5, 7), 16)}, 0)` : "rgba(0, 0, 0, 0)";
const font = (w, px) => `${w} ${px}px "Fira Sans", system-ui, sans-serif`;

// ---------- The variants ----------
// css: drawn by styles.css alone (#bg[data-bg=…]). init(E) → state; draw(c, s, E): paints one frame on a cleared canvas,
// returns true = nothing moves until the pointer does, a number = sleep that many ms. E = { w, h, P, ptr, t, dt, still, sy, col };
// col = { l, r }: left and right edge of the text column in px (draw nothing text-like there).
// color: the bar in the settings row; measure: lays out text, so again once Fira Sans has loaded.

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

// German word, Italian word: lanes drifting left and right
const WORDS = ["Buch", "libro", "lesen", "leggere", "Bibliothek", "biblioteca", "Geschichte", "storia", "Seite", "pagina", "Wort", "parola",
  "Abenteuer", "avventura", "Freundschaft", "amicizia", "Gedicht", "poesia", "Roman", "romanzo", "Fantasie", "fantasia", "Wissen", "sapere",
  "Schule", "scuola", "Sprache", "lingua", "Traum", "sogno", "Reise", "viaggio", "Stille", "silenzio", "Neugier", "curiosità"];
// Each lane is drawn once into its own small canvas (sprite) and then only moved: one drawImage per lane and frame
// instead of hundreds of fillText. Eight lane sprites, repeated down the page. Colors baked in: a theme switch inits again.
const words = {
  init({ h, P }, c) {
    const r = rnd(9), d = c.getTransform().a, sprites = [];
    for (let i = 0; i < 8; i++) {
      const px = i % 3 === 1 ? 16 : 24, items = [];
      let x = 0;
      for (let k = 0; k < 10; k++) {
        const n = (r() * WORDS.length / 2 | 0) * 2;
        for (const [word, it] of [[WORDS[n], false], [WORDS[n + 1], true]]) {
          c.font = font(it ? 400 : 600, px);
          items.push({ word, it, x }); x += c.measureText(word).width + (it ? 56 : 14);
        }
      }
      const img = document.createElement("canvas"), g = img.getContext("2d");
      img.width = Math.ceil(x * d); img.height = Math.ceil(40 * d); g.scale(d, d); g.textBaseline = "middle";
      for (const o of items) {
        g.font = font(o.it ? 400 : 600, px); g.globalAlpha = (o.it ? .5 : .1) * P.fx; g.fillStyle = o.it ? P.logo[i % 6] : P.fg;
        g.fillText(o.word, o.x, 20);
      }
      sprites.push({ img, len: x, v: (i % 2 ? 1 : -1) * (.006 + r() * .008) });
    }
    return { sprites, lanes: Math.ceil((h + 60) / 60) };
  },
  draw(c, s, { w, h, t, sy, col }) {
    const off = mod(-sy * .25, 60);
    // Wide window: only in the margins, never text behind the list (on the phone the mask keeps it faint)
    if (col.l > 80) { c.save(); c.beginPath(); c.rect(0, 0, col.l - 24, h); c.rect(col.r + 24, 0, w - col.r - 24, h); c.clip(); }
    for (let i = 0; i < s.lanes; i++) {
      const l = s.sprites[i % 8], y = mod(40 + i * 60 + off, h + 60) - 30, shift = mod(t * l.v * (i % 3 + 1) / 2, l.len);
      for (let x = -shift; x < w; x += l.len) c.drawImage(l.img, x, y - 20, l.len, 40);
    }
    if (col.l > 80) c.restore();
  },
};

// Bookmark ribbons hanging from the top edge, three on each side of the column (on the phone across the width)
const ribbons = {
  init({ w, h, col }) {
    const side = col.l - 16, r = rnd(4);
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
  init({ w, h, P }, c) {
    const r = Math.random, R = clamp(Math.min(w, h) * .55, 220, 420), d = c.getTransform().a;
    // The light drawn once (a radial gradient per frame costs more than moving a picture)
    const glow = document.createElement("canvas"), g = glow.getContext("2d");
    glow.width = glow.height = Math.ceil(R * 2 * d); g.scale(d, d);
    const grad = g.createRadialGradient(R, R, 0, R, R, R);
    grad.addColorStop(0, P.c.yellow); grad.addColorStop(.45, P.c.orange); grad.addColorStop(1, clear(P.c.orange));
    g.fillStyle = grad; g.fillRect(0, 0, R * 2, R * 2);
    return { x: w / 2, y: h / 3, R, glow, dust: Array.from({ length: 40 }, () => ({ x: r() * w, y: r() * h, v: .004 + r() * .01, ph: r() * TAU })) };
  },
  draw(c, s, { w, h, P, ptr, t, dt, still }) {
    const follow = ptr.on && !still && t - ptr.t < 8000;
    const tx = follow ? ptr.x : w * (.5 + .36 * Math.sin(t / 9000)), ty = follow ? ptr.y : h * (.42 + .28 * Math.sin(t / 6700));
    const k = still ? 1 : Math.min(1, dt / 220);
    s.x += (tx - s.x) * k; s.y += (ty - s.y) * k;
    const { R } = s;
    c.globalAlpha = (P.dark ? .3 : .38) * P.fx; c.drawImage(s.glow, s.x - R, s.y - R, R * 2, R * 2);
    c.fillStyle = P.dark ? P.c.yellow : P.c.orange;
    for (const d of s.dust) {
      if (!still) { d.y = mod(d.y - d.v * dt, h); d.x += Math.sin(t / 2000 + d.ph) * .05; }
      const f = 1 - Math.hypot(d.x - s.x, d.y - s.y) / R;
      if (f > 0) { c.globalAlpha = f * .8 * P.fx; c.fillRect(d.x, d.y, 2, 2); }
    }
  },
};

// Metro lines in logo colors (M1 red, M2 green, M3 yellow, M4 blue, M5 lilac) on a 0..1 grid, station names along M1
const METRO = [
  ["red", [[0, .45], [.2, .45], [.35, .5], [.5, .5], [.62, .42], [.75, .35], [1, .3]]],
  ["green", [[.1, 1], [.25, .8], [.38, .62], [.5, .5], [.6, .38], [.7, .2], [.85, 0]]],
  ["yellow", [[.5, 0], [.52, .2], [.5, .5], [.55, .7], [.6, 1]]],
  ["blue", [[0, .7], [.2, .65], [.4, .58], [.5, .5], [.65, .58], [.8, .7], [1, .78]]],
  ["mauve", [[.3, 0], [.4, .15], [.48, .3], [.62, .32], [.78, .5], [.9, .62], [1, .65]]],
];
const STATIONS = ["Cadorna", "Cairoli", "Cordusio", "Duomo", "San Babila", "Palestro", "Porta Venezia"];
const metro = {
  draw(c, s, { w, h, P, col }) {
    c.lineJoin = "round";
    METRO.forEach(([col, line], i) => {
      const pts = line.map(([x, y]) => [x * w, y * h]);
      c.globalAlpha = .6 * P.fx; c.strokeStyle = P.c[col]; c.lineWidth = 8;
      c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
      c.lineWidth = 2;
      for (const [x, y] of pts) {
        c.globalAlpha = P.fx; c.fillStyle = P.bg; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill();
        c.globalAlpha = .5 * P.fx; c.strokeStyle = P.fg; c.stroke();
      }
      if (col.l < 80) return; // phone: the line signs would sit behind the list
      const x = clamp(pts[0][0] + 8, 8, w - 44), y = clamp(pts[0][1] - 24, 8, h - 30);
      c.globalAlpha = .8 * P.fx; c.fillStyle = P.c[col]; c.fillRect(x, y, 34, 22);
      c.globalAlpha = P.fx; c.fillStyle = P.bg; c.font = font(600, 13); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("M" + (i + 1), x + 17, y + 11);
    });
    c.globalAlpha = .45 * P.fx; c.fillStyle = P.fg; c.font = font(500, 11); c.textAlign = "left";
    METRO[0][1].forEach(([x, y], k) => { if (x * w + 90 < col.l || x * w > col.r) c.fillText(STATIONS[k], x * w + 10, y * h + 18); }); // never text behind the list
  },
};

// Books on shelves slide out towards the pointer (on the phone: towards the finger). Wide window: shelves only in the
// margins, the list stays free; on the phone across the width, but half as strong.
const pullout = {
  init({ w, h, col }) {
    const r = rnd(124), books = [], ys = [], rows = Math.max(2, Math.floor(h / 150)), wide = col.l > 80;
    const spans = wide ? [[0, col.l - 24], [col.r + 24, w]] : [[0, w]];
    for (let i = 1; i <= rows; i++) {
      const y = i * h / rows - 6; ys.push(y);
      for (const [a, b] of spans) for (let x = a; x < b - 12;) { const bw = Math.min(12 + r() * 16, b - x); books.push({ x, y, bw, bh: 70 + r() * 50, col: r() * 6 | 0, out: 0 }); x += bw + 2; }
    }
    return { books, ys, spans, k: wide ? 1 : .5 };
  },
  draw(c, s, { P, ptr, dt, still }) {
    let moving = false;
    for (const b of s.books) {
      const goal = ptr.on && !still ? Math.max(0, 1 - Math.hypot(ptr.x - b.x - b.bw / 2, ptr.y - b.y + b.bh / 2) / 140) : 0;
      b.out += (goal - b.out) * Math.min(1, dt / 100);
      if (Math.abs(goal - b.out) > .01) moving = true;
      const y = b.y - b.out * 26;
      c.globalAlpha = (.3 + b.out * .3) * (P.dark ? .6 : 1) * s.k * P.fx; c.fillStyle = P.logo[b.col]; c.fillRect(b.x, y - b.bh, b.bw, b.bh);
      c.globalAlpha = .45 * P.fx; c.fillStyle = P.bg; c.fillRect(b.x + 2, y - b.bh + 8, b.bw - 4, 2); c.fillRect(b.x + 2, y - 14, b.bw - 4, 2);
    }
    c.globalAlpha = .9 * P.fx; c.fillStyle = P.line;
    for (const y of s.ys) for (const [a, b] of s.spans) c.fillRect(a, y, b - a, 5);
    return !moving && !ptr.on;
  },
};

const BG = {
  milan: { kind: "still", color: "orange", ...milan },
  metro: { kind: "still", color: "red", ...metro },
  notebook: { kind: "still", css: true, color: "blue" },
  words: { kind: "motion", color: "blue", measure: true, ...words },
  aurora: { kind: "motion", css: true, color: "mauve" },
  ribbons: { kind: "motion", color: "red", ...ribbons },
  lamp: { kind: "touch", color: "yellow", ...lamp },
  ink: { kind: "touch", color: "mauve", ...ink },
  pullout: { kind: "touch", color: "green", ...pullout },
};
const KINDS = ["still", "motion", "touch"];

// ---------- Choice (localStorage dsm-bg) ----------
const KEY = "dsm-bg";
const saved = store.json(KEY);
let pref = { on: !!(saved && saved.on), id: saved && BG[saved.id] ? saved.id : "aurora" }; // removed variants: aurora
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
let layer = null, canvas = null, ctx = null, spec = null, st = null, raf = 0, sleep = 0, last = 0;
const ptr = { x: 0, y: 0, on: false, t: 0, taps: [] };
const E = { w: 0, h: 0, P: null, ptr, t: 0, dt: 16, still: false, sy: 0, col: { l: 0, r: 0 } };
let input = 0; // last pointer, scroll or key input: without any for IDLE ms the animation slows down
const IDLE = 30000;

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
  // Nobody there for a while (a library PC left on): 10 fps are enough
  // Slow drifting needs no 30 fps: 20 for the motion variants, 30 where the pointer is followed
  const gap = document.body.style.pointerEvents === "none" ? 66 : now - input > IDLE ? 100 : spec.kind === "touch" ? 33 : 50;
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
  // Still pictures sharp, moving ones lighter: soft shapes at low alpha need no retina resolution
  const d = Math.min(window.devicePixelRatio || 1, spec.kind === "still" ? 2 : 1.25);
  E.w = w; E.h = Math.max(h, 1); E.P = palette();
  const rem = parseFloat(getComputedStyle(root).fontSize) || 16, cw = (parseFloat(getComputedStyle(root).getPropertyValue("--w")) || 46) * rem;
  E.col = { l: Math.max(16, (w - cw) / 2), r: Math.min(w - 16, (w + cw) / 2) };
  canvas.width = Math.round(w * d); canvas.height = Math.round(E.h * d);
  canvas.style.width = w + "px"; canvas.style.height = E.h + "px";
  ctx.setTransform(d, 0, 0, d, 0, 0);
  st = spec.init ? spec.init(E, ctx) : null;
  last = performance.now(); E.still = !moving(); paint(last);
  wake();
}

function mount() {
  cancelAnimationFrame(raf); raf = 0; clearTimeout(sleep);
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
}

// Colors anew after a theme switch; contrast and motion decide whether and how it runs at all
function restyle() {
  if (!active() || !layer) return mount();
  if (canvas) size(true); // new colors, also in the pictures drawn ahead (sprites)
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
  input = performance.now();
  const touched = () => { input = performance.now(); wake(); };
  addEventListener("scroll", touched, { passive: true });
  addEventListener("keydown", touched, { passive: true });
  const move = e => {
    input = performance.now();
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
      <RadioGroup id="s-bgpick" className="bgpick pt-1.5" aria-label={t("bgPick")} hidden={!p.on || a.contrast} value={p.id} onValueChange={id => id && setBackground({ on: true, id })}>
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

