import test from "node:test";
import assert from "node:assert/strict";
import { initialMotion, updateMotion } from "../lib/player-sprite";
import { npcAnimationFrame } from "../lib/npc-sprite";

test("NPCs face their movement direction and retain it when stopped", () => {
  for (const [dx, dy, row] of [
    [0, 1, 0],
    [-1, 0, 1],
    [1, 0, 2],
    [0, -1, 3],
  ]) {
    const motion = updateMotion(initialMotion(10, 10), 10 + dx, 10 + dy, 100);
    assert.deepEqual(npcAnimationFrame(motion, 100, true), {
      row,
      column: 1,
      walking: true,
    });
    assert.deepEqual(npcAnimationFrame(motion, 420, false), {
      row,
      column: 0,
      walking: false,
    });
  }
});

test("NPC walking frames continue throughout the full 320 ms step", () => {
  const motion = updateMotion(initialMotion(10, 10), 11, 10, 100);
  assert.deepEqual(
    [100, 180, 260, 340].map(
      (now) => npcAnimationFrame(motion, now, true).column,
    ),
    [1, 0, 3, 2],
  );
  assert.equal(npcAnimationFrame(motion, 419, true).walking, true);
  assert.equal(npcAnimationFrame(motion, 420, false).walking, false);
});

test("reduced motion and scene resets use idle NPC frames", () => {
  const motion = updateMotion(initialMotion(10, 10), 9, 10, 100);
  assert.deepEqual(npcAnimationFrame(motion, 200, true, true), {
    row: 1,
    column: 0,
    walking: false,
  });
  assert.deepEqual(npcAnimationFrame(initialMotion(50, 30), 200, false), {
    row: 0,
    column: 0,
    walking: false,
  });
});
