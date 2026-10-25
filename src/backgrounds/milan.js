/* Extra backgrounds 4/10: Milan and Italy */
import { clear, TAU, clamp, mod, rnd, R, many, dens, wrap, noise, fbm, A, L, fill, stroke, dot, ring, seg, path, ngon, starPath, rrect, curve, param, text, at, swarm, near, grid, follow, def } from "./kit.js";

// Metro lines in logo colors (M1 red, M2 green, M3 yellow, M4 blue, M5 lilac) as polylines on a 0..1 grid
const METRO = [
  ["red", [[0, .45], [.2, .45], [.35, .5], [.5, .5], [.62, .42], [.75, .35], [1, .3]]],
  ["green", [[.1, 1], [.25, .8], [.38, .62], [.5, .5], [.6, .38], [.7, .2], [.85, 0]]],
  ["yellow", [[.5, 0], [.52, .2], [.5, .5], [.55, .7], [.6, 1]]],
  ["blue", [[0, .7], [.2, .65], [.4, .58], [.5, .5], [.65, .58], [.8, .7], [1, .78]]],
  ["mauve", [[.3, 0], [.4, .15], [.48, .3], [.62, .32], [.78, .5], [.9, .62], [1, .65]]],
];
const STATIONS = ["Duomo", "Cadorna", "Centrale", "Garibaldi", "Loreto", "San Babila", "Lanza", "Moscova", "Porta Venezia", "Repubblica", "Sant'Ambrogio", "Isola", "Lotto", "Turati", "Crocetta"];
const metroPts = (E, line) => line.map(([x, y]) => [x * E.w, y * E.h]);
// Point at k (0..1) along a polyline
function along(pts, k) {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), total = lens.reduce((a, b) => a + b, 0);
  let d = k * total;
  for (let i = 0; i < lens.length; i++) { if (d <= lens[i]) { const u = d / lens[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u, Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])]; } d -= lens[i]; }
  const a = pts[pts.length - 2], b = pts[pts.length - 1]; return [b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0])];
}
// Gothic spire: x = center bottom, y = base, h height, w width
function spire(c, x, y, w, h) {
  path(c, [[x - w / 2, y], [x - w / 2, y - h * .6], [x - w / 4, y - h * .7], [x, y - h], [x + w / 4, y - h * .7], [x + w / 2, y - h * .6], [x + w / 2, y]], true);
}
// Orange tram (Ventotto) at x, y (rails), length len
function tram(c, P, x, y, len, a = .7) {
  fill(c, P, P.c.orange, a); rrect(c, x, y - 34, len, 30, 5); c.fill();
  fill(c, P, P.bg, a * .9); for (let k = 8; k < len - 14; k += 18) c.fillRect(x + k, y - 28, 12, 11);
  fill(c, P, P.fg, a * .4); c.fillRect(x, y - 10, len, 3);
  stroke(c, P, P.muted, a * .8, 1.5); seg(c, x + len * .45, y - 34, x + len * .55, y - 52); seg(c, x + len * .55, y - 52, x + len * .35, y - 58);
  fill(c, P, P.fg, a * .6); dot(c, x + 14, y - 3, 3.5); dot(c, x + len - 14, y - 3, 3.5);
}
// Pigeon as a small V with flapping wings
function pigeon(c, P, x, y, s, flap, col) {
  stroke(c, P, col, .55, 2); c.beginPath(); c.moveTo(x - s, y - flap * s * .6); c.quadraticCurveTo(x - s * .4, y - s * .2, x, y); c.quadraticCurveTo(x + s * .4, y - s * .2, x + s, y - flap * s * .6); c.stroke();
}

export default def("milan", [
  ["spires", "still", "blue", ["Domspitzen", "Reihen gotischer Fialen wie auf dem Duomo"], ["Guglie", "File di guglie gotiche come sul Duomo"], {
    draw(c, s, E) {
      const r = rnd(301), { P } = E;
      for (let row = 0, y = E.h; y > 0; row++, y -= 160) for (let x = (row % 2) * 30; x < E.w + 40; x += 60) {
        const h = 90 + r() * 70;
        fill(c, P, row % 2 ? P.c.blue : P.line, row % 2 ? .3 : .9); spire(c, x, y, 22, h); c.fill();
        if (r() < .2) { fill(c, P, P.c.yellow, .7); dot(c, x, y - h - 5, 3.5); }
      }
    },
  }],
  ["galleria-floor", "still", "red", ["Galleria-Mosaik", "Sternmuster aus dem Boden der Galleria"], ["Mosaico della Galleria", "Motivo a stella del pavimento della Galleria"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 160, (x, y, i, j) => {
        const cx = x + 80, cy = y + 80;
        fill(c, P, P.c.red, .14); ngon(c, cx, cy, 78, 8, Math.PI / 8); c.fill();
        fill(c, P, P.c.yellow, .25); starPath(c, cx, cy, 64, 30, 8); c.fill();
        fill(c, P, P.c.blue, .35); dot(c, cx, cy, 22);
        stroke(c, P, P.muted, .4, 1.5); ngon(c, cx, cy, 78, 8, Math.PI / 8); c.stroke(); ring(c, cx, cy, 22);
      });
    },
  }],
  ["navigli", "still", "blue", ["Navigli", "Kanäle mit Häusern und Spiegelungen"], ["Navigli", "Canali con case e riflessi"], {
    draw(c, s, E) {
      const r = rnd(302), { P } = E;
      for (const y0 of [E.h * .38, E.h * .88]) {
        let x = 0;
        while (x < E.w) {
          const bw = 40 + r() * 50, bh = 60 + r() * 80, col = L(P, r() * 6);
          fill(c, P, col, .3); c.fillRect(x, y0 - 80 - bh, bw, bh);
          fill(c, P, P.bg, .5); for (let wy = y0 - 70 - bh; wy < y0 - 90; wy += 22) for (let wx = x + 6; wx < x + bw - 10; wx += 16) c.fillRect(wx, wy, 8, 12);
          fill(c, P, col, .1); c.fillRect(x, y0 - 70, bw, bh * .6);
          x += bw + 2;
        }
        fill(c, P, P.c.blue, .2); c.fillRect(0, y0 - 80, E.w, 80);
        stroke(c, P, P.c.blue, .4); for (let k = 0; k < 6; k++) { const yy = y0 - 70 + k * 12; curve(c, xx => yy + Math.sin(xx / 30 + k) * 2, 0, E.w, 10); c.stroke(); }
      }
    },
  }],
  ["metro-map", "still", "red", ["U-Bahn-Plan", "M1 bis M5 in den Logofarben"], ["Mappa della metro", "Dalla M1 alla M5 nei colori del logo"], {
    draw(c, s, E) {
      const { P } = E;
      METRO.forEach(([col, line], i) => {
        const pts = metroPts(E, line);
        stroke(c, P, P.c[col], .6, 8); c.lineJoin = "round"; path(c, pts); c.stroke();
        for (const [x, y] of pts) { fill(c, P, P.bg, 1); dot(c, x, y, 6); stroke(c, P, P.fg, .5, 2); ring(c, x, y, 6); }
        const [x, y] = pts[0]; fill(c, P, P.c[col], .8); rrect(c, x + 6, y - 24, 34, 22, 4); c.fill(); fill(c, P, P.bg, 1); text(c, "M" + (i + 1), x + 23, y - 13, 13, 600);
      });
      fill(c, P, P.fg, .45); METRO[0][1].forEach(([x, y], k) => text(c, STATIONS[k], x * E.w + 10, y * E.h + 18, 11, 500, "left"));
    },
  }],
  ["tram-wires", "still", "orange", ["Oberleitungen", "Netz aus Tramdrähten und Gleisen"], ["Linee aeree", "Rete di fili del tram e binari"], {
    draw(c, s, E) {
      const r = rnd(303), { P } = E;
      for (let k = 0; k < 7; k++) {
        const y0 = r() * E.h, a = (r() - .5) * .5;
        stroke(c, P, P.muted, .4, 1); seg(c, 0, y0, E.w, y0 + Math.tan(a) * E.w); seg(c, 0, y0 + 6, E.w, y0 + 6 + Math.tan(a) * E.w);
        for (let x = 40; x < E.w; x += 160) { stroke(c, P, P.muted, .3); seg(c, x, y0 + Math.tan(a) * x - 30, x, y0 + Math.tan(a) * x + 30); }
      }
      for (let k = 0; k < 3; k++) { const y = (k + 1) * E.h / 4; stroke(c, P, P.c.orange, .35, 2); seg(c, 0, y, E.w, y); seg(c, 0, y + 12, E.w, y + 12); for (let x = 0; x < E.w; x += 18) { stroke(c, P, P.muted, .25, 3); seg(c, x, y - 3, x, y + 15); } }
    },
  }],
  ["cobblestones", "still", "mauve", ["Pflaster", "Fächerförmig gelegte Pflastersteine"], ["Sampietrini", "Cubetti di porfido a ventaglio"], {
    draw(c, s, E) {
      const r = rnd(304), { P } = E, R0 = 90;
      for (let y = 0, row = 0; y < E.h + R0; y += R0 * .5, row++) for (let x = (row % 2) * R0; x < E.w + R0; x += R0 * 2) {
        for (let ring2 = 1; ring2 <= 4; ring2++) {
          const rr = ring2 * R0 / 4, n = ring2 * 5;
          for (let k = 0; k < n; k++) {
            const a0 = Math.PI + k / n * Math.PI, a1 = Math.PI + (k + 1) / n * Math.PI;
            fill(c, P, r() < .5 ? P.muted : P.c.mauve, .08 + r() * .1);
            c.beginPath(); c.arc(x, y, rr, a0 + .02, a1 - .02); c.arc(x, y, rr - R0 / 4 + 3, a1 - .02, a0 + .02, true); c.closePath(); c.fill();
          }
        }
      }
    },
  }],
  ["terrazzo", "still", "green", ["Terrazzo", "Venezianischer Boden mit bunten Splittern"], ["Terrazzo", "Pavimento alla veneziana con scaglie colorate"], {
    draw(c, s, E) {
      const r = rnd(305), { P } = E;
      for (let i = 0; i < dens(E, 300, 600, 5000); i++) { fill(c, P, r() < .3 ? P.muted : L(P, r() * 6), .2 + r() * .3); ngon(c, r() * E.w, r() * E.h, 2 + r() * (r() < .05 ? 14 : 5), 3 + (r() * 4 | 0), r() * TAU); c.fill(); }
    },
  }],
  ["battlements", "still", "red", ["Zinnen", "Schwalbenschwanzzinnen wie am Castello"], ["Merli", "Merli a coda di rondine come al Castello"], {
    draw(c, s, E) {
      const { P } = E;
      for (let y = 60, row = 0; y < E.h + 60; y += 120, row++) {
        fill(c, P, row % 2 ? P.c.red : P.muted, row % 2 ? .22 : .14); c.fillRect(0, y, E.w, 40);
        for (let x = (row % 2) * 30; x < E.w; x += 60) { path(c, [[x, y], [x, y - 36], [x + 12, y - 24], [x + 24, y - 36], [x + 24, y]], true); c.fill(); }
        fill(c, P, P.bg, .7); for (let x = 40; x < E.w; x += 120) { rrect(c, x, y + 10, 10, 20, 5); c.fill(); }
      }
    },
  }],
  ["facade-grid", "still", "blue", ["Hochhausfassade", "Fensterraster wie am Pirellone"], ["Facciata", "Griglia di finestre come al Pirellone"], {
    draw(c, s, E) {
      const r = rnd(306), { P } = E;
      for (let x = 0; x < E.w; x += 12) { stroke(c, P, P.c.blue, x % 60 ? .15 : .4, x % 60 ? 1 : 2); seg(c, x, 0, x, E.h); }
      for (let y = 0; y < E.h; y += 22) { stroke(c, P, P.c.blue, .25); seg(c, 0, y, E.w, y); }
      for (let i = 0; i < dens(E, 2500, 60, 500); i++) { fill(c, P, P.c.yellow, .2 + r() * .3); c.fillRect((r() * E.w / 12 | 0) * 12 + 1, (r() * E.h / 22 | 0) * 22 + 1, 10, 20); }
    },
  }],
  ["vertical-forest", "still", "green", ["Bosco Verticale", "Türme mit Balkonen voller Bäume"], ["Bosco Verticale", "Torri con balconi pieni di alberi"], {
    draw(c, s, E) {
      const r = rnd(307), { P } = E;
      for (let x = 30; x < E.w; x += 180 + r() * 80) {
        const tw = 70 + r() * 40, th = E.h * (.5 + r() * .4);
        fill(c, P, P.line, .9); c.fillRect(x, E.h - th, tw, th);
        for (let y = E.h - th + 10; y < E.h; y += 18) {
          stroke(c, P, P.muted, .35); seg(c, x - 8, y, x + tw + 8, y);
          for (let k = 0; k < 4; k++) if (r() < .6) { fill(c, P, P.c.green, .35 + r() * .3); dot(c, x - 4 + r() * (tw + 8), y - 6, 5 + r() * 5); }
        }
      }
    },
  }],
  ["porticoes", "still", "orange", ["Arkaden", "Bogengänge in mehreren Reihen"], ["Portici", "Porticati su più file"], {
    draw(c, s, E) {
      const { P } = E;
      for (let y = 140, row = 0; y < E.h + 140; y += 150, row++) for (let x = (row % 2) * 40; x < E.w; x += 80) {
        fill(c, P, L(P, row + 2), .2); c.fillRect(x, y - 130, 80, 130);
        fill(c, P, P.bg, 1); c.beginPath(); c.moveTo(x + 12, y); c.lineTo(x + 12, y - 70); c.arc(x + 40, y - 70, 28, Math.PI, TAU); c.lineTo(x + 68, y); c.closePath(); c.fill();
        stroke(c, P, P.muted, .35); c.stroke();
      }
    },
  }],
  ["maiolica", "still", "blue", ["Majolika", "Bemalte Fliesen mit Stern und Blüten"], ["Maiolica", "Piastrelle dipinte con stelle e fiori"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 110, (x, y, i, j) => {
        const cx = x + 55, cy = y + 55;
        fill(c, P, P.c.blue, .14); c.fillRect(x + 2, y + 2, 106, 106);
        fill(c, P, P.c.yellow, .35); starPath(c, cx, cy, 44, 18, 4, Math.PI / 4); c.fill();
        fill(c, P, P.c.blue, .45); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; c.beginPath(); c.ellipse(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24, 12, 5, a, 0, TAU); c.fill(); }
        fill(c, P, P.c.orange, .5); dot(c, cx, cy, 7);
        for (const [qx, qy] of [[x + 2, y + 2], [x + 108, y + 2], [x + 2, y + 108], [x + 108, y + 108]]) { fill(c, P, P.c.green, .35); dot(c, qx, qy, 12); }
      });
    },
  }],
  ["lemons", "still", "yellow", ["Zitronen", "Zitronen mit Blättern"], ["Limoni", "Limoni con foglie"], {
    draw(c, s, E) {
      const r = rnd(308), { P } = E;
      for (let i = 0; i < dens(E, 14000, 20, 90); i++) at(c, r() * E.w, r() * E.h, r() * TAU, .7 + r() * .6, () => {
        fill(c, P, P.c.green, .4); c.beginPath(); c.ellipse(-26, -18, 18, 7, -.6, 0, TAU); c.fill(); c.beginPath(); c.ellipse(-10, -28, 16, 6, -1.2, 0, TAU); c.fill();
        fill(c, P, P.c.yellow, .55); c.beginPath(); c.ellipse(0, 0, 26, 19, 0, 0, TAU); c.fill(); dot(c, 26, 0, 5); dot(c, -26, 0, 4);
      });
    },
  }],
  ["pasta", "still", "orange", ["Pasta", "Farfalle, Penne und Fusilli"], ["Pasta", "Farfalle, penne e fusilli"], {
    draw(c, s, E) {
      const r = rnd(309), { P } = E;
      for (let i = 0; i < dens(E, 7000, 40, 200); i++) at(c, r() * E.w, r() * E.h, r() * TAU, 1, () => {
        const k = r() * 3 | 0; fill(c, P, P.c.yellow, .5); stroke(c, P, P.c.orange, .55, 1.5);
        if (k === 0) { path(c, [[-16, -10], [0, -2], [16, -10], [16, 10], [0, 2], [-16, 10]], true); c.fill(); c.stroke(); fill(c, P, P.c.orange, .6); c.fillRect(-3, -4, 6, 8); }
        else if (k === 1) { path(c, [[-18, -6], [14, -6], [20, 6], [-12, 6]], true); c.fill(); c.stroke(); for (let x = -12; x < 14; x += 5) seg(c, x, -6, x + 6, 6); }
        else { for (let x = -16; x < 16; x += 6) { c.beginPath(); c.ellipse(x, 0, 4, 9, .5, 0, TAU); c.fill(); c.stroke(); } }
      });
    },
  }],
  ["moka", "still", "mauve", ["Espresso", "Mokkakannen und Tassen"], ["Espresso", "Moke e tazzine"], {
    draw(c, s, E) {
      const r = rnd(310), { P } = E;
      for (let i = 0; i < dens(E, 26000, 12, 50); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * .3, .8 + r() * .5, () => {
        stroke(c, P, L(P, i), .55, 2);
        if (i % 2) {
          path(c, [[-18, 30], [-14, 0], [-18, -4], [-12, -30], [12, -30], [18, -4], [14, 0], [18, 30]], true); c.stroke();
          seg(c, -20, -4, 20, -4); c.beginPath(); c.moveTo(18, -24); c.quadraticCurveTo(34, -10, 18, 10); c.stroke(); path(c, [[-12, -30], [-22, -36], [-10, -34]]); c.stroke();
        } else {
          path(c, [[-16, -10], [16, -10], [12, 12], [-12, 12]], true); c.stroke(); c.beginPath(); c.arc(20, 0, 7, -1.3, 1.3); c.stroke(); seg(c, -24, 16, 24, 16);
        }
      });
    },
  }],
  ["scala-boxes", "still", "red", ["Logen der Scala", "Ränge eines Opernhauses"], ["Palchi della Scala", "File di palchi di un teatro d'opera"], {
    draw(c, s, E) {
      const { P } = E, cx = E.w / 2, cy = E.h * 1.1;
      for (let tier = 0; tier < 7; tier++) {
        const rr = 260 + tier * 70, n = 14 + tier * 3;
        for (let k = 0; k < n; k++) {
          const a0 = Math.PI * 1.08 + k / n * Math.PI * .84, a1 = a0 + Math.PI * .84 / n * .85;
          fill(c, P, P.c.red, .12 + (k + tier) % 2 * .08); c.beginPath(); c.arc(cx, cy, rr, a0, a1); c.arc(cx, cy, rr - 50, a1, a0, true); c.closePath(); c.fill();
          fill(c, P, P.c.yellow, .4); const am = (a0 + a1) / 2; dot(c, cx + Math.cos(am) * (rr - 8), cy + Math.sin(am) * (rr - 8), 2);
        }
      }
    },
  }],
  ["alps", "still", "blue", ["Alpen", "Gipfel zwischen Deutschland und Italien"], ["Alpi", "Vette tra Germania e Italia"], {
    draw(c, s, E) {
      const { P } = E;
      for (let layer = 0; layer < 4; layer++) {
        const base = E.h * (.45 + layer * .15), amp = 160 - layer * 30;
        const pts = [[0, E.h]]; for (let x = 0; x <= E.w + 20; x += 20) pts.push([x, base - (Math.abs(noise(x / 180 + layer * 9, layer) - .5) * 2) ** 1.4 * amp * 2 - noise(x / 50, layer + 3) * 30]);
        pts.push([E.w, E.h]);
        fill(c, P, layer % 2 ? P.c.blue : P.muted, .12 + layer * .06); path(c, pts, true); c.fill();
        if (layer === 0) { fill(c, P, P.surface, .8); for (const [x, y] of pts.slice(1, -1)) if (y < base - amp * .9) { path(c, [[x - 14, y + 16], [x, y], [x + 14, y + 16]], true); c.fill(); } }
      }
    },
  }],
  ["lake", "still", "blue", ["Comer See", "Höhenlinien eines Sees"], ["Lago di Como", "Curve di livello di un lago"], {
    draw(c, s, E) {
      const { P } = E, G = 8, nx = Math.ceil(E.w / G) + 1, ny = Math.ceil(E.h / G) + 1;
      const v = new Float32Array(nx * ny);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = fbm(i * G / 300, j * G / 300);
      for (let lv = .3; lv < .8; lv += .045) {
        stroke(c, P, lv > .55 ? P.c.blue : P.muted, .3 + (lv - .3), 1.2); c.beginPath();
        for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
          const a = v[j * nx + i], b = v[j * nx + i + 1], d = v[(j + 1) * nx + i], x = i * G, y = j * G;
          if ((a - lv) * (b - lv) < 0) { const xx = x + G * (lv - a) / (b - a); c.moveTo(xx, y); c.lineTo(xx, y + 2); }
          if ((a - lv) * (d - lv) < 0) { const yy = y + G * (lv - a) / (d - a); c.moveTo(x, yy); c.lineTo(x + 2, yy); }
        }
        c.stroke();
      }
    },
  }],
  ["piazza", "still", "orange", ["Piazza", "Pflasterstrahlen um einen Platz"], ["Piazza", "Raggi di pavimentazione attorno a una piazza"], {
    draw(c, s, E) {
      const { P } = E, cx = E.w * .5, cy = E.h * .55, m = Math.hypot(E.w, E.h);
      for (let k = 0; k < 9; k++) { const a = Math.PI + k / 8 * Math.PI; stroke(c, P, P.c.orange, .4, 3); seg(c, cx, cy, cx + Math.cos(a) * m, cy + Math.sin(a) * m); }
      for (let rr = 40; rr < m; rr += 40) { stroke(c, P, P.muted, .2); c.beginPath(); c.arc(cx, cy, rr, Math.PI, TAU); c.stroke(); }
      fill(c, P, P.c.orange, .3); c.beginPath(); c.arc(cx, cy, 30, 0, TAU); c.fill();
    },
  }],
  ["tickets", "still", "yellow", ["Fahrkarten", "Entwertete Tramtickets"], ["Biglietti", "Biglietti del tram obliterati"], {
    draw(c, s, E) {
      const r = rnd(311), { P } = E;
      for (let i = 0; i < dens(E, 22000, 14, 60); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * .9, 1, () => {
        fill(c, P, P.surface, 1); c.fillRect(-55, -26, 110, 52); stroke(c, P, P.line, 1); c.strokeRect(-55, -26, 110, 52);
        fill(c, P, P.c.orange, .55); c.fillRect(-55, -26, 22, 52);
        fill(c, P, P.fg, .4); text(c, "MILANO", 10, -12, 11, 600); text(c, "€ 2,20", 10, 2, 10, 500);
        fill(c, P, P.c.mauve, .45); text(c, `${10 + (r() * 14 | 0)}:${10 + (r() * 49 | 0)}  ${1 + (r() * 28 | 0)}.${1 + (r() * 12 | 0)}`, 12, 16, 9, 600);
      });
    },
  }],
  // ----- motion -----
  ["trams", "motion", "orange", ["Straßenbahnen", "Orange Trams fahren unter den Drähten"], ["Tram", "Tram arancioni che corrono sotto i fili"], {
    init: E => many(Math.max(2, Math.floor(E.h / 220)), i => ({ x: R() * E.w, v: (.04 + R() * .03) * (i % 2 ? 1 : -1), len: 140 + R() * 60 })),
    draw(c, s, E) {
      const { P } = E;
      s.forEach((t, i) => {
        const y = (i + 1) * E.h / (s.length + .3);
        stroke(c, P, P.muted, .4); seg(c, 0, y - 60, E.w, y - 60); fill(c, P, P.muted, .4); c.fillRect(0, y, E.w, 2);
        t.x = wrap(t.x + t.v * E.dt, E.w, t.len + 20); tram(c, P, t.x, y, t.len, .55);
      });
    },
  }],
  ["metro-run", "motion", "green", ["U-Bahn", "Züge flitzen über die Linien M1 bis M5"], ["Metropolitana", "Treni che corrono sulle linee M1–M5"], {
    draw(c, s, E) {
      const { P } = E;
      METRO.forEach(([col, line], i) => {
        const pts = metroPts(E, line);
        stroke(c, P, P.c[col], .3, 6); c.lineJoin = "round"; path(c, pts); c.stroke();
        for (let k = 0; k < 3; k++) {
          const u = mod(E.t / (9000 + i * 1300) + k / 3 + i * .1, 1), [x, y, a] = along(pts, k % 2 ? 1 - u : u);
          fill(c, P, P.c[col], .85); at(c, x, y, a, 1, () => { rrect(c, -18, -5, 36, 10, 4); c.fill(); });
        }
      });
    },
  }],
  ["canal-boats", "motion", "blue", ["Kanalboote", "Boote gleiten über die Navigli"], ["Barche sui Navigli", "Barche che scivolano sui Navigli"], {
    init: E => many(dens(E, 160000, 3, 8), i => ({ x: R() * E.w, v: (.012 + R() * .015) * (i % 2 ? 1 : -1), lane: i % 2 })),
    draw(c, s, E) {
      const { P } = E;
      for (const lane of [0, 1]) {
        const y = E.h * (lane ? .78 : .32);
        fill(c, P, P.c.blue, .18); c.fillRect(0, y - 30, E.w, 60);
        stroke(c, P, P.c.blue, .35); for (let k = 0; k < 4; k++) { curve(c, x => y - 20 + k * 13 + Math.sin(x / 40 + E.t / 900 + k) * 2, 0, E.w, 10); c.stroke(); }
      }
      for (const b of s) {
        b.x = wrap(b.x + b.v * E.dt, E.w, 80); const y = E.h * (b.lane ? .78 : .32);
        fill(c, P, P.c.red, .5); path(c, [[b.x - 40, y - 6], [b.x + 40, y - 6], [b.x + 30, y + 6], [b.x - 30, y + 6]], true); c.fill();
        fill(c, P, P.surface, .9); c.fillRect(b.x - 16, y - 18, 30, 12);
        stroke(c, P, P.c.blue, .4); for (let k = 1; k < 4; k++) { const tx = b.x - Math.sign(b.v) * (40 + k * 16); seg(c, tx, y + 4 + k * 3, tx - Math.sign(b.v) * 12, y + 4 + k * 3); }
      }
    },
  }],
  ["pigeons", "motion", "blue", ["Tauben am Domplatz", "Ein Schwarm kreist über den Dächern"], ["Piccioni in piazza", "Uno stormo che volteggia sopra i tetti"], {
    init: E => swarm(E, dens(E, 16000, 20, 70), () => ({ r: 80 + R() * 240, a: R() * TAU, sp: .0003 + R() * .0004 })),
    draw(c, s, E) {
      const { P } = E;
      for (let x = 0; x < E.w; x += 50) { fill(c, P, P.line, .9); spire(c, x + 25, E.h, 18, 60 + (x * 7 % 60)); c.fill(); }
      for (const p of s) { p.a += p.sp * E.dt; const x = E.w / 2 + Math.cos(p.a) * p.r * 1.8, y = E.h * .4 + Math.sin(p.a * 1.3) * p.r * .6; pigeon(c, P, x, y, 7 + p.z * 6, Math.sin(E.t / 90 + p.ph), P.muted); }
    },
  }],
  ["fountain", "motion", "blue", ["Brunnen", "Wasserstrahlen wie vor dem Castello"], ["Fontana", "Getti d'acqua come davanti al Castello"], {
    init: () => ({ drops: [] }),
    draw(c, s, E) {
      const { P } = E, cx = E.w / 2, base = E.h - 40;
      for (let k = 0; k < 6; k++) s.drops.push({ x: cx + (R() - .5) * 20, y: base - 20, vx: (R() - .5) * .25, vy: -.45 - R() * .25 });
      for (const d of s.drops) { d.vy += .0009 * E.dt; d.x += d.vx * E.dt; d.y += d.vy * E.dt; }
      s.drops = s.drops.filter(d => d.y < base);
      fill(c, P, P.c.blue, .5); for (const d of s.drops) c.fillRect(d.x, d.y, 2.5, 2.5);
      fill(c, P, P.c.blue, .25); c.beginPath(); c.ellipse(cx, base, 160, 26, 0, 0, TAU); c.fill(); stroke(c, P, P.muted, .5, 2); c.stroke();
    },
  }],
  ["sun-arc", "motion", "yellow", ["Sonnenbogen", "Die Sonne zieht über die Dächer"], ["Arco del sole", "Il sole che passa sopra i tetti"], {
    draw(c, s, E) {
      const { P } = E, k = mod(E.t / 30000, 1), x = E.w * k, y = E.h * (.8 - Math.sin(k * Math.PI) * .65);
      const g = c.createRadialGradient(x, y, 0, x, y, 220); g.addColorStop(0, P.c.yellow); g.addColorStop(1, clear(P.c.yellow)); A(c, .4, P); c.fillStyle = g; c.fillRect(x - 220, y - 220, 440, 440);
      fill(c, P, P.c.yellow, .7); dot(c, x, y, 30);
      fill(c, P, P.line, 1); for (let xx = 0; xx < E.w; xx += 44) { spire(c, xx + 22, E.h, 16, 70 + (xx * 13 % 80)); c.fill(); }
    },
  }],
  ["glass-rain", "motion", "blue", ["Regen auf der Galleria", "Tropfen auf dem Glasdach"], ["Pioggia sulla Galleria", "Gocce sul tetto di vetro"], {
    init: E => swarm(E, dens(E, 4000, 80, 300), () => ({ v: .4 + R() * .3 })),
    draw(c, s, E) {
      const { P } = E;
      stroke(c, P, P.muted, .3, 2); for (let x = 0; x < E.w; x += 120) { c.beginPath(); c.arc(x + 60, E.h, 120, Math.PI, TAU); c.stroke(); for (let k = 1; k < 6; k++) seg(c, x + 60, E.h, x + 60 + Math.cos(Math.PI + k / 6 * Math.PI) * 120, E.h + Math.sin(Math.PI + k / 6 * Math.PI) * 120); }
      stroke(c, P, P.c.blue, .4, 1.2); for (const d of s) { d.y = wrap(d.y + d.v * E.dt, E.h, 20); seg(c, d.x, d.y, d.x - 2, d.y - 12); }
    },
  }],
  ["fog", "motion", "mauve", ["Nebbia", "Nebelbänke ziehen durch die Poebene"], ["Nebbia", "Banchi di nebbia sulla Pianura Padana"], {
    draw(c, s, E) {
      const { P } = E;
      for (let k = 0; k < 9; k++) {
        const y = (k + .5) * E.h / 9, x = mod(E.t * (.01 + k % 3 * .005) + k * 300, E.w + 600) - 300;
        const g = c.createRadialGradient(x, y, 0, x, y, 300); g.addColorStop(0, P.muted); g.addColorStop(1, clear(P.muted));
        A(c, .1, P); c.fillStyle = g; c.save(); c.translate(x, y); c.scale(2.2, .5); c.translate(-x, -y); c.fillRect(x - 300, y - 300, 600, 600); c.restore();
      }
      fill(c, P, P.line, .8); for (let x = 0; x < E.w; x += 30) c.fillRect(x, E.h * .7 + (x * 7 % 40), 2, 60);
    },
  }],
  ["scooters", "motion", "red", ["Feierabendverkehr", "Lichtspuren ziehen über die Straßen"], ["Traffico serale", "Scie di luce lungo le strade"], {
    init: E => many(dens(E, 9000, 30, 120), i => ({ lane: i % 6, x: R() * E.w, v: (.1 + R() * .15) * (i % 6 < 3 ? 1 : -1) })),
    draw(c, s, E) {
      const { P } = E;
      for (const v of s) {
        v.x = wrap(v.x + v.v * E.dt, E.w, 60); const y = E.h * (.2 + v.lane * .12);
        const g = c.createLinearGradient(v.x, 0, v.x - Math.sign(v.v) * 60, 0); g.addColorStop(0, v.v > 0 ? P.c.red : P.c.yellow); g.addColorStop(1, clear(v.v > 0 ? P.c.red : P.c.yellow));
        A(c, .55, P); c.fillStyle = g; c.fillRect(Math.min(v.x, v.x - Math.sign(v.v) * 60), y - 1.5, 60, 3);
      }
    },
  }],
  ["bells", "motion", "yellow", ["Glockenturm", "Glocken schwingen im Campanile"], ["Campanile", "Campane che oscillano nel campanile"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [x, k] of [[E.w * .1, 0], [E.w * .9, 1]]) {
        fill(c, P, P.line, 1); c.fillRect(x - 50, 80, 100, E.h); path(c, [[x - 56, 82], [x, 20], [x + 56, 82]], true); c.fill();
        for (let b = 0; b < 2; b++) {
          const y = 150 + b * 130, a = Math.sin(E.t / 600 + b + k) * .5;
          fill(c, P, P.bg, 1); c.fillRect(x - 36, y - 46, 72, 90);
          at(c, x, y - 40, a, 1, () => { fill(c, P, P.c.orange, .6); c.beginPath(); c.moveTo(-8, 0); c.quadraticCurveTo(-12, 20, -24, 40); c.lineTo(24, 40); c.quadraticCurveTo(12, 20, 8, 0); c.closePath(); c.fill(); dot(c, Math.sin(E.t / 600 + b + k + 1) * 10, 44, 5); });
        }
      }
    },
  }],
  ["sailboats", "motion", "blue", ["Segelboote", "Segel kreuzen auf dem See"], ["Barche a vela", "Vele che bordeggiano sul lago"], {
    init: E => many(dens(E, 90000, 4, 12), () => ({ x: R() * E.w, y: .3 + R() * .65, v: (R() - .5) * .03, col: R() * 6 | 0 })),
    draw(c, s, E) {
      const { P } = E;
      stroke(c, P, P.c.blue, .25); for (let y = E.h * .3; y < E.h; y += 18) { curve(c, x => y + Math.sin(x / 60 + E.t / 1200 + y) * 2, 0, E.w, 12); c.stroke(); }
      for (const b of s) {
        b.x = wrap(b.x + b.v * E.dt, E.w, 60); const y = E.h * b.y + Math.sin(E.t / 800 + b.x) * 3, k = .6 + b.y * .6, d = b.v > 0 ? 1 : -1;
        at(c, b.x, y, Math.sin(E.t / 900 + b.x) * .05, k, () => {
          fill(c, P, P.fg, .3); path(c, [[-24, 0], [24, 0], [16, 8], [-16, 8]], true); c.fill();
          fill(c, P, L(P, b.col), .5); path(c, [[0, -4], [0, -54], [d * 26, -6]], true); c.fill();
          fill(c, P, P.surface, .9); path(c, [[-2, -8], [-2, -44], [-d * 18, -8]], true); c.fill();
        });
      }
    },
  }],
  ["steam", "motion", "mauve", ["Espressodampf", "Dampf kräuselt sich aus den Tassen"], ["Vapore dell'espresso", "Vapore che si arriccia dalle tazzine"], {
    draw(c, s, E) {
      const { P } = E;
      for (let x = 80; x < E.w; x += 220) for (const y of [E.h * .45, E.h * .95]) {
        stroke(c, P, P.c.mauve, .55, 2); path(c, [[x - 22, y - 30], [x + 22, y - 30], [x + 16, y], [x - 16, y]], true); c.stroke(); c.beginPath(); c.arc(x + 26, y - 18, 8, -1.3, 1.3); c.stroke(); seg(c, x - 32, y + 4, x + 32, y + 4);
        for (let k = 0; k < 3; k++) { stroke(c, P, P.muted, .35, 2); c.beginPath(); for (let yy = 0; yy < 90; yy += 4) { const xx = x - 10 + k * 10 + Math.sin(yy / 14 - E.t / 500 + k) * 6 * (yy / 90); yy ? c.lineTo(xx, y - 36 - yy) : c.moveTo(xx, y - 36 - yy); } c.stroke(); }
      }
    },
  }],
  ["curtain", "motion", "red", ["Vorhang auf", "Ein Theatervorhang öffnet und schließt sich"], ["Sipario", "Un sipario che si apre e si chiude"], {
    draw(c, s, E) {
      const { P } = E, k = (Math.sin(E.t / 4000) + 1) / 2, open = .1 + k * .38;
      for (const side of [-1, 1]) {
        const edge = E.w / 2 + side * E.w * open;
        for (let f = 0; f < 12; f++) {
          const x0 = side < 0 ? f / 12 * edge : edge + f / 12 * (E.w - edge), wd = (side < 0 ? edge : E.w - edge) / 12;
          const g = c.createLinearGradient(x0, 0, x0 + wd, 0); g.addColorStop(0, P.c.red); g.addColorStop(.5, P.bg); g.addColorStop(1, P.c.red);
          A(c, .22, P); c.fillStyle = g; c.fillRect(x0, 0, wd + 1, E.h);
        }
      }
      fill(c, P, P.c.red, .3); c.fillRect(0, 0, E.w, 30); fill(c, P, P.c.yellow, .5); for (let x = 0; x < E.w; x += 24) dot(c, x + 12, 32, 4);
    },
  }],
  ["fireworks", "motion", "yellow", ["Feuerwerk", "Leuchtkugeln über der Stadt"], ["Fuochi d'artificio", "Fuochi sopra la città"], {
    init: () => ({ rockets: [], next: 0 }),
    draw(c, s, E) {
      const { P } = E;
      if (E.t > s.next) { s.next = E.t + 700 + R() * 900; s.rockets.push({ x: R() * E.w, y: E.h * (.15 + R() * .4), t0: E.t, col: R() * 6 | 0, n: 18 + R() * 14 | 0 }); }
      s.rockets = s.rockets.filter(r => E.t - r.t0 < 2600);
      for (const r of s.rockets) {
        const k = (E.t - r.t0) / 2600, e = 1 - (1 - k) ** 3;
        for (let i = 0; i < r.n; i++) { const a = i / r.n * TAU; fill(c, P, L(P, r.col + i % 2), (1 - k) * .8); dot(c, r.x + Math.cos(a) * e * 110, r.y + Math.sin(a) * e * 110 + k * k * 40, 2.5); }
      }
      fill(c, P, P.line, 1); for (let x = 0; x < E.w; x += 50) { spire(c, x + 25, E.h, 16, 50 + (x * 11 % 70)); c.fill(); }
    },
  }],
  ["platforms", "motion", "green", ["Binari", "Züge fahren in die Bahnhofshalle"], ["Binari", "Treni che entrano nella stazione"], {
    draw(c, s, E) {
      const { P } = E, n = Math.max(3, Math.floor(E.h / 90));
      for (let i = 0; i < n; i++) {
        const y = (i + .5) * E.h / n, k = mod(E.t / (7000 + i * 900) + i * .23, 1), stop = E.w * .55;
        const sm = u => u * u * (3 - 2 * u), tx = k < .4 ? -420 + sm(k / .4) * (stop + 420) : k < .6 ? stop : stop + sm((k - .6) / .4) * (E.w - stop + 840);
        fill(c, P, P.muted, .35); c.fillRect(0, y + 12, E.w, 2); c.fillRect(0, y + 18, E.w, 2);
        fill(c, P, L(P, i), .45); for (let car = 0; car < 4; car++) { rrect(c, tx - car * 104, y - 16, 100, 30, 6); c.fill(); }
        fill(c, P, P.fg, .45); text(c, String(i + 1), 18, y, 16, 600);
      }
      stroke(c, P, P.muted, .35, 2); for (let x = 0; x < E.w; x += 140) { c.beginPath(); c.arc(x + 70, 0, 70, 0, Math.PI); c.stroke(); }
    },
  }],
  ["string-lights", "motion", "yellow", ["Lichterketten", "Glühbirnen funkeln zwischen den Bögen"], ["Luci a festone", "Lampadine che brillano tra gli archi"], {
    draw(c, s, E) {
      const { P } = E;
      for (let row = 0; row < 4; row++) {
        const y0 = 60 + row * E.h / 4, span = 220;
        for (let x = 0; x < E.w; x += span) {
          stroke(c, P, P.muted, .35); curve(c, xx => y0 + Math.sin((xx - x) / span * Math.PI) * 40, x, x + span, 10); c.stroke();
          for (let k = 1; k < 9; k++) { const xx = x + k * span / 9, yy = y0 + Math.sin(k / 9 * Math.PI) * 40 + 8, tw = (Math.sin(E.t / 300 + k * 2.1 + x + row) + 1) / 2; fill(c, P, P.c.yellow, .25 + tw * .6); dot(c, xx, yy, 4 + tw * 2); }
        }
      }
    },
  }],
  ["swallows", "motion", "blue", ["Schwalben", "Schwalben jagen um die Türme"], ["Rondini", "Rondini che sfrecciano attorno alle torri"], {
    init: E => swarm(E, dens(E, 30000, 10, 34), () => ({ a: R() * TAU, sp: .0008 + R() * .0008, rx: 100 + R() * 200, ry: 60 + R() * 140, cx: R() < .5 ? .15 : .85 })),
    draw(c, s, E) {
      const { P } = E;
      for (const cx of [.15, .85]) { fill(c, P, P.line, 1); c.fillRect(E.w * cx - 25, E.h * .35, 50, E.h); spire(c, E.w * cx, E.h * .35, 50, 60); c.fill(); }
      for (const b of s) {
        b.a += b.sp * E.dt; const x = E.w * b.cx + Math.cos(b.a) * b.rx, y = E.h * .4 + Math.sin(b.a * 2) * b.ry, dir = Math.atan2(Math.cos(b.a * 2) * b.ry * 2, -Math.sin(b.a) * b.rx);
        at(c, x, y, dir, 1, () => { fill(c, P, P.fg, .45); path(c, [[10, 0], [-2, -9], [-4, -2], [-12, -5], [-6, 0], [-12, 5], [-4, 2], [-2, 9]], true); c.fill(); });
      }
    },
  }],
  ["vines", "motion", "green", ["Weinberg", "Rebzeilen wiegen sich im Wind"], ["Vigneto", "Filari che ondeggiano al vento"], {
    draw(c, s, E) {
      const { P } = E;
      for (let row = 0; row < 10; row++) {
        const y = E.h * (.25 + row * .085), k = .4 + row * .07;
        stroke(c, P, P.muted, .35); seg(c, 0, y, E.w, y);
        for (let x = (row % 2) * 20; x < E.w; x += 40 * k) {
          const sway = Math.sin(E.t / 1200 + x / 90 + row) * 4 * k;
          fill(c, P, P.c.green, .35); dot(c, x + sway, y - 10 * k, 9 * k);
          if ((x + row * 13) % 3 < 1) { fill(c, P, P.c.mauve, .55); dot(c, x + sway + 3, y - 2 * k, 3.5 * k); }
        }
      }
    },
  }],
  ["olive-leaves", "motion", "green", ["Olivenblätter", "Silbergrüne Blätter segeln herab"], ["Foglie d'ulivo", "Foglie verde argento che cadono"], {
    init: E => swarm(E, dens(E, 9000, 30, 120), () => ({ v: .015 + R() * .025 })),
    draw(c, s, E) {
      const { P } = E;
      for (const l of s) {
        l.y = wrap(l.y + l.v * E.dt, E.h, 20); l.x += Math.sin(E.t / 1100 + l.ph) * .25;
        at(c, l.x, l.y, Math.sin(E.t / 700 + l.ph) * 1.4, 1, () => { fill(c, P, l.i % 3 ? P.c.green : P.muted, .45); c.beginPath(); c.ellipse(0, 0, 14 * l.z + 4, 3.5, 0, 0, TAU); c.fill(); });
      }
    },
  }],
  ["rush-hour", "motion", "mauve", ["Stoßzeit", "Menschenströme in der Station"], ["Ora di punta", "Flussi di persone nella stazione"], {
    init: E => many(dens(E, 3500, 80, 320), i => ({ k: R(), lane: i % 8, v: .00005 + R() * .00008 })),
    draw(c, s, E) {
      const { P } = E;
      const lanes = many(8, i => (k => [k * E.w, E.h * (.15 + i * .1) + Math.sin(k * 6 + i) * 30]));
      for (const p of s) { p.k = mod(p.k + p.v * E.dt * (p.lane % 2 ? 1 : -1), 1); const [x, y] = lanes[p.lane](p.k); fill(c, P, L(P, p.lane), .5); dot(c, x, y + (p.lane * 7 % 9) - 4, 2.5); }
    },
  }],
  // ----- touch -----
  ["rose-window", "touch", "mauve", ["Rosette", "Das Fensterglas leuchtet, wo der Zeiger ist"], ["Rosone", "Il vetro si illumina dove passa il puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, -999, 90), cx = E.w / 2, cy = E.h / 2, R0 = Math.min(E.w, E.h) * .55;
      for (let ringI = 0; ringI < 5; ringI++) {
        const r0 = R0 * ringI / 5, r1 = R0 * (ringI + 1) / 5, n = 6 + ringI * 6;
        for (let k = 0; k < n; k++) {
          const a0 = k / n * TAU, a1 = (k + 1) / n * TAU, am = (a0 + a1) / 2, mx = cx + Math.cos(am) * (r0 + r1) / 2, my = cy + Math.sin(am) * (r0 + r1) / 2;
          const lit = f * Math.max(0, 1 - Math.hypot(mx - s.x, my - s.y) / 160);
          fill(c, P, L(P, k + ringI), .1 + lit * .55); c.beginPath(); c.arc(cx, cy, r1, a0, a1); c.arc(cx, cy, r0, a1, a0, true); c.closePath(); c.fill();
          stroke(c, P, P.muted, .35, 2); c.stroke();
        }
      }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["tram-depart", "touch", "orange", ["Abfahrt", "Tippen schickt eine Tram los"], ["Partenza", "Tocca per far partire un tram"], {
    init: () => ({ trams: [] }),
    draw(c, s, E) {
      const { P } = E;
      for (const tap of E.ptr.taps.splice(0)) s.trams.push({ x: tap.x - 80, y: tap.y + 20, t0: E.t, dir: tap.x < E.w / 2 ? 1 : -1 });
      s.trams = s.trams.filter(t => t.x > -300 && t.x < E.w + 300);
      for (const t of s.trams) { const k = (E.t - t.t0) / 1000; t.x += t.dir * Math.min(.5, k * .2) * E.dt; fill(c, P, P.muted, .4); c.fillRect(0, t.y, E.w, 2); tram(c, P, t.x, t.y, 160, .6); }
      return !s.trams.length;
    },
  }],
  ["pigeon-scatter", "touch", "blue", ["Tauben aufscheuchen", "Die Tauben fliegen vor dem Zeiger auf"], ["Spaventare i piccioni", "I piccioni volano via dal puntatore"], {
    init: E => swarm(E, dens(E, 9000, 30, 120), () => ({ hx: 0, hy: 0, fly: 0 })),
    draw(c, s, E) {
      const { P } = E; let busy = false;
      for (const p of s) {
        if (!p.hx) { p.hx = p.x; p.hy = E.h * (.6 + R() * .38); p.y = p.hy; }
        const d = Math.hypot(p.x - E.ptr.x, p.y - E.ptr.y);
        if (E.ptr.on && !E.still && d < 120) p.fly = 1;
        if (p.fly > 0) { busy = true; p.fly -= E.dt / 4000; const away = Math.atan2(p.y - E.ptr.y, p.x - E.ptr.x); p.x += Math.cos(away) * .15 * E.dt * p.fly; p.y += (Math.sin(away) * .15 - .12) * E.dt * p.fly; pigeon(c, P, p.x, p.y, 9, Math.sin(E.t / 60 + p.ph), P.fg); }
        else { p.x += (p.hx - p.x) * .02; p.y += (p.hy - p.y) * .02; if (Math.abs(p.hy - p.y) > 1) busy = true; fill(c, P, P.muted, .5); c.beginPath(); c.ellipse(p.x, p.y, 8, 5, 0, 0, TAU); c.fill(); dot(c, p.x + 7, p.y - 4, 3); }
      }
      return !busy && !E.ptr.on;
    },
  }],
  ["fountain-tap", "touch", "blue", ["Wasserspiel", "Tippen lässt dort eine Fontäne springen"], ["Giochi d'acqua", "Tocca per far zampillare una fontana"], {
    init: () => ({ jets: [], drops: [] }),
    draw(c, s, E) {
      const { P } = E;
      for (const tap of E.ptr.taps.splice(0)) s.jets.push({ x: tap.x, y: tap.y, t0: E.t });
      s.jets = s.jets.filter(j => E.t - j.t0 < 1500);
      for (const j of s.jets) for (let k = 0; k < 5; k++) s.drops.push({ x: j.x, y: j.y, y0: j.y, vx: (R() - .5) * .2, vy: -.35 - R() * .2 });
      for (const d of s.drops) { d.vy += .0009 * E.dt; d.x += d.vx * E.dt; d.y += d.vy * E.dt; }
      s.drops = s.drops.filter(d => d.y < d.y0 + 40);
      fill(c, P, P.c.blue, .55); for (const d of s.drops) c.fillRect(d.x, d.y, 2.5, 2.5);
      return !s.jets.length && !s.drops.length;
    },
  }],
  ["station-names", "touch", "green", ["Stationen", "Haltestellen nahe am Zeiger zeigen ihren Namen"], ["Fermate", "Le fermate vicine al puntatore mostrano il nome"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, -999, 80);
      let n = 0;
      METRO.forEach(([col, line]) => {
        const pts = metroPts(E, line);
        stroke(c, P, P.c[col], .4, 6); c.lineJoin = "round"; path(c, pts); c.stroke();
        for (const [x, y] of pts) {
          const k = f * Math.max(0, 1 - Math.hypot(x - s.x, y - s.y) / 150);
          fill(c, P, P.bg, 1); dot(c, x, y, 5 + k * 4); stroke(c, P, P.fg, .4 + k * .4, 2); ring(c, x, y, 5 + k * 4);
          if (k > .05) { fill(c, P, P.fg, k * .8); text(c, STATIONS[n % STATIONS.length], x + 12, y - 12, 12 + k * 4, 600, "left"); }
          n++;
        }
      });
      return f < .01 && !E.ptr.on;
    },
  }],
  ["lantern", "touch", "yellow", ["Laterne", "Warmes Licht auf dem Pflaster"], ["Lampione", "Luce calda sul selciato"], {
    init: E => { const r = rnd(312); return { stones: many(dens(E, 900, 300, 2400), () => [r() * E.w, r() * E.h, 6 + r() * 6, r() * TAU]) }; },
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, E.w * .5 + Math.sin(E.t / 6000) * E.w * .3, E.h * .5, 150);
      for (const [x, y, rr, a] of s.stones) { const k = Math.max(0, 1 - Math.hypot(x - s.x, y - s.y) / 260); fill(c, P, k > .05 ? P.c.orange : P.muted, .06 + k * .35); ngon(c, x, y, rr, 4, a); c.fill(); }
      const g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, 260); g.addColorStop(0, P.c.yellow); g.addColorStop(1, clear(P.c.yellow)); A(c, .25, P); c.fillStyle = g; c.fillRect(s.x - 260, s.y - 260, 520, 520);
      return false;
    },
  }],
  ["tile-turn", "touch", "blue", ["Kachelspiel", "Majolika-Kacheln drehen sich unter dem Zeiger"], ["Gioco di piastrelle", "Le maioliche ruotano sotto il puntatore"], {
    init: E => { const tiles = []; grid(E, 70, (x, y) => tiles.push({ x: x + 35, y: y + 35, a: 0, goal: 0 })); return tiles; },
    draw(c, s, E) {
      const { P } = E; let busy = false;
      for (const t of s) {
        if (E.ptr.on && !E.still && Math.abs(E.ptr.x - t.x) < 35 && Math.abs(E.ptr.y - t.y) < 35 && t.goal - t.a < .1) t.goal += Math.PI / 2;
        t.a += (t.goal - t.a) * Math.min(1, E.dt / 150); if (t.goal - t.a > .01) busy = true;
        at(c, t.x, t.y, t.a, 1, () => {
          fill(c, P, P.c.blue, .14); c.fillRect(-34, -34, 68, 68);
          fill(c, P, P.c.blue, .45); c.beginPath(); c.arc(-34, -34, 34, 0, Math.PI / 2); c.lineTo(-34, -34); c.fill();
          fill(c, P, P.c.yellow, .45); c.beginPath(); c.arc(34, 34, 34, Math.PI, Math.PI * 1.5); c.lineTo(34, 34); c.fill();
        });
      }
      return !busy && !E.ptr.on;
    },
  }],
  ["lake-tap", "touch", "blue", ["Steinchen werfen", "Tippen zieht Ringe im See"], ["Sassolini", "Tocca per creare cerchi sul lago"], {
    init: () => ({ rings: [] }),
    draw(c, s, E) {
      const { P } = E;
      for (const tap of E.ptr.taps.splice(0)) s.rings.push([tap.x, tap.y, E.t]);
      s.rings = s.rings.filter(r => E.t - r[2] < 4000);
      stroke(c, P, P.c.blue, .2); for (let y = 20; y < E.h; y += 22) { curve(c, x => { let dy = 0; for (const [rx, ry, t0] of s.rings) { const d = Math.hypot(x - rx, y - ry), fr = (E.t - t0) * .15; dy += Math.sin((d - fr) / 10) * 6 * Math.exp(-Math.abs(d - fr) / 40) * (1 - (E.t - t0) / 4000); } return y + dy; }, 0, E.w, 8); c.stroke(); }
      for (const [x, y, t0] of s.rings) for (let k = 0; k < 3; k++) { const rr = (E.t - t0) * .15 - k * 18; if (rr > 0) { stroke(c, P, P.c.blue, (1 - (E.t - t0) / 4000) * .5, 1.5); c.beginPath(); c.ellipse(x, y, rr, rr * .35, 0, 0, TAU); c.stroke(); } }
      return !s.rings.length;
    },
  }],
  ["curtain-part", "touch", "red", ["Bühne frei", "Der Vorhang teilt sich am Zeiger"], ["Scena libera", "Il sipario si apre dove passa il puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, E.w / 2, E.h / 2, 160), gap = 40 + f * 220;
      for (let x = 0; x < E.w; x += 30) {
        const d = x - s.x, push = Math.sign(d) * gap * Math.exp(-(d * d) / 40000) * f;
        const g = c.createLinearGradient(x + push, 0, x + push + 30, 0); g.addColorStop(0, P.c.red); g.addColorStop(.5, P.bg); g.addColorStop(1, P.c.red);
        A(c, .2, P); c.fillStyle = g; c.fillRect(x + push, 0, 31, E.h);
      }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["peaks", "touch", "blue", ["Gipfelrelief", "Unter dem Zeiger wachsen die Berge"], ["Rilievo", "Sotto il puntatore crescono le montagne"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, E.h / 2, 120);
      for (let layer = 0; layer < 4; layer++) {
        const base = E.h * (.45 + layer * .15), pts = [[0, E.h]];
        for (let x = 0; x <= E.w + 20; x += 16) { const boost = f * Math.exp(-((x - s.x) ** 2) / 30000) * (200 - layer * 40); pts.push([x, base - noise(x / 160 + layer * 5, layer) * (140 - layer * 25) - boost]); }
        pts.push([E.w, E.h]); fill(c, P, layer % 2 ? P.c.blue : P.muted, .12 + layer * .06); path(c, pts, true); c.fill();
      }
      return f < .01 && !E.ptr.on;
    },
  }],
]);
