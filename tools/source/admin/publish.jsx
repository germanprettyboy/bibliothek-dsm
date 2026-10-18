/* Publish, in this order:
   1. On the webspace (https) with save.php set up: one click, the file is online immediately.
      The key DSM_SAVE_KEY sits at the start of the encrypted plaintext (tools/encrypt-admin.js).
   2. Chrome/Edge (File System Access API) write straight into the website folder. The folder is chosen
      the first time and remembered in IndexedDB; it is checked that index.html is in it.
   3. Other browsers: download. */
/* global DSM_SAVE_KEY */
import * as React from "react";
import { CheckIcon, DownloadIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardFooter, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { log } from "@/lib/storage";
import { useLanguage } from "@/lib/language";

export const FS = typeof window.showDirectoryPicker === "function";
const KEY = typeof DSM_SAVE_KEY === "string" ? DSM_SAVE_KEY : "";

// Shared state of all publish cards: chosen folder, last message per file, file in progress,
// save.php on the webspace (null = none, "ready", otherwise the reason: "access" | "not-writable")
let state = { folder: null, message: {}, running: null, server: null };
const listeners = new Set();
const update = next => { state = { ...state, ...next }; listeners.forEach(fn => fn()); };
const message = (file, m) => update({ message: { ...state.message, [file]: m } });
const usePub = () => React.useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => state);

function kv(mode, op) {
  return new Promise((res, rej) => {
    const r = indexedDB.open("dsm-admin", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onerror = () => rej(r.error);
    r.onsuccess = () => {
      const db = r.result, tx = db.transaction("kv", mode), q = op(tx.objectStore("kv"));
      tx.oncomplete = () => { db.close(); res(q.result); };
      tx.onerror = tx.onabort = () => { db.close(); rej(tx.error); };
    };
  });
}
// Load the remembered folder (without IndexedDB: choose the folder anew in every session)
if (FS) kv("readonly", st => st.get("website")).then(h => { if (h && !state.folder) update({ folder: h }); }).catch(() => {});
// Ask save.php (locally via double-click or without PHP: no JSON, everything stays as before)
if (/^https?:$/.test(location.protocol)) {
  fetch("save.php", { cache: "no-store" }).then(r => r.json()).then(j => {
    if (!j || j.dsm !== "save") return;
    update({ server: j.ready ? "ready" : j.reason || "access" });
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
  let r, j = null;
  try {
    r = await fetch("save.php?file=" + encodeURIComponent(file), {
      method: "POST", cache: "no-store", body: text,
      headers: { "Content-Type": "text/javascript;charset=utf-8", "X-DSM-Key": KEY },
    });
  } catch (e) { throw Object.assign(new Error("website not reachable"), { code: "pubLiveErr" }); }
  try { j = await r.json(); } catch (e) { /* no answer from save.php */ }
  if (r.ok && j && j.ok) return;
  const f = j && j.error;
  throw Object.assign(new Error(f || `HTTP ${r.status}`), { code: f === "key" ? "pubLiveKey" : "pubLiveErr" });
}

// build() returns { text, done }: done() runs after a successful write (the new state counts as published)
async function publish(file, build, lang) {
  const { text, done } = build();
  if (!live() && !FS) { download(file, text); return; }
  update({ running: file });
  try {
    const z = () => new Date().toLocaleTimeString(lang === "it" ? "it-IT" : "de-DE", { hour: "2-digit", minute: "2-digit" });
    if (live()) {
      await upload(file, text);
      message(file, { key: "pubLiveOk", vars: { f: file, z: z() } });
      log("Publish", `${file} saved on the website (${text.length} characters)`);
    } else {
      let dir = state.folder;
      if (dir) await permit(dir); else dir = await chooseFolder();
      await verify(dir);
      const w = await (await dir.getFileHandle(file, { create: true })).createWritable();
      await w.write(text);
      await w.close();
      message(file, { key: "pubOk", vars: { f: file, o: dir.name, z: z() } });
      log("Publish", `${file} written to "${dir.name}" (${text.length} characters)`);
    }
    done();
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
  const how = online ? t("pubLiveHow", { f: file })
    : FS ? t(z.folder ? "pubHowOn" : "pubHow", { f: file, o: z.folder ? z.folder.name : "" }) : t("pubNoFs") + " " + t(howKey);
  // save.php found but not usable: say why
  const setup = !z.server || online ? null : z.server === "ready" ? "pubSetupOld" : z.server === "not-writable" ? "pubSetupWritable" : "pubSetupAccess";
  const textButton = "p-0 h-auto text-[length:inherit] font-normal text-foreground";
  return (
    <Card>
      <CardTitle>{t("publishT")}</CardTitle>
      <p className="note m-0 text-s text-muted-foreground" id={ids.how}>{how}</p>
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
        {setup ? <p className="note m-0 text-s text-muted-foreground" data-pub-setup>{t(setup)}</p> : null}
        {z.folder && !online ? (
          <p className="note m-0 text-s text-muted-foreground">
            {t("pubFolder", { o: z.folder.name })}{" · "}<Button variant="ghost" size="text" className={textButton} data-pub-change onClick={() => changeFolder(file)}>{t("pubChange")}</Button>
          </p>
        ) : null}
      </div>
      {after}
    </Card>
  );
}
