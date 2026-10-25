/* Extra backgrounds 6/10: physics, chemistry, biology, astronomy, geography */
import { clear, TAU, clamp, mod, rnd, R, many, dens, wrap, noise, fbm, A, L, fill, stroke, dot, ring, seg, path, ngon, starPath, rrect, curve, param, text, at, swarm, near, grid, follow, def } from "./kit.js";

const ELEMENTS = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe".split(" ");
// Main group layout of the first 54 elements: [period, group]
const POS = (() => {
  const p = [], rows = [[1, 18], [1, 2, 13, 14, 15, 16, 17, 18], [1, 2, 13, 14, 15, 16, 17, 18], [...Array(18).keys()].map(i => i + 1), [...Array(18).keys()].map(i => i + 1)];
  rows.forEach((g, i) => g.forEach(gr => p.push([i, gr - 1])));
  return p;
})();
// Simple constellations: points (0..1) and lines
const CONSTELLATIONS = [
  ["Orion", [[.2, .1], [.6, .15], [.35, .45], [.45, .48], [.55, .5], [.25, .85], [.7, .8]], [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]]],
  ["Großer Wagen", [[0, .3], [.2, .25], [.38, .32], [.55, .4], [.6, .7], [.9, .72], [.95, .42]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]]],
  ["Kassiopeia", [[0, .4], [.25, .7], [.5, .45], [.75, .75], [1, .35]], [[0, 1], [1, 2], [2, 3], [3, 4]]],
  ["Schwan", [[.5, 0], [.5, .35], [.5, .7], [.5, 1], [.1, .3], [.9, .4]], [[0, 1], [1, 2], [2, 3], [4, 1], [1, 5]]],
  ["Löwe", [[.1, .3], [.25, .1], [.4, .2], [.45, .45], [.8, .5], [.95, .3], [.75, .75]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 6], [3, 6]]],
];
const PLANETS = [[.39, 3, "muted"], [.72, 5, "yellow"], [1, 5.5, "blue"], [1.52, 4, "red"], [5.2, 12, "orange"], [9.5, 10, "yellow"], [19, 8, "blue"], [30, 8, "blue"]];

function molecule(c, P, x, y, sz, kind, col, rot) {
  at(c, x, y, rot, sz, () => {
    if (kind === 0) { // benzene ring
      stroke(c, P, col, .55, 2 / sz); ngon(c, 0, 0, 20, 6); c.stroke(); ring(c, 0, 0, 12);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; seg(c, Math.cos(a) * 20, Math.sin(a) * 20, Math.cos(a) * 32, Math.sin(a) * 32); fill(c, P, P.muted, .5); dot(c, Math.cos(a) * 34, Math.sin(a) * 34, 4); }
    } else if (kind === 1) { // water
      stroke(c, P, P.muted, .5, 3 / sz); seg(c, 0, 0, -18, 14); seg(c, 0, 0, 18, 14);
      fill(c, P, P.c.red, .55); dot(c, 0, 0, 11); fill(c, P, P.c.blue, .6); dot(c, -18, 14, 7); dot(c, 18, 14, 7);
    } else { // chain
      stroke(c, P, P.muted, .5, 3 / sz); for (let k = 0; k < 4; k++) seg(c, k * 22 - 33, (k % 2) * 12 - 6, k * 22 - 11, ((k + 1) % 2) * 12 - 6);
      for (let k = 0; k < 5; k++) { fill(c, P, k % 2 ? col : P.muted, .55); dot(c, k * 22 - 33, (k % 2) * 12 - 6, 7); }
    }
  });
}
function flask(c, P, x, y, col, k = 1) {
  stroke(c, P, P.muted, .55, 2); c.beginPath(); c.moveTo(x - 8, y - 60); c.lineTo(x - 8, y - 30); c.lineTo(x - 34, y); c.lineTo(x + 34, y); c.lineTo(x + 8, y - 30); c.lineTo(x + 8, y - 60); c.stroke();
  fill(c, P, col, .3); c.beginPath(); c.moveTo(x - 30, y - 5); c.lineTo(x - 34, y); c.lineTo(x + 34, y); c.lineTo(x + 30, y - 5); c.lineTo(x + 30 - 22 * k, y - 5 - 22 * k); c.lineTo(x - 30 + 22 * k, y - 5 - 22 * k); c.closePath(); c.fill();
}

export default def("science", [
  ["periodic", "still", "blue", ["Periodensystem", "Elementsymbole in ihren Gruppen"], ["Tavola periodica", "Simboli degli elementi nei loro gruppi"], {
    draw(c, s, E) {
      const { P } = E, sz = Math.max(34, Math.min(56, E.w / 19)), ox = (E.w - sz * 18) / 2;
      for (let rep = 0, oy = 20; oy < E.h; rep++, oy += sz * 5.6) ELEMENTS.forEach((el, i) => {
        const [r, g] = POS[i], x = ox + g * sz, y = oy + r * sz, col = g < 2 ? 3 : g > 11 ? (g === 17 ? 5 : 1) : 2;
        fill(c, P, L(P, col), .2); c.fillRect(x + 1, y + 1, sz - 2, sz - 2);
        fill(c, P, P.fg, .45); text(c, el, x + sz / 2, y + sz / 2 + 3, sz * .36, 600); fill(c, P, P.muted, .6); text(c, String(i + 1), x + 4, y + 8, 8, 500, "left");
      });
    },
  }],
  ["molecules", "still", "green", ["Moleküle", "Benzolringe, Wasser und Ketten"], ["Molecole", "Anelli di benzene, acqua e catene"], {
    draw(c, s, E) { const r = rnd(501); for (let i = 0; i < dens(E, 20000, 16, 60); i++) molecule(c, E.P, r() * E.w, r() * E.h, .7 + r() * .7, i % 3, L(E.P, i), r() * TAU); },
  }],
  ["dna", "still", "mauve", ["Doppelhelix", "Die DNA mit ihren Basenpaaren"], ["Doppia elica", "Il DNA con le sue coppie di basi"], {
    draw(c, s, E) {
      const { P } = E;
      for (let x0 = 60; x0 < E.w; x0 += 240) for (let y = 0; y < E.h; y += 12) {
        const a = y / 40 + x0, x1 = x0 + Math.sin(a) * 40, x2 = x0 - Math.sin(a) * 40, front = Math.cos(a) > 0;
        if (y % 24 === 0) { stroke(c, P, L(P, y / 24), .4, 3); seg(c, x1, y, x2, y); }
        fill(c, P, P.c.blue, front ? .6 : .25); dot(c, x1, y, 4); fill(c, P, P.c.mauve, front ? .25 : .6); dot(c, x2, y, 4);
      }
    },
  }],
  ["plant-cells", "still", "green", ["Pflanzenzellen", "Zellwände und Kerne unter dem Mikroskop"], ["Cellule vegetali", "Pareti e nuclei al microscopio"], {
    draw(c, s, E) {
      const r = rnd(502), { P } = E, w = 70, h = 44;
      for (let j = 0, y = 0; y < E.h + h; j++, y += h) for (let x = (j % 2) * w / 2 - w; x < E.w + w; x += w) {
        const pts = [[x + 4 + r() * 6, y + 3 + r() * 4], [x + w - 4 - r() * 6, y + 3 + r() * 4], [x + w - 3 - r() * 4, y + h - 3 - r() * 4], [x + 3 + r() * 4, y + h - 3 - r() * 4]];
        fill(c, P, P.c.green, .12); stroke(c, P, P.c.green, .5, 2); path(c, pts, true); c.fill(); c.stroke();
        fill(c, P, P.c.mauve, .45); dot(c, x + w * (.3 + r() * .4), y + h * (.3 + r() * .4), 6);
        fill(c, P, P.c.green, .4); for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(x + 12 + r() * (w - 24), y + 10 + r() * (h - 20), 4, 2.5, r() * TAU, 0, TAU); c.fill(); }
      }
    },
  }],
  ["veins", "still", "green", ["Blattadern", "Verzweigte Adern großer Blätter"], ["Nervature", "Nervature ramificate di grandi foglie"], {
    draw(c, s, E) {
      const r = rnd(503), { P } = E;
      const branch = (x, y, a, len, d) => { if (d === 0) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; stroke(c, P, P.c.green, .25 + d * .07, d * .7); seg(c, x, y, x2, y2); for (let k = 1; k <= 3; k++) { const t = k / 4, bx = x + (x2 - x) * t, by = y + (y2 - y) * t; branch(bx, by, a + .7, len * .45, d - 1); branch(bx, by, a - .7, len * .45, d - 1); } };
      for (let i = 0; i < dens(E, 220000, 2, 6); i++) { const x = r() * E.w, y = r() * E.h, a = r() * TAU; fill(c, P, P.c.green, .08); c.beginPath(); c.ellipse(x + Math.cos(a) * 160, y + Math.sin(a) * 160, 180, 90, a, 0, TAU); c.fill(); branch(x, y, a, 320, 4); }
    },
  }],
  ["topo", "still", "orange", ["Höhenlinien", "Topografische Karte mit Höhenangaben"], ["Curve di livello", "Carta topografica con quote"], {
    draw(c, s, E) {
      const { P } = E, G = 10, nx = Math.ceil(E.w / G) + 1, ny = Math.ceil(E.h / G) + 1, v = new Float32Array(nx * ny);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = fbm(i * G / 400 + 3, j * G / 400 + 7);
      for (let k = 0; k < 14; k++) {
        const lv = .25 + k * .04; stroke(c, P, k % 5 ? P.c.orange : P.fg, k % 5 ? .35 : .4, k % 5 ? 1 : 1.8); c.beginPath(); let label = null;
        for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
          const a = v[j * nx + i], b = v[j * nx + i + 1], d = v[(j + 1) * nx + i], x = i * G, y = j * G;
          if ((a - lv) * (b - lv) < 0) { const xx = x + G * (lv - a) / (b - a); c.moveTo(xx, y); c.lineTo(xx, y + 3); if (!label && i % 37 === 5) label = [xx, y]; }
          if ((a - lv) * (d - lv) < 0) { const yy = y + G * (lv - a) / (d - a); c.moveTo(x, yy); c.lineTo(x + 3, yy); }
        }
        c.stroke(); if (label && !(k % 5)) { fill(c, P, P.fg, .45); text(c, String(200 + k * 50), label[0], label[1], 10, 600); }
      }
    },
  }],
  ["globe", "still", "blue", ["Gradnetz", "Längen- und Breitenkreise eines Globus"], ["Reticolato", "Meridiani e paralleli di un globo"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [cx, cy, rr] of [[E.w * .12, E.h * .3, Math.min(E.w, E.h) * .25], [E.w * .9, E.h * .78, Math.min(E.w, E.h) * .32]]) {
        stroke(c, P, P.c.blue, .5, 1.5); ring(c, cx, cy, rr);
        for (let lat = -60; lat <= 60; lat += 30) { const y = cy - Math.sin(lat / 57.3) * rr, w = Math.cos(lat / 57.3) * rr; c.beginPath(); c.ellipse(cx, y, w, w * .2, 0, 0, TAU); c.stroke(); }
        for (let lon = 0; lon < 180; lon += 30) { c.beginPath(); c.ellipse(cx, cy, Math.abs(Math.cos(lon / 57.3)) * rr, rr, 0, 0, TAU); c.stroke(); }
      }
    },
  }],
  ["star-map", "still", "yellow", ["Sternkarte", "Orion, Großer Wagen, Kassiopeia …"], ["Mappa stellare", "Orione, Grande Carro, Cassiopea …"], {
    draw(c, s, E) {
      const r = rnd(504), { P } = E;
      fill(c, P, P.muted, .5); for (let i = 0; i < dens(E, 2000, 150, 900); i++) dot(c, r() * E.w, r() * E.h, r() * 1.3 + .3);
      CONSTELLATIONS.forEach(([name, pts, ls], k) => {
        const sz = 160 + r() * 80, x0 = (k + .3) * E.w / CONSTELLATIONS.length - sz / 2 + (r() - .5) * 60, y0 = r() * (E.h - sz), q = pts.map(([x, y]) => [x0 + x * sz, y0 + y * sz]);
        stroke(c, P, P.c.blue, .45, 1.2); for (const [a, b] of ls) seg(c, q[a][0], q[a][1], q[b][0], q[b][1]);
        fill(c, P, P.c.yellow, .8); for (const [x, y] of q) { starPath(c, x, y, 5, 2, 4); c.fill(); }
        fill(c, P, P.fg, .4); text(c, name, x0 + sz / 2, y0 + sz + 16, 11, 600);
      });
    },
  }],
  ["moon-phases", "still", "blue", ["Mondphasen", "Von Neumond bis Vollmond"], ["Fasi lunari", "Dalla luna nuova alla luna piena"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 90, (x, y, i, j) => {
        const k = mod(i + j * 3, 8) / 8, cx = x + 45, cy = y + 45, rr = 28;
        fill(c, P, P.muted, .15); dot(c, cx, cy, rr);
        fill(c, P, P.c.blue, .55); c.beginPath(); const lit = Math.cos(k * TAU);
        if (k <= .5) { c.arc(cx, cy, rr, -Math.PI / 2, Math.PI / 2); c.ellipse(cx, cy, Math.abs(lit) * rr, rr, 0, Math.PI / 2, -Math.PI / 2, lit > 0); }
        else { c.arc(cx, cy, rr, Math.PI / 2, -Math.PI / 2); c.ellipse(cx, cy, Math.abs(lit) * rr, rr, 0, -Math.PI / 2, Math.PI / 2, lit > 0); }
        c.fill();
      });
    },
  }],
  ["solar-system", "still", "orange", ["Sonnensystem", "Bahnen der acht Planeten"], ["Sistema solare", "Orbite degli otto pianeti"], {
    draw(c, s, E) {
      const r = rnd(505), { P } = E, cx = E.w * .08, cy = E.h * .5, k = Math.max(E.w, E.h) * .9 / Math.sqrt(30);
      fill(c, P, P.c.yellow, .8); dot(c, cx, cy, 26);
      for (const [d, sz, col] of PLANETS) { const rr = Math.sqrt(d) * k; stroke(c, P, P.muted, .3); ring(c, cx, cy, rr); const a = (r() - .5) * 1.2; fill(c, P, P.c[col] || P.muted, .7); dot(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, sz); if (d === 9.5) { stroke(c, P, P.c.orange, .6, 2); c.beginPath(); c.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, sz * 2, sz * .5, -.3, 0, TAU); c.stroke(); } }
    },
  }],
  ["circuit", "still", "green", ["Schaltkreis", "Leiterbahnen mit Widerständen und Lötpunkten"], ["Circuito", "Piste con resistenze e punti di saldatura"], {
    draw(c, s, E) {
      const r = rnd(506), { P } = E, G = 30;
      for (let i = 0; i < dens(E, 2500, 60, 500); i++) {
        let x = Math.round(r() * E.w / G) * G, y = Math.round(r() * E.h / G) * G; const pts = [[x, y]];
        for (let k = 0; k < 2 + r() * 4; k++) { const d = r() * 4 | 0, len = G * (1 + (r() * 3 | 0)); if (d === 0) x += len; else if (d === 1) y += len; else if (d === 2) { x += len; y += len; } else { x += len; y -= len; } pts.push([x, y]); }
        stroke(c, P, P.c.green, .45, 2); path(c, pts); c.stroke();
        fill(c, P, P.c.orange, .6); for (const [px, py] of [pts[0], pts[pts.length - 1]]) { dot(c, px, py, 4); }
        if (r() < .2) { const [a, b] = [pts[0], pts[1]], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; fill(c, P, P.surface, 1); c.fillRect(mx - 10, my - 5, 20, 10); stroke(c, P, P.fg, .5); c.strokeRect(mx - 10, my - 5, 20, 10); }
      }
    },
  }],
  ["iron-filings", "still", "red", ["Eisenspäne", "Feldlinien eines Stabmagneten"], ["Limatura di ferro", "Linee di campo di una calamita"], {
    draw(c, s, E) {
      const r = rnd(507), { P } = E, ax = E.w * .5 - 60, bx = E.w * .5 + 60, cy = E.h * .5;
      for (let i = 0; i < dens(E, 200, 1500, 9000); i++) {
        const x = r() * E.w, y = r() * E.h, d1 = Math.hypot(x - ax, y - cy) + 1, d2 = Math.hypot(x - bx, y - cy) + 1;
        const fx = (x - ax) / d1 ** 3 - (x - bx) / d2 ** 3, fy = (y - cy) / d1 ** 3 - (y - cy) / d2 ** 3, a = Math.atan2(fy, fx);
        stroke(c, P, P.fg, .3); seg(c, x - Math.cos(a) * 4, y - Math.sin(a) * 4, x + Math.cos(a) * 4, y + Math.sin(a) * 4);
      }
      fill(c, P, P.c.red, .5); c.fillRect(ax - 40, cy - 16, 80, 32); fill(c, P, P.c.blue, .5); c.fillRect(bx - 40, cy - 16, 80, 32);
      fill(c, P, P.bg, 1); text(c, "N", ax - 20, cy, 16, 600); text(c, "S", bx + 20, cy, 16, 600);
    },
  }],
  ["lattice", "still", "blue", ["Kristallgitter", "Atome im kubischen Gitter"], ["Reticolo cristallino", "Atomi in un reticolo cubico"], {
    draw(c, s, E) {
      const { P } = E, k = 56, ox = 30, oy = 30;
      for (let z = 4; z >= 0; z--) for (let j = 0; j * k < E.h + 100; j++) for (let i = 0; i * k < E.w + 100; i++) {
        const x = ox + i * k + z * 18, y = oy + j * k - z * 14, col = (i + j + z) % 2 ? 3 : 1;
        stroke(c, P, P.muted, .14 + (4 - z) * .03); seg(c, x, y, x + k, y); seg(c, x, y, x, y + k); if (z) seg(c, x, y, x - 18, y + 14);
        fill(c, P, L(P, col), .2 + (4 - z) * .08); dot(c, x, y, 3 + (4 - z));
      }
    },
  }],
  ["diatoms", "still", "mauve", ["Kieselalgen", "Mikroskopisch kleine Glasschalen"], ["Diatomee", "Minuscoli gusci di vetro al microscopio"], {
    draw(c, s, E) {
      const r = rnd(508), { P } = E;
      for (let i = 0; i < dens(E, 24000, 12, 50); i++) {
        const x = r() * E.w, y = r() * E.h, rr = 20 + r() * 34, n = 6 + (r() * 10 | 0), col = L(P, i);
        stroke(c, P, col, .5, 1.2); ring(c, x, y, rr); ring(c, x, y, rr * .55);
        for (let k = 0; k < n; k++) { const a = k / n * TAU; seg(c, x + Math.cos(a) * rr * .55, y + Math.sin(a) * rr * .55, x + Math.cos(a) * rr, y + Math.sin(a) * rr); fill(c, P, col, .4); dot(c, x + Math.cos(a + Math.PI / n) * rr * .78, y + Math.sin(a + Math.PI / n) * rr * .78, 2); }
      }
    },
  }],
  ["ammonites", "still", "orange", ["Ammoniten", "Versteinerte Spiralschnecken"], ["Ammoniti", "Conchiglie a spirale fossili"], {
    draw(c, s, E) {
      const r = rnd(509), { P } = E;
      for (let i = 0; i < dens(E, 40000, 6, 24); i++) {
        const x = r() * E.w, y = r() * E.h, sz = 20 + r() * 40, rot = r() * TAU, b = .18;
        stroke(c, P, P.c.orange, .5, 2); param(c, u => { const th = u * 4 * TAU, rr = sz * .1 * Math.exp(b * th); return [x + Math.cos(th + rot) * rr, y + Math.sin(th + rot) * rr]; }, 300); c.stroke();
        stroke(c, P, P.muted, .35, 1); for (let th = 2; th < 4 * TAU; th += .35) { const r1 = sz * .1 * Math.exp(b * th), r2 = sz * .1 * Math.exp(b * (th - TAU)); seg(c, x + Math.cos(th + rot) * r1, y + Math.sin(th + rot) * r1, x + Math.cos(th + rot) * r2, y + Math.sin(th + rot) * r2); }
      }
    },
  }],
  ["pollen", "still", "yellow", ["Pollen", "Stachelige Pollenkörner"], ["Polline", "Granuli di polline spinosi"], {
    draw(c, s, E) {
      const r = rnd(510), { P } = E;
      for (let i = 0; i < dens(E, 9000, 30, 140); i++) { const x = r() * E.w, y = r() * E.h, rr = 6 + r() * 14, col = L(P, i % 2 ? 1 : 2); fill(c, P, col, .4); starPath(c, x, y, rr * 1.35, rr, 12 + (r() * 10 | 0), r()); c.fill(); fill(c, P, P.bg, .4); dot(c, x - rr * .3, y - rr * .3, rr * .3); }
    },
  }],
  ["weather-map", "still", "blue", ["Wetterkarte", "Isobaren, Hoch und Tief, Fronten"], ["Carta meteo", "Isobare, alta e bassa pressione, fronti"], {
    draw(c, s, E) {
      const { P } = E, H = [E.w * .25, E.h * .4], T = [E.w * .78, E.h * .55];
      for (let k = 1; k < 14; k++) { stroke(c, P, P.muted, .35, 1.2); for (const [x, y] of [H, T]) { c.beginPath(); c.ellipse(x, y, k * 42, k * 30, .2, 0, TAU); c.stroke(); } }
      fill(c, P, P.c.blue, .6); text(c, "H", H[0], H[1], 40, 600); fill(c, P, P.c.red, .6); text(c, "T", T[0], T[1], 40, 600);
      const front = x => T[1] - 40 + Math.sin(x / 120) * 30;
      stroke(c, P, P.c.blue, .6, 2.5); curve(c, front, T[0] - 500, T[0] - 60, 8); c.stroke();
      fill(c, P, P.c.blue, .6); for (let x = T[0] - 480; x < T[0] - 60; x += 50) { const y = front(x); path(c, [[x, y], [x + 18, y], [x + 9, y - 16]], true); c.fill(); }
      fill(c, P, P.c.red, .6); for (let x = T[0] - 40; x < T[0] + 360; x += 50) { const y = T[1] + 60 + Math.sin(x / 90) * 20; c.beginPath(); c.arc(x + 9, y, 9, Math.PI, TAU); c.fill(); }
    },
  }],
  ["seismogram", "still", "red", ["Seismogramm", "Ausschläge auf Endlospapier"], ["Sismogramma", "Oscillazioni su carta continua"], {
    draw(c, s, E) {
      const r = rnd(511), { P } = E;
      for (let y = 30, row = 0; y < E.h; y += 40, row++) {
        const quake = r() * E.w, size = r() < .3 ? 1 : .25;
        stroke(c, P, P.line, 1); seg(c, 0, y, E.w, y);
        stroke(c, P, row % 4 ? P.fg : P.c.red, .35, 1.2); curve(c, x => { const d = Math.abs(x - quake); return y + (r() - .5) * 3 + (r() - .5) * 60 * size * Math.exp(-d / 60); }, 0, E.w, 2); c.stroke();
      }
    },
  }],
  ["spectra", "still", "mauve", ["Spektrallinien", "Emissionslinien verschiedener Elemente"], ["Righe spettrali", "Righe di emissione di vari elementi"], {
    draw(c, s, E) {
      const r = rnd(512), { P } = E;
      for (let y = 20, k = 0; y < E.h; y += 48, k++) {
        fill(c, P, P.fg, .05); c.fillRect(20, y, E.w - 40, 32);
        for (let i = 0; i < 6 + r() * 10; i++) { const x = 20 + r() * (E.w - 40); fill(c, P, L(P, x / E.w * 6), .45 + r() * .4); c.fillRect(x, y, 2 + r() * 3, 32); }
        fill(c, P, P.muted, .6); text(c, ELEMENTS[k % ELEMENTS.length], 10, y + 16, 11, 600, "left");
      }
    },
  }],
  ["glassware", "still", "blue", ["Laborglas", "Kolben, Reagenzgläser, Bechergläser"], ["Vetreria", "Beute, provette e becher"], {
    draw(c, s, E) {
      const r = rnd(513), { P } = E;
      for (let i = 0; i < dens(E, 26000, 12, 50); i++) {
        const x = r() * E.w, y = r() * E.h, k = i % 3, col = L(P, i);
        if (k === 0) flask(c, P, x, y, col, .5 + r() * .4);
        else if (k === 1) { stroke(c, P, P.muted, .55, 2); c.beginPath(); c.moveTo(x - 8, y - 70); c.lineTo(x - 8, y - 8); c.arc(x, y - 8, 8, Math.PI, 0, true); c.lineTo(x + 8, y - 70); c.stroke(); fill(c, P, col, .35); c.fillRect(x - 7, y - 30, 14, 22); }
        else { stroke(c, P, P.muted, .55, 2); path(c, [[x - 26, y - 56], [x - 22, y], [x + 22, y], [x + 26, y - 56]]); c.stroke(); fill(c, P, col, .3); c.fillRect(x - 22, y - 26, 44, 26); for (let t = 0; t < 4; t++) { stroke(c, P, P.muted, .4); seg(c, x - 22, y - 12 - t * 10, x - 14, y - 12 - t * 10); } }
      }
    },
  }],
  // ----- motion -----
  ["helix-spin", "motion", "mauve", ["Rotierende DNA", "Die Doppelhelix dreht sich"], ["DNA rotante", "La doppia elica che ruota"], {
    draw(c, s, E) {
      const { P } = E;
      for (let x0 = 80; x0 < E.w; x0 += 260) for (let y = -10; y < E.h + 10; y += 10) {
        const a = y / 36 + E.t / 900 + x0, x1 = x0 + Math.sin(a) * 46, x2 = x0 - Math.sin(a) * 46, front = Math.cos(a) > 0;
        if (Math.round(y / 10) % 3 === 0) { stroke(c, P, L(P, Math.round(y / 30)), .35, 3); seg(c, x1, y, x2, y); }
        fill(c, P, P.c.blue, front ? .65 : .2); dot(c, x1, y, front ? 5 : 3.5); fill(c, P, P.c.mauve, front ? .2 : .65); dot(c, x2, y, front ? 3.5 : 5);
      }
    },
  }],
  ["atoms", "motion", "blue", ["Atommodelle", "Elektronen kreisen auf ihren Bahnen"], ["Modelli atomici", "Elettroni che girano nelle loro orbite"], {
    init: E => swarm(E, dens(E, 70000, 4, 14), () => ({ n: 1 + (R() * 3 | 0) })),
    draw(c, s, E) {
      const { P } = E;
      for (const a of s) {
        for (let k = 0; k < 3; k++) {
          const rot = k / 3 * Math.PI + a.ph; stroke(c, P, P.muted, .35, 1.2); c.beginPath(); c.ellipse(a.x, a.y, 60, 20, rot, 0, TAU); c.stroke();
          const u = E.t / (700 + k * 230) + a.ph * k, ex = Math.cos(u) * 60, ey = Math.sin(u) * 20;
          fill(c, P, L(P, k + a.i), .8); dot(c, a.x + ex * Math.cos(rot) - ey * Math.sin(rot), a.y + ex * Math.sin(rot) + ey * Math.cos(rot), 4);
        }
        fill(c, P, P.c.red, .6); dot(c, a.x - 3, a.y, 6); fill(c, P, P.c.blue, .6); dot(c, a.x + 4, a.y + 2, 6);
      }
    },
  }],
  ["orbits", "motion", "orange", ["Planetenbahnen", "Die Planeten umrunden die Sonne"], ["Orbite", "I pianeti girano attorno al sole"], {
    draw(c, s, E) {
      const { P } = E, cx = E.w / 2, cy = E.h / 2, k = Math.min(E.w, E.h) * .48 / Math.sqrt(30);
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, 80); g.addColorStop(0, P.c.yellow); g.addColorStop(1, clear(P.c.yellow)); A(c, .6, P); c.fillStyle = g; c.fillRect(cx - 80, cy - 80, 160, 160);
      PLANETS.forEach(([d, sz, col], i) => { const rr = Math.sqrt(d) * k, a = E.t / 1200 / d ** 1.5 * 4 + i; stroke(c, P, P.muted, .25); ring(c, cx, cy, rr); fill(c, P, P.c[col], .75); dot(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, sz * .7); });
    },
  }],
  ["brownian", "motion", "yellow", ["Brownsche Bewegung", "Pollen zittern zwischen Molekülen"], ["Moto browniano", "Pollini che tremano tra le molecole"], {
    init: E => ({ small: swarm(E, dens(E, 1500, 200, 900)), big: swarm(E, dens(E, 60000, 4, 14), () => ({ trail: [] })) }),
    draw(c, s, E) {
      const { P } = E;
      fill(c, P, P.muted, .35); for (const p of s.small) { p.x = wrap(p.x + (R() - .5) * 6, E.w); p.y = wrap(p.y + (R() - .5) * 6, E.h); c.fillRect(p.x, p.y, 2, 2); }
      for (const b of s.big) { b.x = wrap(b.x + (R() - .5) * 3, E.w); b.y = wrap(b.y + (R() - .5) * 3, E.h); b.trail.push([b.x, b.y]); if (b.trail.length > 200) b.trail.shift(); stroke(c, P, P.c.orange, .35, 1); path(c, b.trail); c.stroke(); fill(c, P, P.c.yellow, .7); starPath(c, b.x, b.y, 10, 7, 10); c.fill(); }
    },
  }],
  ["interference", "motion", "blue", ["Interferenz", "Zwei Wellenzentren überlagern sich"], ["Interferenza", "Due sorgenti di onde che si sovrappongono"], {
    draw(c, s, E) {
      const { P } = E, a = [E.w * .4, E.h * .5], b = [E.w * .6, E.h * .5], G = 10;
      for (let y = 0; y < E.h; y += G) for (let x = 0; x < E.w; x += G) {
        const v = Math.sin(Math.hypot(x - a[0], y - a[1]) / 14 - E.t / 300) + Math.sin(Math.hypot(x - b[0], y - b[1]) / 14 - E.t / 300);
        if (v > .6) { fill(c, P, P.c.blue, (v - .6) * .3); c.fillRect(x, y, G, G); }
      }
    },
  }],
  ["springs", "motion", "green", ["Federpendel", "Massen schwingen an Federn"], ["Molle", "Masse che oscillano su molle"], {
    draw(c, s, E) {
      const { P } = E, n = Math.floor(E.w / 90);
      for (let i = 0; i < n; i++) {
        const x = 45 + i * 90, len = E.h * .35 + Math.sin(E.t / (500 + i * 37)) * E.h * .12;
        stroke(c, P, P.muted, .5, 1.5); c.beginPath(); c.moveTo(x, 0); for (let k = 0; k <= 30; k++) c.lineTo(x + (k % 2 ? 10 : -10) * (k > 0 && k < 30), k / 30 * len); c.stroke();
        fill(c, P, L(P, i), .55); c.fillRect(x - 18, len, 36, 30);
      }
    },
  }],
  ["ekg", "motion", "red", ["Herzschlag", "Eine EKG-Kurve läuft durch"], ["Battito", "Una curva ECG che scorre"], {
    draw(c, s, E) {
      const { P } = E, beat = u => { const k = mod(u, 1); return k < .1 ? Math.sin(k / .1 * Math.PI) * 6 : k < .16 ? 0 : k < .18 ? -10 : k < .21 ? 60 : k < .24 ? -20 : k < .4 ? 0 : k < .5 ? Math.sin((k - .4) / .1 * Math.PI) * 12 : 0; };
      for (const y0 of [E.h * .3, E.h * .75]) {
        stroke(c, P, P.c.red, .12); for (let x = 0; x < E.w; x += 20) seg(c, x, y0 - 80, x, y0 + 80); for (let y = y0 - 80; y <= y0 + 80; y += 20) seg(c, 0, y, E.w, y);
        const head = mod(E.t * .25, E.w);
        stroke(c, P, P.c.red, .65, 2); curve(c, x => y0 - beat((x - E.t * .25) / 260 + 10), Math.max(0, head - E.w * .8), head, 2); c.stroke();
        fill(c, P, P.c.red, .9); dot(c, head, y0 - beat((head - E.t * .25) / 260 + 10), 4);
      }
    },
  }],
  ["bubbling-flasks", "motion", "green", ["Blubbern", "Bläschen steigen in Glaskolben"], ["Bolle", "Bollicine che salgono nelle beute"], {
    init: E => ({ bubbles: [], flasks: many(Math.max(2, Math.floor(E.w / 260)), i => ({ x: (i + .5) * E.w / Math.max(2, Math.floor(E.w / 260)), col: i })) }),
    draw(c, s, E) {
      const { P } = E, y = E.h - 30;
      for (const f of s.flasks) { flask(c, P, f.x, y, L(P, f.col), .8); if (R() < .3) s.bubbles.push({ x: f.x + (R() - .5) * 40, y: y - 6, v: .03 + R() * .05, r: 2 + R() * 4, col: f.col }); }
      s.bubbles = s.bubbles.filter(b => b.y > -10);
      for (const b of s.bubbles) { b.y -= b.v * E.dt; b.x += Math.sin(b.y / 20) * .3; stroke(c, P, L(P, b.col), .5, 1.2); ring(c, b.x, b.y, b.r + (y - b.y) / 120); }
    },
  }],
  ["mitosis", "motion", "mauve", ["Zellteilung", "Zellen teilen sich und wachsen"], ["Mitosi", "Cellule che si dividono e crescono"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 150, (x, y, i, j) => {
        const k = mod(E.t / 4000 + i * .17 + j * .31, 1), sep = k < .5 ? 0 : (k - .5) * 2 * 30, pinch = Math.sin(Math.min(1, k * 2) * Math.PI / 2);
        const cx = x + 75, cy = y + 75, col = L(P, i + j);
        fill(c, P, col, .2); stroke(c, P, col, .55, 2);
        if (k < .5) { c.beginPath(); c.ellipse(cx, cy, 32 + pinch * 10, 32 - pinch * 6, 0, 0, TAU); c.fill(); c.stroke(); }
        else { for (const d of [-1, 1]) { c.beginPath(); c.arc(cx + d * (sep + 4), cy, 28 - sep * .2, 0, TAU); c.fill(); c.stroke(); } }
        fill(c, P, P.c.mauve, .6); for (const d of k < .3 ? [0] : [-1, 1]) dot(c, cx + d * (k < .5 ? 12 : sep + 4), cy, 7);
      });
    },
  }],
  ["compasses", "motion", "red", ["Kompassnadeln", "Nadeln folgen einem wandernden Magnetfeld"], ["Aghi della bussola", "Aghi che seguono un campo magnetico in movimento"], {
    draw(c, s, E) {
      const { P } = E, mx = E.w / 2 + Math.cos(E.t / 4000) * E.w * .3, my = E.h / 2 + Math.sin(E.t / 3000) * E.h * .3;
      grid(E, 50, (x, y) => {
        const a = Math.atan2(my - y, mx - x) + Math.sin(E.t / 200 + x) * .05; stroke(c, P, P.muted, .3); ring(c, x + 25, y + 25, 16);
        at(c, x + 25, y + 25, a, 1, () => { fill(c, P, P.c.red, .6); path(c, [[14, 0], [0, -3], [0, 3]], true); c.fill(); fill(c, P, P.c.blue, .6); path(c, [[-14, 0], [0, -3], [0, 3]], true); c.fill(); });
      });
    },
  }],
  ["sound-wave", "motion", "blue", ["Schallwelle", "Luftteilchen verdichten und verdünnen sich"], ["Onda sonora", "Particelle d'aria che si comprimono e si diradano"], {
    draw(c, s, E) {
      const { P } = E;
      for (let y = 15; y < E.h; y += 15) for (let x = 0; x < E.w; x += 15) { const dx = Math.sin(x / 60 - E.t / 300) * 6; fill(c, P, P.c.blue, .2 + (Math.cos(x / 60 - E.t / 300) + 1) * .2); dot(c, x + dx, y + (y * 13 % 7) - 3, 2.2); }
      fill(c, P, P.muted, .6); for (let k = 0; k < 3; k++) { stroke(c, P, P.muted, .5, 2); c.beginPath(); c.arc(-10, E.h / 2, 30 + k * 20, -.6, .6); c.stroke(); }
    },
  }],
  ["gas", "motion", "orange", ["Ideales Gas", "Teilchen stoßen in einer Kiste"], ["Gas ideale", "Particelle che urtano in una scatola"], {
    init: E => swarm(E, dens(E, 6000, 50, 200), () => ({ vx: (R() - .5) * .35, vy: (R() - .5) * .35 })),
    draw(c, s, E) {
      const { P } = E;
      for (const p of s) { p.x += p.vx * E.dt; p.y += p.vy * E.dt; if (p.x < 6 || p.x > E.w - 6) p.vx *= -1; if (p.y < 6 || p.y > E.h - 6) p.vy *= -1; p.x = clamp(p.x, 6, E.w - 6); p.y = clamp(p.y, 6, E.h - 6); const sp = Math.hypot(p.vx, p.vy); fill(c, P, sp > .2 ? P.c.red : sp > .12 ? P.c.orange : P.c.blue, .55); dot(c, p.x, p.y, 4); }
      stroke(c, P, P.muted, .5, 3); c.strokeRect(3, 3, E.w - 6, E.h - 6);
    },
  }],
  ["ripple-tank", "motion", "blue", ["Wellenwanne", "Tropfen erzeugen Kreiswellen"], ["Vasca ondoso", "Gocce che generano onde circolari"], {
    init: () => ({ drops: [], next: 0 }),
    draw(c, s, E) {
      const { P } = E;
      if (E.t > s.next) { s.next = E.t + 900; s.drops.push([R() * E.w, R() * E.h, E.t]); }
      s.drops = s.drops.filter(d => E.t - d[2] < 5000);
      for (const [x, y, t0] of s.drops) for (let k = 0; k < 6; k++) { const rr = (E.t - t0) * .12 - k * 22; if (rr > 0) { stroke(c, P, P.c.blue, (1 - (E.t - t0) / 5000) * (.5 - k * .06), 2); ring(c, x, y, rr); } }
    },
  }],
  ["weather-moving", "motion", "blue", ["Wetterlage", "Hoch und Tief ziehen über die Karte"], ["Situazione meteo", "Alte e basse pressioni che attraversano la carta"], {
    draw(c, s, E) {
      const { P } = E, H = [mod(E.t * .01, E.w + 400) - 200, E.h * .35], T = [mod(E.t * .01 + E.w / 2, E.w + 400) - 200, E.h * .65];
      for (let k = 1; k < 10; k++) for (const [[x, y], col] of [[H, P.c.blue], [T, P.c.red]]) { stroke(c, P, col, .3, 1.2); c.beginPath(); c.ellipse(x, y, k * 40, k * 28, Math.sin(E.t / 5000) * .3, 0, TAU); c.stroke(); }
      fill(c, P, P.c.blue, .6); text(c, "H", H[0], H[1], 36, 600); fill(c, P, P.c.red, .6); text(c, "T", T[0], T[1], 36, 600);
    },
  }],
  ["comets", "motion", "yellow", ["Kometen", "Schweife ziehen über den Himmel"], ["Comete", "Code luminose che attraversano il cielo"], {
    init: E => many(dens(E, 160000, 3, 8), () => ({ x: R() * E.w, y: R() * E.h, a: .3 + R() * .4, v: .08 + R() * .1 })),
    draw(c, s, E) {
      const { P } = E;
      for (const k of s) {
        k.x += Math.cos(k.a) * k.v * E.dt; k.y += Math.sin(k.a) * k.v * E.dt; if (k.x > E.w + 200 || k.y > E.h + 200) { k.x = -200 + R() * E.w * .5; k.y = -100; }
        const g = c.createLinearGradient(k.x, k.y, k.x - Math.cos(k.a) * 200, k.y - Math.sin(k.a) * 200); g.addColorStop(0, P.c.yellow); g.addColorStop(1, clear(P.c.yellow));
        c.strokeStyle = g; A(c, .7, P); c.lineWidth = 5; c.lineCap = "round"; seg(c, k.x, k.y, k.x - Math.cos(k.a) * 200, k.y - Math.sin(k.a) * 200); c.lineCap = "butt";
        fill(c, P, P.c.yellow, .9); dot(c, k.x, k.y, 4);
      }
    },
  }],
  ["polar-lights", "motion", "green", ["Polarlichter", "Leuchtende Vorhänge am Nachthimmel"], ["Aurora boreale", "Tende luminose nel cielo notturno"], {
    draw(c, s, E) {
      const { P } = E;
      for (let band = 0; band < 3; band++) for (let x = 0; x < E.w; x += 10) {
        const top = E.h * (.1 + band * .12) + noise(x / 200 + E.t / 4000 + band * 4, band) * 120, h = 80 + noise(x / 90 + band, E.t / 3000) * 160;
        const g = c.createLinearGradient(0, top, 0, top + h); g.addColorStop(0, clear(band === 1 ? P.c.mauve : P.c.green)); g.addColorStop(.6, band === 1 ? P.c.mauve : P.c.green); g.addColorStop(1, clear(band === 1 ? P.c.mauve : P.c.green));
        A(c, .15, P); c.fillStyle = g; c.fillRect(x, top, 10, h);
      }
    },
  }],
  ["seismo-live", "motion", "red", ["Seismograf", "Die Nadel schreibt die Erdbewegung"], ["Sismografo", "L'ago scrive i movimenti della terra"], {
    init: () => ({ ys: [], q: 0 }),
    draw(c, s, E) {
      const { P } = E, y0 = E.h / 2;
      if (R() < .004) s.q = 1; s.q *= .985;
      s.ys.push((R() - .5) * (4 + s.q * 160)); if (s.ys.length > E.w / 2) s.ys.shift();
      stroke(c, P, P.c.red, .55, 1.4); c.beginPath(); s.ys.forEach((v, i) => { const x = E.w - (s.ys.length - i) * 2; i ? c.lineTo(x, y0 + v) : c.moveTo(x, y0 + v); }); c.stroke();
      stroke(c, P, P.line, 1); for (let y = y0 - 120; y <= y0 + 120; y += 40) seg(c, 0, y, E.w, y);
    },
  }],
  ["plankton", "motion", "blue", ["Plankton", "Strahlentierchen treiben und drehen sich"], ["Plancton", "Radiolari che fluttuano e ruotano"], {
    init: E => swarm(E, dens(E, 26000, 10, 40), () => ({ n: 5 + (R() * 8 | 0), sz: 12 + R() * 22 })),
    draw(c, s, E) {
      const { P } = E;
      for (const p of s) {
        p.x = wrap(p.x + p.vx * E.dt * .5, E.w, 40); p.y = wrap(p.y - .005 * E.dt + Math.sin(E.t / 2000 + p.ph) * .2, E.h, 40);
        const rot = E.t / 3000 + p.ph; stroke(c, P, L(P, p.i), .5, 1.2); ring(c, p.x, p.y, p.sz * .5);
        for (let k = 0; k < p.n; k++) { const a = rot + k / p.n * TAU; seg(c, p.x + Math.cos(a) * p.sz * .5, p.y + Math.sin(a) * p.sz * .5, p.x + Math.cos(a) * p.sz, p.y + Math.sin(a) * p.sz); fill(c, P, L(P, p.i), .5); dot(c, p.x + Math.cos(a) * p.sz, p.y + Math.sin(a) * p.sz, 1.8); }
      }
    },
  }],
  ["crystal-growth", "motion", "blue", ["Kristallwachstum", "Ein Eiskristall wächst und taut"], ["Crescita di cristalli", "Un cristallo di ghiaccio che cresce e si scioglie"], {
    draw(c, s, E) {
      const { P } = E, k = mod(E.t / 9000, 1), g = k < .7 ? k / .7 : 1 - (k - .7) / .3;
      for (const [cx, cy, sz] of [[E.w * .15, E.h * .35, 150], [E.w * .85, E.h * .65, 190]]) {
        const arm = (x, y, a, len, d) => { if (d === 0 || len < 4) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; stroke(c, P, P.c.blue, .6, d); seg(c, x, y, x2, y2); for (let t = .4; t < 1; t += .3) { const bx = x + (x2 - x) * t, by = y + (y2 - y) * t; arm(bx, by, a + Math.PI / 3, len * .35 * (1 - t * .5), d - 1); arm(bx, by, a - Math.PI / 3, len * .35 * (1 - t * .5), d - 1); } };
        for (let i = 0; i < 6; i++) arm(cx, cy, i / 6 * TAU + E.t / 20000, sz * g, 3);
      }
    },
  }],
  ["earth-spin", "motion", "green", ["Drehende Erde", "Längenkreise wandern um den Globus"], ["Terra che gira", "I meridiani scorrono sul globo"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [cx, cy, rr] of [[E.w * .14, E.h * .32, Math.min(E.w, E.h) * .22], [E.w * .86, E.h * .72, Math.min(E.w, E.h) * .28]]) {
        fill(c, P, P.c.blue, .12); dot(c, cx, cy, rr); stroke(c, P, P.c.blue, .5, 1.5); ring(c, cx, cy, rr);
        for (let lat = -60; lat <= 60; lat += 30) { const y = cy - Math.sin(lat / 57.3) * rr; stroke(c, P, P.c.blue, .3); seg(c, cx - Math.cos(lat / 57.3) * rr, y, cx + Math.cos(lat / 57.3) * rr, y); }
        for (let lon = 0; lon < 360; lon += 20) { const a = (lon / 57.3 + E.t / 3000) % TAU, x = Math.sin(a); if (Math.cos(a) < 0) continue; stroke(c, P, lon === 0 ? P.c.red : P.c.green, lon === 0 ? .7 : .4, lon === 0 ? 2 : 1); c.beginPath(); c.ellipse(cx, cy, Math.abs(x) * rr, rr, 0, x > 0 ? -Math.PI / 2 : Math.PI / 2, x > 0 ? Math.PI / 2 : Math.PI * 1.5); c.stroke(); }
      }
    },
  }],
  // ----- touch -----
  ["magnet-touch", "touch", "red", ["Magnet am Zeiger", "Eisenspäne richten sich zum Zeiger aus"], ["Calamita al puntatore", "La limatura si orienta verso il puntatore"], {
    init: E => { const r = rnd(514); return { pts: many(dens(E, 260, 1200, 7000), () => [r() * E.w, r() * E.h]) }; },
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, E.w / 2, E.h / 2, 120);
      stroke(c, P, P.fg, .3);
      c.beginPath();
      for (const [x, y] of s.pts) { const a = Math.atan2(y - s.y, x - s.x) + (1 - f) * .8 + Math.PI / 2 * (1 - f); c.moveTo(x - Math.cos(a) * 4, y - Math.sin(a) * 4); c.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); }
      c.stroke();
      return f < .01 && !E.ptr.on;
    },
  }],
  ["gravity", "touch", "mauve", ["Schwerkraft", "Teilchen fallen in den Brunnen am Zeiger"], ["Gravità", "Particelle che cadono nel pozzo del puntatore"], {
    init: E => swarm(E, dens(E, 5000, 60, 260)),
    draw(c, s, E) {
      const { P } = E, on = E.ptr.on && !E.still;
      for (const p of s) {
        if (on) { const dx = E.ptr.x - p.x, dy = E.ptr.y - p.y, d2 = dx * dx + dy * dy + 900; p.vx += dx / d2 * E.dt * .8; p.vy += dy / d2 * E.dt * .8; }
        p.vx *= .995; p.vy *= .995; p.x = wrap(p.x + p.vx * E.dt, E.w); p.y = wrap(p.y + p.vy * E.dt, E.h);
        fill(c, P, L(P, p.i), .55); dot(c, p.x, p.y, 2.2);
      }
      return false;
    },
  }],
  ["prism", "touch", "yellow", ["Prisma", "Ein Lichtstrahl zum Zeiger fächert sich auf"], ["Prisma", "Un raggio di luce verso il puntatore si apre a ventaglio"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, cx = E.w / 2, cy = E.h / 2;
      follow(s, E, cx + Math.cos(E.t / 3000) * 300, cy + Math.sin(E.t / 3000) * 200, 120);
      fill(c, P, P.surface, .8); ngon(c, cx, cy, 70, 3, -Math.PI / 2); c.fill(); stroke(c, P, P.muted, .6, 2); c.stroke();
      stroke(c, P, P.fg, .5, 3); seg(c, 0, cy + 10, cx - 30, cy + 10);
      const a = Math.atan2(s.y - cy, s.x - cx);
      for (let k = 0; k < 6; k++) { stroke(c, P, L(P, k), .6, 4); seg(c, cx + 20, cy, cx + 20 + Math.cos(a + (k - 2.5) * .06) * 2000, cy + Math.sin(a + (k - 2.5) * .06) * 2000); }
      return false;
    },
  }],
  ["microscope", "touch", "green", ["Mikroskop", "Unter dem Zeiger erscheinen Zellen vergrößert"], ["Microscopio", "Sotto il puntatore appaiono cellule ingrandite"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, E.w * .5 + Math.sin(E.t / 5000) * E.w * .3, E.h * .5, 120), R0 = 140;
      fill(c, P, P.muted, .08); grid(E, 20, (x, y) => c.fillRect(x + 9, y + 9, 2, 2));
      c.save(); c.beginPath(); c.arc(s.x, s.y, R0, 0, TAU); c.clip();
      fill(c, P, P.c.green, .08); c.fillRect(s.x - R0, s.y - R0, R0 * 2, R0 * 2);
      for (let j = -3; j < 4; j++) for (let i = -3; i < 4; i++) { const x = Math.floor(s.x / 60) * 60 + i * 60, y = Math.floor(s.y / 44) * 44 + j * 44; const rr = rnd(Math.round(x * 13 + y * 7)); fill(c, P, P.c.green, .15); stroke(c, P, P.c.green, .5, 2); rrect(c, x + 3, y + 3, 54, 38, 10); c.fill(); c.stroke(); fill(c, P, P.c.mauve, .5); dot(c, x + 15 + rr() * 30, y + 12 + rr() * 18, 6); }
      c.restore();
      stroke(c, P, P.fg, .5, 6); ring(c, s.x, s.y, R0);
      return f < .01 && !E.ptr.on;
    },
  }],
  ["field-lines", "touch", "blue", ["Elektrisches Feld", "Feldlinien zwischen Zeiger und Ladung"], ["Campo elettrico", "Linee di campo tra il puntatore e una carica"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E; follow(s, E, E.w * .7, E.h * .5, 120);
      const q = [[E.w * .3, E.h * .5, 1], [s.x, s.y, -1]];
      for (let k = 0; k < 24; k++) {
        let x = q[0][0] + Math.cos(k / 24 * TAU) * 8, y = q[0][1] + Math.sin(k / 24 * TAU) * 8;
        stroke(c, P, L(P, k), .45, 1.3); c.beginPath(); c.moveTo(x, y);
        for (let st = 0; st < 260; st++) {
          let fx = 0, fy = 0; for (const [qx, qy, sg] of q) { const dx = x - qx, dy = y - qy, d3 = (dx * dx + dy * dy) ** 1.5 + 1; fx += sg * dx / d3; fy += sg * dy / d3; }
          const m = Math.hypot(fx, fy) || 1; x += fx / m * 8; y += fy / m * 8; c.lineTo(x, y);
          if (Math.hypot(x - q[1][0], y - q[1][1]) < 8 || x < -50 || y < -50 || x > E.w + 50 || y > E.h + 50) break;
        }
        c.stroke();
      }
      fill(c, P, P.c.red, .8); dot(c, q[0][0], q[0][1], 10); fill(c, P, P.c.blue, .8); dot(c, s.x, s.y, 10);
      return false;
    },
  }],
  ["telescope", "touch", "yellow", ["Fernrohr", "Sternbilder tauchen unter dem Zeiger auf"], ["Cannocchiale", "Le costellazioni compaiono sotto il puntatore"], {
    init: E => { const r = rnd(516); return { cs: CONSTELLATIONS.map(([name, pts, ls], k) => { const sz = 180, x0 = (k + .5) * E.w / CONSTELLATIONS.length - sz / 2, y0 = r() * (E.h - sz); return { name, ls, q: pts.map(([x, y]) => [x0 + x * sz, y0 + y * sz]), cx: x0 + sz / 2, cy: y0 + sz / 2 }; }), stars: many(dens(E, 2000, 150, 900), () => [r() * E.w, r() * E.h, r()]) }; },
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, -999, 100);
      for (const [x, y, b] of s.stars) { const k = f * Math.max(0, 1 - Math.hypot(x - s.x, y - s.y) / 200); fill(c, P, P.muted, .25 + k * .5); dot(c, x, y, .5 + b + k * 1.5); }
      for (const cn of s.cs) {
        const k = f * Math.max(0, 1 - Math.hypot(cn.cx - s.x, cn.cy - s.y) / 260);
        stroke(c, P, P.c.blue, .1 + k * .6, 1.2); for (const [a, b] of cn.ls) seg(c, cn.q[a][0], cn.q[a][1], cn.q[b][0], cn.q[b][1]);
        fill(c, P, P.c.yellow, .3 + k * .6); for (const [x, y] of cn.q) { starPath(c, x, y, 5, 2, 4); c.fill(); }
        if (k > .05) { fill(c, P, P.fg, k * .7); text(c, cn.name, cn.cx, cn.cy + 110, 13, 600); }
      }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["optics", "touch", "blue", ["Sammellinse", "Strahlen bündeln sich im Brennpunkt am Zeiger"], ["Lente convergente", "Raggi che convergono nel fuoco al puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, lx = E.w * .35;
      follow(s, E, E.w * .7, E.h * .5 + Math.sin(E.t / 3000) * E.h * .2, 120);
      fill(c, P, P.c.blue, .2); c.beginPath(); c.ellipse(lx, E.h / 2, 18, E.h * .35, 0, 0, TAU); c.fill(); stroke(c, P, P.c.blue, .5, 2); c.stroke();
      for (let k = 0; k < 11; k++) { const y = E.h * .2 + k * E.h * .06; stroke(c, P, L(P, k), .5, 1.5); seg(c, 0, y, lx, y); seg(c, lx, y, s.x, s.y); seg(c, s.x, s.y, s.x + (s.x - lx) * 2, s.y + (s.y - y) * 2); }
      fill(c, P, P.c.yellow, .8); dot(c, s.x, s.y, 6);
      return false;
    },
  }],
  ["heat", "touch", "orange", ["Wärmeleitung", "Der Zeiger wärmt, die Wärme verteilt sich"], ["Conduzione del calore", "Il puntatore scalda, il calore si diffonde"], {
    init: E => { const G = 20, nx = Math.ceil(E.w / G), ny = Math.ceil(E.h / G); return { G, nx, ny, v: new Float32Array(nx * ny) }; },
    draw(c, s, E) {
      const { P } = E, { G, nx, ny, v } = s, n = new Float32Array(nx * ny); let total = 0;
      if (E.ptr.on && !E.still) { const i = clamp(Math.floor(E.ptr.x / G), 0, nx - 1), j = clamp(Math.floor(E.ptr.y / G), 0, ny - 1); v[j * nx + i] = 1; }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, avg = (v[k] * 4 + (v[k - 1] || 0) * (i > 0) + (v[k + 1] || 0) * (i < nx - 1) + (v[k - nx] || 0) + (v[k + nx] || 0)) / 8; n[k] = avg * .995; total += n[k]; }
      s.v = n;
      for (let k = 0; k < nx * ny; k++) if (n[k] > .01) { fill(c, P, n[k] > .3 ? P.c.red : n[k] > .1 ? P.c.orange : P.c.yellow, Math.min(.6, n[k] * 2)); c.fillRect((k % nx) * G, Math.floor(k / nx) * G, G, G); }
      return total < .5 && !E.ptr.on;
    },
  }],
  ["push-pendulums", "touch", "green", ["Pendel anstoßen", "Tippen bringt die Pendel in Schwung"], ["Spingere i pendoli", "Tocca per far oscillare i pendoli"], {
    init: E => many(Math.floor(E.w / 60), i => ({ x: 30 + i * 60, a: 0, v: 0, len: E.h * .5 + (i % 5) * 20 })),
    draw(c, s, E) {
      const { P } = E; let moving = false;
      for (const tap of E.ptr.taps.splice(0)) for (const p of s) { const d = tap.x - p.x; if (Math.abs(d) < 120) p.v += (d > 0 ? -1 : 1) * .004 * (1 - Math.abs(d) / 120); }
      for (const p of s) { p.v += -Math.sin(p.a) * .00002 * E.dt * 9.81 / (p.len / 300); p.v *= .999; p.a += p.v * E.dt; if (Math.abs(p.a) + Math.abs(p.v) > .001) moving = true; const x = p.x + Math.sin(p.a) * p.len, y = Math.cos(p.a) * p.len; stroke(c, P, P.muted, .4); seg(c, p.x, 0, x, y); fill(c, P, L(P, p.x / 60), .6); dot(c, x, y, 12); }
      return !moving;
    },
  }],
  ["doppler", "touch", "red", ["Doppler-Effekt", "Wellenfronten drängen sich in Bewegungsrichtung"], ["Effetto Doppler", "I fronti d'onda si addensano nella direzione del moto"], {
    init: () => ({ src: [], last: 0 }),
    draw(c, s, E) {
      const { P } = E; follow(s, E, E.w / 2 + Math.sin(E.t / 2500) * E.w * .35, E.h / 2, 300);
      if (E.t - s.last > 180) { s.last = E.t; s.src.push([s.x, s.y, E.t]); }
      s.src = s.src.filter(w => E.t - w[2] < 4000);
      for (const [x, y, t0] of s.src) { const k = (E.t - t0) / 4000; stroke(c, P, P.c.red, (1 - k) * .5, 1.5); ring(c, x, y, (E.t - t0) * .12); }
      fill(c, P, P.c.red, .9); dot(c, s.x, s.y, 6);
      return false;
    },
  }],
]);
