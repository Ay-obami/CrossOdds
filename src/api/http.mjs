#!/usr/bin/env node
import http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const VERSION = "0.7.0";
const service = process.env.DEMO_MODE === "true" ? await import("./demo-service.mjs") : await import("../signals.mjs");
const { listAssets, getAssetSentiment, getDivergence, getMarketSnapshot, calculateAssetCorrelation, priceBasket } = service;
const json = (res, status, body) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
    "X-Readout-Version": VERSION,
  });
  res.end(JSON.stringify(body));
};
const safeAsset = (value) => typeof value === "string" && /^[A-Z0-9_-]{1,16}$/i.test(value) ? value.toUpperCase() : null;
const parseBody = (req) => new Promise((resolve, reject) => {
  let raw = "";
  req.on("data", (chunk) => { raw += chunk; if (raw.length > 20_000) reject(new Error("request body too large")); });
  req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("invalid JSON body")); } });
  req.on("error", reject);
});

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, service: "dreamdex-readout", version: VERSION, mode: process.env.DEMO_MODE === "true" ? "demo" : "live" });
    if (req.method === "GET" && url.pathname === "/ready") return json(res, 200, { ok: true, ready: true, version: VERSION });
    if (req.method === "GET" && url.pathname === "/api/assets") return json(res, 200, await listAssets());

    const sentimentMatch = url.pathname.match(/^\/api\/(sentiment|divergence|market)\/([^/]+)$/);
    if (req.method === "GET" && sentimentMatch) {
      const asset = safeAsset(decodeURIComponent(sentimentMatch[2]));
      if (!asset) return json(res, 400, { error: "invalid asset" });
      const fn = sentimentMatch[1] === "sentiment" ? getAssetSentiment : sentimentMatch[1] === "divergence" ? getDivergence : getMarketSnapshot;
      return json(res, 200, await fn(asset));
    }

    if (req.method === "GET" && url.pathname === "/api/correlation") {
      const assetA = safeAsset(url.searchParams.get("assetA"));
      const assetB = safeAsset(url.searchParams.get("assetB"));
      if (!assetA || !assetB) return json(res, 400, { error: "assetA and assetB are required" });
      return json(res, 200, await calculateAssetCorrelation(assetA, assetB));
    }

    if (req.method === "POST" && url.pathname === "/api/basket/price") {
      const body = await parseBody(req);
      if (!Array.isArray(body.legs) || body.legs.length !== 2) return json(res, 400, { error: "exactly two basket legs are required" });
      const legs = body.legs.map((leg) => ({ asset: safeAsset(leg.asset), direction: String(leg.direction || "UP").toUpperCase() }));
      if (legs.some((leg) => !leg.asset || !["UP", "DOWN"].includes(leg.direction))) return json(res, 400, { error: "invalid basket leg" });
      return json(res, 200, await priceBasket({ legs }));
    }

    return json(res, 404, { error: "not found" });
  } catch (error) {
    console.error("[api]", error);
    return json(res, 500, { error: "readout request failed", detail: process.env.NODE_ENV === "production" ? undefined : error.message });
  }
});

server.listen(PORT, HOST, () => console.log(`Readout HTTP API listening on http://${HOST}:${PORT}`));
