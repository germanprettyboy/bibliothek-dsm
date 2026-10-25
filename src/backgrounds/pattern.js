/* Extra backgrounds 10/10: patterns and generative art */
import { TAU, clamp, mod, rnd, R, many, dens, wrap, noise, fbm, A, L, fill, stroke, dot, ring, seg, path, ngon, starPath, rrect, curve, param, text, at, swarm, near, grid, follow, def } from "./kit.js";

// Maze on a grid (depth-first): returns walls { right[], down[] } and cols/rows
function maze(cols, rows, r) {
  const right = new Array(cols * rows).fill(true), down = new Array(cols * rows).fill(true), seen = new Array(cols * rows).fill(false), stack = [0], order = [];
  seen[0] = true;
  while (stack.length) {
    const cur = stack[stack.length - 1], x = cur % cols, y = cur / cols | 0;
    const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < cols && b < rows && !seen[b * cols + a]);
    if (!nb.length) { stack.pop(); continue; }
    const [a, b] = nb[r() * nb.length | 0], nx = b * cols + a;
    if (a > x) right[cur] = false; else if (a < x) right[nx] = false; else if (b > y) down[cur] = false; else down[nx] = false;
    seen[nx] = true; stack.push(nx); order.push([cur, nx]);
  }
  return { right, down, cols, rows, order };
}
function drawMaze(c, P, m, G, col, a) {
  stroke(c, P, col, a, 2); c.beginPath();
  for (let i = 0; i < m.cols * m.rows; i++) { const x = (i % m.cols) * G, y = (i / m.cols | 0) * G; if (m.right[i]) { c.moveTo(x + G, y); c.lineTo(x + G, y + G); } if (m.down[i]) { c.moveTo(x, y + G); c.lineTo(x + G, y + G); } }
  c.stroke();
}

export default def("pattern", [
  ["truchet", "still", "blue", ["Truchet-Kacheln", "Diagonalen ergeben ein Labyrinth"], ["Piastrelle di Truchet", "Diagonali che formano un labirinto"], {
    draw(c, s, E) { const r = rnd(901), { P } = E; stroke(c, P, P.c.blue, .5, 2.5); c.beginPath(); grid(E, 30, (x, y) => { if (r() < .5) { c.moveTo(x, y); c.lineTo(x + 30, y + 30); } else { c.moveTo(x + 30, y); c.lineTo(x, y + 30); } }); c.stroke(); },
  }],
  ["truchet-arcs", "still", "mauve", ["Bogenkacheln", "Viertelkreise verbinden sich zu Schlangenlinien"], ["Piastrelle ad archi", "Quarti di cerchio che si uniscono in linee sinuose"], {
    draw(c, s, E) { const r = rnd(902), { P } = E, G = 40; stroke(c, P, P.c.mauve, .5, 3); grid(E, G, (x, y) => { c.beginPath(); if (r() < .5) { c.arc(x, y, G / 2, 0, Math.PI / 2); c.moveTo(x + G / 2, y + G); c.arc(x + G, y + G, G / 2, Math.PI, Math.PI * 1.5); } else { c.arc(x + G, y, G / 2, Math.PI / 2, Math.PI); c.moveTo(x + G / 2, y + G); c.arc(x, y + G, G / 2, -Math.PI / 2, 0); } c.stroke(); }); },
  }],
  ["chevron", "still", "red", ["Zickzack", "Chevron-Streifen in Logofarben"], ["Zigzag", "Righe chevron nei colori del logo"], {
    draw(c, s, E) { const { P } = E; for (let y = -40, k = 0; y < E.h + 40; y += 24, k++) { stroke(c, P, L(P, k), .35, 10); curve(c, x => y + Math.abs(mod(x, 60) - 30), 0, E.w, 30); c.stroke(); } },
  }],
  ["herringbone", "still", "orange", ["Fischgrät", "Parkett im Fischgrätmuster"], ["Spina di pesce", "Parquet a spina di pesce"], {
    draw(c, s, E) {
      const r = rnd(903), { P } = E, W = 40, h = 16;
      for (let k = 0, x0 = 0; x0 < E.w; k++, x0 += W) for (let y = -W - (k % 2) * h / 2; y < E.h + W; y += h) {
        fill(c, P, P.c.orange, .1 + r() * .14);
        path(c, k % 2 ? [[x0, y], [x0 + W, y + W], [x0 + W, y + W + h - 2], [x0, y + h - 2]] : [[x0, y + W], [x0 + W, y], [x0 + W, y + h - 2], [x0, y + W + h - 2]], true); c.fill();
      }
    },
  }],
  ["houndstooth", "still", "blue", ["Hahnentritt", "Das klassische Stoffmuster"], ["Pied-de-poule", "Il classico motivo dei tessuti"], {
    draw(c, s, E) {
      const { P } = E, k = 24, u = k / 4;
      const poly = pts => { c.moveTo(...pts[0]); for (let n = 1; n < pts.length; n++) c.lineTo(...pts[n]); c.closePath(); };
      fill(c, P, P.fg, .15); c.beginPath();
      grid(E, k, (x, y) => {
        c.rect(x, y, k / 2, k / 2);
        poly([[x + k / 2, y], [x + k / 2 + u, y], [x + k / 2, y + u]]); poly([[x, y + k / 2], [x + u, y + k / 2], [x, y + k / 2 + u]]);
        poly([[x + k / 2, y + k / 2], [x + k, y], [x + k, y + u], [x + k / 2 + u, y + k / 2], [x + k / 2, y + k / 2 + u]]); poly([[x, y + k], [x + k / 2, y + k / 2], [x + k / 2, y + k / 2 + u], [x + u, y + k]]);
      });
      c.fill();
    },
  }],
  ["argyle", "still", "green", ["Argyle", "Rauten mit Nahtlinien wie auf Socken"], ["Argyle", "Rombi con cuciture come sui calzini"], {
    draw(c, s, E) { const { P } = E, w = 60, h = 90; for (let j = 0; j * h / 2 < E.h + h; j++) for (let i = 0; i * w < E.w + w; i++) { const x = i * w + (j % 2) * w / 2, y = j * h / 2; fill(c, P, L(P, i + j), .15); path(c, [[x, y - h / 2], [x + w / 2, y], [x, y + h / 2], [x - w / 2, y]], true); c.fill(); } stroke(c, P, P.fg, .2, 1); c.setLineDash([4, 4]); for (let x = -E.h; x < E.w + E.h; x += w) { seg(c, x, 0, x + E.h * w / h, E.h); seg(c, x, 0, x - E.h * w / h, E.h); } c.setLineDash([]); },
  }],
  ["tartan", "still", "red", ["Schottenkaro", "Sich kreuzende Streifen"], ["Tartan", "Strisce che si incrociano"], {
    draw(c, s, E) { const { P } = E, bands = [[0, 40, "red"], [50, 8, "yellow"], [70, 30, "green"], [110, 4, "fg"], [130, 20, "blue"]], per = 160; for (let o = 0; o < Math.max(E.w, E.h) + per; o += per) for (const [p, w, col] of bands) { const cc = col === "fg" ? P.fg : P.c[col]; fill(c, P, cc, .14); c.fillRect(o + p, 0, w, E.h); c.fillRect(0, o + p, E.w, w); } },
  }],
  ["polka", "still", "yellow", ["Tupfen", "Versetzte Punkte in zwei Größen"], ["Pois", "Pois sfalsati di due misure"], {
    draw(c, s, E) { const { P } = E; grid(E, 46, (x, y, i, j) => { fill(c, P, L(P, mod(i + j, 6)), .3); dot(c, x + 23, y + 23, 9); fill(c, P, L(P, mod(i + j + 3, 6)), .3); dot(c, x + 46, y + 46, 4); }); },
  }],
  ["diagonal-stripes", "still", "mauve", ["Schrägstreifen", "Breite und schmale Bänder diagonal"], ["Righe oblique", "Fasce larghe e strette in diagonale"], {
    draw(c, s, E) { const { P } = E; for (let x = -E.h, k = 0; x < E.w; x += 36, k++) { fill(c, P, L(P, k), k % 3 ? .12 : .3); path(c, [[x, E.h], [x + E.h, 0], [x + E.h + (k % 3 ? 14 : 24), 0], [x + (k % 3 ? 14 : 24), E.h]], true); c.fill(); } },
  }],
  ["seigaiha", "still", "blue", ["Seigaiha", "Wellenschuppen nach japanischem Vorbild"], ["Seigaiha", "Squame a onda di ispirazione giapponese"], {
    draw(c, s, E) { const { P } = E, rr = 34; for (let j = 0, y = 0; y < E.h + rr * 2; j++, y += rr / 2) for (let x = (j % 2) * rr; x < E.w + rr * 2; x += rr * 2) for (let k = 4; k > 0; k--) { fill(c, P, k % 2 ? P.c.blue : P.bg, k % 2 ? .3 : 1); c.beginPath(); c.arc(x, y, k * rr / 4, Math.PI, TAU); c.fill(); } },
  }],
  ["quatrefoil", "still", "green", ["Vierpass", "Gotische Vierblattformen"], ["Quadrilobo", "Forme gotiche a quattro lobi"], {
    draw(c, s, E) { const { P } = E; grid(E, 80, (x, y, i, j) => { const cx = x + 40, cy = y + 40; stroke(c, P, L(P, i + j), .5, 2); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; c.beginPath(); c.arc(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, 14, a - Math.PI * .75, a + Math.PI * .75); c.stroke(); } }); },
  }],
  ["tumbling-blocks", "still", "orange", ["Würfeltreppe", "Rauten werden zu räumlichen Würfeln"], ["Cubi prospettici", "Rombi che diventano cubi tridimensionali"], {
    draw(c, s, E) { const { P } = E, rr = 30, dx = rr * Math.sqrt(3); for (let j = 0, y = 0; y < E.h + rr * 2; j++, y += rr * 1.5) for (let x = (j % 2) * dx / 2; x < E.w + dx; x += dx) { const v = [[x, y - rr], [x + dx / 2, y - rr / 2], [x + dx / 2, y + rr / 2], [x, y + rr], [x - dx / 2, y + rr / 2], [x - dx / 2, y - rr / 2]]; fill(c, P, P.c.orange, .2); path(c, [[x, y], v[5], v[0], v[1]], true); c.fill(); fill(c, P, P.c.blue, .2); path(c, [[x, y], v[1], v[2], v[3]], true); c.fill(); fill(c, P, P.muted, .25); path(c, [[x, y], v[3], v[4], v[5]], true); c.fill(); } },
  }],
  ["girih", "still", "blue", ["Achtstern", "Islamische Sternfliesen"], ["Stella a otto punte", "Piastrelle a stella islamiche"], {
    draw(c, s, E) { const { P } = E; grid(E, 90, (x, y, i, j) => { const cx = x + 45, cy = y + 45; fill(c, P, L(P, i + j * 2), .25); starPath(c, cx, cy, 44, 24, 8, Math.PI / 8); c.fill(); stroke(c, P, P.fg, .3, 1.5); c.stroke(); fill(c, P, P.bg, .8); ngon(c, cx, cy, 16, 8, Math.PI / 8); c.fill(); }); },
  }],
  ["basketweave", "still", "yellow", ["Korbgeflecht", "Gegenläufig geflochtene Bänder"], ["Intreccio", "Fasce intrecciate in senso opposto"], {
    draw(c, s, E) { const { P } = E, k = 48; grid(E, k, (x, y, i, j) => { const h = (i + j) % 2; for (let b = 0; b < 3; b++) { fill(c, P, P.c[h ? "yellow" : "orange"], .2 + b * .05); h ? c.fillRect(x + 2, y + 2 + b * k / 3, k - 4, k / 3 - 3) : c.fillRect(x + 2 + b * k / 3, y + 2, k / 3 - 3, k - 4); } }); },
  }],
  ["scales", "still", "green", ["Schuppen", "Überlappende Schuppen wie bei Fischen"], ["Squame", "Squame sovrapposte come nei pesci"], {
    draw(c, s, E) { const { P } = E, rr = 22; for (let j = 0, y = -rr; y < E.h + rr; j++, y += rr * .75) for (let x = (j % 2) * rr; x < E.w + rr * 2; x += rr * 2) { fill(c, P, L(P, noise(x / 300, y / 300) * 6), .1); c.beginPath(); c.arc(x, y, rr, 0, Math.PI); c.closePath(); c.fill(); stroke(c, P, P.bg, .7, 1.5); c.beginPath(); c.arc(x, y, rr, 0, Math.PI); c.stroke(); } },
  }],
  ["flower-of-life", "still", "mauve", ["Blume des Lebens", "Überlagerte Kreise im Sechseckraster"], ["Fiore della vita", "Cerchi sovrapposti in una griglia esagonale"], {
    draw(c, s, E) { const { P } = E, rr = 40, dy = rr * Math.sqrt(3) / 2; stroke(c, P, P.c.mauve, .35, 1.2); for (let j = 0, y = 0; y < E.h + rr; j++, y += dy) for (let x = (j % 2) * rr / 2; x < E.w + rr; x += rr) ring(c, x, y, rr); },
  }],
  ["hex-truchet", "still", "red", ["Sechseck-Truchet", "Bögen in Waben ergeben Schlaufen"], ["Truchet esagonale", "Archi negli esagoni che formano anelli"], {
    draw(c, s, E) { const r = rnd(904), { P } = E, rr = 30, dx = rr * Math.sqrt(3), dy = rr * 1.5; stroke(c, P, P.c.red, .45, 3); for (let j = 0, y = 0; y < E.h + rr; j++, y += dy) for (let x = (j % 2) * dx / 2; x < E.w + dx; x += dx) { const rot = (r() * 2 | 0) * Math.PI / 3; for (let k = 0; k < 3; k++) { const a = rot + k * 2 * Math.PI / 3 + Math.PI / 6, vx = x + Math.cos(a) * rr, vy = y + Math.sin(a) * rr; c.beginPath(); c.arc(vx, vy, rr / 2, a + Math.PI - Math.PI / 3, a + Math.PI + Math.PI / 3); c.stroke(); } } },
  }],
  ["maze", "still", "green", ["Labyrinth", "Ein zufälliges Irrgarten-Muster"], ["Labirinto", "Un labirinto casuale"], {
    draw(c, s, E) { const G = 26, m = maze(Math.ceil(E.w / G), Math.ceil(E.h / G), rnd(905)); drawMaze(c, E.P, m, G, E.P.c.green, .5); },
  }],
  ["cells", "still", "orange", ["Zellmuster", "Voronoi-Zellen mit hellen Kernen"], ["Celle", "Celle di Voronoi con nuclei chiari"], {
    draw(c, s, E) {
      const r = rnd(906), { P } = E, sites = many(dens(E, 9000, 40, 160), () => [r() * E.w, r() * E.h]), G = 6, cs = 60, buckets = new Map();
      sites.forEach(([x, y], i) => { const k = Math.floor(x / cs) + "," + Math.floor(y / cs); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(i); });
      for (let y = 0; y < E.h; y += G) for (let x = 0; x < E.w; x += G) {
        let b1 = 1e9, b2 = 1e9, bi = 0; const bx = Math.floor(x / cs), by = Math.floor(y / cs);
        for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) for (const i of buckets.get((bx + di) + "," + (by + dj)) || []) { const d = (sites[i][0] - x) ** 2 + (sites[i][1] - y) ** 2; if (d < b1) { b2 = b1; b1 = d; bi = i; } else if (d < b2) b2 = d; }
        if (b1 === 1e9) continue; // no centre near enough
        const edge = Math.sqrt(b2) - Math.sqrt(b1);
        if (edge < 2) { fill(c, P, P.muted, .25); c.fillRect(x, y, G, G); } else if (b1 < 60) { fill(c, P, L(P, bi), .5); c.fillRect(x, y, G, G); } else { fill(c, P, L(P, bi), .06); c.fillRect(x, y, G, G); }
      }
    },
  }],
  ["circle-packing", "still", "blue", ["Kreispackung", "Kreise füllen die Fläche, ohne sich zu berühren"], ["Impacchettamento di cerchi", "Cerchi che riempiono il piano senza toccarsi"], {
    draw(c, s, E) { const r = rnd(907), { P } = E, cs = []; for (let k = 0; k < 6000 && cs.length < dens(E, 900, 100, 1400); k++) { const x = r() * E.w, y = r() * E.h; let m = 60; for (const [cx, cy, cr] of cs) { m = Math.min(m, Math.hypot(x - cx, y - cy) - cr - 2); if (m < 3) break; } if (m >= 3) cs.push([x, y, m]); } cs.forEach(([x, y, rr], i) => { fill(c, P, L(P, i), .25); dot(c, x, y, rr); }); },
  }],
  // ----- motion -----
  ["flow-field", "motion", "blue", ["Flussfeld", "Teilchen folgen einem unsichtbaren Strom"], ["Campo di flusso", "Particelle che seguono una corrente invisibile"], {
    init: E => swarm(E, dens(E, 3000, 120, 500), () => ({ px: 0, py: 0 })),
    draw(c, s, E) { const { P } = E; for (const p of s) { const a = noise(p.x / 240, p.y / 240 + E.t / 20000) * TAU * 2; p.px = p.x; p.py = p.y; p.x += Math.cos(a) * .06 * E.dt; p.y += Math.sin(a) * .06 * E.dt; if (p.x < 0 || p.x > E.w || p.y < 0 || p.y > E.h) { p.x = R() * E.w; p.y = R() * E.h; p.px = p.x; p.py = p.y; } stroke(c, P, L(P, p.i), .45, 1.5); seg(c, p.px - Math.cos(a) * 8, p.py - Math.sin(a) * 8, p.x, p.y); } },
  }],
  ["metaballs", "motion", "mauve", ["Metaballs", "Weiche Tropfen verschmelzen"], ["Metaball", "Gocce morbide che si fondono"], {
    init: E => swarm(E, 7, () => ({ vx: (R() - .5) * .08, vy: (R() - .5) * .08, r: 60 + R() * 60 })),
    draw(c, s, E) {
      const { P } = E, G = 12;
      for (const b of s) { b.x += b.vx * E.dt; b.y += b.vy * E.dt; if (b.x < 0 || b.x > E.w) b.vx *= -1; if (b.y < 0 || b.y > E.h) b.vy *= -1; }
      for (let y = 0; y < E.h; y += G) for (let x = 0; x < E.w; x += G) { let v = 0; for (const b of s) v += b.r * b.r / ((x - b.x) ** 2 + (y - b.y) ** 2 + 1); if (v > 1) { fill(c, P, v > 2 ? P.c.mauve : P.c.blue, Math.min(.4, (v - 1) * .3 + .12)); c.fillRect(x, y, G, G); } }
    },
  }],
  ["contours-live", "motion", "green", ["Fließende Höhenlinien", "Eine Landschaft verformt sich langsam"], ["Curve di livello mobili", "Un paesaggio che si deforma lentamente"], {
    draw(c, s, E) {
      const { P } = E, G = 14, nx = Math.ceil(E.w / G) + 1, ny = Math.ceil(E.h / G) + 1, v = new Float32Array(nx * ny), t = E.t / 9000;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = noise(i * G / 260 + t, j * G / 260 - t * .6);
      for (let k = 0; k < 8; k++) { const lv = .2 + k * .08; stroke(c, P, L(P, k), .45, 1.5); c.beginPath(); for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = v[j * nx + i], b = v[j * nx + i + 1], d = v[(j + 1) * nx + i], e = v[(j + 1) * nx + i + 1], x = i * G, y = j * G; const pts = []; if ((a - lv) * (b - lv) < 0) pts.push([x + G * (lv - a) / (b - a), y]); if ((b - lv) * (e - lv) < 0) pts.push([x + G, y + G * (lv - b) / (e - b)]); if ((d - lv) * (e - lv) < 0) pts.push([x + G * (lv - d) / (e - d), y + G]); if ((a - lv) * (d - lv) < 0) pts.push([x, y + G * (lv - a) / (d - a)]); if (pts.length >= 2) { c.moveTo(...pts[0]); c.lineTo(...pts[1]); } } c.stroke(); }
    },
  }],
  ["truchet-flip", "motion", "red", ["Kippende Kacheln", "Truchet-Kacheln drehen sich nach und nach"], ["Piastrelle che girano", "Piastrelle di Truchet che ruotano a poco a poco"], {
    init: E => { const t = []; grid(E, 40, (x, y) => t.push({ x, y, a: (R() * 2 | 0) * Math.PI / 2, goal: 0 })); t.forEach(q => { q.goal = q.a; }); return t; },
    draw(c, s, E) {
      const { P } = E;
      for (let k = 0; k < 3; k++) { const q = s[R() * s.length | 0]; if (Math.abs(q.goal - q.a) < .01) q.goal += Math.PI / 2; }
      stroke(c, P, P.c.red, .45, 3);
      for (const q of s) { q.a += (q.goal - q.a) * Math.min(1, E.dt / 300); at(c, q.x + 20, q.y + 20, q.a, 1, () => { c.beginPath(); c.arc(-20, -20, 20, 0, Math.PI / 2); c.stroke(); c.beginPath(); c.arc(20, 20, 20, Math.PI, Math.PI * 1.5); c.stroke(); }); }
    },
  }],
  ["wave-grid", "motion", "blue", ["Wellenraster", "Ein Punktgitter wogt räumlich"], ["Griglia ondulata", "Una griglia di punti che ondeggia in prospettiva"], {
    draw(c, s, E) { const { P } = E; for (let j = 0; j < 26; j++) for (let i = -10; i < 40; i++) { const z = j / 26, x = E.w / 2 + (i - 15) * 40 * (.4 + z), h = Math.sin(i * .4 + E.t / 700) * Math.cos(j * .3 + E.t / 900) * 30 * (.4 + z), y = E.h * .2 + z * E.h * .8 - h; if (x < -10 || x > E.w + 10) continue; fill(c, P, L(P, (h + 30) / 10), .2 + z * .5); dot(c, x, y, 1 + z * 3); } },
  }],
  ["plasma", "motion", "mauve", ["Plasma", "Grobe Farbfelder wabern ineinander"], ["Plasma", "Grandi campi di colore che si mescolano"], {
    draw(c, s, E) { const { P } = E, G = 24, t = E.t / 2000; for (let y = 0; y < E.h; y += G) for (let x = 0; x < E.w; x += G) { const v = Math.sin(x / 120 + t) + Math.sin(y / 90 - t * 1.3) + Math.sin((x + y) / 160 + t * .7) + Math.sin(Math.hypot(x - E.w / 2, y - E.h / 2) / 80 - t); fill(c, P, L(P, (v + 4) * .75), .07 + (Math.sin(v * 2) + 1) * .04); c.fillRect(x, y, G, G); } },
  }],
  ["tunnel", "motion", "orange", ["Tunnel", "Quadrate fliegen auf dich zu"], ["Tunnel", "Quadrati che volano verso di te"], {
    draw(c, s, E) { const { P } = E, cx = E.w / 2, cy = E.h / 2; for (let k = 0; k < 24; k++) { const z = mod(k / 24 + E.t / 6000, 1), sz = z ** 2.5 * Math.max(E.w, E.h) * 1.2; stroke(c, P, L(P, k), z * .5, 1 + z * 3); at(c, cx, cy, z * 1.5 + E.t / 9000, 1, () => c.strokeRect(-sz / 2, -sz / 2, sz, sz)); } },
  }],
  ["warp", "motion", "blue", ["Sternenflug", "Sterne ziehen wie bei Warpgeschwindigkeit vorbei"], ["Volo tra le stelle", "Stelle che sfrecciano come a velocità di curvatura"], {
    init: () => many(260, () => ({ a: R() * TAU, z: R() })),
    draw(c, s, E) { const { P } = E, cx = E.w / 2, cy = E.h / 2, m = Math.hypot(cx, cy); for (const st of s) { const z0 = st.z; st.z += E.dt * .0002 * (st.z + .05) * 4; if (st.z > 1) { st.z = .02; st.a = R() * TAU; } const r1 = z0 ** 2 * m, r2 = st.z ** 2 * m; stroke(c, P, st.a > Math.PI ? P.c.blue : P.muted, st.z * .7, 1 + st.z * 2); seg(c, cx + Math.cos(st.a) * r1, cy + Math.sin(st.a) * r1, cx + Math.cos(st.a) * r2, cy + Math.sin(st.a) * r2); } },
  }],
  ["vortex", "motion", "green", ["Wirbel", "Punkte drehen sich spiralförmig nach innen"], ["Vortice", "Punti che girano a spirale verso il centro"], {
    init: () => many(500, () => ({ r: R(), a: R() * TAU })),
    draw(c, s, E) { const { P } = E, cx = E.w / 2, cy = E.h / 2, m = Math.hypot(cx, cy); for (const p of s) { p.a += E.dt * .0008 / (p.r + .1); p.r -= E.dt * .00004; if (p.r < .02) { p.r = 1; p.a = R() * TAU; } fill(c, P, L(P, p.r * 6), .2 + (1 - p.r) * .5); dot(c, cx + Math.cos(p.a) * p.r * m, cy + Math.sin(p.a) * p.r * m, 1 + (1 - p.r) * 2.5); } },
  }],
  ["rock-paper", "motion", "red", ["Schere, Stein, Papier", "Drei Farben verdrängen sich im Kreis"], ["Sasso, carta, forbice", "Tre colori che si scacciano a vicenda"], {
    init: E => { const G = 12, nx = Math.ceil(E.w / G), ny = Math.ceil(E.h / G); return { G, nx, ny, g: many(nx * ny, () => R() * 3 | 0), t: 0 }; },
    draw(c, s, E) {
      const { P } = E, { G, nx, ny } = s; s.t += E.dt;
      if (s.t > 100) { s.t = 0; const n = s.g.slice(); for (let k = 0; k < nx * ny; k++) { const x = k % nx, y = k / nx | 0, beat = (s.g[k] + 1) % 3; let cnt = 0; for (let d = 0; d < 8; d++) { const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]][d]; if (s.g[mod(y + dy, ny) * nx + mod(x + dx, nx)] === beat) cnt++; } if (cnt > 2) n[k] = beat; } s.g = n; }
      const cols = [P.c.red, P.c.yellow, P.c.blue];
      for (let k = 0; k < nx * ny; k++) { fill(c, P, cols[s.g[k]], .13); c.fillRect((k % nx) * G, (k / nx | 0) * G, G, G); }
    },
  }],
  ["langton", "motion", "orange", ["Langtons Ameise", "Einfache Regeln, überraschende Spur"], ["Formica di Langton", "Regole semplici, traccia sorprendente"], {
    init: E => { const G = 6, nx = Math.ceil(E.w / G), ny = Math.ceil(E.h / G); return { G, nx, ny, g: new Uint8Array(nx * ny), x: nx / 2 | 0, y: ny / 2 | 0, d: 0, n: 0 }; },
    draw(c, s, E) {
      const { P } = E, { G, nx, ny } = s;
      for (let k = 0; k < 40; k++) { const i = s.y * nx + s.x; s.d = (s.d + (s.g[i] ? 3 : 1)) % 4; s.g[i] ^= 1; s.x = mod(s.x + [1, 0, -1, 0][s.d], nx); s.y = mod(s.y + [0, 1, 0, -1][s.d], ny); s.n++; }
      if (s.n > 40000) { s.g.fill(0); s.n = 0; }
      fill(c, P, P.c.orange, .4); for (let i = 0; i < nx * ny; i++) if (s.g[i]) c.fillRect((i % nx) * G, (i / nx | 0) * G, G - 1, G - 1);
      fill(c, P, P.c.red, .9); c.fillRect(s.x * G - 2, s.y * G - 2, G + 4, G + 4);
    },
  }],
  ["ripple-dots", "motion", "blue", ["Punktwellen", "Ringe laufen durch ein Punktraster"], ["Onde di punti", "Anelli che attraversano una griglia di punti"], {
    draw(c, s, E) { const { P } = E, cx = E.w * (.5 + .3 * Math.sin(E.t / 7000)), cy = E.h * (.5 + .3 * Math.cos(E.t / 9000)); grid(E, 22, (x, y) => { const d = Math.hypot(x - cx, y - cy), v = (Math.sin(d / 30 - E.t / 300) + 1) / 2; fill(c, P, v > .7 ? P.c.blue : P.muted, .15 + v * .45); dot(c, x + 11, y + 11, 1 + v * 4); }); },
  }],
  ["barber", "motion", "red", ["Spirallauf", "Diagonale Streifen wandern endlos"], ["Spirale continua", "Strisce diagonali che scorrono senza fine"], {
    draw(c, s, E) { const { P } = E, off = mod(E.t * .03, 60); for (let x = -E.h - 60 + off, k = 0; x < E.w + 60; x += 30, k++) { fill(c, P, k % 2 ? P.c.red : P.c.blue, .16); path(c, [[x, E.h], [x + E.h, 0], [x + E.h + 15, 0], [x + 15, E.h]], true); c.fill(); } },
  }],
  ["kaleido-auto", "motion", "mauve", ["Kaleidoskop", "Formen drehen sich zwölffach gespiegelt"], ["Caleidoscopio", "Forme che ruotano riflesse dodici volte"], {
    draw(c, s, E) { const { P } = E; for (const [cx, cy, rr] of [[E.w * .2, E.h * .5, 160], [E.w * .8, E.h * .5, 160]]) for (let k = 0; k < 12; k++) at(c, cx, cy, k / 12 * TAU + E.t / 8000, 1, () => { if (k % 2) c.scale(1, -1); for (let q = 0; q < 4; q++) { fill(c, P, L(P, q + k / 2), .22); const d = rr * (.2 + q * .2) + Math.sin(E.t / 900 + q) * 12; ngon(c, d, 12, 10 + q * 4, 3 + q, E.t / 1200 * (q % 2 ? 1 : -1)); c.fill(); } }); },
  }],
  ["maze-build", "motion", "green", ["Labyrinth entsteht", "Ein Irrgarten wird Gang für Gang gegraben"], ["Labirinto in costruzione", "Un labirinto scavato corridoio per corridoio"], {
    init: E => { const G = 26, m = maze(Math.ceil(E.w / G), Math.ceil(E.h / G), Math.random); return { G, m, k: 0 }; },
    draw(c, s, E) {
      const { P } = E, { G, m } = s; s.k += E.dt / 12; if (s.k > m.order.length + 300) { s.m = maze(m.cols, m.rows, Math.random); s.k = 0; }
      stroke(c, P, P.c.green, .5, G - 8); c.lineCap = "square"; c.beginPath();
      for (let i = 0; i < Math.min(s.k, m.order.length); i++) { const [a, b] = m.order[i]; c.moveTo((a % m.cols) * G + G / 2, (a / m.cols | 0) * G + G / 2); c.lineTo((b % m.cols) * G + G / 2, (b / m.cols | 0) * G + G / 2); }
      c.stroke(); c.lineCap = "butt";
    },
  }],
  ["grid-warp", "motion", "orange", ["Gitterwelle", "Ein Netz verbiegt sich in Wellen"], ["Rete ondulata", "Una rete che si piega a onde"], {
    draw(c, s, E) { const { P } = E, w = (x, y) => [x + Math.sin(y / 80 + E.t / 900) * 14, y + Math.sin(x / 90 + E.t / 1100) * 14]; stroke(c, P, P.c.orange, .35, 1.2); for (let y = 0; y < E.h + 30; y += 30) { param(c, k => w(k * E.w, y), 60); c.stroke(); } for (let x = 0; x < E.w + 30; x += 30) { param(c, k => w(x, k * E.h), 40); c.stroke(); } },
  }],
  ["streamlines", "motion", "blue", ["Stromlinien", "Teilchen umfließen ein Hindernis"], ["Linee di corrente", "Particelle che scorrono attorno a un ostacolo"], {
    init: E => swarm(E, dens(E, 4000, 80, 360)),
    draw(c, s, E) {
      const { P } = E, ox = E.w * .5, oy = E.h * .5, R0 = Math.min(E.w, E.h) * .15;
      fill(c, P, P.muted, .15); dot(c, ox, oy, R0);
      for (const p of s) { const dx = p.x - ox, dy = p.y - oy, r2 = dx * dx + dy * dy, k = R0 * R0 / r2; const vx = 1 - k * (dx * dx - dy * dy) / r2, vy = -k * 2 * dx * dy / r2; p.x += vx * .08 * E.dt; p.y += vy * .08 * E.dt; if (p.x > E.w || r2 < R0 * R0 * .9) { p.x = -R() * 40; p.y = R() * E.h; } stroke(c, P, L(P, p.y / E.h * 6), .45, 1.5); seg(c, p.x, p.y, p.x - vx * 8, p.y - vy * 8); }
    },
  }],
  ["rotating-squares", "motion", "yellow", ["Drehende Quadrate", "Ein Raster dreht sich versetzt wie eine Welle"], ["Quadrati rotanti", "Una griglia che ruota sfasata come un'onda"], {
    draw(c, s, E) { const { P } = E; grid(E, 44, (x, y, i, j) => { const a = Math.sin(E.t / 1200 - (i + j) * .25) * Math.PI / 4; fill(c, P, L(P, i + j), .25); at(c, x + 22, y + 22, a, 1, () => c.fillRect(-14, -14, 28, 28)); }); },
  }],
  // ----- touch -----
  ["flow-touch", "touch", "blue", ["Strömung um den Zeiger", "Das Flussfeld wirbelt um den Zeiger"], ["Corrente attorno al puntatore", "Il campo di flusso vortica attorno al puntatore"], {
    init: E => swarm(E, dens(E, 3500, 100, 420)),
    draw(c, s, E) {
      const { P } = E, on = E.ptr.on && !E.still;
      for (const p of s) { let a = noise(p.x / 260, p.y / 260) * TAU * 2; if (on) { const dx = p.x - E.ptr.x, dy = p.y - E.ptr.y, d = Math.hypot(dx, dy); if (d < 220) a = Math.atan2(dy, dx) + Math.PI / 2 * (1 - d / 220) + a * (d / 220); } const ox = p.x, oy = p.y; p.x += Math.cos(a) * .07 * E.dt; p.y += Math.sin(a) * .07 * E.dt; if (p.x < 0 || p.x > E.w || p.y < 0 || p.y > E.h) { p.x = R() * E.w; p.y = R() * E.h; continue; } stroke(c, P, L(P, p.i), .45, 1.5); seg(c, ox - Math.cos(a) * 6, oy - Math.sin(a) * 6, p.x, p.y); }
      return false;
    },
  }],
  ["blob-touch", "touch", "mauve", ["Tropfen am Zeiger", "Der Zeiger ist ein Tropfen, der mit anderen verschmilzt"], ["Goccia al puntatore", "Il puntatore è una goccia che si fonde con le altre"], {
    init: E => swarm(E, 5, () => ({ vx: (R() - .5) * .06, vy: (R() - .5) * .06, r: 50 + R() * 50 })),
    draw(c, s, E) {
      const { P } = E, G = 12, f = follow(s, E, -9999, -9999, 100), all = s.concat(f > .05 ? [{ x: s.x, y: s.y, r: 70 * f }] : []);
      for (const b of s) { b.x += b.vx * E.dt; b.y += b.vy * E.dt; if (b.x < 0 || b.x > E.w) b.vx *= -1; if (b.y < 0 || b.y > E.h) b.vy *= -1; }
      for (let y = 0; y < E.h; y += G) for (let x = 0; x < E.w; x += G) { let v = 0; for (const b of all) v += b.r * b.r / ((x - b.x) ** 2 + (y - b.y) ** 2 + 1); if (v > 1) { fill(c, P, v > 2 ? P.c.mauve : P.c.green, .25); c.fillRect(x, y, G, G); } }
      return false;
    },
  }],
  ["truchet-touch", "touch", "red", ["Kacheln drehen", "Kacheln unter dem Zeiger drehen sich weiter"], ["Girare le piastrelle", "Le piastrelle sotto il puntatore ruotano"], {
    init: E => { const t = []; const r = rnd(908); grid(E, 40, (x, y) => { const a = (r() * 2 | 0) * Math.PI / 2; t.push({ x, y, a, goal: a }); }); return t; },
    draw(c, s, E) {
      const { P } = E; let busy = false;
      stroke(c, P, P.c.red, .45, 3);
      for (const q of s) { if (E.ptr.on && !E.still && Math.abs(E.ptr.x - q.x - 20) < 20 && Math.abs(E.ptr.y - q.y - 20) < 20 && Math.abs(q.goal - q.a) < .05) q.goal += Math.PI / 2; q.a += (q.goal - q.a) * Math.min(1, E.dt / 200); if (Math.abs(q.goal - q.a) > .01) busy = true; at(c, q.x + 20, q.y + 20, q.a, 1, () => { c.beginPath(); c.arc(-20, -20, 20, 0, Math.PI / 2); c.stroke(); c.beginPath(); c.arc(20, 20, 20, Math.PI, Math.PI * 1.5); c.stroke(); }); }
      return !busy && !E.ptr.on;
    },
  }],
  ["grid-dent", "touch", "orange", ["Netz eindrücken", "Das Gitter wölbt sich unter dem Zeiger"], ["Premere la rete", "La griglia si incurva sotto il puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -9999, -9999, 100);
      const w = (x, y) => { const dx = x - s.x, dy = y - s.y, d2 = dx * dx + dy * dy, k = f * 60 * Math.exp(-d2 / 12000); return [x - dx / Math.sqrt(d2 + 1) * k, y - dy / Math.sqrt(d2 + 1) * k]; };
      stroke(c, P, P.c.orange, .35, 1.2); for (let y = 0; y < E.h + 30; y += 30) { param(c, k => w(k * E.w, y), 80); c.stroke(); } for (let x = 0; x < E.w + 30; x += 30) { param(c, k => w(x, k * E.h), 60); c.stroke(); }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["maze-solve", "touch", "green", ["Weg zum Zeiger", "Der kürzeste Weg durch das Labyrinth leuchtet"], ["Strada verso il puntatore", "Il percorso più breve nel labirinto si illumina"], {
    init: E => { const G = 30; return { G, m: maze(Math.ceil(E.w / G), Math.ceil(E.h / G), rnd(909)), key: -1, route: [] }; },
    draw(c, s, E) {
      const { P } = E, { G, m } = s;
      drawMaze(c, P, m, G, P.muted, .4);
      if (E.ptr.on && !E.still) {
        const target = clamp(Math.floor(E.ptr.y / G), 0, m.rows - 1) * m.cols + clamp(Math.floor(E.ptr.x / G), 0, m.cols - 1);
        if (target !== s.key) {
          s.key = target; const prev = new Int32Array(m.cols * m.rows).fill(-1), q = [0]; prev[0] = 0;
          while (q.length) { const cur = q.shift(); if (cur === target) break; const x = cur % m.cols, y = cur / m.cols | 0; const nb = []; if (x < m.cols - 1 && !m.right[cur]) nb.push(cur + 1); if (x > 0 && !m.right[cur - 1]) nb.push(cur - 1); if (y < m.rows - 1 && !m.down[cur]) nb.push(cur + m.cols); if (y > 0 && !m.down[cur - m.cols]) nb.push(cur - m.cols); for (const n of nb) if (prev[n] < 0) { prev[n] = cur; q.push(n); } }
          s.route = []; for (let k = target; k !== 0 && k >= 0; k = prev[k]) s.route.push(k); s.route.push(0);
        }
      }
      if (s.route.length) { stroke(c, P, P.c.green, .7, 4); path(c, s.route.map(k => [(k % m.cols) * G + G / 2, (k / m.cols | 0) * G + G / 2])); c.stroke(); }
      return true;
    },
  }],
  ["dots-repel", "touch", "blue", ["Punkte weichen aus", "Ein Punktraster macht dem Zeiger Platz"], ["Punti che si scostano", "Una griglia di punti fa spazio al puntatore"], {
    init: E => { const d = []; grid(E, 20, (x, y) => d.push({ hx: x + 10, hy: y + 10, x: x + 10, y: y + 10 })); return d; },
    draw(c, s, E) {
      const { P } = E, on = E.ptr.on && !E.still; let busy = false;
      for (const d of s) { let tx = d.hx, ty = d.hy; if (on) { const dx = d.hx - E.ptr.x, dy = d.hy - E.ptr.y, dist = Math.hypot(dx, dy) || 1; if (dist < 120) { tx += dx / dist * (120 - dist) * .6; ty += dy / dist * (120 - dist) * .6; } } d.x += (tx - d.x) * Math.min(1, E.dt / 120); d.y += (ty - d.y) * Math.min(1, E.dt / 120); const off = Math.abs(d.x - d.hx) + Math.abs(d.y - d.hy); if (Math.abs(tx - d.x) + Math.abs(ty - d.y) > .3) busy = true; fill(c, P, off > 3 ? L(P, off / 10) : P.muted, .25 + Math.min(.5, off / 60)); dot(c, d.x, d.y, 2.2); }
      return !busy && !on;
    },
  }],
  ["hill", "touch", "green", ["Hügel formen", "Der Zeiger hebt einen Berg aus den Höhenlinien"], ["Modellare una collina", "Il puntatore solleva un monte dalle curve di livello"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -9999, -9999, 150), G = 14, nx = Math.ceil(E.w / G) + 1, ny = Math.ceil(E.h / G) + 1, v = new Float32Array(nx * ny);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = i * G, y = j * G; v[j * nx + i] = noise(x / 300, y / 300) * .7 + f * .6 * Math.exp(-((x - s.x) ** 2 + (y - s.y) ** 2) / 20000); }
      for (let k = 0; k < 10; k++) { const lv = .2 + k * .08; stroke(c, P, k > 6 ? P.c.orange : P.c.green, .4, 1.3); c.beginPath(); for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = v[j * nx + i], b = v[j * nx + i + 1], d = v[(j + 1) * nx + i], e = v[(j + 1) * nx + i + 1], x = i * G, y = j * G, pts = []; if ((a - lv) * (b - lv) < 0) pts.push([x + G * (lv - a) / (b - a), y]); if ((b - lv) * (e - lv) < 0) pts.push([x + G, y + G * (lv - b) / (e - b)]); if ((d - lv) * (e - lv) < 0) pts.push([x + G * (lv - d) / (e - d), y + G]); if ((a - lv) * (d - lv) < 0) pts.push([x, y + G * (lv - a) / (d - a)]); if (pts.length >= 2) { c.moveTo(...pts[0]); c.lineTo(...pts[1]); } } c.stroke(); }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["tile-wave", "touch", "yellow", ["Kachelwelle", "Tippen schickt eine Welle durch die Kacheln"], ["Onda di piastrelle", "Tocca per mandare un'onda tra le piastrelle"], {
    init: () => ({ waves: [] }),
    draw(c, s, E) {
      const { P } = E;
      for (const tap of E.ptr.taps.splice(0)) s.waves.push([tap.x, tap.y, E.t]);
      s.waves = s.waves.filter(w => E.t - w[2] < 3000);
      grid(E, 36, (x, y, i, j) => { let k = 0; for (const [wx, wy, t0] of s.waves) { const d = Math.hypot(x + 18 - wx, y + 18 - wy), front = (E.t - t0) * .4; k = Math.max(k, Math.max(0, 1 - Math.abs(d - front) / 60) * (1 - (E.t - t0) / 3000)); } fill(c, P, k > .05 ? L(P, i + j) : P.muted, .1 + k * .5); at(c, x + 18, y + 18, k * Math.PI / 2, 1 - k * .3, () => { rrect(c, -15, -15, 30, 30, 5); c.fill(); }); });
      return !s.waves.length;
    },
  }],
  ["bend-lines", "touch", "mauve", ["Gebogene Linien", "Senkrechte Linien neigen sich zum Zeiger"], ["Linee piegate", "Linee verticali che si piegano verso il puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -9999, -9999, 120);
      for (let x = 10, k = 0; x < E.w; x += 16, k++) { stroke(c, P, L(P, k / 6), .35, 1.5); c.beginPath(); for (let y = 0; y <= E.h; y += 10) { const dx = s.x - x, dy = s.y - y, d2 = dx * dx + dy * dy, xx = x + dx * f * .5 * Math.exp(-d2 / 15000); y ? c.lineTo(xx, y) : c.moveTo(xx, y); } c.stroke(); }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["life-paint", "touch", "green", ["Leben säen", "Der Zeiger setzt Zellen, die weiterleben"], ["Seminare la vita", "Il puntatore crea cellule che continuano a vivere"], {
    init: E => { const sz = 12, nx = Math.ceil(E.w / sz), ny = Math.ceil(E.h / sz); return { sz, nx, ny, g: new Uint8Array(nx * ny), t: 0, alive: 0 }; },
    draw(c, s, E) {
      const { P } = E, { sz, nx, ny } = s;
      if (E.ptr.on && !E.still) { const i = Math.floor(E.ptr.x / sz), j = Math.floor(E.ptr.y / sz); for (let k = 0; k < 6; k++) { const a = clamp(i + (R() * 5 | 0) - 2, 0, nx - 1), b = clamp(j + (R() * 5 | 0) - 2, 0, ny - 1); s.g[b * nx + a] = 1; } }
      s.t += E.dt;
      if (s.t > 160) { s.t = 0; const n = new Uint8Array(nx * ny); let alive = 0; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let k = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (di || dj) k += s.g[mod(j + dj, ny) * nx + mod(i + di, nx)] ? 1 : 0; const was = s.g[j * nx + i]; n[j * nx + i] = (was && (k === 2 || k === 3)) || (!was && k === 3) ? Math.min(was + 1, 5) || 1 : 0; if (n[j * nx + i]) alive++; } s.g = n; s.alive = alive; }
      for (let k = 0; k < nx * ny; k++) if (s.g[k]) { fill(c, P, L(P, s.g[k]), .4); c.fillRect((k % nx) * sz + 1, (k / nx | 0) * sz + 1, sz - 2, sz - 2); }
      return false;
    },
  }],
]);
