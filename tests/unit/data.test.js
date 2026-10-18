/* Published data files: books.js, recommendations.js, info.js, categories-it.js */
"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const X = require("../../tools/source/extract.js");
const { data, norm, keyOf } = require("../helpers/load.js");

const { B, R, I, C } = data();
const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe("books.js", () => {
  test("basic shape", () => {
    assert.match(B.updated, ISO);
    assert.ok(Array.isArray(B.books) && B.books.length > 0);
    assert.equal(B.count, B.books.length);
  });
  test("only whitelist fields with the right types", () => {
    const str = ["t", "s", "p", "y", "c"], arr = ["a", "i", "l"];
    for (const b of B.books) {
      for (const [k, v] of Object.entries(b)) {
        if (str.includes(k)) assert.ok(typeof v === "string" && v.trim() === v && v, k + " in " + b.t);
        else if (arr.includes(k)) assert.ok(Array.isArray(v) && v.length && v.every(x => typeof x === "string" && x), k + " in " + b.t);
        else assert.fail("forbidden field " + k);
      }
      assert.ok(b.t, "title missing");
    }
  });
  test("ISBN: always 13 digits with a valid check digit", () => {
    for (const b of B.books) for (const i of b.i || []) assert.equal(X.isbn13(i), i, b.t);
  });
  test("year: four digits", () => {
    for (const b of B.books) if (b.y) assert.match(b.y, /^(1[5-9]|20)\d\d$/, b.t);
  });
  test("no duplicate entries (title + first author)", () => {
    const seen = new Set();
    for (const b of B.books) { const k = keyOf(b); assert.ok(!seen.has(k), b.t); seen.add(k); }
  });
  test("sorted alphabetically by title", () => {
    const coll = new Intl.Collator("de", { sensitivity: "base", numeric: true });
    const key = s => s.replace(/^[^\p{L}\p{N}]+/u, "");
    for (let n = 1; n < B.books.length; n++) {
      assert.ok(coll.compare(key(B.books[n - 1].t), key(B.books[n].t)) <= 0, B.books[n - 1].t + " / " + B.books[n].t);
    }
  });
  test("coverage/history (if present) valid", () => {
    if (B.coverage) { assert.match(B.coverage.updated, ISO); assert.ok(B.coverage.isbn <= B.coverage.books); }
    if (B.history) { assert.ok(Array.isArray(B.history) && B.history.length <= 24); for (const e of B.history) assert.match(e.updated, ISO); }
  });
});

describe("categories-it.js", () => {
  test("every category from books.js has an Italian translation", () => {
    const missing = [...new Set(B.books.map(b => b.c).filter(Boolean))].filter(k => !C[k]);
    assert.deepEqual(missing, []);
  });
});

describe("recommendations.js", () => {
  const GROUPS = ["middle", "upper", "adult-fiction", "adult-nonfiction", "adult-bio"];
  const catalog = new Map(B.books.map(b => [keyOf(b), b]));
  test("basic shape, only known groups", () => {
    assert.match(R.updated, ISO);
    for (const g of Object.keys(R.groups)) assert.ok(GROUPS.includes(g), g);
  });
  for (const g of GROUPS) {
    test("group " + g + ": at most 4, texts DE/IT, key in the catalog", () => {
      const l = R.groups[g] || [];
      assert.ok(l.length <= 4);
      assert.equal(new Set(l.map(r => r.k)).size, l.length, "duplicate");
      for (const r of l) {
        assert.match(r.k, /^[a-z0-9 ]+\|[a-z0-9 ]*$/, r.k);
        assert.equal(r.k, norm(r.t) + "|" + norm(String(r.a || "").split(",")[0]), "key doesn't match title/author: " + r.k);
        assert.ok(catalog.has(r.k), "not in the catalog (won't be shown): " + r.k);
        assert.ok(r.de && r.de.trim().length > 40, "DE text missing: " + r.k);
        assert.ok(r.it && r.it.trim().length > 40, "IT text missing: " + r.k);
      }
    });
  }
});

describe("info.js", { skip: !I && "website/info.js is missing (not committed)" }, () => {
  const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  test("opening hours: only weekdays, ranges HH:MM, from < to", () => {
    assert.match(I.updated, ISO);
    for (const [k, rs] of Object.entries(I.hours || {})) {
      assert.ok(DAYS.includes(k), k);
      for (const r of rs) { assert.match(r[0], /^\d{2}:\d{2}$/); assert.match(r[1], /^\d{2}:\d{2}$/); assert.ok(r[0] < r[1], k + " " + r); }
    }
  });
  test("closing days: ISO date, to ≥ from, known type", () => {
    for (const c of I.closures || []) {
      assert.match(c.from, ISO);
      if (c.to) { assert.match(c.to, ISO); assert.ok(c.to >= c.from); }
      if (c.type) assert.ok(["holiday", "absent"].includes(c.type), c.type);
    }
  });
  test("notice DE/IT as text", () => {
    if (I.notice) for (const l of ["de", "it"]) assert.equal(typeof (I.notice[l] ?? ""), "string");
  });
});
