/* Veröffentlichen, in dieser Reihenfolge:
   1. Auf dem Webspace (https) mit eingerichtetem speichern.php: ein Klick, die Datei ist sofort online.
      Schlüssel DSM_SPEICHERN_SCHLUESSEL steht vorn im verschlüsselten Klartext (werkzeuge/admin-verschluesseln.js).
   2. Chrome/Edge (File System Access API) schreiben direkt in den Website-Ordner. Der Ordner wird beim
      ersten Mal gewählt und in IndexedDB gemerkt; geprüft wird, dass index.html darin liegt.
   3. Andere Browser: Download. */
/* global DSM_SPEICHERN_SCHLUESSEL */
import * as React from "react";
import { CheckIcon, DownloadIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardFooter, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { log } from "@/lib/speicher";
import { useSprache } from "@/lib/sprache";

export const FS = typeof window.showDirectoryPicker === "function";
const SCHLUESSEL = typeof DSM_SPEICHERN_SCHLUESSEL === "string" ? DSM_SPEICHERN_SCHLUESSEL : "";

// Gemeinsamer Zustand aller Veröffentlichen-Karten: gewählter Ordner, letzte Meldung je Datei, laufende Datei,
// speichern.php auf dem Webspace (null = keins, "bereit", sonst Grund: "zugang" | "schreibrecht")
let zustand = { ordner: null, meldung: {}, laeuft: null, server: null };
const hoerer = new Set();
const setzen = neu => { zustand = { ...zustand, ...neu }; hoerer.forEach(fn => fn()); };
const meldung = (datei, m) => setzen({ meldung: { ...zustand.meldung, [datei]: m } });
const usePub = () => React.useSyncExternalStore(fn => { hoerer.add(fn); return () => hoerer.delete(fn); }, () => zustand);

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
// Gemerkten Ordner laden (ohne IndexedDB: Ordner in jeder Sitzung neu wählen)
if (FS) kv("readonly", st => st.get("website")).then(h => { if (h && !zustand.ordner) setzen({ ordner: h }); }).catch(() => {});
// speichern.php fragen (lokal per Doppelklick oder ohne PHP: kein JSON, alles bleibt wie bisher)
if (/^https?:$/.test(location.protocol)) {
  fetch("speichern.php", { cache: "no-store" }).then(r => r.json()).then(j => {
    if (!j || j.dsm !== "speichern") return;
    setzen({ server: j.bereit ? "bereit" : j.grund || "zugang" });
    log("Veröffentlichen", j.bereit ? (SCHLUESSEL ? "speichern.php bereit: direkt online" : "speichern.php bereit, Verwaltung ohne Schlüssel (neu verschlüsseln)") : `speichern.php nicht eingerichtet: ${j.grund}`);
  }).catch(() => {});
}
const live = () => zustand.server === "bereit" && !!SCHLUESSEL;

export function herunterladen(datei, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/javascript;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = datei;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function pruefen(dir) {
  try { await dir.getFileHandle("index.html"); } catch (e) { throw Object.assign(new Error("index.html fehlt"), { code: "pubWrong", o: dir.name }); }
}
async function ordnerWaehlen() {
  const dir = await window.showDirectoryPicker({ id: "dsm-website", mode: "readwrite" });
  await pruefen(dir);
  setzen({ ordner: dir });
  try { await kv("readwrite", st => st.put(dir, "website")); } catch (e) { /* gilt dann nur in dieser Sitzung */ }
  log("Veröffentlichen", `Website-Ordner gewählt: ${dir.name}`);
  return dir;
}
async function erlauben(dir) {
  const o = { mode: "readwrite" };
  if (!dir.queryPermission || (await dir.queryPermission(o)) === "granted") return;
  if ((await dir.requestPermission(o)) !== "granted") throw Object.assign(new Error("nicht erlaubt"), { code: "pubDenied" });
}
const fehler = e => ({ art: "warn", key: (e && e.code) || "pubErr", vars: { o: (e && e.o) || "", m: (e && e.message) || String(e) } });

async function hochladen(datei, text) {
  let r, j = null;
  try {
    r = await fetch("speichern.php?datei=" + encodeURIComponent(datei), {
      method: "POST", cache: "no-store", body: text,
      headers: { "Content-Type": "text/javascript;charset=utf-8", "X-DSM-Schluessel": SCHLUESSEL },
    });
  } catch (e) { throw Object.assign(new Error("Website nicht erreichbar"), { code: "pubLiveErr" }); }
  try { j = await r.json(); } catch (e) { /* keine Antwort von speichern.php */ }
  if (r.ok && j && j.ok) return;
  const f = j && j.fehler;
  throw Object.assign(new Error(f || `HTTP ${r.status}`), { code: f === "schluessel" ? "pubLiveKey" : "pubLiveErr" });
}

// bau() liefert { text, fertig }: fertig() läuft nach erfolgreichem Schreiben (neuer Stand gilt als veröffentlicht)
async function veroeffentlichen(datei, bau, lang) {
  const { text, fertig } = bau();
  if (!live() && !FS) { herunterladen(datei, text); return; }
  setzen({ laeuft: datei });
  try {
    const z = () => new Date().toLocaleTimeString(lang === "it" ? "it-IT" : "de-DE", { hour: "2-digit", minute: "2-digit" });
    if (live()) {
      await hochladen(datei, text);
      meldung(datei, { key: "pubLiveOk", vars: { f: datei, z: z() } });
      log("Veröffentlichen", `${datei} auf der Website gespeichert (${text.length} Zeichen)`);
    } else {
      let dir = zustand.ordner;
      if (dir) await erlauben(dir); else dir = await ordnerWaehlen();
      await pruefen(dir);
      const w = await (await dir.getFileHandle(datei, { create: true })).createWritable();
      await w.write(text);
      await w.close();
      meldung(datei, { key: "pubOk", vars: { f: datei, o: dir.name, z: z() } });
      log("Veröffentlichen", `${datei} in „${dir.name}“ geschrieben (${text.length} Zeichen)`);
    }
    fertig();
  } catch (e) {
    if (!e || e.name !== "AbortError") { meldung(datei, fehler(e)); log("Veröffentlichen", `${datei} nicht gespeichert: ${(e && e.message) || e}`); }
  } finally {
    setzen({ laeuft: null });
  }
}
async function wechseln(datei) {
  try { await ordnerWaehlen(); meldung(datei, null); } catch (err) { if (!err || err.name !== "AbortError") meldung(datei, fehler(err)); }
}

// Karte „Veröffentlichen“: Hinweis, Knopf, Vorschau, weitere Knöpfe (children), Meldung und Ordnerzeile
export function Veroeffentlichen({ datei, bau, ids, alt, howKey, vorschau, onVorschau, children, nachher }) {
  const { t, lang } = useSprache();
  const z = usePub(), m = z.meldung[datei];
  const online = z.server === "bereit" && !!SCHLUESSEL, direkt = online || FS;
  const how = online ? t("pubLiveHow", { f: datei })
    : FS ? t(z.ordner ? "pubHowOn" : "pubHow", { f: datei, o: z.ordner ? z.ordner.name : "" }) : t("pubNoFs") + " " + t(howKey);
  // speichern.php gefunden, aber nicht nutzbar: sagen, woran es liegt
  const einrichten = !z.server || online ? null : z.server === "bereit" ? "pubSetupAlt" : z.server === "schreibrecht" ? "pubSetupRecht" : "pubSetupZugang";
  const textKnopf = "p-0 h-auto text-[length:inherit] font-normal text-foreground";
  return (
    <Card>
      <CardTitle>{t("publishT")}</CardTitle>
      <p className="note m-0 text-s text-muted-foreground" id={ids.how}>{how}</p>
      <CardFooter>
        <Button id={ids.knopf} disabled={z.laeuft === datei} onClick={() => veroeffentlichen(datei, bau, lang)}>
          {direkt ? <CheckIcon aria-hidden="true" strokeWidth={2} /> : <DownloadIcon aria-hidden="true" strokeWidth={2} />}
          <span>{t(direkt ? "pubBtn" : alt)}</span>
        </Button>
        {vorschau ? (
          <a className={buttonVariants({ variant: "outline" })} id={ids.vorschau} href="index.html#vorschau" target="_blank" rel="noopener" onClick={onVorschau}>
            <span>{t("preview")}</span>
          </a>
        ) : null}
        {children}
      </CardFooter>
      <div className={cn("pub", (m || einrichten || (z.ordner && !online)) && "mt-3 grid gap-2.5")} data-datei={datei}>
        {m ? <p className={cn("flag m-0", m.art)} role="status">{t(m.key, m.vars)}</p> : null}
        {einrichten ? <p className="note m-0 text-s text-muted-foreground" data-pub-einrichten>{t(einrichten)}</p> : null}
        {z.ordner && !online ? (
          <p className="note m-0 text-s text-muted-foreground">
            {t("pubOrdner", { o: z.ordner.name })}{" · "}<Button variant="ghost" size="text" className={textKnopf} data-pub-wechseln onClick={() => wechseln(datei)}>{t("pubChange")}</Button>
          </p>
        ) : null}
      </div>
      {nachher}
    </Card>
  );
}
