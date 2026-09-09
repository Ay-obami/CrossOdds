# Readout

**Relationship-aware prediction baskets for DreamDEX Event Contracts on Somnia.**

Readout started as an MCP server that converts DreamDEX order books into agent-friendly sentiment and divergence signals. This version keeps those tools and adds a correlation engine plus a consumer-facing basket experience.

The flagship interaction answers a question individual Event Contracts cannot answer alone:

> If BTC-UP is priced at *p1* and ETH-UP at *p2*, what is a defensible probability that **both** happen when the two markets are correlated?

Readout compares naive independence (`p1 × p2`) with a risk-controlled Gaussian-copula estimate built from DreamDEX candle returns. Raw correlation is preserved for transparency, while pricing uses a quality-shrunk correlation to prevent sparse samples from dominating the basket.

## What is implemented

- Live DreamDEX market discovery from Somnia `MarketCreated` logs.
- Read-only order-book snapshots and liquidity-weighted sentiment.
- Short-vs-long window divergence.
- Raw DreamDEX indexer candle client for 1m/5m/15m/1h/4h/1d data.
- Bucket alignment with a maximum one-bucket forward fill.
- Log-return transformation before correlation.
- Pearson cross-market correlation.
- Automatic 5m/15m/1h timeframe evaluation and quality-based selection.
- Confidence scoring based on sample count, fill ratio, trade count, and time span.
- Two-leg UP/DOWN basket pricing using a Gaussian copula with confidence-aware correlation shrinkage.
- Fréchet-bound protection for joint probabilities.
- MCP tools for both the original signals and the new correlation/basket engine.
- HTTP JSON API for the web app.
- Next.js product UI with live-API mode and clearly labeled deterministic demo fallback.
- Deterministic unit/integration-style tests that do not require a blockchain connection.

## Architecture

```text
Somnia / DreamDEX
├── MarketCreated logs ───────► market discovery
├── on-chain order books ─────► marginal probabilities / depth
└── GraphQL candle indexer ───► aligned log returns
                                  │
                                  ▼
                         Readout signal engine
                    ┌─────────────┼──────────────┐
                    │             │              │
                sentiment     correlation     basket price
                    │             │              │
                    └──────┬──────┴──────┬───────┘
                           │             │
                          MCP          HTTP API
                           │             │
                        AI agents     Next.js UI
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the methodology and data-quality rules.

## Install

```bash
npm install
cp .env.example .env
# Put a funded Shannon testnet PRIVATE_KEY in .env.
```

The SDK requires a key during client construction. Readout's analytics paths are read-only and do not sign trades.

## Deterministic validation

These commands do not need DreamDEX network access:

```bash
npm test
npm run demo
```

`npm test` covers alignment, returns, Pearson correlation, quality scoring, Gaussian-copula probability behavior, bounds, direction handling, and the correlation engine's interval selection.

## Live DreamDEX validation

```bash
npm run test:candles
npm run test:correlation:live BTC ETH
npm run test:baskets:live BTC ETH UP UP
```

Live results are deliberately confidence-gated. Sparse testnet data can produce `insufficient_data`; that is a valid result rather than a silent fallback.

## MCP server

```bash
npm start
```

Tools:

- `list_assets`
- `get_sentiment`
- `get_divergence`
- `get_market_snapshot`
- `get_correlation`
- `price_basket`

## HTTP API

```bash
npm run api
```

Defaults to `http://localhost:8787`.

Endpoints:

```text
GET  /health
GET  /api/assets
GET  /api/sentiment/:asset
GET  /api/divergence/:asset
GET  /api/market/:asset
GET  /api/correlation?assetA=BTC&assetB=ETH
POST /api/basket/price
```

Example basket body:

```json
{
  "legs": [
    { "asset": "BTC", "direction": "UP" },
    { "asset": "ETH", "direction": "UP" }
  ]
}
```

## Web app

```bash
cd site
npm install
npm run dev
```

To use live data from the web app, set:

```bash
NEXT_PUBLIC_READOUT_API_URL=https://your-readout-api.example
```

If that variable is absent or unreachable, the basket UI switches to a **clearly labeled deterministic demo dataset**. It never presents demo numbers as live DreamDEX quotes.

## Quant methodology

1. Find matching live BTC/ETH market windows where possible.
2. Query 5m, 15m, and 1h candle histories for each pair.
3. Normalize timestamps into buckets.
4. Allow at most one carried-forward close for a missing bucket.
5. Convert close prices to log returns: `ln(Pt/Pt-1)`.
6. Calculate aligned Pearson correlation when synchronization is sufficient, otherwise try the asynchronous estimator.
7. Score each candidate using sample count, real-vs-filled coverage, trades, and span.
8. Select the strongest usable interval.
9. Use current DreamDEX implied probabilities as basket marginals.
10. Compute a Gaussian-copula joint probability.
11. Shrink noisy correlation toward independence using the quality score, then report raw correlation, pricing correlation, naive independence, and adjusted probability.

## Important limitations

- Testnet markets can be sparse; a correlation estimate is not guaranteed to be available.
- Correlation is descriptive, not causal, and can change rapidly.
- The basket is currently an analytical/execution-intent abstraction; this repo does **not** pretend an atomic on-chain basket contract exists.
- The UI's recorded/demo mode is not a live quote.
- No trading transaction is signed by the analytics server.

## Hackathon demo

See [DEMO.md](./DEMO.md) for a 2–3 minute walkthrough.

## v0.3 sparse-live-data behavior

Readout now handles the two failure modes observed on Shannon testnet:

- If order-book prices are present but depth is unavailable, sentiment uses inverse-spread weighting (or equal weighting if spread is also unavailable) instead of producing `NaN`/`null`.
- Correlation first uses aligned Pearson log returns. If DreamDEX observations are too asynchronous, it falls back to a Hayashi–Yoshida-style asynchronous return estimator without fabricating synchronized prices. Asynchronous estimates are capped at medium confidence.
- Basket marginals are taken from the correlation-selected matching event window/pool instead of blending unrelated 5m, 15m and 60m outcomes.
- If correlation is still insufficient, the API returns `status: "independence_only"` with a valid independent joint probability and deliberately withholds the correlation adjustment.

## Snapshot consistency

The deployed API uses short-lived in-process snapshots to keep one user interaction internally consistent without hiding fast-moving market changes:

- correlation: 30 seconds
- sentiment/order-book aggregation: 10 seconds
- market discovery: 15 seconds

Correlation responses expose `snapshotId`, `observedAt`, and cache metadata. Basket responses include a `snapshot` object recording which correlation and sentiment snapshots were used. Cache keys preserve requested asset order because matched DreamDEX pool metadata is directional even though correlation itself is symmetric.

## Deployment

The production topology is a separate live Node API plus the `site/` Next.js frontend. See [DEPLOYMENT.md](./DEPLOYMENT.md).

After deployment, validate the public URLs with:

```bash
npm run smoke:production -- https://YOUR-API-HOST https://YOUR-SITE.vercel.app
```
