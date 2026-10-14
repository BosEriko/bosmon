import test from "node:test";
import assert from "node:assert/strict";
import { resolveBattle, Battle } from "../lib/battle";
import { initialSave, makeMonster, maxHp, parseSave } from "../lib/game";
const encounter = (): Battle => ({
  monster: makeMonster(1, 4),
  message: "Wild encounter",
  done: false,
});
test("catch adds a healthy companion, consumes an orb and awards XP", () => {
  const s = initialSave(),
    b = encounter(),
    r = resolveBattle(s, b, "catch", () => 0);
  assert.equal(r.save.team.length, 2);
  assert.equal(r.save.orbs, 14);
  assert.equal(r.save.team[1].hp, maxHp(b.monster));
  assert.deepEqual(r.save.caught, [0, 1]);
  assert.equal(r.save.team[0].xp, 41);
  assert.equal(r.battle?.done, true);
  assert.equal(s.team.length, 1);
  assert.ok(parseSave(r.save));
});
test("failed capture consumes an orb and allows the opponent to attack", () => {
  const s = initialSave(),
    r = resolveBattle(s, encounter(), "catch", () => 1);
  assert.equal(r.save.orbs, 14);
  assert.equal(r.save.team.length, 1);
  assert.equal(r.save.team[0].hp, s.team[0].hp - 8);
});
test("victory awards XP and coins once, and levels up the lead", () => {
  const s = initialSave();
  s.team[0].xp = 90;
  const b = encounter();
  b.monster.hp = 1;
  const r = resolveBattle(s, b, "attack", () => 0);
  assert.equal(r.save.wins, 1);
  assert.equal(r.save.coins, 140);
  assert.equal(r.save.team[0].level, 6);
  assert.equal(r.save.team[0].xp, 57);
  assert.equal(resolveBattle(r.save, r.battle!, "attack").save, r.save);
});
test("defeat returns the player to town with a healed team", () => {
  const s = initialSave();
  s.x = 50;
  s.team[0].hp = 1;
  const r = resolveBattle(s, encounter(), "attack", () => 0);
  assert.equal(r.save.x, 16);
  assert.equal(r.save.y, 12);
  assert.equal(r.save.team[0].hp, maxHp(s.team[0]));
  assert.equal(r.battle?.done, true);
});
test("potions restore health up to max, then the opponent attacks", () => {
  const s = initialSave();
  s.team[0].hp = 40;
  const r = resolveBattle(s, encounter(), "heal");
  assert.equal(r.save.team[0].hp, maxHp(s.team[0]) - 8);
  assert.equal(r.save.potions, 4);
  assert.match(r.battle!.message, /12 HP/);
});
test("empty supplies do not advance combat or damage the lead", () => {
  const s = { ...initialSave(), orbs: 0, potions: 0 };
  assert.equal(resolveBattle(s, encounter(), "catch").save, s);
  assert.equal(resolveBattle(s, encounter(), "heal").save, s);
});
test("flee closes the battle without changing the save", () => {
  const s = initialSave(),
    r = resolveBattle(s, encounter(), "run");
  assert.equal(r.save, s);
  assert.equal(r.battle, null);
});
