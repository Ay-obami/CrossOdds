export function scoreCorrelationQuality({ samples, filledSamples = 0, tradeCountA = 0, tradeCountB = 0, spanSeconds = 0 }) {
  if (samples < 5) return { confidence: "insufficient", score: 0, reason: "fewer than 5 aligned return observations" };

  let score = samples >= 50 ? 1 : samples >= 25 ? 0.78 : samples >= 12 ? 0.56 : 0.32;
  const fillRatio = samples ? filledSamples / samples : 1;
  const coverage = samples ? (samples - filledSamples) / samples : 0;
  if (fillRatio > 0.4) score -= 0.3;
  else if (fillRatio > 0.2) score -= 0.15;
  else if (fillRatio > 0.05) score -= 0.05;

  const minTrades = Math.min(tradeCountA, tradeCountB);
  if (minTrades < 10) score -= 0.15;
  else if (minTrades >= 50) score += 0.08;

  if (spanSeconds > 0 && spanSeconds < 30 * 60) score -= 0.08;
  score = Math.max(0, Math.min(1, score));

  const confidence = score >= 0.8 ? "high" : score >= 0.55 ? "medium" : score >= 0.28 ? "low" : "very_low";
  return { confidence, score: Math.round(score * 100) / 100, coverage: Math.round(coverage * 1000) / 1000, fillRatio: Math.round(fillRatio * 1000) / 1000 };
}


export function shrinkCorrelationForPricing(correlation, qualityScore, confidence = null) {
  if (!Number.isFinite(correlation)) return { rawCorrelation: null, pricingCorrelation: null, reliability: 0 };
  const fallback = { high: 0.85, medium: 0.65, low: 0.35, very_low: 0.15, insufficient: 0 }[confidence] ?? 0;
  const reliability = Math.max(0, Math.min(1, Number.isFinite(qualityScore) ? qualityScore : fallback));
  // Empirical correlations from sparse prediction-market candles can be extreme.
  // Shrink toward independence in direct proportion to the engine's own data-quality score.
  const pricingCorrelation = Math.max(-0.95, Math.min(0.95, correlation * reliability));
  return {
    rawCorrelation: correlation,
    pricingCorrelation,
    reliability,
  };
}
