/* Extra backgrounds 8/10: music and sound */
import { TAU, clamp, mod, rnd, R, many, dens, wrap, noise, A, L, fill, stroke, dot, ring, seg, path, ngon, rrect, curve, param, text, at, swarm, near, grid, follow, def } from "./kit.js";

const FIFTHS = ["C", "G", "D", "A", "E", "H", "Fis", "Des", "As", "Es", "B", "F"];
const FIFTHS_IT = ["Do", "Sol", "Re", "La", "Mi", "Si", "Fa♯", "Re♭", "La♭", "Mi♭", "Si♭", "Fa"];

// Note head with stem at x, y (stem up), duration kind 0 whole, 1 half, 2 quarter, 3 eighth
function note(c, P, x, y, kind, col, a = .5) {
  fill(c, P, col, a); stroke(c, P, col, a, 1.8);
  at(c, x, y, -.35, 1, () => { c.beginPath(); c.ellipse(0, 0, 7, 5, 0, 0, TAU); kind < 2 ? c.stroke() : c.fill(); });
  if (kind > 0) { seg(c, x + 6, y - 2, x + 6, y - 34); if (kind === 3) { c.beginPath(); c.moveTo(x + 6, y - 34); c.quadraticCurveTo(x + 18, y - 24, x + 14, y - 12); c.stroke(); } }
}
function staff(c, P, y, w, a = .4) { stroke(c, P, P.muted, a); for (let k = 0; k < 5; k++) seg(c, 0, y + k * 10, w, y + k * 10); }
function trebleClef(c, P, x, y, col) {
  stroke(c, P, col, .6, 2.5); c.beginPath();
  c.moveTo(x + 4, y + 52); c.quadraticCurveTo(x - 6, y + 56, x - 4, y + 46); c.lineTo(x + 6, y - 14); c.quadraticCurveTo(x + 14, y - 28, x + 4, y - 30); c.quadraticCurveTo(x - 4, y - 20, x + 2, y + 6);
  c.bezierCurveTo(x + 6, y + 30, x + 26, y + 20, x + 20, y + 8); c.bezierCurveTo(x + 14, y - 4, x - 10, y + 6, x - 6, y + 24); c.bezierCurveTo(x - 2, y + 40, x + 26, y + 38, x + 22, y + 20); c.stroke();
}
function vinyl(c, P, x, y, rr, rot, col) {
  fill(c, P, P.fg, .2); dot(c, x, y, rr);
  stroke(c, P, P.bg, .25); for (let k = rr * .4; k < rr; k += 4) ring(c, x, y, k);
  fill(c, P, col, .55); dot(c, x, y, rr * .32); fill(c, P, P.bg, 1); dot(c, x, y, 3);
  stroke(c, P, P.bg, .5, 2); c.beginPath(); c.arc(x, y, rr * .7, rot, rot + .6); c.stroke();
}

export default def("music", [
  ["staff", "still", "blue", ["Notenlinien", "Fünf Linien voller Noten"], ["Pentagramma", "Cinque righe piene di note"], {
    draw(c, s, E) { const r = rnd(701), { P } = E; for (let y = 40; y < E.h; y += 100) { staff(c, P, y, E.w); for (let x = 70; x < E.w; x += 34 + r() * 20) note(c, P, x, y + (r() * 9 | 0) * 5, r() * 4 | 0, L(P, r() * 6)); trebleClef(c, P, 20, y + 10, P.fg); } },
  }],
  ["clefs", "still", "mauve", ["Notenschlüssel", "Violinschlüssel in allen Größen"], ["Chiavi musicali", "Chiavi di violino in ogni misura"], {
    draw(c, s, E) { const r = rnd(702), { P } = E; for (let i = 0; i < dens(E, 20000, 16, 60); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * .6, .6 + r() * .9, () => trebleClef(c, P, 0, 0, L(P, i))); },
  }],
  ["piano", "still", "yellow", ["Klaviatur", "Weiße und schwarze Tasten"], ["Tastiera del pianoforte", "Tasti bianchi e neri"], {
    draw(c, s, E) {
      const { P } = E, kw = 34;
      for (let y = 0; y < E.h; y += 190) for (let x = 0, k = 0; x < E.w; x += kw, k++) {
        stroke(c, P, P.muted, .45); c.strokeRect(x, y + 20, kw, 160);
        if ([0, 1, 3, 4, 5].includes(k % 7)) { fill(c, P, P.fg, .3); c.fillRect(x + kw * .65, y + 20, kw * .7, 100); }
      }
    },
  }],
  ["guitar", "still", "orange", ["Gitarrensaiten", "Griffbrett mit Bünden und Saiten"], ["Corde di chitarra", "Tastiera con tasti e corde"], {
    draw(c, s, E) {
      const { P } = E;
      for (let oy = 30; oy < E.h; oy += 180) {
        fill(c, P, P.c.orange, .12); c.fillRect(0, oy, E.w, 120);
        for (let x = 40, k = 0; x < E.w; x += 120 * Math.pow(.97, k), k++) { stroke(c, P, P.muted, .5, 2.5); seg(c, x, oy, x, oy + 120); if ([3, 5, 7, 9].includes(k % 12)) { fill(c, P, P.surface, .9); dot(c, x - 40 * Math.pow(.97, k), oy + 60, 5); } }
        for (let k = 0; k < 6; k++) { stroke(c, P, P.fg, .3, 1 + k * .4); seg(c, 0, oy + 10 + k * 20, E.w, oy + 10 + k * 20); }
      }
    },
  }],
  ["dynamics", "still", "red", ["Dynamik", "p, mf, ff und Crescendo-Gabeln"], ["Dinamica", "p, mf, ff e forcelle di crescendo"], {
    draw(c, s, E) {
      const r = rnd(703), { P } = E, D = ["pp", "p", "mp", "mf", "f", "ff", "sfz"];
      for (let i = 0; i < dens(E, 10000, 30, 130); i++) { const x = r() * E.w, y = r() * E.h; if (r() < .5) { fill(c, P, L(P, i), .45); text(c, D[r() * D.length | 0], x, y, 20 + r() * 20, 600); } else { const w = 60 + r() * 80, cresc = r() < .5; stroke(c, P, L(P, i), .45, 1.8); path(c, cresc ? [[x + w, y - 10], [x, y], [x + w, y + 10]] : [[x, y - 10], [x + w, y], [x, y + 10]]); c.stroke(); } }
    },
  }],
  ["metronomes", "still", "green", ["Metronome", "Pyramiden mit Pendel"], ["Metronomi", "Piramidi con pendolo"], {
    draw(c, s, E) {
      const r = rnd(704), { P } = E;
      for (let i = 0; i < dens(E, 30000, 10, 40); i++) { const x = r() * E.w, y = r() * E.h, a = (r() - .5) * .8, col = L(P, i); fill(c, P, col, .3); path(c, [[x - 26, y + 40], [x - 12, y - 40], [x + 12, y - 40], [x + 26, y + 40]], true); c.fill(); stroke(c, P, P.fg, .5, 2); seg(c, x, y + 30, x + Math.sin(a) * 66, y + 30 - Math.cos(a) * 66); fill(c, P, P.fg, .5); c.fillRect(x + Math.sin(a) * 40 - 4, y + 30 - Math.cos(a) * 40 - 3, 8, 6); }
    },
  }],
  ["instruments", "still", "mauve", ["Instrumente", "Geige, Trompete und Trommel als Umriss"], ["Strumenti", "Violino, tromba e tamburo in contorno"], {
    draw(c, s, E) {
      const r = rnd(705), { P } = E;
      const draws = [
        () => { c.beginPath(); c.moveTo(0, -50); c.bezierCurveTo(22, -50, 22, -20, 10, -10); c.bezierCurveTo(26, 0, 26, 50, 0, 50); c.bezierCurveTo(-26, 50, -26, 0, -10, -10); c.bezierCurveTo(-22, -20, -22, -50, 0, -50); c.stroke(); seg(c, 0, -50, 0, -90); seg(c, -4, 10, -4, 22); seg(c, 4, 10, 4, 22); },
        () => { path(c, [[-50, -4], [20, -4], [40, -16], [40, 16], [20, 4], [-50, 4]], true); c.stroke(); for (const x of [-20, -8, 4]) seg(c, x, -4, x, -16); },
        () => { c.beginPath(); c.ellipse(0, -20, 36, 10, 0, 0, TAU); c.stroke(); seg(c, -36, -20, -36, 24); seg(c, 36, -20, 36, 24); c.beginPath(); c.ellipse(0, 24, 36, 10, 0, 0, Math.PI); c.stroke(); seg(c, -20, -40, 10, -26); seg(c, 20, -40, -10, -26); },
      ];
      for (let i = 0; i < dens(E, 26000, 12, 50); i++) { stroke(c, P, L(P, i), .5, 2); at(c, r() * E.w, r() * E.h, (r() - .5) * 1.2, .7 + r() * .6, draws[i % 3]); }
    },
  }],
  ["records", "still", "red", ["Schallplatten", "Vinyl mit Rillen und Etikett"], ["Dischi", "Vinili con solchi ed etichetta"], {
    draw(c, s, E) { const r = rnd(706), { P } = E; for (let i = 0; i < dens(E, 50000, 6, 22); i++) vinyl(c, P, r() * E.w, r() * E.h, 50 + r() * 50, r() * TAU, L(P, i)); },
  }],
  ["cassettes", "still", "orange", ["Kassetten", "Bänder mit zwei Spulen"], ["Cassette", "Nastri con due bobine"], {
    draw(c, s, E) {
      const r = rnd(707), { P } = E;
      for (let i = 0; i < dens(E, 30000, 10, 40); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * .8, 1, () => {
        fill(c, P, L(P, i), .3); rrect(c, -60, -38, 120, 76, 6); c.fill(); fill(c, P, P.surface, .9); c.fillRect(-48, -28, 96, 30);
        fill(c, P, P.fg, .3); text(c, ["Mix", "Lieder", "Canzoni", "Hörbuch"][i % 4], 0, -18, 10, 600);
        for (const x of [-24, 24]) { fill(c, P, P.bg, 1); dot(c, x, 14, 10); stroke(c, P, P.fg, .4, 1.5); ring(c, x, 14, 10); }
      });
    },
  }],
  ["eq-still", "still", "green", ["Equalizer", "Pegelbalken eingefroren"], ["Equalizzatore", "Barre di livello ferme"], {
    draw(c, s, E) { const { P } = E; for (let x = 4, k = 0; x < E.w; x += 16, k++) { const h = (noise(k / 6, 1) * .8 + .1) * E.h * .5; for (let y = 0; y < h; y += 10) { fill(c, P, y > h * .8 ? P.c.red : y > h * .55 ? P.c.yellow : P.c.green, .4); c.fillRect(x, E.h - 10 - y, 12, 7); } } },
  }],
  ["waveform", "still", "blue", ["Wellenform", "Eine Tonaufnahme als Kurve"], ["Forma d'onda", "Una registrazione come curva"], {
    draw(c, s, E) { const r = rnd(708), { P } = E; for (let y0 = E.h * .2, k = 0; y0 < E.h; y0 += E.h * .3, k++) { stroke(c, P, L(P, k * 2), .45, 1); c.beginPath(); for (let x = 0; x < E.w; x += 2) { const env = noise(x / 120, k) * 70; c.moveTo(x, y0 - env * r()); c.lineTo(x, y0 + env * r()); } c.stroke(); } },
  }],
  ["fifths", "still", "mauve", ["Quintenzirkel", "Alle Tonarten im Kreis"], ["Circolo delle quinte", "Tutte le tonalità in cerchio"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [cx, cy, rr, names] of [[E.w * .18, E.h * .5, 150, FIFTHS], [E.w * .82, E.h * .5, 150, FIFTHS_IT]]) for (let k = 0; k < 12; k++) {
        const a0 = (k - .5) / 12 * TAU - Math.PI / 2, a1 = (k + .5) / 12 * TAU - Math.PI / 2, am = k / 12 * TAU - Math.PI / 2;
        fill(c, P, L(P, k), .18); c.beginPath(); c.arc(cx, cy, rr, a0, a1); c.arc(cx, cy, rr * .55, a1, a0, true); c.closePath(); c.fill(); stroke(c, P, P.bg, 1, 2); c.stroke();
        fill(c, P, P.fg, .5); text(c, names[k], cx + Math.cos(am) * rr * .78, cy + Math.sin(am) * rr * .78, 15, 600);
      }
    },
  }],
  ["drums", "still", "red", ["Schlagzeug", "Trommeln und Becken von oben"], ["Batteria", "Tamburi e piatti visti dall'alto"], {
    draw(c, s, E) { const r = rnd(709), { P } = E; for (let i = 0; i < dens(E, 9000, 30, 130); i++) { const x = r() * E.w, y = r() * E.h, rr = 14 + r() * 40, cym = r() < .3; fill(c, P, cym ? P.c.yellow : P.surface, cym ? .3 : .9); dot(c, x, y, rr); stroke(c, P, cym ? P.c.orange : L(P, i), .5, cym ? 1 : 4); ring(c, x, y, rr); if (cym) for (let k = 4; k < rr; k += 5) { stroke(c, P, P.c.orange, .2); ring(c, x, y, k); } } },
  }],
  ["tuning-forks", "still", "blue", ["Stimmgabeln", "Gabeln mit Schwingungsbögen"], ["Diapason", "Forchette con archi di vibrazione"], {
    draw(c, s, E) { const r = rnd(710), { P } = E; for (let i = 0; i < dens(E, 30000, 10, 40); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * 1.4, 1, () => { stroke(c, P, P.muted, .6, 4); c.beginPath(); c.moveTo(-8, -50); c.lineTo(-8, 0); c.arc(0, 0, 8, Math.PI, 0, true); c.lineTo(8, -50); c.stroke(); seg(c, 0, 8, 0, 44); stroke(c, P, L(P, i), .5, 1.5); for (let k = 1; k < 4; k++) { c.beginPath(); c.arc(0, -30, 16 + k * 10, -2.6, -.5); c.stroke(); } }); },
  }],
  ["music-box", "still", "yellow", ["Spieluhr", "Kamm und Stiftwalze"], ["Carillon", "Pettine e cilindro a punte"], {
    draw(c, s, E) {
      const r = rnd(711), { P } = E;
      for (let oy = 40; oy < E.h; oy += 200) {
        fill(c, P, P.c.yellow, .15); rrect(c, 20, oy, E.w - 40, 100, 50); c.fill(); stroke(c, P, P.c.orange, .45, 2); c.stroke();
        fill(c, P, P.fg, .4); for (let x = 50; x < E.w - 50; x += 8 + r() * 10) dot(c, x, oy + 10 + r() * 80, 2.2);
        stroke(c, P, P.muted, .5, 3); for (let x = 40; x < E.w - 40; x += 10) seg(c, x, oy + 110, x, oy + 150 - (x % 70) / 4);
      }
    },
  }],
  ["beat-patterns", "still", "green", ["Taktfiguren", "Dirigierbewegungen für 2/4, 3/4 und 4/4"], ["Gesti del direttore", "Movimenti per 2/4, 3/4 e 4/4"], {
    draw(c, s, E) {
      const { P } = E, pats = { 2: [[0, -1], [0, 1], [.3, .3], [0, -1]], 3: [[0, -1], [0, 1], [-.8, .5], [.8, .4], [0, -1]], 4: [[0, -1], [0, 1], [-.8, .5], [.8, .4], [.2, -.3], [0, -1]] };
      grid(E, 200, (x, y, i, j) => { const n = [2, 3, 4][mod(i + j, 3)], pts = pats[n].map(([u, v]) => [x + 100 + u * 70, y + 100 + v * 70]); stroke(c, P, L(P, n), .55, 2); c.beginPath(); c.moveTo(...pts[0]); for (let k = 1; k < pts.length; k++) { const [px, py] = pts[k - 1], [qx, qy] = pts[k]; c.quadraticCurveTo(px + (qx - px) * .5 + 20, py + (qy - py) * .5, qx, qy); } c.stroke(); fill(c, P, P.fg, .45); text(c, `${n}/4`, x + 100, y + 190, 14, 600); pts.slice(1, -1).forEach((p, k) => { fill(c, P, L(P, n), .8); dot(c, p[0], p[1], 4); text(c, String(k + 1), p[0] + 12, p[1], 10, 600); }); });
    },
  }],
  ["step-grid", "still", "orange", ["Rhythmusraster", "Schritte eines Drumcomputers"], ["Griglia ritmica", "I passi di una drum machine"], {
    draw(c, s, E) { const r = rnd(712), { P } = E; grid(E, 36, (x, y, i, j) => { const on = r() < (mod(i, 4) === 0 ? .7 : .22); fill(c, P, on ? L(P, mod(j, 6)) : P.muted, on ? .45 : .08); rrect(c, x + 4, y + 4, 28, 28, 6); c.fill(); }); },
  }],
  ["orchestra", "still", "blue", ["Orchesteraufstellung", "Pulte im Halbkreis um den Dirigenten"], ["Disposizione dell'orchestra", "Leggii a semicerchio attorno al direttore"], {
    draw(c, s, E) {
      const { P } = E, cx = E.w / 2, cy = E.h * .92;
      for (let row = 1; row < 7; row++) { const rr = row * Math.min(E.w, E.h * 1.6) * .08, n = 6 + row * 5; for (let k = 0; k <= n; k++) { const a = Math.PI + k / n * Math.PI; fill(c, P, L(P, row + (k > n / 2 ? 1 : 0)), .45); dot(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .8, 6); } }
      fill(c, P, P.fg, .6); dot(c, cx, cy, 9);
    },
  }],
  ["harp", "still", "mauve", ["Harfe", "Gespannte Saiten im Rahmen"], ["Arpa", "Corde tese nella cornice"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [x0, flip] of [[E.w * .05, 1], [E.w * .95, -1]]) {
        const top = E.h * .1, bot = E.h * .9, w = Math.min(260, E.w * .25) * flip;
        stroke(c, P, P.c.orange, .5, 6); c.beginPath(); c.moveTo(x0, bot); c.lineTo(x0, top); c.quadraticCurveTo(x0 + w * .5, top - 40, x0 + w, top + E.h * .3); c.lineTo(x0 + w * .2, bot); c.stroke();
        for (let k = 1; k < 22; k++) { const u = k / 22, x = x0 + w * u * .95, yt = top + (u < .5 ? -20 * Math.sin(u * Math.PI) : E.h * .3 * (u - .5) * 2) , yb = bot - (bot - top) * u * .25; stroke(c, P, k % 7 === 0 ? P.c.red : k % 7 === 3 ? P.c.blue : P.muted, .45, 1); seg(c, x, yt + 20, x, yb); }
      }
    },
  }],
  ["choir-lines", "still", "green", ["Chorstimmen", "Sopran, Alt, Tenor und Bass als Linien"], ["Voci del coro", "Soprano, contralto, tenore e basso come linee"], {
    draw(c, s, E) {
      const { P } = E, V = ["Sopran", "Alt", "Tenor", "Bass"];
      V.forEach((v, k) => { const y0 = E.h * (.15 + k * .22); stroke(c, P, L(P, k * 1.5), .55, 3); curve(c, x => y0 + Math.sin(x / (90 + k * 30) + k) * (25 - k * 3) + Math.sin(x / 37) * 6, 0, E.w, 6); c.stroke(); fill(c, P, P.fg, .45); text(c, v, 16, y0 - 30, 12, 600, "left"); });
    },
  }],
  // ----- motion -----
  ["flying-notes", "motion", "mauve", ["Fliegende Noten", "Noten schweben wie aus einem Lautsprecher"], ["Note volanti", "Note che volano come da un altoparlante"], {
    init: E => swarm(E, dens(E, 18000, 16, 70), () => ({ kind: R() * 4 | 0, v: .015 + R() * .03 })),
    draw(c, s, E) { for (const n of s) { n.y = wrap(n.y - n.v * E.dt, E.h, 50); note(c, E.P, n.x + Math.sin(E.t / 1000 + n.ph) * 30, n.y, n.kind, L(E.P, n.i), .5); } },
  }],
  ["equalizer", "motion", "green", ["Equalizer", "Pegelbalken springen zur Musik"], ["Equalizzatore", "Barre che saltano con la musica"], {
    draw(c, s, E) { const { P } = E; for (let x = 4, k = 0; x < E.w; x += 16, k++) { const h = (noise(k / 5, E.t / 400) * .9 + .05) * E.h * .55; for (let y = 0; y < h; y += 10) { fill(c, P, y > E.h * .4 ? P.c.red : y > E.h * .25 ? P.c.yellow : P.c.green, .4); c.fillRect(x, E.h - 10 - y, 12, 7); } } },
  }],
  ["oscilloscope", "motion", "green", ["Oszilloskop", "Schwingungen auf dem Bildschirm"], ["Oscilloscopio", "Oscillazioni sullo schermo"], {
    draw(c, s, E) {
      const { P } = E;
      stroke(c, P, P.c.green, .15); for (let x = 0; x < E.w; x += 50) seg(c, x, 0, x, E.h); for (let y = 0; y < E.h; y += 50) seg(c, 0, y, E.w, y);
      for (let k = 0; k < 3; k++) { stroke(c, P, L(P, k * 2 + 1), .55, 2); curve(c, x => E.h / 2 + Math.sin(x / (40 + k * 23) + E.t / (200 + k * 90)) * 80 * Math.sin(E.t / 2000 + k) + Math.sin(x / 11 + E.t / 90) * 8, 0, E.w, 3); c.stroke(); }
    },
  }],
  ["turntable", "motion", "red", ["Plattenspieler", "Platten drehen sich unter dem Tonarm"], ["Giradischi", "Dischi che girano sotto il braccio"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [x, y, rr, k] of [[E.w * .15, E.h * .35, 110, 0], [E.w * .85, E.h * .65, 130, 3]]) {
        vinyl(c, P, x, y, rr, E.t / 300 * (TAU / 6) % TAU, L(P, k));
        stroke(c, P, P.muted, .7, 4); const px = x + rr * 1.1, py = y - rr * .9, a = 2.3 + Math.sin(E.t / 8000) * .1; seg(c, px, py, px + Math.cos(a) * rr * 1.2, py + Math.sin(a) * rr * 1.2); fill(c, P, P.muted, .8); dot(c, px, py, 9);
      }
    },
  }],
  ["metronome", "motion", "yellow", ["Metronom", "Pendel schlagen den Takt"], ["Metronomo", "Pendoli che battono il tempo"], {
    draw(c, s, E) {
      const { P } = E;
      for (let x = 80, k = 0; x < E.w; x += 180, k++) for (const y of [E.h * .45, E.h * .95]) {
        const bpm = 60 + k * 12, a = Math.sin(E.t / 60000 * bpm * Math.PI) * .6;
        fill(c, P, L(P, k), .3); path(c, [[x - 34, y], [x - 16, y - 110], [x + 16, y - 110], [x + 34, y]], true); c.fill();
        stroke(c, P, P.fg, .55, 2.5); seg(c, x, y - 14, x + Math.sin(a) * 120, y - 14 - Math.cos(a) * 120); fill(c, P, P.fg, .55); c.fillRect(x + Math.sin(a) * 80 - 6, y - 14 - Math.cos(a) * 80 - 4, 12, 8);
        fill(c, P, P.fg, .4); text(c, String(bpm), x, y - 30, 11, 600);
      }
    },
  }],
  ["piano-roll", "motion", "blue", ["Notenrolle", "Töne ziehen als Balken vorbei"], ["Rullo di note", "Note che scorrono come barre"], {
    init: () => { const r = rnd(713); return many(160, () => ({ x: r() * 4000, p: r() * 40 | 0, len: 20 + r() * 120 })); },
    draw(c, s, E) {
      const { P } = E, rowH = E.h / 40, off = E.t * .08;
      for (let k = 0; k < 40; k++) if ([1, 3, 6, 8, 10].includes(k % 12)) { fill(c, P, P.muted, .05); c.fillRect(0, k * rowH, E.w, rowH); }
      for (const n of s) { const x = mod(n.x - off, 4000) - 200; if (x > E.w || x + n.len < 0) continue; fill(c, P, L(P, n.p), .45); rrect(c, x, n.p * rowH + 1, n.len, rowH - 2, 3); c.fill(); }
      stroke(c, P, P.c.red, .6, 2); seg(c, E.w * .5, 0, E.w * .5, E.h);
    },
  }],
  ["strings-vibrate", "motion", "orange", ["Schwingende Saiten", "Saiten zittern nach dem Anschlag"], ["Corde che vibrano", "Corde che tremano dopo il tocco"], {
    draw(c, s, E) {
      const { P } = E;
      for (let k = 0; k < 8; k++) { const y = (k + 1) * E.h / 9, cyc = mod(E.t / 2000 + k * .37, 1), amp = 30 * Math.exp(-cyc * 4); stroke(c, P, L(P, k), .5, 1 + k * .3); curve(c, x => y + Math.sin(x / E.w * Math.PI) * Math.sin(E.t / (30 + k * 6)) * amp, 0, E.w, 6); c.stroke(); }
    },
  }],
  ["sequencer", "motion", "red", ["Stepsequenzer", "Ein Lauflicht spielt das Muster ab"], ["Sequencer", "Una luce che scorre suona lo schema"], {
    init: () => { const r = rnd(714); return many(16 * 8, k => r() < (k % 4 === 0 ? .6 : .2)); },
    draw(c, s, E) {
      const { P } = E, cols = 16, rows = 8, cw = (E.w - 40) / cols, rh = (E.h - 40) / rows, step = Math.floor(E.t / 150) % cols;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const on = s[j * cols + i], hit = on && i === step; fill(c, P, on ? L(P, j) : P.muted, hit ? .75 : on ? .35 : .06); rrect(c, 20 + i * cw + 4, 20 + j * rh + 4, cw - 8, rh - 8, 8); c.fill(); }
      fill(c, P, P.fg, .08); c.fillRect(20 + step * cw, 20, cw, E.h - 40);
    },
  }],
  ["speakers", "motion", "mauve", ["Lautsprecher", "Membranen pumpen Schallringe"], ["Altoparlanti", "Membrane che pompano anelli sonori"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [x, y] of [[E.w * .1, E.h * .5], [E.w * .9, E.h * .5]]) {
        const pump = Math.max(0, Math.sin(E.t / 120)) * 4;
        fill(c, P, P.fg, .15); rrect(c, x - 60, y - 120, 120, 240, 12); c.fill(); fill(c, P, P.muted, .35); dot(c, x, y + 40, 40 + pump); dot(c, x, y - 70, 18);
        for (let k = 0; k < 5; k++) { const p = mod(E.t / 900 + k / 5, 1); stroke(c, P, P.c.mauve, (1 - p) * .5, 2); ring(c, x, y + 40, 50 + p * 400); }
      }
    },
  }],
  ["baton", "motion", "blue", ["Taktstock", "Der Dirigent schlägt einen 4/4-Takt"], ["Bacchetta", "Il direttore batte un 4/4"], {
    init: () => ({ trail: [] }),
    draw(c, s, E) {
      const { P } = E, pts = [[0, -1], [0, 1], [-.8, .5], [.8, .4], [.2, -.3], [0, -1]], beat = E.t / 600, k = Math.floor(beat) % 4, u = beat % 1, e = u * u * (3 - 2 * u);
      const a = pts[k + 1], b = pts[k + 2], cx = E.w / 2, cy = E.h / 2, sc = Math.min(E.w, E.h) * .35;
      const x = cx + (a[0] + (b[0] - a[0]) * e) * sc, y = cy + (a[1] + (b[1] - a[1]) * e) * sc - Math.sin(u * Math.PI) * 30;
      s.trail.push([x, y]); if (s.trail.length > 60) s.trail.shift();
      for (let i = 1; i < s.trail.length; i++) { stroke(c, P, P.c.blue, i / s.trail.length * .6, 3); seg(c, s.trail[i - 1][0], s.trail[i - 1][1], s.trail[i][0], s.trail[i][1]); }
      fill(c, P, P.fg, .6); dot(c, x, y, 5); text(c, String(k + 1), cx, cy + sc + 30, 22, 600);
    },
  }],
  ["music-box-spin", "motion", "yellow", ["Spieluhrwalze", "Die Stiftwalze dreht sich und zupft den Kamm"], ["Cilindro del carillon", "Il cilindro gira e pizzica il pettine"], {
    init: () => { const r = rnd(715); return many(220, () => [r(), r()]); },
    draw(c, s, E) {
      const { P } = E, cy = E.h / 2, rr = Math.min(120, E.h * .25), rot = E.t / 3000;
      fill(c, P, P.c.yellow, .15); c.fillRect(40, cy - rr, E.w - 80, rr * 2);
      for (const [u, a] of s) { const ang = a * TAU + rot, z = Math.cos(ang); if (z < 0) continue; const x = 40 + u * (E.w - 80), y = cy + Math.sin(ang) * rr; fill(c, P, P.fg, .2 + z * .4); dot(c, x, y, 2 + z * 1.5); }
      for (let x = 44; x < E.w - 40; x += 10) { const pl = s.some(([u, a]) => Math.abs(40 + u * (E.w - 80) - x) < 5 && Math.abs(mod(a * TAU + rot, TAU) - Math.PI * 1.5) < .08); stroke(c, P, pl ? P.c.orange : P.muted, pl ? .9 : .45, 3); seg(c, x, cy - rr - 10, x, cy - rr - 60 + (x % 50) / 3 - (pl ? 6 : 0)); }
    },
  }],
  ["choir", "motion", "green", ["Kinderchor", "Münder singen, Noten steigen auf"], ["Coro di bambini", "Bocche che cantano, note che salgono"], {
    init: () => ({ notes: [] }),
    draw(c, s, E) {
      const { P } = E, n = Math.floor(E.w / 70);
      for (let i = 0; i < n; i++) for (const row of [0, 1]) {
        const x = 35 + i * 70 + row * 35, y = E.h - 60 - row * 70, open = (Math.sin(E.t / 300 + i * .7) + 1) / 2;
        fill(c, P, L(P, i + row), .25); dot(c, x, y, 24); fill(c, P, P.fg, .5); dot(c, x - 8, y - 6, 2.5); dot(c, x + 8, y - 6, 2.5); c.beginPath(); c.ellipse(x, y + 8, 6, 2 + open * 6, 0, 0, TAU); c.fill();
        if (open > .97 && R() < .2) s.notes.push({ x, y: y - 30, t0: E.t, kind: R() * 4 | 0, col: i });
      }
      s.notes = s.notes.filter(q => E.t - q.t0 < 4000);
      for (const q of s.notes) { const k = (E.t - q.t0) / 4000; note(c, P, q.x + Math.sin(k * 8) * 12, q.y - k * 260, q.kind, L(P, q.col), .55 * (1 - k)); }
    },
  }],
  ["fork-ring", "motion", "blue", ["Stimmgabel klingt", "Schallbögen breiten sich aus"], ["Diapason che suona", "Archi sonori che si allargano"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [x, y] of [[E.w * .15, E.h * .55], [E.w * .85, E.h * .45]]) {
        const v = Math.sin(E.t / 25) * 2;
        stroke(c, P, P.muted, .7, 6); c.beginPath(); c.moveTo(x - 12 - v, y - 120); c.lineTo(x - 12, y); c.arc(x, y, 12, Math.PI, 0, true); c.lineTo(x + 12 + v, y - 120); c.stroke(); seg(c, x, y + 12, x, y + 90);
        for (let k = 0; k < 6; k++) { const p = mod(E.t / 1400 + k / 6, 1); stroke(c, P, P.c.blue, (1 - p) * .5, 2); for (const side of [-1, 1]) { c.beginPath(); c.arc(x, y - 70, 30 + p * 300, side > 0 ? -.6 : Math.PI - .6, side > 0 ? .6 : Math.PI + .6); c.stroke(); } }
      }
    },
  }],
  ["dancing-notes", "motion", "red", ["Tanzende Noten", "Noten hüpfen über die Linien"], ["Note danzanti", "Note che saltellano sulle righe"], {
    draw(c, s, E) { const { P } = E; for (let y = 50, row = 0; y < E.h; y += 100, row++) { staff(c, P, y, E.w, .3); for (let x = 40, k = 0; x < E.w; x += 46, k++) { const pos = Math.round((Math.sin(E.t / 500 + k * .6 + row) + 1) * 4); note(c, P, x - mod(E.t * .03, 46), y + 40 - pos * 5, (k + row) % 4, L(P, pos), .55); } } },
  }],
  ["reels", "motion", "orange", ["Tonband", "Spulen drehen sich, das Band läuft"], ["Bobine", "Bobine che girano, il nastro scorre"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [x, y] of [[E.w * .2, E.h * .35], [E.w * .8, E.h * .65]]) {
        const k = mod(E.t / 40000, 1), r1 = 30 + 60 * (1 - k), r2 = 30 + 60 * k;
        for (const [cx, rr, d] of [[x - 120, r1, 1], [x + 120, r2, 1]]) { fill(c, P, P.fg, .2); dot(c, cx, y, rr); stroke(c, P, P.muted, .5, 3); ring(c, cx, y, 100); at(c, cx, y, E.t / 400 * d, 1, () => { for (let a = 0; a < 3; a++) { fill(c, P, P.bg, .8); c.beginPath(); c.arc(0, 0, 22, a * TAU / 3, a * TAU / 3 + .8); c.lineTo(0, 0); c.fill(); } }); }
        stroke(c, P, P.fg, .4, 2); seg(c, x - 120, y + r1, x + 120, y + r2);
      }
    },
  }],
  ["beat-dots", "motion", "yellow", ["Taktlichter", "Punkte pulsieren im Viervierteltakt"], ["Luci a tempo", "Punti che pulsano in quattro quarti"], {
    draw(c, s, E) { const { P } = E, beat = E.t / 500, k = Math.floor(beat) % 4, u = beat % 1; grid(E, 60, (x, y, i, j) => { const hit = mod(i + j, 4) === k, p = hit ? Math.exp(-u * 4) : 0; fill(c, P, L(P, mod(i + j, 4) + (k === 0 && hit ? 2 : 0)), .15 + p * .55); dot(c, x + 30, y + 30, 6 + p * 12); }); },
  }],
  ["radio-dial", "motion", "red", ["Radioskala", "Der Zeiger sucht Sender"], ["Scala della radio", "La lancetta cerca le stazioni"], {
    draw(c, s, E) {
      const { P } = E, y0 = E.h / 2;
      fill(c, P, P.c.yellow, .12); rrect(c, 30, y0 - 70, E.w - 60, 140, 16); c.fill();
      for (let f = 87; f <= 108; f += .5) { const x = 50 + (f - 87) / 21 * (E.w - 100), major = f % 2 === 0; stroke(c, P, P.fg, major ? .5 : .25, major ? 2 : 1); seg(c, x, y0 - 40, x, y0 - 40 + (major ? 24 : 12)); if (major) { fill(c, P, P.fg, .45); text(c, String(f), x, y0 + 4, 11, 500); } }
      fill(c, P, P.fg, .35); ["Milano", "Roma", "Berlin", "Zürich", "Wien", "Napoli"].forEach((n, k) => text(c, n, 50 + (k + .5) / 6 * (E.w - 100), y0 + 40, 12, 600));
      const x = 50 + (Math.sin(E.t / 3000) + 1) / 2 * (E.w - 100); stroke(c, P, P.c.red, .8, 3); seg(c, x, y0 - 60, x, y0 + 60);
    },
  }],
  ["audio-sea", "motion", "blue", ["Klangmeer", "Wellen einer Aufnahme rollen wie Wasser"], ["Mare di suono", "Onde di una registrazione che scorrono come acqua"], {
    draw(c, s, E) { const { P } = E; for (let k = 0; k < 12; k++) { const y0 = E.h * (.2 + k * .065); stroke(c, P, L(P, k), .3 + k * .03, 1.5); curve(c, x => y0 + (noise(x / 160 + k, E.t / 2000 + k) - .5) * 80 * (.5 + k / 12), 0, E.w, 6); c.stroke(); } },
  }],
  ["fifths-spin", "motion", "mauve", ["Quintenzirkel dreht", "Die Tonart wandert im Kreis"], ["Circolo delle quinte che gira", "La tonalità che percorre il cerchio"], {
    draw(c, s, E) {
      const { P } = E, cur = Math.floor(E.t / 1500) % 12, cx = E.w / 2, cy = E.h / 2, rr = Math.min(E.w, E.h) * .42;
      for (let k = 0; k < 12; k++) { const a0 = (k - .5) / 12 * TAU - Math.PI / 2, a1 = (k + .5) / 12 * TAU - Math.PI / 2, am = k / 12 * TAU - Math.PI / 2, near1 = Math.min(mod(k - cur, 12), mod(cur - k, 12)); fill(c, P, L(P, k), near1 === 0 ? .55 : near1 === 1 ? .3 : .1); c.beginPath(); c.arc(cx, cy, rr, a0, a1); c.arc(cx, cy, rr * .6, a1, a0, true); c.closePath(); c.fill(); fill(c, P, P.fg, .5); text(c, FIFTHS[k], cx + Math.cos(am) * rr * .8, cy + Math.sin(am) * rr * .8, 18, 600); }
    },
  }],
  ["glissando", "motion", "green", ["Glissando", "Tonleitern gleiten über die Notenlinien"], ["Glissando", "Scale che scivolano sul pentagramma"], {
    draw(c, s, E) {
      const { P } = E;
      for (let y = 50, row = 0; y < E.h; y += 110, row++) {
        staff(c, P, y, E.w, .3);
        const head = mod(E.t * .12 + row * 300, E.w + 400) - 200;
        for (let k = 0; k < 12; k++) { const x = head - k * 28, pos = mod(k + Math.floor(E.t / 1800), 9) * (row % 2 ? 1 : -1); note(c, P, x, y + 20 - pos * 5, 2 + (k % 2), L(P, row + k / 3), .55 * (1 - k / 12)); }
      }
    },
  }],
  // ----- touch -----
  ["piano-touch", "touch", "yellow", ["Klavier spielen", "Tasten unter dem Zeiger senken sich"], ["Suonare il piano", "I tasti sotto il puntatore si abbassano"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, -999, 40), kw = 40, y = E.h - 200;
      for (let x = 0, k = 0; x < E.w; x += kw, k++) { const hot = f > .1 && s.x >= x && s.x < x + kw; fill(c, P, hot ? L(P, k) : P.surface, hot ? .5 : .9); c.fillRect(x, y + (hot ? 4 : 0), kw - 1, 190); stroke(c, P, P.muted, .45); c.strokeRect(x, y, kw, 190); }
      for (let x = 0, k = 0; x < E.w; x += kw, k++) if ([0, 1, 3, 4, 5].includes(k % 7)) { fill(c, P, P.fg, .4); c.fillRect(x + kw * .65, y, kw * .7, 110); }
      if (f > .1) note(c, P, s.x, y - 30 - Math.abs(Math.sin(E.t / 200)) * 20, 2, P.c.mauve, .6);
      return f < .01 && !E.ptr.on;
    },
  }],
  ["harp-touch", "touch", "mauve", ["Harfe zupfen", "Saiten schwingen, wenn der Zeiger sie streift"], ["Pizzicare l'arpa", "Le corde vibrano quando il puntatore le sfiora"], {
    init: E => ({ strings: many(Math.floor(E.w / 28), i => ({ x: 14 + i * 28, amp: 0, t0: 0 })), lastX: null }),
    draw(c, s, E) {
      const { P } = E; let busy = false;
      if (E.ptr.on && !E.still) { if (s.lastX !== null) for (const st of s.strings) if ((st.x - s.lastX) * (st.x - E.ptr.x) <= 0 && s.lastX !== E.ptr.x) { st.amp = 16; st.t0 = E.t; st.y = E.ptr.y; } s.lastX = E.ptr.x; } else s.lastX = null;
      for (const st of s.strings) {
        const k = (E.t - st.t0) / 1500, a = st.amp * Math.max(0, 1 - k); if (a > .2) busy = true;
        stroke(c, P, a > .2 ? L(P, st.x / 28) : P.muted, .35 + a / 30, 1.5); c.beginPath();
        for (let y = 0; y <= E.h; y += 10) { const xx = st.x + Math.sin(y / E.h * Math.PI) * Math.sin((E.t - st.t0) / 25) * a; y ? c.lineTo(xx, y) : c.moveTo(xx, y); }
        c.stroke();
      }
      return !busy && !E.ptr.on;
    },
  }],
  ["theremin", "touch", "blue", ["Theremin", "Höhe und Lautstärke folgen dem Zeiger"], ["Theremin", "Altezza e volume seguono il puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E; follow(s, E, E.w * .5 + Math.sin(E.t / 3000) * E.w * .3, E.h * .5 + Math.cos(E.t / 2300) * E.h * .3, 120);
      const freq = 10 + (1 - s.y / E.h) * 60, amp = 20 + s.x / E.w * 120;
      stroke(c, P, P.c.blue, .6, 2); curve(c, x => E.h / 2 + Math.sin(x / E.w * freq + E.t / 150) * amp, 0, E.w, 3); c.stroke();
      stroke(c, P, P.muted, .6, 4); seg(c, E.w - 40, E.h, E.w - 40, E.h * .3); c.beginPath(); c.arc(40, E.h * .7, 40, -Math.PI / 2, Math.PI / 2); c.stroke();
      return false;
    },
  }],
  ["drum-tap", "touch", "red", ["Trommeln", "Tippen schlägt auf die Felle"], ["Tamburi", "Tocca per colpire le pelli"], {
    init: E => { const r = rnd(716); return { drums: many(dens(E, 50000, 6, 20), () => ({ x: 60 + r() * (E.w - 120), y: 60 + r() * (E.h - 120), rr: 36 + r() * 40, hit: -9999, col: r() * 6 | 0 })) }; },
    draw(c, s, E) {
      const { P } = E; let busy = false;
      for (const tap of E.ptr.taps.splice(0)) for (const d of s.drums) if (Math.hypot(tap.x - d.x, tap.y - d.y) < d.rr) d.hit = E.t;
      for (const d of s.drums) {
        const k = (E.t - d.hit) / 800, p = k < 1 ? 1 - k : 0; if (p) busy = true;
        fill(c, P, P.surface, .9); dot(c, d.x, d.y, d.rr * (1 - p * .04)); stroke(c, P, L(P, d.col), .5 + p * .4, 5); ring(c, d.x, d.y, d.rr);
        if (p) { stroke(c, P, L(P, d.col), p * .5, 2); ring(c, d.x, d.y, d.rr + (1 - p) * 60); }
      }
      return !busy;
    },
  }],
  ["xylophone", "touch", "green", ["Xylofon", "Klangstäbe hüpfen beim Antippen"], ["Xilofono", "Le barre saltano quando le tocchi"], {
    init: E => { const n = Math.max(8, Math.floor(E.w / 70)); return many(n, i => ({ i, hit: -9999 })); },
    draw(c, s, E) {
      const { P } = E, n = s.length, bw = (E.w - 40) / n; let busy = false;
      for (const tap of E.ptr.taps.splice(0)) { const i = Math.floor((tap.x - 20) / bw); if (s[i]) s[i].hit = E.t; }
      for (const b of s) { const h = E.h * (.7 - b.i / n * .4), k = (E.t - b.hit) / 500, j = k < 1 ? Math.sin(k * Math.PI) * 20 : 0; if (k < 1) busy = true; fill(c, P, L(P, b.i), .45); rrect(c, 20 + b.i * bw + 6, (E.h - h) / 2 - j, bw - 12, h, 8); c.fill(); fill(c, P, P.bg, .7); dot(c, 20 + b.i * bw + bw / 2, (E.h - h) / 2 + 16 - j, 4); dot(c, 20 + b.i * bw + bw / 2, (E.h + h) / 2 - 16 - j, 4); }
      return !busy;
    },
  }],
  ["note-trail", "touch", "mauve", ["Notenspur", "Hinter dem Zeiger flattern Noten"], ["Scia di note", "Note che svolazzano dietro il puntatore"], {
    init: () => ({ ns: [] }),
    draw(c, s, E) {
      const { P } = E;
      if (E.ptr.on && !E.still) { const l = s.ns[s.ns.length - 1]; if (!l || Math.hypot(l.x - E.ptr.x, l.y - E.ptr.y) > 30) s.ns.push({ x: E.ptr.x, y: E.ptr.y, t0: E.t, kind: R() * 4 | 0, col: R() * 6 | 0 }); }
      s.ns = s.ns.filter(n => E.t - n.t0 < 3000);
      for (const n of s.ns) { const k = (E.t - n.t0) / 3000; note(c, P, n.x + Math.sin(k * 6) * 10, n.y - k * 80, n.kind, L(P, n.col), .6 * (1 - k)); }
      return !s.ns.length && !E.ptr.on;
    },
  }],
  ["faders", "touch", "orange", ["Mischpult", "Regler fahren zum Zeiger"], ["Mixer", "I cursori si spostano verso il puntatore"], {
    init: E => many(Math.floor(E.w / 50), i => ({ x: 25 + i * 50, v: .5 })),
    draw(c, s, E) {
      const { P } = E; let busy = false;
      for (const f of s) {
        const goal = E.ptr.on && !E.still ? clamp(1 - (E.ptr.y - 40) / (E.h - 80) - Math.abs(f.x - E.ptr.x) / E.w, 0, 1) : .5 + Math.sin(f.x) * .1;
        f.v += (goal - f.v) * Math.min(1, E.dt / 150); if (Math.abs(goal - f.v) > .005) busy = true;
        stroke(c, P, P.muted, .5, 3); seg(c, f.x, 40, f.x, E.h - 40);
        const y = E.h - 40 - f.v * (E.h - 80); fill(c, P, L(P, f.x / 50), .6); rrect(c, f.x - 16, y - 8, 32, 16, 4); c.fill();
      }
      return !busy && !E.ptr.on;
    },
  }],
  ["string-pluck", "touch", "red", ["Saite ziehen", "Eine Saite biegt sich zum Zeiger und schwingt nach"], ["Tirare la corda", "Una corda si piega verso il puntatore e vibra"], {
    init: () => ({ amp: 0, t0: 0, was: false }),
    draw(c, s, E) {
      const { P } = E, on = E.ptr.on && !E.still, y0 = E.h / 2;
      for (let k = 0; k < 6; k++) { const y = y0 - 125 + k * 50; if (on && Math.abs(E.ptr.y - y) < 25) { stroke(c, P, L(P, k), .6, 2); path(c, [[0, y], [E.ptr.x, E.ptr.y], [E.w, y]]); c.stroke(); s.amp = E.ptr.y - y; s.k = k; s.t0 = E.t; } else { const a = s.k === k ? s.amp * Math.exp(-(E.t - s.t0) / 400) : 0; stroke(c, P, L(P, k), .45, 2); curve(c, x => y + Math.sin(x / E.w * Math.PI) * Math.cos((E.t - s.t0) / 30) * a, 0, E.w, 8); c.stroke(); } }
      return !on && Math.abs(s.amp * Math.exp(-(E.t - s.t0) / 400)) < .3;
    },
  }],
  ["visualizer", "touch", "blue", ["Klangbild", "Ein runder Visualizer reagiert auf das Tempo des Zeigers"], ["Visualizzatore", "Un visualizzatore circolare che reagisce alla velocità del puntatore"], {
    init: () => ({ energy: 0, lx: 0, ly: 0 }),
    draw(c, s, E) {
      const { P } = E, sp = Math.hypot(E.ptr.x - s.lx, E.ptr.y - s.ly); s.lx = E.ptr.x; s.ly = E.ptr.y;
      s.energy = s.energy * .94 + (E.ptr.on && !E.still ? Math.min(sp, 60) : 0) * .05;
      const cx = E.w / 2, cy = E.h / 2, rr = Math.min(E.w, E.h) * .25;
      for (let k = 0; k < 96; k++) { const a = k / 96 * TAU, h = 10 + noise(k / 8, E.t / 300) * (20 + s.energy * 8); stroke(c, P, L(P, k / 16), .5, 4); seg(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cx + Math.cos(a) * (rr + h), cy + Math.sin(a) * (rr + h)); }
      return false;
    },
  }],
  ["chimes", "touch", "yellow", ["Klangspiel", "Tippen lässt Glöckchen läuten"], ["Campanelli", "Tocca per far suonare i campanelli"], {
    init: E => many(Math.floor(E.w / 80), i => ({ x: 40 + i * 80, len: 120 + (i * 37 % 140), a: 0, v: 0 })),
    draw(c, s, E) {
      const { P } = E; let busy = false;
      for (const tap of E.ptr.taps.splice(0)) for (const b of s) if (Math.abs(tap.x - b.x) < 80) b.v += (tap.x < b.x ? .004 : -.004);
      if (E.ptr.on && !E.still) for (const b of s) { const bx = b.x + Math.sin(b.a) * b.len; if (Math.abs(E.ptr.x - bx) < 20 && Math.abs(E.ptr.y - b.len) < 40) b.v += .0006; }
      for (const b of s) {
        b.v += -Math.sin(b.a) * .00008 * E.dt; b.v *= .995; b.a += b.v * E.dt; if (Math.abs(b.v) > .00005 || Math.abs(b.a) > .002) busy = true;
        const x = b.x + Math.sin(b.a) * b.len, y = Math.cos(b.a) * b.len;
        stroke(c, P, P.muted, .45); seg(c, b.x, 0, x, y); fill(c, P, L(P, b.x / 80), .55);
        at(c, x, y, -b.a, 1, () => { c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(-8, 14, -18, 26); c.lineTo(18, 26); c.quadraticCurveTo(8, 14, 6, 0); c.closePath(); c.fill(); });
        if (Math.abs(b.v) > .001) { stroke(c, P, P.c.yellow, Math.min(.5, Math.abs(b.v) * 200), 1.5); ring(c, x, y + 14, 30 + Math.abs(b.v) * 4000); }
      }
      return !busy;
    },
  }],
]);
