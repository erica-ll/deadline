import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { chooseBaselineAction } from "./baseline.js";
import { GAME_VERSION, TRIALS, buildCheckpoint, SUITE_ID } from "./checkpoints.js";

if (!process.argv.includes("--suite") || process.argv[process.argv.indexOf("--suite") + 1] !== SUITE_ID) {
  throw new Error(`Use --suite ${SUITE_ID}.`);
}
const projectDir = fileURLToPath(new URL("../", import.meta.url));
const traceDir = join(projectDir, "traces/evaluation-baseline");
const runId = new Date().toISOString().replace(/[:.]/g, "-") + `-${randomUUID().slice(0, 8)}`;
await mkdir(traceDir, { recursive: true });
for (const trial of TRIALS) {
  const c = buildCheckpoint(trial.scenarioId, trial.seed);
  const trace = {
    schemaVersion: 2, suiteId: SUITE_ID, runId, trialId: trial.trialId, scenarioId: trial.scenarioId, seed: trial.seed,
    startedAt: new Date().toISOString(), provider: "baseline", model: "fixed-evidence-policy",
    modelConfigId: "deterministic-baseline-v1", promptId: null, gameVersion: GAME_VERSION,
    limits: { successfulActionLimit: 75, modelActionLimit: 0, effectiveEngineCallLimit: c.maxCalls, timeoutMs: null },
    bootstrap: { actions: c.bootstrap.map(({ action }) => action), successfulActions: c.bootstrap.length, submittedCalls: c.bootstrap.length, validation: c.checkpointValidation },
    initialObservation: c.initialObservation, events: [],
  };
  while (["ongoing", "choice"].includes(c.game.outcome().status)) {
    const observation = c.game.observe("detective");
    const action = chooseBaselineAction(observation);
    const result = c.game.step("detective", action);
    const event = { observation, action, source: "baseline", valid: result.valid, message: result.message, room: result.observation.room, evidence: result.observation.evidence, accusations: result.observation.accusations, pendingMessages: result.observation.pendingMessages, latencyMs: 0, usage: null, outcome: result.outcome, occurredAt: new Date().toISOString() };
    trace.events.push(event);
    if (!result.valid) { c.game.end_episode("baseline_error", `Baseline submitted an illegal action: ${action}`); break; }
    trace.summary = { modelCalls: 0, playerSubmittedCalls: trace.events.length, playerActions: trace.events.length, successfulPlayerActions: trace.events.filter((item) => item.valid).length, invalidPlayerActions: trace.events.filter((item) => !item.valid).length, finalOutcome: c.game.outcome() };
    trace.finishedAt = new Date().toISOString();
    const path = join(traceDir, `${runId}-${trial.trialId}-${trial.seed}.json`);
    await writeFile(`${path}.tmp`, JSON.stringify(trace, null, 2));
    await rename(`${path}.tmp`, path);
  }
  trace.summary ||= { modelCalls: 0, playerSubmittedCalls: trace.events.length, playerActions: trace.events.length, successfulPlayerActions: trace.events.filter((item) => item.valid).length, invalidPlayerActions: trace.events.filter((item) => !item.valid).length, finalOutcome: c.game.outcome() };
  trace.finishedAt ||= new Date().toISOString();
  const path = join(traceDir, `${runId}-${trial.trialId}-${trial.seed}.json`);
  await writeFile(`${path}.tmp`, JSON.stringify(trace, null, 2));
  await rename(`${path}.tmp`, path);
  console.log(`${trial.trialId} ${trial.scenarioId}/${trial.seed}: ${trace.summary.finalOutcome.reason} (${trace.summary.playerActions} player calls) — ${path}`);
}
