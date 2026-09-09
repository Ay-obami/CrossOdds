# Sandbox validation report

Validation performed on the implementation snapshot in this repository.

| Check | Result | Notes |
|---|---|---|
| Pure quantitative unit tests | PASS | 15/15 tests pass with `node --test test/*.test.mjs`. |
| Correlation engine integration fixture | PASS | Selects a usable interval and recovers the expected high correlation. |
| Gaussian-copula probability invariants | PASS | Independence at rho=0, positive/negative direction behavior, and Fréchet bounds tested. |
| Deterministic end-to-end CLI demo | PASS | Produces BTC/ETH correlation, quality, independent probability, adjusted probability, and pricing difference. |
| HTTP API health route | PASS | Exercised locally in `DEMO_MODE=true`. |
| HTTP correlation route | PASS | Returns explicit deterministic-demo metadata and expected correlation fields. |
| HTTP basket route | PASS | Returns independent and adjusted probabilities plus method/quality metadata. |
| JavaScript module syntax | PASS | Every `.mjs` under `src/`, `scripts/`, and `test/` passes `node --check`. |
| TSX syntax/transpile validation | PASS | Every `site/app/**/*.tsx` file transpiles with the globally available TypeScript compiler. |
| Secrets in repository | PASS | `.env` is ignored; only `.env.example` is included. |
| Frontend production `next build` | NOT VERIFIED IN SANDBOX | `npm ci --offline` reports `ENOTCACHED` for `undici-types`; online package installation stalled in this environment. Source syntax is validated, but a real Next build must be run after dependencies are installed. |
| Live Somnia/DreamDEX correlation | NOT VERIFIED IN SANDBOX | Requires the user's funded Shannon `PRIVATE_KEY` and reachable external endpoints. The user already supplied a real feasibility run showing 8 live BTC/ETH markets and candle history; this repository now provides `npm run test:candles` and production `npm run test:correlation:live`. |
| MCP live tool calls | NOT VERIFIED IN SANDBOX | Requires installed SDK dependencies, the Shannon key, and live network access. Tool definitions are implemented and JS syntax checked. |
| Real trade execution | OUT OF SCOPE FOR v0.2 | Basket is explicitly an analytics/execution-intent abstraction; no atomic basket contract or unverified SDK trading call is claimed. |

## Commands to run on the target machine

```bash
npm ci
npm test
npm run demo
npm run test:candles
npm run test:correlation:live BTC ETH
npm run test:baskets:live BTC ETH UP UP
npm run api
```

Then, in another terminal:

```bash
curl http://localhost:8787/health
curl 'http://localhost:8787/api/correlation?assetA=BTC&assetB=ETH'
curl -X POST http://localhost:8787/api/basket/price \
  -H 'content-type: application/json' \
  --data '{"legs":[{"asset":"BTC","direction":"UP"},{"asset":"ETH","direction":"UP"}]}'
```

Frontend:

```bash
cd site
npm ci
npm run build
npm start
```

For live frontend data, set `NEXT_PUBLIC_READOUT_API_URL` before the Next build.


## v0.3 validation

- 23 deterministic tests pass, including asynchronous correlation, matched-window basket marginals, independence-only fallback, and confidence-aware correlation shrinkage.
- Live Shannon verification still must be run on a machine with the configured private key/network.

## v0.5 hardening validation

- Deterministic suite expanded to 27 tests, including TTL expiry, correlation snapshot reuse, and reversed asset-order cache safety.
- HTTP demo-mode endpoints are exercised locally without Somnia credentials.
- Frontend source is TypeScript-transpiled in the sandbox; production `next build` still requires installed Next.js dependencies. The previous v0.4 production build was verified on the user's machine before these small frontend changes.

## v0.7 live HTTP integration check
Run `npm run test:api:live -- BTC ETH UP UP` with a funded Shannon testnet `PRIVATE_KEY` in `.env`.
The script starts the real Readout HTTP API as one long-running process, requests correlation, then prices the same basket twice. It fails unless the correlation snapshot is reused and the immediate repeat quote reuses both sentiment snapshots within their TTLs. This specifically validates deployment-style cache consistency, which cannot be demonstrated by separate one-shot CLI processes.

## v0.7 deployment hardening

Verified in the build sandbox:

- 27/27 deterministic tests pass after deployment changes.
- `src/api/http.mjs` and `scripts/smoke-production.mjs` pass Node syntax checking.
- API starts in demo mode on an explicit host/port.
- `/health` returns `version: 0.7.0` and the active data mode.
- `/ready` returns HTTP 200.
- root and site lockfile package versions match `0.7.0`.

Not claimed as sandbox-verified:

- a public Render deployment;
- a public Vercel deployment;
- live Somnia calls from v0.7 specifically. The quant engine is unchanged from v0.6, whose live same-process API integration was verified by the user before this deployment-only patch.
