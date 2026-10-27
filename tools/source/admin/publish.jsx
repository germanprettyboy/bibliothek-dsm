/* Publish, in this order:
   1. On the webspace (https) with save.php set up: one click, the file is online immediately.
      The key DSM_SAVE_KEY sits at the start of the encrypted plaintext (tools/encrypt-admin.js).
   2. Chrome/Edge (File System Access API) write straight into the website folder. The folder is chosen
      the first time and remembered in IndexedDB; it is checked that index.html is in it.
   3. Other browsers: download.
   Every publish is also kept in the local version history (versions.js); "Frühere Versionen" lists it and, online with
   save.php v3, the server backups as well. */
/* global DSM_SAVE_KEY */
import "./strings-versions";
import * as React from "react";
import { CheckIcon, DownloadIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardFooter, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { log } from "@/lib/storage";
import { useLanguage } from "@/lib/language";
import * as versions from "./versions";

export const FS = typeof window.showDirectoryPicker === "function";
const KEY = typeof DSM_SAVE_KEY === "string" ? DSM_SAVE_KEY : "";

// Shared state of all publish cards: chosen folder, last message per file, file in progress,
// save.php on the webspace (null = none, "ready", otherwise the reason: "access" | "not-writable"),
// v = its protocol version (3 and up: list and restore backups)
let state = { folder: null, message: {}, running: null, server: null, v: 0 };
const listeners = new Set();
const update = next => { state = { ...state, ...next }; listeners.forEach(fn => fn()); };
const message = (file, m) => update({ message: { ...state.message, [file]: m } });
const usePub = () => React.useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => state);

// IndexedDB "dsm-admin" store "kv" (the database is opened by versions.js, which also owns the store "versions")
function kv(mode, op) {
  return versions.openDB().then(db => new Promise((res, rej) => {
    const tx = db.transaction("kv", mode), q = op(tx.objectStore("kv"));
    tx.oncomplete = () => { db.close(); res(q.result); };
    tx.onerror = tx.onabort = () => { db.close(); rej(tx.error); };
  }));
}
// Load the remembered folder (without IndexedDB: choose the folder anew in every session)
if (FS) kv("readonly", st => st.get("website")).then(h => { if (h && !state.folder) update({ folder: h }); }).catch(() => {});
// Ask save.php (locally via double-click or without PHP: no JSON, everything stays as before)
if (/^https?:$/.test(location.protocol)) {
  fetch("save.php", { cache: "no-store" }).then(r => r.json()).then(j => {
    if (!j || j.dsm !== "save") return;
    update({ server: j.ready ? "ready" : j.reason || "access", v: Number(j.v) || 0 });
    log("Publish", j.ready ? (KEY ? "save.php ready: directly online" : "save.php ready, admin app without key (encrypt again)") : `save.php not set up: ${j.reason}`);
  }).catch(() => {});
}
const live = () => state.server === "ready" && !!KEY;

export function download(file, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/javascript;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = file;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function verify(dir) {
  try { await dir.getFileHandle("index.html"); } catch (e) { throw Object.assign(new Error("index.html missing"), { code: "pubWrong", o: dir.name }); }
}
async function chooseFolder() {
  const dir = await window.showDirectoryPicker({ id: "dsm-website", mode: "readwrite" });
  await verify(dir);
  update({ folder: dir });
  try { await kv("readwrite", st => st.put(dir, "website")); } catch (e) { /* then it only applies to this session */ }
  log("Publish", `website folder chosen: ${dir.name}`);
  return dir;
}
async function permit(dir) {
  const o = { mode: "readwrite" };
  if (!dir.queryPermission || (await dir.queryPermission(o)) === "granted") return;
  if ((await dir.requestPermission(o)) !== "granted") throw Object.assign(new Error("not permitted"), { code: "pubDenied" });
}
const failure = e => ({ type: "warn", key: (e && e.code) || "pubErr", vars: { o: (e && e.o) || "", m: (e && e.message) || String(e) } });

async function upload(file, text) {
  let r, j = null, answer = "";
  try {
    r = await fetch("save.php?file=" + encodeURIComponent(file), {
      method: "POST", cache: "no-store", body: text,
      headers: { "Content-Type": "text/javascript;charset=utf-8", "X-DSM-Key": KEY },
    });
  } catch (e) { throw Object.assign(new Error("website not reachable"), { code: "pubLiveErr" }); }
  try { answer = await r.text(); j = JSON.parse(answer); } catch (e) { /* no answer from save.php */ }
  if (r.ok && j && j.ok) return;
  const f = j && j.error;
  // Without an error code: status plus the start of the answer (PHP warning, host error page …), not just "HTTP 200"
  const start = answer.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
  throw Object.assign(new Error(f || `HTTP ${r.status}` + (start ? `: ${start}` : "")), { code: f === "key" ? "pubLiveKey" : "pubLiveErr" });
}

// save.php backup calls: answer as JSON, otherwise an error with code (like upload)
async function api(url, init) {
  let r, j = null, answer = "";
  try {
    r = await fetch(url, { cache: "no-store", ...init, headers: { "X-DSM-Key": KEY } });
  } catch (e) { throw Object.assign(new Error("website not reachable"), { code: "pubLiveErr" }); }
  try { answer = await r.text(); j = JSON.parse(answer); } catch (e) { /* no answer from save.php */ }
  if (r.ok && j && j.ok) return j;
  const f = j && j.error;
  const start = answer.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
  throw Object.assign(new Error(f || `HTTP ${r.status}` + (start ? `: ${start}` : "")), { code: f === "key" ? "pubLiveKey" : "pubLiveErr" });
}
const when = (time, lang) => new Date(time).toLocaleString(lang === "it" ? "it-IT" : "de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const kb = (size, lang) => Math.max(1, Math.round(size / 1024)).toLocaleString(lang === "it" ? "it-IT" : "de-DE") + " KB";
const textButton = "p-0 h-auto text-[length:inherit] font-normal text-foreground";

// Destructive actions need a second click within 4 s: confirm(id) is true on the second click
function useSure() {
  const [sure, setSure] = React.useState("");
  const timer = React.useRef(0);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const confirm = id => {
    if (sure !== id) {
      setSure(id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setSure(""), 4000);
      return false;
    }
    clearTimeout(timer.current);
    setSure("");
    return true;
  };
  return [sure, confirm];
}

// Server backups (save.php v3): loaded when the versions list opens, restoring needs a second click within 4 s
function ServerBackups({ file, heading }) {
  const { t, lang } = useLanguage();
  const [items, setItems] = React.useState(null);
  const [error, setError] = React.useState("");
  const [sure, confirm] = useSure();
  const [busy, setBusy] = React.useState(false);
  const load = async () => {
    setError("");
    try {
      const j = await api("save.php?backups");
      setItems((j.backups && j.backups[file]) || []);
      log("Publish", `${file}: ${((j.backups && j.backups[file]) || []).length} earlier versions on the website`);
    } catch (e) { setItems([]); setError(t("pubBackupsErr", { m: (e && e.message) || String(e) })); log("Publish", `${file}: list of earlier versions failed: ${(e && e.message) || e}`); }
  };
  React.useEffect(() => { load(); }, [file]); // eslint-disable-line react-hooks/exhaustive-deps
  const restore = async b => {
    if (!confirm(b.name)) return;
    setBusy(true);
    try {
      await api("save.php?restore=" + encodeURIComponent(b.name), { method: "POST" });
      message(file, { key: "pubRestored", vars: { d: when(b.time, lang) }, reload: true });
      log("Publish", `${file} restored from ${b.name}`);
      await load();
    } catch (e) {
      message(file, failure(Object.assign(e, { code: e && e.code === "pubLiveKey" ? "pubLiveKey" : "pubRestoreErr" })));
      log("Publish", `${file} not restored: ${(e && e.message) || e}`);
    } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-1.5" data-pub-backup-list={file}>
      {heading ? <span className="text-s font-medium">{t("verServer")}</span> : null}
      {items === null ? <p className="note m-0 text-s text-muted-foreground" data-pub-backups-loading>{t("pubBackupsLoading")}</p> : null}
      {error ? <p className="flag warn m-0" role="status">{error}</p> : null}
      {items && !items.length && !error ? <p className="note m-0 text-s text-muted-foreground" data-pub-backups-none>{t("pubBackupsNone")}</p> : null}
      {items && items.length ? (
        <ul className="m-0 grid list-none gap-1 p-0">
          {items.map(b => (
            <li key={b.name} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1" data-backup={b.name}>
              <span className="text-s">{when(b.time, lang)}<span className="text-muted-foreground">{" · "}{kb(b.size, lang)}</span></span>
              <Button variant="outline" size="sm" disabled={busy} data-restore onClick={() => restore(b)}>{t(sure === b.name ? "pubRestoreSure" : "pubRestore")}</Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// Restore a local version: write its text like a publish, then apply it to the app state; itself a new version (undo)
async function restoreVersion(file, v, lang) {
  let data;
  try { data = versions.parse(v.text); } catch (e) {
    message(file, { type: "warn", key: "verParseErr", vars: { m: (e && e.message) || String(e) } });
    log("Versions", `${file}: version ${v.id} not readable: ${(e && e.message) || e}`);
    return;
  }
  const d = when(v.time, lang);
  if (!live() && !FS) {
    download(file, v.text);
    versions.apply(file, data);
    message(file, { key: "verRestoredDl", vars: { d, f: file } });
    log("Versions", `${file}: version ${v.id} restored as a download`);
    versions.record(file, v.text, { note: "restored", live: false });
    return;
  }
  update({ running: file });
  try {
    const w = await write(file, v.text);
    versions.apply(file, data);
    message(file, { key: w.live ? "verRestoredLive" : "verRestoredFolder", vars: { d, f: file, o: w.o || "" } });
    log("Versions", `${file}: version ${v.id} restored`);
    versions.record(file, v.text, { note: "restored" });
  } catch (e) {
    if (!e || e.name !== "AbortError") { message(file, failure(e)); log("Versions", `${file}: version ${v.id} not restored: ${(e && e.message) || e}`); }
  } finally {
    update({ running: null });
  }
}

// Local versions of a file (versions.js), newest first: date, size, origin, "current", comparison line, restore
function LocalVersions({ file, heading }) {
  const { t, nf, df, lang } = useLanguage();
  const [items, setItems] = React.useState(null);
  const [sure, confirm] = useSure();
  const busy = usePub().running === file;
  React.useEffect(() => {
    let alive = true;
    const load = () => versions.list(file).then(l => { if (alive) setItems(l.map(v => ({ ...v, sum: versions.summary(file, v.text) }))); });
    load();
    const off = versions.subscribe(load);
    return () => { alive = false; off(); };
  }, [file]);
  const cur = versions.currentHash(file);
  const badge = "rounded-full px-2 text-s shadow-[inset_0_0_0_1px_var(--line)]";
  const origin = v => (v.source === "opened" ? "verOpened" : v.note === "restored" ? "verRestoredBadge" : v.note === "download" ? "verDownloaded" : "verPublished");
  const sumText = s => (s.key === "verBooks" ? t(s.key, { n: nf(s.n), d: df(s.d) }) : s.key === "verRecs" ? t(s.key, { n: nf(s.n), d: df(s.d) }) : t(s.key, { n: nf(s.n), s: s.s }));
  const restore = v => { if (confirm(String(v.id))) restoreVersion(file, v, lang); };
  let body;
  if (!versions.available()) body = <p className="note m-0 text-s text-muted-foreground" data-local-versions-nodb>{t("verNoDb")}</p>;
  else if (items === null) body = <p className="note m-0 text-s text-muted-foreground" data-local-versions-loading>{t("verLoading")}</p>;
  else if (!items.length) body = <p className="note m-0 text-s text-muted-foreground" data-local-versions-none>{t("verNone")}</p>;
  else {
    body = (
      <ul className="m-0 grid list-none p-0">
        {items.map(v => {
          const now = v.hash === cur;
          return (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border py-2 first:border-t-0"
              data-version={v.id} data-source={v.source} data-current={now ? "" : undefined}>
              <span className="grid min-w-0 gap-0.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-s">
                  <span>{when(v.time, lang)}<span className="text-muted-foreground">{" · "}{kb(v.size, lang)}</span></span>
                  <span className={badge}>{t(origin(v))}</span>
                  {now ? <span className={cn(badge, "shadow-[inset_0_0_0_1.5px_var(--green)]")} data-version-current>{t("verCurrent")}</span> : null}
                </span>
                {v.sum ? <span className="text-s text-muted-foreground" data-version-summary>{sumText(v.sum)}</span> : null}
              </span>
              {now ? null : (
                <Button variant="outline" size="sm" disabled={busy} data-local-restore onClick={() => restore(v)}>
                  {t(sure === String(v.id) ? "pubRestoreSure" : "pubRestore")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <div className="grid gap-1.5" data-local-versions={file}>
      {heading ? <span className="text-s font-medium">{t("verLocal")}</span> : null}
      {body}
    </div>
  );
}

// "Earlier versions": one opener, local versions and (online, save.php v3) the server backups
function Versions({ file, server }) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mt-3 grid gap-3" data-versions={file}>
      <div>
        <Button variant="ghost" size="text" className={textButton} data-versions-open data-pub-backups={server ? "" : undefined}
          aria-expanded={open} onClick={() => setOpen(o => !o)}>{t("pubBackups")}</Button>
      </div>
      {open ? <LocalVersions file={file} heading={server} /> : null}
      {open && server ? <ServerBackups file={file} heading /> : null}
    </div>
  );
}

// Write a text in the current mode (online via save.php, otherwise into the website folder): { live, o = folder name }
async function write(file, text) {
  if (live()) {
    await upload(file, text);
    log("Publish", `${file} saved on the website (${text.length} characters)`);
    return { live: true };
  }
  let dir = state.folder;
  if (dir) await permit(dir); else dir = await chooseFolder();
  await verify(dir);
  const w = await (await dir.getFileHandle(file, { create: true })).createWritable();
  await w.write(text);
  await w.close();
  log("Publish", `${file} written to "${dir.name}" (${text.length} characters)`);
  return { live: false, o: dir.name };
}

// build() returns { text, done }: done() runs after a successful write (the new state counts as published)
async function publish(file, build, lang) {
  const { text, done } = build();
  if (!live() && !FS) {
    download(file, text);
    versions.record(file, text, { note: "download", live: false });
    return;
  }
  update({ running: file });
  try {
    const z = new Date().toLocaleTimeString(lang === "it" ? "it-IT" : "de-DE", { hour: "2-digit", minute: "2-digit" });
    const w = await write(file, text);
    message(file, w.live ? { key: "pubLiveOk", vars: { f: file, z } } : { key: "pubOk", vars: { f: file, o: w.o, z } });
    done();
    versions.record(file, text);
  } catch (e) {
    if (!e || e.name !== "AbortError") { message(file, failure(e)); log("Publish", `${file} not saved: ${(e && e.message) || e}`); }
  } finally {
    update({ running: null });
  }
}
async function changeFolder(file) {
  try { await chooseFolder(); message(file, null); } catch (err) { if (!err || err.name !== "AbortError") message(file, failure(err)); }
}

// Card "Publish": note, button, preview, further buttons (children), message and folder line
export function Publish({ file, build, ids, alt, howKey, preview, onPreview, children, after }) {
  const { t, lang } = useLanguage();
  const z = usePub(), m = z.message[file];
  const online = z.server === "ready" && !!KEY, direct = online || FS;
  // Online one click is self-explanatory: no note (data-mode stays as a hook)
  const how = online ? ""
    : FS ? t(z.folder ? "pubHowOn" : "pubHow", { f: file, o: z.folder ? z.folder.name : "" }) : t("pubNoFs") + " " + t(howKey);
  const mode = online ? "online" : FS ? "folder" : "download";
  // save.php found but not usable: say why
  const setup = !z.server || online ? null : z.server === "ready" ? "pubSetupOld" : z.server === "not-writable" ? "pubSetupWritable" : "pubSetupAccess";
  return (
    <Card>
      <CardTitle>{t("publishT")}</CardTitle>
      <p className="note m-0 text-s text-muted-foreground" id={ids.how} data-mode={mode} hidden={!how}>{how}</p>
      <CardFooter>
        <Button id={ids.button} disabled={z.running === file} onClick={() => publish(file, build, lang)}>
          {direct ? <CheckIcon aria-hidden="true" strokeWidth={2} /> : <DownloadIcon aria-hidden="true" strokeWidth={2} />}
          <span>{t(direct ? "pubBtn" : alt)}</span>
        </Button>
        {preview ? (
          <a className={buttonVariants({ variant: "outline" })} id={ids.preview} href="index.html#preview" target="_blank" rel="noopener" onClick={onPreview}>
            <span>{t("preview")}</span>
          </a>
        ) : null}
        {children}
      </CardFooter>
      <div className={cn("pub", (m || setup || (z.folder && !online)) && "mt-3 grid gap-2.5")} data-file={file}>
        {m ? <p className={cn("flag m-0", m.type)} role="status">{t(m.key, m.vars)}</p> : null}
        {m && m.reload ? <div><Button variant="outline" size="sm" data-pub-reload onClick={() => location.reload()}>{t("pubReload")}</Button></div> : null}
        {setup ? <p className="note m-0 text-s text-muted-foreground" data-pub-setup>{t(setup)}</p> : null}
        {z.folder && !online ? (
          <p className="note m-0 text-s text-muted-foreground">
            {t("pubFolder", { o: z.folder.name })}{" · "}<Button variant="ghost" size="text" className={textButton} data-pub-change onClick={() => changeFolder(file)}>{t("pubChange")}</Button>
          </p>
        ) : null}
      </div>
      <Versions file={file} server={online && z.v >= 3} />
      {after}
    </Card>
  );
}
