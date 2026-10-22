/*
 * Lock of the admin page. The actual admin logic only exists encrypted
 * (assets/admin.enc.js, AES-GCM 256, key via PBKDF2-SHA-256 from the password).
 * Without the password there is nothing in the source that could be called or unlocked.
 * The password itself is in none of the files. No server needed.
 */
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { log } from "@/lib/storage";
import { addStrings, useLanguage } from "@/lib/language";

addStrings({
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
// Chrome/Edge restore sessionStorage with "continue where you left off": on a shared PC the admin page would stay
// unlocked after a browser restart. So the key only counts if the page was last left at most 4 hours ago.
const SEEN = "dsm-admin-seen", MAX_AWAY = 4 * 3600e3;
const b64 = {
  dec: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
  enc: u => btoa(String.fromCharCode(...new Uint8Array(u))),
};
const session = {
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
// Start the admin page: the decrypted source registers itself as window.DSM_ADMIN
function start(src) {
  log("Lock", "unlocked, admin page starting");
  const seen = () => session.set(SEEN, String(Date.now()));
  seen();
  window.addEventListener("pagehide", seen); // reload, closing the tab or the browser
  new Function(src)(); // the source comes from our own encrypted file
  return window.DSM_ADMIN;
}
export function lock() {
  log("Lock", "locked");
  session.del(SKEY); session.del(SEEN);
  location.reload();
}

// Slow down failed attempts
const fails = () => +session.get("dsm-admin-fails") || 0;
let waitUntil = 0;

export function Lock({ onStart }) {
  const { t } = useLanguage();
  const enc = window.DSM_ADMIN_ENC;
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState(null); // [key, values]
  const form = React.useRef(null), pw = React.useRef(null);

  // Stay unlocked within the same browser session
  React.useEffect(() => {
    const raw = session.get(SKEY);
    if (raw && !(Date.now() - (+session.get(SEEN) || 0) <= MAX_AWAY)) {
      log("Lock", "key of this browser session expired (page left more than 4 hours ago)");
      session.del(SKEY); session.del(SEEN);
      pw.current.focus(); return;
    }
    if (!raw || !enc || !window.crypto || !crypto.subtle) { pw.current.focus(); return; }
    (async () => {
      try {
        log("Lock", "key of this browser session found");
        const key = await crypto.subtle.importKey("raw", b64.dec(raw), { name: "AES-GCM" }, false, ["decrypt"]);
        onStart(start(await decrypt(enc, key)));
      } catch (e) { lock(); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault();
    if (!enc) { setMsg(["lockBroken"]); return; }
    if (!window.crypto || !crypto.subtle) { setMsg(["lockInsecure"]); return; }
    const left = Math.ceil((waitUntil - Date.now()) / 1000);
    if (left > 0) { setMsg(["lockWait", { s: left }]); log("Lock", `too early, wait ${left} s more`); return; }
    setBusy(true); setMsg(["lockBusy"]);
    try {
      const key = await keyFromPassword(enc, pw.current.value);
      const src = await decrypt(enc, key);
      session.set("dsm-admin-fails", "0");
      session.set(SKEY, b64.enc(await crypto.subtle.exportKey("raw", key)));
      pw.current.value = ""; setMsg(null); setBusy(false);
      onStart(start(src));
    } catch (err) {
      const n = fails() + 1, s = Math.min(30, 2 ** Math.max(0, n - 2));
      session.set("dsm-admin-fails", String(n));
      waitUntil = Date.now() + s * 1000;
      setMsg(["lockWrong"]); setBusy(false);
      log("Lock", `wrong password (attempt ${n}, next attempt in ${s} s)`);
      const f = form.current;
      f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake");
      pw.current.select();
    }
  }

  return (
    <div className="lock grid place-items-center pt-6 pb-15" id="lock">
      <form
        ref={form} id="lock-form" autoComplete="off" aria-busy={String(busy)} onSubmit={submit}
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
