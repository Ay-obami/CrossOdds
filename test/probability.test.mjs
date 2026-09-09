import test from "node:test";
import assert from "node:assert/strict";
import { jointAndProbability } from "../src/math/probability.mjs";

test("rho zero reproduces independence", () => {
  const p = jointAndProbability(0.65, 0.58, 0);
  assert.ok(Math.abs(p - 0.65 * 0.58) < 1e-6);
});

test("positive correlation increases same-direction joint probability", () => {
  const independent = 0.65 * 0.58;
  assert.ok(jointAndProbability(0.65, 0.58, 0.7) > independent);
});

test("negative correlation lowers same-direction joint probability", () => {
  const independent = 0.65 * 0.58;
  assert.ok(jointAndProbability(0.65, 0.58, -0.7) < independent);
});

test("joint probability respects Frechet bounds", () => {
  for (const rho of [-0.95, -0.5, 0, 0.5, 0.95]) {
    const pA = 0.8, pB = 0.7;
    const p = jointAndProbability(pA, pB, rho);
    assert.ok(p >= Math.max(0, pA + pB - 1) - 1e-8);
    assert.ok(p <= Math.min(pA, pB) + 1e-8);
  }
});
