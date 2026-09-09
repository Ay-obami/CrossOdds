import { marketCreatorEventsAbi } from "../../node_modules/@somnia-chain/markets-sdk/dist/eventsAbi.js";
import { pub, COLLATERAL } from "../client.mjs";

const marketCreated = marketCreatorEventsAbi.find((event) => event.name === "MarketCreated");
let cache = { at: 0, markets: [] };
const CACHE_MS = 15_000;

export function clearDiscoveryCache() {
  cache = { at: 0, markets: [] };
}

export async function discoverLiveMarkets() {
  if (Date.now() - cache.at < CACHE_MS) return cache.markets;

  const now = Math.floor(Date.now() / 1000);
  const head = await pub.getBlockNumber();
  const found = [];
  const failures = [];

  for (let i = 0; i < 40; i++) {
    const toBlock = head - BigInt(i * 1000);
    const fromBlock = toBlock - 999n;
    try {
      const logs = await pub.getLogs({ event: marketCreated, fromBlock, toBlock });
      found.push(...logs.map((log) => log.args));
    } catch (error) {
      failures.push({ fromBlock: fromBlock.toString(), toBlock: toBlock.toString(), message: error?.message || String(error) });
    }
  }

  const live = found
    .filter((market) => Number(market.expiry) > now && market.collateral?.toLowerCase() === COLLATERAL.toLowerCase())
    .map((market) => ({
      asset: market.asset,
      pool: market.pool,
      marketId: market.marketId,
      intervalSec: Number(market.intervalSec),
      expiry: Number(market.expiry),
      secondsToExpiry: Number(market.expiry) - now,
    }))
    .sort((a, b) => a.intervalSec - b.intervalSec);

  cache = { at: Date.now(), markets: live };
  if (!live.length && failures.length === 40) {
    const error = new Error("DreamDEX market discovery failed for every scanned block range");
    error.failures = failures;
    throw error;
  }
  return live;
}
