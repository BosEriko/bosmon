import test from "node:test";
import assert from "node:assert/strict";
import { initialCamera, updateCamera, cameraPosition } from "../lib/camera";

test("camera scrolls through intermediate positions in all four directions", () => {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const camera = updateCamera(initialCamera(10, 10), 10 + dx, 10 + dy, 100);
    assert.deepEqual(cameraPosition(camera, 100), {
      x: 10,
      y: 10,
      moving: true,
    });
    assert.deepEqual(cameraPosition(camera, 170), {
      x: 10 + dx / 2,
      y: 10 + dy / 2,
      moving: true,
    });
    assert.deepEqual(cameraPosition(camera, 240), {
      x: 10 + dx,
      y: 10 + dy,
      moving: false,
    });
  }
});

test("rapid turns start from the current rendered position without jumping", () => {
  const east = updateCamera(initialCamera(10, 10), 11, 10, 100);
  const north = updateCamera(east, 11, 9, 170);
  assert.deepEqual(cameraPosition(north, 170), cameraPosition(east, 170));
  assert.deepEqual(cameraPosition(north, 310), { x: 11, y: 9, moving: false });
});

test("blocked movement and save updates preserve camera progress", () => {
  const camera = updateCamera(initialCamera(10, 10), 11, 10, 100);
  assert.equal(updateCamera(camera, 11, 10, 170), camera);
});

test("teleports and reduced motion snap to their destination", () => {
  const camera = updateCamera(initialCamera(10, 10), 11, 10, 100);
  assert.deepEqual(cameraPosition(updateCamera(camera, 80, 60, 170), 170), {
    x: 80,
    y: 60,
    moving: false,
  });
  assert.deepEqual(
    cameraPosition(updateCamera(camera, 11, 10, 170, true), 170),
    { x: 11, y: 10, moving: false },
  );
});
