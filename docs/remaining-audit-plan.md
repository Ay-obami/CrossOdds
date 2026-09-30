# CrossOdds remaining audit: source quality and reproducible demo

Scope: order book pagination/freshness, indexer source uncertainty, timestamp
alignment, outage presentation, and offline demonstration. No trades or deployment.

Completed sequence:
1. Reproduce timestamp collapse and carried-return quality regressions with tests.
2. Inspect locked SDK 0.28.1 primary source, then reproduce page/freshness failures.
3. Pin both sides and every page to one RPC block; bound reads and fail closed.
4. Separate retrieval time from source age and unverified indexer synchronization.
5. Reproduce broken explicit-window demo pricing and provide an offline HTTP smoke.
6. Run engine suite, demo smoke, synthetic engine replay, and production site build.

## Primary source evidence

The installed dependency is locked by package-lock.json. Its
`dist/orders.js:getAllOpenOrdersOnchain` explicitly describes a one-page response,
`hasMore`/`nextCursor`, and block pinning for consistency. It normalizes
`quantityRemaining` and `expireTimestampNs`; previous summary aliases missed the
former. `dist/candles.js` exposes bucketStart and OHLCV, without a synchronization
watermark in that candle response. Public reference:
https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient
The current public SDK may expose newer synchronization helpers; this patch does
not invent their availability in the locked version or silently upgrade it.

## Policy and limits

Order books use the locked contract ABI directly because the SDK wrapper cannot
pass blockNumber. Each side drains at most 100 pages of 100 orders. A stalled
cursor, exceeded cap, malformed response, failed read, or head older than 60s
fails the snapshot. Resting expired orders are excluded at one shared retrieval time after both
sides and all pages complete. `validUntil` records the earliest included order
expiry; sentiment caching is capped to that deadline, and downstream basket
pricing rechecks it after parallel dependency reads. Both sides use one block
number. This provides consistency relative to the selected RPC's observed head;
it does not independently prove RPC honesty, canonical finality, or newest head.
The 60s bound is a deliberately conservative application policy, not an upstream
SLA. Source block timestamp, retrieval time and block number are separate fields.
A cached sentiment expires by either its 10s TTL or source age. Unknown/stale
sentiment source freshness withholds basket probabilities.

Historical candle correlation remains available. `observedAt` means computation
or retrieval, never newest trade or indexer synchronization. `latestCandleA/B` are
bucket times. Its source freshness is **unknown**: the queried Candle response
contains no synchronization watermark. Such estimates cannot adjust a live basket;
usable current order book marginals may still produce independence-only output.
Data-quality confidence and model shrinkage weights are not calibrated outcome
probabilities or confidence intervals.

Indexer HTTP and RPC reads have 10s timeouts. Browser requests have 12s timeouts
and show clearly labeled demo fallback. Upstream failures return HTTP 503 rather
than silently generating empty/live data. Failed discovery scan ranges abort
rather than caching an apparently complete subset. Discovery remains bounded to
40,000 blocks and does not prove exhaustive market coverage. Frontend examples
are static portfolio previews and are labeled as examples. No live execution or
production deployment was verified by these offline checks.

## Verification

- `npm test`: 58 tests, including failed-before/fixed-after timestamp, pagination,
  stale head, expired orders, source policy, and explicit-window demo regressions.
- `npm run test:demo`: starts a local synthetic HTTP API and verifies assets,
  market windows, UP/UP and DOWN/UP basket quotes plus non-live tags.
- `npm run demo`: deterministic generated-candle replay through correlation and
  basket math. Its explicitly synthetic freshness override applies only to demo.
- `npm run build --prefix site`: production compilation, TypeScript and static pages.

The synthetic API uses illustrative, hand-authored marginals and correlation;
these are not a recording of upstream trades. The generated-candle CLI demo
exercises correlation math from deterministic generated returns. Neither proves
live indexer availability or trading performance.

## Upstream reachability probe

On 2026-09-30, an unauthenticated POST of `query { __typename }` to the
configured test indexer returned HTTP 200 with query_root. This establishes
endpoint reachability only, not recent trades, market correctness or indexer
synchronization. Live RPC/books were not exercised by this audit.
