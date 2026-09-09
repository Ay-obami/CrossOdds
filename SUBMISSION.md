# Hackathon submission draft — Readout

## Project name

**Readout — Correlation-Aware Prediction Baskets for DreamDEX**

## One-line description

Readout prices multi-market prediction baskets using live DreamDEX Event Contract probabilities plus quality-controlled cross-market correlation, and exposes the same intelligence to humans and AI agents.

## Problem

Prediction markets price individual questions independently, but real-world outcomes often move together. Multiplying two market probabilities assumes independence and can materially misstate the probability of a combined outcome.

## Solution

Readout lets a user combine two DreamDEX Event Contracts such as BTC-UP + ETH-UP. It:

1. discovers live DreamDEX markets;
2. reads their implied probabilities from the order book;
3. loads historical DreamDEX candle data;
4. estimates cross-market correlation from log returns;
5. handles sparse/non-synchronous data with aligned Pearson or a Hayashi-Yoshida-style asynchronous estimator;
6. scores sample quality and shrinks uncertain correlation toward zero;
7. computes both the naive independent price and a Gaussian-copula correlation-adjusted basket probability;
8. exposes the result in a consumer UI, HTTP API, and MCP tools for AI agents.

## Why it is useful

A basket turns relationships between Event Contracts into something users can see and act on. Instead of asking only “what is the probability of BTC-UP?”, Readout can answer “what is the probability BTC-UP and ETH-UP both happen, given what DreamDEX market history says about their relationship?”

## DreamDEX integration

- Somnia/DreamDEX live market discovery
- on-chain DreamDEX order-book reads
- DreamDEX GraphQL candle history
- matched Event Contract windows for basket marginals
- live market correlation and basket pricing

Readout does not claim to create a new atomic basket contract. In the current prototype a basket is an analytics/execution-intent layer over underlying DreamDEX Event Contracts.

## Technical highlights

- Correlation on **log returns**, not raw price levels
- adaptive 5m / 15m / 1h interval evaluation
- maximum one-bucket forward fill for aligned series
- asynchronous correlation fallback for sparse observations
- quality score based on sample count, coverage, fill ratio, trading activity, and time span
- confidence-aware shrinkage so low-quality extreme correlations cannot dominate pricing
- Gaussian copula joint probability with Fréchet-bound protection
- exact event-window matching between the correlation pair and marginal market probabilities
- short-lived snapshot caching for internally consistent quotes
- graceful `independence_only` and `insufficient_data` states instead of fabricated certainty

## Product surfaces

### Consumer web app

- `/` — product explanation
- `/explore` — live DreamDEX market explorer
- `/basket` — two-leg BTC/ETH basket builder
- `/docs` — methodology and integration
- `/docs/reference` — MCP + HTTP API reference

### AI / developer layer

MCP tools include:

- `list_assets`
- `get_sentiment`
- `get_divergence`
- `get_market_snapshot`
- `get_correlation`
- `price_basket`

The HTTP API exposes the same core engine for the browser.

## Validation

The deterministic suite contains 27 tests covering alignment, asynchronous returns, Pearson correlation, probability bounds, confidence scoring, shrinkage, matching market windows, and snapshot cache behavior.

Live testing on DreamDEX has also demonstrated:

- successful market and candle discovery;
- real BTC/ETH correlations from both aligned and asynchronous estimators;
- live matched-market marginal probabilities;
- live risk-controlled basket prices;
- same-process cache consistency across correlation and repeated basket requests.

## Demo flow (2–3 minutes)

1. Open `/explore` and show live BTC and ETH DreamDEX Event Contracts.
2. Open `/basket` and select BTC-UP + ETH-UP.
3. Compare the naive independent probability against the correlation-adjusted probability.
4. Expand the data-quality explanation: observed correlation, pricing correlation, reliability, interval, estimator, and confidence.
5. Explain that weak samples are shrunk toward independence rather than overfit.
6. Show the MCP/HTTP reference to demonstrate that agents can consume the same engine.
7. End with the vision: relationship-aware prediction portfolios built on top of DreamDEX Event Contracts.

## Judging alignment

### Innovation & originality

Readout treats Event Contracts as a related portfolio rather than isolated questions and produces a cross-market probability product.

### Technical implementation

The prototype combines on-chain market state, indexed historical candles, non-synchronous time-series handling, correlation-quality controls, and copula probability modeling.

### UX & design

The quant layer is translated into a simple comparison: independent probability, adjusted probability, pricing difference, and an understandable confidence explanation.

### Business & ecosystem impact

Basket experiences naturally encourage users and agents to reason about and potentially interact with multiple DreamDEX Event Contracts per decision, increasing the utility of the market graph rather than a single market.

### Presentation

The core demo has a visible reveal: the combined probability changes when live DreamDEX history shows a meaningful relationship, while weak relationships stay close to independence.

## Honest limitations

- Somnia testnet market activity can be sparse and correlations can change quickly.
- Readout reports confidence and shrinks low-quality estimates rather than presenting them as precise forecasts.
- Current baskets contain two legs; the architecture can later extend to larger correlation matrices.
- Trade execution remains in the underlying DreamDEX markets; Readout v0.7 is primarily an analytics/intelligence layer.
