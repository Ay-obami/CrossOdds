export class TtlCache {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.entries = new Map();
  }

  get(key, now = Date.now()) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (now >= entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }
    return entry;
  }

  set(key, value, now = Date.now(), validUntil = Infinity) {
    const entry = { at: now, expiresAt: Math.min(now + this.ttlMs, validUntil), value };
    this.entries.set(key, entry);
    return entry;
  }

  clear(key) {
    if (key === undefined) this.entries.clear();
    else this.entries.delete(key);
  }
}

export function canonicalPairKey(assetA, assetB) {
  const a = String(assetA).toUpperCase();
  const b = String(assetB).toUpperCase();
  return [a, b].sort().join(":");
}

export function makeSnapshotId(prefix, parts, at = Date.now()) {
  const safe = parts.map((part) => String(part ?? "na").replace(/[^a-zA-Z0-9_.:-]/g, "-")).join(":");
  return `${prefix}:${safe}:${at}`;
}
