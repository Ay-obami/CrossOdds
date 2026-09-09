function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

export function inverseNormalCdf(p) {
  if (!(p > 0 && p < 1)) {
    if (p === 0) return -Infinity;
    if (p === 1) return Infinity;
    throw new Error("inverseNormalCdf requires 0 <= p <= 1");
  }
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q;
  let r;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5;
  r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function standardNormalPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Phi_2(a,b;rho) = integral phi(x) Phi((b-rho*x)/sqrt(1-rho^2)) dx.
// Simpson integration is deterministic and accurate enough for an interactive MVP.
export function bivariateNormalCdf(a, b, rho) {
  const r = Math.max(-0.9999, Math.min(0.9999, rho));
  if (a === -Infinity || b === -Infinity) return 0;
  if (a === Infinity) return normalCdf(b);
  if (b === Infinity) return normalCdf(a);
  if (Math.abs(r) < 1e-12) return normalCdf(a) * normalCdf(b);

  const lower = -9;
  const upper = Math.min(a, 9);
  if (upper <= lower) return 0;
  const n = 240;
  const h = (upper - lower) / n;
  const denom = Math.sqrt(1 - r * r);
  const f = (x) => standardNormalPdf(x) * normalCdf((b - r * x) / denom);
  let sum = f(lower) + f(upper);
  for (let i = 1; i < n; i++) sum += (i % 2 === 0 ? 2 : 4) * f(lower + i * h);
  return Math.max(0, Math.min(1, sum * h / 3));
}

export function jointAndProbability(pA, pB, rho) {
  if (!(pA >= 0 && pA <= 1 && pB >= 0 && pB <= 1)) throw new Error("Probabilities must be in [0,1]");
  if (pA === 0 || pB === 0) return 0;
  if (pA === 1) return pB;
  if (pB === 1) return pA;
  const joint = bivariateNormalCdf(inverseNormalCdf(pA), inverseNormalCdf(pB), rho);
  const lower = Math.max(0, pA + pB - 1);
  const upper = Math.min(pA, pB);
  return Math.max(lower, Math.min(upper, joint));
}
