# CrossOdds

> **Price connected outcomes, not isolated events.**

CrossOdds is a correlation-aware prediction basket platform built on **DreamDEX Event Contracts on Somnia**.

It lets users combine related outcomes, compare naive independent probability with a correlation-adjusted joint probability, and inspect the live market data, confidence, and methodology behind every result.

- **🚀 Live App:** https://crossodds-one.vercel.app/
- **🎥 Demo Video:** https://youtu.be/wAq3map7GeU
- **💻 GitHub:** https://github.com/Ay-obami/CrossOdds
- **⚙️ Live API:** https://dreamdex-readout-api-production-d7b7.up.railway.app/

---

## The Problem

Prediction markets are usually experienced one contract at a time, even when the outcomes are clearly related.

For example, if:

- BTC UP has a market-implied probability of 65%
- ETH UP has a market-implied probability of 50%

simply multiplying those probabilities assumes BTC and ETH are independent.

Real markets do not behave that way.

Related assets and event outcomes can move together. Ignoring those relationships can produce a misleading estimate of the probability that multiple outcomes happen together.

---

## The Solution

CrossOdds introduces a **relationship layer between DreamDEX Event Contracts**.

It combines live DreamDEX market-implied probabilities with cross-market relationship analysis to produce a confidence-controlled estimate of the probability that two connected outcomes occur together.

Instead of only asking:

> **Will BTC go UP?**

CrossOdds lets users ask:

> **What is the probability that BTC and ETH both move in selected directions over the same Event Contract horizon?**

The result is shown alongside the naive independent probability, so users can immediately see how much the observed relationship changes the estimate.

---

## Product Experience

### Market Explorer

The Market Explorer automatically discovers live DreamDEX Event Contracts and exposes the market context behind each probability.

Users can inspect:

- UP market-implied probability
- DOWN complementary probability
- Event Contract horizon
- Spread
- Resolution timing
- Available order-book depth
- Quote weighting method
- Underlying market details
- Market freshness and snapshot information

![CrossOdds Market Explorer — live BTC and ETH DreamDEX Event Contracts](https://raw.githubusercontent.com/Ay-obami/CrossOdds/main/docs/images/crossodds-market-explorer.jpg)

*Live DreamDEX Event Contracts grouped by asset and prediction window. CrossOdds surfaces UP/DOWN probabilities and the underlying market context instead of hiding the source of each number.*

### Basket Builder

The Basket Builder lets users combine two different DreamDEX assets using a **matched Event Contract horizon** and choose an outcome for each leg.

Example:

- **BTC — 15 minute — UP**
- **ETH — 15 minute — DOWN**

CrossOdds then displays:

- Independent joint probability
- Correlation-adjusted CrossOdds probability
- Relationship effect versus independence
- Observed correlation
- Plain-English relationship strength
- Data confidence
- Pricing reliability
- Sample count
- Coverage
- Estimator
- A plain-language explanation of why the probability changed

![CrossOdds Basket Builder — matched-horizon BTC and ETH basket with analysis](https://raw.githubusercontent.com/Ay-obami/CrossOdds/main/docs/images/crossodds-basket-builder.jpg)

*CrossOdds compares naive independence against a correlation-adjusted joint probability while exposing the observed relationship, reliability, sample quality, and methodology.*

CrossOdds deliberately withholds a correlation adjustment when the available live data does not meet the required quality threshold.

---

## How CrossOdds Uses DreamDEX

DreamDEX Event Contracts are the core of the product, not just a generic price feed.

CrossOdds uses DreamDEX to:

1. Discover live Event Contracts from Somnia
2. Read active market order books
3. Derive market-implied probabilities
4. Retrieve historical candle data from the DreamDEX indexer
5. Match comparable Event Contract horizons across assets
6. Estimate cross-market relationships
7. Build relationship-aware basket analytics from those live markets

The application dynamically surfaces new supported DreamDEX assets and shared event windows as they become available.

### Data Flow

```text
DreamDEX Event Contracts
        ↓
Live market discovery
        ↓
Order books → implied probabilities
        ↓
DreamDEX candle indexer
        ↓
Log-return transformation
        ↓
Cross-market correlation
        ↓
Data-quality scoring
        ↓
Correlation shrinkage
        ↓
Gaussian copula
        ↓
CrossOdds basket probability
```

---

## Why CrossOdds Is Different

Most prediction-market products operate on one Event Contract at a time.

CrossOdds introduces a **relationship layer between contracts**.

Instead of treating every market as isolated, CrossOdds enables users and AI agents to reason about:

- Joint outcomes
- Cross-market correlation
- Relative-value opportunities
- Divergence between related markets
- Multi-market prediction strategies
- Hedging opportunities

This creates the foundation for a new category of prediction-market products: **composable prediction markets**.

---

## Technical Implementation

CrossOdds is designed to handle the reality of sparse and asynchronous prediction-market data instead of assuming perfect market conditions.

### Correlation Engine

CrossOdds converts market prices into **log returns** and estimates cross-market relationships using:

- **Aligned Pearson correlation** when sufficiently synchronized data is available
- A **Hayashi-Yoshida-style asynchronous estimator** when testnet market data is sparse or uneven

### Data Quality

Correlation quality is evaluated using factors such as:

- Sample count
- Coverage
- Trade activity
- Time span
- Filled vs real samples

Low-quality estimates are not treated as equally reliable.

### Reliability-Controlled Pricing

Noisy correlations are shrunk toward zero before they are used for basket pricing.

This means weaker data naturally pushes the result closer to the independent probability instead of allowing unstable correlation estimates to dominate the output.

### Basket Probability

CrossOdds combines:

- DreamDEX market-implied marginal probabilities
- A quality-controlled correlation estimate

using a **bivariate Gaussian copula** to estimate the probability that both selected outcomes occur.

Probability outputs are constrained to valid bounds, and the platform can return:

- `ok`
- `independence_only`
- `insufficient_data`

depending on the quality of the live market data.

---

## AI Agent Integration

The same analytics engine used by the consumer interface is also exposed through MCP tools for AI agents.

Agents can use CrossOdds to:

- Discover supported assets
- Inspect market sentiment
- Analyze divergence
- Calculate cross-market correlations
- Price prediction baskets

This means autonomous agents and human-facing applications can share the same relationship intelligence.

The long-term goal is for agents to continuously monitor DreamDEX, detect relationship changes, identify opportunities, and eventually coordinate execution according to user-defined risk limits.

---

## Why This Matters for DreamDEX

CrossOdds creates a new interaction layer on top of Event Contracts.

Instead of discovering and trading one market at a time, users can express a thesis across multiple related markets.

As CrossOdds expands from analytics into coordinated execution, a single basket idea can generate activity across multiple DreamDEX Event Contracts.

Potential product categories include:

- Prediction baskets
- Relative-value trading
- Cross-market hedging
- AI-agent strategies
- Structured prediction products
- Portfolio-style prediction strategies
- Cross-market alerts and opportunity discovery

This gives DreamDEX more ways for users and autonomous agents to discover, analyze, and eventually trade Event Contracts.

---

## What Works Today

The current prototype already includes:

- ✅ Live DreamDEX Event Contract discovery
- ✅ Dynamic asset and event-window discovery
- ✅ UP and DOWN probability presentation
- ✅ Live order-book-derived market probabilities
- ✅ DreamDEX historical candle integration
- ✅ Cross-market return correlation
- ✅ Sparse-data asynchronous correlation fallback
- ✅ Confidence and quality scoring
- ✅ Reliability-based correlation shrinkage
- ✅ Matched-horizon two-leg basket pricing
- ✅ Independent vs correlation-adjusted probability comparison
- ✅ Plain-English relationship explanations
- ✅ Consumer-facing web application
- ✅ HTTP API
- ✅ MCP tools for AI agents
- ✅ Live deployment

### Current Execution Scope

CrossOdds currently supports **two-leg matched-horizon prediction baskets**.

It is currently an analytics and basket-pricing layer and does **not** claim to execute atomic multi-market basket trades.

---

## Vision

CrossOdds aims to become the **relationship intelligence and basket layer for prediction markets**.

The long-term goal is to move beyond isolated Event Contracts and enable users and AI agents to reason about connected outcomes, discover relative-value opportunities, construct multi-leg strategies, and coordinate execution across the underlying DreamDEX markets.

Future directions include:

- Multi-leg prediction baskets
- Cross-market opportunity detection
- Strategy and divergence alerts
- Coordinated execution across DreamDEX Event Contracts
- AI trading agents
- Hedging and structured prediction products
- Portfolio-style prediction strategies

> **CrossOdds is building toward composable prediction markets where users trade relationships, not just individual outcomes.**

---

## Built For

**Somnia × DreamDEX Event Contracts Hackathon**
