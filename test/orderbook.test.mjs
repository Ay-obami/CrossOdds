import test from "node:test";
import assert from "node:assert/strict";
import { summarizeBook } from "../src/markets/orderbook-summary.mjs";

const orders = (items) => ({ orders: items.map(([price, quantity = 1_000_000]) => ({ price, quantity })) });

test("missing prices do not create a zero-priced quote", () => {
  const result = summarizeBook("pool", orders([[null], [undefined], [""]]), orders([]));
  assert.equal(result.impliedProbability, null);
  assert.equal(result.bestBid, null);
});

test("out-of-range prices cannot produce impossible marginals", () => {
  const result = summarizeBook("pool", orders([[1_200_000]]), orders([[-1]]));
  assert.equal(result.impliedProbability, null);
  assert.equal(result.bestAsk, null);
});

test("crossed books are withheld from pricing", () => {
  const result = summarizeBook("pool", orders([[700_000]]), orders([[600_000]]));
  assert.equal(result.impliedProbability, null);
  assert.ok(result.spread < 0);
});

test("valid one-sided and two-sided prices remain usable", () => {
  assert.equal(summarizeBook("pool", orders([[400_000]]), orders([])).impliedProbability, 0.4);
  assert.equal(summarizeBook("pool", orders([[400_000]]), orders([[600_000]])).impliedProbability, 0.5);
});
