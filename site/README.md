# Readout web app

Next.js consumer UI for the Readout correlation/basket engine.

```bash
npm ci
npm run dev
```

Set `NEXT_PUBLIC_READOUT_API_URL` to a deployed Readout HTTP API before building if you want live DreamDEX data.

Without a configured/reachable API, the basket UI deliberately falls back to an explicitly labeled deterministic demo dataset. The Explore page is a recorded feasibility snapshot, not a live quote.

Production check:

```bash
npm run build
npm start
```

The pull-request workflow runs this clean-install production build on Node 22 alongside the engine tests. The build requires no API URL; without one, the UI uses the documented demo fallback.
