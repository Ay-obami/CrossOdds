import test from "node:test";
import assert from "node:assert/strict";
import { priceBasket } from "../src/signals/basket.mjs";
import { getAssetSentiment, clearSentimentCache } from "../src/signals/sentiment.mjs";
import { liveMarketsAt } from "../src/markets/freshness.mjs";

test("cached discovery excludes expired markets and refreshes time remaining", () => {
  const markets = [{ asset: "BTC", expiry: 1002, secondsToExpiry: 2 }, { asset: "ETH", expiry: 1100, secondsToExpiry: 100 }];
  assert.deepEqual(liveMarketsAt(markets, 1002), [{ asset: "ETH", expiry: 1100, secondsToExpiry: 98 }]);
});

test("cached sentiment refreshes countdown and recomputes aggregate after a market expires", async () => {
  clearSentimentCache();
  let nowMs = 1_700_000_000_000;
  const nowSec = nowMs / 1000;
  let reads = 0;
  const markets = [
    { asset: "BTC", pool: "short", intervalSec: 300, expiry: nowSec + 3 },
    { asset: "BTC", pool: "long", intervalSec: 900, expiry: nowSec + 100 },
  ];
  const options = {
    now: () => nowMs,
    discoverLiveMarkets: async () => liveMarketsAt(markets, Math.floor(nowMs / 1000)),
    readBook: async (pool) => { reads++; return { pool, impliedProbability: pool === "short" ? 0.8 : 0.2, depth: 10 }; },
  };
  const first = await getAssetSentiment("BTC", options);
  assert.equal(first.probability, 0.5);
  nowMs += 2_000;
  const cached = await getAssetSentiment("BTC", options);
  assert.equal(cached.cache.hit, true);
  assert.equal(cached.windows[0].secondsToExpiry, 1);
  assert.equal(reads, 2);
  nowMs += 1_000;
  const refreshed = await getAssetSentiment("BTC", options);
  assert.equal(refreshed.cache.hit, false);
  assert.equal(refreshed.probability, 0.2);
  assert.deepEqual(refreshed.windows.map(w => w.pool), ["long"]);
});

test("basket refuses expired requested marginals even if a sentiment snapshot is cached", async () => {
  const expired = Math.floor(Date.now() / 1000) - 1;
  const sentiment = (asset) => ({ asset, probability: 0.7, windows: [{ pool: `${asset}-pool`, intervalMin: 15, impliedProbabilityRaw: 0.7, expiry: expired }] });
  const result = await priceBasket({ legs: [{ asset: "BTC", intervalMin: 15 }, { asset: "ETH", intervalMin: 15 }] }, {
    getAssetSentiment: async (asset) => sentiment(asset),
    calculateAssetCorrelation: async () => ({ status: "ok", correlation: 0.4, marketWindowMin: 15, marketPoolA: "BTC-pool", marketPoolB: "ETH-pool" }),
  });
  assert.equal(result.status, "insufficient_data");
  assert.equal(result.independentProbability, undefined);
});

test("expiry while reading the order book cannot enter the priced aggregate", async () => {
  clearSentimentCache();
  let nowMs = 1_700_000_000_000;
  const result = await getAssetSentiment("BTC", {
    now: () => nowMs,
    discoverLiveMarkets: async () => [
      { asset: "BTC", pool: "short", intervalSec: 300, expiry: 1_700_000_001 },
      { asset: "BTC", pool: "long", intervalSec: 900, expiry: 1_700_000_100 },
    ],
    readBook: async (pool) => {
      nowMs = 1_700_000_001_000;
      return { pool, impliedProbability: pool === "short" ? 0.8 : 0.2, depth: 10 };
    },
  });
  assert.equal(result.probability, 0.2);
  assert.deepEqual(result.windows.map(w => w.pool), ["long"]);
});

test("basket cannot revive an expired window through aggregate sentiment", async () => {
  const expired = Math.floor(Date.now() / 1000) - 1;
  const result = await priceBasket({ legs: [{ asset: "BTC" }, { asset: "ETH" }] }, {
    getAssetSentiment: async (asset) => ({ asset, probability: 0.7, windows: [{ pool: `${asset}-pool`, intervalMin: 15, impliedProbabilityRaw: 0.7, expiry: expired }] }),
    calculateAssetCorrelation: async () => ({ status: "insufficient_data", correlation: null }),
  });
  assert.equal(result.status, "insufficient_data");
  assert.equal(result.independentProbability, undefined);
});
test('cached quote is invalidated by an included order expiry inside cache TTL',async()=>{
 clearSentimentCache();let clock=1_700_000_000_000;let reads=0;
 const original=clock;
 const options={now:()=>clock,
 discoverLiveMarkets:async()=>[{asset:'BTC',pool:'pool',intervalSec:900,expiry:original/1000+100}],
 readBook:async()=>{reads++;return {pool:'pool',impliedProbability:reads===1?0.5:0.6,depth:10,validUntil:reads===1?original+1000:original+100000};}
 };
 const first=await getAssetSentiment('BTC',options);
 assert.equal(first.cache.expiresAt,original+1000);
 clock+=1000;
 const second=await getAssetSentiment('BTC',options);
 assert.equal(second.cache.hit,false);assert.equal(second.probability,0.6);assert.equal(reads,2);
 assert.equal(first.observedAt,original);
});
