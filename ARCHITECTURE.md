# Readout architecture and methodology

## Design objective

DreamDEX prices one Event Contract at a time. Readout estimates the relationship between multiple live markets and uses that relationship to show how a compound prediction differs from an independence assumption.

The design intentionally separates three concerns:

1. **DreamDEX adapters** — discovery, order books, and candles.
2. **Pure quantitative core** — alignment, returns, correlation, probability.
3. **Surfaces** — MCP tools, HTTP API, and browser UI.

This lets the math be tested without importing a blockchain SDK or requiring a key.

## Market discovery

`src/markets/discovery.mjs` follows the hackathon starter pattern: scan `MarketCreated` logs over recent block ranges, filter expired/non-collateral markets, and cache live results for 15 seconds.

Unlike the older implementation, total scan failure is surfaced instead of silently returning an empty market list.

## Candle adapter

`src/markets/candles.mjs` sends the GraphQL `Candle` query used by the DreamDEX SDK internally and normalizes output into numbers:

```text
timestamp, open, high, low, close, baseVolume, quoteVolume, tradeCount
```

Supported intervals mirror the indexer: 1m, 5m, 15m, 1h, 4h, 1d.

## Alignment

Exact 1-minute matching was shown by the feasibility run to be too sparse for many testnet market pairs. Production correlation therefore evaluates 5m, 15m, and 1h.

Each series is normalized into the target bucket. A missing value may inherit the immediately previous close for **one bucket only**. Anything older is rejected. Filled observations remain marked, so confidence can be penalized.

## Returns

Pearson correlation is calculated on log returns rather than raw close levels:

```text
r_t = ln(P_t / P_{t-1})
```

This avoids a major source of spurious correlation from two independently trending price levels.

## Correlation quality

Every candidate result carries:

- aligned return sample count;
- real sample count;
- filled sample count;
- coverage;
- trade count for each pool;
- time span;
- score and confidence label.

Fewer than five aligned return observations are always insufficient. Larger datasets can still be downgraded for excessive forward fill, low trade count, or very short spans.

The engine evaluates all matching market-window pairs across 5m/15m/1h and ranks usable results by confidence, quality score, then sample count.

## Marginal probabilities

Current UP probabilities come from DreamDEX order books. If both best bid and ask exist, their midpoint is used. Single-sided books use the available side. Asset-level sentiment is depth-weighted across live windows.

Internally probabilities remain in `[0,1]`; the 0–100 representation is only a presentation format.

## Basket model

For two legs with probabilities `pA` and `pB`:

```text
independent = pA × pB
```

Readout transforms the marginals into standard-normal thresholds and evaluates a bivariate normal CDF with correlation `rho`. That is the two-variable Gaussian copula joint probability.

The numerical CDF implementation is deterministic Simpson integration. Final output is constrained to the Fréchet bounds:

```text
max(0, pA + pB - 1) <= P(A ∩ B) <= min(pA, pB)
```

Before copula pricing, the observed correlation is shrunk toward zero using the engine quality score. This keeps the raw estimate visible while preventing low-sample extremes from dominating price. For UP/DOWN combinations, the sign of the resulting pricing correlation is then adjusted appropriately.

## Why no atomic basket contract yet

Version 0.2 treats a basket as analytics/execution intent over underlying DreamDEX markets. It does not claim that DreamDEX offers a native atomic multi-market product.

An on-chain router would add partial-fill, slippage, approval, failure-semantics, and audit scope. That is a follow-on feature only if the SDK's trading path can support it cleanly.

## Caching

- market discovery: 15s
- correlation result: 30s

The candle and order-book calls are already parallelized where independent.

## Security boundaries

- Private key is read only server-side.
- Browser receives no key or RPC credentials.
- HTTP asset inputs are allowlisted to short alphanumeric symbols.
- Basket direction is constrained to UP/DOWN.
- Request body size is capped.
- GraphQL endpoint is server-configured, not client supplied.
- Demo mode is explicitly labeled and never masquerades as live data.

## Request snapshots

Readout intentionally caches correlation estimates for 30 seconds and sentiment snapshots for 10 seconds. The correlation snapshot pins the selected market pools, candle interval, estimator, and quality result for the duration of a normal UI interaction. Basket responses include snapshot identifiers so the frontend and demo can show which observation set drove the price. Asset order is preserved in cache keys to avoid swapping `marketPoolA` and `marketPoolB` when users reverse basket legs.
