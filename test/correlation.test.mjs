import test from "node:test";
import assert from "node:assert/strict";
import { pearson } from "../src/math/correlation.mjs";

test("pearson detects perfect positive correlation", () => {
  assert.ok(Math.abs(pearson([1,2,3,4], [2,4,6,8]) - 1) < 1e-12);
});

test("pearson detects perfect negative correlation", () => {
  assert.ok(Math.abs(pearson([1,2,3,4], [8,6,4,2]) + 1) < 1e-12);
});

test("pearson returns null on constant series", () => {
  assert.equal(pearson([1,1,1], [1,2,3]), null);
});
