import test from "node:test";
import assert from "node:assert/strict";
import { logReturns } from "../src/math/returns.mjs";

test("logReturns computes log price changes", () => {
  const out = logReturns([
    { timestamp: 1, close: 100 },
    { timestamp: 2, close: 110 },
    { timestamp: 3, close: 99 },
  ]);
  assert.equal(out.length, 2);
  assert.ok(Math.abs(out[0].return - Math.log(1.1)) < 1e-12);
  assert.ok(Math.abs(out[1].return - Math.log(0.9)) < 1e-12);
});
