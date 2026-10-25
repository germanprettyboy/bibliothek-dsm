/* Extra backgrounds 1/10: paper, writing things, school days */
import { clear, TAU, clamp, mod, rnd, R, many, dens, wrap, noise, A, L, fill, stroke, dot, ring, seg, path, ngon, rrect, curve, param, text, at, swarm, step, near, grid, follow, def } from "./kit.js";

const SUBJECTS = ["De", "It", "Ma", "En", "Bio", "Ch", "Ph", "Ge", "Ek", "Ku", "Mu", "Sp", "La", "Rel"];
const DAYS = { de: ["Mo", "Di", "Mi", "Do", "Fr"] };
let ROME = null;
const romeTime = () => {
  ROME = ROME || new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" });
  const p = ROME.formatToParts(new Date());
  const v = t => +(p.find(x => x.type === t) || { value: 0 }).value;
  return [v("hour"), v("minute"), v("second") + (Date.now() % 1000) / 1000];
};

// A pencil lying at (x, y), angle a, length len, color col
function pencil(c, P, x, y, a, len, col) {
  at(c, x, y, a, 1, () => {
    fill(c, P, col, .55); c.fillRect(0, -6, len, 12);
    fill(c, P, P.bg, .35); c.fillRect(0, -2, len, 1);
    fill(c, P, P.muted, .6); c.fillRect(len, -6, 12, 12);
    fill(c, P, P.c.mauve, .6); c.fillRect(len + 12, -6, 10, 12);
    fill(c, P, P.surface, .9); path(c, [[0, -6], [-22, 0], [0, 6]], true); c.fill();
    fill(c, P, P.fg, .5); path(c, [[-15, -2], [-22, 0], [-15, 2]], true); c.fill();
  });
}

// Simple wall clock
function clock(c, P, x, y, r, [h, m, sec]) {
  stroke(c, P, P.muted, .5, 2); ring(c, x, y, r);
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * TAU, l = i % 5 ? 4 : 10;
    stroke(c, P, P.muted, i % 5 ? .3 : .6, i % 5 ? 1 : 2);
    seg(c, x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4), x + Math.cos(a) * (r - 4 - l), y + Math.sin(a) * (r - 4 - l));
  }
  const hand = (k, len, lw, col, a) => { stroke(c, P, col, a, lw); const an = k * TAU - Math.PI / 2; seg(c, x, y, x + Math.cos(an) * len, y + Math.sin(an) * len); };
  hand(((h % 12) + m / 60) / 12, r * .5, 4, P.fg, .45);
  hand((m + sec / 60) / 60, r * .75, 3, P.fg, .4);
  hand(Math.floor(sec) / 60, r * .82, 1.5, P.c.red, .7);
  fill(c, P, P.c.red, .7); dot(c, x, y, 3);
}

function stamp(c, P, x, y, r, rot, col, a, word) {
  at(c, x, y, rot, 1, () => {
    stroke(c, P, col, a, 2.5); ring(c, 0, 0, r); stroke(c, P, col, a, 1.2); ring(c, 0, 0, r - 6);
    fill(c, P, col, a); text(c, word, 0, 0, r * .42, 600);
    for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; dot(c, Math.cos(an) * (r - 3), Math.sin(an) * (r - 3), .1); }
  });
}

export default def("paper", [
  ["dotted", "still", "blue", ["Punktraster", "Gepunktetes Papier wie im Bullet Journal"], ["Puntinato", "Carta a puntini come nel bullet journal"], {
    draw(c, s, { P, ...E }) { fill(c, P, P.muted, .55); grid(E, 22, (x, y) => c.fillRect(x, y, 2, 2), 11, 11); },
  }],
  ["isometric", "still", "blue", ["Isometrisch", "Dreiecksraster für räumliches Zeichnen"], ["Isometrico", "Griglia a triangoli per il disegno in prospettiva"], {
    draw(c, s, { w, h, P }) {
      const d = 28, hh = d * Math.sin(Math.PI / 3), k = h / Math.tan(Math.PI / 3);
      stroke(c, P, P.c.blue, .35);
      for (let y = 0; y < h; y += hh) seg(c, 0, y, w, y);
      for (let x = -k; x < w + k; x += d) { seg(c, x, 0, x + k, h); seg(c, x, 0, x - k, h); }
    },
  }],
  ["lineatur", "still", "yellow", ["Lineatur 1", "Grundschullinien mit gelbem Mittelband"], ["Righe di prima", "Righe della scuola primaria con fascia gialla"], {
    draw(c, s, { w, h, P }) {
      for (let y = 30; y < h; y += 64) {
        fill(c, P, P.c.yellow, .16); c.fillRect(0, y + 12, w, 12);
        stroke(c, P, P.c.blue, .5); for (const d of [0, 12, 24, 36]) seg(c, 0, y + d, w, y + d);
      }
      stroke(c, P, P.c.red, .5); seg(c, 40, 0, 40, h);
    },
  }],
  ["millimeter", "still", "orange", ["Millimeterpapier", "Fein, jeder fünfte und zehnte Strich kräftiger"], ["Carta millimetrata", "Fine, ogni quinta e decima riga più marcata"], {
    draw(c, s, { w, h, P }) {
      for (let i = 0; i * 4 < Math.max(w, h); i++) {
        stroke(c, P, P.c.orange, i % 10 ? i % 5 ? .1 : .22 : .45);
        if (i * 4 < w) seg(c, i * 4 + .5, 0, i * 4 + .5, h);
        if (i * 4 < h) seg(c, 0, i * 4 + .5, w, i * 4 + .5);
      }
    },
  }],
  ["hexpaper", "still", "green", ["Wabenpapier", "Sechsecke für Chemie und Spiele"], ["Carta esagonale", "Esagoni per chimica e giochi"], {
    draw(c, s, { w, h, P }) {
      const r = 18, dx = r * Math.sqrt(3), dy = r * 1.5;
      stroke(c, P, P.c.green, .5);
      for (let j = 0, y = 0; y < h + r; j++, y += dy) for (let x = (j % 2) * dx / 2; x < w + dx; x += dx) { ngon(c, x, y, r, 6, Math.PI / 6); c.stroke(); }
    },
  }],
  ["polar", "still", "mauve", ["Polarkoordinaten", "Kreise und Strahlen um einen Pol"], ["Coordinate polari", "Cerchi e raggi attorno a un polo"], {
    draw(c, s, { w, h, P }) {
      const x = w * .82, y = h * .6, m = Math.hypot(w, h);
      for (let r = 30, i = 1; r < m; r += 30, i++) { stroke(c, P, P.c.mauve, i % 5 ? .22 : .5); ring(c, x, y, r); }
      for (let a = 0; a < 360; a += 15) { stroke(c, P, P.c.mauve, a % 90 ? .2 : .5); seg(c, x, y, x + Math.cos(a / 180 * Math.PI) * m, y + Math.sin(a / 180 * Math.PI) * m); }
    },
  }],
  ["logpaper", "still", "blue", ["Logarithmenpapier", "Dekaden, die sich nach rechts verdichten"], ["Carta logaritmica", "Decadi che si infittiscono verso destra"], {
    draw(c, s, { w, h, P }) {
      const D = w / 3, H = h / 2;
      for (let d = 0; d < 3; d++) for (let k = 1; k < 10; k++) { stroke(c, P, P.c.blue, k === 1 ? .55 : .22); const x = d * D + Math.log10(k) * D; seg(c, x, 0, x, h); }
      for (let d = 0; d < 2; d++) for (let k = 1; k < 10; k++) { stroke(c, P, P.c.blue, k === 1 ? .55 : .22); const y = h - (d * H + Math.log10(k) * H); seg(c, 0, y, w, y); }
    },
  }],
  ["index-cards", "still", "red", ["Karteikarten", "Lose Lernkärtchen mit roter Kopfzeile"], ["Schede", "Schede di studio sparse con riga rossa"], {
    draw(c, s, E) {
      const r = rnd(21), { P } = E;
      for (let i = 0; i < dens(E, 30000, 14, 50); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * .6, 1, () => {
        fill(c, P, P.surface, .95); c.fillRect(-75, -48, 150, 96); stroke(c, P, P.line, .9); c.strokeRect(-75, -48, 150, 96);
        stroke(c, P, P.c.red, .6); seg(c, -75, -30, 75, -30);
        stroke(c, P, P.c.blue, .35); for (let y = -16; y < 48; y += 12) seg(c, -75, y, 75, y);
      });
    },
  }],
  ["sticky-notes", "still", "yellow", ["Klebezettel", "Bunte Notizzettel mit Gekritzel"], ["Post-it", "Foglietti colorati con scarabocchi"], {
    draw(c, s, E) {
      const r = rnd(22), { P } = E;
      for (let i = 0; i < dens(E, 26000, 16, 60); i++) {
        const col = L(P, r() * 6);
        at(c, r() * E.w, r() * E.h, (r() - .5) * .5, 1, () => {
          fill(c, P, col, .35); c.fillRect(-45, -45, 90, 90);
          fill(c, P, col, .25); c.fillRect(-45, -45, 90, 14);
          stroke(c, P, P.fg, .25, 1.4);
          for (let l = 0; l < 3 + r() * 3; l++) { const ph = r() * 9, len = 40 + r() * 30; curve(c, x => -20 + l * 12 + Math.sin(x / 4 + ph) * 2.5, -35, -35 + len, 3); c.stroke(); }
        });
      }
    },
  }],
  ["envelopes", "still", "orange", ["Briefumschläge", "Post mit Briefmarke und Adresszeilen"], ["Buste", "Lettere con francobollo e indirizzo"], {
    draw(c, s, E) {
      const r = rnd(23), { P } = E;
      for (let i = 0; i < dens(E, 40000, 10, 36); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * .4, 1, () => {
        fill(c, P, P.surface, .95); c.fillRect(-80, -50, 160, 100); stroke(c, P, P.line, 1); c.strokeRect(-80, -50, 160, 100);
        path(c, [[-80, -50], [0, 8], [80, -50]]); c.stroke();
        fill(c, P, L(P, r() * 6), .6); c.fillRect(48, -44, 24, 28);
        stroke(c, P, P.muted, .4); for (const y of [14, 24, 34]) seg(c, -20, y, 40, y);
      });
    },
  }],
  ["stamps", "still", "red", ["Briefmarken", "Gezähnte Marken mit kleinen Motiven"], ["Francobolli", "Francobolli dentellati con piccoli motivi"], {
    draw(c, s, E) {
      const r = rnd(24), { P } = E;
      for (let i = 0; i < dens(E, 22000, 18, 70); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * .5, 1, () => {
        const col = L(P, r() * 6);
        fill(c, P, P.surface, 1); c.fillRect(-26, -32, 52, 64);
        fill(c, P, P.bg, 1); for (let k = -24; k <= 24; k += 6) { dot(c, k, -32, 2.2); dot(c, k, 32, 2.2); } for (let k = -30; k <= 30; k += 6) { dot(c, -26, k, 2.2); dot(c, 26, k, 2.2); }
        fill(c, P, col, .45); c.fillRect(-20, -26, 40, 44);
        fill(c, P, P.surface, .8);
        const m = r() * 3 | 0;
        if (m === 0) dot(c, 0, -4, 10); else if (m === 1) { ngon(c, 0, -4, 12, 3, -Math.PI / 2); c.fill(); } else { c.fillRect(-8, -14, 16, 20); }
        fill(c, P, P.fg, .35); text(c, String(10 + (r() * 90 | 0)), 0, 25, 9, 600);
      });
    },
  }],
  ["paperclips", "still", "blue", ["Büroklammern", "Verstreute Klammern aus Draht"], ["Graffette", "Graffette sparse"], {
    draw(c, s, E) {
      const r = rnd(25), { P } = E;
      for (let i = 0; i < dens(E, 14000, 24, 90); i++) at(c, r() * E.w, r() * E.h, r() * TAU, 1, () => {
        stroke(c, P, r() < .3 ? L(P, r() * 6) : P.muted, .55, 2);
        c.beginPath(); c.moveTo(6, 10); c.lineTo(6, -12); c.arc(0, -12, 6, 0, Math.PI, true); c.lineTo(-6, 16); c.arc(1, 16, 7, Math.PI, 0, true); c.lineTo(8, -16); c.arc(1, -16, 7, 0, Math.PI, true); c.lineTo(-6, 6); c.stroke();
      });
    },
  }],
  ["pencils", "still", "yellow", ["Bleistifte", "Gespitzte Stifte in den Logofarben"], ["Matite", "Matite temperate nei colori del logo"], {
    draw(c, s, E) {
      const r = rnd(26);
      for (let i = 0; i < dens(E, 30000, 12, 46); i++) pencil(c, E.P, r() * E.w, r() * E.h, r() * TAU, 110 + r() * 80, L(E.P, i));
    },
  }],
  ["crayons", "still", "red", ["Wachsmalstifte", "Dicke Stifte mit Papierbanderole"], ["Pastelli a cera", "Pastelli grossi con fascetta di carta"], {
    draw(c, s, E) {
      const r = rnd(27), { P } = E;
      for (let i = 0; i < dens(E, 24000, 14, 50); i++) {
        const col = L(P, i);
        at(c, r() * E.w, r() * E.h, r() * TAU, 1, () => {
          fill(c, P, col, .6); rrect(c, 0, -9, 90, 18, 4); c.fill();
          fill(c, P, P.surface, .7); c.fillRect(14, -9, 56, 18);
          fill(c, P, col, .5); for (const x of [20, 62]) c.fillRect(x, -9, 3, 18);
          fill(c, P, col, .65); path(c, [[0, -9], [-18, -3], [-18, 3], [0, 9]], true); c.fill();
        });
      }
    },
  }],
  ["eraser-crumbs", "still", "red", ["Radiergummi", "Krümel und zweifarbige Radierer"], ["Gomma", "Briciole e gomme bicolori"], {
    draw(c, s, E) {
      const r = rnd(28), { P } = E;
      fill(c, P, P.muted, .35);
      for (let i = 0; i < dens(E, 900, 200, 1600); i++) { const x = r() * E.w, y = r() * E.h; ngon(c, x, y, 1 + r() * 2.5, 5, r() * TAU); c.fill(); }
      for (let i = 0; i < dens(E, 90000, 4, 14); i++) at(c, r() * E.w, r() * E.h, r() * TAU, 1, () => {
        fill(c, P, P.c.red, .5); rrect(c, -40, -12, 44, 24, 5); c.fill();
        fill(c, P, P.c.blue, .6); rrect(c, 0, -12, 40, 24, 5); c.fill();
      });
    },
  }],
  ["rulers", "still", "green", ["Lineale", "Maßstäbe mit Millimeterstrichen"], ["Righelli", "Righelli con tacche millimetriche"], {
    draw(c, s, E) {
      const r = rnd(29), { P } = E;
      for (let i = 0; i < dens(E, 70000, 6, 20); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * 1.4, 1, () => {
        const len = 300;
        fill(c, P, P.surface, .9); c.fillRect(0, 0, len, 34); stroke(c, P, P.line, 1); c.strokeRect(0, 0, len, 34);
        for (let k = 0; k <= len - 10; k += 5) { stroke(c, P, P.fg, .4); seg(c, 5 + k, 0, 5 + k, k % 50 ? k % 25 ? 6 : 10 : 14); if (!(k % 50)) { fill(c, P, P.fg, .4); text(c, String(k / 10), 5 + k, 22, 9, 500); } }
      });
    },
  }],
  ["protractors", "still", "mauve", ["Geodreiecke", "Halbkreise mit Gradskala"], ["Goniometri", "Semicerchi con scala dei gradi"], {
    draw(c, s, E) {
      const r = rnd(30), { P } = E;
      for (let i = 0; i < dens(E, 90000, 4, 14); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * 1.2, 1, () => {
        const R0 = 90;
        stroke(c, P, P.c.mauve, .55, 1.5); c.beginPath(); c.arc(0, 0, R0, Math.PI, TAU); c.closePath(); c.stroke();
        for (let d = 0; d <= 180; d += 5) { const a = Math.PI + d / 180 * Math.PI, l = d % 10 ? 5 : 10; stroke(c, P, P.c.mauve, .45); seg(c, Math.cos(a) * R0, Math.sin(a) * R0, Math.cos(a) * (R0 - l), Math.sin(a) * (R0 - l)); }
        fill(c, P, P.c.mauve, .5); for (let d = 0; d <= 180; d += 30) { const a = Math.PI + d / 180 * Math.PI; text(c, String(d), Math.cos(a) * (R0 - 20), Math.sin(a) * (R0 - 20), 8, 500); }
        ring(c, 0, 0, 4);
      });
    },
  }],
  ["construction", "still", "blue", ["Konstruktion", "Zirkelbögen und Hilfslinien"], ["Costruzione", "Archi di compasso e linee guida"], {
    draw(c, s, E) {
      const r = rnd(31), { P } = E;
      for (let i = 0; i < dens(E, 40000, 8, 30); i++) {
        const x = r() * E.w, y = r() * E.h, x2 = x + (r() - .5) * 200, y2 = y + (r() - .5) * 200, d = Math.hypot(x2 - x, y2 - y);
        stroke(c, P, P.muted, .35); seg(c, x, y, x2, y2);
        stroke(c, P, L(P, i), .45);
        c.beginPath(); c.arc(x, y, d * .75, -1, 1.2); c.stroke(); c.beginPath(); c.arc(x2, y2, d * .75, 2, 4.2); c.stroke();
        fill(c, P, P.fg, .4); dot(c, x, y, 2.5); dot(c, x2, y2, 2.5);
      }
    },
  }],
  ["stencil", "still", "orange", ["Schablone", "Schablonenbuchstaben mit Stegen"], ["Stencil", "Lettere a stencil con ponticelli"], {
    draw(c, s, E) {
      const r = rnd(32), { P } = E, ab = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      for (let i = 0; i < dens(E, 20000, 20, 70); i++) {
        const x = r() * E.w, y = r() * E.h, px = 40 + r() * 50;
        fill(c, P, L(P, i), .3); text(c, ab[r() * 26 | 0], x, y, px, 600);
        fill(c, P, P.bg, 1); c.fillRect(x - px, y - px * .06, px * 2, px * .12);
      }
    },
  }],
  ["blotting", "still", "blue", ["Löschpapier", "Gespiegelte Tintenspuren"], ["Carta assorbente", "Tracce d'inchiostro speculari"], {
    draw(c, s, E) {
      const r = rnd(33), { P } = E;
      fill(c, P, P.c.mauve, .08); c.fillRect(0, 0, E.w, E.h);
      for (let i = 0; i < dens(E, 9000, 40, 160); i++) {
        const x = r() * E.w, y = r() * E.h, len = 30 + r() * 90, ph = r() * 9;
        stroke(c, P, P.c.blue, .12 + r() * .15, 1.5);
        curve(c, k => y + Math.sin((k - x) / 5 + ph) * 4 + Math.sin((k - x) / 13) * 3, x, x + len, 2); c.stroke();
      }
      for (let i = 0; i < 12; i++) { fill(c, P, P.c.blue, .08); dot(c, r() * E.w, r() * E.h, 6 + r() * 20); }
    },
  }],
  ["calligraphy", "still", "mauve", ["Schönschrift", "Schräge Hilfslinien für Kalligrafie"], ["Calligrafia", "Linee inclinate per la bella scrittura"], {
    draw(c, s, { w, h, P }) {
      const k = Math.tan(35 / 180 * Math.PI) * h;
      stroke(c, P, P.c.mauve, .22); for (let x = -k; x < w; x += 24) seg(c, x, h, x + k, 0);
      for (let y = 40; y < h; y += 80) { stroke(c, P, P.c.mauve, .5); seg(c, 0, y, w, y); seg(c, 0, y + 40, w, y + 40); stroke(c, P, P.c.mauve, .25); seg(c, 0, y + 20, w, y + 20); }
    },
  }],
  ["typewriter", "still", "blue", ["Schreibmaschine", "Getippte Zeilen, manches durchgestrichen"], ["Macchina da scrivere", "Righe battute a macchina, qualcosa cancellato"], {
    draw(c, s, E) {
      const r = rnd(34), { P } = E, ab = "abcdefghijklmnopqrstuvwxyzäöü";
      c.font = "400 15px ui-monospace, Menlo, Consolas, monospace"; c.textBaseline = "middle"; c.textAlign = "left";
      for (let y = 30; y < E.h; y += 26) {
        let line = "";
        while (line.length < E.w / 9) { const n = 2 + r() * 8 | 0; line += (r() < .06 ? "x".repeat(n) : many(n, () => ab[r() * ab.length | 0]).join("")) + " "; }
        fill(c, P, P.fg, .1 + r() * .06); c.fillText(line, 12, y);
      }
    },
  }],
  ["folded-map", "still", "green", ["Faltkarte", "Gefaltete Landkarte mit Wegen"], ["Mappa piegata", "Mappa ripiegata con strade"], {
    draw(c, s, E) {
      const r = rnd(35), { w, h, P } = E, cw = w / 5, ch = h / 3;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
        const g = c.createLinearGradient(i * cw, 0, (i + 1) * cw, 0);
        g.addColorStop(0, (i + j) % 2 ? P.fg : P.bg); g.addColorStop(1, clear((i + j) % 2 ? P.fg : P.bg));
        A(c, .06, P); c.fillStyle = g; c.fillRect(i * cw, j * ch, cw, ch);
      }
      for (let k = 0; k < 9; k++) {
        stroke(c, P, k < 3 ? P.c.blue : k < 6 ? P.c.orange : P.muted, .4, k < 3 ? 3 : 1.5);
        const y0 = r() * h, ph = r() * 9, a = 40 + r() * 80;
        curve(c, x => y0 + Math.sin(x / 260 + ph) * a + Math.sin(x / 90) * 10, 0, w, 10); c.stroke();
      }
      fill(c, P, P.c.green, .12); for (let k = 0; k < 6; k++) dot(c, r() * w, r() * h, 30 + r() * 60);
    },
  }],
  ["crumpled", "still", "mauve", ["Zerknittert", "Geglättetes Knitterpapier"], ["Accartocciato", "Carta stropicciata e lisciata"], {
    draw(c, s, E) {
      const r = rnd(36), { P } = E, n = 60, cols = Math.ceil(E.w / n) + 2, rows = Math.ceil(E.h / n) + 2;
      const pt = many(cols * rows, k => [(k % cols - .5) * n + (r() - .5) * n * .8, ((k / cols | 0) - .5) * n + (r() - .5) * n * .8]);
      const tri = (a, b, d) => { const v = r(); fill(c, P, v < .5 ? P.fg : P.bg, Math.abs(v - .5) * .14); path(c, [a, b, d], true); c.fill(); };
      for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) { const p = k => pt[k]; const a = j * cols + i; tri(p(a), p(a + 1), p(a + cols)); tri(p(a + 1), p(a + cols + 1), p(a + cols)); }
    },
  }],
  ["torn-strips", "still", "orange", ["Papierstreifen", "Gerissene Streifen übereinander"], ["Strisce strappate", "Strisce di carta strappate sovrapposte"], {
    draw(c, s, E) {
      const r = rnd(37), { P } = E;
      for (let y = -20, i = 0; y < E.h; y += 50 + r() * 40, i++) {
        const top = [], bot = [], hh = 30 + r() * 30;
        for (let x = 0; x <= E.w + 8; x += 8) { top.push([x, y + (r() - .5) * 6]); bot.unshift([x, y + hh + (r() - .5) * 8]); }
        fill(c, P, i % 3 ? P.surface : L(P, i), i % 3 ? .9 : .25); path(c, top.concat(bot), true); c.fill();
        stroke(c, P, P.line, .8); c.stroke();
      }
    },
  }],
  ["timetable", "still", "blue", ["Stundenplan", "Bunte Fächerblöcke Mo bis Fr"], ["Orario", "Blocchi colorati delle materie da lunedì a venerdì"], {
    draw(c, s, E) {
      const r = rnd(38), { P } = E, cw = 64, ch = 40;
      for (let oy = 10; oy < E.h; oy += ch * 9 + 30) for (let ox = 10; ox < E.w; ox += cw * 5 + 30) {
        fill(c, P, P.muted, .5); DAYS.de.forEach((d, i) => text(c, d, ox + i * cw + cw / 2, oy + 12, 12, 600));
        for (let i = 0; i < 5; i++) for (let j = 0; j < 8; j++) {
          const sub = r() * SUBJECTS.length | 0, x = ox + i * cw + 2, y = oy + 26 + j * ch;
          fill(c, P, L(P, sub), .3); rrect(c, x, y, cw - 4, ch - 4, 6); c.fill();
          fill(c, P, P.fg, .35); text(c, SUBJECTS[sub], x + (cw - 4) / 2, y + (ch - 4) / 2, 12, 500);
        }
      }
    },
  }],
  ["planner", "still", "green", ["Hausaufgabenheft", "Wochentage mit Kästchen zum Abhaken"], ["Diario scolastico", "Giorni della settimana con caselle da spuntare"], {
    draw(c, s, E) {
      const r = rnd(39), { P } = E, cw = 170;
      for (let x = 10, d = 0; x < E.w; x += cw, d++) {
        stroke(c, P, P.line, 1); seg(c, x - 8, 0, x - 8, E.h);
        fill(c, P, P.c.green, .6); text(c, DAYS.de[d % 5], x + 6, 24, 16, 600, "left");
        for (let y = 56; y < E.h; y += 30) {
          stroke(c, P, P.muted, .45, 1.2); c.strokeRect(x + 6, y - 7, 14, 14);
          if (r() < .45) { stroke(c, P, P.c.green, .7, 2); path(c, [[x + 8, y], [x + 12, y + 4], [x + 19, y - 6]]); c.stroke(); }
          stroke(c, P, P.fg, .15, 1.3); seg(c, x + 28, y, x + 28 + 40 + r() * 90, y);
        }
      }
    },
  }],
  ["chalkboard", "still", "green", ["Tafelbild", "Formeln und Skizzen in Kreide"], ["Lavagna", "Formule e schizzi col gesso"], {
    draw(c, s, E) {
      const r = rnd(40), { P } = E, F = ["a² + b² = c²", "E = mc²", "π ≈ 3,14", "x + y = 12", "√2", "∑ n", "H₂O", "f(x) = 2x + 1", "1/2 + 1/4", "Δ", "sin α", "∞"];
      for (let i = 0; i < dens(E, 24000, 16, 60); i++) {
        const x = r() * E.w, y = r() * E.h, k = r() * 4 | 0;
        fill(c, P, P.muted, .4); stroke(c, P, P.muted, .4, 2);
        if (k < 2) text(c, F[r() * F.length | 0], x, y, 18 + r() * 14, 500);
        else if (k === 2) { ngon(c, x, y, 20 + r() * 30, 3, r()); c.stroke(); }
        else { seg(c, x, y, x + 60, y - 20); path(c, [[x + 50, y - 26], [x + 60, y - 20], [x + 52, y - 10]]); c.stroke(); }
      }
    },
  }],
  ["spiral-binding", "still", "mauve", ["Spiralblock", "Spiralbindung an beiden Rändern"], ["Quaderno a spirale", "Rilegatura a spirale sui due bordi"], {
    draw(c, s, { w, h, P }) {
      for (const x of [14, w - 14]) for (let y = 10; y < h; y += 22) {
        fill(c, P, P.line, 1); dot(c, x + (x < w / 2 ? 14 : -14), y + 6, 4);
        stroke(c, P, P.muted, .6, 2); c.beginPath(); c.ellipse(x, y + 6, 12, 5, 0, Math.PI * .1, Math.PI * 1.1); c.stroke();
      }
      stroke(c, P, P.c.blue, .3); for (let y = 40; y < h; y += 32) seg(c, 0, y, w, y);
    },
  }],
  ["punched", "still", "blue", ["Gelocht", "Blätter mit Lochverstärkern"], ["Fogli forati", "Fogli con rinforzi per i fori"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 180, (x, y, i, j) => {
        const ox = x + (j % 2) * 30;
        stroke(c, P, P.line, 1); c.strokeRect(ox, y, 150, 160);
        for (const hy of [y + 50, y + 110]) { fill(c, P, P.bg, 1); dot(c, ox + 14, hy, 5); stroke(c, P, L(P, i + j), .5, 3); ring(c, ox + 14, hy, 8); }
      });
    },
  }],
  // ----- motion -----
  ["paper-planes", "motion", "blue", ["Papierflieger", "Gleitende Flieger mit gestrichelter Spur"], ["Aeroplanini", "Aeroplani di carta con scia tratteggiata"], {
    init: E => swarm(E, dens(E, 120000, 4, 10), () => ({ a: -.25 + R() * .5, v: .05 + R() * .05 })),
    draw(c, s, E) {
      const { P } = E;
      for (const p of s) {
        p.x = wrap(p.x + Math.cos(p.a) * p.v * E.dt, E.w, 120); p.y = wrap(p.y + Math.sin(p.a) * p.v * E.dt + Math.sin(E.t / 900 + p.ph) * .3, E.h, 120);
        stroke(c, P, P.muted, .35, 1.5); c.setLineDash([6, 8]); seg(c, p.x, p.y, p.x - Math.cos(p.a) * 140, p.y - Math.sin(p.a) * 140); c.setLineDash([]);
        at(c, p.x, p.y, p.a, 1, () => {
          fill(c, P, P.surface, .95); path(c, [[24, 0], [-16, -14], [-8, 0], [-16, 12]], true); c.fill();
          stroke(c, P, P.muted, .7); c.stroke(); seg(c, 24, 0, -8, 0);
        });
      }
    },
  }],
  ["punch-confetti", "motion", "yellow", ["Locherkonfetti", "Runde Schnipsel rieseln herab"], ["Coriandoli", "Cerchietti di carta che cadono"], {
    init: E => swarm(E, dens(E, 9000, 50, 160), () => ({ v: .02 + R() * .04, col: R() * 6 | 0 })),
    draw(c, s, E) {
      for (const p of s) {
        p.y = wrap(p.y + p.v * E.dt, E.h, 10); const x = p.x + Math.sin(E.t / 700 + p.ph) * 8;
        fill(c, E.P, L(E.P, p.col), .5); c.beginPath(); c.ellipse(x, p.y, 3.5, 3.5 * Math.abs(Math.cos(E.t / 400 + p.ph)) + .3, 0, 0, TAU); c.fill();
      }
    },
  }],
  ["handwriting", "motion", "blue", ["Schreibschrift", "Ein Stift schreibt Zeile für Zeile Schlaufen"], ["Corsivo", "Una penna scrive riga per riga dei riccioli"], {
    init: () => ({ k: 0 }),
    draw(c, s, E) {
      const { P } = E, lanes = Math.max(1, Math.floor((E.h - 40) / 70)), len = E.w + 40, total = lanes * len;
      s.k = (s.k + E.dt * .12) % (total + 1500);
      const pos = x => [x * 1 - 20 + 9 * Math.cos(x / 7), Math.sin(x / 7) * 9 + Math.sin(x / 41) * 4];
      let tip = null;
      for (let l = 0; l < lanes; l++) {
        const done = clamp(s.k - l * len, 0, len); if (!done) break;
        const y0 = 50 + l * 70;
        stroke(c, P, P.c.blue, .4, 1.6);
        param(c, k => { const [x, y] = pos(k * done); return [x, y0 + y]; }, Math.ceil(done / 3)); c.stroke();
        if (done < len) { const [x, y] = pos(done); tip = [x, y0 + y]; }
        stroke(c, P, P.line, .8); seg(c, 0, y0 + 12, E.w, y0 + 12);
      }
      if (tip) pencil(c, P, tip[0] + 4, tip[1] - 4, -2.2, 120, P.c.yellow);
    },
  }],
  ["scribble", "motion", "mauve", ["Gekritzel", "Eine Linie kritzelt endlos weiter"], ["Scarabocchio", "Una linea che scarabocchia senza fine"], {
    init: E => ({ pts: [], x: E.w * .2, y: E.h * .5, a: 0 }),
    draw(c, s, E) {
      for (let i = 0; i < 3; i++) {
        s.a += (noise(E.t / 900 + i, 3) - .5) * .9; s.x += Math.cos(s.a) * 5; s.y += Math.sin(s.a) * 5;
        if (s.x < 0 || s.x > E.w) s.a = Math.PI - s.a; if (s.y < 0 || s.y > E.h) s.a = -s.a;
        s.x = clamp(s.x, 0, E.w); s.y = clamp(s.y, 0, E.h); s.pts.push([s.x, s.y]);
      }
      if (s.pts.length > 900) s.pts.splice(0, s.pts.length - 900);
      for (let i = 1; i < s.pts.length; i += 30) { stroke(c, E.P, E.P.c.mauve, i / s.pts.length * .6, 2); path(c, s.pts.slice(i - 1, i + 30)); c.stroke(); }
    },
  }],
  ["flipbook", "motion", "orange", ["Daumenkino", "Ein Ball springt in der Ecke"], ["Flipbook", "Una palla rimbalza nell'angolo"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [ox, flip] of [[E.w - 230, 0], [20, 1]]) {
        const oy = E.h - 200, f = Math.floor(E.t / 90) % 16, k = Math.abs(Math.sin(f / 16 * Math.PI));
        for (let i = 4; i >= 0; i--) { fill(c, P, P.surface, 1); c.fillRect(ox + i * 3, oy - i * 3, 200, 160); stroke(c, P, P.line, 1); c.strokeRect(ox + i * 3, oy - i * 3, 200, 160); }
        const bx = ox + 30 + (flip ? 140 - f * 9 : f * 9), by = oy + 140 - k * 110 - 12;
        fill(c, P, P.c.orange, .7); c.beginPath(); c.ellipse(bx, by, 12 * (k < .1 ? 1.25 : 1), 12 * (k < .1 ? .75 : 1), 0, 0, TAU); c.fill();
        stroke(c, P, P.muted, .6); seg(c, ox + 10, oy + 140, ox + 190, oy + 140);
        fill(c, P, P.muted, .6); text(c, String(f + 1), ox + 185, oy + 150, 9, 500);
      }
    },
  }],
  ["eraser-wipe", "motion", "red", ["Wegradieren", "Ein Radierer wischt Notizen fort"], ["Cancellare", "Una gomma cancella gli appunti"], {
    init: E => {
      const r = rnd(41);
      return { trail: [], marks: many(dens(E, 3000, 100, 400), () => { const x = r() * E.w, y = r() * E.h; return [x, y, x + 20 + r() * 40, y + (r() - .5) * 8]; }) };
    },
    draw(c, s, E) {
      const { P } = E, ex = E.w * (.5 + .45 * Math.sin(E.t / 2300)), ey = E.h * (.5 + .4 * Math.sin(E.t / 1300));
      s.trail.push([ex, ey, E.t]); while (s.trail.length && E.t - s.trail[0][2] > 6000) s.trail.shift();
      stroke(c, P, P.fg, .25, 1.5);
      for (const [x, y, x2, y2] of s.marks) {
        let gone = 0; for (let i = 0; i < s.trail.length; i += 4) { const t = s.trail[i]; if (Math.abs(t[0] - x) < 40 && Math.abs(t[1] - y) < 28) { gone = Math.max(gone, 1 - (E.t - t[2]) / 6000); } }
        if (gone < .95) { A(c, .25 * (1 - gone), P); seg(c, x, y, x2, y2); }
      }
      at(c, ex, ey, Math.sin(E.t / 700) * .4, 1, () => { fill(c, P, P.c.red, .55); rrect(c, -30, -12, 30, 24, 5); c.fill(); fill(c, P, P.c.blue, .6); rrect(c, 0, -12, 30, 24, 5); c.fill(); });
    },
  }],
  ["fountain-pen", "motion", "blue", ["Füllfeder", "Kalligrafische Bänder mit wechselnder Strichstärke"], ["Stilografica", "Nastri calligrafici dal tratto variabile"], {
    draw(c, s, E) {
      const { P } = E;
      for (let k = 0; k < 4; k++) {
        const cx = E.w * (k % 2 ? .82 : .18), cy = E.h * (k < 2 ? .3 : .72), ph = E.t / 4000 + k;
        let px = null, py = null;
        for (let i = 0; i <= 260; i++) {
          const a = i / 260 * TAU, x = cx + Math.sin(a * 2 + ph) * 110, y = cy + Math.sin(a * 3) * 70;
          if (px !== null) { const dir = Math.atan2(y - py, x - px); fill(c, P, k % 2 ? P.c.blue : P.fg, .35); const wdt = 1 + Math.abs(Math.sin(dir - Math.PI / 4)) * 5; dot(c, x, y, wdt); }
          px = x; py = y;
        }
      }
    },
  }],
  ["notes-breeze", "motion", "yellow", ["Zettel im Wind", "Pinnwandzettel flattern leicht"], ["Foglietti al vento", "Foglietti sulla bacheca che svolazzano"], {
    init: E => swarm(E, dens(E, 40000, 8, 26), () => ({ col: R() * 6 | 0 })),
    draw(c, s, E) {
      const { P } = E;
      for (const p of s) at(c, p.x, p.y, Math.sin(E.t / 1100 + p.ph) * .12, 1, () => {
        const lift = .75 + .25 * Math.cos(E.t / 800 + p.ph);
        fill(c, P, L(P, p.col), .35); c.fillRect(-40, 0, 80, 80 * lift);
        fill(c, P, P.c.red, .7); dot(c, 0, 6, 5);
        stroke(c, P, P.fg, .2, 1.4); for (let l = 0; l < 3; l++) seg(c, -28, 24 + l * 14 * lift, 20, 24 + l * 14 * lift);
      });
    },
  }],
  ["paper-boats", "motion", "blue", ["Papierschiffchen", "Schiffchen schaukeln auf Wellen"], ["Barchette", "Barchette di carta che dondolano sulle onde"], {
    init: E => many(dens(E, 150000, 3, 8), i => ({ x: R() * E.w, v: .01 + R() * .02, row: i % 3 })),
    draw(c, s, E) {
      const { P } = E, wave = (x, row) => E.h - 60 - row * 70 + Math.sin(x / 80 + E.t / 900 + row) * 10;
      for (let row = 2; row >= 0; row--) { stroke(c, P, P.c.blue, .3 + row * .1, 2); curve(c, x => wave(x, row), 0, E.w, 10); c.stroke(); }
      for (const b of s) {
        b.x = wrap(b.x + b.v * E.dt, E.w, 60); const y = wave(b.x, b.row), tilt = Math.cos(b.x / 80 + E.t / 900 + b.row) * .12;
        at(c, b.x, y - 6, tilt, 1 - b.row * .15, () => {
          fill(c, P, P.surface, .95); path(c, [[-30, -8], [30, -8], [20, 6], [-20, 6]], true); c.fill(); stroke(c, P, P.muted, .7); c.stroke();
          fill(c, P, P.surface, .95); path(c, [[0, -8], [0, -40], [20, -8]], true); c.fill(); c.stroke();
        });
      }
    },
  }],
  ["stamping", "motion", "red", ["Bibliotheksstempel", "Stempel erscheinen einer nach dem anderen"], ["Timbri", "Timbri della biblioteca, uno dopo l'altro"], {
    init: () => ({ list: [], next: 0 }),
    draw(c, s, E) {
      const W = ["DSM", "BIB", "2026", "LESEN", "OK"];
      if (E.t > s.next) { s.next = E.t + 900; s.list.push({ x: R() * E.w, y: R() * E.h, t0: E.t, rot: (R() - .5) * .6, col: R() * 6 | 0, word: W[R() * W.length | 0] }); }
      s.list = s.list.filter(m => E.t - m.t0 < 9000);
      for (const m of s.list) {
        const age = (E.t - m.t0) / 9000, k = clamp((E.t - m.t0) / 160, 0, 1);
        stamp(c, E.P, m.x, m.y, 34 * (1.3 - .3 * k), m.rot, L(E.P, m.col), .6 * (1 - age) * k, m.word);
      }
    },
  }],
  ["highlighter", "motion", "yellow", ["Textmarker", "Gelbe Striche markieren Zeilen"], ["Evidenziatore", "Tratti gialli che evidenziano le righe"], {
    init: () => ({ marks: [], next: 0 }),
    draw(c, s, E) {
      const { P } = E;
      for (let y = 30; y < E.h; y += 28) { fill(c, P, P.muted, .12); c.fillRect(20, y - 3, E.w - 40, 6); }
      if (E.t > s.next) { s.next = E.t + 1400; const x = R() * E.w * .8; s.marks.push({ x, y: 30 + 28 * (R() * (E.h / 28 - 1) | 0), len: 80 + R() * 220, t0: E.t }); }
      s.marks = s.marks.filter(m => E.t - m.t0 < 7000);
      for (const m of s.marks) { const k = clamp((E.t - m.t0) / 1200, 0, 1), fade = 1 - clamp((E.t - m.t0 - 4000) / 3000, 0, 1); fill(c, P, P.c.yellow, .45 * fade); c.fillRect(m.x, m.y - 10, m.len * k, 20); }
    },
  }],
  ["school-clocks", "motion", "red", ["Schuluhren", "Wanduhren mit der Zeit in Mailand"], ["Orologi di scuola", "Orologi da parete con l'ora di Milano"], {
    draw(c, s, E) {
      const t = romeTime();
      for (const [x, y] of [[E.w * .1, E.h * .25], [E.w * .9, E.h * .5], [E.w * .12, E.h * .78]]) clock(c, E.P, x, y, Math.min(110, E.w * .08 + 30), t);
    },
  }],
  ["bell", "motion", "orange", ["Pausenklingel", "Schallringe aus den Ecken"], ["Campanella", "Onde sonore dagli angoli"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [x, y, k] of [[0, 0, 0], [E.w, 0, 1], [0, E.h, 2], [E.w, E.h, 3]]) for (let i = 0; i < 5; i++) {
        const p = mod(E.t / 3200 + i / 5 + k * .13, 1);
        stroke(c, P, L(P, k + 2), (1 - p) * .5, 2); ring(c, x, y, p * Math.max(E.w, E.h) * .6);
      }
    },
  }],
  ["folding", "motion", "green", ["Falten", "Quadrate klappen ihre Ecken um"], ["Piegare", "Quadrati che ripiegano gli angoli"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 70, (x, y, i, j) => {
        const k = Math.cos(E.t / 1500 + i * .4 + j * .3);
        fill(c, P, L(P, i + j), .22); path(c, [[x + 4, y + 4], [x + 66, y + 4], [x + 4, y + 66]], true); c.fill();
        fill(c, P, L(P, i + j + 1), .3); path(c, [[x + 66, y + 4], [x + 35 + k * 31, y + 35 + k * 31], [x + 4, y + 66]], true); c.fill();
      });
    },
  }],
  ["chalk-dust", "motion", "blue", ["Kreidestaub", "Feiner Staub sinkt durch die Luft"], ["Polvere di gesso", "Polvere fine che scende nell'aria"], {
    init: E => swarm(E, dens(E, 3000, 120, 500), () => ({ v: .004 + R() * .01 })),
    draw(c, s, E) {
      const { P } = E;
      stroke(c, P, P.muted, .12, 30); c.lineCap = "round"; seg(c, E.w * .05, E.h * .2, E.w * .25, E.h * .3); seg(c, E.w * .75, E.h * .7, E.w * .95, E.h * .6); c.lineCap = "butt";
      fill(c, P, P.muted, .45);
      for (const p of s) { p.y = wrap(p.y + p.v * E.dt, E.h, 4); p.x += Math.sin(E.t / 1800 + p.ph) * .08; c.fillRect(p.x, p.y, 1.5, 1.5); }
    },
  }],
  // ----- touch -----
  ["drawing", "touch", "mauve", ["Zeichnen", "Der Zeiger zieht eine Bleistiftlinie"], ["Disegnare", "Il puntatore traccia una riga a matita"], {
    init: () => ({ pts: [] }),
    draw(c, s, E) {
      const { P } = E;
      if (E.ptr.on && !E.still) { const l = s.pts[s.pts.length - 1]; if (!l || Math.hypot(l[0] - E.ptr.x, l[1] - E.ptr.y) > 3) s.pts.push([E.ptr.x, E.ptr.y, E.t]); }
      s.pts = s.pts.filter(p => E.t - p[2] < 5000);
      for (let i = 1; i < s.pts.length; i++) { const p = s.pts[i], q = s.pts[i - 1]; if (p[2] - q[2] > 200) continue; stroke(c, P, P.fg, (1 - (E.t - p[2]) / 5000) * .5, 2); seg(c, q[0], q[1], p[0], p[1]); }
      return !s.pts.length && !E.ptr.on;
    },
  }],
  ["lines-push", "touch", "blue", ["Linien schieben", "Die Heftlinien weichen dem Zeiger aus"], ["Righe spinte", "Le righe del quaderno si scostano dal puntatore"], {
    init: E => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, E.w / 2, E.h / 2);
      stroke(c, P, P.c.blue, .45);
      for (let y = 20; y < E.h; y += 28) { curve(c, x => { const d = Math.hypot(x - s.x, y - s.y); return y + Math.sign(y - s.y || 1) * f * 26 * Math.exp(-d * d / 9000); }, 0, E.w, 8); c.stroke(); }
      stroke(c, P, P.c.red, .5); seg(c, 40, 0, 40, E.h);
      return f < .01 && !E.ptr.on;
    },
  }],
  ["paper-lens", "touch", "orange", ["Lupe auf Karopapier", "Unter dem Zeiger wird das Raster vergrößert"], ["Lente sui quadretti", "Sotto il puntatore la griglia si ingrandisce"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, E.w / 2, E.h / 2), R0 = 150;
      const warp = (x, y) => { const dx = x - s.x, dy = y - s.y, d = Math.hypot(dx, dy); if (d >= R0 || !f) return [x, y]; const k = 1 - f * .5 * (1 - d / R0) ** 2; return [s.x + dx * k, s.y + dy * k]; };
      stroke(c, P, P.c.orange, .35);
      for (let y = 0; y < E.h; y += 24) { param(c, k => warp(k * E.w, y), Math.ceil(E.w / 10)); c.stroke(); }
      for (let x = 0; x < E.w; x += 24) { param(c, k => warp(x, k * E.h), Math.ceil(E.h / 10)); c.stroke(); }
      if (f > .02) { stroke(c, P, P.muted, .5 * f, 3); ring(c, s.x, s.y, R0); }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["stamp-pad", "touch", "red", ["Stempelkissen", "Tippen setzt einen Stempel"], ["Tampone", "Tocca per lasciare un timbro"], {
    init: () => ({ list: [] }),
    draw(c, s, E) {
      for (const tap of E.ptr.taps.splice(0)) s.list.push({ x: tap.x, y: tap.y, rot: (R() - .5) * .6, col: R() * 6 | 0 });
      if (s.list.length > 40) s.list.shift();
      s.list.forEach((m, i) => stamp(c, E.P, m.x, m.y, 36, m.rot, L(E.P, m.col), .2 + .45 * (i + 1) / s.list.length, "DSM"));
      if (E.ptr.on && !E.still) { stroke(c, E.P, E.P.muted, .4, 1); c.setLineDash([4, 4]); ring(c, E.ptr.x, E.ptr.y, 36); c.setLineDash([]); }
      return true;
    },
  }],
  ["creases", "touch", "mauve", ["Knitterlicht", "Licht vom Zeiger fällt auf Papierfalten"], ["Pieghe di luce", "La luce del puntatore cade sulle pieghe"], {
    init: E => {
      const r = rnd(42), n = 70, cols = Math.ceil(E.w / n) + 2, rows = Math.ceil(E.h / n) + 2;
      const pt = many(cols * rows, k => [(k % cols - .5) * n + (r() - .5) * n * .7, ((k / cols | 0) - .5) * n + (r() - .5) * n * .7]);
      const tris = [];
      for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) { const a = j * cols + i; tris.push([pt[a], pt[a + 1], pt[a + cols], r() * TAU], [pt[a + 1], pt[a + cols + 1], pt[a + cols], r() * TAU]); }
      return { tris };
    },
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, E.w * .7, E.h * .3, 200);
      for (const [a, b, d, n] of s.tris) {
        const cx = (a[0] + b[0] + d[0]) / 3, cy = (a[1] + b[1] + d[1]) / 3, dir = Math.atan2(s.y - cy, s.x - cx), lit = Math.cos(dir - n);
        fill(c, P, lit > 0 ? P.c.mauve : P.fg, Math.abs(lit) * (.05 + f * .12)); path(c, [a, b, d], true); c.fill();
      }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["eraser-touch", "touch", "red", ["Radieren", "Der Zeiger radiert Bleistiftschraffur weg"], ["Cancellino", "Il puntatore cancella il tratteggio a matita"], {
    init: E => ({ holes: [] }),
    draw(c, s, E) {
      const { P } = E;
      if (E.ptr.on && !E.still) { const l = s.holes[s.holes.length - 1]; if (!l || Math.hypot(l[0] - E.ptr.x, l[1] - E.ptr.y) > 10) s.holes.push([E.ptr.x, E.ptr.y]); if (s.holes.length > 300) s.holes.shift(); }
      stroke(c, P, P.fg, .14, 1);
      for (let k = -E.h; k < E.w; k += 7) seg(c, k, E.h, k + E.h, 0);
      c.globalCompositeOperation = "destination-out"; c.globalAlpha = 1; c.fillStyle = P.fg;
      for (const [x, y] of s.holes) dot(c, x, y, 26);
      c.globalCompositeOperation = "source-over";
      return true;
    },
  }],
  ["compass-touch", "touch", "blue", ["Zirkel", "Der Zirkel schlägt Kreise um den Zeiger"], ["Compasso", "Il compasso traccia cerchi attorno al puntatore"], {
    init: () => ({ arcs: [] }),
    draw(c, s, E) {
      const { P } = E;
      for (const tap of E.ptr.taps.splice(0)) s.arcs.push({ x: tap.x, y: tap.y, r: 40 + R() * 120, t0: E.t, col: R() * 6 | 0 });
      if (s.arcs.length > 25) s.arcs.shift();
      for (const a of s.arcs) { const k = clamp((E.t - a.t0) / 900, 0, 1); stroke(c, P, L(P, a.col), .5, 1.5); c.beginPath(); c.arc(a.x, a.y, a.r, -Math.PI / 2, -Math.PI / 2 + k * TAU); c.stroke(); fill(c, P, P.fg, .5); dot(c, a.x, a.y, 2); }
      const busy = s.arcs.some(a => E.t - a.t0 < 900);
      if (E.ptr.on && !E.still) { stroke(c, P, P.muted, .5, 2); seg(c, E.ptr.x, E.ptr.y, E.ptr.x + 30, E.ptr.y - 60); seg(c, E.ptr.x + 30, E.ptr.y - 60, E.ptr.x + 60, E.ptr.y); }
      return !busy;
    },
  }],
  ["post-its-touch", "touch", "yellow", ["Zettelwand", "Klebezettel heben sich unter dem Zeiger"], ["Bacheca", "I post-it si sollevano sotto il puntatore"], {
    init: E => { const r = rnd(43); return { notes: many(dens(E, 18000, 20, 80), i => ({ x: r() * E.w, y: r() * E.h, rot: (r() - .5) * .4, col: i % 6, lift: 0 })) }; },
    draw(c, s, E) {
      const { P } = E; let moving = false;
      for (const n of s.notes) {
        const goal = near(E, n.x, n.y, 120); n.lift += (goal - n.lift) * Math.min(1, E.dt / 120); if (Math.abs(goal - n.lift) > .01) moving = true;
        at(c, n.x, n.y, n.rot - n.lift * .2, 1 + n.lift * .12, () => {
          fill(c, P, P.fg, .08 * n.lift); c.fillRect(-36 + 8 * n.lift, -36 + 10 * n.lift, 72, 72);
          fill(c, P, L(P, n.col), .3 + .2 * n.lift); c.fillRect(-36, -36, 72, 72);
        });
      }
      return !moving && !E.ptr.on;
    },
  }],
  ["ruler-touch", "touch", "green", ["Messen", "Ein Lineal misst den Abstand zum Zeiger"], ["Misurare", "Un righello misura la distanza dal puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, E.w * .5, E.h * .5, 80), ox = 30, oy = E.h - 30;
      stroke(c, P, P.c.green, .5, 2); seg(c, ox, oy, s.x, s.y);
      const d = Math.hypot(s.x - ox, s.y - oy), a = Math.atan2(s.y - oy, s.x - ox);
      for (let k = 0; k < d; k += 10) { const l = k % 50 ? 5 : 12; stroke(c, P, P.c.green, .45); seg(c, ox + Math.cos(a) * k, oy + Math.sin(a) * k, ox + Math.cos(a) * k + Math.cos(a + Math.PI / 2) * l, oy + Math.sin(a) * k + Math.sin(a + Math.PI / 2) * l); }
      fill(c, P, P.c.green, .7); text(c, `${(d / 37.8).toFixed(1)} cm`, s.x + 18, s.y - 18, 16, 600, "left");
      return f < .01 && !E.ptr.on;
    },
  }],
]);
