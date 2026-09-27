// sigrun.js：按处理预算处理并留账
import { foldTimes, coded } from "./sigs.js";

function eventKey(kind, fingerprint, at, id) {
  return id !== undefined ? id : kind + ":" + fingerprint + ":" + at;
}

function validate(spec, events) {
  const code = spec.event_error_code || "E_BAD_EVENT";
  if (!Number.isInteger(spec.window) || spec.window <= 0) {
    throw coded(code, "窗口宽度不是正整数");
  }
  events.forEach(function (ev) {
    const kind = ev && ev.kind === undefined ? "ingest" : ev && ev.kind;
    const ok = Boolean(ev) && kind === "ingest"
      && typeof ev.fingerprint === "string" && ev.fingerprint.length > 0
      && Number.isInteger(ev.at) && ev.at >= 0;
    if (!ok) throw coded(code, "样本不合法");
  });
}

function applyEvent(groups, fingerprint, at, window) {
  let lo = 0;
  let hi = groups.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (groups[mid][0] < fingerprint) lo = mid + 1; else hi = mid;
  }
  if (lo < groups.length && groups[lo][0] === fingerprint) {
    groups[lo] = [fingerprint, foldTimes(groups[lo][1], at, window)];
  } else {
    groups.splice(lo, 0, [fingerprint, foldTimes([], at, window)]);
  }
}

function copyGroups(groups) {
  return (groups || []).map(function (row) { return [row[0], row[1].slice()]; });
}

export function step(spec) {
  const state = spec.state || { groups: [], ledger: [], applied: [] };
  const events = spec.events || [];
  validate(spec, events);
  const groups = copyGroups(state.groups);
  const ledger = (state.ledger || []).map(function (row) { return row.slice(); });
  const applied = (state.applied || []).slice();
  const seen = new Set(applied);
  let budgetLeft = spec.budget || 0;
  let served = 0;
  let judged = 0;
  events.forEach(function (ev) {
    judged += 1;
    const kind = ev.kind === undefined ? "ingest" : ev.kind;
    const key = eventKey(kind, ev.fingerprint, ev.at, ev.id);
    if (seen.has(key)) return;
    if (budgetLeft > 0) {
      budgetLeft -= 1;
      applyEvent(groups, ev.fingerprint, ev.at, spec.window);
      served += 1;
    } else {
      ledger.push([kind, ev.fingerprint, ev.at]);
    }
    seen.add(key);
    applied.push(key);
  });
  return { state: { groups: groups, ledger: ledger, applied: applied },
           served: served, ledger_before: ledger.length, ledger: ledger,
           judged: judged, judged_bound: events.length };
}

export function close(spec) {
  const state = spec.state || { groups: [], ledger: [], applied: [] };
  validate(spec, []);
  const groups = copyGroups(state.groups);
  let catchup = 0;
  (state.ledger || []).forEach(function (row) {
    applyEvent(groups, row[1], row[2], spec.window);
    catchup += 1;
  });
  return { state: { groups: groups, ledger: [], applied: (state.applied || []).slice() },
           catchup: catchup };
}
