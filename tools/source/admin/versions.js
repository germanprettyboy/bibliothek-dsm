/* Local version history of the published files (books.js, recommendations.js, info.js), in every publishing mode.
   IndexedDB "dsm-admin" (shared with publish.jsx: store "kv" = chosen website folder), store "versions":
   { id, file, time, size, hash, text, note?, source: "published" | "opened" }, the newest 20 per file.
   On the first use of this module the currently published state of each file is recorded ("opened") if it differs from
   the newest entry; every publish records the written text ("published"). Restoring = publishing an earlier text again,
   then the restore handler of the file (registerRestore) applies it to the app state.
   Without IndexedDB (private window, Firefox under file://) there is no local history: available() → false. */
import { log } from "@/lib/storage";

export const FILES = ["books.js", "recommendations.js", "info.js"];
const KEEP = 20, MAX = 16 * 1024 * 1024; // characters; books.js is about 1 MB
const GLOBAL = { "books.js": "DSM_LIBRARY", "recommendations.js": "DSM_RECOMMENDATIONS", "info.js": "DSM_INFO" };

// ---------- database ----------
// Version 2 adds "versions"; both stores are created on every upgrade path (new database or version 1 with only "kv")
export function openDB() {
  return new Promise((res, rej) => {
    let r;
    try { r = indexedDB.open("dsm-admin", 2); } catch (e) { rej(e); return; }
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("versions")) db.createObjectStore("versions", { keyPath: "id", autoIncrement: true }).createIndex("file", "file");
    };
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error("database blocked"));
    r.onsuccess = () => { const db = r.result; db.onversionchange = () => db.close(); res(db); };
  });
}
// One transaction on one store: op(store) returns a request (its result is resolved) or nothing
function run(name, mode, op) {
  return openDB().then(db => new Promise((res, rej) => {
    let q;
    const tx = db.transaction(name, mode);
    tx.oncomplete = () => { db.close(); res(q && q.result); };
    tx.onerror = tx.onabort = () => { db.close(); rej(tx.error || new Error("transaction aborted")); };
    q = op(tx.objectStore(name));
  }));
}
const all = file => run("versions", "readonly", st => st.index("file").getAll(file))
  .then(l => (l || []).sort((a, b) => b.time - a.time || b.id - a.id));

// ---------- helpers ----------
// Cheap fingerprint: length + FNV-1a 32 bit
export function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return text.length + ":" + (h >>> 0).toString(16);
}
// `window.DSM_X = {...};` → data (header comment stripped, the JSON between the first "= " and the final ";")
export function parse(text) {
  const body = String(text || "").replace(/^\s*\/\*[\s\S]*?\*\//, "");
  const a = body.indexOf("= "), b = body.lastIndexOf(";");
  if (a < 0 || b <= a) throw new Error("no data");
  const data = JSON.parse(body.slice(a + 2, b));
  if (!data || typeof data !== "object") throw new Error("no data");
  return data;
}
// Same text as the publish builders (app.jsx booksFile, recommendations.jsx / info.jsx build)
function serialize(file, data) {
  if (file === "books.js") {
    const { books, ...meta } = data;
    return window.DSMExtract.toScript({ books }, meta);
  }
  const head = file === "info.js"
    ? "/* Opening hours, holidays and absences of the library of the Deutsche Schule Mailand. Maintained via admin.html – do not edit by hand. */\n"
    : "/* Book recommendations of the library of the Deutsche Schule Mailand. Maintained via admin.html – do not edit by hand. */\n";
  return head + "window." + GLOBAL[file] + " = " + JSON.stringify(data, null, 1).replace(/</g, "\\u003c") + ";\n";
}

// ---------- state: listeners, current published state per file ----------
const listeners = new Set();
const current = {}; // file → hash of the published text (snapshot, publish, restore)
let ok = typeof indexedDB !== "undefined";
const notify = () => listeners.forEach(fn => fn());
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const available = () => ok;
export const currentHash = file => current[file] || "";

// Restore handlers: file → fn(data) (app.jsx books.js, recommendations.jsx, info.jsx)
const handlers = {};
export function registerRestore(file, fn) {
  handlers[file] = fn;
  return () => { if (handlers[file] === fn) delete handlers[file]; };
}
export function apply(file, data) {
  if (handlers[file]) handlers[file](data);
  else window[GLOBAL[file]] = data;
}

// Store a text as the newest version (same text as the newest entry: only time/source updated)
async function put(file, text, source, note) {
  const h = hash(text);
  const list = await all(file);
  const top = list[0];
  if (top && top.hash === h) {
    if (source === "published") await run("versions", "readwrite", st => st.put({ ...top, time: Date.now(), source, ...(note ? { note } : {}) }));
    return false;
  }
  const entry = { file, time: Date.now(), size: text.length, hash: h, text, source };
  if (note) entry.note = note;
  const add = () => run("versions", "readwrite", st => {
    st.add(entry);
    list.slice(KEEP - 1).forEach(v => st.delete(v.id)); // newest 20 incl. the new one
  });
  try { await add(); } catch (e) {
    if (!e || e.name !== "QuotaExceededError" || !list.length) throw e;
    log("Versions", `${file}: storage full, dropping the oldest version`);
    await run("versions", "readwrite", st => st.delete(list[list.length - 1].id));
    list.pop();
    await add();
  }
  return true;
}

// Text of the currently published file: fetched on http(s), otherwise rebuilt from window.DSM_X (file://, fetch failed)
async function publishedText(file) {
  if (/^https?:$/.test(location.protocol)) {
    try {
      const r = await fetch(file, { cache: "no-store" });
      const text = r.ok ? await r.text() : "";
      if (text.indexOf("window." + GLOBAL[file] + " =") >= 0) return text;
      if (r.status === 404) return null; // not published yet
    } catch (e) { /* offline: rebuilt below */ }
  }
  const data = window[GLOBAL[file]];
  if (!data || typeof data !== "object") return null;
  if (file === "books.js" && !Array.isArray(data.books)) return null;
  return serialize(file, data);
}

// Snapshot of the opened state, once; record() waits for it so it never lands above a newer publish
let ready = null;
function start() {
  if (ready) return ready;
  // window.DSM_X before any publish changes it (publish replaces the globals), the fetch itself may come later
  const texts = FILES.map(publishedText);
  ready = (async () => {
    for (let n = 0; n < FILES.length; n++) {
      const file = FILES[n];
      let text = null;
      try { text = await texts[n]; } catch (e) { text = null; }
      if (!text) continue;
      current[file] = hash(text);
      if (!ok || text.length > MAX) continue;
      try {
        if (await put(file, text, "opened")) log("Versions", `${file}: opened state recorded (${text.length} characters)`);
      } catch (e) {
        ok = false;
        log("Versions", `local history unavailable: ${(e && e.message) || e}`);
      }
    }
    notify();
  })();
  return ready;
}

// After a successful write (publish, restore). live = the file on the website/in the folder is now this text
export async function record(file, text, { note = "", live = true } = {}) {
  await start();
  if (live) current[file] = hash(text);
  if (!ok) { notify(); return; }
  if (text.length > MAX) { log("Versions", `${file}: too large for the local history (${text.length} characters)`); notify(); return; }
  try {
    await put(file, text, "published", note);
    log("Versions", `${file}: version recorded (${text.length} characters${note ? ", " + note : ""})`);
  } catch (e) {
    log("Versions", `${file}: version not recorded: ${(e && e.message) || e}`);
  }
  notify();
}

// Versions of a file, newest first ([] without IndexedDB)
export async function list(file) {
  await start();
  if (!ok) return [];
  try { return await all(file); } catch (e) {
    ok = false;
    log("Versions", `local history unavailable: ${(e && e.message) || e}`);
    return [];
  }
}

// Short summary for the "comparison" line: { key, vars } for t(); books.js only by regex (the text can be 1 MB)
export function summary(file, text) {
  if (file === "books.js") {
    const c = /"count":(\d+)/.exec(text.slice(0, 2000)), u = /"updated":"([\d-]+)"/.exec(text.slice(0, 2000));
    return c ? { key: "verBooks", n: +c[1], d: u ? u[1] : "" } : null;
  }
  let d;
  try { d = parse(text); } catch (e) { return null; }
  if (file === "info.js") {
    const a = d.announcement && (d.announcement.de || d.announcement.it);
    const note = d.notice && (d.notice.de || d.notice.it);
    const n = Array.isArray(d.closures) ? d.closures.length : 0;
    const cut = s => (s.length > 48 ? s.slice(0, 47) + "…" : s);
    return { key: a ? "verInfoAnn" : note ? "verInfoNote" : "verInfo", s: cut(String(a || note || "")), n };
  }
  const n = Object.keys(d.groups || {}).reduce((s, g) => s + ((d.groups[g] || []).length), 0);
  return { key: "verRecs", d: d.updated || "", n };
}

start();
