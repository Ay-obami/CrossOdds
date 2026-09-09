"use client";

import { useEffect, useMemo, useState } from "react";

type Direction = "UP" | "DOWN";
type CorrelationResult = {
  correlation?: number | null;
  qualityScore?: number;
  confidence?: string;
  samples?: number;
  interval?: string;
  estimator?: string;
};
type Result = {
  status: string;
  snapshot?: { correlationSnapshotId?: string | null; correlationObservedAt?: number | null; pricedAt?: number | null };
  independentProbability?: number;
  adjustedProbability?: number | null;
  pricingDifference?: number | null;
  correlation?: CorrelationResult;
  rawCorrelation?: number | null;
  pricingCorrelation?: number | null;
  pricingReliability?: number | null;
  effectiveCorrelation?: number | null;
  rawEffectiveCorrelation?: number | null;
  confidence?: string;
  samples?: number;
  interval?: string;
  estimator?: string;
  note?: string;
};

const demo: Result = {
  status: "ok",
  independentProbability: 0.374745,
  adjustedProbability: 0.465,
  pricingDifference: 0.090255,
  correlation: { correlation: 0.68, qualityScore: 0.86, confidence: "high", samples: 47, interval: "15m", estimator: "aligned_pearson" },
  rawCorrelation: 0.68,
  pricingCorrelation: 0.5848,
  pricingReliability: 0.86,
  effectiveCorrelation: 0.5848,
  confidence: "high",
  samples: 47,
  interval: "15m",
  estimator: "aligned_pearson",
};

const pct = (v?: number | null) => v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const rho = (v?: number | null) => v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;

export default function BasketBuilder() {
  const base = process.env.NEXT_PUBLIC_CROSSODDS_API_URL || process.env.NEXT_PUBLIC_READOUT_API_URL;
  const [assets, setAssets] = useState<string[]>(["BTC", "ETH"]);
  const [assetA, setAssetA] = useState("BTC");
  const [assetB, setAssetB] = useState("ETH");
  const [a, setA] = useState<Direction>("UP");
  const [b, setB] = useState<Direction>("UP");
  const [result, setResult] = useState<Result>(demo);
  const [mode, setMode] = useState<"live" | "demo" | "loading">("loading");

  useEffect(() => {
    if (!base) { setMode("demo"); return; }
    const controller = new AbortController();
    fetch(`${base.replace(/\/$/, "")}/api/assets`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: { assets?: unknown[] } = await r.json();
        const discovered: string[] = Array.isArray(data.assets)
          ? Array.from(new Set(data.assets.map((v) => String(v).toUpperCase()).filter((v): v is string => v.length > 0)))
          : [];
        if (discovered.length < 2) throw new Error("fewer than two live assets");
        setAssets(discovered);
        setAssetA((current) => discovered.includes(current) ? current : discovered[0]);
        setAssetB((current) => {
          if (discovered.includes(current) && current !== discovered[0]) return current;
          return discovered.find((asset) => asset !== discovered[0]) ?? discovered[1];
        });
      })
      .catch(() => { if (!controller.signal.aborted) setAssets(["BTC", "ETH"]); });
    return () => controller.abort();
  }, [base]);

  useEffect(() => {
    if (!base) { setMode("demo"); setResult(demoForDirections(a,b)); return; }
    if (!assetA || !assetB || assetA === assetB) {
      setMode("live");
      setResult({ status: "insufficient_data", note: "Choose two different live DreamDEX assets to build a correlation basket." });
      return;
    }
    const controller = new AbortController();
    setMode("loading");
    fetch(`${base.replace(/\/$/, "")}/api/basket/price`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ legs: [{ asset: assetA, direction: a }, { asset: assetB, direction: b }] }),
    }).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json(); setResult(data); setMode("live");
    }).catch(() => { if (!controller.signal.aborted) { setResult(demoForDirections(a,b)); setMode("demo"); } });
    return () => controller.abort();
  }, [base, assetA, assetB, a, b]);

  const deltaLabel = useMemo(() => result.pricingDifference == null ? "—" : `${result.pricingDifference >= 0 ? "+" : ""}${(result.pricingDifference*100).toFixed(1)} pts`, [result]);
  const observed = result.rawCorrelation ?? result.correlation?.correlation ?? null;
  const pricingRho = result.pricingCorrelation ?? null;
  const reliability = result.pricingReliability ?? result.correlation?.qualityScore ?? null;

  return (
    <div className="basket-shell">
      <div className="mode-row"><span className={`status-dot ${mode}`} />{mode === "live" ? `Live DreamDEX data · ${assets.length} assets discovered` : mode === "loading" ? "Checking live CrossOdds engine…" : "Deterministic demo dataset"}</div>
      <div className="leg-grid">
        <Leg asset={assetA} assets={assets} blockedAsset={assetB} direction={a} onAssetChange={setAssetA} onDirectionChange={setA} />
        <div className="plus">+</div>
        <Leg asset={assetB} assets={assets} blockedAsset={assetA} direction={b} onAssetChange={setAssetB} onDirectionChange={setB} />
      </div>
      <p className="basket-source-note">Assets are discovered from live DreamDEX Event Contracts. CrossOdds prices two-leg baskets today and will automatically surface new supported assets as DreamDEX lists them.</p>
      {result.status === "ok" ? (
        <>
          <div className="compare-grid">
            <Metric label="Independent model" value={pct(result.independentProbability)} sub="Assumes the two outcomes are unrelated" />
            <Metric label="Correlation-adjusted" value={pct(result.adjustedProbability)} sub="Gaussian copula using quality-shrunk correlation" emphasis />
            <Metric label="Pricing difference" value={deltaLabel} sub="Difference from naive multiplication" />
          </div>
          <div className="quality-panel">
            <div><span>Observed correlation</span><strong>{rho(observed)}</strong></div>
            <div><span>Pricing correlation</span><strong>{rho(pricingRho)}</strong></div>
            <div><span>Reliability</span><strong>{reliability == null ? "—" : `${Math.round(reliability * 100)}%`}</strong></div>
            <div><span>Selected interval</span><strong>{result.interval || result.correlation?.interval || "—"}</strong></div>
            <div><span>Estimator</span><strong>{estimatorLabel(result.estimator || result.correlation?.estimator)}</strong></div>
            <div><span>Confidence</span><strong className="capitalize">{result.confidence || result.correlation?.confidence || "—"}</strong></div>
          </div>
          <p className="plain-explain">{explanation(assetA,assetB,a,b,observed || 0,pricingRho || 0,result.pricingDifference || 0)}</p>
          {mode === "live" && result.snapshot?.correlationSnapshotId ? <p className="snapshot-note">Snapshot {shortSnapshot(result.snapshot.correlationSnapshotId)} · priced {formatAge(result.snapshot.pricedAt)}</p> : null}
        </>
      ) : result.status === "independence_only" ? (
        <>
          <div className="compare-grid">
            <Metric label="Independent model" value={pct(result.independentProbability)} sub="Live DreamDEX marginals; no correlation assumption" emphasis />
            <Metric label="Correlation-adjusted" value="Withheld" sub="Current history does not clear the confidence threshold" />
            <Metric label="Pricing difference" value="—" sub="No speculative adjustment is shown" />
          </div>
          <div className="note-flag">{result.note}</div>
        </>
      ) : <div className="note-flag">{result.note || "Not enough DreamDEX data to price this basket reliably."}</div>}

      <style jsx global>{`
        .basket-shell .leg-card {
          padding: 22px;
          grid-template-columns: 52px 1fr;
          gap: 14px 16px;
          border-radius: 8px;
        }
        .basket-shell .asset-badge {
          width: 52px;
          height: 52px;
          border: 0;
          border-radius: 999px;
          background: #f2f4f1;
          box-shadow: inset 0 0 0 1px var(--rule);
          font: 700 21px 'Sora', sans-serif;
          letter-spacing: -0.04em;
          color: var(--ink);
          display: grid;
          place-items: center;
        }
        .basket-shell .asset-badge.btc {
          background: #fff4e5;
          color: #a85f00;
          box-shadow: inset 0 0 0 1px #edcf9f;
        }
        .basket-shell .asset-badge.eth {
          background: #eef1ff;
          color: #4055a8;
          box-shadow: inset 0 0 0 1px #ccd3f3;
        }
        .basket-shell .leg-title {
          font-size: 16px;
          line-height: 1.35;
        }
        .basket-shell .asset-picker {
          grid-column: 1 / -1;
          display: grid;
          gap: 7px;
          margin-top: 2px;
        }
        .basket-shell .asset-picker > span {
          color: var(--ink-muted);
          font: 600 11px 'IBM Plex Mono', monospace;
          letter-spacing: .06em;
          text-transform: uppercase;
        }
        .basket-shell .select-wrap {
          position: relative;
        }
        .basket-shell .select-wrap::after {
          content: '';
          position: absolute;
          right: 15px;
          top: 50%;
          width: 7px;
          height: 7px;
          border-right: 1.5px solid var(--ink);
          border-bottom: 1.5px solid var(--ink);
          transform: translateY(-70%) rotate(45deg);
          pointer-events: none;
        }
        .basket-shell .asset-select {
          width: 100%;
          appearance: none;
          -webkit-appearance: none;
          border: 1px solid var(--rule-strong);
          background: #fff;
          color: var(--ink);
          border-radius: 6px;
          padding: 11px 42px 11px 13px;
          font: 600 14px 'IBM Plex Sans', sans-serif;
          cursor: pointer;
          outline: none;
          transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .basket-shell .asset-select:hover {
          border-color: #929891;
          background: #fdfdfb;
        }
        .basket-shell .asset-select:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px var(--blue-tint);
        }
        .basket-shell .asset-select option:disabled {
          color: #a1a6a1;
        }
        .basket-shell .toggle {
          margin-top: 2px;
          border-radius: 5px;
          overflow: hidden;
        }
        .basket-shell .toggle button {
          min-height: 40px;
        }
        .basket-shell .basket-source-note {
          margin: 18px 0 0;
          color: var(--ink-muted);
          font-size: 13px;
          line-height: 1.55;
        }
        @media (max-width: 560px) {
          .basket-shell .leg-card { padding: 18px; }
          .basket-shell .asset-badge { width: 46px; height: 46px; font-size: 18px; }
        }
      `}</style>
    </div>
  );
}

function Leg({ asset, assets, blockedAsset, direction, onAssetChange, onDirectionChange }: { asset: string; assets: string[]; blockedAsset: string; direction: Direction; onAssetChange: (asset: string) => void; onDirectionChange: (d: Direction) => void }) {
  const key = asset.toLowerCase();
  return <div className="leg-card">
    <div className={`asset-badge ${key === "btc" ? "btc" : key === "eth" ? "eth" : ""}`} aria-hidden="true">{assetGlyph(asset)}</div>
    <div><div className="leg-title">{asset} outcome</div><div className="leg-sub">DreamDEX Event Contract</div></div>
    <label className="asset-picker"><span>Asset</span><div className="select-wrap"><select className="asset-select" value={asset} onChange={(e) => onAssetChange(e.target.value)} aria-label={`${asset} basket asset`}>{assets.map((item) => <option key={item} value={item} disabled={item === blockedAsset}>{item}</option>)}</select></div></label>
    <div className="toggle"><button type="button" className={direction === "UP" ? "selected" : ""} onClick={() => onDirectionChange("UP")}>UP</button><button type="button" className={direction === "DOWN" ? "selected" : ""} onClick={() => onDirectionChange("DOWN")}>DOWN</button></div>
  </div>;
}

function assetGlyph(asset: string) {
  const key = asset.toUpperCase();
  if (key === "BTC") return "₿";
  if (key === "ETH") return "Ξ";
  return key.slice(0, 2);
}

function Metric({ label, value, sub, emphasis = false }: { label: string; value: string; sub: string; emphasis?: boolean }) { return <div className={`metric ${emphasis ? "emphasis" : ""}`}><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>; }
function estimatorLabel(value?: string) { return value === "hayashi_yoshida" ? "Async HY" : value === "aligned_pearson" ? "Aligned Pearson" : "—"; }
function demoForDirections(a: Direction,b: Direction): Result {
  const pA = a === "UP" ? .645 : .355; const pB = b === "UP" ? .581 : .419; const same = a === b;
  const independent = pA*pB; const raw = .68; const pricing = .5848; const signedPricing = same ? pricing : -pricing;
  const delta = same ? .09 : -.055;
  return { ...demo, independentProbability: independent, adjustedProbability: Math.max(0, independent+delta), pricingDifference: delta, rawCorrelation: raw, pricingCorrelation: pricing, effectiveCorrelation: signedPricing };
}
function shortSnapshot(value: string) { return value.length > 32 ? `${value.slice(0, 14)}…${value.slice(-10)}` : value; }
function formatAge(value?: number | null) { if (!value) return "now"; const seconds = Math.max(0, Math.round((Date.now()-value)/1000)); return seconds < 2 ? "now" : `${seconds}s ago`; }
function explanation(assetA: string,assetB: string,a: Direction,b: Direction,raw: number,pricing: number,delta: number) {
  const relation = a === b ? "same-direction" : "opposing";
  if (Math.abs(raw) < .15) return `Recent DreamDEX trading shows little relationship between ${assetA} and ${assetB}, so the adjusted basket stays close to independence.`;
  const sign = raw >= 0 ? "positively" : "negatively";
  return `Observed ${assetA}/${assetB} returns are ${sign} related (${rho(raw)}), but CrossOdds shrinks that estimate to ${rho(pricing)} for pricing because live sample quality is limited. For this ${relation} basket, the risk-controlled adjustment ${delta >= 0 ? "raises" : "reduces"} the joint probability versus independence.`;
}
