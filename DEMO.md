# Reproducible offline portfolio demo

```sh
npm ci
npm ci --prefix site
npm run test:demo
npm run demo
DEMO_MODE=true HOST=127.0.0.1 PORT=8787 npm run api
```

In a second terminal:

```sh
NEXT_PUBLIC_CROSSODDS_API_URL=http://127.0.0.1:8787 npm run dev --prefix site
```

Open `/explore` and `/basket`. The API supplies BTC and ETH 15m synthetic windows.
Try UP/UP and DOWN/UP to show direction-adjusted model pricing. Every API result
is tagged `dataMode: synthetic_demo` and `live: false`; the site labels demo mode.
No wallet, signer, indexer or RPC is needed for this demonstration. These values
are illustrative synthetic fixtures, not recorded trading evidence.

The generated-candle `npm run demo` separately exercises the actual correlation
engine using deterministic returns. Its synthetic source override is isolated to
the demo script. Live baskets with unverified indexer synchronization withhold the
correlation adjustment. See [source policy and limits](docs/SOURCE_QUALITY.md).

## Two-minute walkthrough

1. Show Explore and identify the synthetic BTC/ETH event-window marginals.
2. Build BTC UP + ETH UP; compare independence and the model adjustment.
3. Flip one direction and explain how the relationship changes.
4. Show CLI output: generated candles, aligned log returns, quality shrinkage,
   and the Gaussian-copula calculation.
5. Explain that in live mode the indexer source watermark is unverified, so the
   engine withholds adjusted pricing and shows independence-only output.

These model outputs illustrate the implementation, not calibrated forecasts or
verified live execution.
