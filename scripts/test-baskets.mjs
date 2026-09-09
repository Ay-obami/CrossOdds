#!/usr/bin/env node
import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url) });
import { priceBasket } from "../src/signals/basket.mjs";

const [assetA = "BTC", assetB = "ETH", directionA = "UP", directionB = "UP"] = process.argv.slice(2);
const result = await priceBasket({ legs: [{ asset: assetA, direction: directionA }, { asset: assetB, direction: directionB }] });
console.log(JSON.stringify(result, null, 2));
if (result.status !== "ok") process.exitCode = 2;
