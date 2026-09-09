// Backward-compatible facade for the original Readout imports.
export { discoverLiveMarkets } from "./markets/discovery.mjs";
export { listAssets, getAssetSentiment, getMarketSnapshot } from "./signals/sentiment.mjs";
export { getDivergence } from "./signals/divergence.mjs";
export { calculateAssetCorrelation } from "./signals/correlation.mjs";
export { priceBasket } from "./signals/basket.mjs";
