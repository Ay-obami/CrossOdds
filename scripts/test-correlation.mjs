#!/usr/bin/env node
import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url) });
import { calculateAssetCorrelation } from "../src/signals/correlation.mjs";

const [assetA = "BTC", assetB = "ETH"] = process.argv.slice(2);
const result = await calculateAssetCorrelation(assetA, assetB);
console.log(JSON.stringify(result, null, 2));
if (result.status !== "ok") process.exitCode = 2;
