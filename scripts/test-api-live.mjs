#!/usr/bin/env node
import { spawn } from "node:child_process";

const [assetARaw = "BTC", assetBRaw = "ETH", dirARaw = "UP", dirBRaw = "UP"] = process.argv.slice(2);
const assetA = assetARaw.toUpperCase();
const assetB = assetBRaw.toUpperCase();
const directionA = dirARaw.toUpperCase();
const directionB = dirBRaw.toUpperCase();
const port = Number(process.env.READOUT_SMOKE_PORT || 8797);
const base = `http://127.0.0.1:${port}`;

const child = spawn(process.execPath, ["src/api/http.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: { ...process.env, PORT: String(port), DEMO_MODE: "false", NODE_ENV: "test" },
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForApi(timeoutMs = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (child.exitCode !== null) throw new Error(`API exited early with code ${child.exitCode}\n${stderr || stdout}`);
    try {
      const res = await fetch(`${base}/health`);
      if (res.ok) return res.json();
    } catch {}
    await sleep(150);
  }
  throw new Error("Timed out waiting for Readout API to start");
}

async function getJson(path, init) {
  const res = await fetch(`${base}${path}`, init);
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${JSON.stringify(body)}`);
  return body;
}

try {
  const health = await waitForApi();
  console.log("\n=== HEALTH ===");
  console.log(JSON.stringify(health, null, 2));

  console.log("\n=== CORRELATION REQUEST ===");
  const correlation = await getJson(`/api/correlation?assetA=${encodeURIComponent(assetA)}&assetB=${encodeURIComponent(assetB)}`);
  console.log(JSON.stringify(correlation, null, 2));

  console.log("\n=== FIRST BASKET REQUEST (same API process) ===");
  const body = JSON.stringify({ legs: [{ asset: assetA, direction: directionA }, { asset: assetB, direction: directionB }] });
  const basket1 = await getJson("/api/basket/price", { method: "POST", headers: { "content-type": "application/json" }, body });
  console.log(JSON.stringify(basket1, null, 2));

  console.log("\n=== SECOND BASKET REQUEST (cache consistency check) ===");
  const basket2 = await getJson("/api/basket/price", { method: "POST", headers: { "content-type": "application/json" }, body });
  console.log(JSON.stringify(basket2, null, 2));

  const corrId = correlation.snapshotId ?? null;
  const basketCorr1 = basket1.snapshot?.correlationSnapshotId ?? basket1.correlation?.snapshotId ?? null;
  const basketCorr2 = basket2.snapshot?.correlationSnapshotId ?? basket2.correlation?.snapshotId ?? null;
  const sentA1 = basket1.snapshot?.sentimentSnapshotA ?? null;
  const sentA2 = basket2.snapshot?.sentimentSnapshotA ?? null;
  const sentB1 = basket1.snapshot?.sentimentSnapshotB ?? null;
  const sentB2 = basket2.snapshot?.sentimentSnapshotB ?? null;

  const checks = {
    correlationStatusUsable: ["ok", "insufficient_data"].includes(correlation.status),
    basketStatusUsable: ["ok", "independence_only", "insufficient_data"].includes(basket1.status),
    correlationSnapshotReusedByBasket: Boolean(corrId && basketCorr1 && corrId === basketCorr1),
    correlationSnapshotStableAcrossBaskets: Boolean(basketCorr1 && basketCorr2 && basketCorr1 === basketCorr2),
    sentimentSnapshotAStableAcrossBaskets: Boolean(sentA1 && sentA2 && sentA1 === sentA2),
    sentimentSnapshotBStableAcrossBaskets: Boolean(sentB1 && sentB2 && sentB1 === sentB2),
    secondCorrelationCacheHit: basket2.correlation?.cache?.hit === true,
  };

  console.log("\n=== CONSISTENCY CHECKS ===");
  for (const [name, passed] of Object.entries(checks)) console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);

  const required = [
    "correlationStatusUsable",
    "basketStatusUsable",
    "correlationSnapshotReusedByBasket",
    "correlationSnapshotStableAcrossBaskets",
    "sentimentSnapshotAStableAcrossBaskets",
    "sentimentSnapshotBStableAcrossBaskets",
    "secondCorrelationCacheHit",
  ];
  if (required.some((key) => !checks[key])) process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
}
