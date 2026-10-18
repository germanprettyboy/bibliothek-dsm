/* tools/migrate-data.mjs: old German data format (until October 2026) → English format, idempotent. */
"use strict";
const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { ROOT } = require("../helpers/load.js");

let M;
before(async () => { M = await import(path.join(ROOT, "tools", "migrate-data.mjs")); });

test("books: keys, field letters and key order like toScript", () => {
  const old = {
    stand: "2026-10-15", anzahl: 1,
    abdeckung: { stand: "2026-10-15", buecher: 1, isbn: 1, cover: 1, ekz: 1, ol: 0, gb: 0, ohne: 0, geprueft: 1, vollstaendig: true },
    verlauf: [{ stand: "2026-10-01", buecher: 1, isbn: 1 }],
    buecher: [{ t: "T", u: "U", a: ["A"], v: "V", j: "2000", i: ["9783522202107"], k: "K", s: ["S"] }],
  };
  const d = M.migrateBooks(old);
  assert.deepEqual(Object.keys(d), ["updated", "count", "coverage", "history", "books"]);
  assert.deepEqual(d.books[0], { t: "T", s: "U", a: ["A"], p: "V", y: "2000", i: ["9783522202107"], c: "K", l: ["S"] });
  assert.deepEqual(d.coverage, { updated: "2026-10-15", books: 1, isbn: 1, cover: 1, ekz: 1, ol: 0, gb: 0, none: 0, checked: 1, complete: true });
  assert.deepEqual(d.history, [{ updated: "2026-10-01", books: 1, isbn: 1 }]);
  assert.equal(M.migrateBooks(d), d, "already migrated stays as is");
});

test("recommendations: group ids, topic, archive", () => {
  const r = { k: "x|y", t: "X", a: "Y", de: "d", it: "i" };
  const d = M.migrateRecs({ stand: "2026-10-15", thema: { de: "T", it: "T" }, gruppen: { mittelstufe: [r], "erw-sach": [] },
    archiv: [{ stand: "2026-09-01", gruppen: { oberstufe: [r] } }] });
  assert.deepEqual(d, { updated: "2026-10-15", topic: { de: "T", it: "T" }, groups: { middle: [r], "adult-nonfiction": [] },
    archive: [{ updated: "2026-09-01", groups: { upper: [r] } }] });
});

test("info: days, notice, closures", () => {
  const d = M.migrateInfo({ stand: "2026-10-15", zeiten: { mo: [["08:00", "13:00"]], sa: [] }, hinweis: { de: "h", it: "n" },
    schliessungen: [{ art: "abwesend", von: "2026-11-02", bis: "2026-11-02", de: "", it: "" }, { art: "ferien", von: "2026-12-21", bis: "2027-01-06", de: "W" }] });
  assert.deepEqual(d, { updated: "2026-10-15", hours: { mon: [["08:00", "13:00"]], sat: [] }, notice: { de: "h", it: "n" },
    closures: [{ type: "absent", from: "2026-11-02", to: "2026-11-02", de: "", it: "" }, { type: "holiday", from: "2026-12-21", to: "2027-01-06", de: "W", it: "" }] });
});
