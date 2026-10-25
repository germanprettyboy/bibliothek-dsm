/* Extra backgrounds 7/10: art and design */
import { clear, TAU, clamp, mod, rnd, R, many, dens, wrap, noise, A, L, fill, stroke, dot, ring, seg, path, ngon, starPath, rrect, curve, param, text, at, swarm, near, grid, follow, def } from "./kit.js";

// One Bauhaus shape: 0 circle, 1 square, 2 triangle, 3 half circle
function shape(c, k, x, y, r, rot = 0) {
  at(c, x, y, rot, 1, () => {
    c.beginPath();
    if (k === 0) c.arc(0, 0, r, 0, TAU);
    else if (k === 1) c.rect(-r, -r, r * 2, r * 2);
    else if (k === 2) { c.moveTo(0, -r); c.lineTo(r * .87, r * .5); c.lineTo(-r * .87, r * .5); c.closePath(); }
    else { c.arc(0, 0, r, Math.PI, TAU); c.closePath(); }
  });
}
function stickFigure(c, P, x, y, t, col) {
  const a = Math.sin(t) * .8, b = Math.cos(t * 1.3) * .6;
  stroke(c, P, col, .6, 3); c.lineCap = "round";
  ring(c, x, y - 52, 8); seg(c, x, y - 44, x, y - 14);
  seg(c, x, y - 36, x + Math.cos(-Math.PI / 2 + 1.6 + a) * 22, y - 36 + Math.sin(-Math.PI / 2 + 1.6 + a) * 22); seg(c, x, y - 36, x + Math.cos(-Math.PI / 2 - 1.6 - a) * 22, y - 36 + Math.sin(-Math.PI / 2 - 1.6 - a) * 22);
  seg(c, x, y - 14, x + Math.sin(.4 + b) * 24, y + 10); seg(c, x, y - 14, x + Math.sin(-.4 - b) * 24, y + 10);
  c.lineCap = "butt";
}

export default def("art", [
  ["bauhaus", "still", "red", ["Bauhaus", "Kreis, Quadrat und Dreieck"], ["Bauhaus", "Cerchio, quadrato e triangolo"], {
    draw(c, s, E) { const r = rnd(601), { P } = E; grid(E, 120, (x, y, i, j) => { fill(c, P, L(P, r() * 6), .3); shape(c, r() * 4 | 0, x + 60, y + 60, 26 + r() * 26, (r() * 4 | 0) * Math.PI / 2); c.fill(); }); },
  }],
  ["mondrian", "still", "yellow", ["Mondrian", "Schwarze Linien, Felder in Grundfarben"], ["Mondrian", "Linee nere e campi in colori primari"], {
    draw(c, s, E) {
      const r = rnd(602), { P } = E, rects = [[0, 0, E.w, E.h]];
      for (let k = 0; k < 30; k++) { const i = r() * rects.length | 0, [x, y, w, h] = rects[i]; if (w < 120 && h < 120) continue; rects.splice(i, 1); if (w > h) { const cx = w * (.3 + r() * .4); rects.push([x, y, cx, h], [x + cx, y, w - cx, h]); } else { const cy = h * (.3 + r() * .4); rects.push([x, y, w, cy], [x, y + cy, w, h - cy]); } }
      for (const [x, y, w, h] of rects) { const k = r(); if (k < .35) { fill(c, P, [P.c.red, P.c.yellow, P.c.blue][r() * 3 | 0], .4); c.fillRect(x, y, w, h); } stroke(c, P, P.fg, .45, 6); c.strokeRect(x, y, w, h); }
    },
  }],
  ["kandinsky", "still", "blue", ["Kandinsky-Kreise", "Konzentrische Ringe in Quadraten"], ["Cerchi di Kandinsky", "Anelli concentrici in quadrati"], {
    draw(c, s, E) {
      const r = rnd(603), { P } = E;
      grid(E, 110, (x, y) => { fill(c, P, L(P, r() * 6), .18); c.fillRect(x + 2, y + 2, 106, 106); for (let k = 4; k > 0; k--) { fill(c, P, L(P, r() * 6), .3); dot(c, x + 55, y + 55, k * 11 + r() * 4); } });
    },
  }],
  ["pointillism", "still", "green", ["Pointillismus", "Ein Bild aus lauter Farbtupfen"], ["Puntinismo", "Un'immagine fatta di soli puntini di colore"], {
    draw(c, s, E) {
      const r = rnd(604), { P } = E;
      for (let i = 0; i < dens(E, 120, 4000, 14000); i++) { const x = r() * E.w, y = r() * E.h, v = noise(x / 220, y / 220) * 6 + r() * 1.4; fill(c, P, L(P, v), .35); dot(c, x, y, 2.5 + r() * 2); }
    },
  }],
  ["halftone", "still", "mauve", ["Rasterdruck", "Punkte wachsen zu Verläufen"], ["Retino", "Punti che crescono in sfumature"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 14, (x, y) => { const v = (Math.sin(x / 260) + Math.cos(y / 180) + 2) / 4; fill(c, P, v > .5 ? P.c.mauve : P.c.blue, .5); dot(c, x + 7, y + 7, v * 6.5); });
    },
  }],
  ["stained-glass", "still", "red", ["Kirchenfenster", "Bleiverglasung mit farbigen Scheiben"], ["Vetrata", "Vetri colorati legati a piombo"], {
    draw(c, s, E) {
      const r = rnd(605), { P } = E, n = 80, cols = Math.ceil(E.w / n) + 2, rows = Math.ceil(E.h / n) + 2;
      const pt = many(cols * rows, k => [(k % cols - .5) * n + (r() - .5) * n * .9, ((k / cols | 0) - .5) * n + (r() - .5) * n * .9]);
      for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) { const a = j * cols + i; for (const tri of [[pt[a], pt[a + 1], pt[a + cols + 1], pt[a + cols]]]) { fill(c, P, L(P, r() * 6), .28); path(c, tri, true); c.fill(); stroke(c, P, P.fg, .4, 4); c.stroke(); } }
    },
  }],
  ["weaving", "still", "orange", ["Gewebe", "Kette und Schuss in Logofarben"], ["Tessitura", "Ordito e trama nei colori del logo"], {
    draw(c, s, E) {
      const { P } = E, k = 18;
      for (let y = 0, j = 0; y < E.h; y += k, j++) for (let x = 0, i = 0; x < E.w; x += k, i++) {
        const over = (i + j) % 2;
        fill(c, P, L(P, over ? Math.floor(i / 3) : Math.floor(j / 3) + 3), over ? .4 : .28); rrect(c, x + (over ? 3 : 0), y + (over ? 0 : 3), over ? k - 6 : k, over ? k : k - 6, 3); c.fill();
      }
    },
  }],
  ["cross-stitch", "still", "red", ["Kreuzstich", "Gestickte Kreuzchen ergeben Muster"], ["Punto croce", "Crocette ricamate che formano motivi"], {
    draw(c, s, E) {
      const { P } = E, k = 14;
      grid(E, k, (x, y, i, j) => { const u = mod(i, 16) - 8, v = mod(j, 16) - 8; if (Math.abs(u) + Math.abs(v) < 7 && (Math.abs(u) + Math.abs(v)) % 3 !== 1) { stroke(c, P, L(P, (Math.abs(u) + Math.abs(v)) / 2), .55, 2); seg(c, x + 3, y + 3, x + k - 3, y + k - 3); seg(c, x + k - 3, y + 3, x + 3, y + k - 3); } });
    },
  }],
  ["brushstrokes", "still", "blue", ["Pinselstriche", "Breite Striche wie mit dem Borstenpinsel"], ["Pennellate", "Tratti larghi come col pennello"], {
    draw(c, s, E) {
      const r = rnd(606), { P } = E;
      for (let i = 0; i < dens(E, 30000, 10, 40); i++) {
        const x = r() * E.w, y = r() * E.h, a = (r() - .5) * 1.2, len = 120 + r() * 200, col = L(P, i);
        for (let b = 0; b < 14; b++) { stroke(c, P, col, .08 + r() * .12, 2); const o = (b - 7) * 2.5; curve(c, u => y + o + Math.sin((u - x) / 60) * 10 + (u - x) * Math.tan(a), x + r() * 10, x + len - r() * 30, 6); c.stroke(); }
      }
    },
  }],
  ["watercolor", "still", "blue", ["Aquarell", "Durchscheinende Farbflecken"], ["Acquerello", "Macchie di colore trasparenti"], {
    draw(c, s, E) {
      const r = rnd(607), { P } = E;
      for (let i = 0; i < dens(E, 40000, 8, 30); i++) {
        const x = r() * E.w, y = r() * E.h, rr = 50 + r() * 90, col = L(P, i);
        for (let l = 0; l < 5; l++) { fill(c, P, col, .06); c.beginPath(); for (let k = 0; k <= 24; k++) { const a = k / 24 * TAU, q = rr * (.7 + noise(Math.cos(a) * 2 + i + l, Math.sin(a) * 2) * .6); k ? c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : c.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.fill(); }
      }
    },
  }],
  ["cutout", "still", "green", ["Papierschnitt", "Geschichtete Hügel aus Tonpapier"], ["Carta ritagliata", "Colline a strati di cartoncino"], {
    draw(c, s, E) {
      const { P } = E;
      for (let k = 0; k < 7; k++) {
        const base = E.h * (.25 + k * .11), pts = [[0, E.h]];
        for (let x = 0; x <= E.w + 20; x += 20) pts.push([x, base + Math.sin(x / (150 + k * 30) + k * 2) * 40 + noise(x / 90, k) * 30]);
        pts.push([E.w, E.h]); fill(c, P, L(P, k), .16 + k * .03); path(c, pts, true); c.fill(); stroke(c, P, P.bg, .6, 2); c.stroke();
      }
    },
  }],
  ["op-art", "still", "mauve", ["Op-Art", "Schachbrett, das sich zu wölben scheint"], ["Op art", "Scacchiera che sembra curvarsi"], {
    draw(c, s, E) {
      const { P } = E, cx = E.w / 2, cy = E.h / 2;
      grid(E, 30, (x, y, i, j) => { const d = Math.hypot(x - cx, y - cy), k = 1 - .45 * Math.exp(-d * d / 120000); if ((i + j) % 2) { fill(c, P, P.fg, .1); c.fillRect(cx + (x - cx) * k, cy + (y - cy) * k, 30 * k, 30 * k); } });
    },
  }],
  ["memphis", "still", "yellow", ["Memphis-Design", "Zickzack, Punkte und Kringel"], ["Design Memphis", "Zigzag, puntini e ghirigori"], {
    draw(c, s, E) {
      const r = rnd(608), { P } = E;
      for (let i = 0; i < dens(E, 7000, 40, 180); i++) {
        const x = r() * E.w, y = r() * E.h, k = r() * 5 | 0, col = L(P, i);
        fill(c, P, col, .4); stroke(c, P, col, .55, 3);
        if (k === 0) { path(c, many(6, n => [x + n * 10, y + (n % 2) * 10]), false); c.stroke(); }
        else if (k === 1) dot(c, x, y, 6 + r() * 8);
        else if (k === 2) { curve(c, u => y + Math.sin((u - x) / 8) * 6, x, x + 60, 3); c.stroke(); }
        else if (k === 3) { shape(c, 2, x, y, 12 + r() * 10, r() * TAU); c.fill(); }
        else { fill(c, P, col, .5); for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) dot(c, x + a * 9, y + b * 9, 2); }
      }
    },
  }],
  ["art-deco", "still", "orange", ["Art déco", "Fächer und Strahlenbögen"], ["Art déco", "Ventagli e archi a raggiera"], {
    draw(c, s, E) {
      const { P } = E;
      for (let y = 0, row = 0; y < E.h + 80; y += 60, row++) for (let x = (row % 2) * 60; x < E.w + 60; x += 120) {
        for (let k = 4; k > 0; k--) { fill(c, P, k % 2 ? P.c.orange : P.bg, k % 2 ? .25 : 1); c.beginPath(); c.arc(x, y, k * 15, Math.PI, TAU); c.fill(); }
        stroke(c, P, P.c.orange, .4, 1.2); for (let a = 1; a < 8; a++) seg(c, x, y, x + Math.cos(Math.PI + a / 8 * Math.PI) * 60, y + Math.sin(Math.PI + a / 8 * Math.PI) * 60);
      }
    },
  }],
  ["color-wheel", "still", "red", ["Farbkreis", "Die sechs Logofarben im Kreis"], ["Cerchio dei colori", "I sei colori del logo in cerchio"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [cx, cy, rr] of [[E.w * .15, E.h * .35, 140], [E.w * .85, E.h * .7, 170]]) for (let ringI = 0; ringI < 3; ringI++) for (let k = 0; k < 6; k++) {
        fill(c, P, L(P, k + ringI), .2 + ringI * .12); c.beginPath(); c.arc(cx, cy, rr - ringI * 40, k / 6 * TAU, (k + 1) / 6 * TAU); c.arc(cx, cy, rr - ringI * 40 - 36, (k + 1) / 6 * TAU, k / 6 * TAU, true); c.closePath(); c.fill();
      }
    },
  }],
  ["collage", "still", "mauve", ["Collage", "Ausgerissene Schnipsel übereinander"], ["Collage", "Ritagli strappati sovrapposti"], {
    draw(c, s, E) {
      const r = rnd(609), { P } = E;
      for (let i = 0; i < dens(E, 9000, 40, 160); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * 1, 1, () => {
        const w = 40 + r() * 100, h = 30 + r() * 80, pts = [];
        for (let k = 0; k <= 8; k++) pts.push([-w / 2 + k * w / 8, -h / 2 + (r() - .5) * 6]); for (let k = 0; k <= 8; k++) pts.push([w / 2 - k * w / 8, h / 2 + (r() - .5) * 6]);
        fill(c, P, r() < .4 ? P.surface : L(P, r() * 6), r() < .4 ? .9 : .2); path(c, pts, true); c.fill();
        if (r() < .3) { stroke(c, P, P.fg, .2); for (let l = -h / 2 + 10; l < h / 2 - 5; l += 8) seg(c, -w / 2 + 6, l, w / 2 - 6, l); }
      });
    },
  }],
  ["linocut", "still", "blue", ["Linolschnitt", "Geschnitzte Rillen um eine Sonne"], ["Linoleografia", "Solchi incisi attorno a un sole"], {
    draw(c, s, E) {
      const r = rnd(610), { P } = E;
      for (const [cx, cy] of [[E.w * .2, E.h * .3], [E.w * .8, E.h * .75]]) {
        for (let rr = 40; rr < 400; rr += 14) { stroke(c, P, P.fg, .2, 4 + r() * 2); c.beginPath(); for (let k = 0; k <= 60; k++) { const a = k / 60 * TAU, q = rr + (r() - .5) * 4; k ? c.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : c.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } c.stroke(); }
        fill(c, P, P.c.orange, .45); dot(c, cx, cy, 32);
      }
    },
  }],
  ["cubism", "still", "orange", ["Kubismus", "Gebrochene Flächen in Ocker und Blau"], ["Cubismo", "Piani spezzati in ocra e blu"], {
    draw(c, s, E) {
      const r = rnd(611), { P } = E;
      for (let i = 0; i < dens(E, 4000, 80, 400); i++) { const x = r() * E.w, y = r() * E.h, n = 3 + (r() * 3 | 0), sz = 20 + r() * 70; fill(c, P, [P.c.orange, P.c.blue, P.muted, P.c.yellow][r() * 4 | 0], .1 + r() * .14); path(c, many(n, k => [x + Math.cos(k / n * TAU + r()) * sz, y + Math.sin(k / n * TAU + r()) * sz]), true); c.fill(); stroke(c, P, P.fg, .12); c.stroke(); }
    },
  }],
  ["zentangle", "still", "green", ["Zentangle", "Gekritzelte Muster in Feldern"], ["Zentangle", "Motivi scarabocchiati in riquadri"], {
    draw(c, s, E) {
      const r = rnd(612), { P } = E;
      grid(E, 100, (x, y, i, j) => {
        const k = mod(i * 3 + j * 5, 5); stroke(c, P, P.fg, .3, 1.2); c.strokeRect(x + 4, y + 4, 92, 92);
        stroke(c, P, L(P, k), .45, 1.2);
        if (k === 0) for (let d = 8; d < 92; d += 8) seg(c, x + 4 + d, y + 4, x + 4, y + 4 + d);
        else if (k === 1) for (let a = 12; a < 92; a += 14) for (let b = 12; b < 92; b += 14) ring(c, x + 4 + a, y + 4 + b, 4);
        else if (k === 2) for (let d = 10; d < 92; d += 10) { curve(c, u => y + 4 + d + Math.sin(u / 6) * 3, x + 6, x + 94, 3); c.stroke(); }
        else if (k === 3) for (let q = 6; q < 46; q += 7) c.strokeRect(x + 50 - q, y + 50 - q, q * 2, q * 2);
        else for (let n = 0; n < 20; n++) { const px = x + 10 + r() * 80, py = y + 10 + r() * 80; fill(c, P, L(P, k), .4); dot(c, px, py, 1 + r() * 4); }
      });
    },
  }],
  ["palette", "still", "yellow", ["Malerpalette", "Paletten mit Farbklecksen"], ["Tavolozza", "Tavolozze con macchie di colore"], {
    draw(c, s, E) {
      const r = rnd(613), { P } = E;
      for (let i = 0; i < dens(E, 70000, 4, 14); i++) at(c, r() * E.w, r() * E.h, r() * TAU, .8 + r() * .5, () => {
        fill(c, P, P.surface, .95); c.beginPath(); c.ellipse(0, 0, 90, 64, 0, 0, TAU); c.fill(); stroke(c, P, P.line, 1.5); c.stroke();
        fill(c, P, P.bg, 1); dot(c, -50, 20, 12);
        for (let k = 0; k < 6; k++) { const a = -2.6 + k * .55; fill(c, P, L(P, k), .7); dot(c, Math.cos(a) * 62, Math.sin(a) * 42, 11); }
      });
    },
  }],
  // ----- motion -----
  ["bauhaus-spin", "motion", "red", ["Bauhaus in Bewegung", "Formen drehen und tauschen ihre Farbe"], ["Bauhaus in movimento", "Forme che ruotano e cambiano colore"], {
    draw(c, s, E) { const { P } = E; grid(E, 120, (x, y, i, j) => { const k = mod(i + j, 4); fill(c, P, L(P, i + j + Math.floor(E.t / 2000)), .3); shape(c, k, x + 60, y + 60, 34, E.t / (1500 + mod(i * 7 + j, 5) * 400) * (k % 2 ? 1 : -1)); c.fill(); }); },
  }],
  ["mondrian-shift", "motion", "blue", ["Wandernder Mondrian", "Die Linien verschieben sich langsam"], ["Mondrian mobile", "Le linee si spostano lentamente"], {
    draw(c, s, E) {
      const { P } = E, xs = many(5, k => E.w * (k + 1) / 6 + Math.sin(E.t / 4000 + k * 2) * 60), ys = many(3, k => E.h * (k + 1) / 4 + Math.cos(E.t / 5000 + k) * 50);
      const xb = [0, ...xs, E.w], yb = [0, ...ys, E.h];
      for (let j = 0; j < yb.length - 1; j++) for (let i = 0; i < xb.length - 1; i++) if ((i * 3 + j * 5) % 4 === 0) { fill(c, P, [P.c.red, P.c.yellow, P.c.blue][(i + j) % 3], .35); c.fillRect(xb[i], yb[j], xb[i + 1] - xb[i], yb[j + 1] - yb[j]); }
      stroke(c, P, P.fg, .45, 6); for (const x of xs) seg(c, x, 0, x, E.h); for (const y of ys) seg(c, 0, y, E.w, y);
    },
  }],
  ["moire", "motion", "mauve", ["Moiré", "Zwei Linienfelder überlagern sich"], ["Moiré", "Due campi di linee che si sovrappongono"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [cx, cy, sp] of [[E.w * .5, E.h * .5, 0], [E.w * .5 + Math.cos(E.t / 3000) * 60, E.h * .5 + Math.sin(E.t / 3000) * 60, 1]]) { stroke(c, P, sp ? P.c.mauve : P.fg, .2, 2); for (let rr = 8; rr < Math.hypot(E.w, E.h) * .6; rr += 10) ring(c, cx, cy, rr); }
    },
  }],
  ["drips", "motion", "red", ["Farbläufer", "Farbe läuft von oben herab"], ["Colature", "Colore che cola dall'alto"], {
    init: E => many(Math.ceil(E.w / 26), i => ({ x: i * 26 + 13 + (R() - .5) * 10, len: R() * E.h * .3, v: .005 + R() * .03, w: 4 + R() * 8, col: R() * 6 | 0 })),
    draw(c, s, E) {
      const { P } = E;
      for (const d of s) { d.len += d.v * E.dt; if (d.len > E.h * 1.1) { d.len = 0; d.col = R() * 6 | 0; } fill(c, P, L(P, d.col), .35); c.fillRect(d.x - d.w / 2, 0, d.w, d.len); dot(c, d.x, d.len, d.w * .75); }
    },
  }],
  ["splatter", "motion", "orange", ["Spritzer", "Farbe tropft und spritzt wie bei Pollock"], ["Schizzi", "Colore che gocciola e schizza come Pollock"], {
    init: () => ({ marks: [], next: 0 }),
    draw(c, s, E) {
      const { P } = E;
      if (E.t > s.next) { s.next = E.t + 300; const x = R() * E.w, y = R() * E.h, col = R() * 6 | 0; s.marks.push({ x, y, col, t0: E.t, d: many(12, () => [(R() - .5) * 80, (R() - .5) * 80, 1 + R() * 5]) }); }
      s.marks = s.marks.filter(m => E.t - m.t0 < 12000);
      for (const m of s.marks) { const k = 1 - (E.t - m.t0) / 12000, g = clamp((E.t - m.t0) / 200, 0, 1); fill(c, P, L(P, m.col), .5 * k); dot(c, m.x, m.y, 10 * g); for (const [dx, dy, rr] of m.d) dot(c, m.x + dx * g, m.y + dy * g, rr); }
    },
  }],
  ["mobile", "motion", "blue", ["Mobile", "Hängende Formen wie von Calder"], ["Mobile", "Forme sospese come quelle di Calder"], {
    draw(c, s, E) {
      const { P } = E;
      const arm = (x, y, len, d, t) => {
        const a = Math.sin(E.t / (2200 + d * 600) + t) * .25;
        const x1 = x - Math.cos(a) * len, y1 = y + Math.sin(a) * len, x2 = x + Math.cos(a) * len * .7, y2 = y - Math.sin(a) * len * .7;
        stroke(c, P, P.fg, .45, 1.5); seg(c, x1, y1, x2, y2);
        for (const [px, py, k] of [[x1, y1, 0], [x2, y2, 1]]) { seg(c, px, py, px, py + 40); if (d > 0 && k) arm(px, py + 40, len * .7, d - 1, t + 2); else { fill(c, P, L(P, d * 2 + k + t), .55); c.beginPath(); c.ellipse(px, py + 52, 16 - d, 12 - d, a, 0, TAU); c.fill(); } }
      };
      for (const [x, t] of [[E.w * .2, 0], [E.w * .8, 3]]) { stroke(c, P, P.fg, .45, 1.5); seg(c, x, 0, x, 60); arm(x, 60, Math.min(160, E.w * .12), 3, t); }
    },
  }],
  ["tops", "motion", "yellow", ["Farbkreisel", "Kreisel drehen sich, bis die Farben verschwimmen"], ["Trottole", "Trottole che girano finché i colori si mescolano"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 150, (x, y, i, j) => { const sp = E.t / (60 + mod(i + j, 5) * 40), wob = Math.sin(E.t / 700 + i) * .15; for (let k = 0; k < 6; k++) { fill(c, P, L(P, k), .35); c.beginPath(); c.moveTo(x + 75, y + 75); c.ellipse(x + 75, y + 75, 50, 50 * (.4 + Math.abs(wob)), wob, sp + k / 6 * TAU, sp + (k + 1) / 6 * TAU); c.closePath(); c.fill(); } stroke(c, P, P.fg, .4, 2); seg(c, x + 75, y + 75, x + 75 + wob * 60, y + 30); });
    },
  }],
  ["brush-paint", "motion", "green", ["Malen", "Ein Pinsel zieht langsam breite Bahnen"], ["Dipingere", "Un pennello che stende piano larghe pennellate"], {
    init: () => ({ strokes: [], cur: null }),
    draw(c, s, E) {
      const { P } = E;
      if (!s.cur) s.cur = { y: R() * E.h, a: (R() - .5) * .4, col: R() * 6 | 0, x0: -40, k: 0, dir: R() < .5 ? 1 : -1 };
      s.cur.k += E.dt * .25; const len = E.w + 80;
      if (s.cur.k > len) { s.strokes.push(s.cur); s.cur = null; if (s.strokes.length > 12) s.strokes.shift(); }
      for (const st of s.cur ? s.strokes.concat([s.cur]) : s.strokes) {
        const end = Math.min(st.k, len), col = L(P, st.col);
        for (let b = 0; b < 10; b++) { stroke(c, P, col, .07, 3); const o = (b - 5) * 3; curve(c, u => st.y + o + Math.sin(u / 140 + st.col) * 30 + (u - E.w / 2) * Math.tan(st.a), st.dir > 0 ? -40 : E.w + 40 - end, st.dir > 0 ? end - 40 : E.w + 40, 10); c.stroke(); }
      }
    },
  }],
  ["rothko", "motion", "red", ["Farbfelder", "Große Farbflächen atmen leise"], ["Campi di colore", "Grandi superfici colorate che respirano piano"], {
    draw(c, s, E) {
      const { P } = E;
      for (let k = 0; k < 3; k++) { const y = 30 + k * (E.h - 60) / 3, h = (E.h - 60) / 3 - 24, br = (Math.sin(E.t / 3000 + k * 2) + 1) / 2; fill(c, P, L(P, k * 2 + 1), .16 + br * .14); rrect(c, 30, y, E.w - 60, h, 20); c.fill(); fill(c, P, L(P, k * 2 + 1), .08); rrect(c, 40, y + 10, E.w - 80, h - 20, 18); c.fill(); }
    },
  }],
  ["tile-fill", "motion", "blue", ["Mosaik legen", "Steinchen werden nach und nach gesetzt"], ["Posare il mosaico", "Tessere posate una dopo l'altra"], {
    draw(c, s, E) {
      const { P } = E, sz = 22, cols = Math.ceil(E.w / sz), n = cols * Math.ceil(E.h / sz), k = Math.floor(mod(E.t / 8, n * 1.3));
      for (let i = 0; i < Math.min(k, n); i++) { const order = (i * 7919) % n, x = (order % cols) * sz, y = Math.floor(order / cols) * sz, v = noise(x / 300, y / 300) * 6; fill(c, P, L(P, v), .35); rrect(c, x + 2, y + 2, sz - 4, sz - 4, 3); c.fill(); }
    },
  }],
  ["bloom", "motion", "mauve", ["Farbblüte", "Aquarelltropfen breiten sich im Papier aus"], ["Fioritura di colore", "Gocce d'acquerello che si allargano nella carta"], {
    init: () => ({ list: [], next: 0 }),
    draw(c, s, E) {
      const { P } = E;
      if (E.t > s.next) { s.next = E.t + 1400; s.list.push({ x: R() * E.w, y: R() * E.h, t0: E.t, col: R() * 6 | 0, seed: R() * 99 }); }
      s.list = s.list.filter(b => E.t - b.t0 < 10000);
      for (const b of s.list) { const k = (E.t - b.t0) / 10000, rr = 30 + (1 - (1 - Math.min(1, k * 3)) ** 3) * 120; fill(c, P, L(P, b.col), .14 * (1 - k)); for (let l = 0; l < 3; l++) { c.beginPath(); for (let q = 0; q <= 24; q++) { const a = q / 24 * TAU, rad = rr * (.75 + noise(Math.cos(a) * 1.5 + b.seed + l, Math.sin(a) * 1.5) * .5); q ? c.lineTo(b.x + Math.cos(a) * rad, b.y + Math.sin(a) * rad) : c.moveTo(b.x + Math.cos(a) * rad, b.y + Math.sin(a) * rad); } c.fill(); } }
    },
  }],
  ["shapes-drift", "motion", "green", ["Formenflug", "Bauhausformen treiben durch den Raum"], ["Forme in volo", "Forme Bauhaus che fluttuano nello spazio"], {
    init: E => swarm(E, dens(E, 20000, 14, 60), () => ({ k: R() * 4 | 0, r: 10 + R() * 26, vr: (R() - .5) * .001 })),
    draw(c, s, E) { for (const p of s) { p.x = wrap(p.x + p.vx * E.dt, E.w, 40); p.y = wrap(p.y + p.vy * E.dt, E.h, 40); fill(c, E.P, L(E.P, p.i), .35); shape(c, p.k, p.x, p.y, p.r, E.t * p.vr); c.fill(); } },
  }],
  ["loom", "motion", "orange", ["Webstuhl", "Das Schiffchen webt Reihe um Reihe"], ["Telaio", "La spoletta tesse fila dopo fila"], {
    draw(c, s, E) {
      const { P } = E, rowH = 10, rows = Math.floor(E.h / rowH), prog = mod(E.t / 400, rows + 20), cur = Math.floor(prog), part = prog - cur;
      stroke(c, P, P.muted, .25); for (let x = 0; x < E.w; x += 10) seg(c, x, 0, x, E.h);
      for (let j = 0; j < Math.min(cur, rows); j++) { fill(c, P, L(P, Math.floor(j / 4)), .35); c.fillRect(0, E.h - (j + 1) * rowH, E.w, rowH - 2); }
      if (cur < rows) { const y = E.h - (cur + 1) * rowH, dir = cur % 2, x = dir ? E.w * (1 - part) : E.w * part; fill(c, P, L(P, Math.floor(cur / 4)), .35); c.fillRect(dir ? x : 0, y, dir ? E.w - x : x, rowH - 2); fill(c, P, P.c.orange, .7); c.beginPath(); c.ellipse(x, y + rowH / 2, 22, 6, 0, 0, TAU); c.fill(); }
    },
  }],
  ["spin-art", "motion", "red", ["Schleuderbild", "Farbe wird von einer drehenden Scheibe geschleudert"], ["Spin art", "Colore lanciato da un disco che gira"], {
    init: () => ({ drops: [] }),
    draw(c, s, E) {
      const { P } = E;
      for (const [cx, cy] of [[E.w * .2, E.h * .5], [E.w * .8, E.h * .5]]) { if (R() < .3) s.drops.push({ cx, cy, r: 4, a: R() * TAU, col: R() * 6 | 0 }); }
      for (const d of s.drops) { if (d.r < 160) { d.r += .08 * E.dt; d.a += .002 * E.dt; } }
      if (s.drops.length > 900) s.drops.splice(0, 100);
      for (const d of s.drops) { fill(c, P, L(P, d.col), .35); dot(c, d.cx + Math.cos(d.a + E.t / 900) * d.r, d.cy + Math.sin(d.a + E.t / 900) * d.r, 3); }
    },
  }],
  ["dancers", "motion", "mauve", ["Tanz", "Strichfiguren tanzen im Takt"], ["Danza", "Omini stilizzati che ballano a tempo"], {
    draw(c, s, E) { const { P } = E; for (let x = 60, k = 0; x < E.w; x += 120, k++) for (const y of [E.h * .4, E.h * .9]) stickFigure(c, P, x, y - Math.abs(Math.sin(E.t / 400 + k)) * 12, E.t / 400 + k * .7, L(P, k)); },
  }],
  ["neon", "motion", "blue", ["Neonschrift", "Leuchtlinien zeichnen Formen nach"], ["Insegne al neon", "Linee luminose che ripercorrono forme"], {
    draw(c, s, E) {
      const { P } = E, shapes = [u => [Math.cos(u * TAU) * 80, Math.sin(u * TAU) * 80], u => { const k = u * 4, side = Math.floor(k), f = k - side; return [[-80 + f * 160, -80], [80, -80 + f * 160], [80 - f * 160, 80], [-80, 80 - f * 160]][side % 4]; }, u => { const a = u * TAU * 2.5; return [Math.cos(a) * 80 * Math.cos(u * TAU * 5) , Math.sin(a) * 80 * Math.cos(u * TAU * 5)]; }];
      shapes.forEach((f, i) => { const cx = (i + .5) * E.w / 3, cy = E.h * .5, k = mod(E.t / 3000 + i * .3, 1); for (const [lw, a] of [[10, .08], [3, .6]]) { stroke(c, P, L(P, i * 2), a, lw); c.lineCap = "round"; param(c, u => { const [x, y] = f(u * k); return [cx + x, cy + y]; }, 160); c.stroke(); } c.lineCap = "butt"; });
    },
  }],
  ["shadow-theater", "motion", "orange", ["Schattentheater", "Ein Vogel fliegt über die Leinwand"], ["Teatro d'ombre", "Un uccello che vola sullo schermo"], {
    draw(c, s, E) {
      const { P } = E, x = mod(E.t * .08, E.w + 300) - 150, y = E.h * .4 + Math.sin(E.t / 800) * 60, flap = Math.sin(E.t / 160);
      const g = c.createRadialGradient(E.w / 2, E.h / 2, 0, E.w / 2, E.h / 2, Math.max(E.w, E.h) * .6); g.addColorStop(0, P.c.yellow); g.addColorStop(1, clear(P.c.yellow)); A(c, .25, P); c.fillStyle = g; c.fillRect(0, 0, E.w, E.h);
      fill(c, P, P.fg, .3); c.beginPath(); c.ellipse(x, y, 40, 14, 0, 0, TAU); c.fill(); dot(c, x + 42, y - 6, 10); path(c, [[x + 50, y - 6], [x + 64, y - 2], [x + 50, y]], true); c.fill();
      path(c, [[x - 10, y - 4], [x - 40, y - 4 - flap * 60], [x + 20, y - 4]], true); c.fill(); path(c, [[x - 36, y], [x - 70, y - 14], [x - 70, y + 14]], true); c.fill();
      fill(c, P, P.fg, .3); for (let k = 0; k < E.w; k += 70) { path(c, [[k, E.h], [k + 35, E.h - 80 - (k * 7 % 50)], [k + 70, E.h]], true); c.fill(); }
    },
  }],
  ["string-art", "motion", "green", ["Fadengrafik", "Fäden zwischen wandernden Nägeln"], ["String art", "Fili tesi tra chiodi che si spostano"], {
    draw(c, s, E) {
      const { P } = E, n = 60, off = Math.floor(E.t / 300);
      for (const [cx, cy, rr, m] of [[E.w * .2, E.h * .5, Math.min(E.w, E.h) * .3, 7], [E.w * .8, E.h * .5, Math.min(E.w, E.h) * .3, 11]]) for (let i = 0; i < n; i++) { const a = i / n * TAU, b = (i * m + off) % n / n * TAU; stroke(c, P, L(P, i / 10), .3, 1); seg(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cx + Math.cos(b) * rr, cy + Math.sin(b) * rr); }
    },
  }],
  ["bead-curtain", "motion", "red", ["Perlenvorhang", "Perlenschnüre schwingen leicht"], ["Tenda di perline", "Fili di perline che oscillano piano"], {
    draw(c, s, E) {
      const { P } = E;
      for (let x = 12, k = 0; x < E.w; x += 24, k++) { const sw = Math.sin(E.t / 1200 + k * .3) * 10; for (let y = 10, b = 0; y < E.h; y += 16, b++) { fill(c, P, L(P, k + b), .45); dot(c, x + sw * (y / E.h), y, 4.5); } }
    },
  }],
  ["kinetic-rods", "motion", "yellow", ["Kinetische Stäbe", "Ein Feld aus Stäben dreht sich wellenförmig"], ["Aste cinetiche", "Un campo di aste che ruota a onde"], {
    draw(c, s, E) { const { P } = E; grid(E, 30, (x, y, i, j) => { const a = Math.sin(i * .25 + E.t / 1500) + Math.cos(j * .3 - E.t / 1900); stroke(c, P, L(P, a * 2 + 3), .4, 2.5); c.lineCap = "round"; seg(c, x + 15 - Math.cos(a) * 11, y + 15 - Math.sin(a) * 11, x + 15 + Math.cos(a) * 11, y + 15 + Math.sin(a) * 11); c.lineCap = "butt"; }); },
  }],
  // ----- touch -----
  ["paint-touch", "touch", "blue", ["Aquarellpinsel", "Der Zeiger malt verlaufende Farbe"], ["Pennello ad acquerello", "Il puntatore dipinge colore che sfuma"], {
    init: () => ({ dabs: [], col: 0 }),
    draw(c, s, E) {
      const { P } = E;
      if (E.ptr.on && !E.still) { const l = s.dabs[s.dabs.length - 1]; if (!l || Math.hypot(l.x - E.ptr.x, l.y - E.ptr.y) > 8) s.dabs.push({ x: E.ptr.x, y: E.ptr.y, t: E.t, col: Math.floor(E.t / 3000) % 6 }); }
      s.dabs = s.dabs.filter(d => E.t - d.t < 8000);
      for (const d of s.dabs) { const k = (E.t - d.t) / 8000; fill(c, P, L(P, d.col), .12 * (1 - k)); dot(c, d.x, d.y, 18 + k * 20); }
      return !s.dabs.length && !E.ptr.on;
    },
  }],
  ["spray", "touch", "red", ["Spraydose", "Feiner Sprühnebel am Zeiger"], ["Bomboletta", "Nebbia di spray al puntatore"], {
    init: () => ({ dots: [] }),
    draw(c, s, E) {
      const { P } = E;
      if (E.ptr.on && !E.still) for (let k = 0; k < 14; k++) { const a = R() * TAU, rr = R() ** 2 * 40; s.dots.push([E.ptr.x + Math.cos(a) * rr, E.ptr.y + Math.sin(a) * rr, E.t, Math.floor(E.t / 2500) % 6]); }
      s.dots = s.dots.filter(d => E.t - d[2] < 6000); if (s.dots.length > 3000) s.dots.splice(0, s.dots.length - 3000);
      for (const [x, y, t, col] of s.dots) { fill(c, P, L(P, col), .5 * (1 - (E.t - t) / 6000)); c.fillRect(x, y, 2, 2); }
      return !s.dots.length && !E.ptr.on;
    },
  }],
  ["color-mix", "touch", "yellow", ["Farben mischen", "Zwei Farbflecken mischen sich am Zeiger"], ["Mescolare i colori", "Due macchie di colore si mescolano al puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E; follow(s, E, E.w / 2 + Math.cos(E.t / 4000) * E.w * .25, E.h / 2, 200);
      for (const [x, y, col] of [[E.w * .3, E.h * .5, P.c.yellow], [E.w * .7, E.h * .5, P.c.blue], [s.x, s.y, P.c.red]]) { const g = c.createRadialGradient(x, y, 0, x, y, 260); g.addColorStop(0, col); g.addColorStop(1, clear(col)); A(c, .35, P); c.fillStyle = g; c.fillRect(x - 260, y - 260, 520, 520); }
      return false;
    },
  }],
  ["mosaic-touch", "touch", "green", ["Mosaik aufdecken", "Steinchen färben sich unter dem Zeiger"], ["Scoprire il mosaico", "Le tessere si colorano sotto il puntatore"], {
    init: E => { const t = []; grid(E, 24, (x, y) => t.push({ x, y, v: 0 })); return t; },
    draw(c, s, E) {
      const { P } = E; let busy = false;
      for (const t of s) {
        if (E.ptr.on && !E.still && Math.hypot(t.x + 12 - E.ptr.x, t.y + 12 - E.ptr.y) < 50) t.v = 1;
        else if (t.v > 0) { t.v = Math.max(0, t.v - E.dt / 6000); busy = true; }
        fill(c, P, t.v ? L(P, noise(t.x / 200, t.y / 200) * 6) : P.muted, t.v ? .2 + t.v * .35 : .07); rrect(c, t.x + 2, t.y + 2, 20, 20, 3); c.fill();
      }
      return !busy && !E.ptr.on;
    },
  }],
  ["glass-light", "touch", "mauve", ["Glaslicht", "Bleiglasfelder leuchten am Zeiger"], ["Luce sul vetro", "I vetri colorati si illuminano al puntatore"], {
    init: E => { const r = rnd(615), n = 90, cols = Math.ceil(E.w / n) + 2, rows = Math.ceil(E.h / n) + 2; const pt = many(cols * rows, k => [(k % cols - .5) * n + (r() - .5) * n * .8, ((k / cols | 0) - .5) * n + (r() - .5) * n * .8]); const cells = []; for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) { const a = j * cols + i, q = [pt[a], pt[a + 1], pt[a + cols + 1], pt[a + cols]]; cells.push({ q, cx: q.reduce((u, p) => u + p[0], 0) / 4, cy: q.reduce((u, p) => u + p[1], 0) / 4, col: r() * 6 | 0 }); } return { cells }; },
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, -999, 100);
      for (const cell of s.cells) { const k = f * Math.max(0, 1 - Math.hypot(cell.cx - s.x, cell.cy - s.y) / 200); fill(c, P, L(P, cell.col), .1 + k * .5); path(c, cell.q, true); c.fill(); stroke(c, P, P.fg, .35, 3); c.stroke(); }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["clay", "touch", "orange", ["Ton formen", "Der Zeiger drückt Mulden in eine Fläche"], ["Modellare l'argilla", "Il puntatore preme conche in una superficie"], {
    init: E => ({ dents: [] }),
    draw(c, s, E) {
      const { P } = E;
      if (E.ptr.on && !E.still) { const l = s.dents[s.dents.length - 1]; if (!l || Math.hypot(l[0] - E.ptr.x, l[1] - E.ptr.y) > 20) s.dents.push([E.ptr.x, E.ptr.y]); if (s.dents.length > 60) s.dents.shift(); }
      stroke(c, P, P.c.orange, .3, 1.2);
      for (let y = 10; y < E.h; y += 14) { const near2 = s.dents.filter(d => Math.abs(d[1] - y) < 100); curve(c, x => { let dy = 0; for (const [dx, dy0] of near2) { if (Math.abs(x - dx) > 100) continue; const d2 = (x - dx) ** 2 + (y - dy0) ** 2; dy += 14 * Math.exp(-d2 / 1600); } return y + dy; }, 0, E.w, 8); c.stroke(); }
      return true;
    },
  }],
  ["string-touch", "touch", "blue", ["Fadenspinne", "Fäden spannen sich vom Rand zum Zeiger"], ["Ragnatela di fili", "Fili tesi dal bordo al puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E; follow(s, E, E.w / 2 + Math.sin(E.t / 3000) * E.w * .3, E.h / 2 + Math.cos(E.t / 4000) * E.h * .3, 150);
      const n = 48;
      for (let k = 0; k < n; k++) { const u = k / n, per = 2 * (E.w + E.h), d = u * per, [x, y] = d < E.w ? [d, 0] : d < E.w + E.h ? [E.w, d - E.w] : d < 2 * E.w + E.h ? [E.w - (d - E.w - E.h), E.h] : [0, E.h - (d - 2 * E.w - E.h)]; stroke(c, P, L(P, k / 8), .3, 1); seg(c, x, y, s.x, s.y); }
      return false;
    },
  }],
  ["shape-stamp", "touch", "red", ["Formen stempeln", "Tippen setzt Kreis, Quadrat oder Dreieck"], ["Timbri di forme", "Tocca per mettere cerchio, quadrato o triangolo"], {
    init: () => ({ list: [] }),
    draw(c, s, E) {
      const { P } = E;
      for (const tap of E.ptr.taps.splice(0)) s.list.push({ x: tap.x, y: tap.y, k: R() * 4 | 0, col: R() * 6 | 0, rot: R() * TAU, t0: E.t });
      if (s.list.length > 50) s.list.shift();
      let busy = false;
      for (const m of s.list) { const k = clamp((E.t - m.t0) / 300, 0, 1); if (k < 1) busy = true; fill(c, P, L(P, m.col), .4); shape(c, m.k, m.x, m.y, 30 * (1.4 - .4 * k), m.rot); c.fill(); }
      return !busy;
    },
  }],
  ["mirror-draw", "touch", "green", ["Spiegelzeichnen", "Die Zeigerspur wird links und rechts gespiegelt"], ["Disegno a specchio", "La scia del puntatore riflessa a destra e sinistra"], {
    init: () => ({ pts: [] }),
    draw(c, s, E) {
      const { P } = E;
      if (E.ptr.on && !E.still) s.pts.push([E.ptr.x, E.ptr.y, E.t]);
      s.pts = s.pts.filter(p => E.t - p[2] < 6000);
      for (const m of [1, -1]) { stroke(c, P, m > 0 ? P.c.green : P.c.mauve, .55, 3); c.beginPath(); s.pts.forEach(([x, y, t], i) => { const xx = m > 0 ? x : E.w - x; i && t - s.pts[i - 1][2] < 200 ? c.lineTo(xx, y) : c.moveTo(xx, y); }); c.stroke(); }
      stroke(c, P, P.line, 1); c.setLineDash([4, 6]); seg(c, E.w / 2, 0, E.w / 2, E.h); c.setLineDash([]);
      return !s.pts.length && !E.ptr.on;
    },
  }],
  ["pixel-art", "touch", "yellow", ["Pixelbild", "Tippen färbt Pixel ein"], ["Pixel art", "Tocca per colorare i pixel"], {
    init: () => ({ px: new Map(), col: 0 }),
    draw(c, s, E) {
      const { P } = E, G = 20;
      for (const tap of E.ptr.taps.splice(0)) { const key = Math.floor(tap.x / G) + "," + Math.floor(tap.y / G); if (s.px.has(key)) s.px.delete(key); else s.px.set(key, s.col++ % 6); }
      if (E.ptr.on && !E.still) { const key = Math.floor(E.ptr.x / G) + "," + Math.floor(E.ptr.y / G); if (!s.px.has(key) && s.px.size < 2000) s.px.set(key, Math.floor(E.t / 1500) % 6); }
      stroke(c, P, P.line, .8); for (let x = 0; x < E.w; x += G) seg(c, x, 0, x, E.h); for (let y = 0; y < E.h; y += G) seg(c, 0, y, E.w, y);
      for (const [key, col] of s.px) { const [i, j] = key.split(",").map(Number); fill(c, P, L(P, col), .45); c.fillRect(i * G + 1, j * G + 1, G - 2, G - 2); }
      return true;
    },
  }],
]);
