import assert from "node:assert";
import { foldTimes, summarize } from "../sigs.js";
import { step, close } from "../sigrun.js";
import { render } from "../app.js";

const base = {
  budget: 1, window: 5,
  state: { groups: [], ledger: [], applied: [] },
  events: [],
  backwards_error_code: "E_TIME_BACKWARDS", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("foldTimes returns a list", () => {
  assert.ok(Array.isArray(foldTimes([], 3, 5)));
});

check("summarize returns a list", () => {
  assert.ok(Array.isArray(summarize([])));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
