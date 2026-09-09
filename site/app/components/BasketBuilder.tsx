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
  const [a, setA] = useState<Direction>("UP");
  const [b, setB] = useState<Direction>("UP");
  const [result, setResult] = useState<Result>(demo);
  const [mode, setMode] = useState<"live" | "demo" | "loading">("loading");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_READOUT_API_URL;
    if (!base) { setMode("demo"); setResult(demoForDirections(a,b)); return; }
    const controller = new AbortController();
    setMode("loading");
    fetch(`${base.replace(/\/$/, "")}/api/basket/price`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ legs: [{ asset: "BTC", direction: a }, { asset: "ETH", direction: b }] }),
    }).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json(); setResult(data); setMode("live");
    }).catch(() => { if (!controller.signal.aborted) { setResult(demoForDirections(a,b)); setMode("demo"); } });
    return () => controller.abort();
  }, [a,b]);

  const deltaLabel = useMemo(() => result.pricingDifference == null ? "—" : `${result.pricingDifference >= 0 ? "+" : ""}${(result.pricingDifference*100).toFixed(1)} pts`, [result]);
  const observed = result.rawCorrelation ?? result.correlation?.correlation ?? null;
  const pricingRho = result.pricingCorrelation ?? null;
  const reliability = result.pricingReliability ?? result.correlation?.qualityScore ?? null;
  return (
    <div className="basket-shell">
      <div className="mode-row"><span className={`status-dot ${mode}`} />{mode === "live" ? "Live DreamDEX data" : mode === "loading" ? "Checking live engine…" : "Deterministic demo dataset"}</div>
      <div className="leg-grid">
        <Leg title="BTC" direction={a} onChange={setA} />
        <div className="plus">+</div>
        <Leg title="ETH" direction={b} onChange={setB} />
      </div>
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
          <p className="plain-explain">{explanation(a,b,observed || 0,pricingRho || 0,result.pricingDifference || 0)}</p>
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
    </div>
  );
}

function Leg({ title, direction, onChange }: { title: string; direction: Direction; onChange: (d: Direction) => void }) {
  return <div className="leg-card"><div className="asset-badge">{title}</div><div><div className="leg-title">{title} outcome</div><div className="leg-sub">DreamDEX Event Contract</div></div><div className="toggle"><button className={direction === "UP" ? "selected" : ""} onClick={() => onChange("UP")}>UP</button><button className={direction === "DOWN" ? "selected" : ""} onClick={() => onChange("DOWN")}>DOWN</button></div></div>;
}
function Metric({ label, value, sub, emphasis = false }: { label: string; value: string; sub: string; emphasis?: boolean }) { return <div className={`metric ${emphasis ? "emphasis" : ""}`}><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>; }
function estimatorLabel(value?: string) { return value === "hayashi_yoshida" ? "Async HY" : value === "aligned_pearson" ? "Aligned Pearson" : "—"; }
function demoForDirections(a: Direction,b: Direction): Result {
  const pA = a === "UP" ? .645 : .355; const pB = b === "UP" ? .581 : .419; const same = a === b;
  const independent = pA*pB; const raw = .68; const pricing = .5848; const signedPricing = same ? pricing : -pricing;
  // Stable illustrative demo values only; live mode always uses the API's copula result.
  const delta = same ? .09 : -.055;
  return { ...demo, independentProbability: independent, adjustedProbability: Math.max(0, independent+delta), pricingDifference: delta, rawCorrelation: raw, pricingCorrelation: pricing, effectiveCorrelation: signedPricing };
}
function shortSnapshot(value: string) { return value.length > 32 ? `${value.slice(0, 14)}…${value.slice(-10)}` : value; }
function formatAge(value?: number | null) { if (!value) return "now"; const seconds = Math.max(0, Math.round((Date.now()-value)/1000)); return seconds < 2 ? "now" : `${seconds}s ago`; }
function explanation(a: Direction,b: Direction,raw: number,pricing: number,delta: number) {
  const relation = a === b ? "same-direction" : "opposing";
  if (Math.abs(raw) < .15) return "Recent DreamDEX trading shows little relationship between these markets, so the adjusted basket stays close to independence.";
  const sign = raw >= 0 ? "positively" : "negatively";
  return `Observed BTC/ETH returns are ${sign} related (${rho(raw)}), but Readout shrinks that estimate to ${rho(pricing)} for pricing because live sample quality is limited. For this ${relation} basket, the risk-controlled adjustment ${delta >= 0 ? "raises" : "reduces"} the joint probability versus independence.`;
}
