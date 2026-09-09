import test from "node:test";
import assert from "node:assert/strict";
import { hayashiYoshidaCorrelation } from "../src/math/asynchronous-correlation.mjs";

function candles(times, prices) {
  return times.map((timestamp, i) => ({ timestamp, close: prices[i] }));
}

test("asynchronous estimator handles non-matching observation timestamps", () => {
  const a = candles([0, 10, 20, 30, 40, 50, 60], [100, 102, 101, 104, 103, 106, 108]);
  const b = candles([3, 14, 27, 38, 49, 61, 72], [200, 204, 202, 208, 206, 212, 216]);
  const result = hayashiYoshidaCorrelation(a, b);
  assert.ok(result.overlapPairs >= 5);
  assert.ok(result.correlation !== null);
  assert.ok(result.correlation > 0);
  assert.ok(result.correlation <= 1);
});

test("asynchronous estimator refuses very short series", () => {
  const result = hayashiYoshidaCorrelation(candles([0, 10], [100, 101]), candles([2, 12], [200, 201]));
  assert.equal(result.correlation, null);
});
