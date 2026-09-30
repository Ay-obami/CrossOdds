import { priceBasket as priceBasketCore } from "../signals/basket.mjs";

const sentiments = {
  BTC: { asset: "BTC", markets: 1, pricedMarkets: 1, probability: 0.645, sentiment: 64.5, totalDepth: 100, windows: [{pool: "synthetic-btc-15", intervalMin:15, intervalSec:900, impliedProbabilityRaw:0.645, impliedProbability:64.5}] },
  ETH: { asset: "ETH", markets: 1, pricedMarkets: 1, probability: 0.581, sentiment: 58.1, totalDepth: 100, windows: [{pool: "synthetic-eth-15", intervalMin:15, intervalSec:900, impliedProbabilityRaw:0.581, impliedProbability:58.1}] },
};
const correlation = { assetA: "BTC", assetB: "ETH", status: "ok", correlation: 0.68, interval: "15m", marketWindowMin: 15, samples: 47, realSamples: 47, filledSamples: 0, coverage: 1, confidence: "high", qualityScore: 0.86, tradeCountA: 188, tradeCountB: 61, spanSeconds: 41400, methodology: "deterministic synthetic demonstration correlation" };
const tagged = (value) => ({ ...value, dataMode: "synthetic_demo", live: false });

export async function listAssets() { return tagged({ assets: ["BTC", "ETH"], totalLiveMarkets: 2 }); }
export async function getAssetSentiment(asset) { return tagged(sentiments[asset] || { asset, markets: 0, sentiment: null, probability: null, note: "no demo market for this asset" }); }
export async function getDivergence(asset) { return tagged({ asset, divergence: null, note: "divergence is not fabricated in deterministic demo mode" }); }
export async function getMarketSnapshot(asset) { return getAssetSentiment(asset); }
export async function calculateAssetCorrelation(assetA, assetB) {
  if (new Set([assetA.toUpperCase(), assetB.toUpperCase()]).size !== 2 || ![assetA, assetB].every((a) => ["BTC","ETH"].includes(a.toUpperCase()))) return tagged({ assetA, assetB, status: "insufficient_data", correlation: null, note: "demo mode only contains BTC and ETH" });
  return tagged({ ...correlation, assetA: assetA.toUpperCase(), assetB: assetB.toUpperCase() });
}
export async function priceBasket({ legs }) {
  const result = await priceBasketCore({ legs }, {
    getAssetSentiment: async (asset) => sentiments[asset.toUpperCase()] || { asset, probability: null },
    calculateAssetCorrelation: async (a,b) => calculateAssetCorrelation(a,b),
  });
  return tagged(result);
}
