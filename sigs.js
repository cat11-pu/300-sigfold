// sigs.js：指纹的时间表操作
export function coded(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function foldTimes(times, at, window) {
  const kept = times.filter(function (t) { return t > at - window; });
  const last = kept.length ? kept[kept.length - 1] : undefined;
  if (last !== undefined && at < last) {
    throw coded("E_TIME_BACKWARDS", "样本时间早于该指纹已记的末次时间");
  }
  if (last === at) return kept;
  kept.push(at);
  return kept;
}

export function summarize(groups) {
  return groups
    .map(function (row) { return [row[0], row[1].length, row[1][0], row[1][row[1].length - 1]]; })
    .sort(function (x, y) { return x[0] < y[0] ? -1 : (x[0] > y[0] ? 1 : 0); });
}
