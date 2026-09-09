#!/usr/bin/env node
// Live DreamDEX feasibility diagnostic. This intentionally requires network +
// a Shannon key because it proves the real data path rather than the pure math.
import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url) });
import { discoverLiveMarkets } from "../src/markets/discovery.mjs";
import { getCandles, CANDLE_INTERVALS } from "../src/markets/candles.mjs";
import { calculateAssetCorrelation } from "../src/signals/correlation.mjs";

const indexer = process.env.INDEXER_URL || "https://dev.smk.somnia.host/v1/graphql";
console.log(`Indexer: ${indexer}\n`);

console.log("=== STEP 1: reachability ===");
const markets = await discoverLiveMarkets();
if (!markets.length) {
  console.error("FAIL — no live markets discovered.");
  process.exit(1);
}
const assets = [...new Set(markets.map((market) => market.asset))];
console.log(`Discovered ${markets.length} live market(s) across assets: ${assets.join(", ")}\n`);

console.log("=== STEP 2: candle density per market ===");
for (const market of markets) {
  console.log(`\n${market.asset} pool=${market.pool} window=${market.intervalSec / 60}min expiresIn=${Math.round(market.secondsToExpiry / 60)}min`);
  for (const label of Object.keys(CANDLE_INTERVALS)) {
    try {
      const candles = await getCandles({ pool: market.pool, interval: label });
      if (!candles.length) { console.log(`  ${label.padEnd(4)} 0 candles`); continue; }
      const totalTrades = candles.reduce((sum, candle) => sum + candle.tradeCount, 0);
      const first = new Date(candles[0].timestamp * 1000).toISOString();
      const last = new Date(candles.at(-1).timestamp * 1000).toISOString();
      console.log(`  ${label.padEnd(4)} ${candles.length} candles, ${totalTrades} total trades, range ${first} -> ${last}, last close=${candles.at(-1).close}`);
    } catch (error) {
      console.log(`  ${label.padEnd(4)} ERROR: ${error.message}`);
    }
  }
}

console.log("\n=== STEP 3: production correlation feasibility ===");
let usable = 0;
for (let i = 0; i < assets.length; i++) {
  for (let j = i + 1; j < assets.length; j++) {
    const result = await calculateAssetCorrelation(assets[i], assets[j], { disableCache: true });
    console.log(`\n${assets[i]} vs ${assets[j]}`);
    if (result.status !== "ok") {
      console.log(`  insufficient: ${result.note}`);
      continue;
    }
    usable++;
    console.log(`  correlation=${result.correlation} interval=${result.interval} samples=${result.samples} real=${result.realSamples} filled=${result.filledSamples} coverage=${result.coverage} confidence=${result.confidence}`);
  }
}

console.log(`\nDone. Usable cross-asset correlations: ${usable}. Production correlation uses aligned log returns, not raw close-price levels.`);
if (!usable) process.exitCode = 2;
