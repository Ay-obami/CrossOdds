import test from "node:test";
import assert from "node:assert/strict";
import { calculateAssetCorrelation } from "../src/signals/correlation.mjs";

function makeCandles(pool, interval) {
  const base = pool.endsWith("1") ? 100 : 200;
  const values = [1, 1.02, 1.01, 1.04, 1.03, 1.07, 1.06, 1.09, 1.11, 1.1, 1.13, 1.15, 1.14, 1.18, 1.2, 1.19, 1.23, 1.24, 1.22, 1.26, 1.28, 1.27, 1.3, 1.33, 1.31, 1.35, 1.36, 1.39, 1.38, 1.42];
  const sec = interval === "5m" ? 300 : interval === "15m" ? 900 : 3600;
  return values.map((v, i) => ({ timestamp: 1_780_000_000 + i * sec, close: base * v, tradeCount: 3, open: base*v, high: base*v, low: base*v, baseVolume:1, quoteVolume:1 }));
}

test("engine selects a usable interval and correlates returns", async () => {
  const markets = [
    { asset: "BTC", pool: "0x0000000000000000000000000000000000000001", intervalSec: 900, expiry: 9999999999, secondsToExpiry: 1000 },
    { asset: "ETH", pool: "0x0000000000000000000000000000000000000002", intervalSec: 900, expiry: 9999999999, secondsToExpiry: 1000 },
  ];
  const result = await calculateAssetCorrelation("BTC", "ETH", {
    disableCache: true,
    discoverLiveMarkets: async () => markets,
    getCandles: async ({ pool, interval }) => makeCandles(pool, interval),
  });
  assert.equal(result.status, "ok");
  assert.ok(result.samples >= 25);
  assert.ok(result.correlation > 0.99);
});
