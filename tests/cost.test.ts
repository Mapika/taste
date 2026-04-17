import { expect, test } from "vitest";
import { costUsd } from "../src/cost.js";

test("computes Haiku cost with cache discount", () => {
  // 1000 input, 500 cached, 300 output, Haiku
  const cost = costUsd({
    model: "haiku",
    inputTokens: 1000,
    cachedInputTokens: 500,
    outputTokens: 300,
  });
  // Haiku: $1/M in, $5/M out, cached reads @ 10% of in
  // Uncached in: 500 * 1 / 1e6 = 0.0005
  // Cached in:   500 * 0.1 / 1e6 = 0.00005
  // Out:         300 * 5 / 1e6 = 0.0015
  expect(cost).toBeCloseTo(0.0005 + 0.00005 + 0.0015, 6);
});

test("Sonnet cost is ~3x Haiku for same tokens", () => {
  const h = costUsd({ model: "haiku", inputTokens: 1000, cachedInputTokens: 0, outputTokens: 100 });
  const s = costUsd({ model: "sonnet", inputTokens: 1000, cachedInputTokens: 0, outputTokens: 100 });
  expect(s / h).toBeCloseTo(3, 1);
});
