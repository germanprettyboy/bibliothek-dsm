/*
 * Sperre der Verwaltung. Die eigentliche Verwaltungslogik liegt nur verschlüsselt vor
 * (assets/admin.enc.js, AES-GCM 256, Schlüssel per PBKDF2-SHA-256 aus dem Passwort).
 * Ohne Passwort gibt es im Quelltext nichts, was sich aufrufen oder freischalten ließe.
 * Das Passwort selbst steht nirgends in den Dateien. Kein Server nötig.
 */
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { log } from "@/lib/speicher";
import { woerter, useSprache } from "@/lib/sprache";

woerter({
  de: {
    pageTitle: "Bibliothek – Verwaltung", admTitle: "Verwaltung",
    lockT: "Geschützter Bereich", lockP: "Bitte das Passwort der Bibliothek eingeben.", lockPw: "Passwort",
    lockBtn: "Entsperren", lockWrong: "Das Passwort stimmt nicht.", lockWait: "Bitte {s} Sekunden warten.",
    lockBusy: "Wird geprüft …", lockBroken: "Die Verwaltung konnte nicht geladen werden (assets/admin.enc.js fehlt).",
    lockInsecure: "Die Verwaltung braucht eine sichere Verbindung (https:// oder lokal geöffnete Datei).",
    footer: "Bibliothek der Deutschen Schule Mailand · Verwaltung", toList: "Zur Bücherliste",
  },
  it: {
    pageTitle: "Biblioteca – Gestione", admTitle: "Gestione",
    lockT: "Area protetta", lockP: "Inserisca la password della biblioteca.", lockPw: "Password",
    lockBtn: "Sblocca", lockWrong: "La password non è corretta.", lockWait: "Attenda {s} secondi.",
    lockBusy: "Verifica in corso …", lockBroken: "Impossibile caricare la gestione (manca assets/admin.enc.js).",
    lockInsecure: "La gestione richiede una connessione sicura (https:// o file aperto in locale).",
    footer: "Biblioteca della Scuola Germanica di Milano · Gestione", toList: "Vai all'elenco dei libri",
  },
});

const SKEY = "dsm-admin-key";
const b64 = {
  dec: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
  enc: u => btoa(String.fromCharCode(...new Uint8Array(u))),
};
const sitzung = {
  get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* */ } },
};

async function keyFromPassword(enc, p) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(p), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: b64.dec(enc.salt), iterations: enc.iter },
    base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
}
async function decrypt(enc, key) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.dec(enc.iv) }, key, b64.dec(enc.data));
  return new TextDecoder().decode(plain);
}
// Verwaltung starten: der entschlüsselte Quelltext meldet sich als window.DSM_VERWALTUNG an
function starten(src) {
  log("Sperre", "entsperrt, Verwaltung startet");
  new Function(src)(); // Quelltext stammt aus der eigenen, verschlüsselten Datei
  return window.DSM_VERWALTUNG;
}
export function sperren() {
  log("Sperre", "gesperrt");
  sitzung.del(SKEY);
  location.reload();
}

// Fehlversuche bremsen
const fails = () => +sitzung.get("dsm-admin-fails") || 0;
let waitUntil = 0;

export function Sperre({ onStart }) {
  const { t } = useSprache();
  const enc = window.DSM_ADMIN_ENC;
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState(null); // [Schlüssel, Werte]
  const form = React.useRef(null), pw = React.useRef(null);

  // Innerhalb derselben Browser-Sitzung entsperrt bleiben
  React.useEffect(() => {
    const raw = sitzung.get(SKEY);
    if (!raw || !enc || !window.crypto || !crypto.subtle) { pw.current.focus(); return; }
    (async () => {
      try {
        log("Sperre", "Schlüssel dieser Browser-Sitzung gefunden");
        const key = await crypto.subtle.importKey("raw", b64.dec(raw), { name: "AES-GCM" }, false, ["decrypt"]);
        onStart(starten(await decrypt(enc, key)));
      } catch (e) { sperren(); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function absenden(e) {
    e.preventDefault();
    if (!enc) { setMsg(["lockBroken"]); return; }
    if (!window.crypto || !crypto.subtle) { setMsg(["lockInsecure"]); return; }
    const left = Math.ceil((waitUntil - Date.now()) / 1000);
    if (left > 0) { setMsg(["lockWait", { s: left }]); log("Sperre", `zu früh, noch ${left} s warten`); return; }
    setBusy(true); setMsg(["lockBusy"]);
    try {
      const key = await keyFromPassword(enc, pw.current.value);
      const src = await decrypt(enc, key);
      sitzung.set("dsm-admin-fails", "0");
      sitzung.set(SKEY, b64.enc(await crypto.subtle.exportKey("raw", key)));
      pw.current.value = ""; setMsg(null); setBusy(false);
      onStart(starten(src));
    } catch (err) {
      const n = fails() + 1, s = Math.min(30, 2 ** Math.max(0, n - 2));
      sitzung.set("dsm-admin-fails", String(n));
      waitUntil = Date.now() + s * 1000;
      setMsg(["lockWrong"]); setBusy(false);
      log("Sperre", `Passwort falsch (Versuch ${n}, nächster Versuch in ${s} s)`);
      const f = form.current;
      f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake");
      pw.current.select();
    }
  }

  return (
    <div className="lock grid place-items-center pt-6 pb-15" id="lock">
      <form
        ref={form} id="lock-form" autoComplete="off" aria-busy={String(busy)} onSubmit={absenden}
        className="grid w-full max-w-96 gap-3.5 rounded-3xl bg-surface p-[26px] shadow-[inset_0_0_0_1px_var(--line)]"
      >
        <h2 className="m-0 text-l font-semibold">{t("lockT")}</h2>
        <p className="m-0 text-muted-foreground">{t("lockP")}</p>
        <Input type="password" id="pw" ref={pw} autoComplete="current-password" aria-label={t("lockPw")} required className="h-12" />
        <Button type="submit" id="unlock" disabled={busy} className={busy ? "busy" : undefined}>
          <span className="spin" aria-hidden="true" />
          <span>{t("lockBtn")}</span>
        </Button>
        <p className="msg m-0 min-h-[1.4em] font-medium" id="lock-msg" role="alert">{msg ? t(msg[0], msg[1]) : ""}</p>
      </form>
    </div>
  );
}
