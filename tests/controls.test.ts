import test from "node:test";
import assert from "node:assert/strict";
import {
  keyDirection,
  keyAction,
  nextControlIndex,
  worldViewport,
} from "../lib/controls";
test("WASD and arrow keys move in the same cardinal directions, including uppercase", () => {
  for (const [a, b, expected] of [
    ["w", "ArrowUp", [0, -1]],
    ["s", "ArrowDown", [0, 1]],
    ["a", "ArrowLeft", [-1, 0]],
    ["d", "ArrowRight", [1, 0]],
  ] as const) {
    assert.deepEqual(keyDirection(a), expected);
    assert.deepEqual(keyDirection(a.toUpperCase()), expected);
    assert.deepEqual(keyDirection(b), expected);
  }
  assert.equal(keyDirection("j"), null);
});
test("J confirms, K goes back, and existing interact/escape shortcuts still work", () => {
  for (const key of ["j", "J", "e"]) assert.equal(keyAction(key), "confirm");
  for (const key of ["k", "K", "Escape"]) assert.equal(keyAction(key), "back");
  assert.equal(keyAction("Tab"), null);
  assert.equal(keyAction("w"), null);
});
test("menu selection wraps and handles unfocused or empty menus", () => {
  assert.equal(nextControlIndex(3, 4, 1), 0);
  assert.equal(nextControlIndex(0, 4, -1), 3);
  assert.equal(nextControlIndex(-1, 4, 1), 0);
  assert.equal(nextControlIndex(-1, 4, -1), 3);
  assert.equal(nextControlIndex(0, 0, 1), -1);
});
test("world camera covers desktop, portrait, and landscape viewports without stretching tiles", () => {
  for (const [w, h] of [
    [1920, 1080],
    [1440, 900],
    [390, 464],
    [320, 378],
    [844, 390],
  ]) {
    const viewport = worldViewport(w, h);
    assert.ok(viewport.cols * 24 >= viewport.width);
    assert.ok(viewport.rows * 24 >= viewport.height);
    assert.equal(viewport.cols % 2, 1);
    assert.equal(viewport.rows % 2, 1);
    assert.ok(Math.abs(viewport.width * 2 - w) <= 1);
    assert.ok(Math.abs(viewport.height * 2 - h) <= 1);
  }
});
