"use client";

import { useEffect, useState } from "react";

type WindowRow = {
  pool: string;
  intervalMin: number;
  impliedProbability?: number | null;
  spread?: number | null;
  depth?: number | null;
  secondsToExpiry?: number | null;
  weightSource?: string;
};
type AssetSnapshot = { asset: string; windows?: WindowRow[]; sentiment?: number | null; weighting?: string; snapshotId?: string };

const recorded: AssetSnapshot[] = [
  { asset: "BTC", sentiment: 43.5, windows: [{ pool:"recorded-btc-5", intervalMin:5, impliedProbability:43.5 }, { pool:"recorded-btc-15", intervalMin:15, impliedProbability:19.6 }, { pool:"recorded-btc-60", intervalMin:60, impliedProbability:35.0 }] },
  { asset: "ETH", sentiment: 48.6, windows: [{ pool:"recorded-eth-5", intervalMin:5, impliedProbability:48.6 }, { pool:"recorded-eth-15", intervalMin:15, impliedProbability:38.9 }, { pool:"recorded-eth-60", intervalMin:60, impliedProbability:45.6 }] },
];

export default function MarketExplorer() {
  const [snapshots, setSnapshots] = useState<AssetSnapshot[]>(recorded);
  const [mode, setMode] = useState<"live"|"demo"|"loading">("loading");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_READOUT_API_URL;
    if (!base) { setMode("demo"); return; }
    const root = base.replace(/\/$/, "");
    const controller = new AbortController();
    (async () => {
      try {
        const assetsResponse = await fetch(`${root}/api/assets`, { signal: controller.signal });
        if (!assetsResponse.ok) throw new Error(`assets HTTP ${assetsResponse.status}`);
        const assetsPayload = await assetsResponse.json();
        const assets: string[] = Array.isArray(assetsPayload.assets) ? assetsPayload.assets : [];
        if (!assets.length) throw new Error("no live assets");
        const rows = await Promise.all(assets.slice(0, 8).map(async (asset) => {
          const response = await fetch(`${root}/api/market/${encodeURIComponent(asset)}`, { signal: controller.signal });
          if (!response.ok) throw new Error(`${asset} HTTP ${response.status}`);
          return response.json();
        }));
        if (!controller.signal.aborted) { setSnapshots(rows); setMode("live"); }
      } catch {
        if (!controller.signal.aborted) { setSnapshots(recorded); setMode("demo"); }
      }
    })();
    return () => controller.abort();
  }, []);

  const windows = snapshots.flatMap((snapshot) => (snapshot.windows || []).map((window) => ({ ...window, asset: snapshot.asset })));
  return <>
    <div className="mode-row"><span className={`status-dot ${mode}`} />{mode === "live" ? "Live DreamDEX API" : mode === "loading" ? "Checking live Readout API…" : "Recorded DreamDEX fallback"}</div>
    <div className="market-grid">{windows.map((row, i) => <article className="market-card" key={`${row.pool}-${i}`}>
      <div className="market-top"><span className="asset-badge">{row.asset}</span><span>{row.intervalMin} min</span></div>
      <strong>{row.impliedProbability == null ? "—" : `${Number(row.impliedProbability).toFixed(1)}%`}</strong>
      <p>implied probability</p>
      <div className="market-foot"><span>expires</span><b>{row.secondsToExpiry == null ? "—" : `${Math.max(0, Math.round(row.secondsToExpiry / 60))}m`}</b></div>
    </article>)}</div>
  </>;
}
