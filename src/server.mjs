#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listAssets, getAssetSentiment, getDivergence, getMarketSnapshot, calculateAssetCorrelation, priceBasket } from "./signals.mjs";

const server = new McpServer({ name: "dreamdex-readout", version: "0.5.0" });
const text = (result) => ({ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });

server.registerTool("list_assets", {
  title: "List live DreamDEX assets",
  description: "List every asset that currently has at least one live DreamDEX Event Contract market on Somnia.",
  inputSchema: {},
}, async () => text(await listAssets()));

server.registerTool("get_sentiment", {
  title: "Get aggregated crowd sentiment for an asset",
  description: "Returns a 0-100 liquidity-weighted DreamDEX implied probability aggregated across live windows.",
  inputSchema: { asset: z.string().min(1).describe("Asset symbol, e.g. BTC") },
}, async ({ asset }) => text(await getAssetSentiment(asset.toUpperCase())));

server.registerTool("get_divergence", {
  title: "Get short-vs-long horizon divergence",
  description: "Compares the shortest and longest live windows for an asset.",
  inputSchema: { asset: z.string().min(1).describe("Asset symbol, e.g. BTC") },
}, async ({ asset }) => text(await getDivergence(asset.toUpperCase())));

server.registerTool("get_market_snapshot", {
  title: "Get full per-window market breakdown",
  description: "Returns the live windows, probabilities, depth, spread, and expiry behind the aggregate sentiment.",
  inputSchema: { asset: z.string().min(1).describe("Asset symbol, e.g. BTC") },
}, async ({ asset }) => text(await getMarketSnapshot(asset.toUpperCase())));

server.registerTool("get_correlation", {
  title: "Estimate correlation between two DreamDEX assets",
  description: "Estimates Pearson correlation from aligned log returns, automatically choosing a usable candle interval and reporting data-quality confidence.",
  inputSchema: {
    assetA: z.string().min(1).describe("First asset symbol, e.g. BTC"),
    assetB: z.string().min(1).describe("Second asset symbol, e.g. ETH"),
  },
}, async ({ assetA, assetB }) => text(await calculateAssetCorrelation(assetA, assetB)));

server.registerTool("price_basket", {
  title: "Price a two-leg correlated prediction basket",
  description: "Compares naive independent joint probability with a Gaussian-copula probability adjusted by quality-shrunk live DreamDEX return correlation.",
  inputSchema: {
    assetA: z.string().min(1),
    directionA: z.enum(["UP", "DOWN"]).default("UP"),
    assetB: z.string().min(1),
    directionB: z.enum(["UP", "DOWN"]).default("UP"),
  },
}, async ({ assetA, directionA, assetB, directionB }) => text(await priceBasket({ legs: [{ asset: assetA, direction: directionA }, { asset: assetB, direction: directionB }] })));

const transport = new StdioServerTransport();
await server.connect(transport);
