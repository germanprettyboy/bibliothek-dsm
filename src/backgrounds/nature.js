/* Extra backgrounds 9/10: nature and seasons */
import { clear, TAU, clamp, mod, rnd, R, many, dens, wrap, noise, A, L, fill, stroke, dot, ring, seg, path, ngon, starPath, rrect, curve, param, text, at, swarm, near, grid, follow, def } from "./kit.js";

function leaf(c, P, x, y, sz, rot, col, a = .45) {
  at(c, x, y, rot, sz / 30, () => {
    fill(c, P, col, a); c.beginPath(); c.moveTo(0, -30); c.quadraticCurveTo(20, -10, 0, 30); c.quadraticCurveTo(-20, -10, 0, -30); c.fill();
    stroke(c, P, P.bg, a * .8, 1.2); seg(c, 0, -26, 0, 28); for (let k = -16; k < 20; k += 9) { seg(c, 0, k, 8, k - 6); seg(c, 0, k, -8, k - 6); }
  });
}
function flower(c, P, x, y, rr, n, col, open = 1, rot = 0) {
  fill(c, P, col, .45);
  for (let k = 0; k < n; k++) { const a = rot + k / n * TAU; c.beginPath(); c.ellipse(x + Math.cos(a) * rr * .55 * open, y + Math.sin(a) * rr * .55 * open, rr * .45 * open + .5, rr * .2 * open + .5, a, 0, TAU); c.fill(); }
  fill(c, P, P.c.yellow, .7); dot(c, x, y, rr * .22 + 1);
}
function butterfly(c, P, x, y, sz, flap, col, rot = 0) {
  at(c, x, y, rot, sz / 20, () => {
    const k = .25 + Math.abs(flap) * .75;
    fill(c, P, col, .5);
    for (const sd of [-1, 1]) { c.save(); c.scale(sd * k, 1); c.beginPath(); c.ellipse(10, -8, 12, 9, -.5, 0, TAU); c.fill(); c.beginPath(); c.ellipse(8, 8, 8, 6, .5, 0, TAU); c.fill(); c.restore(); }
    fill(c, P, P.fg, .5); c.beginPath(); c.ellipse(0, 0, 2, 12, 0, 0, TAU); c.fill();
  });
}
function bird(c, P, x, y, s, flap) { stroke(c, P, P.fg, .45, 2); c.beginPath(); c.moveTo(x - s, y - flap * s * .5); c.quadraticCurveTo(x - s * .4, y - s * .3, x, y); c.quadraticCurveTo(x + s * .4, y - s * .3, x + s, y - flap * s * .5); c.stroke(); }
function snowflake(c, P, x, y, rr, rot, a = .5) {
  stroke(c, P, P.c.blue, a, 1.5);
  for (let k = 0; k < 6; k++) { const an = rot + k / 6 * TAU, ex = x + Math.cos(an) * rr, ey = y + Math.sin(an) * rr; seg(c, x, y, ex, ey); for (const t of [.45, .7]) { const bx = x + Math.cos(an) * rr * t, by = y + Math.sin(an) * rr * t; seg(c, bx, by, bx + Math.cos(an + .7) * rr * .25, by + Math.sin(an + .7) * rr * .25); seg(c, bx, by, bx + Math.cos(an - .7) * rr * .25, by + Math.sin(an - .7) * rr * .25); } }
}
const AUTUMN = P => [P.c.orange, P.c.red, P.c.yellow, P.c.mauve];

export default def("nature", [
  ["autumn-leaves", "still", "orange", ["Herbstlaub", "Bunte Blätter auf dem Boden"], ["Foglie d'autunno", "Foglie colorate per terra"], {
    draw(c, s, E) { const r = rnd(801), { P } = E, col = AUTUMN(P); for (let i = 0; i < dens(E, 6000, 50, 220); i++) leaf(c, P, r() * E.w, r() * E.h, 16 + r() * 24, r() * TAU, col[r() * 4 | 0], .35 + r() * .2); },
  }],
  ["ferns", "still", "green", ["Farne", "Gefiederte Wedel"], ["Felci", "Fronde piumate"], {
    draw(c, s, E) {
      const r = rnd(802), { P } = E;
      for (let i = 0; i < dens(E, 60000, 4, 16); i++) {
        const x = r() * E.w, y = E.h * (.5 + r() * .6), len = 160 + r() * 160, bend = (r() - .5) * .8;
        const pt = t => [x + Math.sin(t * bend * 2) * len * .3, y - t * len];
        stroke(c, P, P.c.green, .5, 2); param(c, pt, 40); c.stroke();
        for (let t = .1; t < 1; t += .05) { const [px, py] = pt(t), l = (1 - t) * 40 + 6; for (const sd of [-1, 1]) { fill(c, P, P.c.green, .35); c.beginPath(); c.ellipse(px + sd * l / 2, py, l / 2, 3, sd * -.4, 0, TAU); c.fill(); } }
      }
    },
  }],
  ["daisies", "still", "yellow", ["Gänseblümchen", "Eine Wiese voller kleiner Blüten"], ["Margherite", "Un prato pieno di fiorellini"], {
    draw(c, s, E) { const r = rnd(803), { P } = E; for (let i = 0; i < dens(E, 4000, 60, 300); i++) flower(c, P, r() * E.w, r() * E.h, 10 + r() * 14, 10 + (r() * 6 | 0), r() < .8 ? P.surface : P.c.mauve, 1, r()); },
  }],
  ["cherry-branch", "still", "mauve", ["Kirschzweig", "Ein blühender Ast"], ["Ramo di ciliegio", "Un ramo fiorito"], {
    draw(c, s, E) {
      const r = rnd(804), { P } = E;
      const br = (x, y, a, len, d) => { if (d === 0) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; stroke(c, P, P.fg, .3, d * 1.2); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + x2) / 2 + (r() - .5) * 20, (y + y2) / 2 + (r() - .5) * 20, x2, y2); c.stroke(); if (d < 3) for (let k = 0; k < 4; k++) flower(c, P, x2 + (r() - .5) * 30, y2 + (r() - .5) * 30, 8 + r() * 6, 5, P.c.mauve, 1, r() * TAU); br(x2, y2, a - .5 + r() * .3, len * .72, d - 1); br(x2, y2, a + .4 + r() * .3, len * .65, d - 1); };
      br(-10, E.h * .15, .25, Math.min(E.w, 900) * .25, 6); br(E.w + 10, E.h * .8, Math.PI - .3, Math.min(E.w, 900) * .22, 6);
    },
  }],
  ["tree-rings", "still", "orange", ["Jahresringe", "Holzscheiben mit wachsenden Ringen"], ["Anelli degli alberi", "Rondelle di legno con anelli di crescita"], {
    draw(c, s, E) {
      const r = rnd(805), { P } = E;
      for (let i = 0; i < dens(E, 70000, 4, 14); i++) { const x = r() * E.w, y = r() * E.h, rr = 50 + r() * 80; fill(c, P, P.c.orange, .14); dot(c, x, y, rr); for (let k = 4; k < rr; k += 3 + r() * 5) { stroke(c, P, P.c.orange, .3 + r() * .2); c.beginPath(); for (let q = 0; q <= 40; q++) { const a = q / 40 * TAU, d = k * (1 + noise(Math.cos(a) + i, Math.sin(a) + k / 30) * .12); q ? c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d) : c.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } c.stroke(); } stroke(c, P, P.muted, .5, 4); ring(c, x, y, rr); }
    },
  }],
  ["pine-forest", "still", "green", ["Nadelwald", "Tannen in mehreren Reihen"], ["Pineta", "Abeti su più file"], {
    draw(c, s, E) {
      const r = rnd(806), { P } = E;
      for (let row = 0; row < 4; row++) { const base = E.h * (.55 + row * .15), sc = .5 + row * .25; for (let x = -20; x < E.w + 40; x += (30 + r() * 30) * sc) { const h = (80 + r() * 60) * sc; fill(c, P, row % 2 ? P.c.green : P.muted, .15 + row * .07); for (let k = 0; k < 3; k++) { path(c, [[x - h * (.35 - k * .07), base - k * h * .28], [x, base - h - k * 4], [x + h * (.35 - k * .07), base - k * h * .28]], true); c.fill(); } c.fillRect(x - 3 * sc, base, 6 * sc, 12 * sc); } }
    },
  }],
  ["mushrooms", "still", "red", ["Pilze", "Fliegenpilze und Steinpilze"], ["Funghi", "Ovoli malefici e porcini"], {
    draw(c, s, E) { const r = rnd(807), { P } = E; for (let i = 0; i < dens(E, 24000, 12, 50); i++) { const x = r() * E.w, y = r() * E.h, sz = .7 + r() * .8, red = r() < .5; at(c, x, y, (r() - .5) * .3, sz, () => { fill(c, P, P.surface, .95); c.fillRect(-7, -4, 14, 30); fill(c, P, red ? P.c.red : P.c.orange, .5); c.beginPath(); c.arc(0, 0, 26, Math.PI, TAU); c.closePath(); c.fill(); if (red) { fill(c, P, P.bg, .9); for (const [dx, dy] of [[-12, -8], [4, -16], [14, -6], [-2, -6]]) dot(c, dx, dy, 3); } }); } },
  }],
  ["feathers", "still", "blue", ["Federn", "Leichte Vogelfedern"], ["Piume", "Leggere piume di uccello"], {
    draw(c, s, E) { const r = rnd(808), { P } = E; for (let i = 0; i < dens(E, 30000, 10, 40); i++) at(c, r() * E.w, r() * E.h, r() * TAU, .7 + r() * .6, () => { stroke(c, P, P.muted, .6, 1.5); seg(c, 0, -60, 0, 60); stroke(c, P, L(P, i), .35, 1); for (let y = -56; y < 44; y += 3) { const w = Math.sin((y + 60) / 120 * Math.PI) * 20; seg(c, 0, y, -w, y - 10); seg(c, 0, y, w, y - 10); } }); },
  }],
  ["shells", "still", "orange", ["Muscheln", "Jakobsmuscheln und Schneckenhäuser am Strand"], ["Conchiglie", "Capesante e chiocciole sulla spiaggia"], {
    draw(c, s, E) {
      const r = rnd(809), { P } = E;
      for (let i = 0; i < dens(E, 16000, 20, 80); i++) at(c, r() * E.w, r() * E.h, r() * TAU, .6 + r() * .6, () => {
        if (i % 2) { fill(c, P, L(P, i), .3); c.beginPath(); c.moveTo(0, 20); c.arc(0, 20, 34, Math.PI * 1.15, Math.PI * 1.85); c.closePath(); c.fill(); stroke(c, P, P.bg, .6, 1.5); for (let k = 1; k < 8; k++) { const a = Math.PI * (1.15 + k * .7 / 8); seg(c, 0, 20, Math.cos(a) * 34, 20 + Math.sin(a) * 34); } }
        else { stroke(c, P, L(P, i), .5, 2); param(c, u => { const th = u * 3 * TAU, rr = 2 * Math.exp(.17 * th); return [Math.cos(th) * rr, Math.sin(th) * rr]; }, 120); c.stroke(); }
      });
    },
  }],
  ["butterflies", "still", "mauve", ["Schmetterlingskasten", "Falter in Reih und Glied"], ["Collezione di farfalle", "Farfalle in fila ordinata"], {
    draw(c, s, E) { const { P } = E; grid(E, 90, (x, y, i, j) => { butterfly(c, P, x + 45, y + 45, 18, 1, L(P, i + j * 2)); stroke(c, P, P.line, 1); c.strokeRect(x + 6, y + 6, 78, 78); }); },
  }],
  ["footprints", "still", "green", ["Tierspuren", "Fährten von Vögeln, Katzen und Füchsen"], ["Impronte", "Tracce di uccelli, gatti e volpi"], {
    draw(c, s, E) {
      const r = rnd(810), { P } = E;
      for (let t = 0; t < 6; t++) {
        let x = r() * E.w, y = r() * E.h, a = r() * TAU; const kind = t % 3;
        for (let k = 0; k < 40; k++) {
          a += (r() - .5) * .3; x += Math.cos(a) * 36; y += Math.sin(a) * 36; const side = k % 2 ? 1 : -1, px = x + Math.cos(a + Math.PI / 2) * 10 * side, py = y + Math.sin(a + Math.PI / 2) * 10 * side;
          at(c, px, py, a + Math.PI / 2, 1, () => { if (kind === 0) { stroke(c, P, P.muted, .5, 1.5); seg(c, 0, 0, 0, -10); seg(c, 0, 0, -6, -8); seg(c, 0, 0, 6, -8); seg(c, 0, 0, 0, 5); } else { fill(c, P, kind === 1 ? P.muted : P.c.orange, .4); dot(c, 0, 0, 5); for (let q = 0; q < 4; q++) dot(c, -6 + q * 4, -8 - (q === 1 || q === 2) * 2, 2.2); } });
        }
      }
    },
  }],
  ["snowflakes", "still", "blue", ["Schneeflocken", "Sechsstrahlige Kristalle"], ["Fiocchi di neve", "Cristalli a sei punte"], {
    draw(c, s, E) { const r = rnd(811), { P } = E; for (let i = 0; i < dens(E, 12000, 30, 120); i++) snowflake(c, P, r() * E.w, r() * E.h, 8 + r() * 26, r(), .35 + r() * .3); },
  }],
  ["cacti", "still", "green", ["Kakteen", "Säulenkakteen in Töpfen"], ["Cactus", "Cactus a colonna nei vasi"], {
    draw(c, s, E) {
      const r = rnd(812), { P } = E;
      for (let i = 0; i < dens(E, 40000, 6, 22); i++) at(c, r() * E.w, r() * E.h, 0, .7 + r() * .6, () => {
        fill(c, P, P.c.orange, .4); path(c, [[-24, 40], [24, 40], [18, 70], [-18, 70]], true); c.fill();
        fill(c, P, P.c.green, .45); rrect(c, -12, -50, 24, 92, 12); c.fill(); rrect(c, 12, -20, 22, 12, 6); c.fill(); rrect(c, 24, -40, 12, 30, 6); c.fill(); rrect(c, -34, -6, 22, 12, 6); c.fill(); rrect(c, -34, -26, 12, 26, 6); c.fill();
        stroke(c, P, P.bg, .5); for (let y = -40; y < 36; y += 10) { seg(c, -4, y, -8, y - 3); seg(c, 4, y, 8, y - 3); }
        if (r() < .5) flower(c, P, 0, -52, 8, 6, P.c.red, 1);
      });
    },
  }],
  ["grass", "still", "green", ["Gras", "Halme in dichten Büscheln"], ["Erba", "Fili d'erba in fitti ciuffi"], {
    draw(c, s, E) { const r = rnd(813), { P } = E; for (let i = 0; i < dens(E, 150, 3000, 9000); i++) { const x = r() * E.w, y = r() * E.h, h = 10 + r() * 24, a = (r() - .5) * .6; stroke(c, P, r() < .2 ? P.c.yellow : P.c.green, .25 + r() * .25, 1.2); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + a * h, y - h * .6, x + a * h * 1.6, y - h); c.stroke(); } },
  }],
  ["pebbles", "still", "blue", ["Kiesel", "Glatte Steine am Flussufer"], ["Ciottoli", "Sassi lisci sulla riva del fiume"], {
    draw(c, s, E) { const r = rnd(814), { P } = E; for (let i = 0; i < dens(E, 1600, 150, 900); i++) { const x = r() * E.w, y = r() * E.h, rr = 6 + r() * 18; fill(c, P, r() < .5 ? P.muted : L(P, r() * 6), .14 + r() * .14); c.beginPath(); c.ellipse(x, y, rr, rr * (.6 + r() * .3), r() * TAU, 0, TAU); c.fill(); fill(c, P, P.bg, .25); c.beginPath(); c.ellipse(x - rr * .3, y - rr * .25, rr * .3, rr * .15, -.4, 0, TAU); c.fill(); } },
  }],
  ["clover", "still", "green", ["Klee", "Dreiblättriger und vierblättriger Klee"], ["Trifoglio", "Trifogli e quadrifogli"], {
    draw(c, s, E) { const r = rnd(815), { P } = E; for (let i = 0; i < dens(E, 6000, 50, 200); i++) { const x = r() * E.w, y = r() * E.h, n = r() < .05 ? 4 : 3, sz = 8 + r() * 10, rot = r() * TAU; fill(c, P, P.c.green, n === 4 ? .7 : .35); for (let k = 0; k < n; k++) { const a = rot + k / n * TAU; c.beginPath(); c.arc(x + Math.cos(a) * sz * .6, y + Math.sin(a) * sz * .6, sz * .55, 0, TAU); c.fill(); } stroke(c, P, P.c.green, .4, 1.2); seg(c, x, y, x + Math.cos(rot + 2) * sz * 2, y + Math.sin(rot + 2) * sz * 2); } },
  }],
  ["wheat", "still", "yellow", ["Ähren", "Ein Getreidefeld im Sommer"], ["Spighe", "Un campo di grano d'estate"], {
    draw(c, s, E) { const r = rnd(816), { P } = E; for (let x = 0; x < E.w; x += 12 + r() * 10) { const y = E.h * (.3 + r() * .7), h = 120 + r() * 120, bend = (r() - .5) * 30; stroke(c, P, P.c.yellow, .4, 1.5); c.beginPath(); c.moveTo(x, E.h); c.quadraticCurveTo(x, y, x + bend, y - h * .1); c.stroke(); fill(c, P, P.c.orange, .4); for (let k = 0; k < 9; k++) for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(x + bend + sd * 4, y - h * .1 - k * 7, 3, 6, sd * .4, 0, TAU); c.fill(); } } },
  }],
  ["honeycomb", "still", "yellow", ["Bienenwaben", "Waben in Honigtönen"], ["Favi", "Favi nei toni del miele"], {
    draw(c, s, E) { const r = rnd(817), { P } = E, rr = 22, dx = rr * Math.sqrt(3), dy = rr * 1.5; for (let j = 0, y = 0; y < E.h + rr; j++, y += dy) for (let x = (j % 2) * dx / 2; x < E.w + dx; x += dx) { const v = noise(x / 300, y / 300); fill(c, P, v > .55 ? P.c.orange : P.c.yellow, .06 + v * .18); ngon(c, x, y, rr - 2, 6, Math.PI / 6); c.fill(); stroke(c, P, P.c.orange, .4, 2); c.stroke(); } },
  }],
  ["lichen", "still", "mauve", ["Flechten", "Krustige Flecken auf Stein"], ["Licheni", "Macchie crostose sulla pietra"], {
    draw(c, s, E) { const r = rnd(818), { P } = E; for (let i = 0; i < dens(E, 30000, 10, 40); i++) { const x = r() * E.w, y = r() * E.h, col = [P.c.green, P.c.yellow, P.c.orange, P.muted][r() * 4 | 0]; for (let k = 0; k < 60; k++) { const a = r() * TAU, d = r() ** .6 * 70; fill(c, P, col, .2 + r() * .2); dot(c, x + Math.cos(a) * d, y + Math.sin(a) * d, 2 + r() * 6); } } },
  }],
  ["bamboo", "still", "green", ["Bambus", "Hohe Halme mit Knoten und Blättern"], ["Bambù", "Canne alte con nodi e foglie"], {
    draw(c, s, E) { const r = rnd(819), { P } = E; for (let x = 10; x < E.w; x += 50 + r() * 70) { const w = 10 + r() * 8; fill(c, P, P.c.green, .3); c.fillRect(x, 0, w, E.h); for (let y = r() * 100; y < E.h; y += 90 + r() * 60) { fill(c, P, P.c.green, .55); c.fillRect(x - 2, y, w + 4, 5); if (r() < .5) leaf(c, P, x + w + 20, y - 10, 26, 1.2 + r() * .6, P.c.green, .35); } } },
  }],
  // ----- motion -----
  ["falling-leaves", "motion", "orange", ["Blätterfall", "Herbstblätter segeln zu Boden"], ["Caduta delle foglie", "Foglie d'autunno che planano a terra"], {
    init: E => swarm(E, dens(E, 18000, 16, 60), () => ({ v: .02 + R() * .03, sz: 14 + R() * 18, col: R() * 4 | 0 })),
    draw(c, s, E) { const col = AUTUMN(E.P); for (const l of s) { l.y = wrap(l.y + l.v * E.dt, E.h, 40); const x = l.x + Math.sin(E.t / 900 + l.ph) * 40; leaf(c, E.P, x, l.y, l.sz, Math.sin(E.t / 700 + l.ph) * 1.2, col[l.col], .45); } },
  }],
  ["snowfall", "motion", "blue", ["Schneefall", "Flocken rieseln in drei Tiefen"], ["Nevicata", "Fiocchi che scendono su tre piani"], {
    init: E => swarm(E, dens(E, 5000, 80, 300), () => ({ v: .01 + R() * .03 })),
    draw(c, s, E) { for (const f of s) { f.y = wrap(f.y + f.v * E.dt * (f.z + .3), E.h, 20); const x = f.x + Math.sin(E.t / 1500 + f.ph) * 20 * f.z; if (f.z > .85) snowflake(c, E.P, x, f.y, 9, E.t / 4000 + f.ph, .5); else { fill(c, E.P, E.P.c.blue, .3 + f.z * .4); dot(c, x, f.y, 1 + f.z * 2.5); } } },
  }],
  ["rain", "motion", "blue", ["Regen", "Schräge Tropfen und kleine Spritzer"], ["Pioggia", "Gocce oblique e piccoli schizzi"], {
    init: E => ({ drops: swarm(E, dens(E, 3500, 100, 400), () => ({ v: .5 + R() * .4 })), splash: [] }),
    draw(c, s, E) {
      const { P } = E;
      stroke(c, P, P.c.blue, .45, 1.2); c.beginPath();
      for (const d of s.drops) { d.y += d.v * E.dt; d.x += d.v * E.dt * .2; if (d.y > E.h) { s.splash.push([d.x, E.h - 4, E.t]); d.y = -20; d.x = R() * E.w * 1.2 - E.w * .2; } c.moveTo(d.x, d.y); c.lineTo(d.x - 3, d.y - 14 * d.z); }
      c.stroke();
      s.splash = s.splash.filter(sp => E.t - sp[2] < 400); for (const [x, y, t] of s.splash) { stroke(c, P, P.c.blue, (1 - (E.t - t) / 400) * .5); c.beginPath(); c.ellipse(x, y, (E.t - t) / 20, (E.t - t) / 70, 0, Math.PI, TAU); c.stroke(); }
    },
  }],
  ["fireflies", "motion", "yellow", ["Glühwürmchen", "Lichter tanzen in der Dämmerung"], ["Lucciole", "Lucine che danzano al crepuscolo"], {
    init: E => swarm(E, dens(E, 14000, 20, 80)),
    draw(c, s, E) { const { P } = E; for (const f of s) { f.x = wrap(f.x + Math.cos(noise(f.i, E.t / 3000) * TAU * 2) * .02 * E.dt, E.w, 20); f.y = wrap(f.y + Math.sin(noise(f.i + 50, E.t / 3000) * TAU * 2) * .02 * E.dt, E.h, 20); const glow = Math.max(0, Math.sin(E.t / 600 + f.ph * 3)); if (glow > .1) { const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, 18); g.addColorStop(0, P.c.yellow); g.addColorStop(1, clear(P.c.yellow)); A(c, glow * .6, P); c.fillStyle = g; c.fillRect(f.x - 18, f.y - 18, 36, 36); } fill(c, P, P.c.yellow, .3 + glow * .6); dot(c, f.x, f.y, 2.2); } },
  }],
  ["butterflies-fly", "motion", "mauve", ["Schmetterlinge", "Falter gaukeln über die Wiese"], ["Farfalle in volo", "Farfalle che svolazzano sul prato"], {
    init: E => swarm(E, dens(E, 40000, 6, 22), () => ({ col: R() * 6 | 0 })),
    draw(c, s, E) { for (const b of s) { b.x = wrap(b.x + Math.cos(noise(b.i, E.t / 2000) * TAU * 1.5) * .05 * E.dt, E.w, 30); b.y = wrap(b.y + Math.sin(noise(b.i + 9, E.t / 2000) * TAU * 1.5) * .04 * E.dt, E.h, 30); butterfly(c, E.P, b.x, b.y + Math.sin(E.t / 300 + b.ph) * 4, 16, Math.sin(E.t / 90 + b.ph), L(E.P, b.col), Math.sin(E.t / 1500 + b.ph) * .4); } },
  }],
  ["flock", "motion", "blue", ["Vogelschwarm", "Hunderte Vögel fliegen wie ein Wesen"], ["Stormo", "Centinaia di uccelli che volano come un unico essere"], {
    init: E => swarm(E, dens(E, 9000, 40, 140), () => ({ vx: (R() - .5) * .2, vy: (R() - .5) * .2 })),
    draw(c, s, E) {
      const { P } = E, gx = E.w / 2 + Math.cos(E.t / 7000) * E.w * .35, gy = E.h / 2 + Math.sin(E.t / 5000) * E.h * .3;
      for (const b of s) {
        let ax = (gx - b.x) * .00002, ay = (gy - b.y) * .00002, cx = 0, cy = 0, n = 0;
        for (let k = 0; k < 8; k++) { const o = s[(b.i + k * 7 + 1) % s.length], dx = o.x - b.x, dy = o.y - b.y, d = Math.hypot(dx, dy); if (d < 60) { cx += o.vx; cy += o.vy; n++; if (d < 18) { ax -= dx * .0003; ay -= dy * .0003; } } }
        if (n) { ax += (cx / n - b.vx) * .02; ay += (cy / n - b.vy) * .02; }
        b.vx = clamp(b.vx + ax * E.dt, -.25, .25); b.vy = clamp(b.vy + ay * E.dt, -.25, .25); b.x = wrap(b.x + b.vx * E.dt, E.w, 20); b.y = wrap(b.y + b.vy * E.dt, E.h, 20);
        bird(c, P, b.x, b.y, 5 + b.z * 3, Math.sin(E.t / 80 + b.ph));
      }
    },
  }],
  ["fish", "motion", "blue", ["Fischschwarm", "Fische ziehen in Wellen vorbei"], ["Banco di pesci", "Pesci che passano a ondate"], {
    init: E => swarm(E, dens(E, 9000, 30, 140), () => ({ v: .03 + R() * .03, lane: R() })),
    draw(c, s, E) { const { P } = E; for (const f of s) { f.x = wrap(f.x + f.v * E.dt, E.w, 40); const y = f.lane * E.h + Math.sin(f.x / 120 + E.t / 1000) * 30; at(c, f.x, y, Math.cos(f.x / 120 + E.t / 1000) * .25, .6 + f.z * .6, () => { fill(c, P, L(P, f.i % 3 + 1), .45); c.beginPath(); c.ellipse(0, 0, 16, 7, 0, 0, TAU); c.fill(); path(c, [[-14, 0], [-26, -8 * Math.sin(E.t / 120 + f.ph) - 2], [-26, 8 * Math.sin(E.t / 120 + f.ph) + 2]], true); c.fill(); fill(c, P, P.bg, .8); dot(c, 9, -2, 1.8); }); } },
  }],
  ["jellyfish", "motion", "mauve", ["Quallen", "Schirme pulsieren nach oben"], ["Meduse", "Ombrelli che pulsano verso l'alto"], {
    init: E => swarm(E, dens(E, 80000, 4, 12), () => ({ sz: 24 + R() * 30 })),
    draw(c, s, E) { const { P } = E; for (const j of s) { const pulse = (Math.sin(E.t / 600 + j.ph) + 1) / 2; j.y = wrap(j.y - (.005 + pulse * .02) * E.dt, E.h, 140); fill(c, P, L(P, j.i), .3); c.beginPath(); c.ellipse(j.x, j.y, j.sz * (1 - pulse * .2), j.sz * (.6 + pulse * .15), 0, Math.PI, TAU); c.fill(); stroke(c, P, L(P, j.i), .4, 1.5); for (let k = -3; k <= 3; k++) { c.beginPath(); for (let t = 0; t < 90; t += 6) { const x = j.x + k * j.sz * .25 + Math.sin(t / 15 + E.t / 400 + k) * 5; t ? c.lineTo(x, j.y + t) : c.moveTo(x, j.y + t); } c.stroke(); } } },
  }],
  ["dandelion", "motion", "yellow", ["Pusteblume", "Schirmchen fliegen davon"], ["Soffione", "Pappi che volano via"], {
    init: E => swarm(E, dens(E, 8000, 30, 120), () => ({ v: .01 + R() * .02 })),
    draw(c, s, E) {
      const { P } = E;
      for (const [x, y] of [[E.w * .1, E.h * .75], [E.w * .9, E.h * .6]]) { stroke(c, P, P.c.green, .5, 2); seg(c, x, E.h, x, y); for (let k = 0; k < 40; k++) { const a = k / 40 * TAU; stroke(c, P, P.muted, .4); seg(c, x, y, x + Math.cos(a) * 30, y + Math.sin(a) * 30); fill(c, P, P.muted, .5); dot(c, x + Math.cos(a) * 30, y + Math.sin(a) * 30, 1.5); } }
      for (const p of s) { p.x = wrap(p.x + .03 * E.dt, E.w, 20); p.y = wrap(p.y - p.v * E.dt + Math.sin(E.t / 700 + p.ph) * .3, E.h, 20); stroke(c, P, P.muted, .5); seg(c, p.x, p.y, p.x, p.y + 10); for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * .35; seg(c, p.x, p.y, p.x + Math.cos(a) * 7, p.y + Math.sin(a) * 7); } }
    },
  }],
  ["clouds", "motion", "blue", ["Wolkenzug", "Weiche Wolken ziehen vorbei"], ["Nuvole in viaggio", "Nuvole soffici che passano"], {
    init: E => many(dens(E, 90000, 4, 12), () => ({ x: R() * E.w, y: R() * E.h * .9, v: .005 + R() * .015, sz: 60 + R() * 90, seed: R() * 99 })),
    draw(c, s, E) { const { P } = E; for (const cl of s) { cl.x = wrap(cl.x + cl.v * E.dt, E.w, 250); fill(c, P, P.c.blue, .2); for (let k = 0; k < 6; k++) dot(c, cl.x + (k - 2.5) * cl.sz * .35, cl.y - Math.sin(k / 5 * Math.PI) * cl.sz * .35 + noise(k, cl.seed) * 10, cl.sz * (.3 + Math.sin(k / 5 * Math.PI) * .2)); } },
  }],
  ["grass-wind", "motion", "green", ["Wind im Gras", "Halme wiegen sich in Böen"], ["Vento nell'erba", "Fili che ondeggiano alle raffiche"], {
    init: E => { const r = rnd(820); return many(dens(E, 300, 1000, 4000), () => [r() * E.w, E.h * (.35 + r() * .65), 16 + r() * 34, r()]); },
    draw(c, s, E) { const { P } = E; stroke(c, P, P.c.green, .35, 1.2); c.beginPath(); for (const [x, y, h, v] of s) { const wnd = noise(x / 300 - E.t / 1500, y / 400) * 1.4 - .4 + v * .2; c.moveTo(x, y); c.quadraticCurveTo(x + wnd * h * .3, y - h * .6, x + wnd * h * .9, y - h); } c.stroke(); },
  }],
  ["sea-waves", "motion", "blue", ["Meereswellen", "Wellen rollen mit Schaumkronen"], ["Onde del mare", "Onde che si rincorrono con la spuma"], {
    draw(c, s, E) { const { P } = E; for (let k = 0; k < 9; k++) { const y0 = E.h * (.3 + k * .08), ph = E.t / (900 + k * 120) + k; fill(c, P, P.c.blue, .08 + k * .025); const pts = [[0, E.h]]; for (let x = 0; x <= E.w + 10; x += 10) pts.push([x, y0 + Math.sin(x / 70 + ph) * (6 + k) + Math.sin(x / 23 + ph * 1.7) * 3]); pts.push([E.w, E.h]); path(c, pts, true); c.fill(); stroke(c, P, P.surface, .5, 2); path(c, pts.slice(1, -1)); c.stroke(); } },
  }],
  ["seasons-sky", "motion", "orange", ["Jahreslauf", "Der Himmel färbt sich durch die Jahreszeiten"], ["Ciclo delle stagioni", "Il cielo che cambia colore con le stagioni"], {
    draw(c, s, E) { const { P } = E, k = mod(E.t / 24000, 1) * 4, i = Math.floor(k), f = k - i, cols = [P.c.green, P.c.yellow, P.c.orange, P.c.blue]; for (const [col, a] of [[cols[i], 1 - f], [cols[(i + 1) % 4], f]]) { const g = c.createLinearGradient(0, 0, 0, E.h); g.addColorStop(0, col); g.addColorStop(1, clear(col)); A(c, .3 * a, P); c.fillStyle = g; c.fillRect(0, 0, E.w, E.h); } fill(c, P, P.fg, .5); text(c, ["Frühling · Primavera", "Sommer · Estate", "Herbst · Autunno", "Winter · Inverno"][Math.round(k) % 4], E.w - 20, 28, 14, 600, "right"); },
  }],
  ["petals", "motion", "mauve", ["Blütenblätter", "Kirschblüten wehen durchs Bild"], ["Petali", "Fiori di ciliegio portati dal vento"], {
    init: E => swarm(E, dens(E, 9000, 30, 120), () => ({ v: .02 + R() * .03 })),
    draw(c, s, E) { const { P } = E; for (const p of s) { p.x = wrap(p.x + .04 * E.dt, E.w, 20); p.y = wrap(p.y + p.v * E.dt + Math.sin(E.t / 800 + p.ph) * .3, E.h, 20); at(c, p.x, p.y, E.t / 800 + p.ph, 1, () => { fill(c, P, P.c.mauve, .5); c.beginPath(); c.ellipse(0, 0, 7, 4 * Math.abs(Math.cos(E.t / 400 + p.ph)) + 1, 0, 0, TAU); c.fill(); }); } },
  }],
  ["underwater", "motion", "blue", ["Unterwasser", "Luftblasen steigen zwischen Algen"], ["Sott'acqua", "Bolle che salgono tra le alghe"], {
    init: E => ({ bubbles: swarm(E, dens(E, 9000, 30, 120), () => ({ v: .02 + R() * .04, r: 2 + R() * 6 })) }),
    draw(c, s, E) {
      const { P } = E;
      for (let x = 20; x < E.w; x += 60) { stroke(c, P, P.c.green, .4, 5); c.lineCap = "round"; c.beginPath(); for (let y = 0; y < 200 + (x * 7 % 120); y += 10) { const xx = x + Math.sin(y / 30 + E.t / 900 + x) * 10; y ? c.lineTo(xx, E.h - y) : c.moveTo(xx, E.h - y); } c.stroke(); c.lineCap = "butt"; }
      for (const b of s.bubbles) { b.y = wrap(b.y - b.v * E.dt, E.h, 10); stroke(c, P, P.c.blue, .5, 1.2); ring(c, b.x + Math.sin(E.t / 500 + b.ph) * 6, b.y, b.r); }
    },
  }],
  ["bees", "motion", "yellow", ["Bienenflug", "Bienen fliegen von Blüte zu Blüte"], ["Volo delle api", "Api che volano di fiore in fiore"], {
    init: E => { const r = rnd(821); return { flowers: many(dens(E, 60000, 4, 14), () => [r() * E.w, r() * E.h]), bees: many(dens(E, 40000, 5, 18), i => ({ from: i, to: (i + 1), k: R() })) }; },
    draw(c, s, E) {
      const { P } = E, F = s.flowers;
      F.forEach(([x, y], i) => flower(c, P, x, y, 18, 6, L(P, i + 3), 1, i));
      for (const b of s.bees) { b.k += E.dt / 3000; if (b.k >= 1) { b.k = 0; b.from = b.to; b.to = R() * F.length | 0; } const [x1, y1] = F[b.from % F.length], [x2, y2] = F[b.to % F.length], x = x1 + (x2 - x1) * b.k + Math.sin(b.k * 20) * 10, y = y1 + (y2 - y1) * b.k - Math.sin(b.k * Math.PI) * 60; fill(c, P, P.c.yellow, .85); c.beginPath(); c.ellipse(x, y, 6, 4, 0, 0, TAU); c.fill(); fill(c, P, P.fg, .6); c.fillRect(x - 1, y - 4, 2, 8); fill(c, P, P.surface, .7); dot(c, x, y - 5 - Math.abs(Math.sin(E.t / 30)) * 2, 3); }
    },
  }],
  ["vines-grow", "motion", "green", ["Ranken", "Pflanzen wachsen und ringeln sich"], ["Viticci", "Piante che crescono e si arricciano"], {
    draw(c, s, E) {
      const { P } = E, k = mod(E.t / 12000, 1), g = k < .8 ? k / .8 : 1;
      for (const [x0, d] of [[30, 1], [E.w - 30, -1]]) {
        const pt = u => [x0 + d * (Math.sin(u * 9) * 40 + u * 60), E.h - u * E.h * .95];
        stroke(c, P, P.c.green, .55 * (k < .8 ? 1 : 1 - (k - .8) / .2), 3); param(c, u => pt(u * g), 100); c.stroke();
        for (let u = .08; u < g; u += .08) { const [x, y] = pt(u); leaf(c, P, x + d * 14, y, 18, d * 1.2 + Math.sin(u * 30) * .4, P.c.green, .4); stroke(c, P, P.c.green, .4, 1.2); param(c, q => [x - d * 6 + Math.cos(q * 9) * (10 - q * 8) * -d, y - 10 + Math.sin(q * 9) * (10 - q * 8)], 30); c.stroke(); }
      }
    },
  }],
  ["ants", "motion", "red", ["Ameisenstraße", "Ameisen laufen auf festen Pfaden"], ["Formiche in fila", "Formiche che seguono un sentiero"], {
    init: () => ({ n: 120 }),
    draw(c, s, E) {
      const { P } = E, trail = u => [u * E.w, E.h * .5 + Math.sin(u * 7) * E.h * .3 + Math.sin(u * 23) * 20];
      stroke(c, P, P.muted, .15, 14); param(c, trail, 200); c.stroke();
      for (let i = 0; i < s.n; i++) { const dir = i % 2 ? 1 : -1, u = mod(i / s.n + dir * E.t / 60000, 1), [x, y] = trail(u), [x2, y2] = trail(u + .001 * dir), a = Math.atan2(y2 - y, x2 - x); at(c, x + (i % 3 - 1) * 4, y + (i % 2 ? 4 : -4), a, 1, () => { fill(c, P, P.fg, .55); dot(c, 4, 0, 2); dot(c, 0, 0, 2.2); dot(c, -5, 0, 3); stroke(c, P, P.fg, .4, .8); const leg = Math.sin(E.t / 50 + i) * 2; for (const xx of [-2, 1]) { seg(c, xx, 0, xx + leg, -4); seg(c, xx, 0, xx - leg, 4); } }); }
    },
  }],
  ["storm", "motion", "blue", ["Gewitter", "Regen, ab und zu ein ferner Blitz"], ["Temporale", "Pioggia e ogni tanto un lampo lontano"], {
    init: E => ({ drops: swarm(E, dens(E, 5000, 80, 300), () => ({ v: .6 + R() * .3 })), flash: 0, next: 4000, bolt: [] }),
    draw(c, s, E) {
      const { P } = E;
      if (E.t > s.next) { s.next = E.t + 4000 + R() * 6000; s.flash = E.t; let x = R() * E.w, y = 0; s.bolt = [[x, y]]; while (y < E.h * .7) { x += (R() - .5) * 60; y += 20 + R() * 30; s.bolt.push([x, y]); } }
      const f = Math.max(0, 1 - (E.t - s.flash) / 300);
      if (f) { fill(c, P, P.c.yellow, f * .12); c.fillRect(0, 0, E.w, E.h); stroke(c, P, P.c.yellow, f * .8, 3); path(c, s.bolt); c.stroke(); }
      stroke(c, P, P.c.blue, .4, 1); c.beginPath(); for (const d of s.drops) { d.y = wrap(d.y + d.v * E.dt, E.h, 20); d.x = wrap(d.x + d.v * E.dt * .15, E.w, 20); c.moveTo(d.x, d.y); c.lineTo(d.x - 2, d.y - 12); } c.stroke();
    },
  }],
  ["seasons-tree", "motion", "green", ["Baum im Jahr", "Ein Baum blüht, grünt, färbt sich und ist kahl"], ["Albero nell'anno", "Un albero che fiorisce, verdeggia, si colora e si spoglia"], {
    init: () => { const r = rnd(822), tips = []; const br = (x, y, a, len, d) => { const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; tips.push({ x, y, x2, y2, d }); if (d > 0) { br(x2, y2, a - .45 + r() * .2, len * .74, d - 1); br(x2, y2, a + .35 + r() * .2, len * .7, d - 1); } }; br(0, 0, -Math.PI / 2, 110, 7); return { tips, leaves: tips.filter(t => t.d < 2).map(t => [t.x2, t.y2, r()]) }; },
    draw(c, s, E) {
      const { P } = E, k = mod(E.t / 20000, 1), season = Math.floor(k * 4);
      for (const [ox, sc] of [[E.w * .15, Math.min(1.1, E.h / 600)], [E.w * .85, Math.min(.9, E.h / 700)]]) {
        const oy = E.h;
        for (const t of s.tips) { stroke(c, P, P.fg, .35, (t.d + 1) * sc * .9); seg(c, ox + t.x * sc, oy + t.y * sc, ox + t.x2 * sc, oy + t.y2 * sc); }
        const col = [P.c.mauve, P.c.green, P.c.orange, null][season];
        if (col) for (const [x, y, v] of s.leaves) { if (season === 2 && v < (k * 4 - 2)) continue; fill(c, P, season === 2 && v > .5 ? P.c.red : col, .45); dot(c, ox + x * sc + (v - .5) * 10, oy + y * sc + (v - .3) * 10, (season === 0 ? 4 : 7) * sc); }
        if (season === 3) for (let q = 0; q < 30; q++) snowflake(c, P, ox + (noise(q, 1) - .5) * 300, mod(E.t * .02 + q * 37, E.h), 5, q, .4);
      }
    },
  }],
  // ----- touch -----
  ["bloom-touch", "touch", "mauve", ["Aufblühen", "Knospen öffnen sich unter dem Zeiger"], ["Sbocciare", "I boccioli si aprono sotto il puntatore"], {
    init: E => { const r = rnd(823), fl = []; grid(E, 60, (x, y) => fl.push({ x: x + 30 + (r() - .5) * 30, y: y + 30 + (r() - .5) * 30, open: 0, col: r() * 6 | 0, n: 5 + (r() * 4 | 0) })); return fl; },
    draw(c, s, E) {
      const { P } = E; let busy = false;
      for (const f of s) { const goal = near(E, f.x, f.y, 140) > 0 ? 1 : f.open > .5 ? Math.max(0, f.open - E.dt / 8000) : 0; f.open += (goal - f.open) * Math.min(1, E.dt / 200); if (Math.abs(goal - f.open) > .01 || f.open > .01) busy = true; flower(c, P, f.x, f.y, 18, f.n, L(P, f.col), .15 + f.open * .85, f.x); }
      return !busy && !E.ptr.on;
    },
  }],
  ["firefly-follow", "touch", "yellow", ["Glühwürmchen folgen", "Lichter schwärmen um den Zeiger"], ["Lucciole al seguito", "Lucine che sciamano attorno al puntatore"], {
    init: E => swarm(E, dens(E, 22000, 14, 50)),
    draw(c, s, E) {
      const { P } = E, on = E.ptr.on && !E.still;
      for (const f of s) { const tx = on ? E.ptr.x + Math.cos(E.t / 700 + f.ph) * (30 + f.i % 7 * 12) : f.x + Math.cos(f.ph + E.t / 2000) * 10, ty = on ? E.ptr.y + Math.sin(E.t / 600 + f.ph * 2) * (30 + f.i % 5 * 12) : f.y + Math.sin(f.ph + E.t / 2000) * 10; f.x += (tx - f.x) * Math.min(1, E.dt / (300 + f.i % 5 * 200)); f.y += (ty - f.y) * Math.min(1, E.dt / (300 + f.i % 5 * 200)); const glow = (Math.sin(E.t / 400 + f.ph * 3) + 1) / 2; fill(c, P, P.c.yellow, .25 + glow * .6); dot(c, f.x, f.y, 2 + glow * 2); }
      return false;
    },
  }],
  ["fish-avoid", "touch", "blue", ["Scheue Fische", "Der Schwarm weicht dem Zeiger aus"], ["Pesci timidi", "Il banco evita il puntatore"], {
    init: E => swarm(E, dens(E, 9000, 30, 120), () => ({ a: R() * TAU, sp: .04 + R() * .03 })),
    draw(c, s, E) {
      const { P } = E;
      for (const f of s) { let target = noise(f.i, E.t / 4000) * TAU * 2; const d = Math.hypot(f.x - E.ptr.x, f.y - E.ptr.y); if (E.ptr.on && !E.still && d < 140) target = Math.atan2(f.y - E.ptr.y, f.x - E.ptr.x); let da = mod(target - f.a + Math.PI, TAU) - Math.PI; f.a += da * Math.min(1, E.dt / 300); const sp = f.sp * (d < 140 && E.ptr.on ? 3 : 1); f.x = wrap(f.x + Math.cos(f.a) * sp * E.dt, E.w, 30); f.y = wrap(f.y + Math.sin(f.a) * sp * E.dt, E.h, 30); at(c, f.x, f.y, f.a, .8, () => { fill(c, P, L(P, f.i % 3 + 2), .45); c.beginPath(); c.ellipse(0, 0, 14, 6, 0, 0, TAU); c.fill(); path(c, [[-12, 0], [-22, -7], [-22, 7]], true); c.fill(); }); }
      return false;
    },
  }],
  ["grass-part", "touch", "green", ["Durchs Gras streifen", "Die Halme biegen sich vom Zeiger weg"], ["Passare nell'erba", "I fili si piegano lontano dal puntatore"], {
    init: E => { const r = rnd(824); return many(dens(E, 250, 1500, 5000), () => [r() * E.w, E.h * (.2 + r() * .8), 18 + r() * 30]); },
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, -999, 80);
      stroke(c, P, P.c.green, .35, 1.2); c.beginPath();
      for (const [x, y, h] of s) { const dx = x - s.x, dy = y - h / 2 - s.y, d = Math.hypot(dx, dy), push = f * Math.max(0, 1 - d / 100) * Math.sign(dx || 1); const bend = push * 1.4 + Math.sin(x / 40 + E.t / 1600) * .15; c.moveTo(x, y); c.quadraticCurveTo(x + bend * h * .3, y - h * .6, x + bend * h, y - h * (1 - Math.abs(push) * .3)); }
      c.stroke();
      return false;
    },
  }],
  ["butterfly-follow", "touch", "mauve", ["Schmetterlingsbegleiter", "Falter flattern dem Zeiger nach"], ["Farfalle al seguito", "Farfalle che seguono il puntatore"], {
    init: E => swarm(E, 7, () => ({ col: R() * 6 | 0 })),
    draw(c, s, E) {
      const { P } = E, on = E.ptr.on && !E.still;
      s.forEach((b, i) => { const lead = i ? s[i - 1] : null, tx = on ? (lead ? lead.x - 30 : E.ptr.x) : b.x + Math.cos(E.t / 1500 + b.ph) * 2, ty = on ? (lead ? lead.y + 10 : E.ptr.y) : b.y + Math.sin(E.t / 1300 + b.ph) * 2; b.x += (tx - b.x) * Math.min(1, E.dt / 400) + Math.sin(E.t / 200 + b.ph) * .8; b.y += (ty - b.y) * Math.min(1, E.dt / 400) + Math.cos(E.t / 260 + b.ph) * .8; butterfly(c, P, b.x, b.y, 18, Math.sin(E.t / 80 + b.ph), L(P, b.col), Math.sin(E.t / 900) * .3); });
      return false;
    },
  }],
  ["leaf-blower", "touch", "orange", ["Laubwind", "Der Zeiger pustet das Laub auseinander"], ["Vento sulle foglie", "Il puntatore soffia via le foglie"], {
    init: E => { const r = rnd(825); return many(dens(E, 7000, 50, 200), () => ({ x: r() * E.w, y: r() * E.h, vx: 0, vy: 0, rot: r() * TAU, col: r() * 4 | 0, sz: 14 + r() * 16 })); },
    draw(c, s, E) {
      const { P } = E, col = AUTUMN(P), on = E.ptr.on && !E.still; let busy = false;
      for (const l of s) { if (on) { const dx = l.x - E.ptr.x, dy = l.y - E.ptr.y, d = Math.hypot(dx, dy) || 1; if (d < 120) { l.vx += dx / d * .02 * E.dt / 16; l.vy += dy / d * .02 * E.dt / 16; } } l.vx *= .95; l.vy *= .95; l.x = wrap(l.x + l.vx * E.dt, E.w, 30); l.y = wrap(l.y + l.vy * E.dt, E.h, 30); l.rot += (l.vx + l.vy) * .1; if (Math.abs(l.vx) + Math.abs(l.vy) > .002) busy = true; leaf(c, P, l.x, l.y, l.sz, l.rot, col[l.col], .45); }
      return !busy && !on;
    },
  }],
  ["dandelion-blow", "touch", "yellow", ["Pusten", "Tippen löst die Schirmchen der Pusteblume"], ["Soffiare", "Tocca per liberare i pappi del soffione"], {
    init: E => ({ heads: many(Math.max(2, Math.floor(E.w / 300)), i => ({ x: (i + .5) * E.w / Math.max(2, Math.floor(E.w / 300)), y: E.h * .6, seeds: many(40, k => ({ a: k / 40 * TAU, free: false, x: 0, y: 0, vx: 0, vy: 0 })) })) }),
    draw(c, s, E) {
      const { P } = E; let busy = false;
      for (const tap of E.ptr.taps.splice(0)) for (const h of s.heads) if (Math.hypot(tap.x - h.x, tap.y - h.y) < 120) h.seeds.forEach(sd => { if (!sd.free) { sd.free = true; sd.x = h.x + Math.cos(sd.a) * 30; sd.y = h.y + Math.sin(sd.a) * 30; sd.vx = .03 + R() * .05; sd.vy = -.02 - R() * .04; } });
      for (const h of s.heads) {
        stroke(c, P, P.c.green, .5, 2); seg(c, h.x, E.h, h.x, h.y);
        for (const sd of h.seeds) { if (sd.free) { busy = true; sd.x += sd.vx * E.dt; sd.y += sd.vy * E.dt + Math.sin(E.t / 300 + sd.a) * .3; if (sd.x > E.w + 30 || sd.y < -30) sd.done = true; } const x = sd.free ? sd.x : h.x + Math.cos(sd.a) * 30, y = sd.free ? sd.y : h.y + Math.sin(sd.a) * 30; if (sd.done) continue; stroke(c, P, P.muted, .45); seg(c, sd.free ? x : h.x, sd.free ? y + 8 : h.y, x, y); fill(c, P, P.muted, .5); dot(c, x, y, 1.5); }
        if (h.seeds.every(sd => sd.done)) h.seeds.forEach(sd => { sd.free = false; sd.done = false; });
      }
      return !busy;
    },
  }],
  ["koi-pond", "touch", "orange", ["Koiteich", "Kois kommen zum Zeiger, Tippen zieht Ringe"], ["Laghetto delle carpe", "Le carpe arrivano al puntatore, toccando si formano cerchi"], {
    init: E => ({ fish: swarm(E, dens(E, 60000, 4, 12), () => ({ a: R() * TAU })), rings: [] }),
    draw(c, s, E) {
      const { P } = E, on = E.ptr.on && !E.still;
      for (const tap of E.ptr.taps.splice(0)) s.rings.push([tap.x, tap.y, E.t]);
      s.rings = s.rings.filter(r => E.t - r[2] < 2500);
      for (const [x, y, t0] of s.rings) for (let k = 0; k < 3; k++) { const rr = (E.t - t0) * .08 - k * 14; if (rr > 0) { stroke(c, P, P.c.blue, (1 - (E.t - t0) / 2500) * .5, 1.5); ring(c, x, y, rr); } }
      for (const f of s.fish) { const tx = on ? E.ptr.x : f.x + Math.cos(noise(f.i, E.t / 5000) * TAU * 2) * 100, ty = on ? E.ptr.y : f.y + Math.sin(noise(f.i + 4, E.t / 5000) * TAU * 2) * 100, target = Math.atan2(ty - f.y, tx - f.x); f.a += (mod(target - f.a + Math.PI, TAU) - Math.PI) * Math.min(1, E.dt / 900); const d = Math.hypot(tx - f.x, ty - f.y), sp = d > 40 ? .04 : .01; f.x = wrap(f.x + Math.cos(f.a) * sp * E.dt, E.w, 40); f.y = wrap(f.y + Math.sin(f.a) * sp * E.dt, E.h, 40);
        at(c, f.x, f.y, f.a, 1, () => { fill(c, P, f.i % 2 ? P.c.orange : P.surface, .7); c.beginPath(); c.ellipse(0, 0, 24, 9, 0, 0, TAU); c.fill(); path(c, [[-20, 0], [-36, -10 * Math.sin(E.t / 200 + f.ph) - 4], [-36, 10 * Math.sin(E.t / 200 + f.ph) + 4]], true); c.fill(); fill(c, P, P.c.red, .6); dot(c, 6, 0, 5); }); }
      return false;
    },
  }],
  ["sun-shadows", "touch", "yellow", ["Sonnenstand", "Der Zeiger ist die Sonne, Schatten folgen"], ["Posizione del sole", "Il puntatore è il sole, le ombre lo seguono"], {
    init: E => { const r = rnd(826); return { trees: many(dens(E, 40000, 6, 24), () => [r() * E.w, E.h * (.3 + r() * .65), 20 + r() * 20]) }; },
    draw(c, s, E) {
      const { P } = E; follow(s, E, E.w / 2 + Math.cos(E.t / 6000) * E.w * .45, E.h * .1, 200);
      const g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, 140); g.addColorStop(0, P.c.yellow); g.addColorStop(1, clear(P.c.yellow)); A(c, .5, P); c.fillStyle = g; c.fillRect(s.x - 140, s.y - 140, 280, 280);
      for (const [x, y, rr] of s.trees) { const a = Math.atan2(y - s.y, x - s.x), len = clamp(9000 / (Math.hypot(x - s.x, y - s.y) + 40), 20, 160); fill(c, P, P.fg, .12); c.beginPath(); c.ellipse(x + Math.cos(a) * len / 2, y + Math.sin(a) * len / 2, len / 2 + rr * .5, rr * .5, a, 0, TAU); c.fill(); fill(c, P, P.c.green, .45); dot(c, x, y - rr, rr); fill(c, P, P.muted, .6); c.fillRect(x - 2, y - rr, 4, rr); }
      return false;
    },
  }],
  ["plant-tap", "touch", "green", ["Säen", "Tippen lässt eine Blume wachsen"], ["Seminare", "Tocca per far crescere un fiore"], {
    init: () => ({ plants: [] }),
    draw(c, s, E) {
      const { P } = E;
      for (const tap of E.ptr.taps.splice(0)) s.plants.push({ x: tap.x, y: tap.y, t0: E.t, h: 60 + R() * 80, col: R() * 6 | 0, n: 5 + (R() * 4 | 0) });
      if (s.plants.length > 30) s.plants.shift();
      let busy = false;
      for (const p of s.plants) { const k = clamp((E.t - p.t0) / 1500, 0, 1); if (k < 1) busy = true; const top = p.y - p.h * k; stroke(c, P, P.c.green, .55, 2.5); c.beginPath(); c.moveTo(p.x, p.y); c.quadraticCurveTo(p.x + 14, (p.y + top) / 2, p.x, top); c.stroke(); if (k > .4) leaf(c, P, p.x + 10, p.y - p.h * .35 * k, 14 * k, 1, P.c.green, .4); if (k > .7) flower(c, P, p.x, top, 16, p.n, L(P, p.col), (k - .7) / .3, p.x); }
      return !busy;
    },
  }],
]);
