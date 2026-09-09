import { getAssetSentiment } from "./sentiment.mjs";

export async function getDivergence(asset) {
  const sentiment = await getAssetSentiment(asset);
  if (!sentiment.windows || sentiment.windows.length < 2) {
    return { asset: sentiment.asset || asset.toUpperCase(), divergence: null, note: "need at least 2 live windows to compare" };
  }
  const byInterval = [...sentiment.windows].sort((a, b) => a.intervalMin - b.intervalMin);
  const shortest = byInterval[0];
  const longest = byInterval[byInterval.length - 1];
  const gap = Math.round((shortest.impliedProbability - longest.impliedProbability) * 10) / 10;
  return {
    asset: sentiment.asset,
    shortWindow: { intervalMin: shortest.intervalMin, impliedProbability: shortest.impliedProbability },
    longWindow: { intervalMin: longest.intervalMin, impliedProbability: longest.impliedProbability },
    divergence: gap,
    interpretation:
      Math.abs(gap) < 3
        ? "short and long horizons agree — low near-term uncertainty"
        : gap > 0
          ? "short-term crowd more bullish than long-term — possible near-term spike or overreaction"
          : "short-term crowd more bearish than long-term — possible near-term dip or overreaction",
  };
}
