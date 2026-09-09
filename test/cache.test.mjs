import test from "node:test";
import assert from "node:assert/strict";
import { TtlCache } from "../src/cache/ttl.mjs";

test("TTL cache returns entries before expiry and evicts after expiry", () => {
  const cache = new TtlCache(1000);
  cache.set("x", { value: 42 }, 10_000);
  assert.equal(cache.get("x", 10_999)?.value.value, 42);
  assert.equal(cache.get("x", 11_000), null);
});

test("TTL cache clear removes a single entry", () => {
  const cache = new TtlCache(1000);
  cache.set("a", 1, 0);
  cache.set("b", 2, 0);
  cache.clear("a");
  assert.equal(cache.get("a", 1), null);
  assert.equal(cache.get("b", 1)?.value, 2);
});
