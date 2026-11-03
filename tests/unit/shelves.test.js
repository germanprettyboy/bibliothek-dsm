/* Shelf analysis of tab "Regale" (tools/source/admin/shelves-core.js): locations, books placed wrong (category, A–Z order,
   location without a board), board overview, inventory. Copies come from extract.js inspect() on synthetic databases. */
"use strict";
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");
const X = require("../../tools/source/extract.js");
const T = require("../helpers/testdb.js");

let S;
before(async () => { S = await import(pathToFileURL(path.join(__dirname, "../../tools/source/admin/shelves-core.js")).href); });

async function records(make) {
  const db = await make();
  try { return X.inspect(db).records; } finally { db.close(); }
}
const titles = rows => rows.map(x => x.r.t).sort();
// Copy for hand-made cases
let n = 0;
const rec = (t, sn, c, l) => ({ id: ++n, t, a: sn, sn, c, l, y: "", sig: "", z: "" });

describe("parseLoc", () => {
  test("section, shelf and board", () => {
    assert.deepEqual(S.parseLoc("Jugendbücher 6 Brett 5"), { base: "Jugendbücher", unit: "Jugendbücher 6", no: 6, board: 5 });
    assert.deepEqual(S.parseLoc("Geschichte/Politik/Wirtschaft Regal 2 Brett 3"),
      { base: "Geschichte/Politik/Wirtschaft", unit: "Geschichte/Politik/Wirtschaft Regal 2", no: 2, board: 3 });
    assert.deepEqual(S.parseLoc("Biografie Brett 1"), { base: "Biografie", unit: "Biografie", no: 0, board: 1 });
    assert.deepEqual(S.parseLoc("Unterstufenregal 1 Brett 7"), { base: "Unterstufenregal", unit: "Unterstufenregal 1", no: 1, board: 7 });
  });
  test("without a board: the location is its own shelf", () => {
    assert.deepEqual(S.parseLoc("Schreibtisch"), { base: "Schreibtisch", unit: "Schreibtisch", no: 0, board: 0 });
    assert.deepEqual(S.parseLoc("Italienisch 1"), { base: "Italienisch", unit: "Italienisch 1", no: 1, board: 0 });
    assert.deepEqual(S.parseLoc("  Musik   Brett 4 "), { base: "Musik", unit: "Musik", no: 0, board: 4 });
  });
  test("initial of the surname: umlauts as their base letter, empty without author", () => {
    assert.equal(S.initial({ sn: "Ögüt" }), "o");
    assert.equal(S.initial({ sn: "Älbert" }), "a");
    assert.equal(S.initial({ sn: "" }), "");
    assert.equal(S.initial({}), "");
  });
});

describe("analyze: shelves test database", () => {
  let A, recs;
  before(async () => { recs = await records(T.shelves); A = S.analyze(recs); });

  test("every check finds exactly the copies placed wrong on purpose", () => {
    assert.deepEqual(A.checks.map(c => c.key), S.PLACE_CHECKS);
    for (const c of A.checks) assert.deepEqual(titles(c.rows), T.SHELF_WRONG[c.key].slice().sort(), c.key);
    assert.equal(A.flags.size, 7);
  });

  test("where the copy belongs", () => {
    const v = key => Object.fromEntries(A.checks.find(c => c.key === key).rows.map(x => [x.r.t, x.v]));
    assert.deepEqual(v("placeCategory"), {
      "Drachenherz": "Jugendbücher 1 Brett 1", "Tatort Hafen": "Jugendbücher 1 Brett 2", "Liegengeblieben": "Romane 1 · Romane 2",
    });
    assert.deepEqual(v("placeOrder"), { "Der Steppenwolf": "H → Romane 1 Brett 2", "Der Zauberberg": "M → Romane 2 Brett 1" });
    assert.deepEqual(v("placeVague"), { "Ohne Brett 1": "Romane 1 · Romane 2", "Ohne Brett 2": "Romane 1 · Romane 2" });
  });

  test("the A–Z section, boards with letters, shelves in shelf order", () => {
    assert.deepEqual(A.runs.map(r => [r.base, r.n, r.boards]), [["Romane", 40, 4]]);
    const b = loc => A.boards.find(x => x.loc === loc);
    assert.deepEqual(["Romane 1 Brett 1", "Romane 1 Brett 2", "Romane 2 Brett 1", "Romane 2 Brett 2"].map(l => b(l).from + "–" + b(l).to),
      ["A–D", "E–K", "L–R", "S–Z"]);
    assert.equal(b("Jugendbücher 1 Brett 1").from, "", "no A–Z section");
    assert.deepEqual(b("Jugendbücher 1 Brett 3").cats, [["Liebe", 5], ["Fantasy", 1]]);
    assert.equal(b("Romane 1 Brett 1").flagged, 1);
    assert.deepEqual(A.units.map(u => u.unit), ["Jugendbücher 1", "Romane", "Romane 1", "Romane 2", "Sachbuch", "Schreibtisch"]);
    assert.deepEqual(A.units.find(u => u.unit === "Romane 1").boards.map(x => x.board), [1, 2]);
    assert.equal(A.boards.reduce((s, x) => s + x.n, 0), recs.length);
  });

  test("rows in shelf order (where WinBook puts the copy)", () => {
    const pos = new Map(A.boards.map((x, i) => [x.loc, i]));
    for (const c of A.checks) {
      const p = c.rows.map(x => pos.get(x.r.l));
      assert.deepEqual(p, p.slice().sort((x, y) => x - y), c.key);
    }
  });

  test("shelf order of a board: A–Z by surname, else by category", () => {
    const az = S.shelfOrder(A.boards.find(x => x.loc === "Romane 1 Brett 1")).map(r => r.sn);
    assert.deepEqual(az.slice(0, 5), ["Adler", "Adler", "Arndt", "Bauer", "Böll"]);
    const cat = S.shelfOrder(A.boards.find(x => x.loc === "Jugendbücher 1 Brett 3")).map(r => r.c);
    assert.deepEqual(cat, ["Fantasy", "Liebe", "Liebe", "Liebe", "Liebe", "Liebe"]);
  });

  test("attach: the checks after the maintenance checks, the analysis as ins.shelves", async () => {
    const db = await T.shelves();
    let ins;
    try { ins = X.inspect(db); } finally { db.close(); }
    const a = S.attach(ins);
    assert.deepEqual(a.checks.map(c => c.key), ins.checks.map(c => c.key).concat(S.PLACE_CHECKS));
    assert.equal(a.records, ins.records);
    assert.ok(a.shelves.boards.length);
    assert.equal(ins.shelves, undefined, "the input stays as it was");
  });
});

describe("analyze: rules", () => {
  test("the small test library has nothing placed wrong", async () => {
    const A = S.analyze(await records(T.library));
    for (const c of A.checks) assert.deepEqual(c.rows, [], c.key);
    assert.deepEqual(A.runs, []);
  });

  test("a category on two boards: both are its home, a stray copy is flagged", () => {
    const list = [];
    for (let i = 0; i < 10; i++) list.push(rec("Krimi A" + i, "Muster", "Krimi", "Jugendbücher 3 Brett 1"));
    for (let i = 0; i < 6; i++) list.push(rec("Krimi B" + i, "Muster", "Krimi", "Englisch 1 Brett 2"));
    list.push(rec("Streuner", "Muster", "Krimi", "MINT 1 Brett 4"));
    const A = S.analyze(list);
    assert.deepEqual(A.checks[0].rows.map(x => [x.r.t, x.v]), [["Streuner", "Jugendbücher 3 Brett 1 · Englisch 1 Brett 2"]]);
  });

  test("a group spread over several shelves of another section is a second home, not a mistake", () => {
    const list = [];
    for (let i = 0; i < 34; i++) list.push(rec("Kind " + i, "Muster", "Kinderbuch", "U 1 Brett " + (1 + (i % 5))));
    for (const u of [1, 2, 3]) for (const k of [1, 2]) list.push(rec(`Jugend ${u}.${k}`, "Muster", "Kinderbuch", `J ${u} Brett 1`));
    list.push(rec("Streuner", "Muster", "Kinderbuch", "M Brett 1"));
    assert.deepEqual(S.analyze(list).checks[0].rows.map(x => [x.r.t, x.v]), [["Streuner", "U 1"]]);
  });

  test("a scattered category or one with fewer than 5 copies is skipped", () => {
    const list = [];
    ["A Brett 1", "B Brett 1", "C Brett 1", "D Brett 1", "E Brett 1", "F Brett 1"].forEach((l, i) => list.push(rec("x" + i, "S", "Überall", l)));
    ["A Brett 1", "A Brett 1", "A Brett 1", "B Brett 9"].forEach((l, i) => list.push(rec("y" + i, "S", "Klein", l)));
    assert.deepEqual(S.analyze(list).checks[0].rows, []);
  });

  test("another board of the same shelf counts as wrong", () => {
    const list = [];
    for (let i = 0; i < 9; i++) list.push(rec("Liebe " + i, "Herz", "Liebe", "Jugendbücher 6 Brett 3"));
    list.push(rec("Daneben", "Herz", "Liebe", "Jugendbücher 6 Brett 6"));
    assert.deepEqual(S.analyze(list).checks[0].rows.map(x => x.r.t), ["Daneben"]);
  });

  test("a section is only A–Z with ≥ 3 boards, ≥ 30 copies, ≥ 6 initials and ≥ 80 % in order", () => {
    const names = "Abel Adam Bach Berg Cramer Dorn Eck Falk Gross Hahn Iser Jung Klee Lang Moll Nagel Ott Pohl Rau Sand Thal Uhl Voss Wolf Zahn".split(" ");
    const sorted = [];
    names.forEach((sn, i) => { sorted.push(rec("A" + i, sn, "", "Lit Brett " + (1 + Math.floor(i / 7)))); sorted.push(rec("B" + i, sn, "", "Lit Brett " + (1 + Math.floor(i / 7)))); });
    assert.equal(S.analyze(sorted).runs.length, 1);
    assert.deepEqual(S.analyze(sorted).checks[1].rows, []);
    // shuffled over the boards: no A–Z section, no flags
    const mixed = sorted.map((r, i) => ({ ...r, l: "Lit Brett " + (1 + (i % 4)) }));
    assert.deepEqual(S.analyze(mixed).runs, []);
    assert.deepEqual(S.analyze(mixed).checks[1].rows, []);
    // too few copies
    assert.deepEqual(S.analyze(sorted.slice(0, 28)).runs, []);
  });

  test("a letter without its own board: the board where it would stand", () => {
    const names = "Abel Adam Bach Berg Cramer Dorn Eck Falk Gross Hahn Klee Lang Moll Nagel Ott Pohl Rau Sand Thal Wolf Zahn".split(" ");
    const list = [];
    names.forEach((sn, i) => { for (const k of [1, 2]) list.push(rec(sn + k, sn, "", "Lit Brett " + (1 + Math.floor(i / 6)))); });
    list.push(rec("Irrläufer", "Iser", "", "Lit Brett 4")); // I: no copy of I in the section; H is on board 2
    const rows = S.analyze(list).checks[1].rows;
    assert.deepEqual(rows.map(x => [x.r.t, x.v]), [["Irrläufer", "I → Lit Brett 2"]]);
  });

  test("location without a board only where the section has boards", () => {
    const list = [rec("a", "S", "", "Musik"), rec("b", "S", "", "Musik Brett 1"), rec("c", "S", "", "Schreibtisch"), rec("d", "S", "", "musik")];
    assert.deepEqual(S.analyze(list).checks[2].rows.map(x => [x.r.t, x.v]), [["a", "Musik"], ["d", "Musik"]]);
  });

  test("copies without a location are left out", () => {
    const A = S.analyze([rec("x", "S", "Krimi", ""), rec("y", "S", "Krimi", "A Brett 1")]);
    assert.equal(A.boards.length, 1);
    assert.equal(A.boards[0].n, 1);
  });
});

describe("inventory", () => {
  let A, recs;
  const id = t => recs.find(r => r.t === t).id;
  before(async () => { recs = await records(T.shelves); A = S.analyze(recs); });

  test("checked boards, missing copies, copies found at the wrong place", () => {
    const inv = { boards: {
      "Romane 1 Brett 1": { d: "2026-11-03", miss: [id("Der Steppenwolf")], here: [id("Drachenherz")] },
      "Romane 2 Brett 2": { miss: [String(id("Der Zauberberg"))], here: [] },
    } };
    const R = S.inventory(A, inv, recs);
    assert.equal(R.done, 1);
    assert.equal(R.total, A.boards.length);
    assert.deepEqual(R.missing.map(x => x.r.t), ["Der Steppenwolf", "Der Zauberberg"]);
    assert.deepEqual(R.here.map(x => [x.r.t, x.v]), [["Drachenherz", "Romane 1 Brett 1"]]);
  });

  test("unknown numbers, other boards' copies as missing, a copy found where WinBook puts it, old locations: left out", () => {
    const inv = { boards: {
      "Romane 1 Brett 1": { miss: [999999, id("Der Zauberberg")], here: [id("Roman von Anna Adler 1")] },
      "Weggeräumt Brett 1": { d: "2026-01-01", miss: [id("Drachenherz")], here: [] },
    } };
    const R = S.inventory(A, inv, recs);
    assert.deepEqual([R.done, R.missing, R.here], [0, [], []]);
    assert.deepEqual(S.inventory(A, null, recs).missing, []);
  });
});
