// localStorage with a safety net: in private mode or with blocked site data even the access throws
export const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private/blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } },
  json(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
};

// Console log (assets/logger.js, loaded before all page scripts)
export const log = (...a) => (window.DSM_LOG || function () {})(...a);
