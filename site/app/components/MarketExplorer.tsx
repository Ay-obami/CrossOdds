"use client";

import { useEffect, useMemo, useState } from "react";

type WindowRow = {
  pool: string;
  intervalMin: number;
  impliedProbability?: number | null;
  spread?: number | null;
  depth?: number | null;
  secondsToExpiry?: number | null;
  expiry?: number | null;
  weightSource?: string;
};

type AssetSnapshot = {
  asset: string;
  windows?: WindowRow[];
  sentiment?: number | null;
  weighting?: string;
  snapshotId?: string;
  observedAt?: number;
  totalDepth?: number | null;
  markets?: number;
  pricedMarkets?: number;
};

const recorded: AssetSnapshot[] = [
  { asset: "BTC", sentiment: 43.5, weighting: "recorded", windows: [{ pool: "recorded-btc-5", intervalMin: 5, impliedProbability: 43.5 }, { pool: "recorded-btc-15", intervalMin: 15, impliedProbability: 19.6 }, { pool: "recorded-btc-60", intervalMin: 60, impliedProbability: 35.0 }] },
  { asset: "ETH", sentiment: 48.6, weighting: "recorded", windows: [{ pool: "recorded-eth-5", intervalMin: 5, impliedProbability: 48.6 }, { pool: "recorded-eth-15", intervalMin: 15, impliedProbability: 38.9 }, { pool: "recorded-eth-60", intervalMin: 60, impliedProbability: 45.6 }] },
];

export default function MarketExplorer() {
  const [snapshots, setSnapshots] = useState<AssetSnapshot[]>(recorded);
  const [mode, setMode] = useState<"live" | "demo" | "loading">("loading");
  const [assetFilter, setAssetFilter] = useState("ALL");
  const [windowFilter, setWindowFilter] = useState<number | "ALL">("ALL");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_CROSSODDS_API_URL || process.env.NEXT_PUBLIC_READOUT_API_URL;
    if (!base) { setMode("demo"); return; }
    const root = base.replace(/\/$/, "");
    const controller = new AbortController();
    (async () => {
      try {
        const assetsResponse = await fetch(`${root}/api/assets`, { signal: controller.signal });
        if (!assetsResponse.ok) throw new Error(`assets HTTP ${assetsResponse.status}`);
        const assetsPayload: { assets?: unknown[] } = await assetsResponse.json();
        const assets = Array.isArray(assetsPayload.assets) ? assetsPayload.assets.map((value) => String(value).toUpperCase()).filter(Boolean) : [];
        if (!assets.length) throw new Error("no live assets");
        const rows = await Promise.all(assets.slice(0, 8).map(async (asset) => {
          const response = await fetch(`${root}/api/market/${encodeURIComponent(asset)}`, { signal: controller.signal });
          if (!response.ok) throw new Error(`${asset} HTTP ${response.status}`);
          return response.json() as Promise<AssetSnapshot>;
        }));
        if (!controller.signal.aborted) { setSnapshots(rows); setMode("live"); }
      } catch {
        if (!controller.signal.aborted) { setSnapshots(recorded); setMode("demo"); }
      }
    })();
    return () => controller.abort();
  }, []);

  const assets = useMemo(() => snapshots.map((snapshot) => snapshot.asset), [snapshots]);
  const intervals = useMemo(() => Array.from(new Set(snapshots.flatMap((snapshot) => (snapshot.windows || []).map((window) => window.intervalMin)))).sort((a, b) => a - b), [snapshots]);
  const filtered = useMemo(() => snapshots
    .filter((snapshot) => assetFilter === "ALL" || snapshot.asset === assetFilter)
    .map((snapshot) => ({ ...snapshot, windows: (snapshot.windows || []).filter((window) => windowFilter === "ALL" || window.intervalMin === windowFilter) }))
    .filter((snapshot) => (snapshot.windows || []).length > 0), [snapshots, assetFilter, windowFilter]);

  return <>
    <div className="explore-toolbar">
      <div className="mode-row"><span className={`status-dot ${mode}`} />{mode === "live" ? "Live DreamDEX Event Contract data" : mode === "loading" ? "Checking live CrossOdds API…" : "Recorded DreamDEX fallback"}</div>
      <div className="filter-groups">
        <div className="filter-row"><span>Asset</span><button className={assetFilter === "ALL" ? "active" : ""} onClick={() => setAssetFilter("ALL")}>All</button>{assets.map((asset) => <button key={asset} className={assetFilter === asset ? "active" : ""} onClick={() => setAssetFilter(asset)}>{asset}</button>)}</div>
        <div className="filter-row"><span>Window</span><button className={windowFilter === "ALL" ? "active" : ""} onClick={() => setWindowFilter("ALL")}>All</button>{intervals.map((interval) => <button key={interval} className={windowFilter === interval ? "active" : ""} onClick={() => setWindowFilter(interval)}>{formatWindow(interval)}</button>)}</div>
      </div>
    </div>

    <div className="explorer-note"><strong>UP</strong> is DreamDEX&apos;s market-implied probability for the positive outcome. <strong>DOWN</strong> is its binary complement. The bar makes that split visible immediately; expand a market only when you want quote-quality and pool details.</div>

    <div className="asset-market-stack">
      {filtered.map((snapshot) => <section className="asset-market-group" key={snapshot.asset}>
        <div className="asset-group-head">
          <div className="asset-group-title"><div className={`explorer-token ${snapshot.asset.toLowerCase()}`}>{assetGlyph(snapshot.asset)}</div><div><h2>{snapshot.asset} Event Contracts</h2><p>{snapshot.windows?.length || 0} visible prediction windows</p></div></div>
          <div className="asset-summary-chips"><SummaryChip label="aggregate UP" value={formatProbability(snapshot.sentiment)} /><SummaryChip label="weighting" value={formatWeightSource(snapshot.weighting)} /><SummaryChip label="total depth" value={formatDepth(snapshot.totalDepth)} /><SummaryChip label="freshness" value={formatAge(snapshot.observedAt)} /></div>
        </div>
        <div className="window-grid">{(snapshot.windows || []).map((window) => <WindowCard key={window.pool} asset={snapshot.asset} window={window} />)}</div>
      </section>)}
    </div>

    <style jsx global>{`
      .explore-toolbar{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:18px}.explore-toolbar .mode-row{margin:8px 0 0}.filter-groups{display:grid;gap:8px}.filter-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.filter-row>span{width:56px;color:var(--ink-muted);font:600 9px 'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.06em}.filter-row button{border:1px solid var(--rule);background:#fff;color:var(--ink-muted);border-radius:999px;padding:6px 10px;font-size:11px;font-weight:600;cursor:pointer}.filter-row button.active{background:var(--ink);color:#fff;border-color:var(--ink)}
      .explorer-note{margin:0 0 24px;padding:13px 15px;border:1px solid var(--rule);border-radius:8px;background:rgba(255,255,255,.76);color:var(--ink-muted);font-size:12.5px;line-height:1.55}.explorer-note strong{color:var(--ink)}
      .asset-market-stack{display:grid;gap:28px}.asset-market-group{border:1px solid var(--rule);border-radius:12px;background:rgba(255,255,255,.7);padding:22px}.asset-group-head{display:flex;justify-content:space-between;gap:22px;align-items:flex-start;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid var(--rule)}.asset-group-title{display:flex;align-items:center;gap:12px}.asset-group-title h2{font-size:19px;margin:0}.asset-group-title p{margin:2px 0 0;color:var(--ink-muted);font-size:11.5px}.explorer-token{width:44px;height:44px;border-radius:999px;display:grid;place-items:center;background:#f2f4f1;box-shadow:inset 0 0 0 1px var(--rule);font:700 18px Sora,sans-serif}.explorer-token.btc{background:#fff4e5;color:#a85f00;box-shadow:inset 0 0 0 1px #edcf9f}.explorer-token.eth{background:#eef1ff;color:#4055a8;box-shadow:inset 0 0 0 1px #ccd3f3}
      .asset-summary-chips{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap}.summary-chip{min-width:94px;border:1px solid var(--rule);border-radius:6px;background:#fff;padding:7px 9px}.summary-chip span,.summary-chip strong{display:block}.summary-chip span{font:500 8.5px 'IBM Plex Mono',monospace;text-transform:uppercase;color:var(--ink-muted)}.summary-chip strong{font-size:11px;margin-top:1px}
      .window-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.window-card{border:1px solid var(--rule);border-radius:9px;background:#fff;padding:16px;min-width:0}.window-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.window-head strong{font:700 14px Sora,sans-serif}.expiry-pill{font:500 9px 'IBM Plex Mono',monospace;color:var(--ink-muted);border:1px solid var(--rule);border-radius:999px;padding:4px 7px;white-space:nowrap}
      .probability-labels{display:flex;justify-content:space-between;align-items:flex-end;margin-top:18px}.probability-side span{display:block;font:700 9px 'IBM Plex Mono',monospace;letter-spacing:.06em}.probability-side strong{display:block;margin-top:2px;font:800 25px Sora,sans-serif;letter-spacing:-.04em}.probability-side.up span{color:#236846}.probability-side.down{text-align:right}.probability-side.down span{color:#8f473c}.probability-bar{display:flex;height:10px;border-radius:999px;overflow:hidden;margin-top:10px;background:#eceeea}.probability-bar .up-fill{background:#3d8a64}.probability-bar .down-fill{background:#b66c61}.market-summary{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-top:15px;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}.market-summary div{padding:9px 0}.market-summary div+div{padding-left:10px;border-left:1px solid var(--rule)}.market-summary span,.market-summary strong{display:block}.market-summary span{font:500 8.5px 'IBM Plex Mono',monospace;text-transform:uppercase;color:var(--ink-muted)}.market-summary strong{font-size:11px;margin-top:2px}
      .market-details{margin-top:10px}.market-details summary{cursor:pointer;color:var(--ink-muted);font-size:10.5px;font-weight:600}.detail-grid{display:grid;grid-template-columns:1fr 1fr;margin-top:10px;border-top:1px solid var(--rule)}.detail-item{padding:9px 8px 7px 0;border-bottom:1px solid var(--rule);min-width:0}.detail-item:nth-child(even){padding-left:10px;border-left:1px solid var(--rule)}.detail-item.wide{grid-column:1/-1;border-left:0!important;padding-left:0!important}.detail-item span,.detail-item strong{display:block}.detail-item span{font:500 8.5px 'IBM Plex Mono',monospace;text-transform:uppercase;color:var(--ink-muted)}.detail-item strong{margin-top:2px;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:900px){.explore-toolbar,.asset-group-head{flex-direction:column}.asset-summary-chips{justify-content:flex-start}.window-grid{grid-template-columns:1fr 1fr}}@media(max-width:600px){.asset-market-group{padding:15px}.window-grid{grid-template-columns:1fr}.filter-row>span{width:100%}.asset-summary-chips{display:grid;grid-template-columns:1fr 1fr;width:100%}.summary-chip{min-width:0}}
    `}</style>
  </>;
}

function WindowCard({ asset, window }: { asset: string; window: WindowRow }) {
  const up = finitePercent(window.impliedProbability);
  const down = up == null ? null : 100 - up;
  return <article className="window-card">
    <div className="window-head"><strong>{asset} · {formatWindow(window.intervalMin)}</strong><span className="expiry-pill">{formatCountdown(window.secondsToExpiry)} left</span></div>
    <div className="probability-labels"><div className="probability-side up"><span>UP</span><strong>{formatProbability(up)}</strong></div><div className="probability-side down"><span>DOWN</span><strong>{formatProbability(down)}</strong></div></div>
    <div className="probability-bar" aria-label={`${formatProbability(up)} UP and ${formatProbability(down)} DOWN`}><i className="up-fill" style={{ width: `${up || 0}%` }} /><i className="down-fill" style={{ width: `${down || 0}%` }} /></div>
    <div className="market-summary"><div><span>Spread</span><strong>{formatSpread(window.spread)}</strong></div><div><span>Resolves</span><strong>{formatExpiry(window.expiry)}</strong></div></div>
    <details className="market-details"><summary>Market details</summary><div className="detail-grid"><Detail label="Book depth" value={formatDepth(window.depth)} /><Detail label="Quote weighting" value={formatWeightSource(window.weightSource)} /><Detail label="Time remaining" value={formatCountdown(window.secondsToExpiry)} /><Detail label="Window" value={formatWindow(window.intervalMin)} /><Detail label="Pool" value={shortPool(window.pool)} wide /></div></details>
  </article>;
}

function SummaryChip({ label, value }: { label: string; value: string }) { return <div className="summary-chip"><span>{label}</span><strong>{value}</strong></div>; }
function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) { return <div className={`detail-item ${wide ? "wide" : ""}`} title={value}><span>{label}</span><strong>{value}</strong></div>; }
function finitePercent(value?: number | null) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : null; }
function formatProbability(value?: number | null) { return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : "—"; }
function formatSpread(value?: number | null) { return Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(2)} pts` : "Unavailable"; }
function formatDepth(value?: number | null) { const number = Number(value); return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "Unavailable"; }
function formatWeightSource(value?: string) { if (!value) return "—"; const labels: Record<string,string> = { inverse_spread: "Inverse spread", depth: "Depth", hybrid: "Hybrid", equal: "Equal", recorded: "Recorded" }; return labels[value] || value.replaceAll("_", " "); }
function formatCountdown(value?: number | null) { const seconds = Number(value); if (!Number.isFinite(seconds)) return "—"; if (seconds <= 0) return "now"; if (seconds < 60) return `${Math.ceil(seconds)}s`; if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`; return `${(seconds / 3600).toFixed(1)}h`; }
function formatExpiry(value?: number | null) { const seconds = Number(value); if (!Number.isFinite(seconds) || seconds <= 0) return "—"; return new Date(seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function shortPool(value: string) { return value?.startsWith("0x") && value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value || "—"; }
function formatAge(value?: number) { if (!value) return "—"; const seconds = Math.max(0, Math.round((Date.now() - value) / 1000)); return seconds < 2 ? "now" : `${seconds}s ago`; }
function formatWindow(value: number) { return value >= 60 && value % 60 === 0 ? `${value / 60}h` : `${value}m`; }
function assetGlyph(asset: string) { if (asset === "BTC") return "₿"; if (asset === "ETH") return "Ξ"; return asset.slice(0, 2); }
