#!/usr/bin/env node
import { calculateAssetCorrelation } from "../src/signals/correlation.mjs";
import { priceBasket } from "../src/signals/basket.mjs";

const markets = [
  { asset: "BTC", pool: "0x0000000000000000000000000000000000000001", intervalSec: 900, secondsToExpiry: 1200 },
  { asset: "ETH", pool: "0x0000000000000000000000000000000000000002", intervalSec: 900, secondsToExpiry: 1200 },
];
const targetRho = 0.68;
const n = 48;
const rawA = Array.from({ length: n - 1 }, (_, i) => Math.sin(i * 0.71) + 0.45 * Math.cos(i * 0.23));
const rawZ = Array.from({ length: n - 1 }, (_, i) => Math.cos(i * 1.13) - 0.30 * Math.sin(i * 0.37));
const standardize = (xs) => { const mean = xs.reduce((s,v)=>s+v,0)/xs.length; const centered = xs.map(v=>v-mean); const sd=Math.sqrt(centered.reduce((s,v)=>s+v*v,0)/centered.length); return centered.map(v=>v/sd); };
const x = standardize(rawA);
let z = standardize(rawZ);
const projection = z.reduce((s,v,i)=>s+v*x[i],0) / x.reduce((s,v)=>s+v*v,0);
z = standardize(z.map((v,i)=>v-projection*x[i]));
const y = x.map((v,i)=>targetRho*v + Math.sqrt(1-targetRho*targetRho)*z[i]);
const pricesFromReturns = (initial, rs) => { const out=[initial]; for (const r of rs) out.push(out.at(-1)*Math.exp(r*0.012)); return out; };
const btc = pricesFromReturns(100, x);
const eth = pricesFromReturns(200, y);
const getCandles = async ({ pool, interval }) => {
  const values = pool.endsWith("1") ? btc : eth;
  const sec = interval === "5m" ? 300 : interval === "15m" ? 900 : 3600;
  return values.map((close, i) => ({ timestamp: 1_780_000_000 + i * sec, close, open: close, high: close, low: close, tradeCount: 4, baseVolume: 1, quoteVolume: 1 }));
};
const correlationDeps = { disableCache: true, discoverLiveMarkets: async () => markets, getCandles };
const correlation = await calculateAssetCorrelation("BTC", "ETH", correlationDeps);
const basket = await priceBasket({ legs: [{ asset: "BTC", direction: "UP" }, { asset: "ETH", direction: "UP" }] }, {
  getAssetSentiment: async (asset) => ({ asset, probability: asset === "BTC" ? 0.645 : 0.581 }),
  calculateAssetCorrelation: async () => correlation,
});

console.log("=== READOUT CORRELATION ENGINE (DETERMINISTIC DEMO) ===\n");
console.log(`BTC ↔ ETH correlation:       ${correlation.correlation}`);
console.log(`Selected candle interval:    ${correlation.interval}`);
console.log(`Aligned return observations: ${correlation.samples}`);
console.log(`Confidence:                   ${correlation.confidence}`);
console.log(`Independent joint price:      ${(basket.independentProbability * 100).toFixed(2)}%`);
console.log(`Correlation-adjusted price:   ${(basket.adjustedProbability * 100).toFixed(2)}%`);
console.log(`Difference:                   ${(basket.pricingDifference * 100).toFixed(2)} pts`);
console.log("\nDemo data is deterministic test data. Run npm run test:correlation:live for DreamDEX testnet data.");
