export function liveMarketsAt(markets, nowSec = Math.floor(Date.now() / 1000)) {
  return markets
    .filter((market) => Number.isFinite(market.expiry) && market.expiry > nowSec)
    .map((market) => ({ ...market, secondsToExpiry: market.expiry - nowSec }));
}
