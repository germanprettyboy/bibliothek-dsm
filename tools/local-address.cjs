/*
 * Loaded by local.mjs via NODE_OPTIONS=--require into the PHP server (php-wasm via npx).
 * php-wasm ignores the address from "-S 127.0.0.1:…" and calls listen(port) without an address – Node then listens on
 * all interfaces, and in the Wi-Fi/school network the admin page (password "local") plus save.php would be reachable.
 * Here every listen() without an address gets 127.0.0.1. The tunnel (cloudflared) connects there anyway.
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
