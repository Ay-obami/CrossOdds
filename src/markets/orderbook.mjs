import { ex } from "../client.mjs";
import { summarizeBook } from "./orderbook-summary.mjs";

export async function readBook(pool) {
  const [bids, asks] = await Promise.all([
    ex.client.getAllOpenOrdersOnchain(pool, { isBid: true }),
    ex.client.getAllOpenOrdersOnchain(pool, { isBid: false }),
  ]);
  return summarizeBook(pool, bids, asks);
}
