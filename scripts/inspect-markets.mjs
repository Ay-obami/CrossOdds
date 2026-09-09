#!/usr/bin/env node
import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url) });
import { discoverLiveMarkets } from "../src/markets/discovery.mjs";
const markets = await discoverLiveMarkets();
console.table(markets.map((m) => ({ asset: m.asset, windowMin: m.intervalSec/60, pool: m.pool, expiresInMin: Math.round(m.secondsToExpiry/60) })));
