import test from "node:test";
import assert from "node:assert/strict";
import {
  awardXp,
  catchChance,
  HEIGHT,
  guideHome,
  initialSave,
  isDoor,
  maxHp,
  move,
  ROOM_DOOR,
  sceneOf,
  parseSave,
  regionAt,
  REGIONS,
  tileAt,
  TOWNS,
  walkable,
  wander,
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
  for (let area = 0; area < REGIONS.length; area++) {
    const guide = guideHome(area);
    assert.ok(
      seen.has(`${guide.x},${guide.y}`),
      `Guide in ${REGIONS[area]} is reachable`,
    );
    if (TOWNS.has(area))
      for (const door of [9, 25]) {
        assert.ok(
          seen.has(
            `${(area % 5) * 32 + door},${Math.floor(area / 5) * 24 + 9}`,
          ),
          `Door ${door} in ${REGIONS[area]} is reachable`,
        );
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
test("walking north into a town door enters the house and the doormat leads back out", () => {
  const outside = { ...initialSave(), x: 9, y: 9 };
  assert.ok(isDoor(9, 8));
  assert.ok(isDoor(25, 8));
  const inside = move(outside, 0, -1);
  assert.deepEqual(inside.room, { x: ROOM_DOOR.x, y: ROOM_DOOR.y - 1 });
  assert.equal(inside.x, 9);
  assert.equal(inside.y, 9);
  assert.notEqual(sceneOf(inside), sceneOf(outside));
  assert.equal(move(inside, 1, 0).room?.x, ROOM_DOOR.x + 1);
  assert.equal(move({ ...inside, room: { x: 1, y: 2 } }, 0, -1).room?.y, 2);
  const back = move(inside, 0, 1);
  assert.equal(back.room, null);
  assert.equal(back.x, 9);
  assert.equal(back.y, 9);
  assert.equal(move(outside, 0, 1).room, null);
});
test("every town doorstep is walkable and wild routes have no doors", () => {
  for (const r of TOWNS)
    for (const a of [9, 25]) {
      const x = (r % 5) * 32 + a,
        y = Math.floor(r / 5) * 24 + 9;
      assert.ok(walkable(x, y));
      assert.ok(isDoor(x, y - 1));
    }
  assert.equal(isDoor(32 + 9, 8), false);
});
test("crossing into a neighbouring area changes the scene", () => {
  const s = { ...initialSave(), x: 31, y: 12 };
  assert.notEqual(sceneOf(move(s, 1, 0)), sceneOf(s));
  assert.equal(sceneOf(move(s, -1, 0)), sceneOf(s));
});
test("saves validate rooms and accept saves from before rooms existed", () => {
  const { room: _room, ...legacy } = initialSave();
  assert.equal(parseSave(legacy)?.room, null);
  const inside = { ...initialSave(), x: 9, y: 9, room: { x: 5, y: 6 } };
  assert.deepEqual(parseSave(inside)?.room, { x: 5, y: 6 });
  assert.equal(parseSave({ ...inside, room: { x: 0, y: 0 } }), null);
  assert.equal(parseSave({ ...inside, x: 16, y: 12 }), null);
});
test("the guide blocks the player's path", () => {
  const s = { ...initialSave(), x: 16, y: 12 };
  assert.equal(move(s, 1, 0, { x: 17, y: 12 }), s);
  assert.equal(move(s, 0, 1, { x: 17, y: 12 }).y, 13);
});
test("guides wander one tile at a time near home and never onto the player", () => {
  const home = guideHome(0),
    far = { x: 0, y: 0 };
  assert.deepEqual(home, { area: 0, x: 19, y: 12 });
  let g = home;
  for (let i = 0; i < 2; i++) g = wander(g, 1, 0, far);
  assert.equal(g.x, 21);
  assert.equal(wander(g, 1, 0, far), g);
  assert.equal(wander(home, 1, 1, far), home);
  assert.equal(wander(home, -1, 0, { x: 18, y: 12 }), home);
  for (let area = 0; area < 25; area++) {
    let guide = guideHome(area);
    for (let i = 0; i < 200; i++) {
      const [dx, dy] = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ][i % 4 === 0 ? (i * 7) % 4 : (i * 13) % 4];
      guide = wander(guide, dx, dy, far);
      assert.ok(walkable(guide.x, guide.y));
      assert.equal(regionAt(guide.x, guide.y), area);
    }
  }
});

test("terrain varies between regions instead of repeating mirrored blocks", () => {
  const layouts = new Set<string>();
  for (let r = 0; r < REGIONS.length; r++) {
    let layout = "";
    for (let y = 1; y < 23; y++)
      for (let x = 1; x < 31; x++)
        layout += tileAt((r % 5) * 32 + x, Math.floor(r / 5) * 24 + y);
    layouts.add(layout);
  }
  assert.equal(layouts.size, REGIONS.length);
});

test("changed terrain relocates an old save without losing progress", () => {
  const save = { ...initialSave(), x: 6, y: 5, coins: 700 };
  const restored = parseSave(save)!;
  assert.ok(restored);
  assert.ok(walkable(restored.x, restored.y));
  assert.equal(regionAt(restored.x, restored.y), regionAt(save.x, save.y));
  assert.equal(restored.coins, 700);
  assert.deepEqual(restored.team, save.team);
});
