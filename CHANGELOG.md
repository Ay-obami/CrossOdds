# Changelog

## 0.7.0

- Added production Dockerfile and Render Blueprint for the live Readout API.
- API now binds explicitly to `0.0.0.0`, exposes `/ready`, and reports live/demo mode in `/health`.
- Added `site/.env.example` for production frontend API wiring.
- Added `npm run smoke:production` to validate deployed API endpoints and all public site routes.
- Added `DEPLOYMENT.md` with the complete backend → frontend → CORS → smoke-test sequence.

## v0.4.0

- Added quality-aware correlation shrinkage for basket pricing.
- Preserves raw observed correlation while exposing `pricingCorrelation`, `pricingReliability`, `rawEffectiveCorrelation`, and risk-controlled `effectiveCorrelation`.
- Prevents sparse/extreme live estimates from overwhelming DreamDEX marginal probabilities.
- Fixed the basket frontend's live API contract: correlation is an object in live responses, not a scalar.
- UI now displays observed correlation, pricing correlation, reliability, estimator, interval, and confidence separately.
- Expanded deterministic suite from 19 to 23 tests.

## v0.3.0

- Added asynchronous correlation fallback, matched event-window marginals, and independence-only basket fallback.

## v0.5.0 — snapshot consistency and frontend hardening

- Added explicit 30-second correlation snapshot metadata and 10-second sentiment snapshot metadata.
- Basket responses now identify the correlation and sentiment snapshots used for pricing.
- Added deterministic TTL/cache tests and directional cache safety for reversed asset order.
- `/explore` now loads live assets and market windows from the Readout API when configured, with a clearly labeled recorded fallback.
- Basket UI shows the live correlation snapshot identifier used for pricing.
- Added an explicit Turbopack root for the nested Next.js app to avoid workspace-root ambiguity warnings.

## v0.6.0

- Added `npm run test:api:live -- BTC ETH UP UP`, an end-to-end same-process HTTP smoke test.
- Verifies that a correlation snapshot is reused by basket pricing inside the 30s cache TTL.
- Verifies correlation and sentiment snapshot IDs remain stable across two immediate basket quotes.
- Verifies the second basket request reports a correlation cache hit.
- This closes the gap between unit-tested cache behavior and the actual deployment topology.
