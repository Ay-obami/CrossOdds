import { binaryPoolReadAbi } from '../../node_modules/@somnia-chain/markets-sdk/dist/readsAbi.js';
import { summarizeBook } from './orderbook-summary.mjs';

// SDK 0.28.1 getAllOpenOrdersOnchain reads only one page and cannot pin a block.
// Use its documented ABI directly, keeping all pages and both sides at one head.
export async function readBook(pool, options = {}) {
  const client = options.client || (await import('../client.mjs')).pub;
  const now = options.now || Date.now;
  const block = await client.getBlock();
  const blockTime = Number(block.timestamp) * 1000;
  const assertFresh = (asOf = now()) => {
    const age = asOf - blockTime;
    if (!Number.isFinite(blockTime) || age < -5_000 || age > 60_000) throw new Error('Order book chain head is stale or has an invalid timestamp');
  };
  assertFresh();
  async function side(isBid) {
    const orders = [];
    let cursor = 0n;
    const seen = new Set();
    for (let page = 0; page < 100; page++) {
      const [rows, hasMore, nextCursor] = await client.readContract({
        address: pool, abi: binaryPoolReadAbi, functionName: 'getAllOpenOrdersOffChain',
        args: [isBid, 100n, cursor], blockNumber: block.number,
      });
      if (!Array.isArray(rows) || typeof hasMore !== 'boolean') throw new Error('Invalid order book page');
      // Resting expired orders are still returned by the contract but unmatchable.
      orders.push(...rows);
      if (!hasMore) return { orders };
      const next = BigInt(nextCursor);
      if (next === cursor || seen.has(next.toString())) throw new Error('Order book pagination cursor did not advance');
      seen.add(cursor.toString());
      cursor = next;
    }
    throw new Error('Order book pagination exceeded 100 pages; partial book withheld');
  }
  const [bids, asks] = await Promise.all([side(true), side(false)]);
  const retrievedAt = now();
  assertFresh(retrievedAt);
  const snapshotNs = BigInt(retrievedAt) * 1_000_000n;
  const liveSide = side => ({ orders: side.orders.filter(order => order.expireTimestampNs != null && BigInt(order.expireTimestampNs) > snapshotNs) });
  const liveBids = liveSide(bids);
  const liveAsks = liveSide(asks);
  const expiries = [...liveBids.orders, ...liveAsks.orders].map(order => Number(BigInt(order.expireTimestampNs) / 1_000_000n));
  // Floor fractional milliseconds conservatively: never retain a quote past expiry.
  const validUntil = expiries.length ? Math.min(...expiries) : null;
  return { ...summarizeBook(pool, liveBids, liveAsks), validUntil, freshness: { status: 'fresh', source: 'rpc_block', blockNumber: block.number.toString(), sourceTimestamp: blockTime, retrievedAt, maxAgeMs: 60_000, complete: true } };
}
