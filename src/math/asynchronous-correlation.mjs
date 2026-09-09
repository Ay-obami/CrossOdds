function validSeries(candles) {
  return candles
    .filter((c) => Number.isFinite(Number(c.timestamp)) && Number(c.close) > 0)
    .map((c) => ({ timestamp: Number(c.timestamp), close: Number(c.close) }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function asynchronousReturns(candles) {
  const series = validSeries(candles);
  const out = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const current = series[i];
    if (current.timestamp <= prev.timestamp) continue;
    const value = Math.log(current.close / prev.close);
    if (!Number.isFinite(value)) continue;
    out.push({ start: prev.timestamp, end: current.timestamp, return: value });
  }
  return out;
}

function overlaps(a, b) {
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}

// Hayashi-Yoshida style estimator for non-synchronously observed price series.
// It uses only overlapping return intervals and therefore avoids inventing
// prices merely to force two sparse DreamDEX markets onto identical timestamps.
export function hayashiYoshidaCorrelation(candlesA, candlesB) {
  const a = asynchronousReturns(candlesA);
  const b = asynchronousReturns(candlesB);
  if (a.length < 3 || b.length < 3) return { correlation: null, overlapPairs: 0, returnsA: a.length, returnsB: b.length };

  let covariance = 0;
  let overlapPairs = 0;
  for (const ra of a) {
    for (const rb of b) {
      if (!overlaps(ra, rb)) continue;
      covariance += ra.return * rb.return;
      overlapPairs++;
    }
  }
  if (overlapPairs < 5) return { correlation: null, overlapPairs, returnsA: a.length, returnsB: b.length };

  const varianceA = a.reduce((sum, point) => sum + point.return ** 2, 0);
  const varianceB = b.reduce((sum, point) => sum + point.return ** 2, 0);
  const denominator = Math.sqrt(varianceA * varianceB);
  if (!Number.isFinite(denominator) || denominator === 0) return { correlation: null, overlapPairs, returnsA: a.length, returnsB: b.length };

  const raw = covariance / denominator;
  if (!Number.isFinite(raw)) return { correlation: null, overlapPairs, returnsA: a.length, returnsB: b.length };
  return {
    correlation: Math.max(-1, Math.min(1, raw)),
    overlapPairs,
    returnsA: a.length,
    returnsB: b.length,
  };
}
