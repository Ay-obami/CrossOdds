const DEFAULT_INDEXER_URL = "https://dev.smk.somnia.host/v1/graphql";

export const CANDLE_INTERVALS = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

const CANDLES_QUERY = `
  query Candles($where: Candle_bool_exp!, $limit: Int) {
    Candle(where: $where, order_by: {bucketStart: desc}, limit: $limit) {
      bucketStart openPrice high low closePrice baseVolume quoteVolume tradeCount
    }
  }
`;

function normalizeCandle(candle) {
  return {
    timestamp: Number(candle.bucketStart),
    open: Number(candle.openPrice),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.closePrice),
    baseVolume: Number(candle.baseVolume || 0),
    quoteVolume: Number(candle.quoteVolume || 0),
    tradeCount: Number(candle.tradeCount || 0),
  };
}

export async function getCandles({ pool, interval = "15m", limit = 500, indexerUrl = process.env.INDEXER_URL || DEFAULT_INDEXER_URL, fetchImpl = fetch }) {
  const intervalSeconds = typeof interval === "number" ? interval : CANDLE_INTERVALS[interval];
  if (!intervalSeconds) throw new Error(`Unsupported candle interval: ${interval}`);
  if (!/^0x[a-fA-F0-9]{40}$/.test(pool)) throw new Error(`Invalid pool address: ${pool}`);

  const response = await fetchImpl(indexerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: CANDLES_QUERY,
      variables: {
        where: { pool: { _eq: pool.toLowerCase() }, intervalSeconds: { _eq: intervalSeconds } },
        limit,
      },
    }),
  });

  if (!response.ok) throw new Error(`DreamDEX indexer HTTP ${response.status}`);
  const body = await response.json();
  if (body.errors?.length) throw new Error(`DreamDEX indexer GraphQL error: ${JSON.stringify(body.errors)}`);
  if (!Array.isArray(body.data?.Candle)) throw new Error("DreamDEX indexer returned an unexpected candle response shape");

  return body.data.Candle.map(normalizeCandle).reverse();
}
