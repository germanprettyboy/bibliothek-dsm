/* assets/backgrounds.js: 500 extra backgrounds, loaded by library/backdrop.jsx only when a visitor opens the gallery or
   chose one of them before. Classic script (IIFE): sets window.DSM_BACKGROUNDS = { list, topics } and calls
   window.DSM_BACKGROUNDS_READY if the page waits for it. Every variant: kit.js. */
import paper from "./paper.js";
import books from "./books.js";
import type from "./type.js";
import milan from "./milan.js";
import math from "./math.js";
import science from "./science.js";
import art from "./art.js";
import music from "./music.js";
import nature from "./nature.js";
import pattern from "./pattern.js";

const TOPICS = {
  paper: { de: "Papier & Schule", it: "Carta & scuola" },
  books: { de: "Bücher & Bibliothek", it: "Libri & biblioteca" },
  type: { de: "Schrift & Sprache", it: "Scrittura & lingue" },
  milan: { de: "Mailand & Italien", it: "Milano & Italia" },
  math: { de: "Mathematik", it: "Matematica" },
  science: { de: "Naturwissenschaften", it: "Scienze" },
  art: { de: "Kunst & Design", it: "Arte & design" },
  music: { de: "Musik & Klang", it: "Musica & suono" },
  nature: { de: "Natur & Jahreszeiten", it: "Natura & stagioni" },
  pattern: { de: "Muster & Generatives", it: "Motivi & arte generativa" },
};

const list = [...paper, ...books, ...type, ...milan, ...math, ...science, ...art, ...music, ...nature, ...pattern];
list.forEach((b, i) => { b.nr = i + 1; });

window.DSM_BACKGROUNDS = { list, topics: TOPICS };
if (typeof window.DSM_BACKGROUNDS_READY === "function") window.DSM_BACKGROUNDS_READY();
