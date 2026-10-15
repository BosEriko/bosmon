import test from "node:test";
import assert from "node:assert/strict";
import {
  initialMotion,
  updateMotion,
  playerFrame,
  playerSourceFrame,
} from "../lib/player-sprite";
test("player starts idle facing south", () => {
  assert.deepEqual(playerFrame(initialMotion(16, 12), 0), {
    row: 0,
    column: 0,
    walking: false,
  });
});
test("each cardinal step selects its matching sprite row", () => {
  for (const [x, y, row] of [
    [16, 13, 0],
    [15, 12, 1],
    [17, 12, 2],
    [16, 11, 3],
  ]) {
    const next = updateMotion(initialMotion(16, 12), x, y, 100);
    assert.deepEqual(playerFrame(next, 100), { row, column: 1, walking: true });
  }
});
test("continuous walking cycles through poses and stops facing the last direction", () => {
  let motion = updateMotion(initialMotion(16, 12), 17, 12, 100);
  assert.equal(playerFrame(motion, 100).column, 1);
  assert.equal(playerFrame(motion, 190).column, 0);
  motion = updateMotion(motion, 18, 12, 240);
  assert.equal(playerFrame(motion, 280).column, 3);
  motion = updateMotion(motion, 19, 12, 380);
  assert.equal(playerFrame(motion, 400).column, 2);
  assert.deepEqual(playerFrame(motion, 560), {
    row: 2,
    column: 0,
    walking: false,
  });
});
test("turning starts the new directional cycle immediately", () => {
  const east = updateMotion(initialMotion(16, 12), 17, 12, 100);
  const north = updateMotion(east, 17, 11, 240);
  assert.deepEqual(playerFrame(north, 240), {
    row: 3,
    column: 1,
    walking: true,
  });
});
test("blocked moves and unrelated save updates do not restart walking", () => {
  const initial = initialMotion(16, 12);
  assert.equal(updateMotion(initial, 16, 12, 100), initial);
  const moved = updateMotion(initial, 17, 12, 100);
  assert.equal(updateMotion(moved, 17, 12, 300), moved);
  assert.equal(playerFrame(moved, 300).walking, false);
});
test("teleports return to idle instead of animating across the map", () => {
  const moved = updateMotion(initialMotion(16, 12), 17, 12, 100);
  assert.deepEqual(playerFrame(updateMotion(moved, 80, 60, 120), 120), {
    row: 2,
    column: 0,
    walking: false,
  });
});
test("reduced motion preserves facing but disables the walking cycle", () => {
  const moved = updateMotion(initialMotion(16, 12), 16, 11, 100);
  assert.deepEqual(playerFrame(moved, 120, true), {
    row: 3,
    column: 0,
    walking: false,
  });
});

test("east-facing frames exclude the north-facing row below them", () => {
  for (let column = 0; column < 4; column++) {
    const source = playerSourceFrame(2, column);
    assert.ok(source.y <= 656);
    assert.ok(source.y + source.height > 881);
    assert.ok(source.y + source.height < 940);
  }
});
