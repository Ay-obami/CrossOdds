import test from "node:test";
import assert from "node:assert/strict";
import { priceBasket } from "../src/signals/basket.mjs";

const btc = {
  asset: "BTC", probability: 0.5, weighting: "inverse_spread",
  windows: [
    { pool: "0xbtc5", intervalMin: 5, impliedProbabilityRaw: 0.72 },
    { pool: "0xbtc15", intervalMin: 15, impliedProbabilityRaw: 0.76 },
    { pool: "0xbtc60", intervalMin: 60, impliedProbabilityRaw: 0.07 },
  ],
};
const eth = {
  asset: "ETH", probability: 0.65, weighting: "inverse_spread",
  windows: [
    { pool: "0xeth5", intervalMin: 5, impliedProbabilityRaw: 0.64 },
    { pool: "0xeth15", intervalMin: 15, impliedProbabilityRaw: 0.88 },
    { pool: "0xeth60", intervalMin: 60, impliedProbabilityRaw: 0.53 },
  ],
};

test("basket uses correlation-selected matching market window rather than blended sentiment", async () => {
  const result = await priceBasket({ legs: [{ asset: "BTC", direction: "UP" }, { asset: "ETH", direction: "UP" }] }, {
    getAssetSentiment: async (asset) => asset === "BTC" ? btc : eth,
    calculateAssetCorrelation: async () => ({ status: "ok", correlation: 0.4, confidence: "low", samples: 8, interval: "1h", marketWindowMin: 15, marketPoolA: "0xbtc15", marketPoolB: "0xeth15", estimator: "hayashi_yoshida" }),
  });
  assert.equal(result.status, "ok");
  assert.equal(result.legs[0].probability, 0.76);
  assert.equal(result.legs[1].probability, 0.88);
  assert.equal(result.legs[0].intervalMin, 15);
});

test("basket returns independent price when correlation remains insufficient", async () => {
  const result = await priceBasket({ legs: [{ asset: "BTC", direction: "UP" }, { asset: "ETH", direction: "UP" }] }, {
    getAssetSentiment: async (asset) => asset === "BTC" ? btc : eth,
    calculateAssetCorrelation: async () => ({ status: "insufficient_data", correlation: null }),
  });
  assert.equal(result.status, "independence_only");
  assert.ok(Math.abs(result.independentProbability - 0.72 * 0.64) < 1e-12);
  assert.equal(result.adjustedProbability, null);
});
