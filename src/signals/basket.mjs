import { jointAndProbability } from "../math/probability.mjs";
import { shrinkCorrelationForPricing } from "./quality.mjs";

function directionProbability(probability, direction) {
  const normalized = direction.toUpperCase();
  if (normalized === "UP" || normalized === "YES") return probability;
  if (normalized === "DOWN" || normalized === "NO") return 1 - probability;
  throw new Error(`Unsupported direction: ${direction}`);
}
function signFor(direction) { return ["DOWN", "NO"].includes(direction.toUpperCase()) ? -1 : 1; }

async function resolveDependencies(deps) {
  const getAssetSentiment = deps.getAssetSentiment || (await import("./sentiment.mjs")).getAssetSentiment;
  const calculateAssetCorrelation = deps.calculateAssetCorrelation || (await import("./correlation.mjs")).calculateAssetCorrelation;
  return { getAssetSentiment, calculateAssetCorrelation };
}

function selectWindow(sentiment, correlation, side) {
  if (!Array.isArray(sentiment.windows) || !sentiment.windows.length) return null;
  const pool = side === "A" ? correlation?.marketPoolA : correlation?.marketPoolB;
  if (pool) {
    const exactPool = sentiment.windows.find((window) => window.pool?.toLowerCase() === pool.toLowerCase());
    if (exactPool) return exactPool;
  }
  if (Number.isFinite(correlation?.marketWindowMin)) {
    const matchingWindow = sentiment.windows.find((window) => window.intervalMin === correlation.marketWindowMin);
    if (matchingWindow) return matchingWindow;
  }
  // Prefer the shortest currently-priced horizon rather than blending unrelated
  // 5m/15m/60m event probabilities into a synthetic marginal.
  return [...sentiment.windows].filter((w) => Number.isFinite(w.impliedProbabilityRaw)).sort((a, b) => a.intervalMin - b.intervalMin)[0] || null;
}

function marginalProbability(sentiment, window) {
  if (Number.isFinite(window?.impliedProbabilityRaw)) return { probability: window.impliedProbabilityRaw, source: "matched_market_window", window };
  if (Number.isFinite(sentiment.probability)) return { probability: sentiment.probability, source: `asset_${sentiment.weighting || "aggregate"}`, window: null };
  return null;
}

export async function priceBasket({ legs }, deps = {}) {
  if (!Array.isArray(legs) || legs.length !== 2) throw new Error("Basket MVP requires exactly two legs");
  const [legA, legB] = legs;
  if (!legA?.asset || !legB?.asset) throw new Error("Each basket leg requires an asset");
  if (legA.asset.toUpperCase() === legB.asset.toUpperCase()) throw new Error("Basket legs must use different assets in v1");

  const resolved = await resolveDependencies(deps);
  const [sentimentA, sentimentB, correlation] = await Promise.all([
    resolved.getAssetSentiment(legA.asset), resolved.getAssetSentiment(legB.asset), resolved.calculateAssetCorrelation(legA.asset, legB.asset),
  ]);

  const windowA = selectWindow(sentimentA, correlation, "A");
  const windowB = selectWindow(sentimentB, correlation, "B");
  const marginalA = marginalProbability(sentimentA, windowA);
  const marginalB = marginalProbability(sentimentB, windowB);
  if (!marginalA || !marginalB) return { status: "insufficient_data", note: "both basket legs need at least one priced DreamDEX market", legs, sentimentA, sentimentB, correlation };

  const directionA = (legA.direction || "UP").toUpperCase();
  const directionB = (legB.direction || "UP").toUpperCase();
  const pA = directionProbability(marginalA.probability, directionA);
  const pB = directionProbability(marginalB.probability, directionB);
  const independentProbability = pA * pB;
  const base = {
    snapshot: {
      correlationSnapshotId: correlation?.snapshotId ?? null,
      correlationObservedAt: correlation?.observedAt ?? null,
      sentimentSnapshotA: sentimentA?.snapshotId ?? null,
      sentimentSnapshotB: sentimentB?.snapshotId ?? null,
      pricedAt: Date.now(),
    },
    legs: [
      { asset: legA.asset.toUpperCase(), direction: directionA, probability: pA, marginalSource: marginalA.source, intervalMin: marginalA.window?.intervalMin ?? null, pool: marginalA.window?.pool ?? null },
      { asset: legB.asset.toUpperCase(), direction: directionB, probability: pB, marginalSource: marginalB.source, intervalMin: marginalB.window?.intervalMin ?? null, pool: marginalB.window?.pool ?? null },
    ],
    independentProbability,
    correlation,
  };

  if (correlation.status !== "ok" || correlation.correlation === null) {
    return {
      status: "independence_only",
      note: "DreamDEX prices are usable, but current candle history is too asynchronous/sparse for a defensible correlation adjustment",
      ...base,
      adjustedProbability: null,
      pricingDifference: null,
      confidence: "insufficient",
      methodology: "Independent joint probability only; correlation adjustment withheld until live data quality clears the threshold",
    };
  }

  const shrinkage = shrinkCorrelationForPricing(correlation.correlation, correlation.qualityScore, correlation.confidence);
  const directionSign = signFor(directionA) * signFor(directionB);
  const rawEffectiveCorrelation = shrinkage.rawCorrelation * directionSign;
  const effectiveRho = shrinkage.pricingCorrelation * directionSign;
  const adjustedProbability = jointAndProbability(pA, pB, effectiveRho);

  return {
    status: "ok",
    ...base,
    adjustedProbability, pricingDifference: adjustedProbability - independentProbability,
    rawCorrelation: shrinkage.rawCorrelation,
    pricingCorrelation: shrinkage.pricingCorrelation,
    pricingReliability: shrinkage.reliability,
    rawEffectiveCorrelation,
    effectiveCorrelation: effectiveRho,
    confidence: correlation.confidence, samples: correlation.samples, interval: correlation.interval,
    estimator: correlation.estimator,
    methodology: "Gaussian copula joint probability using matched DreamDEX event-window marginals and a quality-shrunk return correlation",
  };
}
