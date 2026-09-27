// sigrun.js：按处理预算处理并留账，收尾不限预算
import { foldTimes } from "./sigs.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function validWindow(window) {
  return Number.isInteger(window) && window >= 1;
}

function eventTriple(event) {
  if (!event || typeof event !== "object") fail("E_BAD_EVENT", "event must be an object");
  const kind = event.kind === undefined ? "ingest" : event.kind;
  if (kind !== "ingest") fail("E_BAD_EVENT", "unsupported event kind " + kind);
  if (typeof event.fingerprint !== "string" || event.fingerprint.length === 0) {
    fail("E_BAD_EVENT", "fingerprint must be a non-empty string");
  }
  if (!Number.isInteger(event.at) || event.at < 0) {
    fail("E_BAD_EVENT", "at must be a non-negative integer");
  }
  return ["ingest", event.fingerprint, event.at];
}

function run(state, events, window, budget) {
  const groups = (state.groups || []).map(function (group) {
    return [group[0], group[1].slice()];
  });
  const applied = (state.applied || []).slice();
  const incoming = (state.ledger || []).map(function (item) { return item.slice(); });
  const remaining = budget === Infinity ? Infinity : (Number.isInteger(budget) && budget >= 0 ? budget : 0);

  const candidates = incoming.concat(events.map(eventTriple));
  const pending = [];
  let served = 0;
  let allowance = remaining;

  candidates.forEach(function (triple) {
    const key = JSON.stringify(triple);
    if (applied.indexOf(key) !== -1) {
      return;
    }
    if (allowance === 0) {
      pending.push(triple);
      return;
    }
    const name = triple[1];
    const at = triple[2];
    let index = -1;
    for (let i = 0; i < groups.length; i += 1) {
      if (groups[i][0] === name) { index = i; break; }
    }
    if (index === -1) {
      groups.push([name, foldTimes([], at, window)]);
    } else {
      groups[index] = [name, foldTimes(groups[index][1], at, window)];
    }
    applied.push(key);
    served += 1;
    allowance -= 1;
  });

  return {
    state: { groups: groups, ledger: pending, applied: applied },
    served: served
  };
}

export function step(spec) {
  const state = spec.state || { groups: [], ledger: [], applied: [] };
  const events = spec.events || [];
  if (!validWindow(spec.window)) {
    fail("E_BAD_EVENT", "window must be a positive integer");
  }
  events.forEach(eventTriple);
  const result = run(state, events, spec.window, spec.budget);
  return {
    state: result.state,
    served: result.served,
    ledger_before: result.state.ledger.length,
    ledger: result.state.ledger,
    judged: result.served,
    judged_bound: (state.ledger || []).length + events.length
  };
}

export function close(spec) {
  const state = spec.state || { groups: [], ledger: [], applied: [] };
  const result = run(state, [], spec.window, Infinity);
  return { state: result.state, catchup: result.served };
}
