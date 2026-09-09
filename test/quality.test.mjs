import test from "node:test";
import assert from "node:assert/strict";
import { scoreCorrelationQuality } from "../src/signals/quality.mjs";

test("very small samples are insufficient", () => {
  assert.equal(scoreCorrelationQuality({ samples: 4 }).confidence, "insufficient");
});

test("good dense sample can be high confidence", () => {
  const q = scoreCorrelationQuality({ samples: 60, filledSamples: 1, tradeCountA: 100, tradeCountB: 100, spanSeconds: 86400 });
  assert.equal(q.confidence, "high");
});
