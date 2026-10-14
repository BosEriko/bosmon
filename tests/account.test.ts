import test from "node:test";
import assert from "node:assert/strict";
import { authError, chooseAccountSave, saveKey } from "../lib/account";
import { initialSave } from "../lib/game";
test("guest and different accounts use separate save keys", () => {
  assert.equal(saveKey(), "bosmon-save-v1");
  assert.notEqual(saveKey("alice"), saveKey());
  assert.notEqual(saveKey("alice"), saveKey("bob"));
  assert.equal(saveKey("alice"), saveKey("alice"));
});
test("account save selection restores cloud progress on a new device", () => {
  const remote = initialSave();
  assert.equal(chooseAccountSave(null, remote), remote);
  assert.equal(
    chooseAccountSave({ ...initialSave(), updatedAt: 0 }, remote),
    remote,
  );
});
test("account save selection preserves newer local progress and handles new accounts", () => {
  const local = { ...initialSave(), updatedAt: 100 },
    remote = { ...initialSave(), updatedAt: 50 };
  assert.equal(chooseAccountSave(local, remote), local);
  assert.equal(chooseAccountSave(local, null), local);
  assert.equal(chooseAccountSave(null, null), null);
});
test("auth errors provide actionable feedback without leaking raw errors", () => {
  assert.match(authError({ code: "auth/popup-blocked" }), /Allow pop-ups/);
  assert.match(authError({ code: "auth/operation-not-allowed" }), /enabled/);
  assert.match(
    authError({ code: "auth/credential-already-in-use" }),
    /remain separate/,
  );
  assert.equal(
    authError({ code: "auth/user-not-found" }),
    authError({ code: "auth/wrong-password" }),
  );
  assert.equal(
    authError(new Error("private internal details")),
    "Could not complete that request. Please try again.",
  );
});
