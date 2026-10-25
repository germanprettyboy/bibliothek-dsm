/* Extra backgrounds 5/10: mathematics */
import { TAU, clamp, mod, rnd, R, many, dens, wrap, A, L, fill, stroke, dot, ring, seg, path, ngon, starPath, curve, param, text, at, swarm, grid, follow, def } from "./kit.js";

const PHI = (1 + Math.sqrt(5)) / 2;
const PI_DIGITS = "31415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094";
const isPrime = n => { if (n < 2) return false; for (let k = 2; k * k <= n; k++) if (n % k === 0) return false; return true; };
// Turtle path of an L-system: rules, axiom, iterations, angle; returns points (unit step)
function lsys(axiom, rules, n, ang, a0 = 0) {
  let sTxt = axiom;
  for (let i = 0; i < n; i++) sTxt = [...sTxt].map(ch => rules[ch] || ch).join("");
  let x = 0, y = 0, a = a0; const pts = [[0, 0]];
  for (const ch of sTxt) { if (ch === "F" || ch === "G") { x += Math.cos(a); y += Math.sin(a); pts.push([x, y]); } else if (ch === "+") a += ang; else if (ch === "-") a -= ang; }
  return pts;
}
// Fit points into a box (x, y, w, h)
function fit(pts, x, y, w, h) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), k = Math.min(w / (Math.max(...xs) - x0 || 1), h / (Math.max(...ys) - y0 || 1));
  return pts.map(([px, py]) => [x + (px - x0) * k, y + (py - y0) * k]);
}
function polyMorph(n, k, r) { // n-gon (n may be fractional) on radius r: points at 60 angles
  return many(61, i => { const a = i / 60 * TAU, sector = TAU / n, local = mod(a, sector) - sector / 2, rr = r * Math.cos(sector / 2) / Math.cos(local); const rad = rr + (r - rr) * k; return [Math.cos(a - Math.PI / 2) * rad, Math.sin(a - Math.PI / 2) * rad]; });
}

export default def("math", [
  ["fibonacci", "still", "yellow", ["Goldene Spirale", "Fibonacci-Quadrate mit Spirale"], ["Spirale aurea", "Quadrati di Fibonacci con spirale"], {
    draw(c, s, E) {
      const { P } = E, fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
      for (const [ox, oy, k] of [[E.w * .02, E.h * .05, Math.min(E.w, E.h) / 160], [E.w * .62, E.h * .45, Math.min(E.w, E.h) / 220]]) {
        let x = 0, y = 0, dir = 0, minX = 0, minY = 0, maxX = 1, maxY = 1;
        const sq = [[0, 0, 1]];
        for (let i = 1; i < fib.length; i++) {
          const f = fib[i];
          if (dir === 0) { x = maxX; y = minY; } else if (dir === 1) { x = maxX - f; y = maxY; } else if (dir === 2) { x = minX - f; y = maxY - f; } else { x = minX; y = minY - f; }
          sq.push([x, y, f]); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + f); maxY = Math.max(maxY, y + f); dir = (dir + 1) % 4;
        }
        sq.forEach(([x2, y2, f], i) => {
          fill(c, P, L(P, i), .12); c.fillRect(ox + (x2 - minX) * k, oy + (y2 - minY) * k, f * k, f * k);
          stroke(c, P, P.muted, .4); c.strokeRect(ox + (x2 - minX) * k, oy + (y2 - minY) * k, f * k, f * k);
          const corner = [[0, 1], [0, 0], [1, 0], [1, 1]][(i + 1) % 4], cx = ox + (x2 - minX + corner[0] * f) * k, cy = oy + (y2 - minY + corner[1] * f) * k, a0 = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][(i + 1) % 4];
          stroke(c, P, P.c.orange, .6, 2); c.beginPath(); c.arc(cx, cy, f * k, a0 + Math.PI / 2, a0 + Math.PI); c.stroke();
        });
      }
    },
  }],
  ["pascal", "still", "mauve", ["Pascal-Dreieck", "Ungerade Zahlen gefärbt: das Sierpinski-Muster erscheint"], ["Triangolo di Tartaglia", "Numeri dispari colorati: appare Sierpinski"], {
    draw(c, s, E) {
      const { P } = E, rows = Math.ceil(E.h / 24) + 1;
      let row = [1];
      for (let j = 0; j < rows; j++) {
        row.forEach((v, i) => { const x = E.w / 2 + (i - j / 2) * 28, y = 20 + j * 24; if (x < -20 || x > E.w + 20) return; fill(c, P, v % 2 ? L(P, j) : P.muted, v % 2 ? .45 : .12); dot(c, x, y, 9); if (j < 14) { fill(c, P, P.fg, .5); text(c, String(v), x, y + 1, 8, 600); } });
        row = [1, ...row.slice(1).map((v, i) => (v + row[i]) % 1000000), 1];
      }
    },
  }],
  ["ulam", "still", "blue", ["Ulam-Spirale", "Primzahlen auf einer Zahlenspirale"], ["Spirale di Ulam", "Numeri primi su una spirale di numeri"], {
    draw(c, s, E) {
      const { P } = E, k = 7; let x = E.w / 2, y = E.h / 2, n = 1, len = 1, dir = 0;
      const max = (Math.max(E.w, E.h) / k + 2) ** 2;
      while (n < max) {
        for (let rep = 0; rep < 2; rep++) {
          for (let i = 0; i < len; i++) { if (isPrime(n)) { fill(c, P, L(P, n % 6), .55); c.fillRect(x - 2, y - 2, 4, 4); } else { fill(c, P, P.muted, .08); c.fillRect(x - .5, y - .5, 1, 1); } x += [k, 0, -k, 0][dir]; y += [0, -k, 0, k][dir]; n++; }
          dir = (dir + 1) % 4;
        }
        len++;
      }
    },
  }],
  ["sierpinski", "still", "green", ["Sierpinski", "Dreiecke in Dreiecken"], ["Sierpinski", "Triangoli dentro triangoli"], {
    draw(c, s, E) {
      const { P } = E;
      const tri = (x, y, sz, d) => { if (d === 0 || sz < 6) { fill(c, P, L(P, Math.round(x / 97 + y / 61)), .35); path(c, [[x, y], [x + sz, y], [x + sz / 2, y - sz * .866]], true); c.fill(); return; } tri(x, y, sz / 2, d - 1); tri(x + sz / 2, y, sz / 2, d - 1); tri(x + sz / 4, y - sz * .433, sz / 2, d - 1); };
      const sz = Math.min(E.w * .45, E.h * 1.1); tri(-sz * .2, E.h, sz, 6); tri(E.w - sz * .8, E.h * .6, sz * .8, 6);
    },
  }],
  ["koch", "still", "blue", ["Koch-Schneeflocken", "Unendlich zackige Ränder"], ["Fiocchi di Koch", "Bordi infinitamente frastagliati"], {
    draw(c, s, E) {
      const r = rnd(401), { P } = E, pts = lsys("F--F--F", { F: "F+F--F+F" }, 3, Math.PI / 3);
      for (let i = 0; i < dens(E, 70000, 5, 18); i++) { const sz = 60 + r() * 120, x = r() * E.w, y = r() * E.h; stroke(c, P, L(P, i), .5, 1.2); path(c, fit(pts, x - sz / 2, y - sz / 2, sz, sz), true); c.stroke(); }
    },
  }],
  ["dragon", "still", "red", ["Drachenkurve", "Ein gefalteter Papierstreifen als Fraktal"], ["Curva del drago", "Una striscia di carta piegata come frattale"], {
    draw(c, s, E) {
      const { P } = E, pts = lsys("FX", { X: "X+YF+", Y: "-FX-Y" }, 12, Math.PI / 2);
      stroke(c, P, P.c.red, .45, 1); path(c, fit(pts, E.w * .55, E.h * .05, E.w * .42, E.h * .9)); c.stroke();
      stroke(c, P, P.c.blue, .45, 1); path(c, fit(pts.map(([x, y]) => [-x, y]), E.w * .03, E.h * .05, E.w * .42, E.h * .9)); c.stroke();
    },
  }],
  ["hilbert", "still", "green", ["Hilbert-Kurve", "Eine Linie, die die Fläche füllt"], ["Curva di Hilbert", "Una linea che riempie il piano"], {
    draw(c, s, E) {
      const { P } = E, pts = lsys("A", { A: "+BF-AFA-FB+", B: "-AF+BFB+FA-" }, 6, Math.PI / 2);
      const sz = Math.max(E.w, E.h) * 1.02;
      const fitted = fit(pts, (E.w - sz) / 2, (E.h - sz) / 2, sz, sz);
      for (let i = 0; i < 6; i++) { stroke(c, P, L(P, i), .35, 1.5); path(c, fitted.slice(i * fitted.length / 6, (i + 1) * fitted.length / 6 + 1)); c.stroke(); }
    },
  }],
  ["unit-circle", "still", "blue", ["Einheitskreis", "Sinus, Kosinus und Winkel"], ["Circonferenza goniometrica", "Seno, coseno e angoli"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 260, (x, y, i, j) => {
        const cx = x + 130, cy = y + 130, rr = 90, a = (i * 37 + j * 53) % 360 / 180 * Math.PI;
        stroke(c, P, P.muted, .3); seg(c, cx - 110, cy, cx + 110, cy); seg(c, cx, cy - 110, cx, cy + 110); ring(c, cx, cy, rr);
        const px = cx + Math.cos(a) * rr, py = cy - Math.sin(a) * rr;
        stroke(c, P, P.c.red, .6, 2); seg(c, px, py, px, cy); stroke(c, P, P.c.blue, .6, 2); seg(c, cx, cy, px, cy);
        stroke(c, P, P.fg, .45, 1.5); seg(c, cx, cy, px, py); stroke(c, P, P.c.orange, .6, 1.5); c.beginPath(); c.arc(cx, cy, 20, 0, -a, true); c.stroke();
        fill(c, P, P.fg, .6); dot(c, px, py, 3.5);
      });
    },
  }],
  ["plots", "still", "orange", ["Funktionsgraphen", "Sinus, Parabel und Exponentialkurve"], ["Grafici di funzioni", "Seno, parabola ed esponenziale"], {
    draw(c, s, E) {
      const { P } = E, ox = E.w / 2, oy = E.h / 2, u = 50;
      stroke(c, P, P.line, 1); for (let x = ox % u; x < E.w; x += u) seg(c, x, 0, x, E.h); for (let y = oy % u; y < E.h; y += u) seg(c, 0, y, E.w, y);
      stroke(c, P, P.muted, .6, 1.5); seg(c, 0, oy, E.w, oy); seg(c, ox, 0, ox, E.h);
      const plot = (f, col) => { stroke(c, P, col, .6, 2.5); curve(c, x => oy - f((x - ox) / u) * u, 0, E.w, 4); c.stroke(); };
      plot(Math.sin, P.c.red); plot(x => x * x / 4 - 2, P.c.blue); plot(x => Math.exp(x / 2) - 3, P.c.green); plot(x => Math.cos(x * 2) * 1.5, P.c.mauve);
    },
  }],
  ["pi", "still", "red", ["Kreiszahl", "Die Ziffern von π als Farbfelder"], ["Pi greco", "Le cifre di π come caselle colorate"], {
    draw(c, s, E) {
      const { P } = E, sz = 26; let k = 0;
      grid(E, sz, (x, y) => { const d = +PI_DIGITS[k++ % PI_DIGITS.length]; fill(c, P, d > 5 ? L(P, d) : P.muted, d > 5 ? .3 : .08 + d * .02); c.fillRect(x + 1, y + 1, sz - 2, sz - 2); fill(c, P, P.fg, .3); text(c, String(d), x + sz / 2, y + sz / 2 + 1, 12, 500); });
    },
  }],
  ["times-table", "still", "yellow", ["Einmaleins", "Das große Einmaleins als Farbtafel"], ["Tabellina", "La tavola pitagorica a colori"], {
    draw(c, s, E) {
      const { P } = E, sz = 36;
      grid(E, sz, (x, y, i, j) => { const a = mod(i, 12) + 1, b = mod(j, 12) + 1, v = a * b; fill(c, P, L(P, v % 6), .06 + (v / 144) * .35); c.fillRect(x + 1, y + 1, sz - 2, sz - 2); fill(c, P, P.fg, .35); text(c, String(v), x + sz / 2, y + sz / 2 + 1, 11, a === 1 || b === 1 ? 600 : 400); });
    },
  }],
  ["tangram", "still", "green", ["Tangram", "Sieben Teile, viele Figuren"], ["Tangram", "Sette pezzi, tante figure"], {
    draw(c, s, E) {
      const r = rnd(402), { P } = E;
      const pieces = [[[0, 0], [1, 0], [.5, .5]], [[0, 0], [.5, .5], [0, 1]], [[1, 0], [1, .5], [.75, .25]], [[.75, .25], [1, .5], [.75, .75], [.5, .5]], [[.5, .5], [.75, .75], [.25, .75]], [[0, 1], [.25, .75], [.75, .75], [.5, 1]], [[1, .5], [1, 1], [.5, 1]]];
      for (let i = 0; i < dens(E, 50000, 6, 22); i++) {
        const x = r() * E.w, y = r() * E.h, sz = 80 + r() * 60, rot = r() * TAU, spread = r() * 20;
        pieces.forEach((pc, k) => at(c, x, y, rot, 1, () => { const cx = pc.reduce((a, p) => a + p[0], 0) / pc.length - .5, cy = pc.reduce((a, p) => a + p[1], 0) / pc.length - .5; fill(c, P, L(P, k), .4); path(c, pc.map(([px, py]) => [(px - .5) * sz + cx * spread, (py - .5) * sz + cy * spread]), true); c.fill(); }));
      }
    },
  }],
  ["solids", "still", "mauve", ["Platonische Körper", "Würfel, Tetraeder und Oktaeder als Drahtmodell"], ["Solidi platonici", "Cubo, tetraedro e ottaedro in wireframe"], {
    draw(c, s, E) {
      const r = rnd(403), { P } = E;
      const solids = [
        [[[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]],
        [[[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]], [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]],
        [[[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [2, 5], [3, 4], [3, 5]]],
      ];
      for (let i = 0; i < dens(E, 40000, 8, 30); i++) {
        const [vs, es] = solids[i % 3], ax = r() * TAU, ay = r() * TAU, x0 = r() * E.w, y0 = r() * E.h, sz = 30 + r() * 30;
        const pr = vs.map(([x, y, z]) => { const x1 = x * Math.cos(ay) + z * Math.sin(ay), z1 = -x * Math.sin(ay) + z * Math.cos(ay), y1 = y * Math.cos(ax) - z1 * Math.sin(ax); return [x0 + x1 * sz, y0 + y1 * sz]; });
        stroke(c, P, L(P, i), .55, 1.5); for (const [a, b] of es) seg(c, pr[a][0], pr[a][1], pr[b][0], pr[b][1]);
        fill(c, P, L(P, i), .6); for (const [x, y] of pr) dot(c, x, y, 2.5);
      }
    },
  }],
  ["pentagrams", "still", "orange", ["Pentagramme", "Ineinander geschachtelt im goldenen Schnitt"], ["Pentagrammi", "Annidati secondo la sezione aurea"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 200, (x, y, i, j) => { let rr = 90, rot = -Math.PI / 2 + (i + j) * .2; for (let k = 0; k < 5; k++) { stroke(c, P, L(P, k + i), .5, 1.5); starPath(c, x + 100, y + 100, rr, rr / PHI / PHI, 5, rot); c.stroke(); rr /= PHI * PHI; rot += Math.PI / 5; } });
    },
  }],
  ["venn", "still", "mauve", ["Mengendiagramme", "Überlappende Kreise"], ["Diagrammi di Venn", "Cerchi che si sovrappongono"], {
    draw(c, s, E) {
      const r = rnd(404), { P } = E;
      for (let i = 0; i < dens(E, 60000, 5, 20); i++) { const x = r() * E.w, y = r() * E.h, rr = 40 + r() * 50; for (let k = 0; k < 3; k++) { const a = k / 3 * TAU - Math.PI / 2; fill(c, P, L(P, i + k * 2), .18); dot(c, x + Math.cos(a) * rr * .55, y + Math.sin(a) * rr * .55, rr); stroke(c, P, L(P, i + k * 2), .5, 1.5); ring(c, x + Math.cos(a) * rr * .55, y + Math.sin(a) * rr * .55, rr); } }
    },
  }],
  ["number-lines", "still", "blue", ["Zahlenstrahlen", "Brüche und ganze Zahlen auf Strichen"], ["Rette dei numeri", "Frazioni e interi su una retta"], {
    draw(c, s, E) {
      const { P } = E;
      for (let y = 50, k = 1; y < E.h; y += 80, k++) {
        const den = k % 6 + 1, unit = 160;
        stroke(c, P, P.muted, .5, 1.5); seg(c, 0, y, E.w, y);
        for (let x = 0, n = 0; x < E.w; x += unit / den, n++) {
          const whole = n % den === 0; stroke(c, P, whole ? P.fg : L(P, k), whole ? .5 : .5, whole ? 2 : 1); seg(c, x + 20, y - (whole ? 10 : 6), x + 20, y + (whole ? 10 : 6));
          fill(c, P, whole ? P.fg : L(P, k), .5); text(c, whole ? String(n / den) : `${n % den}/${den}`, x + 20, y + 22, whole ? 12 : 9, whole ? 600 : 500);
        }
      }
    },
  }],
  ["fractions", "still", "red", ["Bruchkreise", "Torten in Halbe, Drittel, Viertel …"], ["Frazioni a torta", "Torte divise in metà, terzi, quarti …"], {
    draw(c, s, E) {
      const r = rnd(405), { P } = E;
      grid(E, 120, (x, y, i, j) => {
        const n = 2 + mod(i + j * 3, 7), filled = 1 + (r() * (n - 1) | 0), cx = x + 60, cy = y + 60;
        for (let k = 0; k < n; k++) { fill(c, P, k < filled ? L(P, n) : P.muted, k < filled ? .4 : .08); c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, 44, -Math.PI / 2 + k / n * TAU, -Math.PI / 2 + (k + 1) / n * TAU); c.closePath(); c.fill(); stroke(c, P, P.bg, 1, 2); c.stroke(); }
        fill(c, P, P.fg, .5); text(c, `${filled}/${n}`, cx, cy + 56, 11, 600);
      });
    },
  }],
  ["roses", "still", "mauve", ["Rosenkurven", "r = cos(kθ) mit vielen k"], ["Curve a rosa", "r = cos(kθ) con molti k"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 150, (x, y, i, j) => { const k = 2 + mod(i + j * 2, 6) + (mod(i * j, 3) === 0 ? .5 : 0); stroke(c, P, L(P, i + j), .5, 1.5); param(c, u => { const a = u * TAU * (k % 1 ? 2 : 1), rr = 60 * Math.cos(k * a); return [x + 75 + Math.cos(a) * rr, y + 75 + Math.sin(a) * rr]; }, 360); c.stroke(); });
    },
  }],
  ["lissajous", "still", "green", ["Lissajous-Figuren", "Schwingungen im Verhältnis a : b"], ["Figure di Lissajous", "Oscillazioni nel rapporto a : b"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 130, (x, y, i, j) => { const a = mod(i, 5) + 1, b = mod(j, 4) + 1; stroke(c, P, L(P, a + b), .5, 1.5); param(c, u => [x + 65 + Math.sin(a * u * TAU + Math.PI / 4) * 50, y + 65 + Math.sin(b * u * TAU) * 50], 300); c.stroke(); });
    },
  }],
  ["phyllotaxis", "still", "yellow", ["Sonnenblume", "Kerne im goldenen Winkel"], ["Girasole", "Semi disposti secondo l'angolo aureo"], {
    draw(c, s, E) {
      const { P } = E, ga = Math.PI * (3 - Math.sqrt(5));
      for (const [cx, cy, n] of [[E.w * .12, E.h * .3, 600], [E.w * .88, E.h * .7, 900], [E.w * .5, E.h * 1.05, 1400]]) for (let i = 0; i < n; i++) { const rr = 6 * Math.sqrt(i), a = i * ga; fill(c, P, L(P, i % 13 < 8 ? 2 : 1), .35 + (i / n) * .3); dot(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2 + (i / n) * 2.5); }
    },
  }],
  // ----- motion -----
  ["nested-polygons", "motion", "blue", ["Vielecke", "Ineinanderliegende Polygone drehen sich"], ["Poligoni", "Poligoni annidati che ruotano"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [cx, cy] of [[E.w * .15, E.h * .5], [E.w * .85, E.h * .5]]) for (let n = 3; n <= 12; n++) { stroke(c, P, L(P, n), .5, 1.5); ngon(c, cx, cy, 20 + (n - 3) * 26, n, E.t / (2000 + n * 500) * (n % 2 ? 1 : -1)); c.stroke(); }
    },
  }],
  ["epicycles", "motion", "red", ["Epizykel", "Kreise auf Kreisen zeichnen ein Herz"], ["Epicicli", "Cerchi su cerchi che disegnano un cuore"], {
    init: () => ({ trace: [] }),
    draw(c, s, E) {
      const { P } = E, terms = [[1, 16], [3, -4], [2, -5], [4, -1], [-1, 3], [-2, -1]], t = E.t / 3000, cx = E.w * .5, cy = E.h * .5, k = Math.min(E.w, E.h) / 45;
      let x = cx, y = cy;
      for (const [f, a] of terms) { const nx = x + Math.cos(f * t + (f < 0 ? Math.PI : 0)) * a * k * .6, ny = y + Math.sin(f * t) * a * k * .6; stroke(c, P, P.muted, .25); ring(c, x, y, Math.abs(a) * k * .6); seg(c, x, y, nx, ny); x = nx; y = ny; }
      const hx = cx + 16 * Math.sin(t) ** 3 * k, hy = cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k;
      s.trace.push([hx, hy]); if (s.trace.length > 600) s.trace.shift();
      stroke(c, P, P.muted, .3); seg(c, x, y, hx, hy);
      stroke(c, P, P.c.red, .6, 2.5); path(c, s.trace); c.stroke(); fill(c, P, P.c.red, .8); dot(c, hx, hy, 4);
    },
  }],
  ["spirograph", "motion", "mauve", ["Spirograph", "Zahnräder zeichnen Schleifen"], ["Spirografo", "Ingranaggi che disegnano anelli"], {
    init: () => ({ u: 0 }),
    draw(c, s, E) {
      const { P } = E; s.u += E.dt / 4000;
      const sets = [[E.w * .18, E.h * .5, 100, 37, 60], [E.w * .82, E.h * .5, 110, 43, 30]];
      sets.forEach(([cx, cy, Rr, rr, d], i) => {
        const pt = u => [cx + (Rr - rr) * Math.cos(u) + d * Math.cos((Rr - rr) / rr * u), cy + (Rr - rr) * Math.sin(u) - d * Math.sin((Rr - rr) / rr * u)];
        stroke(c, P, L(P, i * 3), .5, 1.5); c.beginPath(); const end = s.u * TAU * 3 % (TAU * 37); for (let u = 0; u < end; u += .05) { const [x, y] = pt(u); u ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
        stroke(c, P, P.muted, .3); ring(c, cx, cy, Rr); const gx = cx + (Rr - rr) * Math.cos(end), gy = cy + (Rr - rr) * Math.sin(end); ring(c, gx, gy, rr);
      });
    },
  }],
  ["fourier", "motion", "blue", ["Fourier-Synthese", "Sinuswellen addieren sich zum Rechteck"], ["Sintesi di Fourier", "Onde sinusoidali che sommano un'onda quadra"], {
    draw(c, s, E) {
      const { P } = E, n = 1 + Math.floor(mod(E.t / 900, 12)), ph = E.t / 1500;
      for (const [y0, amp] of [[E.h * .3, 70], [E.h * .75, 70]]) {
        for (let k = 0; k < n; k++) { const f = 2 * k + 1; stroke(c, P, L(P, k), .25, 1); curve(c, x => y0 - Math.sin(f * (x / 90 - ph)) * amp * 4 / Math.PI / f, 0, E.w, 4); c.stroke(); }
        stroke(c, P, P.fg, .5, 2.5); curve(c, x => { let v = 0; for (let k = 0; k < n; k++) { const f = 2 * k + 1; v += Math.sin(f * (x / 90 - ph)) / f; } return y0 - v * amp * 4 / Math.PI; }, 0, E.w, 3); c.stroke();
      }
      fill(c, P, P.muted, .6); text(c, `n = ${n}`, 20, 24, 14, 600, "left");
    },
  }],
  ["modular", "motion", "red", ["Modulo-Kreis", "Einmaleins auf dem Kreis: Kardioide und mehr"], ["Cerchio modulare", "Tabelline sul cerchio: cardioide e altro"], {
    draw(c, s, E) {
      const { P } = E, n = 200, f = 2 + mod(E.t / 4000, 8), cx = E.w / 2, cy = E.h / 2, rr = Math.min(E.w, E.h) * .45;
      for (let i = 0; i < n; i++) { const a = i / n * TAU, b = i * f / n * TAU; stroke(c, P, L(P, i / 34), .25, 1); seg(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cx + Math.cos(b) * rr, cy + Math.sin(b) * rr); }
      fill(c, P, P.muted, .6); text(c, `× ${f.toFixed(2)}`, cx, cy + rr + 22, 14, 600);
    },
  }],
  ["pendulum-wave", "motion", "yellow", ["Pendelwelle", "Pendel mit leicht verschiedenen Längen"], ["Onda di pendoli", "Pendoli di lunghezza appena diversa"], {
    draw(c, s, E) {
      const { P } = E, n = 18, T = 60000;
      for (const ox of [E.w * .02, E.w * .62]) for (let i = 0; i < n; i++) {
        const len = E.h * .3 + i * E.h * .03, osc = 51 + i, a = Math.sin(E.t / T * osc * TAU) * .5, px = ox + (i + 1) * E.w * .018, x = px + Math.sin(a) * len, y = 20 + Math.cos(a) * len;
        stroke(c, P, P.muted, .3); seg(c, px, 20, x, y); fill(c, P, L(P, i), .65); dot(c, x, y, 7);
      }
    },
  }],
  ["random-walk", "motion", "green", ["Irrfahrt", "Zufällige Wege hinterlassen Spuren"], ["Passeggiata aleatoria", "Percorsi casuali che lasciano tracce"], {
    init: E => many(6, i => ({ x: E.w * (i + .5) / 6, y: E.h / 2, pts: [] })),
    draw(c, s, E) {
      const { P } = E;
      s.forEach((w, i) => {
        for (let k = 0; k < 2; k++) { const d = R() * 4 | 0; w.x = clamp(w.x + [8, 0, -8, 0][d], 0, E.w); w.y = clamp(w.y + [0, 8, 0, -8][d], 0, E.h); w.pts.push([w.x, w.y]); }
        if (w.pts.length > 500) w.pts.splice(0, 2);
        stroke(c, P, L(P, i), .5, 2); path(c, w.pts); c.stroke(); fill(c, P, L(P, i), .9); dot(c, w.x, w.y, 4);
      });
    },
  }],
  ["life", "motion", "mauve", ["Spiel des Lebens", "Zellen leben, wachsen und sterben"], ["Gioco della vita", "Cellule che vivono, crescono e muoiono"], {
    init: E => { const sz = 14, nx = Math.ceil(E.w / sz), ny = Math.ceil(E.h / sz); return { sz, nx, ny, g: many(nx * ny, () => R() < .25 ? 1 : 0), t: 0 }; },
    draw(c, s, E) {
      const { P } = E, { sz, nx, ny } = s;
      s.t += E.dt;
      if (s.t > 180) {
        s.t = 0; const n = new Array(nx * ny).fill(0); let alive = 0;
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          let k = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (di || dj) k += s.g[mod(j + dj, ny) * nx + mod(i + di, nx)] ? 1 : 0;
          const was = s.g[j * nx + i]; n[j * nx + i] = (was && (k === 2 || k === 3)) || (!was && k === 3) ? Math.min(was + 1, 6) || 1 : 0; alive += n[j * nx + i] ? 1 : 0;
        }
        s.g = alive < nx * ny * .04 ? many(nx * ny, () => R() < .25 ? 1 : 0) : n;
      }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const v = s.g[j * nx + i]; if (v) { fill(c, P, L(P, v), .4); c.fillRect(i * sz + 1, j * sz + 1, sz - 2, sz - 2); } }
    },
  }],
  ["sorting", "motion", "orange", ["Sortieren", "Balken ordnen sich Schritt für Schritt"], ["Ordinamento", "Barre che si ordinano passo dopo passo"], {
    init: E => ({ a: many(Math.floor(E.w / 14), () => R()), i: 0, j: 0, t: 0, done: 0 }),
    draw(c, s, E) {
      const { P } = E, n = s.a.length;
      s.t += E.dt;
      while (s.t > 4) {
        s.t -= 4;
        if (s.done) { if (E.t - s.done > 2500) { s.a = many(n, () => R()); s.i = 0; s.j = 0; s.done = 0; } break; }
        if (s.a[s.j] > s.a[s.j + 1]) [s.a[s.j], s.a[s.j + 1]] = [s.a[s.j + 1], s.a[s.j]];
        s.j++; if (s.j >= n - 1 - s.i) { s.j = 0; s.i++; if (s.i >= n - 1) s.done = E.t; }
      }
      s.a.forEach((v, k) => { fill(c, P, k === s.j || k === s.j + 1 ? P.c.red : L(P, v * 6), k >= n - s.i ? .45 : .25); c.fillRect(k * 14 + 2, E.h - v * E.h * .8, 10, v * E.h * .8); });
    },
  }],
  ["harmonograph", "motion", "blue", ["Harmonograph", "Gedämpfte Pendel zeichnen Kurven"], ["Armonografo", "Pendoli smorzati che disegnano curve"], {
    draw(c, s, E) {
      const { P } = E, cyc = 12000, k = mod(E.t, cyc) / cyc, seed = Math.floor(E.t / cyc), r = rnd(seed + 7);
      const f = [2 + r() * .02, 3 + r() * .02, 3 + r() * .02, 2 + r() * .02], p = many(4, () => r() * TAU), d = .0025, sc = Math.min(E.w, E.h) * .22;
      for (const [cx, cy, col] of [[E.w * .25, E.h * .5, 0], [E.w * .75, E.h * .5, 3]]) {
        stroke(c, P, L(P, col + seed), .45, 1.2); c.beginPath();
        for (let u = 0; u < k * 300; u += .1) { const e = Math.exp(-d * u), x = cx + sc * (Math.sin(f[0] * u + p[0]) + Math.sin(f[1] * u + p[1])) * e, y = cy + sc * (Math.sin(f[2] * u + p[2]) + Math.sin(f[3] * u + p[3])) * e; u ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.stroke();
      }
    },
  }],
  ["tesseract", "motion", "green", ["Tesserakt", "Ein vierdimensionaler Würfel dreht sich"], ["Tesseratto", "Un ipercubo che ruota in quattro dimensioni"], {
    draw(c, s, E) {
      const { P } = E, vs = many(16, i => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]), a = E.t / 3000, b = E.t / 4700;
      for (const [cx, cy, sc] of [[E.w * .15, E.h * .5, 70], [E.w * .85, E.h * .45, 90]]) {
        const pr = vs.map(([x, y, z, w]) => { const x1 = x * Math.cos(a) - w * Math.sin(a), w1 = x * Math.sin(a) + w * Math.cos(a), y1 = y * Math.cos(b) - z * Math.sin(b), z1 = y * Math.sin(b) + z * Math.cos(b); const k = 2 / (3 - w1); return [cx + x1 * k * sc, cy + (y1 + z1 * .3) * k * sc]; });
        for (let i = 0; i < 16; i++) for (let bit = 0; bit < 4; bit++) { const j = i ^ (1 << bit); if (j > i) { stroke(c, P, L(P, bit), .5, 1.5); seg(c, pr[i][0], pr[i][1], pr[j][0], pr[j][1]); } }
      }
    },
  }],
  ["cycloid", "motion", "red", ["Zykloide", "Ein rollendes Rad zeichnet Bögen"], ["Cicloide", "Una ruota che rotola disegna archi"], {
    draw(c, s, E) {
      const { P } = E, rr = 50, a = mod(E.t * .0012, (E.w + 2 * rr) / rr);
      for (const y0 of [E.h * .35, E.h * .85]) {
        const pt = u => [rr * (u - Math.sin(u)), y0 - rr * (1 - Math.cos(u))];
        stroke(c, P, P.muted, .4); seg(c, 0, y0, E.w, y0);
        stroke(c, P, P.c.red, .55, 2); param(c, k => pt(k * a), Math.ceil(a * 20)); c.stroke();
        const [px, py] = pt(a);
        stroke(c, P, P.fg, .4, 1.5); ring(c, rr * a, y0 - rr, rr); seg(c, rr * a, y0 - rr, px, py);
        fill(c, P, P.c.red, .9); dot(c, px, py, 4.5);
      }
    },
  }],
  ["galton", "motion", "yellow", ["Galtonbrett", "Kugeln fallen durch Nägel zur Glockenkurve"], ["Tavola di Galton", "Palline che cadono tra i chiodi verso la gaussiana"], {
    init: E => ({ balls: [], bins: new Array(15).fill(0), next: 0 }),
    draw(c, s, E) {
      const { P } = E, rows = 12, gap = Math.min(30, E.w / 18), cx = E.w / 2, top = 40, bh = gap * .87;
      for (let j = 0; j < rows; j++) for (let i = 0; i <= j; i++) { fill(c, P, P.muted, .5); dot(c, cx + (i - j / 2) * gap, top + j * bh, 2.5); }
      if (E.t > s.next) { s.next = E.t + 120; s.balls.push({ row: 0, pos: 0, k: 0 }); }
      for (const b of s.balls) { b.k += E.dt / 110; while (b.k >= 1 && b.row < rows) { b.k -= 1; b.row++; b.pos += R() < .5 ? 0 : 1; } }
      s.balls = s.balls.filter(b => { if (b.row >= rows) { s.bins[b.pos]++; return false; } return true; });
      if (Math.max(...s.bins) > 30) s.bins = s.bins.map(v => v * .6 | 0);
      for (const b of s.balls) { const x = cx + (b.pos - b.row / 2) * gap + (b.k - .5) * gap * .5, y = top + (b.row + b.k) * bh - 8; fill(c, P, P.c.orange, .8); dot(c, x, y, 4); }
      s.bins.forEach((v, i) => { const x = cx + (i - rows / 2) * gap; fill(c, P, L(P, i), .45); for (let k = 0; k < v; k++) dot(c, x, top + rows * bh + 12 + k * 7, 3); });
    },
  }],
  ["tally", "motion", "green", ["Strichliste", "Zählen in Fünferbündeln"], ["Conteggio a stanghette", "Contare a gruppi di cinque"], {
    draw(c, s, E) {
      const { P } = E, n = Math.floor(E.t / 220) % 600;
      let k = 0;
      for (let y = 40; y < E.h && k < n; y += 50) for (let x = 30; x < E.w - 60 && k < n; x += 70) {
        for (let i = 0; i < 4 && k < n; i++, k++) { stroke(c, P, P.fg, .4, 2.5); seg(c, x + i * 10, y - 16, x + i * 10 + 2, y + 16); }
        if (k < n) { stroke(c, P, L(P, k / 5), .7, 2.5); seg(c, x - 6, y + 12, x + 38, y - 12); k++; }
      }
    },
  }],
  ["modulo-clock", "motion", "orange", ["Restklassen-Uhren", "Zeiger zählen modulo 3, 5, 7 …"], ["Orologi modulari", "Lancette che contano modulo 3, 5, 7 …"], {
    draw(c, s, E) {
      const { P } = E, n = Math.floor(E.t / 700);
      grid(E, 150, (x, y, i, j) => {
        const m = 2 + mod(i + j * 3, 11), cx = x + 75, cy = y + 75;
        stroke(c, P, P.muted, .4); ring(c, cx, cy, 50);
        for (let k = 0; k < m; k++) { const a = k / m * TAU - Math.PI / 2; fill(c, P, k === n % m ? L(P, m) : P.muted, k === n % m ? .8 : .3); dot(c, cx + Math.cos(a) * 50, cy + Math.sin(a) * 50, k === n % m ? 6 : 3); }
        const a = (n % m) / m * TAU - Math.PI / 2; stroke(c, P, L(P, m), .6, 2); seg(c, cx, cy, cx + Math.cos(a) * 40, cy + Math.sin(a) * 40);
        fill(c, P, P.fg, .45); text(c, `mod ${m}`, cx, cy + 68, 10, 600);
      });
    },
  }],
  ["morph", "motion", "mauve", ["Formwandel", "Dreieck wird Quadrat wird Kreis"], ["Metamorfosi", "Il triangolo diventa quadrato e poi cerchio"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 140, (x, y, i, j) => { const kk = mod(E.t / 2500 + (i + j) * .3, 6), nn = 3 + Math.min(kk, 4), cc = Math.max(0, kk - 4) / 2, cc2 = cc > .5 ? 1 - cc : cc; fill(c, P, L(P, i + j), .3); path(c, polyMorph(Math.floor(nn) + (nn % 1 > .5 ? 1 : 0), cc2 * 2, 50).map(([px, py]) => [x + 70 + px, y + 70 + py]), true); c.fill(); });
    },
  }],
  ["sieve", "motion", "blue", ["Sieb des Eratosthenes", "Vielfache werden gestrichen, Primzahlen bleiben"], ["Crivello di Eratostene", "I multipli vengono cancellati, restano i primi"], {
    draw(c, s, E) {
      const { P } = E, sz = 40, cols = Math.floor(E.w / sz), rows = Math.floor(E.h / sz), N = cols * rows, primes = [2, 3, 5, 7, 11, 13, 17, 19, 23], stage = Math.floor(E.t / 1600) % (primes.length + 3);
      for (let n = 1; n <= N; n++) {
        const x = ((n - 1) % cols) * sz, y = Math.floor((n - 1) / cols) * sz;
        const by = primes.findIndex((p, i) => i < stage && n > p && n % p === 0), isP = n > 1 && by < 0 && stage >= primes.length;
        fill(c, P, by >= 0 ? L(P, by) : P.muted, by >= 0 ? .12 : isP ? 0 : .06); c.fillRect(x + 2, y + 2, sz - 4, sz - 4);
        if (isP && isPrime(n)) { fill(c, P, P.c.orange, .35); c.fillRect(x + 2, y + 2, sz - 4, sz - 4); }
        fill(c, P, P.fg, by >= 0 ? .12 : .4); text(c, String(n), x + sz / 2, y + sz / 2 + 1, 11, by >= 0 ? 400 : 600);
        if (by >= 0) { stroke(c, P, L(P, by), .5, 1.5); seg(c, x + 8, y + sz - 8, x + sz - 8, y + 8); }
      }
    },
  }],
  ["binary", "motion", "green", ["Binärzähler", "Bits zählen hoch"], ["Contatore binario", "Bit che contano verso l'alto"], {
    draw(c, s, E) {
      const { P } = E, rows = Math.floor(E.h / 40);
      for (let j = 0; j < rows; j++) {
        const v = Math.floor(E.t / (120 * (j + 1))) + j * 997, bits = Math.floor(E.w / 30);
        for (let b = 0; b < bits; b++) { const on = (v >> (bits - 1 - b) % 30) & 1; fill(c, P, on ? L(P, j) : P.muted, on ? .5 : .1); c.fillRect(b * 30 + 6, j * 40 + 12, 22, 22); fill(c, P, P.fg, on ? .5 : .15); text(c, on ? "1" : "0", b * 30 + 17, j * 40 + 24, 11, 600); }
      }
    },
  }],
  // ----- touch -----
  ["tangent", "touch", "red", ["Tangente", "Die Tangente folgt dem Zeiger an der Kurve"], ["Tangente", "La tangente segue il puntatore lungo la curva"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, E.w * .5 + Math.sin(E.t / 4000) * E.w * .3, 0, 120), oy = E.h / 2, u = 70;
      const g = x => Math.sin(x / u) * u * 1.4 + Math.sin(x / u / 2.7) * u * .6, d = x => (g(x + 1) - g(x - 1)) / 2;
      stroke(c, P, P.muted, .4); seg(c, 0, oy, E.w, oy);
      stroke(c, P, P.c.blue, .6, 2.5); curve(c, x => oy - g(x), 0, E.w, 4); c.stroke();
      const x0 = s.x, y0 = oy - g(x0), m = d(x0);
      stroke(c, P, P.c.red, .7, 2); seg(c, x0 - 300, y0 + m * 300, x0 + 300, y0 - m * 300);
      fill(c, P, P.c.red, .9); dot(c, x0, y0, 5); fill(c, P, P.fg, .6); text(c, `m = ${m.toFixed(2)}`, x0 + 14, y0 - 20, 13, 600, "left");
      return false;
    },
  }],
  ["vector-field", "touch", "blue", ["Vektorfeld", "Pfeile zeigen zum Zeiger"], ["Campo vettoriale", "Frecce che puntano al puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, E.w / 2 + Math.cos(E.t / 5000) * E.w * .3, E.h / 2 + Math.sin(E.t / 5000) * E.h * .3, 150);
      grid(E, 34, (x, y, i, j) => {
        const dx = s.x - x, dy = s.y - y, d = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx) + (1 - f) * Math.PI / 2, len = clamp(2000 / d, 4, 14);
        stroke(c, P, L(P, d / 120), .45, 1.5); at(c, x + 17, y + 17, a, 1, () => { seg(c, -len, 0, len, 0); seg(c, len, 0, len - 5, -3); seg(c, len, 0, len - 5, 3); });
      });
      return false;
    },
  }],
  ["thales", "touch", "green", ["Thaleskreis", "Jedes Dreieck auf dem Halbkreis hat einen rechten Winkel"], ["Cerchio di Talete", "Ogni triangolo sul semicerchio ha un angolo retto"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, cx = E.w / 2, cy = E.h * .7, rr = Math.min(E.w * .4, E.h * .55);
      follow(s, E, cx + Math.cos(E.t / 3000 + Math.PI) * rr, cy - Math.abs(Math.sin(E.t / 3000)) * rr, 100);
      const a = Math.atan2(s.y - cy, s.x - cx), px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      stroke(c, P, P.muted, .45, 1.5); c.beginPath(); c.arc(cx, cy, rr, Math.PI, TAU); c.stroke(); seg(c, cx - rr, cy, cx + rr, cy);
      fill(c, P, P.c.green, .25); path(c, [[cx - rr, cy], [px, py], [cx + rr, cy]], true); c.fill(); stroke(c, P, P.c.green, .7, 2); c.stroke();
      const v1 = Math.atan2(cy - py, cx - rr - px), v2 = Math.atan2(cy - py, cx + rr - px);
      stroke(c, P, P.c.red, .7, 2); c.beginPath(); c.arc(px, py, 22, Math.min(v1, v2), Math.max(v1, v2)); c.stroke(); fill(c, P, P.c.red, .9); dot(c, px, py, 4);
      fill(c, P, P.fg, .5); text(c, "90°", px, py + (py < cy - 30 ? 40 : -30), 13, 600);
      return false;
    },
  }],
  ["kaleidoscope", "touch", "mauve", ["Kaleidoskop", "Die Zeigerspur wird sechsfach gespiegelt"], ["Caleidoscopio", "La scia del puntatore riflessa sei volte"], {
    init: () => ({ pts: [] }),
    draw(c, s, E) {
      const { P } = E, cx = E.w / 2, cy = E.h / 2;
      if (E.ptr.on && !E.still) s.pts.push([E.ptr.x - cx, E.ptr.y - cy, E.t]); else if (!E.still) s.pts.push([Math.cos(E.t / 900) * 200 * Math.sin(E.t / 2300), Math.sin(E.t / 700) * 160, E.t]);
      s.pts = s.pts.filter(p => E.t - p[2] < 4000);
      for (let k = 0; k < 6; k++) for (const m of [1, -1]) {
        at(c, cx, cy, k / 6 * TAU, 1, () => { c.scale(1, m); stroke(c, P, L(P, k), .45, 2); c.beginPath(); s.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); });
      }
      return false;
    },
  }],
  ["voronoi", "touch", "orange", ["Voronoi", "Der Zeiger ist ein Zentrum unter vielen"], ["Voronoi", "Il puntatore è un centro tra tanti"], {
    init: E => { const r = rnd(406); return { sites: many(dens(E, 40000, 8, 30), () => [r() * E.w, r() * E.h]) }; },
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -9999, -9999, 60), G = 12, all = s.sites.concat(f > .05 ? [[s.x, s.y]] : []);
      for (let y = 0; y < E.h; y += G) for (let x = 0; x < E.w; x += G) {
        let best = 1e9, second = 1e9, bi = 0;
        all.forEach(([sx, sy], i) => { const d = (sx - x) ** 2 + (sy - y) ** 2; if (d < best) { second = best; best = d; bi = i; } else if (d < second) second = d; });
        const edge = Math.sqrt(second) - Math.sqrt(best) < G * .5;
        fill(c, P, edge ? P.muted : L(P, bi === s.sites.length ? 1 : bi), edge ? .25 : bi === s.sites.length ? .35 : .1); c.fillRect(x, y, G, G);
      }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["laser", "touch", "red", ["Spiegelstrahl", "Ein Strahl vom Zeiger prallt an den Rändern ab"], ["Raggio riflesso", "Un raggio dal puntatore che rimbalza sui bordi"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E;
      follow(s, E, E.w * .3, E.h * .4, 100);
      let x = s.x, y = s.y, a = E.t / 3000; const pts = [[x, y]];
      for (let b = 0; b < 14; b++) {
        const dx = Math.cos(a), dy = Math.sin(a), tx = dx > 0 ? (E.w - x) / dx : -x / dx, ty = dy > 0 ? (E.h - y) / dy : -y / dy, t = Math.min(tx, ty);
        x += dx * t; y += dy * t; pts.push([x, y]); if (tx < ty) a = Math.PI - a; else a = -a;
      }
      pts.slice(1).forEach((p, i) => { stroke(c, P, L(P, i), .6 - i * .035, 2); seg(c, pts[i][0], pts[i][1], p[0], p[1]); });
      fill(c, P, P.c.red, .9); dot(c, s.x, s.y, 5); return false;
    },
  }],
  ["graph", "touch", "blue", ["Graph", "Knoten mit Federn; der Zeiger zieht einen davon"], ["Grafo", "Nodi con molle; il puntatore ne trascina uno"], {
    init: E => { const r = rnd(407), n = dens(E, 22000, 16, 50), ns = many(n, () => ({ x: r() * E.w, y: r() * E.h, vx: 0, vy: 0 })), es = []; ns.forEach((a, i) => { for (let k = 0; k < 2; k++) es.push([i, r() * n | 0]); }); return { ns, es, grab: -1 }; },
    draw(c, s, E) {
      const { P } = E, { ns, es } = s, on = E.ptr.on && !E.still;
      if (on && s.grab < 0) { let best = 1e9; ns.forEach((n, i) => { const d = Math.hypot(n.x - E.ptr.x, n.y - E.ptr.y); if (d < best && d < 80) { best = d; s.grab = i; } }); }
      if (!on) s.grab = -1;
      for (const [a, b] of es) { const p = ns[a], q = ns[b], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1, f = (d - 120) * .0005; p.vx += dx / d * f * E.dt; p.vy += dy / d * f * E.dt; q.vx -= dx / d * f * E.dt; q.vy -= dy / d * f * E.dt; }
      ns.forEach((n, i) => { if (i === s.grab) { n.x = E.ptr.x; n.y = E.ptr.y; n.vx = n.vy = 0; } n.vx *= .9; n.vy *= .9; n.x = clamp(n.x + n.vx, 0, E.w); n.y = clamp(n.y + n.vy, 0, E.h); });
      stroke(c, P, P.muted, .35, 1.5); for (const [a, b] of es) seg(c, ns[a].x, ns[a].y, ns[b].x, ns[b].y);
      ns.forEach((n, i) => { fill(c, P, L(P, i), i === s.grab ? .9 : .55); dot(c, n.x, n.y, i === s.grab ? 8 : 5); });
      return false;
    },
  }],
  ["fractal-tree", "touch", "green", ["Fraktaler Baum", "Der Zeiger stellt den Verzweigungswinkel ein"], ["Albero frattale", "Il puntatore regola l'angolo dei rami"], {
    init: () => ({}),
    draw(c, s, E) {
      follow(s, E, E.w / 2 + Math.sin(E.t / 3000) * E.w * .3, E.h / 2, 120);
      const { P } = E, spread = .2 + (s.x / E.w) * 1.2, shrink = .62 + (1 - s.y / E.h) * .12;
      const br = (x, y, a, len, d) => { if (d === 0 || len < 3) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; stroke(c, P, d > 3 ? P.muted : L(P, d), .5, d * .8); seg(c, x, y, x2, y2); br(x2, y2, a - spread / 2, len * shrink, d - 1); br(x2, y2, a + spread / 2, len * shrink, d - 1); };
      for (const x0 of [E.w * .2, E.w * .8]) br(x0, E.h, -Math.PI / 2, Math.min(E.h * .22, 160), 10);
      return false;
    },
  }],
  ["golden-touch", "touch", "yellow", ["Goldener Zeiger", "Eine goldene Spirale dreht sich um den Zeiger"], ["Puntatore aureo", "Una spirale aurea che gira attorno al puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      follow(s, E, E.w / 2, E.h / 2, 160);
      const { P } = E, b = Math.log(PHI) / (Math.PI / 2);
      for (let arm = 0; arm < 3; arm++) { stroke(c, P, L(P, arm * 2 + 1), .55, 2); param(c, u => { const th = u * 16; const rr = 2 * Math.exp(b * th); const a = th + E.t / 2000 + arm * TAU / 3; return [s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr]; }, 400); c.stroke(); }
      return false;
    },
  }],
  ["coordinates", "touch", "blue", ["Koordinaten", "Fadenkreuz mit x und y des Zeigers"], ["Coordinate", "Mirino con x e y del puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, -999, 50), u = 40;
      stroke(c, P, P.line, 1); for (let x = 0; x < E.w; x += u) seg(c, x, 0, x, E.h); for (let y = 0; y < E.h; y += u) seg(c, 0, y, E.w, y);
      if (f > .02) {
        stroke(c, P, P.c.blue, .6 * f, 1.5); c.setLineDash([6, 6]); seg(c, s.x, 0, s.x, E.h); seg(c, 0, s.y, E.w, s.y); c.setLineDash([]);
        fill(c, P, P.fg, .7 * f); text(c, `(${(s.x / u).toFixed(1)} | ${(s.y / u).toFixed(1)})`, s.x + 14, s.y - 16, 14, 600, "left");
        fill(c, P, P.c.red, .9 * f); dot(c, s.x, s.y, 4);
      }
      return f < .01 && !E.ptr.on;
    },
  }],
]);
