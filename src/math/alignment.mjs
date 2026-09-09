function bucketOf(timestamp, bucketSec) {
  return Math.floor(Number(timestamp) / bucketSec) * bucketSec;
}

function collapseIntoBuckets(candles, bucketSec) {
  const buckets = new Map();
  for (const candle of candles) {
    const bucket = bucketOf(candle.timestamp, bucketSec);
    const existing = buckets.get(bucket);
    if (!existing || candle.timestamp >= existing.timestamp) {
      buckets.set(bucket, { ...candle, timestamp: bucket, source: "real" });
    }
  }
  return buckets;
}

export function alignCandles(candlesA, candlesB, { bucketSec, maxCarryBuckets = 1 } = {}) {
  if (!bucketSec) throw new Error("alignCandles requires bucketSec");
  const mapA = collapseIntoBuckets(candlesA, bucketSec);
  const mapB = collapseIntoBuckets(candlesB, bucketSec);
  const allBuckets = [...new Set([...mapA.keys(), ...mapB.keys()])].sort((a, b) => a - b);
  if (!allBuckets.length) return [];

  let lastA = null;
  let lastB = null;
  const aligned = [];
  for (const timestamp of allBuckets) {
    const realA = mapA.get(timestamp) || null;
    const realB = mapB.get(timestamp) || null;
    if (realA) lastA = realA;
    if (realB) lastB = realB;

    const carryA = !realA && lastA && timestamp - lastA.timestamp <= maxCarryBuckets * bucketSec
      ? { ...lastA, timestamp, source: "filled" }
      : null;
    const carryB = !realB && lastB && timestamp - lastB.timestamp <= maxCarryBuckets * bucketSec
      ? { ...lastB, timestamp, source: "filled" }
      : null;
    const a = realA || carryA;
    const b = realB || carryB;
    if (a && b) aligned.push({ timestamp, a, b });
  }
  return aligned;
}
