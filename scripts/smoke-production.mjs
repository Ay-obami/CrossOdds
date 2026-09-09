#!/usr/bin/env node
const [apiArg, siteArg, assetAArg = "BTC", assetBArg = "ETH"] = process.argv.slice(2);
const API_URL = (apiArg || process.env.CROSSODDS_API_URL || process.env.READOUT_API_URL || "").replace(/\/$/, "");
const SITE_URL = (siteArg || process.env.CROSSODDS_SITE_URL || process.env.READOUT_SITE_URL || "").replace(/\/$/, "");
const assetA = assetAArg.toUpperCase();
const assetB = assetBArg.toUpperCase();

if (!API_URL || !SITE_URL) {
  console.error("Usage: npm run smoke:production -- <API_URL> <SITE_URL> [ASSET_A] [ASSET_B]");
  process.exit(2);
}

const checks = [];
const record = (name, ok, detail = "") => { checks.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };

async function getJson(url, options) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) throw new Error(`${res.status} ${typeof body === "string" ? body.slice(0,180) : JSON.stringify(body).slice(0,180)}`);
  return { res, body };
}

console.log("=== CROSSODDS PRODUCTION SMOKE TEST ===");
console.log(`API:  ${API_URL}`);
console.log(`Site: ${SITE_URL}`);

try {
  const { body, res } = await getJson(`${API_URL}/health`);
  record("apiHealth", body?.ok === true && ["crossodds", "dreamdex-readout"].includes(body?.service), `v${body?.version ?? "?"} mode=${body?.mode ?? "?"}`);
  const versionHeader = res.headers.get("x-crossodds-version") || res.headers.get("x-readout-version");
  record("apiVersionHeader", Boolean(versionHeader), versionHeader || "missing");
} catch (e) { record("apiHealth", false, e.message); }

try {
  const { body } = await getJson(`${API_URL}/api/assets`);
  const hasAssets = Array.isArray(body?.assets) ? body.assets.length > 0 : Array.isArray(body) ? body.length > 0 : Boolean(body?.totalLiveMarkets);
  record("liveAssets", hasAssets, JSON.stringify(body).slice(0,140));
} catch (e) { record("liveAssets", false, e.message); }

let correlation;
try {
  const { body } = await getJson(`${API_URL}/api/correlation?assetA=${encodeURIComponent(assetA)}&assetB=${encodeURIComponent(assetB)}`);
  correlation = body;
  const usable = ["ok", "insufficient_data"].includes(body?.status);
  record("correlationEndpoint", usable, `status=${body?.status} estimator=${body?.estimator ?? "n/a"}`);
} catch (e) { record("correlationEndpoint", false, e.message); }

try {
  const { body } = await getJson(`${API_URL}/api/basket/price`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ legs: [{ asset: assetA, direction: "UP" }, { asset: assetB, direction: "UP" }] }),
  });
  const usable = ["ok", "independence_only", "insufficient_data"].includes(body?.status);
  record("basketEndpoint", usable, `status=${body?.status}`);
  if (body?.status === "ok") {
    record("basketProbabilityBounds", body.adjustedProbability >= 0 && body.adjustedProbability <= 1, String(body.adjustedProbability));
    record("snapshotPresent", Boolean(body.snapshot?.correlationSnapshotId), body.snapshot?.correlationSnapshotId?.slice(0,44) || "missing");
  }
} catch (e) { record("basketEndpoint", false, e.message); }

for (const route of ["/", "/explore", "/basket", "/docs", "/docs/reference"]) {
  try {
    const res = await fetch(`${SITE_URL}${route}`, { redirect: "follow", signal: AbortSignal.timeout(20_000) });
    const text = await res.text();
    record(`site${route}`, res.ok && text.length > 200, `${res.status} ${text.length} bytes`);
  } catch (e) { record(`site${route}`, false, e.message); }
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
