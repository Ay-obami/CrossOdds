import test from "node:test";
import assert from "node:assert/strict";
import { alignCandles } from "../src/math/alignment.mjs";

test("alignment buckets timestamps and carries at most one gap", () => {
  const a = [
    { timestamp: 0, close: 100 },
    { timestamp: 300, close: 101 },
    { timestamp: 600, close: 102 },
    { timestamp: 900, close: 103 },
  ];
  const b = [
    { timestamp: 0, close: 200 },
    { timestamp: 600, close: 202 },
    { timestamp: 900, close: 203 },
  ];
  const rows = alignCandles(a, b, { bucketSec: 300, maxCarryBuckets: 1 });
  assert.equal(rows.length, 4);
  assert.equal(rows[1].b.source, "filled");
  assert.equal(rows[2].b.source, "real");
});

test("alignment refuses stale forward fill", () => {
  const a = [{ timestamp: 0, close: 100 }, { timestamp: 300, close: 101 }, { timestamp: 600, close: 102 }];
  const b = [{ timestamp: 0, close: 200 }];
  const rows = alignCandles(a, b, { bucketSec: 300, maxCarryBuckets: 1 });
  assert.equal(rows.length, 2);
});

 test("bucket collapse retains latest observation regardless of input order", () => {
  const rows=alignCandles([{timestamp:290,close:110},{timestamp:200,close:100}], [{timestamp:0,close:200}], {bucketSec:300});
  assert.equal(rows[0].a.close,110);
 });
