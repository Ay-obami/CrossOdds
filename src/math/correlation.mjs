export function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const a = xs.slice(0, n);
  const b = ys.slice(0, n);
  const meanA = a.reduce((sum, value) => sum + value, 0) / n;
  const meanB = b.reduce((sum, value) => sum + value, 0) / n;
  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    covariance += da * db;
    varianceA += da * da;
    varianceB += db * db;
  }
  if (varianceA === 0 || varianceB === 0) return null;
  return Math.max(-1, Math.min(1, covariance / Math.sqrt(varianceA * varianceB)));
}
