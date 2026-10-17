/* Veröffentlichte Datendateien: books.js, empfehlungen.js, info.js, kategorien-it.js */
"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const X = require("../../werkzeuge/quelle/extract.js");
const { daten, norm, schluessel } = require("../helfer/laden.js");

const { B, E, I, K } = daten();
const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe("books.js", () => {
  test("Grundform", () => {
    assert.match(B.stand, ISO);
    assert.ok(Array.isArray(B.buecher) && B.buecher.length > 0);
    assert.equal(B.anzahl, B.buecher.length);
  });
  test("nur Whitelist-Felder mit richtigen Typen", () => {
    const str = ["t", "u", "v", "j", "k"], arr = ["a", "i", "s"];
    for (const b of B.buecher) {
      for (const [k, v] of Object.entries(b)) {
        if (str.includes(k)) assert.ok(typeof v === "string" && v.trim() === v && v, k + " in " + b.t);
        else if (arr.includes(k)) assert.ok(Array.isArray(v) && v.length && v.every(x => typeof x === "string" && x), k + " in " + b.t);
        else assert.fail("unerlaubtes Feld " + k);
      }
      assert.ok(b.t, "Titel fehlt");
    }
  });
  test("ISBN: immer 13-stellig mit gültiger Prüfziffer", () => {
    for (const b of B.buecher) for (const i of b.i || []) assert.equal(X.isbn13(i), i, b.t);
  });
  test("Jahr: vierstellig", () => {
    for (const b of B.buecher) if (b.j) assert.match(b.j, /^(1[5-9]|20)\d\d$/, b.t);
  });
  test("keine doppelten Einträge (Titel + Erstautor)", () => {
    const seen = new Set();
    for (const b of B.buecher) { const k = schluessel(b); assert.ok(!seen.has(k), b.t); seen.add(k); }
  });
  test("alphabetisch nach Titel sortiert", () => {
    const coll = new Intl.Collator("de", { sensitivity: "base", numeric: true });
    const key = s => s.replace(/^[^\p{L}\p{N}]+/u, "");
    for (let n = 1; n < B.buecher.length; n++) {
      assert.ok(coll.compare(key(B.buecher[n - 1].t), key(B.buecher[n].t)) <= 0, B.buecher[n - 1].t + " / " + B.buecher[n].t);
    }
  });
  test("Abdeckung/Verlauf (falls vorhanden) gültig", () => {
    if (B.abdeckung) { assert.match(B.abdeckung.stand, ISO); assert.ok(B.abdeckung.isbn <= B.abdeckung.buecher); }
    if (B.verlauf) { assert.ok(Array.isArray(B.verlauf) && B.verlauf.length <= 24); for (const e of B.verlauf) assert.match(e.stand, ISO); }
  });
});

describe("kategorien-it.js", () => {
  test("jede Kategorie aus books.js hat eine italienische Übersetzung", () => {
    const fehlt = [...new Set(B.buecher.map(b => b.k).filter(Boolean))].filter(k => !K[k]);
    assert.deepEqual(fehlt, []);
  });
});

describe("empfehlungen.js", () => {
  const GRUPPEN = ["mittelstufe", "oberstufe", "erw-roman", "erw-sach", "erw-bio"];
  const katalog = new Map(B.buecher.map(b => [schluessel(b), b]));
  test("Grundform, nur bekannte Gruppen", () => {
    assert.match(E.stand, ISO);
    for (const g of Object.keys(E.gruppen)) assert.ok(GRUPPEN.includes(g), g);
  });
  for (const g of GRUPPEN) {
    test("Gruppe " + g + ": höchstens 4, Texte DE/IT, Schlüssel im Bestand", () => {
      const l = E.gruppen[g] || [];
      assert.ok(l.length <= 4);
      assert.equal(new Set(l.map(r => r.k)).size, l.length, "doppelt");
      for (const r of l) {
        assert.match(r.k, /^[a-z0-9 ]+\|[a-z0-9 ]*$/, r.k);
        assert.equal(r.k, norm(r.t) + "|" + norm(String(r.a || "").split(",")[0]), "Schlüssel passt nicht zu Titel/Autor: " + r.k);
        assert.ok(katalog.has(r.k), "nicht im Bestand (wird nicht angezeigt): " + r.k);
        assert.ok(r.de && r.de.trim().length > 40, "DE-Text fehlt: " + r.k);
        assert.ok(r.it && r.it.trim().length > 40, "IT-Text fehlt: " + r.k);
      }
    });
  }
});

describe("info.js", () => {
  const TAGE = ["mo", "di", "mi", "do", "fr", "sa", "so"];
  test("Öffnungszeiten: nur Wochentage, Bereiche HH:MM, von < bis", () => {
    assert.match(I.stand, ISO);
    for (const [k, rs] of Object.entries(I.zeiten || {})) {
      assert.ok(TAGE.includes(k), k);
      for (const r of rs) { assert.match(r[0], /^\d{2}:\d{2}$/); assert.match(r[1], /^\d{2}:\d{2}$/); assert.ok(r[0] < r[1], k + " " + r); }
    }
  });
  test("Schließtage: ISO-Datum, bis ≥ von, Art bekannt", () => {
    for (const c of I.schliessungen || []) {
      assert.match(c.von, ISO);
      if (c.bis) { assert.match(c.bis, ISO); assert.ok(c.bis >= c.von); }
      if (c.art) assert.ok(["ferien", "abwesend"].includes(c.art), c.art);
    }
  });
  test("Hinweis DE/IT als Text", () => {
    if (I.hinweis) for (const l of ["de", "it"]) assert.equal(typeof (I.hinweis[l] ?? ""), "string");
  });
});
