/*
 * Sperre der Verwaltung. Die eigentliche Verwaltungslogik liegt nur verschlüsselt vor
 * (assets/admin.enc.js, AES-GCM 256, Schlüssel per PBKDF2-SHA-256 aus dem Passwort).
 * Ohne Passwort gibt es im Quelltext nichts, was sich aufrufen oder freischalten ließe.
 * Das Passwort selbst steht nirgends in den Dateien. Kein Server nötig.
 */
(function () {
  "use strict";
  const D = window.DSM;
  const $ = s => document.querySelector(s);
  const SKEY = "dsm-admin-key";

  D.init({
    de: {
      pageTitle: "Bibliothek – Verwaltung",
      admTitle: "Verwaltung",
      lockT: "Geschützter Bereich", lockP: "Bitte das Passwort der Bibliothek eingeben.", lockPw: "Passwort",
      lockBtn: "Entsperren", lockWrong: "Das Passwort stimmt nicht.", lockWait: "Bitte {s} Sekunden warten.",
      lockBusy: "Wird geprüft …", lockBroken: "Die Verwaltung konnte nicht geladen werden (assets/admin.enc.js fehlt).",
      lockInsecure: "Die Verwaltung braucht eine sichere Verbindung (https:// oder lokal geöffnete Datei).",
      footer: "Bibliothek der Deutschen Schule Mailand · Verwaltung", toList: "Zur Bücherliste",
    },
    it: {
      pageTitle: "Biblioteca – Gestione",
      admTitle: "Gestione",
      lockT: "Area protetta", lockP: "Inserisca la password della biblioteca.", lockPw: "Password",
      lockBtn: "Sblocca", lockWrong: "La password non è corretta.", lockWait: "Attenda {s} secondi.",
      lockBusy: "Verifica in corso …", lockBroken: "Impossibile caricare la gestione (manca assets/admin.enc.js).",
      lockInsecure: "La gestione richiede una connessione sicura (https:// o file aperto in locale).",
      footer: "Biblioteca della Scuola Germanica di Milano · Gestione", toList: "Vai all'elenco dei libri",
    },
  });

  const b64 = {
    dec: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
    enc: u => btoa(String.fromCharCode(...new Uint8Array(u))),
  };
  const enc = window.DSM_ADMIN_ENC;
  const form = $("#lock-form"), pw = $("#pw"), msg = $("#lock-msg"), btn = $("#unlock");

  async function keyFromPassword(p) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(p), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: b64.dec(enc.salt), iterations: enc.iter },
      base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
  }
  async function decrypt(key) {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.dec(enc.iv) }, key, b64.dec(enc.data));
    return new TextDecoder().decode(plain);
  }
  function start(src) {
    $("#lock").hidden = true;
    $("#app").hidden = false;
    // Verwaltung starten (Quelltext stammt aus der eigenen, verschlüsselten Datei)
    new Function(src)();
  }
  function lockNow() {
    try { sessionStorage.removeItem(SKEY); } catch (e) { /* */ }
    location.reload();
  }
  window.DSM_ADMIN_LOCK = lockNow;

  // Fehlversuche bremsen
  const fails = () => { try { return +sessionStorage.getItem("dsm-admin-fails") || 0; } catch (e) { return 0; } };
  const setFails = n => { try { sessionStorage.setItem("dsm-admin-fails", String(n)); } catch (e) { /* */ } };
  let waitUntil = 0;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!enc) { msg.textContent = D.t("lockBroken"); return; }
    if (!window.crypto || !crypto.subtle) { msg.textContent = D.t("lockInsecure"); return; }
    const left = Math.ceil((waitUntil - Date.now()) / 1000);
    if (left > 0) { msg.textContent = D.t("lockWait", { s: left }); return; }
    btn.disabled = true; msg.textContent = D.t("lockBusy");
    try {
      const key = await keyFromPassword(pw.value);
      const src = await decrypt(key);
      setFails(0);
      try { sessionStorage.setItem(SKEY, b64.enc(await crypto.subtle.exportKey("raw", key))); } catch (err) { /* */ }
      pw.value = ""; msg.textContent = "";
      start(src);
    } catch (err) {
      const n = fails() + 1; setFails(n);
      waitUntil = Date.now() + Math.min(30, 2 ** Math.max(0, n - 2)) * 1000;
      msg.textContent = D.t("lockWrong");
      form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
      pw.select();
    } finally { btn.disabled = false; }
  });

  // Innerhalb derselben Browser-Sitzung entsperrt bleiben
  (async () => {
    let raw = null;
    try { raw = sessionStorage.getItem(SKEY); } catch (e) { /* */ }
    if (!raw || !enc || !window.crypto || !crypto.subtle) { pw.focus(); return; }
    try {
      const key = await crypto.subtle.importKey("raw", b64.dec(raw), { name: "AES-GCM" }, false, ["decrypt"]);
      start(await decrypt(key));
    } catch (e) { lockNow(); }
  })();
})();
