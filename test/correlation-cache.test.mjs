import test from "node:test";
import assert from "node:assert/strict";
import { calculateAssetCorrelation, clearCorrelationCache } from "../src/signals/correlation.mjs";

const markets = [
  { asset: "BTC", pool: "0xbtc", intervalSec: 900 },
  { asset: "ETH", pool: "0xeth", intervalSec: 900 },
];
const btc = [100,101,102,101,103,104,105,104].map((close, i) => ({ timestamp: i*300, close, tradeCount: 5 }));
const eth = [200,202,204,202,206,208,210,208].map((close, i) => ({ timestamp: i*300, close, tradeCount: 5 }));

function deps(counter) {
  return {
    discoverLiveMarkets: async () => markets,
    getCandles: async ({ pool }) => { counter.calls++; return pool === "0xbtc" ? btc : eth; },
  };
}

test("correlation cache reuses one computed snapshot inside its TTL", async () => {
  clearCorrelationCache();
  const counter = { calls: 0 };
  const first = await calculateAssetCorrelation("BTC", "ETH", deps(counter));
  const callsAfterFirst = counter.calls;
  const second = await calculateAssetCorrelation("BTC", "ETH", deps(counter));
  assert.equal(first.status, "ok");
  assert.equal(second.status, "ok");
  assert.equal(second.snapshotId, first.snapshotId);
  assert.equal(second.cache.hit, true);
  assert.equal(counter.calls, callsAfterFirst);
});

test("reversed asset order uses a separate directional cache entry", async () => {
  clearCorrelationCache();
  const counter = { calls: 0 };
  const forward = await calculateAssetCorrelation("BTC", "ETH", deps(counter));
  const afterForward = counter.calls;
  const reverse = await calculateAssetCorrelation("ETH", "BTC", deps(counter));
  assert.equal(forward.marketPoolA, "0xbtc");
  assert.equal(reverse.marketPoolA, "0xeth");
  assert.ok(counter.calls > afterForward);
});
