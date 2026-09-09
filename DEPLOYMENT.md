# Readout deployment

Readout has two deployable pieces:

1. **API** — Node.js service at repo root (`npm run api`). It holds `PRIVATE_KEY` server-side and talks to Somnia/DreamDEX.
2. **Site** — Next.js app in `site/`. It only receives public API responses and never needs the private key.

## 1. Deploy the API (Render Blueprint)

The repository includes `render.yaml` and `Dockerfile`.

Push the repository to GitHub, create a Render Blueprint from the repository, and provide the secret values when prompted:

- `PRIVATE_KEY` — funded Shannon testnet key used by the DreamDEX SDK client.
- `CORS_ORIGIN` — the final frontend origin, e.g. `https://your-site.vercel.app`. During the first backend deploy you may temporarily use `*`, then replace it with the exact frontend origin.

The service health endpoint is `/health`.

Do **not** add `PRIVATE_KEY` to Vercel or any `NEXT_PUBLIC_*` variable.

## 2. Deploy the site to Vercel

Use `site/` as the Vercel project root.

Set this production environment variable before the production build:

```text
NEXT_PUBLIC_READOUT_API_URL=https://YOUR-API-HOST
```

Then deploy `site/` to production. Because this is a `NEXT_PUBLIC_*` variable, it is embedded into the frontend build and must point at the production API when the production build runs.

After you have the final Vercel URL, set the API's `CORS_ORIGIN` to that exact origin and redeploy/restart the API if necessary.

## 3. Production smoke test

From the repo root:

```bash
npm run smoke:production -- https://YOUR-API-HOST https://YOUR-SITE.vercel.app
```

It checks:

- API health and version header
- live asset discovery
- correlation endpoint
- basket pricing endpoint
- basket probability bounds and snapshot metadata when a correlated quote is available
- `/`, `/explore`, `/basket`, `/docs`, `/docs/reference`

`insufficient_data` is an acceptable live-market state for correlation, and `independence_only` is an acceptable basket state. HTTP errors, malformed responses, probability values outside `[0,1]`, and inaccessible routes fail the smoke test.

## 4. Local live browser test before deployment

Terminal 1:

```bash
npm ci
npm run api
```

Terminal 2:

```bash
cd site
cp .env.example .env.local
# Set NEXT_PUBLIC_READOUT_API_URL=http://localhost:8787
npm ci
npm run dev
```

Open `http://localhost:3000/basket` and `http://localhost:3000/explore`.

For local development set root `.env`:

```text
CORS_ORIGIN=http://localhost:3000
```
