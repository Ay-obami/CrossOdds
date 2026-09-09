"use client";

import { useEffect, useState } from "react";

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
  {
    asset: "BTC",
    sentiment: 43.5,
    weighting: "recorded",
    windows: [
      { pool: "recorded-btc-5", intervalMin: 5, impliedProbability: 43.5 },
      { pool: "recorded-btc-15", intervalMin: 15, impliedProbability: 19.6 },
      { pool: "recorded-btc-60", intervalMin: 60, impliedProbability: 35.0 },
    ],
  },
  {
    asset: "ETH",
    sentiment: 48.6,
    weighting: "recorded",
    windows: [
      { pool: "recorded-eth-5", intervalMin: 5, impliedProbability: 48.6 },
      { pool: "recorded-eth-15", intervalMin: 15, impliedProbability: 38.9 },
      { pool: "recorded-eth-60", intervalMin: 60, impliedProbability: 45.6 },
    ],
  },
];

export default function MarketExplorer() {
  const [snapshots, setSnapshots] = useState<AssetSnapshot[]>(recorded);
  const [mode, setMode] = useState<"live" | "demo" | "loading">("loading");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_CROSSODDS_API_URL || process.env.NEXT_PUBLIC_READOUT_API_URL;
    if (!base) {
      setMode("demo");
      return;
    }

    const root = base.replace(/\/$/, "");
    const controller = new AbortController();

    (async () => {
      try {
        const assetsResponse = await fetch(`${root}/api/assets`, { signal: controller.signal });
        if (!assetsResponse.ok) throw new Error(`assets HTTP ${assetsResponse.status}`);

        const assetsPayload: { assets?: unknown[] } = await assetsResponse.json();
        const assets: string[] = Array.isArray(assetsPayload.assets)
          ? assetsPayload.assets.map((value) => String(value).toUpperCase()).filter(Boolean)
          : [];

        if (!assets.length) throw new Error("no live assets");

        const rows: AssetSnapshot[] = await Promise.all(
          assets.slice(0, 8).map(async (asset) => {
            const response = await fetch(`${root}/api/market/${encodeURIComponent(asset)}`, {
              signal: controller.signal,
            });
            if (!response.ok) throw new Error(`${asset} HTTP ${response.status}`);
            return response.json() as Promise<AssetSnapshot>;
          }),
        );

        if (!controller.signal.aborted) {
          setSnapshots(rows);
          setMode("live");
        }
      } catch {
        if (!controller.signal.aborted) {
          setSnapshots(recorded);
          setMode("demo");
        }
      }
    })();

    return () => controller.abort();
  }, []);

  return (
    <>
      <div className="mode-row">
        <span className={`status-dot ${mode}`} />
        {mode === "live"
          ? "Live DreamDEX Event Contract data"
          : mode === "loading"
            ? "Checking live CrossOdds API…"
            : "Recorded DreamDEX fallback"}
      </div>

      <div className="explorer-note">
        <strong>How to read this page:</strong> UP is the market-implied probability that the Event Contract resolves UP. DOWN is the complementary probability for the opposite outcome. Context below each pair shows quote quality and market metadata.
      </div>

      <div className="asset-market-stack">
        {snapshots.map((snapshot) => (
          <section className="asset-market-group" key={snapshot.asset}>
            <div className="asset-group-head">
              <div className="asset-group-title">
                <div className={`explorer-token ${snapshot.asset.toLowerCase()}`}>{assetGlyph(snapshot.asset)}</div>
                <div>
                  <h2>{snapshot.asset} Event Contracts</h2>
                  <p>{snapshot.windows?.length || 0} live prediction windows</p>
                </div>
              </div>
              <div className="asset-summary-chips">
                <SummaryChip label="aggregate UP" value={formatProbability(snapshot.sentiment)} />
                <SummaryChip label="weighting" value={formatWeightSource(snapshot.weighting)} />
                <SummaryChip label="total depth" value={formatDepth(snapshot.totalDepth)} />
                <SummaryChip label="snapshot" value={formatAge(snapshot.observedAt)} />
              </div>
            </div>

            <div className="window-grid">
              {(snapshot.windows || []).map((window) => (
                <WindowCard key={window.pool} asset={snapshot.asset} window={window} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <style jsx global>{`
        .explorer-note {
          margin: 0 0 28px;
          padding: 14px 16px;
          border: 1px solid var(--rule);
          border-left: 3px solid var(--blue);
          background: rgba(255,255,255,.72);
          color: var(--ink-muted);
          font-size: 13px;
          line-height: 1.55;
        }
        .explorer-note strong { color: var(--ink); }
        .asset-market-stack { display: grid; gap: 38px; }
        .asset-market-group {
          border: 1px solid var(--rule);
          background: rgba(255,255,255,.66);
          padding: 24px;
        }
        .asset-group-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--rule);
        }
        .asset-group-title { display: flex; align-items: center; gap: 13px; }
        .asset-group-title h2 { margin: 0; font-size: 20px; }
        .asset-group-title p { margin: 3px 0 0; color: var(--ink-muted); font-size: 12px; }
        .explorer-token {
          width: 46px;
          height: 46px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font: 700 19px 'Sora', sans-serif;
          background: #f2f4f1;
          box-shadow: inset 0 0 0 1px var(--rule);
        }
        .explorer-token.btc { background:#fff4e5; color:#a85f00; box-shadow:inset 0 0 0 1px #edcf9f; }
        .explorer-token.eth { background:#eef1ff; color:#4055a8; box-shadow:inset 0 0 0 1px #ccd3f3; }
        .asset-summary-chips { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
        .summary-chip {
          min-width: 98px;
          border: 1px solid var(--rule);
          background: #fff;
          padding: 8px 10px;
        }
        .summary-chip span,
        .summary-chip strong { display: block; }
        .summary-chip span {
          color: var(--ink-muted);
          font: 500 9.5px 'IBM Plex Mono', monospace;
          text-transform: uppercase;
          letter-spacing: .04em;
        }
        .summary-chip strong { margin-top: 2px; font-size: 12px; }
        .window-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .window-card {
          border: 1px solid var(--rule);
          background: #fff;
          padding: 18px;
          min-width: 0;
        }
        .window-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 15px;
        }
        .window-head strong { font: 700 15px 'Sora', sans-serif; }
        .expiry-pill {
          border: 1px solid var(--rule);
          padding: 3px 7px;
          font: 500 10px 'IBM Plex Mono', monospace;
          color: var(--ink-muted);
          white-space: nowrap;
        }
        .outcome-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .outcome-card {
          border: 1px solid var(--rule);
          padding: 14px;
          min-width: 0;
        }
        .outcome-card.up { background: #f1f7f3; border-color: #cddfd3; }
        .outcome-card.down { background: #f7f3f2; border-color: #e2d5d1; }
        .direction-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font: 700 10px 'IBM Plex Mono', monospace;
          letter-spacing: .06em;
        }
        .direction-dot { width: 7px; height: 7px; border-radius: 50%; background: #2c8a57; }
        .down .direction-dot { background: #a85848; }
        .outcome-value {
          display: block;
          margin-top: 9px;
          font: 800 27px 'Sora', sans-serif;
          letter-spacing: -.04em;
        }
        .outcome-caption { display: block; margin-top: 2px; color: var(--ink-muted); font-size: 10.5px; line-height: 1.35; }
        .market-context {
          display: grid;
          grid-template-columns: 1fr 1fr;
          margin-top: 14px;
          border-top: 1px solid var(--rule);
        }
        .context-row {
          min-width: 0;
          padding: 9px 8px 7px 0;
          border-bottom: 1px solid var(--rule);
        }
        .context-row:nth-child(even) { padding-left: 10px; border-left: 1px solid var(--rule); }
        .context-row span,
        .context-row strong { display: block; }
        .context-row span { color: var(--ink-muted); font: 500 9.5px 'IBM Plex Mono', monospace; text-transform: uppercase; }
        .context-row strong {
          margin-top: 2px;
          font-size: 11.5px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pool-row { grid-column: 1 / -1; border-left: 0 !important; padding-left: 0 !important; }
        @media (max-width: 900px) {
          .window-grid { grid-template-columns: 1fr 1fr; }
          .asset-group-head { flex-direction: column; }
          .asset-summary-chips { justify-content: flex-start; }
        }
        @media (max-width: 600px) {
          .asset-market-group { padding: 16px; }
          .window-grid { grid-template-columns: 1fr; }
          .asset-summary-chips { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
          .summary-chip { min-width: 0; }
          .outcome-value { font-size: 24px; }
        }
      `}</style>
    </>
  );
}

function WindowCard({ asset, window }: { asset: string; window: WindowRow }) {
  const up = finitePercent(window.impliedProbability);
  const down = up == null ? null : Math.max(0, Math.min(100, 100 - up));

  return (
    <article className="window-card">
      <div className="window-head">
        <strong>{asset} · {formatWindow(window.intervalMin)}</strong>
        <span className="expiry-pill">expires {formatCountdown(window.secondsToExpiry)}</span>
      </div>

      <div className="outcome-pair">
        <div className="outcome-card up">
          <span className="direction-label"><i className="direction-dot" /> UP</span>
          <strong className="outcome-value">{formatProbability(up)}</strong>
          <span className="outcome-caption">market-implied probability</span>
        </div>
        <div className="outcome-card down">
          <span className="direction-label"><i className="direction-dot" /> DOWN</span>
          <strong className="outcome-value">{formatProbability(down)}</strong>
          <span className="outcome-caption">complementary probability</span>
        </div>
      </div>

      <div className="market-context">
        <Context label="spread" value={formatSpread(window.spread)} />
        <Context label="book depth" value={formatDepth(window.depth)} />
        <Context label="quote weight" value={formatWeightSource(window.weightSource)} />
        <Context label="resolves" value={formatExpiry(window.expiry)} />
        <Context label="pool" value={shortPool(window.pool)} wide />
      </div>
    </article>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return <div className="summary-chip"><span>{label}</span><strong>{value}</strong></div>;
}

function Context({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`context-row ${wide ? "pool-row" : ""}`} title={value}><span>{label}</span><strong>{value}</strong></div>;
}

function finitePercent(value?: number | null) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : null;
}

function formatProbability(value?: number | null) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}%` : "—";
}

function formatSpread(value?: number | null) {
  const number = Number(value);
  return Number.isFinite(number) ? `${(number * 100).toFixed(2)} pts` : "Unavailable";
}

function formatDepth(value?: number | null) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Unavailable";
  if (number >= 1000) return number.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatWeightSource(value?: string) {
  if (!value) return "—";
  if (value === "inverse_spread") return "Inverse spread";
  if (value === "depth") return "Depth";
  if (value === "hybrid") return "Hybrid";
  if (value === "equal") return "Equal";
  if (value === "recorded") return "Recorded";
  return value.replaceAll("_", " ");
}

function formatCountdown(value?: number | null) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return "—";
  if (seconds <= 0) return "now";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function formatExpiry(value?: number | null) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  return new Date(seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatAge(value?: number) {
  if (!value) return "—";
  const seconds = Math.max(0, Math.round((Date.now() - value) / 1000));
  if (seconds < 2) return "now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

function formatWindow(minutes: number) {
  return minutes >= 60 ? `${minutes / 60}h window` : `${minutes}m window`;
}

function shortPool(value?: string) {
  if (!value) return "—";
  return value.length > 20 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function assetGlyph(asset: string) {
  const key = asset.toUpperCase();
  if (key === "BTC") return "₿";
  if (key === "ETH") return "Ξ";
  return key.slice(0, 2);
}
