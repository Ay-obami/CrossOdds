import { ex } from "../client.mjs";

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function orderQuantity(order) {
  // SDK/order shapes have changed across DreamDEX releases. Prefer quantity,
  // but accept the common aliases rather than turning one unknown field into NaN.
  for (const key of ["quantity", "remainingQuantity", "size", "amount", "baseAmount"]) {
    const value = finiteNumber(order?.[key]);
    if (value !== null && value >= 0) return value;
  }
  return null;
}

export async function readBook(pool) {
  const [bids, asks] = await Promise.all([
    ex.client.getAllOpenOrdersOnchain(pool, { isBid: true }),
    ex.client.getAllOpenOrdersOnchain(pool, { isBid: false }),
  ]);
  const bidOrders = bids.orders || [];
  const askOrders = asks.orders || [];
  const bidPrices = bidOrders.map((order) => finiteNumber(order.price)).filter((value) => value !== null);
  const askPrices = askOrders.map((order) => finiteNumber(order.price)).filter((value) => value !== null);
  const bestBid = bidPrices.length ? Math.max(...bidPrices) : null;
  const bestAsk = askPrices.length ? Math.min(...askPrices) : null;

  function depth(orders) {
    let total = 0;
    let observed = 0;
    for (const order of orders) {
      const quantity = orderQuantity(order);
      if (quantity === null) continue;
      total += quantity / 1e6;
      observed++;
    }
    return observed ? total : null;
  }

  const bidDepth = depth(bidOrders);
  const askDepth = depth(askOrders);
  const totalDepth = bidDepth !== null || askDepth !== null ? (bidDepth || 0) + (askDepth || 0) : null;

  let impliedProbability = null;
  if (bestBid !== null && bestAsk !== null) impliedProbability = (bestBid + bestAsk) / 2 / 1e6;
  else if (bestBid !== null) impliedProbability = bestBid / 1e6;
  else if (bestAsk !== null) impliedProbability = bestAsk / 1e6;

  return {
    pool,
    bestBid,
    bestAsk,
    bidDepth,
    askDepth,
    depth: Number.isFinite(totalDepth) ? totalDepth : null,
    spread: bestBid !== null && bestAsk !== null ? (bestAsk - bestBid) / 1e6 : null,
    impliedProbability,
  };
}
