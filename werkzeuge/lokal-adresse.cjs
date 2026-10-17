/*
 * Wird von lokal.mjs per NODE_OPTIONS=--require in den PHP-Server (php-wasm über npx) geladen.
 * php-wasm übergeht die Adresse aus „-S 127.0.0.1:…“ und ruft listen(port) ohne Adresse auf – Node lauscht dann auf
 * allen Schnittstellen, im WLAN/Schulnetz wäre die Verwaltung (Passwort „lokal“) samt speichern.php erreichbar.
 * Hier bekommt jedes listen() ohne Adresse 127.0.0.1. Der Tunnel (cloudflared) verbindet sich ohnehin dorthin.
 */
const net = require("node:net");

const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...a) {
  if (typeof a[0] === "number" || (typeof a[0] === "string" && /^\d+$/.test(a[0]))) {
    if (typeof a[1] !== "string") a.splice(1, a[1] === undefined ? 1 : 0, "127.0.0.1"); // listen(port[, undefined], …)
  } else if (a[0] && typeof a[0] === "object" && "port" in a[0] && !a[0].host) {
    a[0] = { ...a[0], host: "127.0.0.1" };
  }
  return listen.apply(this, a);
};
