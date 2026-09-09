# Readout server surfaces

Readout exposes the same signal engine in two forms.

## MCP (stdio)

```bash
npm start
```

Tools: `list_assets`, `get_sentiment`, `get_divergence`, `get_market_snapshot`, `get_correlation`, `price_basket`.

## HTTP JSON API

```bash
npm run api
```

Default port: `8787`.

Use `CORS_ORIGIN` to restrict browser access in production.

For an offline/local contract test that cannot be mistaken for live data:

```bash
DEMO_MODE=true npm run api
```

Every demo response includes `dataMode: "deterministic_demo"` and `live: false`.
