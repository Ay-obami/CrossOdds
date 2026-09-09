import test from "node:test";
import assert from "node:assert/strict";
import { priceBasket } from "../src/signals/basket.mjs";

const sentiment = {
  BTC: { asset: "BTC", probability: 0.65 },
  ETH: { asset: "ETH", probability: 0.58 },
};
const deps = {
  getAssetSentiment: async (asset) => sentiment[asset.toUpperCase()],
  calculateAssetCorrelation: async () => ({ status: "ok", correlation: 0.7, confidence: "medium", samples: 30, interval: "15m" }),
};

test("two UP legs use positive rho", async () => {
  const result = await priceBasket({ legs: [{ asset: "BTC", direction: "UP" }, { asset: "ETH", direction: "UP" }] }, deps);
  assert.equal(result.status, "ok");
  assert.ok(result.adjustedProbability > result.independentProbability);
});

test("UP/DOWN flips effective correlation", async () => {
  const result = await priceBasket({ legs: [{ asset: "BTC", direction: "UP" }, { asset: "ETH", direction: "DOWN" }] }, deps);
  assert.equal(result.status, "ok");
  assert.equal(result.rawEffectiveCorrelation, -0.7);
  assert.ok(Math.abs(result.effectiveCorrelation - (-0.455)) < 1e-12);
});
