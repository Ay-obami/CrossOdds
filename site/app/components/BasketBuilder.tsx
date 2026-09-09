"use client";

import { useEffect, useMemo, useState } from "react";

type Direction = "UP" | "DOWN";
type MarketWindow = {
  pool: string;
  intervalMin: number;
  impliedProbability?: number | null;
  impliedProbabilityRaw?: number | null;
  secondsToExpiry?: number | null;
  spread?: number | null;
  depth?: number | null;
};
type MarketSnapshot = { asset: string; windows?: MarketWindow[] };
type CorrelationResult = {
  correlation?: number | null;
  qualityScore?: number;
  confidence?: string;
  samples?: number;
  coverage?: number;
  interval?: string;
  marketWindowMin?: number;
  estimator?: string;
};
type ResultLeg = {
  asset: string;
  direction: Direction;
  probability?: number | null;
  intervalMin?: number | null;
  pool?: string | null;
  secondsToExpiry?: number | null;
};
type Result = {
  status: string;
  snapshot?: { correlationSnapshotId?: string | null; correlationObservedAt?: number | null; pricedAt?: number | null };
  legs?: ResultLeg[];
  requestedMarketWindowMin?: number | null;
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

const demoMarkets: Record<string, MarketSnapshot> = {
  BTC: { asset: "BTC", windows: [{ pool: "demo-btc-15", intervalMin: 15, impliedProbability: 64.5, impliedProbabilityRaw: .645, secondsToExpiry: 720 }] },
  ETH: { asset: "ETH", windows: [{ pool: "demo-eth-15", intervalMin: 15, impliedProbability: 58.1, impliedProbabilityRaw: .581, secondsToExpiry: 720 }] },
};
const demo: Result = {
  status: "ok",
  independentProbability: 0.374745,
  adjustedProbability: 0.465,
  pricingDifference: 0.090255,
  correlation: { correlation: 0.68, qualityScore: 0.86, confidence: "high", samples: 47, coverage: .94, interval: "15m", marketWindowMin: 15, estimator: "aligned_pearson" },
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
  const [markets, setMarkets] = useState<Record<string, MarketSnapshot>>(demoMarkets);
  const [assetA, setAssetA] = useState("BTC");
  const [assetB, setAssetB] = useState("ETH");
  const [windowMin, setWindowMin] = useState(15);
  const [a, setA] = useState<Direction>("UP");
  const [b, setB] = useState<Direction>("UP");
  const [result, setResult] = useState<Result>(demo);
  const [mode, setMode] = useState<"live" | "demo" | "loading">("loading");

  useEffect(() => {
    if (!base) { setMode("demo"); return; }
    const root = base.replace(/\/$/, "");
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`${root}/api/assets`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: { assets?: unknown[] } = await response.json();
        const discovered = Array.isArray(data.assets)
          ? Array.from(new Set(data.assets.map((value) => String(value).toUpperCase()).filter(Boolean)))
          : [];
        if (discovered.length < 2) throw new Error("fewer than two live assets");

        const snapshots = await Promise.all(discovered.slice(0, 8).map(async (asset) => {
          const marketResponse = await fetch(`${root}/api/market/${encodeURIComponent(asset)}`, { signal: controller.signal });
          if (!marketResponse.ok) throw new Error(`${asset} HTTP ${marketResponse.status}`);
          return marketResponse.json() as Promise<MarketSnapshot>;
        }));
        if (controller.signal.aborted) return;

        const nextMarkets = Object.fromEntries(snapshots.map((snapshot) => [snapshot.asset, snapshot]));
        setAssets(discovered);
        setMarkets(nextMarkets);
        setAssetA((current) => discovered.includes(current) ? current : discovered[0]);
        setAssetB((current) => discovered.includes(current) && current !== discovered[0] ? current : discovered.find((asset) => asset !== discovered[0]) || discovered[1]);
      } catch {
        if (!controller.signal.aborted) {
          setAssets(["BTC", "ETH"]);
          setMarkets(demoMarkets);
          setMode("demo");
        }
      }
    })();
    return () => controller.abort();
  }, [base]);

  const commonWindows = useMemo(() => {
    const aWindows = new Set((markets[assetA]?.windows || []).map((window) => window.intervalMin));
    return (markets[assetB]?.windows || [])
      .map((window) => window.intervalMin)
      .filter((interval) => aWindows.has(interval))
      .filter((interval, index, list) => list.indexOf(interval) === index)
      .sort((x, y) => x - y);
  }, [markets, assetA, assetB]);

  useEffect(() => {
    if (commonWindows.length && !commonWindows.includes(windowMin)) {
      setWindowMin(commonWindows.includes(15) ? 15 : commonWindows[0]);
    }
  }, [commonWindows, windowMin]);

  useEffect(() => {
    if (!base) { setMode("demo"); setResult(demoForDirections(a, b)); return; }
    if (!assetA || !assetB || assetA === assetB || !windowMin || !commonWindows.includes(windowMin)) {
      setMode("live");
      setResult({ status: "insufficient_data", note: "Choose two different assets with a shared live DreamDEX event window." });
      return;
    }
    const controller = new AbortController();
    setMode("loading");
    fetch(`${base.replace(/\/$/, "")}/api/basket/price`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        legs: [
          { asset: assetA, direction: a, intervalMin: windowMin },
          { asset: assetB, direction: b, intervalMin: windowMin },
        ],
      }),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: Result = await response.json();
      setResult(data);
      setMode("live");
    }).catch(() => {
      if (!controller.signal.aborted) {
        setResult(demoForDirections(a, b));
        setMode("demo");
      }
    });
    return () => controller.abort();
  }, [base, assetA, assetB, windowMin, commonWindows, a, b]);

  const observed = result.rawCorrelation ?? result.correlation?.correlation ?? null;
  const pricingRho = result.pricingCorrelation ?? null;
  const reliability = result.pricingReliability ?? result.correlation?.qualityScore ?? null;
  const confidenceScore = reliability == null ? null : Math.max(0, Math.min(1, reliability));
  const deltaLabel = result.pricingDifference == null ? "—" : `${result.pricingDifference >= 0 ? "+" : ""}${(result.pricingDifference * 100).toFixed(1)} pts`;

  return (
    <div className="basket-shell basket-pro">
      <div className="basket-toolbar">
        <div className="mode-row"><span className={`status-dot ${mode}`} />{mode === "live" ? `Live DreamDEX · ${assets.length} assets` : mode === "loading" ? "Refreshing live quote…" : "Deterministic demo fallback"}</div>
        <div className="matched-pill">Matched horizon · {windowMin || "—"}m</div>
      </div>

      <div className="leg-grid">
        <Leg
          asset={assetA}
          assets={assets}
          blockedAsset={assetB}
          direction={a}
          windows={commonWindows}
          windowMin={windowMin}
          market={marketFor(markets[assetA], windowMin)}
          onAssetChange={setAssetA}
          onDirectionChange={setA}
          onWindowChange={setWindowMin}
        />
        <div className="basket-join"><span>+</span><small>AND</small></div>
        <Leg
          asset={assetB}
          assets={assets}
          blockedAsset={assetA}
          direction={b}
          windows={commonWindows}
          windowMin={windowMin}
          market={marketFor(markets[assetB], windowMin)}
          onAssetChange={setAssetB}
          onDirectionChange={setB}
          onWindowChange={setWindowMin}
        />
      </div>

      <p className="basket-source-note">CrossOdds only compares matched Event Contract horizons so the joint probability is based on like-for-like outcomes. New DreamDEX assets and shared windows appear automatically.</p>

      {result.status === "ok" ? (
        <section className="analysis-panel">
          <div className="analysis-kicker">CrossOdds analysis</div>
          <div className="answer-grid">
            <AnswerMetric label="Independent probability" value={pct(result.independentProbability)} sub="Naive multiplication" />
            <AnswerMetric label="CrossOdds probability" value={pct(result.adjustedProbability)} sub="Correlation adjusted" emphasis />
            <AnswerMetric label="Relationship effect" value={deltaLabel} sub="Difference from independence" />
          </div>

          <div className="analysis-body">
            <div className="relationship-card">
              <div className="relationship-head"><span>Market relationship</span><strong>{correlationLabel(observed)}</strong></div>
              <div className="rho-line"><b>{rho(observed)}</b><span>observed correlation</span></div>
              <div className="correlation-scale" aria-label="Correlation scale"><i style={{ left: `${correlationPosition(observed)}%` }} /></div>
              <div className="scale-labels"><span>Negative</span><span>0</span><span>Positive</span></div>
            </div>

            <div className="confidence-card">
              <div className="relationship-head"><span>Data confidence</span><strong className="capitalize">{result.confidence || result.correlation?.confidence || "—"}</strong></div>
              <div className="confidence-line"><b>{confidenceScore == null ? "—" : `${Math.round(confidenceScore * 100)}%`}</b><span>pricing reliability</span></div>
              <div className="confidence-track"><i style={{ width: `${Math.round((confidenceScore || 0) * 100)}%` }} /></div>
              <div className="confidence-meta"><span>{result.samples ?? result.correlation?.samples ?? "—"} samples</span><span>{coverageLabel(result.correlation?.coverage)}</span><span>{estimatorLabel(result.estimator || result.correlation?.estimator)}</span></div>
            </div>
          </div>

          <div className="why-card">
            <div className="why-icon">↳</div>
            <div><strong>Why did the probability change?</strong><p>{explanation(assetA, assetB, a, b, observed || 0, pricingRho || 0, result.pricingDifference || 0)}</p></div>
          </div>

          <details className="method-details">
            <summary>View methodology and quote details</summary>
            <div className="method-grid">
              <Detail label="Pricing correlation" value={rho(pricingRho)} />
              <Detail label="Reliability" value={reliability == null ? "—" : `${Math.round(reliability * 100)}%`} />
              <Detail label="Candle interval" value={result.interval || result.correlation?.interval || "—"} />
              <Detail label="Event window" value={`${result.requestedMarketWindowMin || result.correlation?.marketWindowMin || windowMin}m`} />
              <Detail label="Estimator" value={estimatorLabel(result.estimator || result.correlation?.estimator)} />
              <Detail label="Snapshot" value={result.snapshot?.correlationSnapshotId ? shortSnapshot(result.snapshot.correlationSnapshotId) : "—"} />
            </div>
          </details>
        </section>
      ) : result.status === "independence_only" ? (
        <section className="analysis-panel">
          <div className="analysis-kicker">CrossOdds analysis</div>
          <div className="answer-grid">
            <AnswerMetric label="Independent probability" value={pct(result.independentProbability)} sub="Live DreamDEX marginals" emphasis />
            <AnswerMetric label="CrossOdds probability" value="Withheld" sub="Correlation quality too weak" />
            <AnswerMetric label="Relationship effect" value="—" sub="No speculative adjustment" />
          </div>
          <div className="why-card warning"><div className="why-icon">!</div><div><strong>Why is the adjustment withheld?</strong><p>{result.note}</p></div></div>
        </section>
      ) : <div className="note-flag basket-empty">{result.note || "Not enough DreamDEX data to price this basket reliably."}</div>}

      <style jsx global>{`
        .basket-pro { border-radius: 12px; padding: 26px; box-shadow: 0 18px 55px rgba(27,31,35,.055); }
        .basket-toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:20px; }
        .basket-toolbar .mode-row { margin:0; }
        .matched-pill { padding:7px 10px; border:1px solid var(--rule); border-radius:999px; font:600 10px 'IBM Plex Mono',monospace; color:var(--ink-muted); background:#fafaf7; }
        .basket-pro .leg-grid { grid-template-columns:1fr 54px 1fr; gap:12px; }
        .basket-pro .leg-card { padding:20px; grid-template-columns:52px 1fr; gap:14px 16px; border-radius:10px; border-color:#d4d8d2; background:#fff; }
        .basket-pro .asset-badge { width:52px; height:52px; border:0; border-radius:999px; background:#f2f4f1; box-shadow:inset 0 0 0 1px var(--rule); font:700 21px 'Sora',sans-serif; display:grid; place-items:center; }
        .basket-pro .asset-badge.btc { background:#fff4e5; color:#a85f00; box-shadow:inset 0 0 0 1px #edcf9f; }
        .basket-pro .asset-badge.eth { background:#eef1ff; color:#4055a8; box-shadow:inset 0 0 0 1px #ccd3f3; }
        .basket-pro .leg-title { font-size:17px; line-height:1.3; }
        .leg-market-price { text-align:right; }
        .leg-market-price span,.leg-market-price small { display:block; color:var(--ink-muted); }
        .leg-market-price strong { display:block; margin:1px 0; font:800 23px 'Sora',sans-serif; letter-spacing:-.03em; }
        .leg-market-price span { font:500 9px 'IBM Plex Mono',monospace; text-transform:uppercase; }
        .leg-market-price small { font-size:10px; }
        .selector-grid { grid-column:1/-1; display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .basket-pro .asset-picker { display:grid; gap:6px; }
        .basket-pro .asset-picker>span { color:var(--ink-muted); font:600 10px 'IBM Plex Mono',monospace; letter-spacing:.06em; text-transform:uppercase; }
        .basket-pro .select-wrap { position:relative; }
        .basket-pro .select-wrap::after { content:''; position:absolute; right:13px; top:50%; width:6px; height:6px; border-right:1.5px solid var(--ink); border-bottom:1.5px solid var(--ink); transform:translateY(-70%) rotate(45deg); pointer-events:none; }
        .basket-pro .asset-select { width:100%; appearance:none; -webkit-appearance:none; border:1px solid var(--rule-strong); background:#fff; color:var(--ink); border-radius:6px; padding:10px 36px 10px 12px; font:600 13px 'IBM Plex Sans',sans-serif; cursor:pointer; outline:none; }
        .basket-pro .asset-select:focus { border-color:var(--blue); box-shadow:0 0 0 3px var(--blue-tint); }
        .basket-pro .toggle { grid-column:1/-1; margin-top:0; border-radius:6px; overflow:hidden; }
        .basket-pro .toggle button { min-height:42px; font-size:12px; letter-spacing:.04em; }
        .basket-pro .toggle button.selected.up { background:#236846; }
        .basket-pro .toggle button.selected.down { background:#8f473c; }
        .basket-join { align-self:center; display:grid; place-items:center; color:var(--ink-muted); }
        .basket-join span { width:38px; height:38px; border:1px solid var(--rule); border-radius:999px; display:grid; place-items:center; background:#fff; font:700 20px 'Sora'; }
        .basket-join small { margin-top:5px; font:600 8px 'IBM Plex Mono',monospace; letter-spacing:.08em; }
        .basket-pro .basket-source-note { margin:16px 0 0; color:var(--ink-muted); font-size:12.5px; line-height:1.55; }
        .analysis-panel { margin-top:24px; border-top:1px solid var(--rule); padding-top:24px; }
        .analysis-kicker { margin-bottom:10px; color:var(--blue); font:700 11px 'IBM Plex Mono',monospace; text-transform:uppercase; letter-spacing:.08em; }
        .answer-grid { display:grid; grid-template-columns:repeat(3,1fr); border:1px solid var(--rule); border-radius:9px; overflow:hidden; }
        .answer-metric { padding:20px; border-right:1px solid var(--rule); background:#fff; }
        .answer-metric:last-child { border-right:0; }
        .answer-metric.emphasis { background:var(--blue-tint); }
        .answer-metric span,.answer-metric small { display:block; color:var(--ink-muted); }
        .answer-metric span { font-size:11px; }
        .answer-metric strong { display:block; margin:5px 0; font:800 31px 'Sora',sans-serif; letter-spacing:-.04em; }
        .answer-metric.emphasis strong { color:var(--blue); }
        .answer-metric small { font-size:11px; }
        .analysis-body { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:14px; }
        .relationship-card,.confidence-card { border:1px solid var(--rule); border-radius:8px; padding:17px; background:#fff; }
        .relationship-head { display:flex; justify-content:space-between; align-items:center; gap:10px; }
        .relationship-head span { color:var(--ink-muted); font-size:11px; }
        .relationship-head strong { font-size:12px; }
        .rho-line,.confidence-line { display:flex; align-items:baseline; gap:8px; margin-top:10px; }
        .rho-line b,.confidence-line b { font:800 25px 'Sora',sans-serif; }
        .rho-line span,.confidence-line span { color:var(--ink-muted); font-size:10.5px; }
        .correlation-scale,.confidence-track { position:relative; height:7px; border-radius:99px; background:linear-gradient(90deg,#ead9d6 0%,#ecece7 50%,#d9e8df 100%); margin-top:12px; }
        .correlation-scale::after { content:''; position:absolute; left:50%; top:-3px; bottom:-3px; width:1px; background:#9ca19c; }
        .correlation-scale i { position:absolute; top:50%; width:12px; height:12px; border-radius:99px; background:var(--ink); transform:translate(-50%,-50%); box-shadow:0 0 0 3px #fff; }
        .scale-labels { display:flex; justify-content:space-between; color:var(--ink-muted); font-size:9px; margin-top:5px; }
        .confidence-track { background:#eceeea; overflow:hidden; }
        .confidence-track i { display:block; height:100%; background:var(--blue); border-radius:99px; }
        .confidence-meta { display:flex; flex-wrap:wrap; gap:6px 12px; margin-top:9px; color:var(--ink-muted); font:500 9.5px 'IBM Plex Mono',monospace; }
        .why-card { display:grid; grid-template-columns:34px 1fr; gap:10px; margin-top:14px; padding:16px; border-radius:8px; background:#f7f8f5; border:1px solid var(--rule); }
        .why-card.warning { background:var(--flag-tint); }
        .why-icon { width:28px; height:28px; border-radius:99px; display:grid; place-items:center; background:#fff; border:1px solid var(--rule); font-weight:800; }
        .why-card strong { font-size:12px; }
        .why-card p { margin:3px 0 0; color:var(--ink-muted); font-size:12.5px; line-height:1.55; }
        .method-details { margin-top:12px; border:1px solid var(--rule); border-radius:7px; background:#fff; }
        .method-details summary { cursor:pointer; padding:12px 14px; font-size:11.5px; font-weight:600; color:var(--ink-muted); }
        .method-grid { display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid var(--rule); }
        .detail-cell { padding:12px 14px; border-right:1px solid var(--rule); border-bottom:1px solid var(--rule); min-width:0; }
        .detail-cell:nth-child(3n) { border-right:0; }
        .detail-cell span,.detail-cell strong { display:block; }
        .detail-cell span { color:var(--ink-muted); font:500 9px 'IBM Plex Mono',monospace; text-transform:uppercase; }
        .detail-cell strong { margin-top:3px; font-size:11.5px; overflow-wrap:anywhere; }
        .basket-empty { margin-top:20px; }
        @media(max-width:820px){
          .basket-pro .leg-grid { grid-template-columns:1fr; }
          .basket-join { grid-auto-flow:column; gap:6px; }
          .basket-join small { margin:0; }
          .analysis-body { grid-template-columns:1fr; }
        }
        @media(max-width:620px){
          .basket-pro { padding:18px; }
          .basket-toolbar { align-items:flex-start; flex-direction:column; }
          .selector-grid,.answer-grid,.method-grid { grid-template-columns:1fr; }
          .answer-metric,.detail-cell { border-right:0; border-bottom:1px solid var(--rule); }
          .answer-metric:last-child { border-bottom:0; }
        }
      `}</style>
    </div>
  );
}

function Leg({ asset, assets, blockedAsset, direction, windows, windowMin, market, onAssetChange, onDirectionChange, onWindowChange }: {
  asset: string;
  assets: string[];
  blockedAsset: string;
  direction: Direction;
  windows: number[];
  windowMin: number;
  market?: MarketWindow;
  onAssetChange: (asset: string) => void;
  onDirectionChange: (direction: Direction) => void;
  onWindowChange: (window: number) => void;
}) {
  const key = asset.toLowerCase();
  const up = marketProbabilityPercent(market);
  const selectedProbability = up == null ? null : direction === "UP" ? up : 100 - up;
  return <div className="leg-card">
    <div className={`asset-badge ${key === "btc" ? "btc" : key === "eth" ? "eth" : ""}`} aria-hidden="true">{assetGlyph(asset)}</div>
    <div><div className="leg-title">{asset} outcome</div><div className="leg-sub">DreamDEX Event Contract</div></div>
    <div className="leg-market-price"><span>{direction} price</span><strong>{selectedProbability == null ? "—" : `${selectedProbability.toFixed(1)}%`}</strong><small>{formatTimeLeft(market?.secondsToExpiry)}</small></div>
    <div className="selector-grid">
      <label className="asset-picker"><span>Asset</span><div className="select-wrap"><select className="asset-select" value={asset} onChange={(event) => onAssetChange(event.target.value)}>{assets.map((item) => <option key={item} value={item} disabled={item === blockedAsset}>{item}</option>)}</select></div></label>
      <label className="asset-picker"><span>Event window</span><div className="select-wrap"><select className="asset-select" value={windowMin} onChange={(event) => onWindowChange(Number(event.target.value))}>{windows.map((interval) => <option key={interval} value={interval}>{formatWindow(interval)}</option>)}</select></div></label>
    </div>
    <div className="toggle"><button type="button" className={`${direction === "UP" ? "selected up" : ""}`} onClick={() => onDirectionChange("UP")}>UP</button><button type="button" className={`${direction === "DOWN" ? "selected down" : ""}`} onClick={() => onDirectionChange("DOWN")}>DOWN</button></div>
  </div>;
}

function AnswerMetric({ label, value, sub, emphasis = false }: { label: string; value: string; sub: string; emphasis?: boolean }) { return <div className={`answer-metric ${emphasis ? "emphasis" : ""}`}><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="detail-cell"><span>{label}</span><strong>{value}</strong></div>; }
function marketFor(snapshot: MarketSnapshot | undefined, intervalMin: number) { return snapshot?.windows?.find((window) => window.intervalMin === intervalMin); }
function marketProbabilityPercent(market?: MarketWindow) {
  if (!market) return null;
  if (Number.isFinite(market.impliedProbability)) return Number(market.impliedProbability);
  if (Number.isFinite(market.impliedProbabilityRaw)) return Number(market.impliedProbabilityRaw) * 100;
  return null;
}
function assetGlyph(asset: string) { const key = asset.toUpperCase(); if (key === "BTC") return "₿"; if (key === "ETH") return "Ξ"; return key.slice(0, 2); }
function formatWindow(value: number) { return value >= 60 && value % 60 === 0 ? `${value / 60} hour${value === 60 ? "" : "s"}` : `${value} min`; }
function formatTimeLeft(value?: number | null) { if (!Number.isFinite(value)) return "expiry unavailable"; const minutes = Math.max(0, Math.round(Number(value) / 60)); return `resolves in ${minutes}m`; }
function estimatorLabel(value?: string) { return value === "hayashi_yoshida" ? "Async HY" : value === "aligned_pearson" ? "Aligned Pearson" : "—"; }
function coverageLabel(value?: number) { return Number.isFinite(value) ? `${Math.round(Number(value) * 100)}% coverage` : "coverage —"; }
function correlationPosition(value?: number | null) { return value == null ? 50 : Math.max(2, Math.min(98, ((value + 1) / 2) * 100)); }
function correlationLabel(value?: number | null) {
  if (value == null) return "Unavailable";
  const abs = Math.abs(value); const direction = value >= 0 ? "positive" : "negative";
  if (abs < .15) return "Little relationship";
  if (abs < .4) return `Weak ${direction}`;
  if (abs < .7) return `Moderate ${direction}`;
  return `Strong ${direction}`;
}
function demoForDirections(a: Direction, b: Direction): Result {
  const pA = a === "UP" ? .645 : .355; const pB = b === "UP" ? .581 : .419; const same = a === b;
  const independent = pA * pB; const raw = .68; const pricing = .5848; const delta = same ? .09 : -.055;
  return { ...demo, independentProbability: independent, adjustedProbability: Math.max(0, independent + delta), pricingDifference: delta, rawCorrelation: raw, pricingCorrelation: pricing, effectiveCorrelation: same ? pricing : -pricing };
}
function shortSnapshot(value: string) { return value.length > 30 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value; }
function explanation(assetA: string, assetB: string, a: Direction, b: Direction, raw: number, pricing: number, delta: number) {
  const relation = a === b ? "same-direction" : "opposing";
  if (Math.abs(raw) < .15) return `Recent ${assetA}/${assetB} trading shows little relationship, so the CrossOdds estimate stays close to independence.`;
  const sign = raw >= 0 ? "positively" : "negatively";
  return `${assetA} and ${assetB} returns are ${sign} related (${rho(raw)}). CrossOdds shrinks that observation to ${rho(pricing)} before pricing because live data quality is finite. For this ${relation} basket, that relationship ${delta >= 0 ? "raises" : "reduces"} the probability of both selected outcomes occurring together.`;
}
