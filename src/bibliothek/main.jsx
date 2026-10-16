/* Einstieg der Bücherliste (index.html). Läuft vor books.js: erstes Zeichnen sofort (flushSync),
   damit Kopf, Öffnungszeiten und Platzhalter stehen, während die große Bücherliste noch lädt. */
import "@/styles.css";
import * as React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { titelSetzen } from "@/lib/sprache";
import { App } from "@/bibliothek/app";

titelSetzen();
const root = createRoot(document.getElementById("seite"));
flushSync(() => root.render(<App />));
