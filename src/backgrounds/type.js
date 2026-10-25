/* Extra backgrounds 3/10: letters, writing systems, languages */
import { clear, TAU, clamp, mod, rnd, R, many, dens, wrap, A, L, fill, stroke, dot, ring, seg, path, rrect, curve, text, at, swarm, near, grid, follow, def } from "./kit.js";

const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GREEK = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω";
const PANGRAMS = ["Franz jagt im komplett verwahrlosten Taxi quer durch Bayern", "Quel vituperabile xenofobo zelante assaggia il whisky ed esclama alleluja",
  "Zwölf Boxkämpfer jagen Viktor quer über den großen Sylter Deich", "Pranzo d'acqua fa volti sghembi"];
const PAIRS = [["Buch", "libro"], ["lesen", "leggere"], ["Schule", "scuola"], ["Wort", "parola"], ["Seite", "pagina"], ["Freund", "amico"], ["Himmel", "cielo"],
  ["Stadt", "città"], ["Brücke", "ponte"], ["Sonne", "sole"], ["Mond", "luna"], ["Baum", "albero"], ["Fenster", "finestra"], ["Zeit", "tempo"]];
// Braille (6 dots: 1 2 3 left, 4 5 6 right) for A–Z
const BRAILLE = { a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5], f: [1, 2, 4], g: [1, 2, 4, 5], h: [1, 2, 5], i: [2, 4], j: [2, 4, 5],
  k: [1, 3], l: [1, 2, 3], m: [1, 3, 4], n: [1, 3, 4, 5], o: [1, 3, 5], p: [1, 2, 3, 4], q: [1, 2, 3, 4, 5], r: [1, 2, 3, 5], s: [2, 3, 4], t: [2, 3, 4, 5],
  u: [1, 3, 6], v: [1, 2, 3, 6], w: [2, 4, 5, 6], x: [1, 3, 4, 6], y: [1, 3, 4, 5, 6], z: [1, 3, 5, 6] };
const MORSE = { a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....", i: "..", j: ".---", k: "-.-", l: ".-..", m: "--", n: "-.",
  o: "---", p: ".--.", q: "--.-", r: ".-.", s: "...", t: "-", u: "..-", v: "...-", w: ".--", x: "-..-", y: "-.--", z: "--.." };
const WORDS = ["bibliothek", "biblioteca", "lesen", "leggere", "buch", "libro", "schule", "scuola", "milano", "dsm"];

function brailleCell(c, P, x, y, ch, r, col) {
  const dots = BRAILLE[ch] || [];
  for (let d = 1; d <= 6; d++) { const lit = dots.includes(d); fill(c, P, lit ? col : P.muted, lit ? .55 : .12); dot(c, x + (d > 3) * r * 2.6, y + ((d - 1) % 3) * r * 2.6, lit ? r : r * .5); }
}
// Morse of a word as [ [on?, length], ... ] in units
const morseUnits = w => [...w].flatMap(ch => [...(MORSE[ch] || "")].flatMap(m => [[1, m === "." ? 1 : 3], [0, 1]]).concat([[0, 2]]));

export default def("type", [
  ["braille", "still", "blue", ["Brailleschrift", "„Bibliothek“ in Punkten zum Ertasten"], ["Braille", "„Biblioteca“ in punti da toccare"], {
    draw(c, s, E) {
      const { P } = E, word = "bibliothek";
      for (let y = 30, k = 0; y < E.h; y += 44) for (let x = 20 + (k++ % 2) * 30; x < E.w; x += 26) brailleCell(c, P, x, y, word[Math.floor(x / 26) % word.length], 3.2, P.c.blue);
    },
  }],
  ["morse", "still", "orange", ["Morsezeichen", "Punkte und Striche: „LESEN“"], ["Codice Morse", "Punti e linee: „LEGGERE“"], {
    draw(c, s, E) {
      const { P } = E;
      for (let y = 24, row = 0; y < E.h; y += 30, row++) {
        const u = morseUnits(row % 2 ? "leggere" : "lesen"); let x = -mod(row * 37, 60);
        while (x < E.w) for (const [on, len] of u) { if (on) { fill(c, P, L(P, row), .45); rrect(c, x, y - 3, len * 7 - 2, 6, 3); c.fill(); } x += len * 7; }
      }
    },
  }],
  ["greek", "still", "mauve", ["Griechisch", "Alpha bis Omega, verstreut"], ["Greco", "Da alfa a omega, sparsi"], {
    draw(c, s, E) {
      const r = rnd(201), { P } = E;
      for (let i = 0; i < dens(E, 8000, 50, 180); i++) { fill(c, P, L(P, i), .2 + r() * .25); text(c, GREEK[r() * GREEK.length | 0], r() * E.w, r() * E.h, 18 + r() * 50, 500); }
    },
  }],
  ["diacritics", "still", "red", ["Umlaute & Akzente", "Ä Ö Ü ß neben à è é ì ò ù"], ["Dieresi e accenti", "Ä Ö Ü ß accanto a à è é ì ò ù"], {
    draw(c, s, E) {
      const r = rnd(202), { P } = E, CH = ["Ä", "Ö", "Ü", "ß", "ä", "ö", "ü", "à", "è", "é", "ì", "ò", "ù", "À", "È"];
      grid(E, 90, (x, y, i, j) => { const k = mod(i * 3 + j * 5, CH.length); fill(c, P, L(P, k < 4 ? 0 : 3), .3 + r() * .15); text(c, CH[k], x + 45 + (r() - .5) * 20, y + 45 + (r() - .5) * 20, 44, 600); });
    },
  }],
  ["ampersands", "still", "yellow", ["Et-Zeichen", "Das „&“ in allen Größen"], ["E commerciale", "La „&“ in ogni misura"], {
    draw(c, s, E) {
      const r = rnd(203), { P } = E;
      for (let i = 0; i < dens(E, 16000, 24, 90); i++) { fill(c, P, L(P, i), .2 + r() * .25); at(c, r() * E.w, r() * E.h, (r() - .5) * .6, 1, () => text(c, "&", 0, 0, 24 + r() * 110, r() < .5 ? 400 : 600)); }
    },
  }],
  ["punctuation", "still", "green", ["Satzzeichen", "Punkt, Komma, Fragezeichen …"], ["Punteggiatura", "Punto, virgola, punto di domanda …"], {
    draw(c, s, E) {
      const r = rnd(204), { P } = E, CH = [".", ",", ";", ":", "!", "?", "–", "(", ")", "…", "¿", "¡"];
      for (let i = 0; i < dens(E, 7000, 50, 200); i++) { fill(c, P, L(P, i), .3 + r() * .2); text(c, CH[r() * CH.length | 0], r() * E.w, r() * E.h, 20 + r() * 60, 600); }
    },
  }],
  ["anatomy", "still", "blue", ["Schriftanatomie", "Grundlinie, x-Höhe und Versalhöhe"], ["Anatomia del carattere", "Linea di base, altezza x e altezza delle maiuscole"], {
    draw(c, s, E) {
      const r = rnd(205), { P } = E;
      for (let y = 120; y < E.h + 100; y += 200) {
        stroke(c, P, P.c.red, .45); seg(c, 0, y, E.w, y);
        stroke(c, P, P.c.blue, .45); seg(c, 0, y - 52, E.w, y - 52); seg(c, 0, y - 74, E.w, y - 74);
        stroke(c, P, P.c.green, .35); seg(c, 0, y + 22, E.w, y + 22);
        fill(c, P, P.fg, .18); c.font = "600 104px \"Fira Sans\", system-ui, sans-serif"; c.textAlign = "left"; c.textBaseline = "alphabetic";
        let x = 20 - r() * 100; for (const w of ["Hxg", "Bibliothek", "Agy", "Libro"]) { c.fillText(w, x, y); x += c.measureText(w).width + 60; }
        fill(c, P, P.muted, .6); text(c, "Grundlinie", 8, y + 9, 10, 500, "left"); text(c, "x-Höhe", 8, y - 61, 10, 500, "left");
      }
    },
  }],
  ["specimen", "still", "mauve", ["Schriftmuster", "Aa Bb Cc in wachsenden Größen"], ["Campionario", "Aa Bb Cc in misure crescenti"], {
    draw(c, s, E) {
      const { P } = E;
      let y = 20, k = 0;
      while (y < E.h + 40) {
        const px = 12 + (k % 8) * 8;
        fill(c, P, L(P, k), .3); c.font = `${[400, 500, 600][k % 3]} ${px}px "Fira Sans", system-ui, sans-serif`; c.textAlign = "left"; c.textBaseline = "top";
        let line = ""; for (let i = 0; i < 26; i++) line += ABC[i] + ABC[i].toLowerCase() + " ";
        c.fillText(line + line, 12 - (k * 31) % 200, y); y += px * 1.4; k++;
      }
    },
  }],
  ["frieze", "still", "orange", ["Alphabetfries", "ABC-Leiste wie im Klassenzimmer"], ["Fregio dell'alfabeto", "Striscia ABC come in classe"], {
    draw(c, s, E) {
      const { P } = E;
      for (let y = 10, row = 0; y < E.h; y += 110, row++) for (let i = 0, x = 10 - row * 30; x < E.w; i++, x += 80) {
        const k = mod(i + row * 7, 26);
        fill(c, P, L(P, k), .25); rrect(c, x, y, 72, 96, 10); c.fill();
        fill(c, P, P.fg, .45); text(c, ABC[k] + ABC[k].toLowerCase(), x + 36, y + 48, 30, 600);
      }
    },
  }],
  ["word-cloud", "still", "blue", ["Wortwolke", "Deutsch und Italienisch durcheinander"], ["Nuvola di parole", "Tedesco e italiano mescolati"], {
    draw(c, s, E) {
      const r = rnd(206), { P } = E;
      for (let i = 0; i < dens(E, 6000, 40, 240); i++) {
        const [de, it] = PAIRS[r() * PAIRS.length | 0], isIt = r() < .5;
        fill(c, P, isIt ? L(P, i) : P.fg, isIt ? .4 : .14); at(c, r() * E.w, r() * E.h, r() < .2 ? -Math.PI / 2 : 0, 1, () => text(c, isIt ? it : de, 0, 0, 12 + (r() ** 2) * 50, isIt ? 400 : 600));
      }
    },
  }],
  ["roman", "still", "red", ["Römische Zahlen", "I V X L C D M"], ["Numeri romani", "I V X L C D M"], {
    draw(c, s, E) {
      const r = rnd(207), { P } = E;
      const rom = n => [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]].reduce((acc, [v, sy]) => { while (n >= v) { acc += sy; n -= v; } return acc; }, "");
      for (let i = 0; i < dens(E, 9000, 40, 160); i++) { fill(c, P, L(P, i), .25 + r() * .2); text(c, rom(1 + (r() * 2026 | 0)), r() * E.w, r() * E.h, 14 + r() * 30, 600); }
    },
  }],
  ["digits", "still", "green", ["Ziffern", "Große Ziffern als Umriss"], ["Cifre", "Grandi cifre in contorno"], {
    draw(c, s, E) {
      const r = rnd(208), { P } = E;
      for (let i = 0; i < dens(E, 30000, 10, 40); i++) { stroke(c, P, L(P, i), .45, 2); c.font = `600 ${80 + r() * 160}px "Fira Sans", system-ui, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.strokeText(String(i % 10), r() * E.w, r() * E.h); }
    },
  }],
  ["shorthand", "still", "mauve", ["Kurzschrift", "Schwungvolle Stenokürzel"], ["Stenografia", "Segni stenografici svolazzanti"], {
    draw(c, s, E) {
      const r = rnd(209), { P } = E;
      for (let y = 30; y < E.h; y += 40) {
        let x = 20;
        stroke(c, P, P.line, 1); seg(c, 0, y, E.w, y);
        while (x < E.w) {
          stroke(c, P, P.fg, .3, 1.6); c.beginPath(); c.moveTo(x, y);
          const k = r() * 4 | 0;
          if (k === 0) c.bezierCurveTo(x + 10, y - 26, x + 20, y - 26, x + 22, y); else if (k === 1) c.lineTo(x + 14, y - 18);
          else if (k === 2) c.arc(x + 8, y - 8, 8, Math.PI / 2, Math.PI * 2.4); else c.quadraticCurveTo(x + 14, y + 14, x + 26, y - 4);
          c.stroke(); x += 24 + r() * 26;
        }
      }
    },
  }],
  ["crossword", "still", "yellow", ["Kreuzworträtsel", "Gitter mit eingetragenen Wörtern"], ["Cruciverba", "Griglia con parole inserite"], {
    draw(c, s, E) {
      const r = rnd(210), { P } = E, sz = 34;
      grid(E, sz, (x, y, i, j) => {
        const black = r() < .17;
        fill(c, P, black ? P.fg : P.surface, black ? .25 : .7); c.fillRect(x, y, sz, sz); stroke(c, P, P.muted, .4); c.strokeRect(x, y, sz, sz);
        if (!black && r() < .45) { fill(c, P, P.fg, .4); text(c, ABC[r() * 26 | 0], x + sz / 2, y + sz / 2 + 2, 16, 500); }
        if (!black && r() < .12) { fill(c, P, P.muted, .6); text(c, String(1 + (r() * 60 | 0)), x + 3, y + 7, 8, 500, "left"); }
      });
    },
  }],
  ["tiles", "still", "orange", ["Buchstabensteine", "Spielsteine mit Punktwerten"], ["Tessere", "Tessere di lettere con punteggio"], {
    draw(c, s, E) {
      const r = rnd(211), { P } = E;
      for (let i = 0; i < dens(E, 7000, 40, 180); i++) at(c, r() * E.w, r() * E.h, (r() - .5) * .4, 1, () => {
        fill(c, P, P.c.yellow, .25); rrect(c, -20, -20, 40, 40, 5); c.fill(); stroke(c, P, P.c.orange, .5); c.stroke();
        fill(c, P, P.fg, .5); text(c, ABC[r() * 26 | 0], 0, 0, 22, 600); text(c, String(1 + (r() * 9 | 0)), 13, 12, 8, 600);
      });
    },
  }],
  ["keyboard", "still", "blue", ["Tastatur", "QWERTZ-Tasten in Reihen"], ["Tastiera", "Tasti QWERTZ in fila"], {
    draw(c, s, E) {
      const { P } = E, rows = ["1234567890ß", "QWERTZUIOPÜ", "ASDFGHJKLÖÄ", "YXCVBNM,.-"], k = 46;
      for (let oy = 10; oy < E.h; oy += rows.length * k + 30) for (let ox = 10; ox < E.w; ox += 12 * k + 30) rows.forEach((row, j) => [...row].forEach((ch, i) => {
        const x = ox + i * k + j * k * .35, y = oy + j * k;
        fill(c, P, P.surface, .95); rrect(c, x, y, k - 6, k - 6, 7); c.fill(); stroke(c, P, P.line, 1); c.stroke();
        fill(c, P, (ch === "F" || ch === "J") ? P.c.orange : P.fg, .45); text(c, ch, x + (k - 6) / 2, y + (k - 6) / 2, 14, 500);
      }));
    },
  }],
  ["typewriter-keys", "still", "mauve", ["Schreibmaschinentasten", "Runde Tasten mit Metallring"], ["Tasti della macchina da scrivere", "Tasti tondi con anello metallico"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 62, (x, y, i, j) => {
        const cx = x + 31 + (j % 2) * 31;
        stroke(c, P, P.muted, .5, 3); ring(c, cx, y + 31, 22); fill(c, P, P.fg, .12); dot(c, cx, y + 31, 19);
        fill(c, P, L(P, i + j), .6); text(c, ABC[mod(i * 7 + j * 11, 26)], cx, y + 32, 16, 600);
      });
    },
  }],
  ["phonetics", "still", "green", ["Lautschrift", "Zeichen des phonetischen Alphabets"], ["Alfabeto fonetico", "Simboli dell'alfabeto fonetico"], {
    draw(c, s, E) {
      const r = rnd(212), { P } = E, CH = ["ʃ", "ç", "ŋ", "ʁ", "ə", "ɛ", "ʊ", "ɔ", "ø", "œ", "ʒ", "ɲ", "ʎ", "ː", "ˈ", "θ"];
      for (let i = 0; i < dens(E, 8000, 40, 160); i++) { fill(c, P, L(P, i), .3 + r() * .2); text(c, (r() < .3 ? "[" : "") + CH[r() * CH.length | 0] + (r() < .3 ? "]" : ""), r() * E.w, r() * E.h, 18 + r() * 34, 500); }
    },
  }],
  ["sentence-tree", "still", "red", ["Satzbaum", "Satzglieder als Verzweigung"], ["Albero sintattico", "Parti del discorso come ramificazione"], {
    draw(c, s, E) {
      const r = rnd(213), { P } = E;
      const node = (x, y, depth, spread) => {
        fill(c, P, L(P, depth), .45); text(c, ["S", "NP", "VP", "N", "V", "Det"][depth % 6], x, y, 14, 600);
        if (depth >= 3) { fill(c, P, P.fg, .35); text(c, ["Buch", "liest", "das", "Kind", "libro", "legge"][r() * 6 | 0], x, y + 22, 12, 500); return; }
        for (const d of [-1, 1]) { stroke(c, P, P.muted, .4); seg(c, x, y + 9, x + d * spread, y + 56); node(x + d * spread, y + 66, depth + 1, spread / 2); }
      };
      for (let y = 30; y < E.h; y += 280) for (let x = 180; x < E.w + 100; x += 380) node(x + (r() - .5) * 60, y, 0, 90);
    },
  }],
  ["alphabets", "still", "blue", ["Alphabete", "Lateinisch, griechisch, kyrillisch nebeneinander"], ["Alfabeti", "Latino, greco e cirillico affiancati"], {
    draw(c, s, E) {
      const { P } = E, rows = [ABC, "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ", "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ"];
      for (let y = 30, k = 0; y < E.h; y += 46, k++) { fill(c, P, L(P, k), .3); const row = rows[k % 3]; let line = ""; while (line.length < E.w / 18) line += row + " "; text(c, line, 10 - (k * 23) % 200, y, 22, 500, "left"); }
    },
  }],
  // ----- motion -----
  ["typing", "motion", "blue", ["Tippen", "Pangramme entstehen Buchstabe für Buchstabe"], ["Digitare", "Pangrammi che si scrivono lettera per lettera"], {
    draw(c, s, E) {
      const { P } = E, lines = Math.max(1, Math.floor(E.h / 48)), per = 70;
      const k = Math.floor(E.t / per) % (lines * 60 + 40);
      c.font = "400 18px ui-monospace, Menlo, Consolas, monospace"; c.textAlign = "left"; c.textBaseline = "middle";
      for (let l = 0; l < lines; l++) {
        const sTxt = PANGRAMS[l % PANGRAMS.length], n = clamp(k - l * 60, 0, sTxt.length); if (!n && l) break;
        fill(c, P, P.fg, .25); c.fillText(sTxt.slice(0, n), 30, 40 + l * 48);
        if (n < sTxt.length && n > 0 || (l === 0 && !n)) { const x = 30 + c.measureText(sTxt.slice(0, n)).width; if (Math.floor(E.t / 500) % 2) { fill(c, P, P.c.blue, .7); c.fillRect(x + 2, 40 + l * 48 - 11, 2, 22); } }
      }
    },
  }],
  ["morse-lamp", "motion", "yellow", ["Morselampe", "Ein Licht blinkt „DSM“, das Band läuft mit"], ["Lampada Morse", "Una luce lampeggia „DSM“ e il nastro scorre"], {
    draw(c, s, E) {
      const { P } = E, u = morseUnits("dsm").concat([[0, 6]]), len = u.reduce((a, b) => a + b[1], 0), unit = 160, pos = mod(E.t / unit, len);
      let acc = 0, lit = false; for (const [on, l] of u) { if (pos >= acc && pos < acc + l) lit = !!on; acc += l; }
      for (const [x, y] of [[E.w * .1, E.h * .2], [E.w * .9, E.h * .8]]) {
        const g = c.createRadialGradient(x, y, 0, x, y, 120); g.addColorStop(0, P.c.yellow); g.addColorStop(1, clear(P.c.yellow));
        A(c, lit ? .6 : .08, P); c.fillStyle = g; c.fillRect(x - 120, y - 120, 240, 240);
        fill(c, P, P.c.orange, lit ? .9 : .3); dot(c, x, y, 16);
      }
      const y = E.h - 40, off = pos * 12; let x = E.w / 2 - off;
      for (let rep = 0; rep < 6; rep++) for (const [on, l] of u) { if (on) { fill(c, P, P.c.orange, .5); rrect(c, x, y - 4, l * 12 - 3, 8, 4); c.fill(); } x += l * 12; }
      stroke(c, P, P.muted, .6, 2); seg(c, E.w / 2, y - 14, E.w / 2, y + 14);
    },
  }],
  ["braille-wave", "motion", "green", ["Braillewelle", "Brailletafeln heben und senken sich"], ["Onda Braille", "Celle Braille che si alzano e si abbassano"], {
    draw(c, s, E) {
      const { P } = E, word = "leggere";
      for (let y = 30; y < E.h; y += 40) for (let x = 20; x < E.w; x += 24) {
        const k = (Math.sin(x / 120 + y / 90 - E.t / 700) + 1) / 2, ch = word[Math.floor(x / 24) % word.length], dots = BRAILLE[ch];
        for (let d = 1; d <= 6; d++) { const lit = dots.includes(d); fill(c, P, lit ? L(P, y / 40) : P.muted, lit ? .2 + k * .5 : .1); dot(c, x + (d > 3) * 8, y + ((d - 1) % 3) * 8, lit ? 2 + k * 1.8 : 1.4); }
      }
    },
  }],
  ["pulse-grid", "motion", "orange", ["Schriftgrade", "Buchstaben atmen in Größe"], ["Corpi", "Lettere che respirano cambiando misura"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 56, (x, y, i, j) => { const k = (Math.sin(i * .5 + j * .7 + E.t / 900) + 1) / 2; fill(c, P, L(P, i + j), .15 + k * .35); text(c, ABC[mod(i + j * 3, 26)], x + 28, y + 28, 12 + k * 30, k > .5 ? 600 : 400); });
    },
  }],
  ["alphabet-clock", "motion", "mauve", ["Buchstabenuhr", "Jedes Feld zählt das Alphabet durch"], ["Orologio di lettere", "Ogni casella scorre l'alfabeto"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 80, (x, y, i, j) => {
        const v = E.t / (500 + mod(i * 7 + j * 3, 9) * 120) + i * 3 + j * 5, a = Math.floor(v) % 26, f = v % 1;
        fill(c, P, L(P, i + j), .45 * (1 - f)); text(c, ABC[a], x + 40, y + 40, 40, 600);
        fill(c, P, L(P, i + j), .45 * f); text(c, ABC[(a + 1) % 26], x + 40, y + 40, 40, 600);
      });
    },
  }],
  ["flip-words", "motion", "red", ["Wendekarten", "Karten drehen sich: Deutsch ↔ Italienisch"], ["Carte girevoli", "Carte che girano: tedesco ↔ italiano"], {
    draw(c, s, E) {
      const { P } = E;
      grid(E, 170, (x, y, i, j) => {
        const k = mod(i * 3 + j * 5, PAIRS.length), ph = E.t / 2600 + i * .3 + j * .5, cs = Math.cos(ph * Math.PI), it = Math.floor(ph) % 2;
        at(c, x + 85, y + 85, 0, 1, () => {
          c.scale(Math.abs(cs) + .02, 1);
          fill(c, P, it ? L(P, k) : P.surface, it ? .3 : .9); rrect(c, -70, -44, 140, 88, 10); c.fill(); stroke(c, P, P.line, 1); c.stroke();
          fill(c, P, P.fg, .5); text(c, PAIRS[k][it ? 1 : 0], 0, 0, 20, it ? 400 : 600);
        });
      });
    },
  }],
  ["marquee", "motion", "blue", ["Laufschrift", "Pangramme ziehen in Bändern vorbei"], ["Scritta scorrevole", "Pangrammi che scorrono a fasce"], {
    draw(c, s, E) {
      const { P } = E;
      c.textBaseline = "middle"; c.textAlign = "left";
      for (let y = 30, k = 0; y < E.h; y += 52, k++) {
        const sTxt = PANGRAMS[k % PANGRAMS.length] + "   ·   ", px = k % 3 ? 18 : 28;
        c.font = `${k % 2 ? 400 : 600} ${px}px "Fira Sans", system-ui, sans-serif`;
        const w = c.measureText(sTxt).width, off = mod(E.t * (.02 + k % 4 * .008) * (k % 2 ? 1 : -1), w);
        fill(c, P, k % 2 ? L(P, k) : P.fg, k % 2 ? .4 : .12);
        for (let x = -off; x < E.w; x += w) c.fillText(sTxt, x, y);
      }
    },
  }],
  ["departure-board", "motion", "yellow", ["Fallblattanzeige", "Klappernde Anzeige wie in Milano Centrale"], ["Tabellone a palette", "Tabellone come a Milano Centrale"], {
    init: () => ({ cells: new Map() }),
    draw(c, s, E) {
      const { P } = E, rows = ["MILANO CENTRALE", "BIBLIOTHEK DSM", "LEGGERE  LESEN", "BINARIO 3", "ZURICH  BERN", "FIRENZE  ROMA"], cw = 22, ch = 32;
      for (let j = 0; j * (ch + 6) + 20 < E.h; j++) {
        const word = rows[(j + Math.floor(E.t / 9000)) % rows.length];
        for (let i = 0; i * cw + 20 < E.w; i++) {
          const x = 20 + i * cw, y = 20 + j * (ch + 6), target = word[i % (word.length + 6)] || " ";
          const key = i + "," + j; let cur = s.cells.get(key) || " ";
          if (cur !== target && R() < .3) { cur = cur === " " ? "A" : String.fromCharCode(cur.charCodeAt(0) + 1); if (cur > "Z") cur = " "; if (target !== " " && !ABC.includes(target)) cur = target; s.cells.set(key, cur); }
          fill(c, P, P.fg, .14); rrect(c, x, y, cw - 3, ch, 3); c.fill();
          stroke(c, P, P.bg, .5); seg(c, x, y + ch / 2, x + cw - 3, y + ch / 2);
          fill(c, P, P.c.yellow, cur === " " ? 0 : .9); text(c, cur, x + (cw - 3) / 2, y + ch / 2 + 1, 18, 600);
        }
      }
    },
  }],
  ["anagram", "motion", "green", ["Anagramm", "Die Buchstaben von „BIBLIOTHEK“ ordnen sich neu"], ["Anagramma", "Le lettere di „BIBLIOTECA“ si riordinano"], {
    init: () => ({ word: "BIBLIOTHEK", order: [...Array(10).keys()], from: [...Array(10).keys()], t0: 0 }),
    draw(c, s, E) {
      const { P } = E;
      if (E.t - s.t0 > 2400) { s.t0 = E.t; s.from = s.order; s.order = Math.floor(E.t / 2400) % 3 === 0 ? [...Array(10).keys()] : [...s.order].sort(() => R() - .5); }
      const k = clamp((E.t - s.t0) / 900, 0, 1), e = 1 - (1 - k) ** 3, sp = Math.min(70, E.w / 12);
      for (const [cy, it] of [[E.h * .25, 0], [E.h * .75, 1]]) {
        const word = it ? "BIBLIOTECA" : s.word;
        for (let i = 0; i < 10; i++) {
          const a = s.from.indexOf(i), b = s.order.indexOf(i), pos = a + (b - a) * e;
          const x = E.w / 2 + (pos - 4.5) * sp, y = cy - Math.sin(e * Math.PI) * 30 * (b > a ? 1 : -1);
          fill(c, P, L(P, i), .55); text(c, word[i], x, y, sp * .8, 600);
        }
      }
    },
  }],
  ["letter-rain", "motion", "blue", ["Buchstabenregen", "Sanft fallende Buchstabenketten"], ["Pioggia di lettere", "Catene di lettere che cadono piano"], {
    init: E => many(Math.ceil(E.w / 28), i => ({ x: i * 28 + 14, y: R() * E.h, v: .03 + R() * .05, n: 6 + R() * 14 | 0, col: R() * 6 | 0 })),
    draw(c, s, E) {
      const { P } = E;
      for (const d of s) {
        d.y += d.v * E.dt; if (d.y - d.n * 22 > E.h) { d.y = -10; d.v = .03 + R() * .05; }
        for (let k = 0; k < d.n; k++) { fill(c, P, L(P, d.col), (1 - k / d.n) * .5); text(c, ABC[mod(Math.floor(d.y / 22) - k + d.x, 26)], d.x, d.y - k * 22, 16, 600); }
      }
    },
  }],
  ["tittles", "motion", "red", ["Hüpfende i-Punkte", "Die Punkte über i und j springen"], ["Puntini che saltano", "I puntini di i e j che saltellano"], {
    draw(c, s, E) {
      const { P } = E, r = rnd(214);
      grid(E, 60, (x, y, i, j) => {
        const k = Math.abs(Math.sin(E.t / 400 + i * .9 + j * 1.3)), isJ = r() < .3;
        stroke(c, P, P.fg, .3, 5); c.lineCap = "round"; seg(c, x + 30, y + 30, x + 30, y + 52);
        if (isJ) { c.beginPath(); c.arc(x + 22, y + 52, 8, 0, Math.PI); c.stroke(); }
        c.lineCap = "butt"; fill(c, P, L(P, i + j), .7); dot(c, x + 30, y + 18 - k * 14, 4.5);
      });
    },
  }],
  ["umlaut-hop", "motion", "orange", ["Umlauttanz", "Die Pünktchen hopsen über A, O und U"], ["Danza delle dieresi", "I puntini saltellano sopra A, O e U"], {
    draw(c, s, E) {
      const { P } = E, base = ["A", "O", "U", "a", "o", "u"];
      grid(E, 70, (x, y, i, j) => {
        const k = mod(i + j, 6), h = Math.max(0, Math.sin(E.t / 350 + i + j * 2)) * 16;
        fill(c, P, P.fg, .3); text(c, base[k], x + 35, y + 42, 34, 600);
        fill(c, P, L(P, i * 2 + j), .7); dot(c, x + 28, y + 16 - h, 3.5); dot(c, x + 42, y + 16 - Math.max(0, Math.sin(E.t / 350 + i + j * 2 - .4)) * 16, 3.5);
      });
    },
  }],
  ["accents", "motion", "mauve", ["Fliegende Akzente", "Akzente segeln auf ihre Vokale"], ["Accenti in volo", "Gli accenti planano sulle vocali"], {
    draw(c, s, E) {
      const { P } = E, V = ["a", "e", "i", "o", "u"], AC = ["´", "`"];
      grid(E, 80, (x, y, i, j) => {
        const ph = mod(E.t / 2600 + i * .13 + j * .21, 1), land = Math.min(1, ph / .5), e = 1 - (1 - land) ** 3;
        fill(c, P, P.fg, .3); text(c, V[mod(i + j, 5)], x + 40, y + 46, 34, 500);
        const sx = x + 40 + (1 - e) * 60, sy = y + 18 - (1 - e) * 70;
        fill(c, P, L(P, i + j), ph < .85 ? .7 : (1 - ph) / .15 * .7); at(c, sx, sy, (1 - e) * 2, 1, () => text(c, AC[mod(i, 2)], 0, 0, 30, 600));
      });
    },
  }],
  ["sentence", "motion", "blue", ["Satzbau", "Wörter fliegen zu einem Satz zusammen"], ["Costruire frasi", "Le parole volano a formare una frase"], {
    init: E => ({ words: "Die Bibliothek ist offen · La biblioteca è aperta".split(" ").map((w, i) => ({ w, sx: R() * E.w, sy: R() * E.h, i })) }),
    draw(c, s, E) {
      const { P } = E, cyc = 8000, k = mod(E.t, cyc) / cyc, gather = k < .4 ? k / .4 : k < .7 ? 1 : 1 - (k - .7) / .3, e = gather * gather * (3 - 2 * gather);
      c.font = font600(26); let total = 0; const ws = s.words.map(o => { const wd = c.measureText(o.w).width; const r = { ...o, wd, tx: total }; total += wd + 14; return r; });
      const ox = (E.w - total) / 2, y = E.h / 2;
      for (const o of ws) { const x = o.sx + (ox + o.tx + o.wd / 2 - o.sx) * e, yy = o.sy + (y - o.sy) * e; fill(c, P, o.i > 4 ? L(P, o.i) : P.fg, .2 + e * .35); text(c, o.w, x, yy, 26, o.i > 4 ? 400 : 600); }
    },
  }],
  ["text-rings", "motion", "green", ["Kreisschrift", "Text läuft auf drehenden Ringen"], ["Scritta circolare", "Testo che gira su anelli rotanti"], {
    draw(c, s, E) {
      const { P } = E, msg = "BIBLIOTHEK · BIBLIOTECA · DEUTSCHE SCHULE MAILAND · SCUOLA GERMANICA DI MILANO · ";
      for (const [cx, cy] of [[E.w * .12, E.h * .5], [E.w * .88, E.h * .4]]) for (let k = 0; k < 4; k++) {
        const rr = 60 + k * 44, n = Math.floor(rr * TAU / 16), rot = E.t / (9000 + k * 3000) * (k % 2 ? 1 : -1);
        fill(c, P, L(P, k), .4);
        for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; at(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, a + Math.PI / 2, 1, () => text(c, msg[i % msg.length], 0, 0, 13, 600)); }
      }
    },
  }],
  ["spiral-text", "motion", "orange", ["Textspirale", "Ein Satz dreht sich nach innen"], ["Spirale di testo", "Una frase che gira verso l'interno"], {
    draw(c, s, E) {
      const { P } = E, msg = (PANGRAMS[0] + " · " + PANGRAMS[1] + " · ").repeat(3), cx = E.w / 2, cy = E.h / 2, rot = E.t / 8000;
      let a = 0;
      for (let i = 0; i < msg.length; i++) {
        const rr = 20 + a * 9; if (rr > Math.hypot(E.w, E.h) / 2) break;
        fill(c, P, L(P, i / 40), .35); at(c, cx + Math.cos(a + rot) * rr, cy + Math.sin(a + rot) * rr, a + rot + Math.PI / 2, 1, () => text(c, msg[i], 0, 0, 12 + rr / 40, 600));
        a += 14 / rr;
      }
    },
  }],
  ["wave-text", "motion", "blue", ["Wellenschrift", "Wortreihen schwingen wie Wasser"], ["Scritta ondulata", "File di parole che ondeggiano come acqua"], {
    draw(c, s, E) {
      const { P } = E;
      for (let y = 30, k = 0; y < E.h; y += 44, k++) {
        const word = PAIRS[k % PAIRS.length][k % 2] + " ";
        for (let x = 0, i = 0; x < E.w; x += 15, i++) { const ch = word[i % word.length]; fill(c, P, k % 2 ? L(P, k) : P.fg, k % 2 ? .45 : .15); text(c, ch, x, y + Math.sin(x / 70 + E.t / 700 + k) * 10, 18, 600); }
      }
    },
  }],
  ["echo", "motion", "mauve", ["Echo", "Ein Wort hallt in blassen Kopien nach"], ["Eco", "Una parola che risuona in copie sbiadite"], {
    draw(c, s, E) {
      const { P } = E;
      for (const [x0, y0, w, k] of [[E.w * .15, E.h * .3, "lesen", 0], [E.w * .85, E.h * .7, "leggere", 3], [E.w * .5, E.h * .1, "Buch", 1]]) for (let i = 7; i >= 0; i--) {
        const t = E.t / 1000 - i * .18;
        fill(c, P, L(P, k + i), i ? .08 + (7 - i) * .03 : .5); text(c, w, x0 + Math.sin(t) * 80, y0 + Math.cos(t * .7) * 50, 30 + i * 4, 600);
      }
    },
  }],
  ["number-stream", "motion", "green", ["Zahlenstrom", "Ziffern fließen in Bahnen"], ["Flusso di numeri", "Cifre che scorrono a corsie"], {
    draw(c, s, E) {
      const { P } = E;
      c.font = "500 14px ui-monospace, Menlo, Consolas, monospace"; c.textAlign = "left"; c.textBaseline = "middle";
      for (let y = 20, k = 0; y < E.h; y += 24, k++) {
        const v = Math.floor(E.t / (80 + k * 13)) + k * 1000; let line = "";
        for (let i = 0; i < E.w / 9; i++) line += String((v * 7 + i * (k + 3)) % 10);
        fill(c, P, L(P, k), .25); c.fillText(line, -(E.t * .01 * (k % 3 + 1)) % 9, y);
      }
    },
  }],
  ["punct-dance", "motion", "yellow", ["Satzzeichentanz", "Fragezeichen und Ausrufezeichen drehen sich"], ["Ballo della punteggiatura", "Punti interrogativi ed esclamativi che girano"], {
    init: E => swarm(E, dens(E, 14000, 20, 80), i => ({ ch: ["?", "!", "¿", "¡", "…", ";"][i % 6], col: i % 6, sz: 20 + R() * 40 })),
    draw(c, s, E) {
      for (const p of s) {
        p.x = wrap(p.x + p.vx * E.dt, E.w, 40); p.y = wrap(p.y + p.vy * E.dt, E.h, 40);
        fill(c, E.P, L(E.P, p.col), .4); at(c, p.x, p.y, Math.sin(E.t / 800 + p.ph) * 1.2, 1, () => text(c, p.ch, 0, 0, p.sz, 600));
      }
    },
  }],
  // ----- touch -----
  ["type-lens", "touch", "blue", ["Leselupe", "Kleine Buchstaben werden unter dem Zeiger groß"], ["Lente di lettura", "Lettere piccole che si ingrandiscono sotto il puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, -999, 80);
      grid(E, 20, (x, y, i, j) => { const d = Math.hypot(x - s.x, y - s.y), k = f * Math.max(0, 1 - d / 130); fill(c, P, k > .05 ? L(P, i + j) : P.muted, .18 + k * .6); text(c, ABC[mod(i * 7 + j * 3, 26)], x + 10, y + 10, 9 + k * 22, k > .4 ? 600 : 400); });
      return f < .01 && !E.ptr.on;
    },
  }],
  ["fisheye-words", "touch", "green", ["Wortlupe", "Wörter wölben sich zum Zeiger"], ["Lente sulle parole", "Le parole si gonfiano verso il puntatore"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, -999, 80);
      for (let y = 30, k = 0; y < E.h; y += 34, k++) for (let x = 20, i = 0; x < E.w; x += 120, i++) {
        const w = PAIRS[mod(i + k * 3, PAIRS.length)][mod(i + k, 2)], d = Math.hypot(x + 50 - s.x, y - s.y), m = f * Math.max(0, 1 - d / 200);
        const dx = (x + 50 - s.x) * m * .3, dy = (y - s.y) * m * .3;
        fill(c, P, m > .05 ? L(P, i + k) : P.muted, .2 + m * .5); text(c, w, x + 50 + dx, y + dy, 14 + m * 12, 600);
      }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["braille-touch", "touch", "orange", ["Braille ertasten", "Unter dem Zeiger heben sich die Punkte"], ["Braille al tatto", "Sotto il puntatore i punti si sollevano"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, -999, 80), word = "biblioteca";
      for (let y = 30; y < E.h; y += 36) for (let x = 20; x < E.w; x += 22) {
        const k = f * Math.max(0, 1 - Math.hypot(x - s.x, y - s.y) / 110), dots = BRAILLE[word[Math.floor(x / 22) % word.length]];
        for (let d = 1; d <= 6; d++) { const lit = dots.includes(d); fill(c, P, lit ? P.c.orange : P.muted, lit ? .2 + k * .6 : .08); dot(c, x + (d > 3) * 7, y + ((d - 1) % 3) * 7, lit ? 1.6 + k * 1.8 : 1.2); }
      }
      return f < .01 && !E.ptr.on;
    },
  }],
  ["morse-key", "touch", "red", ["Morsetaste", "Jedes Tippen wird ein Punkt auf dem Band"], ["Tasto Morse", "Ogni tocco diventa un punto sul nastro"], {
    init: () => ({ marks: [], last: 0 }),
    draw(c, s, E) {
      const { P } = E;
      for (const tap of E.ptr.taps.splice(0)) { s.marks.push({ t: E.t, long: E.t - s.last < 250 }); s.last = E.t; }
      if (s.marks.length > 60) s.marks.shift();
      const y = E.h / 2; fill(c, P, P.surface, .9); c.fillRect(0, y - 20, E.w, 40); stroke(c, P, P.line, 1); c.strokeRect(-1, y - 20, E.w + 2, 40);
      let x = E.w - 40;
      for (let i = s.marks.length - 1; i >= 0 && x > 0; i--) { const m = s.marks[i]; fill(c, P, P.c.red, .6); if (m.long) { rrect(c, x - 24, y - 5, 24, 10, 5); c.fill(); x -= 34; } else { dot(c, x - 5, y, 5); x -= 18; } }
      if (!s.marks.length) { fill(c, P, P.muted, .5); text(c, "· – ·", E.w / 2, y, 16, 600); }
      return true;
    },
  }],
  ["flap-touch", "touch", "yellow", ["Klappern", "Felder klappen um, wo der Zeiger vorbeistreicht"], ["Palette", "Le caselle girano dove passa il puntatore"], {
    init: E => { const cells = []; grid(E, 30, (x, y, i, j) => cells.push({ x, y, ch: ABC[mod(i * 3 + j * 5, 26)], flip: 0 })); return cells; },
    draw(c, s, E) {
      const { P } = E; let busy = false;
      for (const cell of s) {
        if (E.ptr.on && !E.still && Math.hypot(cell.x + 15 - E.ptr.x, cell.y + 15 - E.ptr.y) < 40 && cell.flip <= 0) cell.flip = 1;
        if (cell.flip > 0) { cell.flip -= E.dt / 350; busy = true; if (cell.flip <= .5 && !cell.done) { cell.ch = ABC[(ABC.indexOf(cell.ch) + 1) % 26]; cell.done = true; } if (cell.flip <= 0) cell.done = false; }
        const k = Math.abs(Math.cos(Math.max(0, cell.flip) * Math.PI));
        fill(c, P, P.fg, .12); c.fillRect(cell.x + 2, cell.y + 2 + 13 * (1 - k), 26, 26 * k);
        fill(c, P, P.c.orange, .55 * k); text(c, cell.ch, cell.x + 15, cell.y + 16, 15 * Math.max(k, .1), 600);
      }
      return !busy && !E.ptr.on;
    },
  }],
  ["word-trail", "touch", "mauve", ["Wortspur", "Der Zeiger schreibt „LESEN · LEGGERE“"], ["Scia di parole", "Il puntatore scrive „LEGGERE · LESEN“"], {
    init: () => ({ ls: [], k: 0 }),
    draw(c, s, E) {
      const { P } = E, msg = "LESEN · LEGGERE · ";
      if (E.ptr.on && !E.still) { const l = s.ls[s.ls.length - 1]; if (!l || Math.hypot(l.x - E.ptr.x, l.y - E.ptr.y) > 18) s.ls.push({ x: E.ptr.x, y: E.ptr.y, ch: msg[s.k++ % msg.length], t: E.t, a: l ? Math.atan2(E.ptr.y - l.y, E.ptr.x - l.x) : 0 }); }
      s.ls = s.ls.filter(l => E.t - l.t < 4000);
      for (const l of s.ls) { fill(c, P, L(P, l.ch.charCodeAt(0)), (1 - (E.t - l.t) / 4000) * .7); at(c, l.x, l.y, l.a, 1, () => text(c, l.ch, 0, 0, 22, 600)); }
      return !s.ls.length && !E.ptr.on;
    },
  }],
  ["caret", "touch", "blue", ["Schreibmarke", "Ein Textcursor folgt und markiert"], ["Cursore", "Un cursore di testo che segue ed evidenzia"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, E.w * .7, E.h * .5, 160);
      for (let y = 30; y < E.h; y += 30) { fill(c, P, P.muted, .14); c.fillRect(30, y - 4, E.w - 60, 8); }
      const row = Math.round((s.y - 30) / 30) * 30 + 30;
      fill(c, P, P.c.blue, .3 * f + .05); c.fillRect(Math.min(30, s.x), row - 12, Math.max(0, s.x - 30), 24);
      if (Math.floor(E.t / 500) % 2 || f > .5) { fill(c, P, P.fg, .6); c.fillRect(s.x, row - 14, 2, 28); }
      return false;
    },
  }],
  ["accent-drop", "touch", "red", ["Akzente setzen", "Tippen lässt Akzente auf Vokale fallen"], ["Mettere gli accenti", "Tocca per far cadere gli accenti sulle vocali"], {
    init: E => { const r = rnd(215), V = "aeiouAEIOU"; return { vs: many(dens(E, 9000, 30, 140), () => ({ x: r() * E.w, y: r() * E.h, ch: V[r() * 10 | 0], acc: null })) }; },
    draw(c, s, E) {
      const { P } = E;
      for (const tap of E.ptr.taps.splice(0)) for (const v of s.vs) if (Math.hypot(v.x - tap.x, v.y - tap.y) < 90) v.acc = { t0: E.t, ch: R() < .5 ? "´" : "`", col: R() * 6 | 0 };
      let busy = false;
      for (const v of s.vs) {
        fill(c, P, P.fg, .25); text(c, v.ch, v.x, v.y, 26, 500);
        if (v.acc) { const k = clamp((E.t - v.acc.t0) / 500, 0, 1), b = k < 1 ? (1 - k) * 40 : Math.abs(Math.sin((E.t - v.acc.t0) / 120)) * 3 * Math.max(0, 1 - (E.t - v.acc.t0 - 500) / 800); if (E.t - v.acc.t0 < 1300) busy = true; fill(c, P, L(P, v.acc.col), .7); text(c, v.acc.ch, v.x, v.y - 20 - b, 22, 600); }
      }
      return !busy;
    },
  }],
  ["crossword-touch", "touch", "orange", ["Rätselspur", "Zeile und Spalte unter dem Zeiger leuchten"], ["Traccia del cruciverba", "Riga e colonna sotto il puntatore si illuminano"], {
    init: () => ({}),
    draw(c, s, E) {
      const { P } = E, f = follow(s, E, -999, -999, 60), sz = 34, r = rnd(216);
      const ci = Math.floor(s.x / sz), cj = Math.floor(s.y / sz);
      grid(E, sz, (x, y, i, j) => {
        const black = r() < .16, hl = f > .1 && (i === ci || j === cj), letter = ABC[r() * 26 | 0];
        fill(c, P, black ? P.fg : hl ? P.c.yellow : P.surface, black ? .22 : hl ? .35 * f : .6); c.fillRect(x, y, sz, sz); stroke(c, P, P.muted, .35); c.strokeRect(x, y, sz, sz);
        if (!black && hl) { fill(c, P, P.fg, .5 * f); text(c, letter, x + sz / 2, y + sz / 2 + 2, 16, 600); }
      });
      return f < .01 && !E.ptr.on;
    },
  }],
  ["letter-bloom", "touch", "green", ["Buchstabenblüte", "Tippen lässt einen Buchstaben aufblühen"], ["Fioritura di lettere", "Tocca per far sbocciare una lettera"], {
    init: () => ({ list: [] }),
    draw(c, s, E) {
      const { P } = E;
      for (const tap of E.ptr.taps.splice(0)) s.list.push({ x: tap.x, y: tap.y, t0: E.t, ch: ABC[R() * 26 | 0], col: R() * 6 | 0 });
      s.list = s.list.filter(l => E.t - l.t0 < 3000);
      for (const l of s.list) {
        const k = (E.t - l.t0) / 3000, e = 1 - (1 - Math.min(1, k * 2)) ** 3;
        for (let p = 0; p < 8; p++) { fill(c, P, L(P, l.col + p), (1 - k) * .4); at(c, l.x + Math.cos(p / 8 * TAU) * e * 60, l.y + Math.sin(p / 8 * TAU) * e * 60, p / 8 * TAU, 1, () => text(c, l.ch, 0, 0, 18, 600)); }
        fill(c, P, L(P, l.col), (1 - k) * .7); text(c, l.ch, l.x, l.y, 30 + e * 50, 600);
      }
      return !s.list.length;
    },
  }],
]);

function font600(px) { return `600 ${px}px "Fira Sans", system-ui, sans-serif`; }
