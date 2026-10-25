/* Extra backgrounds 2/10: books and the library */
import { TAU, clamp, mod, rnd, R, many, dens, wrap, noise, fbm, A, L, fill, stroke, dot, ring, seg, path, ngon, rrect, curve, text, at, swarm, near, grid, follow, def } from "./kit.js";

// Classic titles (public domain) for spines and lists
const TITLES = ["Faust", "Effi Briest", "Die Verwandlung", "Der Sandmann", "Woyzeck", "Emil", "Heidi", "Pinocchio", "I Promessi Sposi",
  "Divina Commedia", "Il Decameron", "Cuore", "Nathan der Weise", "Die Räuber", "Werther", "Siddhartha", "Il Principe", "Max und Moritz",
  "Struwwelpeter", "Odyssee", "Ilias", "Robinson", "Don Quijote", "Gullivers Reisen", "Hamlet", "Candide", "Der Schimmelreiter", "Kabale und Liebe"];
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// A closed book seen from the side (spine up): x, y = bottom left
function spine(c, P, x, y, w, h, col, a = .4) {
  fill(c, P, col, a); c.fillRect(x, y - h, w, h);
  fill(c, P, P.bg, .4 * a / .4); c.fillRect(x + 2, y - h + 8, w - 4, 2); c.fillRect(x + 2, y - 14, w - 4, 2);
}
// An open book, centered at x, y, half width w
function openBook(c, P, x, y, w, col, a = .5, k = 1) {
  const h = w * 1.3;
  for (const side of [-1, 1]) {
    fill(c, P, P.surface, .95 * a / .5);
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + side * w * .5 * k, y - h * .12, x + side * w * k, y - h * .04);
    c.lineTo(x + side * w * k, y + h); c.quadraticCurveTo(x + side * w * .5 * k, y + h * .9, x, y + h); c.closePath(); c.fill();
    stroke(c, P, P.line, a * 1.6); c.stroke();
    stroke(c, P, P.muted, a * .5); for (let l = 1; l < 8; l++) { const ly = y + h * l / 9; seg(c, x + side * w * .12 * k, ly, x + side * w * .85 * k, ly); }
  }
  fill(c, P, col, a); c.fillRect(x - 1.5, y - 4, 3, h + 8);
}

export default def("books", [
  ["call-numbers", "still", "blue", ["Signaturen", "Kleine Etiketten wie auf Buchrücken"], ["Segnature", "Etichette come sul dorso dei libri"], {
    draw(c, s, E) {
      const r = rnd(101), { P } = E;
      for (let i = 0; i < dens(E, 9000, 40, 160); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * .2, 1, () => {
        fill(c, P, P.surface, 1); rrect(c, -24, -16, 48, 32, 4); c.fill(); stroke(c, P, L(P, i), .6, 1.5); c.stroke();
        fill(c, P, P.fg, .45); text(c, ABC[r() * 26 | 0] + ABC[r() * 26 | 0].toLowerCase(), 0, -6, 11, 600); text(c, `${1 + (r() * 9 | 0)}.${10 + (r() * 89 | 0)}`, 0, 7, 10, 500);
      });
    },
  }],
  ["barcodes", "still", "orange", ["Strichcodes", "ISBN-Barcodes wie auf der Rückseite"], ["Codici a barre", "Codici ISBN come sul retro dei libri"], {
    draw(c, s, E) {
      const r = rnd(102), { P } = E;
      for (let i = 0; i < dens(E, 30000, 12, 46); i++) at(c, r() * E.w, r() * E.h, 0, 1, () => {
        fill(c, P, P.surface, 1); c.fillRect(-6, -4, 112, 74);
        fill(c, P, P.fg, .45); for (let x = 0; x < 100;) { const bw = 1 + (r() * 3 | 0); if (r() < .55) c.fillRect(x, 0, bw, 52); x += bw + (r() * 2 | 0); }
        text(c, "978-" + many(9, () => r() * 10 | 0).join(""), 50, 62, 9, 500);
      });
    },
  }],
  ["catalog-cards", "still", "mauve", ["Zettelkatalog", "Karteikarten mit Loch und Schreibmaschinenzeilen"], ["Schedario", "Schede con foro e righe a macchina"], {
    draw(c, s, E) {
      const r = rnd(103), { P } = E;
      c.font = "400 10px ui-monospace, Menlo, Consolas, monospace"; c.textAlign = "left"; c.textBaseline = "middle";
      for (let i = 0; i < dens(E, 32000, 12, 44); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * .3, 1, () => {
        fill(c, P, P.surface, 1); c.fillRect(-80, -50, 160, 100); stroke(c, P, P.line, 1); c.strokeRect(-80, -50, 160, 100);
        fill(c, P, P.bg, 1); dot(c, 0, 38, 5); stroke(c, P, P.line, 1); ring(c, 0, 38, 5);
        fill(c, P, P.fg, .4); c.fillText(TITLES[r() * TITLES.length | 0], -70, -32); c.fillText("Mailand " + (1800 + (r() * 220 | 0)), -70, -18);
        stroke(c, P, P.c.mauve, .5); seg(c, -80, -42, 80, -42);
        fill(c, P, P.fg, .25); for (let l = 0; l < 3; l++) c.fillRect(-70, -4 + l * 10, 60 + r() * 70, 2);
      });
    },
  }],
  ["open-books", "still", "green", ["Aufgeschlagen", "Offene Bücher, verstreut"], ["Libri aperti", "Libri aperti sparsi"], {
    draw(c, s, E) {
      const r = rnd(104);
      for (let i = 0; i < dens(E, 45000, 8, 28); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * .8, 1, () => openBook(c, E.P, 0, -30, 40 + r() * 20, L(E.P, i), .45));
    },
  }],
  ["book-stacks", "still", "red", ["Bücherstapel", "Schiefe Türme aus liegenden Büchern"], ["Pile di libri", "Torri storte di libri sdraiati"], {
    draw(c, s, E) {
      const r = rnd(105), { P } = E;
      for (let x = 20; x < E.w; x += 110 + r() * 80) {
        let y = E.h - 6, off = 0;
        for (let k = 0, n = 4 + r() * 12; k < n && y > 60; k++) {
          const bh = 12 + r() * 14, bw = 70 + r() * 50; off += (r() - .5) * 12;
          fill(c, P, L(P, r() * 6), .35); c.fillRect(x + off, y - bh, bw, bh);
          fill(c, P, P.surface, .7); c.fillRect(x + off + bw - 6, y - bh + 2, 4, bh - 4);
          y -= bh;
        }
      }
    },
  }],
  ["fore-edges", "still", "yellow", ["Buchschnitt", "Seitenkanten geschlossener Bücher"], ["Taglio dei libri", "Bordi delle pagine di libri chiusi"], {
    draw(c, s, E) {
      const r = rnd(106), { P } = E;
      for (let y = 10; y < E.h; y += 70) for (let x = r() * -40; x < E.w; x += 0) {
        const bw = 30 + r() * 60, bh = 46 + r() * 16;
        fill(c, P, L(P, r() * 6), .35); c.fillRect(x, y, bw, 4); c.fillRect(x, y + bh - 4, bw, 4);
        stroke(c, P, P.muted, .25); for (let k = y + 6; k < y + bh - 4; k += 2.5) seg(c, x + 2, k, x + bw - 2, k);
        x += bw + 6 + r() * 20;
      }
    },
  }],
  ["ex-libris", "still", "mauve", ["Exlibris", "Bucheignerzeichen mit Rahmen"], ["Ex libris", "Etichette di proprietà con cornice"], {
    draw(c, s, E) {
      const r = rnd(107), { P } = E;
      grid(E, 190, (x, y, i, j) => at(c, x + 95 + (j % 2) * 40, y + 95, (r() - .5) * .2, 1, () => {
        const col = L(P, i * 2 + j);
        stroke(c, P, col, .6, 2); c.strokeRect(-55, -70, 110, 140); stroke(c, P, col, .4, 1); c.strokeRect(-49, -64, 98, 128);
        fill(c, P, col, .5); text(c, "Ex Libris", 0, -40, 14, 600); text(c, "DSM", 0, 30, 22, 600);
        stroke(c, P, col, .5, 1.5); openBook(c, P, 0, -18, 18, col, .4);
      }));
    },
  }],
  ["marbled", "still", "blue", ["Marmorpapier", "Vorsatzpapier mit Wirbeln"], ["Carta marmorizzata", "Risguardi con vortici"], {
    draw(c, s, E) {
      const { P } = E;
      for (let y = 0; y < E.h; y += 6) for (let x = 0; x < E.w; x += 6) {
        const n = fbm(x / 260 + Math.sin(y / 70) * .6, y / 260), k = Math.floor(n * 14);
        if (k % 2) { fill(c, P, L(P, k), .22); c.fillRect(x, y, 6, 6); }
      }
    },
  }],
  ["floor-plan", "still", "green", ["Grundriss", "Die Bibliothek von oben: Regale, Tische, Türen"], ["Pianta", "La biblioteca dall'alto: scaffali, tavoli, porte"], {
    draw(c, s, E) {
      const r = rnd(108), { P } = E;
      stroke(c, P, P.muted, .45, 3); c.strokeRect(20, 20, E.w - 40, E.h - 40);
      for (let y = 70; y < E.h - 120; y += 90) for (let x = 60; x < E.w - 160; x += 180 + r() * 40) {
        if (r() < .7) { fill(c, P, L(P, r() * 6), .3); c.fillRect(x, y, 120, 18); stroke(c, P, P.muted, .3); for (let k = x; k < x + 120; k += 10) seg(c, k, y, k, y + 18); }
        else { stroke(c, P, P.c.green, .45, 1.5); ring(c, x + 50, y + 10, 22); for (let a = 0; a < 4; a++) ring(c, x + 50 + Math.cos(a * Math.PI / 2) * 34, y + 10 + Math.sin(a * Math.PI / 2) * 34, 7); }
      }
      stroke(c, P, P.muted, .45, 1.5); c.beginPath(); c.arc(E.w / 2, E.h - 20, 40, Math.PI, Math.PI * 1.5); c.stroke(); seg(c, E.w / 2, E.h - 20, E.w / 2, E.h - 60);
    },
  }],
  ["glasses", "still", "blue", ["Lesebrillen", "Brillen liegen herum"], ["Occhiali", "Occhiali da lettura sparsi"], {
    draw(c, s, E) {
      const r = rnd(109), { P } = E;
      for (let i = 0; i < dens(E, 30000, 12, 46); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * 1.2, 1, () => {
        stroke(c, P, L(P, i), .55, 3);
        const round = r() < .5;
        for (const sx of [-26, 26]) { if (round) ring(c, sx, 0, 18); else { rrect(c, sx - 20, -14, 40, 28, 8); c.stroke(); } }
        c.beginPath(); c.moveTo(-8, -2); c.quadraticCurveTo(0, -10, 8, -2); c.stroke();
        seg(c, -44, -4, -62, -10); seg(c, 44, -4, 62, -10);
      });
    },
  }],
  ["bookmarks", "still", "red", ["Lesezeichen", "Lesezeichen mit Quasten"], ["Segnalibri", "Segnalibri con nappine"], {
    draw(c, s, E) {
      const r = rnd(110), { P } = E;
      for (let i = 0; i < dens(E, 24000, 14, 54); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * 2, 1, () => {
        const col = L(P, i);
        fill(c, P, col, .4); path(c, [[-12, -60], [12, -60], [12, 50], [0, 40], [-12, 50]], true); c.fill();
        stroke(c, P, col, .6, 1.5); seg(c, 0, -60, 0, -84); fill(c, P, col, .6); path(c, [[-5, -84], [5, -84], [8, -100], [-8, -100]], true); c.fill();
      });
    },
  }],
  ["page-numbers", "still", "orange", ["Seitenzahlen", "Seitenecken mit großen Zahlen"], ["Numeri di pagina", "Angoli di pagina con grandi numeri"], {
    draw(c, s, E) {
      const r = rnd(111), { P } = E;
      grid(E, 150, (x, y, i, j) => {
        const n = 1 + (r() * 400 | 0);
        fill(c, P, L(P, i + j), .22); text(c, String(n), x + 75, y + 75, 44, 600);
        stroke(c, P, P.line, 1); seg(c, x + 10, y + 120, x + 140, y + 120);
      });
    },
  }],
  ["initials", "still", "red", ["Initialen", "Verzierte Anfangsbuchstaben"], ["Capilettera", "Lettere iniziali decorate"], {
    draw(c, s, E) {
      const r = rnd(112), { P } = E;
      grid(E, 130, (x, y, i, j) => {
        const col = L(P, i * 3 + j);
        fill(c, P, col, .16); c.fillRect(x + 15, y + 15, 100, 100);
        stroke(c, P, col, .5, 1.5); c.strokeRect(x + 15, y + 15, 100, 100);
        for (let k = 0; k < 4; k++) { const cx = x + 15 + (k % 2) * 100, cy = y + 15 + (k > 1) * 100; ring(c, cx, cy, 6); }
        fill(c, P, col, .5); text(c, ABC[(i * 7 + j * 3 + 26 * 26) % 26], x + 65, y + 68, 64, 600);
      });
    },
  }],
  ["reading-list", "still", "green", ["Leseliste", "Titel zum Abhaken"], ["Lista di lettura", "Titoli da spuntare"], {
    draw(c, s, E) {
      const r = rnd(113), { P } = E;
      for (let x = 30; x < E.w; x += 260) for (let y = 40; y < E.h; y += 34) {
        const done = r() < .5;
        stroke(c, P, P.muted, .5, 1.5); rrect(c, x, y - 9, 18, 18, 4); c.stroke();
        if (done) { stroke(c, P, P.c.green, .8, 2.5); path(c, [[x + 3, y], [x + 8, y + 5], [x + 16, y - 6]]); c.stroke(); }
        fill(c, P, P.fg, done ? .2 : .35); text(c, TITLES[r() * TITLES.length | 0], x + 28, y, 14, 500, "left");
        if (done) { stroke(c, P, P.fg, .2); seg(c, x + 28, y, x + 170, y); }
      }
    },
  }],
  ["covers", "still", "mauve", ["Buchcover", "Abstrakte Umschläge in Reihen"], ["Copertine", "Copertine astratte in fila"], {
    draw(c, s, E) {
      const r = rnd(114), { P } = E;
      grid(E, 110, (x, y, i, j) => {
        const col = L(P, r() * 6), m = r() * 4 | 0;
        fill(c, P, col, .28); c.fillRect(x + 12, y + 6, 80, 100);
        fill(c, P, P.surface, .8);
        if (m === 0) dot(c, x + 52, y + 46, 22); else if (m === 1) { ngon(c, x + 52, y + 50, 26, 3, -Math.PI / 2); c.fill(); }
        else if (m === 2) for (let k = 0; k < 4; k++) c.fillRect(x + 12, y + 20 + k * 16, 80, 6); else c.fillRect(x + 24, y + 24, 56, 44);
        fill(c, P, P.fg, .35); c.fillRect(x + 22, y + 84, 44, 4); c.fillRect(x + 22, y + 92, 30, 3);
      });
    },
  }],
  ["genres", "still", "blue", ["Genres", "Symbole für Krimi, Science-Fiction, Liebe, Reisen …"], ["Generi", "Simboli per giallo, fantascienza, amore, viaggi …"], {
    draw(c, s, E) {
      const r = rnd(115), { P } = E;
      const icons = [
        () => { ring(c, -4, -4, 14); seg(c, 6, 6, 18, 18); }, // magnifier
        () => { path(c, [[0, -22], [9, 6], [0, 2], [-9, 6]], true); c.stroke(); seg(c, -4, 8, -6, 18); seg(c, 4, 8, 6, 18); }, // rocket
        () => { c.beginPath(); c.moveTo(0, 16); c.bezierCurveTo(-26, -2, -10, -22, 0, -8); c.bezierCurveTo(10, -22, 26, -2, 0, 16); c.stroke(); }, // heart
        () => { ring(c, 0, 0, 18); c.beginPath(); c.ellipse(0, 0, 8, 18, 0, 0, TAU); c.stroke(); seg(c, -18, 0, 18, 0); }, // globe
        () => { path(c, [[-18, 16], [-18, -4], [-10, -4], [-10, -14], [-4, -14], [-4, -4], [4, -4], [4, -14], [10, -14], [10, -4], [18, -4], [18, 16]], true); c.stroke(); }, // castle
        () => { path(c, [[-16, 12], [-6, -14], [4, 4], [10, -6], [18, 12]], true); c.stroke(); }, // mountains
        () => { ring(c, 0, -6, 9); c.beginPath(); c.arc(0, 18, 16, Math.PI, TAU); c.stroke(); }, // person
        () => { path(c, [[-14, 14], [-14, -14], [14, -14], [14, 14]]); c.stroke(); seg(c, -14, -4, 14, -4); dot(c, 0, 4, 3); }, // treasure
      ];
      for (let i = 0; i < dens(E, 9000, 40, 150); i++) {
        stroke(c, P, L(P, i), .5, 2); fill(c, P, L(P, i), .5);
        at(c, r() * E.w, r() * E.h, (r() - .5) * .5, .8 + r() * .6, icons[r() * icons.length | 0]);
      }
    },
  }],
  ["shelf-signs", "still", "yellow", ["Regalschilder", "Buchstabenschilder von A bis Z"], ["Cartelli", "Cartelli degli scaffali dalla A alla Z"], {
    draw(c, s, E) {
      const { P } = E;
      let k = 0;
      grid(E, 96, (x, y) => {
        const col = L(P, k);
        fill(c, P, col, .25); rrect(c, x + 14, y + 22, 68, 52, 10); c.fill();
        stroke(c, P, P.muted, .4); seg(c, x + 30, y + 22, x + 36, y + 6); seg(c, x + 66, y + 22, x + 60, y + 6);
        fill(c, P, P.fg, .4); text(c, ABC[k % 26], x + 48, y + 49, 28, 600); k++;
      });
    },
  }],
  ["type-case", "still", "orange", ["Setzkasten", "Fächer voller Bleibuchstaben"], ["Cassa tipografica", "Scomparti pieni di caratteri di piombo"], {
    draw(c, s, E) {
      const r = rnd(116), { P } = E;
      for (let y = 10; y < E.h; y += 60) for (let x = 10; x < E.w;) {
        const cw = 40 + (r() * 3 | 0) * 30;
        stroke(c, P, P.muted, .45, 2); c.strokeRect(x, y, cw, 54);
        fill(c, P, P.fg, .3); for (let k = 0; k < cw / 14; k++) text(c, (r() < .5 ? ABC : ABC.toLowerCase())[r() * 26 | 0], x + 8 + k * 12, y + 20 + (k % 2) * 16, 13, 600);
        x += cw;
      }
    },
  }],
  ["spine-titles", "still", "mauve", ["Buchrücken-Titel", "Klassiker, senkrecht beschriftet"], ["Titoli sul dorso", "Classici scritti in verticale"], {
    draw(c, s, E) {
      const r = rnd(117), { P } = E;
      for (let y = E.h; y > 0; y -= 250) for (let x = 0; x < E.w;) {
        const bw = 26 + r() * 16, bh = 170 + r() * 60, col = L(P, r() * 6);
        spine(c, P, x, y, bw, bh, col, .3);
        at(c, x + bw / 2, y - bh / 2, -Math.PI / 2, 1, () => { fill(c, P, P.fg, .4); text(c, TITLES[r() * TITLES.length | 0], 0, 0, 12, 600); });
        x += bw + 2;
      }
    },
  }],
  ["quotes-marks", "still", "blue", ["Anführungszeichen", "„ “ « » in allen Größen"], ["Virgolette", "„ “ « » di ogni misura"], {
    draw(c, s, E) {
      const r = rnd(118), { P } = E, Q = ["„", "“", "«", "»", "‚", "‘"];
      for (let i = 0; i < dens(E, 12000, 30, 110); i++) { fill(c, P, L(P, i), .25 + r() * .2); text(c, Q[r() * Q.length | 0], r() * E.w, r() * E.h, 30 + r() * 90, 600); }
    },
  }],
  // ----- motion -----
  ["page-turn", "motion", "yellow", ["Umblättern", "Seiten wenden sich langsam"], ["Sfogliare", "Pagine che si girano piano"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 160, (x, y, i, j) => {
        const ph = mod(E.t / 3000 + i * .17 + j * .29, 1), k = Math.cos(ph * Math.PI);
        openBook(c, P, x + 80, y + 40, 50, L(P, i + j), .35, 1);
        fill(c, P, P.surface, .95); stroke(c, P, P.line, .8);
        path(c, [[x + 80, y + 40], [x + 80 + 50 * k, y + 40 - 6 * Math.sin(ph * Math.PI)], [x + 80 + 50 * k, y + 105], [x + 80, y + 105]], true); c.fill(); c.stroke();
      });
    },
  }],
  ["letters-rise", "motion", "green", ["Aus dem Buch", "Buchstaben steigen aus offenen Büchern"], ["Dal libro", "Lettere che escono da libri aperti"], {
    init: E => ({ books: many(Math.max(2, Math.round(E.w / 420)), i => (i + .5) * E.w / Math.max(2, Math.round(E.w / 420))), ls: [] }),
    draw(c, s, E) {
      const { P } = E;
      if (s.ls.length < 80 && R() < .5) { const bx = s.books[R() * s.books.length | 0]; s.ls.push({ x: bx + (R() - .5) * 40, y: E.h - 80, vx: (R() - .5) * .03, vy: -.03 - R() * .04, ch: ABC[R() * 26 | 0], col: R() * 6 | 0, t0: E.t }); }
      s.ls = s.ls.filter(l => l.y > -20);
      for (const l of s.ls) { l.x += l.vx * E.dt; l.y += l.vy * E.dt; fill(c, P, L(P, l.col), clamp(.6 - (E.h - l.y) / E.h * .5, .05, .6)); text(c, l.ch, l.x + Math.sin(E.t / 600 + l.x) * 6, l.y, 18, 600); }
      for (const bx of s.books) openBook(c, P, bx, E.h - 80, 60, P.c.green, .5);
    },
  }],
  ["bookworm", "motion", "green", ["Bücherwurm", "Ein Wurm kriecht durch die Zeilen"], ["Topo di biblioteca", "Un bruco che striscia tra le righe"], {
    init: E => ({ x: 0, lane: 0 }),
    draw(c, s, E) {
      const { P } = E, lanes = Math.max(1, Math.floor(E.h / 60));
      s.x += E.dt * .05; if (s.x > E.w + 80) { s.x = -80; s.lane = (s.lane + 1) % lanes; }
      for (let l = 0; l < lanes; l++) { const y = 30 + l * 60; fill(c, P, P.muted, .18); for (let x = 20; x < E.w; x += 54) c.fillRect(x, y - 3, 44, 6); }
      const y = 30 + s.lane * 60;
      fill(c, P, P.bg, 1); c.fillRect(0, y - 4, Math.max(0, s.x - 20), 8);
      for (let k = 9; k >= 0; k--) { const x = s.x - k * 7; fill(c, P, P.c.green, .7 - k * .04); dot(c, x, y + Math.sin(E.t / 120 - k * .8) * 3, k ? 6 : 7.5); }
      fill(c, P, P.fg, .7); dot(c, s.x + 3, y - 3, 1.4);
    },
  }],
  ["reading-line", "motion", "blue", ["Lesezeile", "Ein Balken folgt dem Lesen Zeile für Zeile"], ["Riga di lettura", "Una barra segue la lettura riga per riga"], {
    draw(c, s, E) {
      const { P } = E, rows = Math.floor(E.h / 26), k = mod(E.t / 1800, rows), row = Math.floor(k), part = k - row;
      const r = rnd(119);
      for (let i = 0; i < rows; i++) { const y = 20 + i * 26; let x = 30; while (x < E.w - 30) { const ww = 20 + r() * 60; fill(c, P, P.muted, i < row ? .1 : .2); c.fillRect(x, y - 3, ww, 6); x += ww + 8; } }
      fill(c, P, P.c.blue, .35); c.fillRect(30, 20 + row * 26 - 9, (E.w - 60) * part, 18);
    },
  }],
  ["floating-books", "motion", "mauve", ["Schwerelos", "Bücher schweben und drehen sich"], ["Senza peso", "Libri che fluttuano e ruotano"], {
    init: E => swarm(E, dens(E, 50000, 6, 22), () => ({ col: R() * 6 | 0, w: 40 + R() * 30, rot: R() * TAU, vr: (R() - .5) * .0004 })),
    draw(c, s, E) {
      const { P } = E;
      for (const b of s) {
        b.x = wrap(b.x + b.vx * E.dt * .6, E.w, 80); b.y = wrap(b.y + b.vy * E.dt * .6, E.h, 80); b.rot += b.vr * E.dt;
        at(c, b.x, b.y, b.rot, 1, () => {
          fill(c, P, L(P, b.col), .4); c.fillRect(-b.w / 2, -b.w * .7, b.w, b.w * 1.4);
          fill(c, P, P.surface, .9); c.fillRect(b.w / 2, -b.w * .66, 5, b.w * 1.32);
          fill(c, P, P.surface, .6); c.fillRect(-b.w / 2 + 6, -b.w * .4, b.w - 12, 5);
        });
      }
    },
  }],
  ["shelf-conveyor", "motion", "orange", ["Wandernde Regale", "Regalreihen gleiten vorbei"], ["Scaffali scorrevoli", "File di scaffali che scorrono"], {
    init: () => { const r = rnd(120); return many(5, () => many(60, () => [12 + r() * 16, 60 + r() * 50, r() * 6 | 0])); },
    draw(c, s, E) {
      const { P } = E, rowH = Math.max(120, E.h / 5);
      s.forEach((row, i) => {
        const y = (i + 1) * rowH - 10, total = row.reduce((a, b) => a + b[0] + 2, 0), off = mod(E.t * (.01 + i * .004) * (i % 2 ? 1 : -1), total);
        fill(c, P, P.line, .8); c.fillRect(0, y, E.w, 5);
        for (let x = -off; x < E.w; x += total) { let px = x; for (const [bw, bh, col] of row) { if (px > -40 && px < E.w) spine(c, P, px, y, bw, Math.min(bh, rowH - 20), L(P, col), .3); px += bw + 2; } }
      });
    },
  }],
  ["dominoes", "motion", "red", ["Bücherdomino", "Eine Reihe Bücher kippt nacheinander"], ["Domino di libri", "Una fila di libri che cade uno dopo l'altro"], {
    draw(c, s, E) {
      const { P } = E, n = Math.floor(E.w / 34), cyc = n * 140 + 2500, k = mod(E.t, cyc);
      for (const y of [E.h * .35, E.h * .85]) for (let i = 0; i < n; i++) {
        const tFall = i * 140, a = clamp((k - tFall) / 300, 0, 1) * 1.2 * (k < cyc - 600 ? 1 : 1 - (k - cyc + 600) / 600);
        at(c, 20 + i * 34 + 22, y, a, 1, () => { fill(c, P, L(P, i), .45); c.fillRect(-22, -80, 22, 80); fill(c, P, P.bg, .35); c.fillRect(-18, -70, 14, 2); });
      }
    },
  }],
  ["rolodex", "motion", "blue", ["Kartenrad", "Karteikarten klappen um wie im Drehkatalog"], ["Rubrica rotante", "Schede che girano come in uno schedario rotante"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [cx, cy] of [[E.w * .12, E.h * .3], [E.w * .88, E.h * .7], [E.w * .5, E.h * .15]]) {
        for (let k = 0; k < 14; k++) {
          const a = mod(k / 14 + E.t / 9000, 1) * TAU, y = cy + Math.sin(a) * 60, sc = Math.cos(a);
          if (sc < -.2) continue;
          fill(c, P, P.surface, .95); stroke(c, P, P.line, 1);
          c.fillRect(cx - 70, y - 40 * sc, 140, 80 * sc); c.strokeRect(cx - 70, y - 40 * sc, 140, 80 * sc);
          fill(c, P, L(P, k), .5); c.fillRect(cx - 70, y - 40 * sc, 24, 10 * sc);
        }
        stroke(c, P, P.muted, .6, 3); seg(c, cx - 80, cy, cx + 80, cy);
      }
    },
  }],
  ["letter-soup", "motion", "orange", ["Buchstabensuppe", "Buchstaben kreisen in Wirbeln"], ["Zuppa di lettere", "Lettere che girano nei vortici"], {
    init: E => swarm(E, dens(E, 9000, 40, 140), i => ({ ch: ABC[i % 26], r: 40 + R() * 220, a: R() * TAU, cx: R() < .5 ? .2 : .8 })),
    draw(c, s, E) {
      const { P } = E;
      for (const l of s) {
        l.a += E.dt * .0004 * (300 / (l.r + 60));
        const x = E.w * l.cx + Math.cos(l.a) * l.r, y = E.h * .5 + Math.sin(l.a) * l.r * .7;
        fill(c, P, L(P, l.i), .4); at(c, x, y, l.a + Math.PI / 2, 1, () => text(c, l.ch, 0, 0, 14 + l.z * 14, 600));
      }
    },
  }],
  ["ladder", "motion", "yellow", ["Bibliotheksleiter", "Die Leiter rollt am Regal entlang"], ["Scala della biblioteca", "La scala scorre lungo lo scaffale"], {
    init: () => { const r = rnd(121); return many(200, () => [12 + r() * 16, 50 + r() * 40, r() * 6 | 0]); },
    draw(c, s, E) {
      const { P } = E, rows = 4, rowH = (E.h - 40) / rows;
      for (let i = 1; i <= rows; i++) {
        const y = 20 + i * rowH; fill(c, P, P.line, 1); c.fillRect(0, y, E.w, 5);
        let x = 0, k = i * 40; while (x < E.w) { const [bw, bh, col] = s[k++ % s.length]; spine(c, P, x, y, bw, Math.min(bh, rowH - 14), L(P, col), .25); x += bw + 2; }
      }
      const lx = E.w * (.5 + .45 * Math.sin(E.t / 5000));
      stroke(c, P, P.c.orange, .6, 3); seg(c, lx, 14, lx + 60, E.h); seg(c, lx + 40, 14, lx + 100, E.h);
      for (let y = 40; y < E.h; y += 34) { const k = y / E.h; seg(c, lx + 60 * k, y, lx + 40 + 60 * k, y); }
      stroke(c, P, P.muted, .6, 2); seg(c, 0, 14, E.w, 14);
    },
  }],
  ["thread", "motion", "red", ["Roter Faden", "Ein Faden zieht sich durch die Seite"], ["Filo rosso", "Un filo rosso che attraversa la pagina"], {
    init: () => ({ pts: [], a: 0, x: 0, y: 0 }),
    draw(c, s, E) {
      if (!s.pts.length) { s.x = E.w * .1; s.y = E.h * .5; }
      for (let i = 0; i < 2; i++) {
        s.a += (noise(E.t / 1400, 7) - .5) * .25 + Math.sin(E.t / 3000) * .02;
        s.x += Math.cos(s.a) * 3; s.y += Math.sin(s.a) * 3;
        if (s.x < 30 || s.x > E.w - 30 || s.y < 30 || s.y > E.h - 30) s.a += Math.PI * .6;
        s.x = clamp(s.x, 0, E.w); s.y = clamp(s.y, 0, E.h); s.pts.push([s.x, s.y]);
      }
      if (s.pts.length > 1600) s.pts.splice(0, 2);
      stroke(c, E.P, E.P.c.red, .55, 2); c.lineJoin = "round"; path(c, s.pts); c.stroke();
    },
  }],
  ["stack-grow", "motion", "green", ["Stapel wächst", "Buch für Buch wird der Stapel höher"], ["La pila cresce", "Libro dopo libro la pila si alza"], {
    init: () => { const r = rnd(122); return many(40, () => [70 + r() * 50, 12 + r() * 14, (r() - .5) * 14, r() * 6 | 0]); },
    draw(c, s, E) {
      const { P } = E, n = Math.floor(mod(E.t / 600, 32));
      for (const x0 of [E.w * .1, E.w * .9 - 120]) {
        let y = E.h - 4, off = 0;
        for (let i = 0; i < n; i++) {
          const [bw, bh, d, col] = s[i]; off += d; y -= bh; if (y < 20) break;
          const drop = i === n - 1 ? (1 - mod(E.t / 600, 1)) ** 2 * 40 : 0;
          fill(c, P, L(P, col), .4); c.fillRect(x0 + off, y - drop, bw, bh);
        }
      }
    },
  }],
  ["page-counter", "motion", "mauve", ["Seitenzähler", "Seitenzahlen rollen wie ein Zählwerk"], ["Contapagine", "Numeri di pagina che scorrono come un contatore"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 200, (x, y, i, j) => {
        const v = E.t / (400 + (i + j) % 5 * 230) + i * 37 + j * 91;
        for (let d = 0; d < 3; d++) {
          const val = v / 10 ** d, digit = Math.floor(val) % 10, frac = d ? 0 : val % 1, cx = x + 140 - d * 40;
          fill(c, P, P.surface, .9); c.fillRect(cx - 18, y + 70, 36, 50); stroke(c, P, P.line, 1); c.strokeRect(cx - 18, y + 70, 36, 50);
          c.save(); c.beginPath(); c.rect(cx - 18, y + 70, 36, 50); c.clip();
          fill(c, P, L(P, i + j), .6); text(c, String(digit), cx, y + 95 - frac * 50, 28, 600); text(c, String((digit + 1) % 10), cx, y + 145 - frac * 50, 28, 600);
          c.restore();
        }
      });
    },
  }],
  ["credits", "motion", "blue", ["Abspann", "Klassikertitel ziehen nach oben"], ["Titoli di coda", "Titoli classici che scorrono verso l'alto"], {
    draw(c, s, E) {
      const { P } = E, cols = Math.max(1, Math.floor(E.w / 240)), lineH = 34, total = TITLES.length * lineH;
      for (let k = 0; k < cols; k++) {
        const off = mod(E.t * (.012 + k % 3 * .004), total), x = (k + .5) * E.w / cols;
        for (let i = 0; i < TITLES.length * 3; i++) {
          const y = E.h + 20 - off + (i - TITLES.length) * lineH; if (y < -20 || y > E.h + 20) continue;
          fill(c, P, i % 2 ? L(P, k) : P.fg, i % 2 ? .45 : .15); text(c, TITLES[(i + k * 5) % TITLES.length], x, y, i % 4 ? 14 : 18, i % 2 ? 400 : 600);
        }
      }
    },
  }],
  ["quill", "motion", "mauve", ["Federkiel", "Eine Feder schreibt verschnörkelt"], ["Penna d'oca", "Una piuma che scrive con svolazzi"], {
    draw(c, s, E) {
      const { P } = E, k = mod(E.t / 7000, 1), y0 = E.h * .5;
      const pt = u => [E.w * .08 + u * E.w * .84 + Math.cos(u * 60) * 14, y0 + Math.sin(u * 60) * 22 + Math.sin(u * 9) * 30];
      stroke(c, P, P.fg, .4, 2); c.beginPath();
      for (let u = 0; u <= k; u += .002) { const [x, y] = pt(u); u ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      const [tx, ty] = pt(k);
      at(c, tx, ty, -.9 + Math.sin(E.t / 300) * .08, 1, () => {
        fill(c, P, P.c.mauve, .5); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(30, -60, 10, -140); c.quadraticCurveTo(-10, -70, 0, 0); c.fill();
        stroke(c, P, P.muted, .6); seg(c, 0, 0, 12, -130);
      });
    },
  }],
  ["bookmark-rain", "motion", "red", ["Lesezeichenregen", "Lesezeichen trudeln herab"], ["Pioggia di segnalibri", "Segnalibri che cadono volteggiando"], {
    init: E => swarm(E, dens(E, 30000, 10, 40), () => ({ v: .02 + R() * .03, col: R() * 6 | 0 })),
    draw(c, s, E) {
      const { P } = E;
      for (const b of s) {
        b.y = wrap(b.y + b.v * E.dt, E.h, 80);
        at(c, b.x + Math.sin(E.t / 900 + b.ph) * 30, b.y, Math.sin(E.t / 700 + b.ph) * .7, 1, () => {
          fill(c, P, L(P, b.col), .45); c.save(); c.scale(Math.cos(E.t / 500 + b.ph), 1); path(c, [[-8, -40], [8, -40], [8, 36], [0, 28], [-8, 36]], true); c.fill(); c.restore();
        });
      }
    },
  }],
  ["wire-books", "motion", "blue", ["Drahtbücher", "Drehende Bücher als Drahtmodell"], ["Libri in fil di ferro", "Libri che ruotano in wireframe"], {
    init: E => swarm(E, dens(E, 80000, 4, 12), () => ({ col: R() * 6 | 0, s: 40 + R() * 40 })),
    draw(c, s, E) {
      const { P } = E;
      for (const b of s) {
        const a = E.t / 2500 + b.ph, ca = Math.cos(a), sa = Math.sin(a), tilt = .5;
        const pts = [[-1, -1.4, -.25], [1, -1.4, -.25], [1, 1.4, -.25], [-1, 1.4, -.25], [-1, -1.4, .25], [1, -1.4, .25], [1, 1.4, .25], [-1, 1.4, .25]].map(([x, y, z]) => {
          const X = x * ca - z * sa, Z = x * sa + z * ca, Y = y * Math.cos(tilt) - Z * Math.sin(tilt);
          return [b.x + X * b.s * .6, b.y + Y * b.s * .6];
        });
        stroke(c, P, L(P, b.col), .55, 1.5);
        for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) seg(c, pts[i][0], pts[i][1], pts[j][0], pts[j][1]);
      }
    },
  }],
  ["page-curl", "motion", "orange", ["Eselsohren", "Seitenecken biegen sich hoch"], ["Orecchie", "Angoli di pagina che si piegano"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 140, (x, y, i, j) => {
        const k = (Math.sin(E.t / 1300 + i * .7 + j * 1.1) + 1) / 2 * 40;
        fill(c, P, P.surface, .9); path(c, [[x + 10, y + 10], [x + 130, y + 10], [x + 130, y + 130 - k], [x + 130 - k, y + 130], [x + 10, y + 130]], true); c.fill();
        stroke(c, P, P.line, 1); c.stroke();
        fill(c, P, L(P, i + j), .4); path(c, [[x + 130, y + 130 - k], [x + 130 - k, y + 130 - k], [x + 130 - k, y + 130]], true); c.fill();
      });
    },
  }],
  ["read-aloud", "motion", "green", ["Vorlesen", "Sprechblasen mit Pünktchen tauchen auf"], ["Lettura ad alta voce", "Nuvolette con puntini che compaiono"], {
    init: () => ({ list: [], next: 0 }),
    draw(c, s, E) {
      const { P } = E;
      if (E.t > s.next) { s.next = E.t + 1100; s.list.push({ x: 60 + R() * (E.w - 120), y: 60 + R() * (E.h - 120), t0: E.t, col: R() * 6 | 0, w: 70 + R() * 60 }); }
      s.list = s.list.filter(b => E.t - b.t0 < 6000);
      for (const b of s.list) {
        const age = (E.t - b.t0) / 6000, pop = clamp((E.t - b.t0) / 250, 0, 1), a = (1 - age) * pop;
        at(c, b.x, b.y, 0, .6 + .4 * pop, () => {
          fill(c, P, L(P, b.col), .35 * a); rrect(c, -b.w / 2, -24, b.w, 48, 20); c.fill(); path(c, [[-10, 22], [-22, 40], [4, 22]], true); c.fill();
          fill(c, P, P.fg, .5 * a); for (let k = 0; k < 3; k++) dot(c, -14 + k * 14, Math.sin(E.t / 200 + k) * 3, 4);
        });
      }
    },
  }],
  ["newspaper", "motion", "blue", ["Zeitungsspalten", "Spalten mit Schlagzeilen ziehen vorbei"], ["Colonne di giornale", "Colonne con titoli che scorrono"], {
    init: () => { const r = rnd(123); return many(60, () => ({ head: r() < .18, w: .5 + r() * .5 })); },
    draw(c, s, E) {
      const { P } = E, colW = 160, n = Math.ceil(E.w / colW) + 1;
      for (let k = 0; k < n; k++) {
        const off = mod(E.t * .008 * (k % 2 ? 1 : -1), s.length * 14), x = k * colW + 14;
        for (let i = 0; i < s.length * 2; i++) {
          const y = i * 14 - off; if (y < -14 || y > E.h + 14) continue;
          const l = s[(i + k * 7) % s.length];
          fill(c, P, l.head ? P.fg : P.muted, l.head ? .3 : .15); c.fillRect(x, y, (colW - 28) * (l.head ? 1 : l.w), l.head ? 9 : 4);
        }
        stroke(c, P, P.line, 1); seg(c, x - 7, 0, x - 7, E.h);
      }
    },
  }],
  // ----- touch -----
  ["pull-out", "touch", "mauve", ["Herausziehen", "Bücher rutschen dem Zeiger entgegen"], ["Estrarre", "I libri scivolano verso il puntatore"], {
    init: E => {
      const r = rnd(124), books = [], rows = Math.max(2, Math.floor(E.h / 150));
      for (let i = 1; i <= rows; i++) { let x = 0; const y = i * E.h / rows - 6; while (x < E.w) { const bw = 12 + r() * 16; books.push({ x, y, bw, bh: 70 + r() * 50, col: r() * 6 | 0, out: 0 }); x += bw + 2; } }
      return books;
    },
    draw(c, s, E) {
      const { P } = E; let moving = false;
      for (const b of s) {
        const goal = near(E, b.x + b.bw / 2, b.y - b.bh / 2, 140); b.out += (goal - b.out) * Math.min(1, E.dt / 100); if (Math.abs(goal - b.out) > .01) moving = true;
        spine(c, P, b.x, b.y - b.out * 26, b.bw, b.bh, L(P, b.col), .3 + b.out * .3);
      }
      for (const y of new Set(s.map(b => b.y))) { fill(c, P, P.line, 1); c.fillRect(0, y, E.w, 5); }
      return !moving && !E.ptr.on;
    },
  }],
  ["fan-pages", "touch", "yellow", ["Seitenfächer", "Die Seiten fächern sich zum Zeiger auf"], ["Ventaglio di pagine", "Le pagine si aprono a ventaglio verso il puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, E.w * .8, E.h * .3, 200), ox = E.w * .5, oy = E.h + 40;
      const target = Math.atan2(s.y - oy, s.x - ox);
      for (let k = 0; k < 24; k++) {
        const a = -Math.PI / 2 + (target + Math.PI / 2) * (.2 + f * .8) * (k / 23) + (k - 12) * .045;
        at(c, ox, oy, a + Math.PI / 2, 1, () => { fill(c, P, P.surface, .9); c.fillRect(-60, -E.h * .55, 120, E.h * .55); stroke(c, P, P.line, 1); c.strokeRect(-60, -E.h * .55, 120, E.h * .55); fill(c, P, L(P, k), .25); c.fillRect(-50, -E.h * .55 + 14, 100, 6); });
      }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["reveal-words", "touch", "blue", ["Verborgene Wörter", "Unter dem Zeiger tauchen Wörter auf"], ["Parole nascoste", "Sotto il puntatore compaiono parole"], {
    init: E => { const r = rnd(125), W = ["lesen", "leggere", "Buch", "libro", "Seite", "pagina", "Wort", "parola", "Geschichte", "storia", "Traum", "sogno"]; return { ws: many(dens(E, 7000, 40, 220), () => ({ x: r() * E.w, y: r() * E.h, w: W[r() * W.length | 0], col: r() * 6 | 0 })) }; },
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, -999, 90);
      for (const w of s.ws) { const k = f * Math.max(0, 1 - Math.hypot(w.x - s.x, w.y - s.y) / 180); fill(c, P, k > .02 ? L(P, w.col) : P.line, .15 + k * .7); text(c, w.w, w.x, w.y, 16 + k * 6, 600); }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["ribbon-rope", "touch", "red", ["Lesebändchen am Zeiger", "Ein Bändchen hängt am Zeiger und pendelt"], ["Nastrino al puntatore", "Un nastrino appeso al puntatore che oscilla"], {
    init: E => ({ pts: many(24, i => [E.w / 2, 40 + i * 14]), old: many(24, i => [E.w / 2, 40 + i * 14]) }),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, E.w * .5 + Math.sin(E.t / 1500) * E.w * .3, 30, 80);
      const p = s.pts, o = s.old;
      p[0] = [s.x, s.y];
      for (let i = 1; i < p.length; i++) { const vx = (p[i][0] - o[i][0]) * .98, vy = (p[i][1] - o[i][1]) * .98; o[i] = [...p[i]]; p[i] = [p[i][0] + vx, p[i][1] + vy + .6]; }
      for (let it = 0; it < 4; it++) for (let i = 1; i < p.length; i++) { const dx = p[i][0] - p[i - 1][0], dy = p[i][1] - p[i - 1][1], d = Math.hypot(dx, dy) || 1, k = (d - 14) / d; p[i][0] -= dx * k; p[i][1] -= dy * k; }
      stroke(c, P, P.c.red, .6, 10); c.lineCap = "round"; path(c, p); c.stroke(); c.lineCap = "butt";
      fill(c, P, P.c.red, .6); const e = p[p.length - 1]; path(c, [[e[0] - 6, e[1]], [e[0] + 6, e[1]], [e[0], e[1] + 12]], true); c.fill();
      return false;
    },
  }],
  ["spine-piano", "touch", "orange", ["Buchrücken-Klavier", "Tippen lässt Buchrücken hüpfen"], ["Pianoforte di dorsi", "Tocca per far saltare i dorsi"], {
    init: E => { const r = rnd(126), bs = []; let x = 0; while (x < E.w) { const bw = 16 + r() * 16; bs.push({ x, bw, bh: 90 + r() * 70, col: r() * 6 | 0, t0: -1e9 }); x += bw + 2; } return bs; },
    draw(c, s, E) {
      const { P } = E, y = E.h - 20;
      for (const tap of E.ptr.taps.splice(0)) for (const b of s) if (Math.abs(tap.x - (b.x + b.bw / 2)) < 60) b.t0 = E.t + Math.abs(tap.x - b.x) * 2;
      let busy = false;
      for (const b of s) {
        const k = (E.t - b.t0) / 600, jump = k > 0 && k < 1 ? Math.sin(k * Math.PI) * 50 : 0; if (k < 1) busy = true;
        spine(c, P, b.x, y - jump, b.bw, b.bh, L(P, b.col), .35 + (jump ? .25 : 0));
      }
      fill(c, P, P.line, 1); c.fillRect(0, y, E.w, 6);
      return !busy;
    },
  }],
  ["text-ripple", "touch", "blue", ["Textwellen", "Tippen schlägt Wellen durch die Zeilen"], ["Onde nel testo", "Tocca per creare onde tra le righe"], {
    init: () => ({ drops: [] }),
    draw(c, s, E) {
      const { P } = E;
      for (const tap of E.ptr.taps.splice(0)) s.drops.push([tap.x, tap.y, E.t]);
      s.drops = s.drops.filter(d => E.t - d[2] < 3000);
      const r = rnd(127);
      for (let y = 20; y < E.h; y += 22) {
        let x = 20;
        while (x < E.w) {
          const ww = 20 + r() * 50; let dy = 0;
          for (const [dx0, dy0, t0] of s.drops) { const d = Math.hypot(x - dx0, y - dy0), front = (E.t - t0) * .4; dy += Math.sin((d - front) / 18) * 8 * Math.exp(-Math.abs(d - front) / 60) * (1 - (E.t - t0) / 3000); }
          fill(c, P, P.muted, .2); c.fillRect(x, y - 3 + dy, ww, 6); x += ww + 8;
        }
      }
      return !s.drops.length;
    },
  }],
  ["drawer", "touch", "mauve", ["Katalogschublade", "Die Karte unter dem Zeiger hebt sich"], ["Cassetto del catalogo", "La scheda sotto il puntatore si alza"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, 0, 80), n = Math.floor(E.w / 18), y0 = E.h * .62;
      for (let i = 0; i < n; i++) {
        const x = 9 + i * 18, k = f * Math.max(0, 1 - Math.abs(x - s.x) / 90);
        fill(c, P, P.surface, .95); c.fillRect(x - 60, y0 - 90 - k * 70, 120, 110); stroke(c, P, P.line, 1); c.strokeRect(x - 60, y0 - 90 - k * 70, 120, 110);
        if (i % 6 === 0) { fill(c, P, L(P, i / 6), .5); c.fillRect(x - 60, y0 - 100 - k * 70, 30, 12); }
      }
      fill(c, P, P.c.mauve, .35); c.fillRect(0, y0, E.w, E.h - y0);
      return f < .01 && !E.ptr.on;
    },
  }],
  ["scatter-letters", "touch", "green", ["Buchstaben ausweichen", "Ein Buchstabenraster weicht dem Zeiger"], ["Lettere in fuga", "Una griglia di lettere che evita il puntatore"], {
    init: E => { const ls = []; grid(E, 34, (x, y, i, j) => ls.push({ hx: x, hy: y, x, y, ch: ABC[mod(i * 5 + j * 3, 26)], col: mod(i + j, 6) })); return ls; },
    draw(c, s, E) {
      const { P } = E; let moving = false;
      for (const l of s) {
        const dx = l.hx - E.ptr.x, dy = l.hy - E.ptr.y, d = Math.hypot(dx, dy) || 1, push = E.ptr.on && !E.still ? Math.max(0, 1 - d / 120) * 50 : 0;
        const tx = l.hx + dx / d * push, ty = l.hy + dy / d * push, k = Math.min(1, E.dt / 120);
        l.x += (tx - l.x) * k; l.y += (ty - l.y) * k; if (Math.abs(tx - l.x) + Math.abs(ty - l.y) > .3) moving = true;
        fill(c, P, push ? L(P, l.col) : P.muted, push ? .6 : .2); text(c, l.ch, l.x, l.y, 14, 600);
      }
      return !moving && !E.ptr.on;
    },
  }],
  ["magnet-letters", "touch", "red", ["Magnetbuchstaben", "Bunte Buchstaben zieht es zum Zeiger"], ["Lettere magnetiche", "Lettere colorate attratte dal puntatore"], {
    init: E => swarm(E, dens(E, 14000, 30, 100), i => ({ ch: ABC[i % 26], col: i % 6, rot: (R() - .5) * .8, hx: 0, hy: 0 })),
    draw(c, s, E) {
      const { P } = E, on = E.ptr.on && !E.still;
      for (const l of s) {
        if (!l.hx) { l.hx = l.x; l.hy = l.y; }
        const tx = on ? E.ptr.x + Math.cos(l.ph) * (40 + l.i % 5 * 18) : l.hx, ty = on ? E.ptr.y + Math.sin(l.ph) * (40 + l.i % 5 * 18) : l.hy;
        const d = Math.hypot(l.hx - E.ptr.x, l.hy - E.ptr.y), pull = on && d < 260;
        const k = Math.min(1, E.dt / 300);
        l.x += ((pull ? tx : l.hx) - l.x) * k; l.y += ((pull ? ty : l.hy) - l.y) * k;
        fill(c, P, L(P, l.col), .55); at(c, l.x, l.y, l.rot, 1, () => text(c, l.ch, 0, 0, 26, 600));
      }
      return false;
    },
  }],
  ["tap-open", "touch", "green", ["Aufschlagen", "Tippen schlägt ein Buch auf"], ["Aprire", "Tocca per aprire un libro"], {
    init: () => ({ list: [] }),
    draw(c, s, E) {
      for (const tap of E.ptr.taps.splice(0)) s.list.push({ x: tap.x, y: tap.y, t0: E.t, col: R() * 6 | 0 });
      s.list = s.list.filter(b => E.t - b.t0 < 4000);
      for (const b of s.list) { const k = clamp((E.t - b.t0) / 600, .02, 1), fade = 1 - clamp((E.t - b.t0 - 2500) / 1500, 0, 1); openBook(c, E.P, b.x, b.y - 40, 50, L(E.P, b.col), .5 * fade, k); }
      return !s.list.length;
    },
  }],
]);
