/* Data of the book list: books.js (window.DSM_LIBRARY), recommendations.js, info.js – or their preview from the
   admin page (index.html#preview, localStorage dsm-preview*). books.js loads AFTER this script (large, ≈700 KB),
   so the header, opening hours and placeholders stand before it. */
import { store } from "@/lib/storage";

export const PREVIEW = location.hash === "#preview";

// Locations named "Archiv", "Archiv 1", "Archiv 2" … (WinBook "Standort"): the copy is kept in the archive. A title
// only counts as archived if every copy is there – one copy on a shelf can simply be taken.
const ARCHIVE = /^\s*archiv/i;
export const inArchive = b => !!(b && b.l && b.l.length) && b.l.every(s => ARCHIVE.test(s));
// Elements switched off in the admin page (info.js "hide"): "announcement" | "info" | "archive"
export const hiddenBy = (I, k) => !!(I && Array.isArray(I.hide) && I.hide.includes(k));

// Lower case, no accents, ß → ss, everything but a–z0–9 becomes one space (as in extract.js). Only the non-ASCII
// characters are folded, each once (cache): normalize("NFD") over every whole text was a third of the preparation.
const FOLD = new Map(), NON_ASCII = /[^\x00-\x7f]/g;
const foldChar = c => {
  let f = FOLD.get(c);
  if (f === undefined) FOLD.set(c, f = c.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss"));
  return f;
};
export const norm = s => String(s || "").toLowerCase().replace(NON_ASCII, foldChar).replace(/[^a-z0-9]+/g, " ").trim();
// Key of the recommendations: title + first author (prepared books carry it as _k)
export const keyOf = b => b._k || norm(b.t) + "|" + norm((b.a && b.a[0]) || "");

const LEAD = /^[^\p{L}\p{N}]+/u;
const letterOf = t => {
  const s = String(t), c0 = s.charCodeAt(0);
  if (c0 >= 65 && c0 <= 90) return s[0];               // A–Z: most titles
  if (c0 >= 97 && c0 <= 122) return s[0].toUpperCase(); // a–z
  const c = s.replace(LEAD, "").normalize("NFD").charAt(0).toUpperCase();
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

// Prepare books for list and search: running number, initial letter, search text, key of the recommendations.
// Every field is normalized once: the key is built from the same parts as the search text (before, title and author
// were normalized a second time for the key of all books – together a quarter of the work after books.js arrived).
export function prepare(data) {
  const books = (data && data.books) || [];
  // Italian names of new categories, maintained in admin.html, complete categories-it.js
  if (data && data.catIt) window.DSM_CATEGORIES_IT = Object.assign({}, window.DSM_CATEGORIES_IT, data.catIt);
  books.forEach((b, i) => {
    b._i = i;
    b._l = letterOf(b.t);
    const nt = norm(b.t), na = (b.a || []).map(norm);
    b._k = nt + "|" + (na[0] || "");
    const parts = [nt, norm(b.s), ...na];
    for (const x of b.i || []) parts.push(x, isbn10(x).toLowerCase());
    parts.push(norm(b.p));
    b._s = parts.filter(Boolean).join(" ");
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
