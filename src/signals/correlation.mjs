import { CANDLE_INTERVALS } from "../markets/candles.mjs";
import { alignCandles } from "../math/alignment.mjs";
import { logReturns } from "../math/returns.mjs";
import { pearson } from "../math/correlation.mjs";
import { hayashiYoshidaCorrelation } from "../math/asynchronous-correlation.mjs";
import { scoreCorrelationQuality } from "./quality.mjs";
import { TtlCache, makeSnapshotId } from "../cache/ttl.mjs";

const CANDIDATE_INTERVALS = ["5m", "15m", "1h"];
export const CORRELATION_CACHE_MS = 30_000;
const correlationCache = new TtlCache(CORRELATION_CACHE_MS);

export function clearCorrelationCache() { correlationCache.clear(); }

function matchingWindowPairs(marketsA, marketsB) {
  const pairs = [];
  for (const a of marketsA) for (const b of marketsB) if (a.intervalSec === b.intervalSec) pairs.push({ a, b });
  return pairs;
}

function prepareAlignedReturns(candlesA, candlesB, intervalSec) {
  const alignedCandles = alignCandles(candlesA, candlesB, { bucketSec: intervalSec, maxCarryBuckets: 1 });
  const seriesA = alignedCandles.map((row) => ({ timestamp: row.timestamp, close: row.a.close, source: row.a.source }));
  const seriesB = alignedCandles.map((row) => ({ timestamp: row.timestamp, close: row.b.close, source: row.b.source }));
  const returnsA = logReturns(seriesA);
  const returnsB = logReturns(seriesB);
  const byB = new Map(returnsB.map((point) => [point.timestamp, point]));
  return returnsA.flatMap((a) => {
    const b = byB.get(a.timestamp);
    return b ? [{ timestamp: a.timestamp, a: a.return, b: b.return, filled: a.source === "filled" || b.source === "filled" }] : [];
  });
}

async function resolveDependencies(deps) {
  const discoverLiveMarkets = deps.discoverLiveMarkets || (await import("../markets/discovery.mjs")).discoverLiveMarkets;
  const getCandles = deps.getCandles || (await import("../markets/candles.mjs")).getCandles;
  return { discoverLiveMarkets, getCandles };
}

async function evaluatePair(pair, candleInterval, deps) {
  const [candlesA, candlesB] = await Promise.all([
    deps.getCandles({ pool: pair.a.pool, interval: candleInterval }),
    deps.getCandles({ pool: pair.b.pool, interval: candleInterval }),
  ]);
  const intervalSec = CANDLE_INTERVALS[candleInterval];
  const points = prepareAlignedReturns(candlesA, candlesB, intervalSec);
  const synchronousCorrelation = pearson(points.map((point) => point.a), points.map((point) => point.b));
  const asynchronous = hayashiYoshidaCorrelation(candlesA, candlesB);
  const useSynchronous = synchronousCorrelation !== null && points.length >= 5;
  const correlation = useSynchronous ? synchronousCorrelation : asynchronous.correlation;
  const estimator = useSynchronous ? "aligned_pearson" : asynchronous.correlation !== null ? "hayashi_yoshida" : null;
  const samples = useSynchronous ? points.length : Math.min(asynchronous.returnsA, asynchronous.returnsB);
  const overlapPairs = useSynchronous ? points.length : asynchronous.overlapPairs;
  const filledSamples = useSynchronous ? points.filter((point) => point.filled).length : 0;
  const allTimestamps = [...candlesA, ...candlesB].map((c) => Number(c.timestamp)).filter(Number.isFinite).sort((a, b) => a - b);
  const spanSeconds = allTimestamps.length > 1 ? allTimestamps.at(-1) - allTimestamps[0] : 0;
  const tradeCountA = candlesA.reduce((sum, candle) => sum + Number(candle.tradeCount || 0), 0);
  const tradeCountB = candlesB.reduce((sum, candle) => sum + Number(candle.tradeCount || 0), 0);
  let quality = scoreCorrelationQuality({ samples, filledSamples, tradeCountA, tradeCountB, spanSeconds });
  if (estimator === "hayashi_yoshida" && quality.confidence === "high") quality = { ...quality, confidence: "medium", score: Math.min(quality.score, 0.79), reason: "asynchronous estimator capped at medium confidence on sparse event-market data" };
  return { correlation, estimator, samples, overlapPairs, filledSamples, realSamples: samples - filledSamples, tradeCountA, tradeCountB, spanSeconds, quality, candleInterval, marketWindowMin: pair.a.intervalSec / 60, marketA: pair.a, marketB: pair.b, points };
}

function resultRank(result) {
  const confidenceWeight = { high: 4, medium: 3, low: 2, very_low: 1, insufficient: 0 }[result.quality.confidence] || 0;
  const estimatorWeight = result.estimator === "aligned_pearson" ? 10_000 : 0;
  return confidenceWeight * 1_000_000 + result.quality.score * 100_000 + estimatorWeight + Math.min(result.samples, 999);
}

export async function calculateAssetCorrelation(assetA, assetB, deps = {}) {
  const aSymbol = assetA.toUpperCase();
  const bSymbol = assetB.toUpperCase();
  if (aSymbol === bSymbol) throw new Error("Correlation requires two different assets");
  const cacheKey = `${aSymbol}:${bSymbol}`;
  if (!deps.disableCache) {
    const cached = correlationCache.get(cacheKey);
    if (cached) return { ...cached.value, cache: { hit: true, cachedAt: cached.at, expiresAt: cached.expiresAt } };
  }

  const resolved = await resolveDependencies(deps);
  const markets = await resolved.discoverLiveMarkets();
  const marketsA = markets.filter((market) => market.asset === aSymbol);
  const marketsB = markets.filter((market) => market.asset === bSymbol);
  if (!marketsA.length || !marketsB.length) return { assetA: aSymbol, assetB: bSymbol, status: "insufficient_data", correlation: null, note: "both assets need at least one live DreamDEX market" };

  let pairs = matchingWindowPairs(marketsA, marketsB);
  if (!pairs.length) pairs = [{ a: [...marketsA].sort((x, y) => x.intervalSec - y.intervalSec)[0], b: [...marketsB].sort((x, y) => x.intervalSec - y.intervalSec)[0] }];

  const evaluations = [];
  for (const pair of pairs) {
    for (const interval of CANDIDATE_INTERVALS) {
      try { evaluations.push(await evaluatePair(pair, interval, resolved)); }
      catch (error) { evaluations.push({ correlation: null, estimator: null, samples: 0, overlapPairs: 0, quality: { confidence: "insufficient", score: 0 }, candleInterval: interval, marketWindowMin: pair.a.intervalSec / 60, error: error.message }); }
    }
  }

  const valid = evaluations.filter((result) => result.correlation !== null && result.samples >= 5).sort((a, b) => resultRank(b) - resultRank(a));
  if (!valid.length) return { assetA: aSymbol, assetB: bSymbol, status: "insufficient_data", correlation: null, note: "not enough synchronous or asynchronous candle returns to estimate correlation reliably", attempts: evaluations.map((r) => ({ interval: r.candleInterval, marketWindowMin: r.marketWindowMin, samples: r.samples, overlapPairs: r.overlapPairs, estimator: r.estimator, error: r.error })) };

  const best = valid[0];
  const computedAt = Date.now();
  const snapshotId = makeSnapshotId("corr", [cacheKey, best.marketA.pool, best.marketB.pool, best.candleInterval], computedAt);
  const value = {
    assetA: aSymbol, assetB: bSymbol, status: "ok",
    snapshotId, observedAt: computedAt,
    correlation: Math.round(best.correlation * 1000) / 1000,
    estimator: best.estimator,
    interval: best.candleInterval, marketWindowMin: best.marketWindowMin,
    marketPoolA: best.marketA.pool, marketPoolB: best.marketB.pool,
    samples: best.samples, overlapPairs: best.overlapPairs, realSamples: best.realSamples, filledSamples: best.filledSamples,
    coverage: best.quality.coverage, confidence: best.quality.confidence, qualityScore: best.quality.score,
    tradeCountA: best.tradeCountA, tradeCountB: best.tradeCountB, spanSeconds: best.spanSeconds,
    methodology: best.estimator === "aligned_pearson"
      ? "Pearson correlation of aligned log returns; interval selected by sample, coverage, and trade quality"
      : "Hayashi-Yoshida style correlation of asynchronous log-return intervals; used when exact DreamDEX candle synchronization is too sparse",
  };
  if (!deps.disableCache) {
    const entry = correlationCache.set(cacheKey, value, computedAt);
    return { ...value, cache: { hit: false, cachedAt: entry.at, expiresAt: entry.expiresAt } };
  }
  return value;
}
