import test from "node:test";
import assert from "node:assert/strict";
import {
  awardXp,
  catchChance,
  HEIGHT,
  initialSave,
  maxHp,
  move,
  parseSave,
  regionAt,
  REGIONS,
  tileAt,
  TOWNS,
  walkable,
  WIDTH,
} from "../lib/game";
test("a new adventure has a healthy starter and capture supplies", () => {
  const s = initialSave();
  assert.equal(s.team[0].hp, maxHp(s.team[0]));
  assert.equal(s.orbs, 15);
  assert.deepEqual(s.caught, [0]);
  assert.ok(parseSave(JSON.parse(JSON.stringify(s))));
});
test("movement respects obstacles, world bounds and cardinal directions", () => {
  const s = initialSave();
  assert.equal(move(s, 1, 1), s);
  assert.equal(move({ ...s, x: 0, y: 12 }, -1, 0).x, 0);
  assert.equal(move({ ...s, x: 5, y: 5 }, 1, 0).x, 5);
  assert.equal(move(s, 1, 0).x, 17);
});
test("all 25 regions and all eight encounter species are reachable from the starting town", () => {
  const visited = new Set<number>(),
    seen = new Set<string>(),
    species = new Set<number>(),
    queue: [[number, number]] = [[16, 12]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i],
      key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const r = regionAt(x, y);
    visited.add(r);
    if (tileAt(x, y) === "wild")
      for (let k = 0; k < 3; k++) species.add((k + r) % 8);
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const a = x + dx,
        b = y + dy;
      if (
        a >= 0 &&
        b >= 0 &&
        a < WIDTH &&
        b < HEIGHT &&
        walkable(a, b) &&
        !seen.has(`${a},${b}`)
      )
        queue.push([a, b]);
    }
  }
  assert.equal(visited.size, REGIONS.length);
  assert.equal(species.size, 8);
  assert.equal(TOWNS.size, 10);
});
test("crossing routes records discoveries only once", () => {
  let s = { ...initialSave(), x: 31, y: 12 };
  s = move(s, 1, 0);
  assert.deepEqual(s.visited, [0, 1]);
  s = move(move(s, -1, 0), 1, 0);
  assert.deepEqual(s.visited, [0, 1]);
});
test("experience supports multiple level ups without losing overflow", () => {
  const m = initialSave().team[0],
    next = awardXp(m, 250);
  assert.equal(next.level, 7);
  assert.equal(next.xp, 30);
  assert.equal(next.hp, maxHp(next));
  assert.equal(m.level, 5);
});
test("weakened creatures are easier to catch", () => {
  assert.ok(catchChance(1, 50) > catchChance(50, 50));
  assert.ok(catchChance(1, 50) < 1);
});
test("invalid and corrupted saves are rejected", () => {
  const s = initialSave();
  for (const invalid of [
    null,
    {},
    { ...s, team: [] },
    { ...s, x: -1 },
    { ...s, orbs: -1 },
    { ...s, team: [{ ...s.team[0], species: 12 }] },
    { ...s, visited: [99] },
    { ...s, name: "x".repeat(25) },
  ])
    assert.equal(parseSave(invalid), null);
});
test("a max-level companion remains saveable after gaining experience", () => {
  const s = initialSave();
  s.team[0] = { ...s.team[0], level: 100, xp: 0, hp: 622 };
  s.team[0] = awardXp(s.team[0], 10000);
  assert.equal(s.team[0].level, 100);
  assert.equal(s.team[0].xp, 0);
  assert.ok(parseSave(s));
});
