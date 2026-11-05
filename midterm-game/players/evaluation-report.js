import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TRIALS, SUITE_ID } from "./checkpoints.js";

export function calculateOpenAICost(traces, pricing) {
  if (!pricing || pricing.provider !== "openai" || !pricing.model || !pricing.asOf || !pricing.sourceUrl) throw new Error("Pricing must identify OpenAI, model, date, and official source URL.");
  const models = new Set(traces.map(({ model }) => model).filter(Boolean));
  if (models.size && (models.size !== 1 || !models.has(pricing.model))) throw new Error("The pricing model must match every trace in the report.");
  let input = 0, output = 0, cachedInput = 0, usageEvents = 0, missingUsageEvents = 0;
  for (const trace of traces) for (const event of trace.events || []) {
    const usage = event.usage;
    if (!event.source || event.source !== "model") continue;
    if (!usage) { missingUsageEvents += 1; continue; }
    const inCount = usage.input_tokens ?? usage.prompt_tokens;
    const outCount = usage.output_tokens ?? usage.completion_tokens;
    if (!Number.isFinite(inCount) || !Number.isFinite(outCount)) { missingUsageEvents += 1; continue; }
    usageEvents += 1;
    const cached = usage.input_tokens_details?.cached_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0;
    cachedInput += cached;
    input += inCount - cached;
    output += outCount;
  }
  if (!Number.isFinite(pricing.inputUsdPerMillion) || !Number.isFinite(pricing.outputUsdPerMillion)) throw new Error("Pricing requires numeric inputUsdPerMillion and outputUsdPerMillion values.");
  if (cachedInput && !Number.isFinite(pricing.cachedInputUsdPerMillion)) throw new Error("Cached input tokens were reported; provide cachedInputUsdPerMillion from the same official pricing source.");
  return { inputTokens: input + cachedInput, nonCachedInputTokens: input, cachedInputTokens: cachedInput, outputTokens: output, usageEvents, missingUsageEvents, estimatedUsd: usageEvents ? input * pricing.inputUsdPerMillion / 1_000_000 + cachedInput * (pricing.cachedInputUsdPerMillion || 0) / 1_000_000 + output * pricing.outputUsdPerMillion / 1_000_000 : null, pricingDate: pricing.asOf, sourceUrl: pricing.sourceUrl, model: pricing.model };
}

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; }
function pickLatestRun(traces) {
  const groups = new Map();
  for (const trace of traces) {
    const key = trace.runId || "legacy-run";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(trace);
  }
  return [...groups.values()].sort((a, b) => String(b.at(-1)?.startedAt || "").localeCompare(String(a.at(-1)?.startedAt || "")))[0] || [];
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

async function main() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const model = pickLatestRun(await tracesIn(join(root, "traces/evaluation")));
  const baseline = pickLatestRun(await tracesIn(join(root, "traces/evaluation-baseline")));
  const pricingPath = arg("--pricing");
  let pricing = null, cost = null, pricingError = null;
  if (pricingPath) {
    try { pricing = JSON.parse(await readFile(resolve(pricingPath), "utf8")); cost = calculateOpenAICost(model, pricing); }
    catch (error) { pricingError = error.message; }
  }
  const rows = TRIALS.map((expected) => {
    const m = model.find((item) => item.trialId === expected.trialId && item.seed === expected.seed);
    const b = baseline.find((item) => item.trialId === expected.trialId && item.seed === expected.seed);
    return `| ${expected.trialId} | ${expected.scenarioId}/${expected.seed} | ${m ? `${m.summary?.finalOutcome?.reason || "failed"} (${m.summary?.modelCalls ?? "?"} calls)` : "pending"} | ${b ? `${b.summary?.finalOutcome?.reason || "failed"} (${b.summary?.playerActions ?? "?"} calls)` : "pending"} |`;
  });
  const usageLine = cost?.estimatedUsd != null
    ? `Estimated API cost for usage metadata returned: $${cost.estimatedUsd.toFixed(6)} USD (${cost.inputTokens} input tokens, including ${cost.cachedInputTokens} cached, ${cost.outputTokens} output tokens; ${cost.missingUsageEvents} model requests omitted usage). Pricing: ${cost.model}, dated ${cost.pricingDate}, [official source](${cost.sourceUrl}).${cost.missingUsageEvents ? " Total cost is incomplete because some requests have no usage metadata." : ""}`
    : cost ? "Cost not calculated: provider traces contain no returned usage metadata." 
    : pricingError ? `Cost not calculated: ${pricingError}` : model.length ? "Cost not calculated: provide a dated official OpenAI pricing snapshot with `--pricing <file>`; token usage is not a price." : "Cost pending: no live model traces exist, so no usage or cost is claimed.";
  const text = `# Evaluation report\n\nSuite: \`${SUITE_ID}\`. Most recent run group with available trace records.\n\n| Trial | Pair | Model | Baseline |\n| --- | --- | --- | --- |\n${rows.join("\n")}\n\n${usageLine}\n\nLive model trials are not started by this report command. Failed calls and missing usage remain visible in trace files and are not retried or imputed.\n`;
  const output = resolve(arg("--output") || join(root, "evaluation-report.md"));
  await writeFile(output, text);
  console.log(`Wrote ${output}`);
  console.log(usageLine);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
