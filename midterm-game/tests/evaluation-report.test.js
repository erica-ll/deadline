import test from "node:test";
import assert from "node:assert/strict";
import { calculateOpenAICost } from "../players/evaluation-report.js";

const pricing = {
  provider: "openai", model: "gpt-6-luna", asOf: "2026-11-05", sourceUrl: "https://developers.openai.com/api/docs/pricing",
  inputUsdPerMillion: 0.1, cachedInputUsdPerMillion: 0.01,
  cacheWrite30mUsdPerMillion: 0.125, cacheWrite12hUsdPerMillion: 0.25, outputUsdPerMillion: 0.5,
};

test("cost estimate prices input, cached input, and TTL-unknown cache writes separately", () => {
  const result = calculateOpenAICost([{ model: "gpt-6-luna", events: [{ source: "model", usage: {
    input_tokens: 1000, input_tokens_details: { cached_tokens: 100, cache_write_tokens: 800 }, output_tokens: 200,
  } }] }], pricing);
  assert.equal(result.nonCachedInputTokens, 100);
  assert.equal(result.cachedInputTokens, 100);
  assert.equal(result.cacheWriteTtlUnknownTokens, 800);
  assert.equal(result.estimatedUsd, null);
  assert.ok(result.estimatedUsdMin < result.estimatedUsdMax);
});

test("cost estimate reports missing usage and exact cost when no TTL-unknown writes exist", () => {
  const result = calculateOpenAICost([{ model: "gpt-6-luna", events: [
    { source: "model", usage: { input_tokens: 1000, input_tokens_details: { cached_tokens: 200, cache_write_tokens: 0 }, output_tokens: 100 } },
    { source: "model", error: "provider unavailable" },
  ] }], pricing);
  assert.equal(result.missingUsageEvents, 1);
  assert.equal(result.estimatedUsd, 0.000132);
});

test("cost estimate marks model calls absent from a partial trace as missing usage", () => {
  const result = calculateOpenAICost([{ model: "gpt-6-luna", summary: { modelCalls: 3 }, events: [
    { source: "model", usage: { input_tokens: 100, output_tokens: 100 } },
  ] }], pricing);
  assert.equal(result.usageEvents, 1);
  assert.equal(result.missingUsageEvents, 2);
});
