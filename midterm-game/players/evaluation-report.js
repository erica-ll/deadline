import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TRIALS, SUITE_ID } from "./checkpoints.js";

export function calculateOpenAICost(traces, pricing) {
  if (!pricing || pricing.provider !== "openai" || !pricing.model || !pricing.asOf || !pricing.sourceUrl) throw new Error("Pricing must identify OpenAI, model, date, and official source URL.");
  const models = new Set(traces.map(({ model }) => model).filter(Boolean));
  if (models.size && (models.size !== 1 || !models.has(pricing.model))) throw new Error("The pricing model must match every trace in the report.");
  let input = 0, output = 0, cachedInput = 0, cacheWriteInput = 0, cacheWrite30mInput = 0, cacheWrite12hInput = 0, usageEvents = 0, missingUsageEvents = 0;
  for (const trace of traces) for (const event of trace.events || []) {
    const usage = event.usage;
    if (!event.source || event.source !== "model") continue;
    if (!usage) { missingUsageEvents += 1; continue; }
    const inCount = usage.input_tokens ?? usage.prompt_tokens;
    const outCount = usage.output_tokens ?? usage.completion_tokens;
    if (!Number.isFinite(inCount) || !Number.isFinite(outCount)) { missingUsageEvents += 1; continue; }
    const details = usage.input_tokens_details ?? usage.prompt_tokens_details ?? {};
    const cached = details.cached_tokens ?? 0;
    const cacheWrite = details.cache_write_tokens ?? 0;
    const ttl30 = details.cache_write_tokens_details?.ttl_30m_tokens ?? 0;
    const ttl12 = details.cache_write_tokens_details?.ttl_12h_tokens ?? 0;
    if (![cached, cacheWrite, ttl30, ttl12].every(Number.isFinite) || cached + cacheWrite > inCount || ttl30 + ttl12 > cacheWrite) { missingUsageEvents += 1; continue; }
    usageEvents += 1;
    cachedInput += cached;
    cacheWriteInput += cacheWrite;
    cacheWrite30mInput += ttl30;
    cacheWrite12hInput += ttl12;
    input += inCount - cached - cacheWrite;
    output += outCount;
  }
  for (const trace of traces) missingUsageEvents += Math.max(0, (trace.summary?.modelCalls ?? 0) - (trace.events || []).filter((event) => event.source === "model").length);
  if (!Number.isFinite(pricing.inputUsdPerMillion) || !Number.isFinite(pricing.outputUsdPerMillion)) throw new Error("Pricing requires numeric inputUsdPerMillion and outputUsdPerMillion values.");
  if (cachedInput && !Number.isFinite(pricing.cachedInputUsdPerMillion)) throw new Error("Cached input tokens were reported; provide cachedInputUsdPerMillion from the same official pricing source.");
  if (cacheWriteInput && (!Number.isFinite(pricing.cacheWrite30mUsdPerMillion) || !Number.isFinite(pricing.cacheWrite12hUsdPerMillion))) throw new Error("Cache-write tokens were reported; provide the official 30-minute and 12-hour cache-write rates.");
  const unknownTtlCacheWrite = cacheWriteInput - cacheWrite30mInput - cacheWrite12hInput;
  const baseUsd = input * pricing.inputUsdPerMillion / 1_000_000 + cachedInput * (pricing.cachedInputUsdPerMillion || 0) / 1_000_000 + cacheWrite30mInput * (pricing.cacheWrite30mUsdPerMillion || 0) / 1_000_000 + cacheWrite12hInput * (pricing.cacheWrite12hUsdPerMillion || 0) / 1_000_000 + output * pricing.outputUsdPerMillion / 1_000_000;
  const estimatedUsdMin = usageEvents ? baseUsd + unknownTtlCacheWrite * (pricing.cacheWrite30mUsdPerMillion || 0) / 1_000_000 : null;
  const estimatedUsdMax = usageEvents ? baseUsd + unknownTtlCacheWrite * (pricing.cacheWrite12hUsdPerMillion || 0) / 1_000_000 : null;
  return { inputTokens: input + cachedInput + cacheWriteInput, nonCachedInputTokens: input, cachedInputTokens: cachedInput, cacheWriteInputTokens: cacheWriteInput, cacheWrite30mInputTokens: cacheWrite30mInput, cacheWrite12hInputTokens: cacheWrite12hInput, cacheWriteTtlUnknownTokens: unknownTtlCacheWrite, outputTokens: output, usageEvents, missingUsageEvents, estimatedUsd: estimatedUsdMin === estimatedUsdMax ? estimatedUsdMin : null, estimatedUsdMin, estimatedUsdMax, pricingDate: pricing.asOf, sourceUrl: pricing.sourceUrl, model: pricing.model };
}

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; }
function latestCompatibleTrials(traces, { model = false } = {}) {
  const compatible = traces.filter((trace) => trace.gameVersion === "1.8.0" && (!model || (trace.provider === "openai" && trace.model === "gpt-6-luna" && trace.modelConfigId === "robner-checkpoints-v2-config-1" && trace.promptId === "robner-action-heads-v6-rejection-history" && trace.contextProtocolId === "engine-observation-history-v3" && trace.limits?.successfulActionLimit === 75 && trace.limits?.modelActionLimit === 100)));
  const selected = new Map();
  for (const trace of compatible) {
    const previous = selected.get(trace.trialId);
    if (!previous || String(trace.startedAt || "") > String(previous.startedAt || "")) selected.set(trace.trialId, trace);
  }
  return [...selected.values()];
}
async function tracesIn(dir) {
  let names;
  try { names = await readdir(dir); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const out = [];
  for (const name of names.filter((item) => item.endsWith(".json"))) {
    try {
      const value = JSON.parse(await readFile(join(dir, name), "utf8"));
      if (value.suiteId === SUITE_ID) out.push(value);
    } catch { /* ignore incomplete or unrelated trace files */ }
  }
  return out;
}
function traceLink(trace, kind) { return `[${trace.runId}-${trace.trialId}-${trace.seed}.json](traces/${kind}/${trace.runId}-${trace.trialId}-${trace.seed}.json)`; }
function modelCell(trace) {
  if (!trace) return "pending";
  const events = trace.events || [];
  const latencies = events.map((event) => event.latencyMs).filter(Number.isFinite);
  const usage = events.reduce((sum, event) => ({ input: sum.input + (event.usage?.input_tokens || 0), output: sum.output + (event.usage?.output_tokens || 0) }), { input: 0, output: 0 });
  const state = trace.finishedAt ? (trace.summary?.finalOutcome?.reason || "unknown") : "interrupted / incomplete";
  return `${state}; ${trace.summary?.modelCalls ?? "?"} calls, ${trace.summary?.successfulPlayerActions ?? "?"} accepted, ${trace.summary?.invalidPlayerActions ?? "?"} rejected; mean ${latencies.length ? Math.round(latencies.reduce((a,b)=>a+b,0)/latencies.length) : "?"} ms; ${usage.input}/${usage.output} input/output tokens; ${traceLink(trace, "evaluation")}`;
}
function baselineCell(trace) {
  if (!trace) return "pending";
  return `${trace.summary?.finalOutcome?.reason || "unknown"}; ${trace.summary?.playerActions ?? "?"} actions (${trace.summary?.successfulPlayerActions ?? "?"} accepted, ${trace.summary?.invalidPlayerActions ?? "?"} rejected); ${traceLink(trace, "evaluation-baseline")}`;
}

async function main() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const model = latestCompatibleTrials(await tracesIn(join(root, "traces/evaluation")), { model: true });
  const baseline = latestCompatibleTrials(await tracesIn(join(root, "traces/evaluation-baseline")));
  const pricingPath = arg("--pricing");
  let pricing = null, cost = null, pricingError = null;
  if (pricingPath) {
    try { pricing = JSON.parse(await readFile(resolve(pricingPath), "utf8")); cost = calculateOpenAICost(model, pricing); }
    catch (error) { pricingError = error.message; }
  }
  const rows = TRIALS.map((expected) => {
    const m = model.find((item) => item.trialId === expected.trialId && item.seed === expected.seed);
    const b = baseline.find((item) => item.trialId === expected.trialId && item.seed === expected.seed);
    return `| ${expected.trialId} | ${expected.scenarioId}/${expected.seed} | ${modelCell(m)} | ${baselineCell(b)} |`;
  });
  const usageLine = cost?.estimatedUsd != null
    ? `Estimated API cost for usage metadata returned: $${cost.estimatedUsd.toFixed(6)} USD (${cost.inputTokens} input tokens, including ${cost.cachedInputTokens} cached and ${cost.cacheWriteInputTokens} cache writes; ${cost.outputTokens} output tokens; ${cost.missingUsageEvents} model requests omitted usage). Pricing: ${cost.model}, dated ${cost.pricingDate}, [official source](${cost.sourceUrl}).${cost.missingUsageEvents ? " Total cost is incomplete because some requests have no usage metadata." : ""}`
    : cost?.estimatedUsdMin != null
    ? `Estimated API cost range for usage metadata returned: $${cost.estimatedUsdMin.toFixed(6)}–$${cost.estimatedUsdMax.toFixed(6)} USD (${cost.inputTokens} input tokens, including ${cost.cachedInputTokens} cached and ${cost.cacheWriteInputTokens} cache writes; ${cost.cacheWriteTtlUnknownTokens} cache-write tokens lack recorded TTL detail; ${cost.outputTokens} output tokens; ${cost.missingUsageEvents} model requests omitted usage). Pricing: ${cost.model}, dated ${cost.pricingDate}, [official source](${cost.sourceUrl}).${cost.missingUsageEvents ? " Total cost is incomplete because some requests have no usage metadata." : ""}`
    : cost ? "Cost not calculated: provider traces contain no returned usage metadata." 
    : pricingError ? `Cost not calculated: ${pricingError}` : model.length ? "Cost not calculated: provide a dated official OpenAI pricing snapshot with `--pricing <file>`; token usage is not a price." : "Cost pending: no live model traces exist, so no usage or cost is claimed.";
  const text = `# Evaluation report\n\nSuite: \`${SUITE_ID}\`. Latest compatible current-version trace per scheduled trial (game 1.8.0; model configuration and limits are filtered to the frozen setup). Model cells include latency and returned usage totals.\n\n| Trial | Pair | Model | Baseline |\n| --- | --- | --- | --- |\n${rows.join("\n")}\n\n${usageLine}\n\nLive model trials are not started by this report command. Failed calls and missing usage remain visible in trace files and are not retried or imputed. Older game versions are excluded.\n`;
  const output = resolve(arg("--output") || join(root, "evaluation-report.md"));
  await writeFile(output, text);
  console.log(`Wrote ${output}`);
  console.log(usageLine);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
