export function logReturns(candles) {
  const out = [];
  for (let i = 1; i < candles.length; i++) {
    const previous = Number(candles[i - 1].close);
    const current = Number(candles[i].close);
    if (!(previous > 0) || !(current > 0)) continue;
    out.push({ timestamp: candles[i].timestamp, return: Math.log(current / previous), source: candles[i].source || "real" });
  }
  return out;
}
