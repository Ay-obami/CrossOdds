# 2–3 minute hackathon demo

## 0:00–0:20 — Problem

"Prediction markets price individual questions well, but real outcomes are not independent. BTC and ETH often move together, yet multiplying two market probabilities assumes they do not."

## 0:20–0:45 — Data proof

Open **Explore**. Explain that the feasibility run discovered eight live DreamDEX BTC/ETH markets and real OHLCV candle history at six indexer intervals.

Call out that the first prototype found exact one-minute overlap was often sparse, which is why the production engine uses adaptive coarser intervals and confidence gating.

## 0:45–1:20 — Basket builder

Open **Basket** and choose `BTC UP + ETH UP`.

Show:

- independent probability;
- correlation-adjusted probability;
- difference in points;
- selected interval;
- aligned samples;
- confidence.

State clearly whether the UI is using live API data or the deterministic demo dataset.

## 1:20–1:45 — Technical evidence

Explain the pipeline:

1. align 5m/15m/1h candles;
2. compute log returns;
3. Pearson correlation;
4. data-quality score and correlation shrinkage;
5. Gaussian-copula joint probability.

Emphasize that raw price levels are deliberately not correlated.

## 1:45–2:10 — Agent story

Run an MCP client or show tool output for:

```text
get_correlation BTC ETH
price_basket BTC UP ETH UP
```

Explain that human users and AI agents use the same engine.

## 2:10–2:35 — Ecosystem impact

"A single basket idea naturally references multiple DreamDEX Event Contracts. The product creates a reason to discover and act across markets instead of viewing each contract in isolation."

## 2:35–2:50 — Future vision

Mention:

- 3–4 leg correlation matrices;
- execution routing over underlying DreamDEX legs;
- agent strategies that scan for relationship mispricing;
- richer production liquidity history.
