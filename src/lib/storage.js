// localStorage mit Absicherung: im privaten Modus oder bei gesperrten Website-Daten wirft schon der Zugriff
export const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* privat/gesperrt */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } },
  json(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
};

// Konsolen-Protokoll (assets/protokoll.js, vor allen Seiten-Skripten geladen)
export const log = (...a) => (window.DSM_LOG || function () {})(...a);
