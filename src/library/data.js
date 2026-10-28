/* Data of the book list: books.js (window.DSM_LIBRARY), recommendations.js, info.js – or their preview from the
   admin page (index.html#preview, localStorage dsm-preview*). books.js loads AFTER this script (large, ≈700 KB),
   so the header, opening hours and placeholders stand before it. */
import { store } from "@/lib/storage";

export const PREVIEW = location.hash === "#preview";

export const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();
// Key of the recommendations: title + first author
export const keyOf = b => norm(b.t) + "|" + norm((b.a && b.a[0]) || "");

const letterOf = t => {
  const c = String(t).replace(/^[^\p{L}\p{N}]+/u, "").normalize("NFD").charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
};

// Preview from the admin page, if present and valid
function preview(k, ok) {
  if (!PREVIEW) return null;
  const p = store.json(k);
  return p && ok(p) ? p : null;
}
export const previewBooks = () => preview("dsm-preview", p => Array.isArray(p.books));
export const previewRecs = () => preview("dsm-preview-recs", p => !!p.groups);
export const previewInfo = () => preview("dsm-preview-info", p => !!p.hours);

// ISBN-10 of a 978 ISBN-13: the same number as printed on books before 2007, so the search finds it as well
// (only in the search text, never shown)
function isbn10(i) {
  if (!/^978\d{10}$/.test(i)) return "";
  let s = 0;
  for (let k = 0; k < 9; k++) s += +i[3 + k] * (10 - k);
  const c = (11 - (s % 11)) % 11;
  return i.slice(3, 12) + (c === 10 ? "X" : c);
}

// Prepare books for list and search: running number, initial letter, search text
export function prepare(data) {
  const books = (data && data.books) || [];
  // Italian names of new categories, maintained in admin.html, complete categories-it.js
  if (data && data.catIt) window.DSM_CATEGORIES_IT = Object.assign({}, window.DSM_CATEGORIES_IT, data.catIt);
  books.forEach((b, i) => {
    b._i = i;
    b._l = letterOf(b.t);
    b._s = norm([b.t, b.s, (b.a || []).join(" "), (b.i || []).map(i => i + " " + isbn10(i)).join(" "), b.p].join(" "));
  });
  return books;
}

// Waits for books.js (classic script after this one). books.js sets window.DSM_LIBRARY = …; a setter reports
// that at the same moment (DOMContentLoaded may be delayed after it). If the file is missing, the list stays empty.
export function loadBooks(done) {
  const p = previewBooks();
  if (p) return done(p);
  if (window.DSM_LIBRARY) return done(window.DSM_LIBRARY);
  let value, reported = false;
  const go = () => { if (!reported) { reported = true; done(value || null); } };
  Object.defineProperty(window, "DSM_LIBRARY", { configurable: true, enumerable: true, get: () => value, set: v => { value = v; go(); } });
  if (document.readyState !== "loading") go();
  else document.addEventListener("DOMContentLoaded", go, { once: true });
}
