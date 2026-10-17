/* Entry of the book list (index.html). Runs before books.js: first render immediately (flushSync),
   so the header, opening hours and placeholders stand while the large book list is still loading. */
import "@/styles.css";
import * as React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { setTitle } from "@/lib/language";
import { App } from "@/library/app";

setTitle();
const root = createRoot(document.getElementById("page"));
flushSync(() => root.render(<App />));
