/*
 * Log: records every interaction continuously and formatted in the browser console.
 * Sits in <head> before all other scripts, so early events are captured too.
 *
 * Captured automatically: clicks (mouse, keyboard, script), input (debounced), switches, choices,
 * files, special keys, forms, dialogs (<dialog>) open/close, scrolling, window size,
 * visibility, network requests (fetch) and foreign images, writes to browser storage,
 * errors. Page scripts add entries with DSM_LOG("Area", "Text", {data}).
 *
 * Console: DSM_LOG.history() table of the session · DSM_LOG.asText() for copying
 *          DSM_LOG.off() switch off (stays saved) · DSM_LOG.on() switch on
 * Passwords and keys are never recorded.
 */
(function () {
  "use strict";
  const SP = Storage.prototype, origSet = SP.setItem, origGet = SP.getItem, origDel = SP.removeItem;
  const KEY = "dsm-log", HIST = "dsm-log-history", MAX = 500;
  const QUIET = new Set([KEY, HIST, "dsm-cover-v3"]); // own keys and cover cache (too frequent)
  const SECRET = /key|pass|pw|token/i;
  // s = storage or its name ("localStorage"); even accessing window.localStorage can throw in private mode
  const read = (s, k) => { try { return origGet.call(typeof s === "string" ? window[s] : s, k); } catch (e) { return null; } };
  const write = (s, k, v) => { try { origSet.call(typeof s === "string" ? window[s] : s, k, v); } catch (e) { /* private/blocked */ } };
  const remove = (s, k) => { try { origDel.call(window[s], k); } catch (e) { /* */ } };

  // One-time migration of the German-named keys (until October 2026)
  if (read("localStorage", "dsm-protokoll") === "aus") write("localStorage", KEY, "off");
  remove("localStorage", "dsm-protokoll"); remove("sessionStorage", "dsm-protokoll-verlauf");

  let on = read("localStorage", KEY) !== "off";

  // ---------- Output ----------
  const MONO = "font-family:ui-monospace,Menlo,Consolas,monospace";
  const SANS = "font-family:'Fira Sans',system-ui,sans-serif";
  const S = {
    time: `color:#8a8a8a;${MONO}`,
    badge: `padding:1px 6px;border-radius:3px;font-weight:600;${MONO}`,
    text: SANS,
    key: `color:#8a8a8a;${MONO}`,
    code: `background:rgba(128,128,128,.18);padding:1px 4px;border-radius:3px;${MONO}`,
  };
  // Logo colors as background, anthracite as text (readable in light and dark consoles)
  const COLOR = {
    Page: ["#333333", "#fff"], Click: ["#B5C9D0", "#333"], Key: ["#B5C9D0", "#333"],
    Input: ["#DDD300", "#333"], Search: ["#DDD300", "#333"], Choice: ["#B3CEA1", "#333"],
    Form: ["#B3CEA1", "#333"], File: ["#B3CEA1", "#333"], Dialog: ["#BA8EA7", "#333"],
    Notice: ["#BA8EA7", "#333"], Recommendation: ["#BA8EA7", "#333"], Scroll: ["#e2e2e2", "#333"],
    Network: ["#DB9F00", "#333"], Image: ["#DB9F00", "#333"], Cover: ["#DB9F00", "#333"],
    Storage: ["#e2e2e2", "#333"], Lock: ["#333333", "#fff"], Error: ["#A93A39", "#fff"],
  };
  const WIDTH = 10;
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  const clock = d => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  const duration = ms => ms < 1000 ? Math.round(ms) + " ms" : ms < 60000 ? (ms / 1000).toFixed(1) + " s"
    : Math.floor(ms / 60000) + " min " + Math.round(ms % 60000 / 1000) + " s";
  const short = (s, n = 60) => { s = String(s ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
  const size = n => n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " kB" : (n / 1048576).toFixed(1) + " MB";

  const page = location.pathname.split("/").pop() || "index.html";
  let hist = [];
  try { hist = JSON.parse(read("sessionStorage", HIST) || "[]") || []; } catch (e) { hist = []; }
  const earlier = hist.length;
  let saveT = 0, last = performance.now();

  function details(data) {
    if (data && typeof data === "object" && !Array.isArray(data) && !(data instanceof Error)) {
      const keys = Object.keys(data).filter(k => data[k] !== undefined && data[k] !== "");
      const w = Math.max(0, ...keys.map(k => k.length));
      keys.forEach(k => console.log(`%c${k.padEnd(w)}%c`, S.key, "", data[k]));
    } else console.log(data);
  }

  // Console output only after the frame (time and text are already fixed): formatting in the console, especially with
  // DevTools open, should not slow down the click and dialog animation. The order is kept.
  let queue = [], queueT = 0;
  const later = window.requestIdleCallback ? fn => requestIdleCallback(fn, { timeout: 300 }) : fn => setTimeout(fn, 50);
  function flush() { queueT = 0; const q = queue; queue = []; q.forEach(fn => fn()); }

  function log(area, text, data) {
    const now = performance.now(), d = new Date();
    const e = { time: clock(d), page, area, text: String(text) };
    hist.push(e); if (hist.length > MAX) hist.splice(0, hist.length - MAX);
    clearTimeout(saveT);
    saveT = setTimeout(() => write("sessionStorage", HIST, JSON.stringify(hist)), 800);
    const gap = "+" + duration(now - last);
    last = now;
    if (!on) return;
    const f = COLOR[area] || ["#333333", "#fff"];
    const head = [`%c${e.time} %c${gap.padStart(9)} %c${area.padEnd(WIDTH)}%c ${e.text}`,
      S.time, S.time, `background:${f[0]};color:${f[1]};${S.badge}`, S.text];
    const has = data !== undefined && data !== null && (typeof data !== "object" || Object.keys(data).length || data instanceof Error);
    queue.push(has ? () => { console.groupCollapsed(...head); details(data); console.groupEnd(); } : () => console.log(...head));
    if (!queueT) queueT = later(flush);
  }

  log.on = () => { on = true; write("localStorage", KEY, "on"); log("Page", "log switched on"); };
  log.off = () => { log("Page", "log switched off – DSM_LOG.on() switches it on again"); on = false; write("localStorage", KEY, "off"); };
  log.history = () => { console.table(hist.map(e => ({ Time: e.time, Page: e.page, Area: e.area, Text: e.text }))); return hist.length + " entries"; };
  log.asText = () => hist.map(e => `${e.time}  ${e.page.padEnd(10)}  ${e.area.padEnd(WIDTH)}  ${e.text}`).join("\n");
  log.clear = () => { hist = []; write("sessionStorage", HIST, "[]"); return "history cleared"; };
  window.DSM_LOG = log;

  // ---------- Describing elements ----------
  const txt = el => short(el && (el.innerText || el.textContent), 70);
  function kind(el) {
    const role = el.getAttribute("role");
    if (el.tagName === "INPUT") {
      if (el.type === "checkbox") return role === "switch" ? "switch" : "checkbox";
      return ({ radio: "option", search: "search field", password: "password field", file: "file picker", submit: "button", button: "button",
        date: "date field", time: "time field", number: "number field" })[el.type] || "field";
    }
    if (el.tagName === "A") return el.hasAttribute("download") ? "download" : "link";
    if (role === "radio") return "option";
    if (role === "switch") return "switch";
    if (role === "tab") return "tab";
    return ({ BUTTON: "button", SELECT: "select", TEXTAREA: "text area", SUMMARY: "disclosure", LABEL: "label", DIALOG: "dialog" })[el.tagName] || "element";
  }
  function name(el) {
    const al = el.getAttribute("aria-label");
    if (al) return short(al);
    if (el.labels && el.labels.length) { const l = el.labels[0]; return txt(l.querySelector("b, strong") || l); }
    if (el.tagName === "A" && el.download) return el.download;
    // buttons with a title line (list, recommendations, choices): only the title line
    const head = /^(BUTTON|A)$/.test(el.tagName) && el.querySelector("b, strong, .t");
    return txt(head) || txt(el) || el.getAttribute("title") || el.placeholder || (el.id ? "#" + el.id : "") || el.tagName.toLowerCase();
  }
  function dialogName(d) {
    const id = d.getAttribute("aria-labelledby"), h = id && document.getElementById(id);
    return txt(h) || d.getAttribute("aria-label") || (d.id ? "#" + d.id : "dialog");
  }
  const PLACES = [["header", "header"], [".bar", "search bar"], ["#recs", "recommendations"], ["#info", "opening hours"],
    ["main.books", "list"], ["footer", "footer"]];
  function place(el) {
    const d = el.closest("dialog, [role=dialog]");
    if (d) return `dialog "${dialogName(d)}"`;
    for (const [sel, n] of PLACES) if (el.closest(sel)) return n;
    // otherwise the nearest section with a heading (admin page), failing that its id
    for (let s = el.parentElement && el.parentElement.closest("section, fieldset, form, [id]"); s && s !== document.body; s = s.parentElement && s.parentElement.closest("section, fieldset, form, [id]")) {
      const h = s.querySelector("h1, h2, h3, legend");
      if (h && txt(h)) return `section "${txt(h)}"`;
      if (s.id) return "#" + s.id;
    }
    return "";
  }
  const who = el => `${kind(el)} "${name(el)}"`;
  const where = el => { const o = place(el); return o ? " · " + o : ""; };

  // ---------- Clicks ----------
  const CLICKABLE = "a, button, input, select, textarea, summary, label, [role=button], [role=radio], [role=switch], [role=tab], [tabindex]";
  document.addEventListener("click", e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.tagName === "DIALOG") { log("Click", `beside the dialog "${dialogName(t)}"`); return; }
    // scrim of the shadcn dialogs (Radix Dialog); the page reports opening/closing itself (src/components/glass-dialog.jsx)
    if (t.matches("[data-slot=dialog-overlay]")) { log("Click", "beside the dialog"); return; }
    const el = t.closest(CLICKABLE);
    if (!el) return;
    if (el.tagName === "LABEL" && el.control) return;                                  // follows as a click/change on the field
    if (el.tagName === "INPUT" && /^(checkbox|radio|file)$/.test(el.type)) return;      // captured as a change
    if (el.tagName === "INPUT" && !/^(submit|button|reset|image)$/.test(el.type)) return; // focus into the field, no action
    const how = !e.isTrusted ? " (by script)" : e.detail === 0 ? " (keyboard)" : "";
    const target = el.tagName === "A" && !el.hasAttribute("download") && el.getAttribute("href") ? { Target: el.getAttribute("href") } : undefined;
    log(el.matches("a[download]") ? "File" : "Click", who(el) + where(el) + how, target);
  }, true);

  // ---------- Input ----------
  const TEXT = /^(text|search|email|url|tel|number|password|date|time|datetime-local|month|week)$/;
  const inputT = new WeakMap();
  document.addEventListener("input", e => {
    const el = e.target;
    if (!(el instanceof Element) || el.closest("[data-log=own]")) return;
    const isText = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && TEXT.test(el.type)) || el.isContentEditable;
    if (!isText) return;
    clearTimeout(inputT.get(el));
    inputT.set(el, setTimeout(() => {
      if (el.type === "password") { log("Input", `${who(el)}${where(el)}: content is not logged`); return; }
      const v = el.isContentEditable ? el.textContent : el.value;
      log("Input", `${who(el)}${where(el)} = "${short(v, 60)}"`, v.length > 60 ? { Length: v.length + " characters" } : undefined);
    }, 600));
  }, true);

  document.addEventListener("change", e => {
    const el = e.target;
    if (!(el instanceof Element) || el.closest("[data-log=own]")) return;
    if (el.type === "checkbox") log("Choice", `${who(el)}${where(el)}: ${el.checked ? "on" : "off"}`);
    else if (el.type === "radio") { if (el.checked) log("Choice", `${who(el)}${where(el)} chosen`); }
    else if (el.tagName === "SELECT") log("Choice", `${who(el)}${where(el)} = "${short([...el.selectedOptions].map(o => o.text).join(", "))}"`);
    else if (el.type === "file") files("chosen", el.files, who(el));
  }, true);

  function files(how, list, source) {
    const fs = [...(list || [])];
    if (!fs.length) { log("File", `no file ${how}`); return; }
    log("File", `${fs.map(f => `"${f.name}" (${size(f.size)})`).join(", ")} ${how}${source ? " · " + source : ""}`,
      fs.length === 1 ? { Type: fs[0].type || "unknown", Modified: new Date(fs[0].lastModified).toLocaleString("en-GB") } : undefined);
  }
  document.addEventListener("drop", e => { if (e.dataTransfer) files("dropped", e.dataTransfer.files, place(e.target instanceof Element ? e.target : document.body)); }, true);

  document.addEventListener("submit", e => {
    const f = e.target;
    log("Form", `"${f.getAttribute("aria-label") || f.id || "form"}" submitted`);
  }, true);

  // ---------- Keys ----------
  document.addEventListener("keydown", e => {
    if (e.repeat || /^(Shift|Control|Alt|Meta|CapsLock)$/.test(e.key)) return;
    const el = e.target instanceof Element ? e.target : document.body;
    const combo = e.ctrlKey || e.metaKey || e.altKey;
    const field = el.closest("input, textarea, [contenteditable]");
    if (!combo && e.key !== "Escape" && !(e.key === "Enter" && field && el.tagName !== "TEXTAREA")) return;
    const k = [e.ctrlKey && "Ctrl", e.metaKey && "Cmd", e.altKey && "Alt", e.shiftKey && combo && "Shift", e.key.length === 1 ? e.key.toUpperCase() : e.key].filter(Boolean).join("+");
    log("Key", k + (el !== document.body ? " · " + who(el) + where(el) : ""));
  }, true);

  // ---------- Dialogs ----------
  const REASON = { x: "close button", backdrop: "click beside", cancel: "Escape", done: "choice made", no: "declined" };
  if (window.HTMLDialogElement) {
    const P = HTMLDialogElement.prototype;
    ["showModal", "show"].forEach(m => {
      const orig = P[m];
      P[m] = function () { const r = orig.apply(this, arguments); log("Dialog", `opened: "${dialogName(this)}"`); return r; };
    });
    document.addEventListener("close", e => {
      const d = e.target;
      if (d instanceof HTMLDialogElement) log("Dialog", `closed: "${dialogName(d)}"` + (d.returnValue ? ` (${REASON[d.returnValue] || d.returnValue})` : ""));
    }, true);
  }

  // ---------- Scrolling, size, visibility, navigation ----------
  let scrollT = 0, scrollFrom = null;
  addEventListener("scroll", () => {
    if (scrollFrom === null) scrollFrom = scrollY;
    clearTimeout(scrollT);
    scrollT = setTimeout(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const d = Math.round(scrollY - scrollFrom);
      scrollFrom = null;
      if (Math.abs(d) < 8) return;
      log("Scroll", `${d > 0 ? "down" : "up"} by ${Math.abs(d)} px · now at ${max > 0 ? Math.round(scrollY / max * 100) : 0} %`);
    }, 500);
  }, { passive: true, capture: true });

  let resizeT = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => log("Page", `window size ${innerWidth} × ${innerHeight}`), 500);
  });
  let hidden0 = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hidden0 = performance.now(); log("Page", "to the background (tab switched or minimized)"); }
    else log("Page", `visible again after ${duration(performance.now() - hidden0)}`);
  });
  addEventListener("hashchange", () => log("Page", `anchor ${location.hash || "(none)"}`));
  addEventListener("online", () => log("Network", "connection back"));
  addEventListener("offline", () => log("Network", "connection lost"));
  addEventListener("pagehide", () => { log("Page", `left after ${duration(performance.now())}`); write("sessionStorage", HIST, JSON.stringify(hist)); });
  const dark = matchMedia("(prefers-color-scheme: dark)");
  if (dark.addEventListener) dark.addEventListener("change", m => log("Page", `device switched to ${m.matches ? "dark" : "light"}`));

  // ---------- Errors ----------
  addEventListener("error", e => {
    const el = e.target;
    if (el && el !== window && el instanceof Element) { log("Error", `${el.tagName.toLowerCase()} not loaded: ${short(el.currentSrc || el.src || el.href, 90)}`); return; }
    log("Error", short(e.message, 120), { File: e.filename && `${e.filename}:${e.lineno}:${e.colno}`, Error: e.error });
  }, true);
  addEventListener("unhandledrejection", e => log("Error", "promise rejected: " + short(e.reason && (e.reason.message || e.reason), 120), { Reason: e.reason }));

  // ---------- Network ----------
  function target(url) {
    try {
      const u = new URL(url, location.href), p = u.searchParams;
      let extra = "";
      if (p.has("bibkeys")) extra = ` · ${p.get("bibkeys").split(",").length} ISBN`;
      else if (p.has("q")) extra = ` · ${short(p.get("q"), 40)}`;
      return (u.origin === location.origin ? "" : u.host) + u.pathname + extra;
    } catch (e) { return short(url, 80); }
  }
  if (window.fetch) {
    const origFetch = window.fetch;
    window.fetch = function (input, init) {
      const url = typeof input === "string" ? input : (input && input.url) || String(input);
      const t0 = performance.now();
      return origFetch.apply(this, arguments).then(r => {
        log("Network", `${r.status}${r.ok ? "" : " " + (r.statusText || "error")} ${target(url)} · ${duration(performance.now() - t0)}`, { Address: url });
        return r;
      }, err => {
        const reason = err && err.name === "AbortError" ? "aborted (time limit)" : "not reachable (offline, blocked or CORS)";
        log("Network", `${reason}: ${target(url)} · ${duration(performance.now() - t0)}`, { Address: url, Error: err });
        throw err;
      });
    };
  }
  // Foreign images (covers) via Resource Timing, without touching the loading logic
  if (window.PerformanceObserver) {
    try {
      new PerformanceObserver(list => list.getEntries().forEach(r => {
        if (r.initiatorType !== "img" || r.name.startsWith(location.origin)) return;
        log("Image", `${target(r.name)} · ${duration(r.duration)}`, { Address: r.name });
      })).observe({ type: "resource", buffered: false });
    } catch (e) { /* old browser */ }
  }

  // ---------- Browser storage ----------
  const storageName = s => { try { return s === sessionStorage ? "session" : "browser"; } catch (e) { return "browser"; } };
  function value(k, v) {
    if (SECRET.test(k)) return "(hidden)";
    v = String(v);
    return v.length > 120 ? `(${size(v.length)})` : `"${v}"`;
  }
  SP.setItem = function (k, v) {
    const before = QUIET.has(k) ? null : read(this, k);
    const r = origSet.call(this, k, v);
    if (!QUIET.has(k) && before !== String(v)) log("Storage", `${storageName(this)}: ${k} = ${value(k, v)}`);
    return r;
  };
  SP.removeItem = function (k) {
    const had = !QUIET.has(k) && read(this, k) !== null;
    const r = origDel.call(this, k);
    if (had) log("Storage", `${storageName(this)}: ${k} deleted`);
    return r;
  };

  // ---------- Start ----------
  if (on) {
    console.log("%cLibrary DSM%c  log of all interactions",
      `font-size:16px;font-weight:600;${SANS};border-left:4px solid #BA8EA7;padding:2px 0 2px 8px`, `color:#8a8a8a;${SANS}`);
    console.log("%cDSM_LOG.history()%c table  %cDSM_LOG.asText()%c for copying  %cDSM_LOG.off()%c switch off",
      S.code, "", S.code, "", S.code, "");
  }
  {
    // Immediately, before all other entries; settings straight from storage (head.js only runs afterwards)
    const L = k => read("localStorage", k), coarse = matchMedia("(pointer: coarse)").matches;
    const conn = navigator.connection, lang = L("dsm-lang");
    log("Page", `${page} opened` + (earlier ? ` · ${earlier} earlier entries of this session (DSM_LOG.history())` : ""), {
      Address: location.href,
      Language: lang === "de" || lang === "it" ? lang : (/^it\b/i.test(navigator.language || "") ? "it" : "de") + " (from the browser)",
      Theme: (({ light: "light", dark: "dark" })[L("dsm-theme")] || "automatic") + " · device " + (dark.matches ? "dark" : "light"),
      Font: L("dsm-font") === "large" ? "large" : "normal",
      Contrast: L("dsm-contrast") === "high" ? "high" : "normal",
      Window: `${innerWidth} × ${innerHeight} · pixel ratio ${devicePixelRatio}`,
      Pointer: coarse ? "touch" : "mouse/trackpad",
      Motion: matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "normal",
      Connection: conn ? [conn.effectiveType, conn.saveData && "data saver"].filter(Boolean).join(" · ") : undefined,
      Referrer: document.referrer || undefined,
      Browser: navigator.userAgent,
    });
  }
  addEventListener("load", () => log("Page", `fully loaded after ${duration(performance.now())}`));
})();
