import test from "node:test";
import assert from "node:assert/strict";
import { shrinkCorrelationForPricing } from "../src/signals/quality.mjs";
import { priceBasket } from "../src/signals/basket.mjs";

test("low-quality extreme correlations are shrunk toward independence", () => {
  const result = shrinkCorrelationForPricing(-0.865, 0.35);
  assert.ok(Math.abs(result.pricingCorrelation - (-0.30275)) < 1e-12);
  assert.equal(result.reliability, 0.35);
});

test("zero quality removes correlation adjustment", () => {
  const result = shrinkCorrelationForPricing(0.9, 0);
  assert.equal(result.pricingCorrelation, 0);
});

test("high quality preserves most of the observed relationship", () => {
  const result = shrinkCorrelationForPricing(0.7, 0.9);
  assert.ok(Math.abs(result.pricingCorrelation - 0.63) < 1e-12);
});

test("basket exposes raw and pricing correlations separately", async () => {
  const sentiment = {
    BTC: { asset: "BTC", windows: [{ pool: "0xbtc", intervalMin: 15, impliedProbabilityRaw: 0.0845 }] },
    ETH: { asset: "ETH", windows: [{ pool: "0xeth", intervalMin: 15, impliedProbabilityRaw: 0.244 }] },
  };
  const result = await priceBasket({ legs: [{ asset: "BTC", direction: "UP" }, { asset: "ETH", direction: "UP" }] }, {
    getAssetSentiment: async (asset) => sentiment[asset],
    calculateAssetCorrelation: async () => ({ status: "ok", correlation: -0.865, qualityScore: 0.35, confidence: "low", samples: 6, interval: "5m", marketWindowMin: 15, marketPoolA: "0xbtc", marketPoolB: "0xeth", estimator: "aligned_pearson" }),
  });
  assert.equal(result.rawCorrelation, -0.865);
  assert.ok(Math.abs(result.pricingCorrelation - (-0.30275)) < 1e-12);
  assert.equal(result.pricingReliability, 0.35);
  assert.ok(result.adjustedProbability > 0);
  assert.ok(result.adjustedProbability < result.independentProbability);
});
