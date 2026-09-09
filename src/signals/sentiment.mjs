import { discoverLiveMarkets } from "../markets/discovery.mjs";
import { readBook } from "../markets/orderbook.mjs";
import { TtlCache, makeSnapshotId } from "../cache/ttl.mjs";

export const SENTIMENT_CACHE_MS = 10_000;
const sentimentCache = new TtlCache(SENTIMENT_CACHE_MS);

export function clearSentimentCache() { sentimentCache.clear(); }

function marketWeight(book) {
  if (Number.isFinite(book.depth) && book.depth > 0) return { weight: book.depth, weightSource: "depth" };
  // When DreamDEX exposes usable bid/ask prices but not quantity/depth, spread
  // still carries information about quote quality. Cap the inverse-spread weight
  // so a near-zero spread cannot dominate the aggregate.
  if (Number.isFinite(book.spread) && book.spread > 0) return { weight: Math.min(100, 1 / book.spread), weightSource: "inverse_spread" };
  return { weight: 1, weightSource: "equal" };
}

export async function getAssetSentiment(asset, options = {}) {
  const symbol = asset.toUpperCase();
  if (!options.disableCache) {
    const cached = sentimentCache.get(symbol);
    if (cached) return { ...cached.value, cache: { hit: true, cachedAt: cached.at, expiresAt: cached.expiresAt } };
  }
  const markets = (await discoverLiveMarkets()).filter((market) => market.asset === symbol);
  if (!markets.length) return { asset: symbol, markets: 0, sentiment: null, note: "no live markets for this asset" };

  const books = await Promise.all(markets.map((market) => readBook(market.pool)));
  const priced = books
    .map((book, index) => ({ ...book, market: markets[index], ...marketWeight(book) }))
    .filter((book) => Number.isFinite(book.impliedProbability));

  if (!priced.length) return { asset: symbol, markets: markets.length, sentiment: null, note: "no priced order books yet" };

  const totalWeight = priced.reduce((sum, book) => sum + book.weight, 0);
  const weighted = priced.reduce((sum, book) => sum + book.impliedProbability * book.weight, 0) / totalWeight;
  const finiteDepths = priced.map((book) => book.depth).filter((depth) => Number.isFinite(depth));
  const totalDepth = finiteDepths.length ? finiteDepths.reduce((sum, depth) => sum + depth, 0) : null;
  const weighting = priced.every((book) => book.weightSource === "depth") ? "depth" : priced.some((book) => book.weightSource === "depth") ? "hybrid" : priced.some((book) => book.weightSource === "inverse_spread") ? "inverse_spread" : "equal";

  const observedAt = Date.now();
  const value = {
    asset: symbol,
    snapshotId: makeSnapshotId("sent", [symbol, ...priced.map((book) => book.market.pool)], observedAt),
    observedAt,
    markets: markets.length,
    pricedMarkets: priced.length,
    probability: weighted,
    sentiment: Math.round(weighted * 1000) / 10,
    totalDepth: totalDepth === null ? null : Math.round(totalDepth * 100) / 100,
    weighting,
    windows: priced.map((book) => ({
      pool: book.market.pool,
      intervalMin: book.market.intervalSec / 60,
      intervalSec: book.market.intervalSec,
      impliedProbabilityRaw: book.impliedProbability,
      impliedProbability: Math.round(book.impliedProbability * 1000) / 10,
      depth: Number.isFinite(book.depth) ? Math.round(book.depth * 100) / 100 : null,
      spread: book.spread,
      weight: Math.round(book.weight * 1000) / 1000,
      weightSource: book.weightSource,
      secondsToExpiry: book.market.secondsToExpiry,
      expiry: book.market.expiry,
    })),
  };
  if (!options.disableCache) {
    const entry = sentimentCache.set(symbol, value, observedAt);
    return { ...value, cache: { hit: false, cachedAt: entry.at, expiresAt: entry.expiresAt } };
  }
  return value;
}

export async function listAssets() {
  const markets = await discoverLiveMarkets();
  return { assets: [...new Set(markets.map((market) => market.asset))], totalLiveMarkets: markets.length };
}

export async function getMarketSnapshot(asset) {
  return getAssetSentiment(asset);
}
