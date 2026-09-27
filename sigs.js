// sigs.js：指纹的时间表操作
export function foldTimes(times, at, window) {
  const cutoff = at - window;
  const kept = times.filter(function (t) { return t > cutoff; });
  if (kept.length > 0 && at < kept[kept.length - 1]) {
    const error = new Error("event time " + at + " is earlier than recorded tail "
      + kept[kept.length - 1]);
    error.code = "E_TIME_BACKWARDS";
    throw error;
  }
  if (kept.indexOf(at) === -1) {
    kept.push(at);
  }
  return kept;
}

export function summarize(groups) {
  return groups.map(function (group) {
    const times = group[1];
    return [group[0], times.length, times[0], times[times.length - 1]];
  }).sort(function (a, b) {
    return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0);
  });
}
