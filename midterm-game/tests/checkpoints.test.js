import test from "node:test";
import assert from "node:assert/strict";
import { SCENARIOS, TRIALS, buildCheckpoint } from "../players/checkpoints.js";
import { TrialRunner } from "../players/trial-runner.js";
import { chooseBaselineAction } from "../players/baseline.js";
import { calculateOpenAICost } from "../players/evaluation-report.js";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("the six declared trial IDs map to the three paired deterministic scenarios", () => {
  assert.deepEqual(TRIALS.map(({ trialId, scenarioId, seed }) => [trialId, scenarioId, seed]), [
    ["S1-T1", "S1", 1101], ["S2-T1", "S2", 2201], ["S3-T1", "S3", 3301],
    ["S1-T2", "S1", 1102], ["S2-T2", "S2", 2202], ["S3-T2", "S3", 3302],
  ]);
  assert.equal(SCENARIOS.S2.actions.length, 17);
  assert.equal(SCENARIOS.S3.actions.length, 24);
});

test("S1, S2, and S3 checkpoint preludes are accepted and preserve visible history and limits", () => {
  for (const [scenarioId, seed, expectedActions, room] of [["S1", 1101, 0, "living room"], ["S2", 2201, 17, "library"], ["S3", 3301, 24, "garden"]]) {
    const c = buildCheckpoint(scenarioId, seed);
    assert.equal(c.checkpointValidation.passed, true, scenarioId);
    assert.equal(c.bootstrap.length, expectedActions);
    assert.equal(c.initialObservation.successfulActions, expectedActions);
    assert.equal(c.initialObservation.room, room);
    assert.equal(c.initialObservation.history.length, expectedActions);
    assert.equal(c.maxCalls, expectedActions + 100);
    assert.equal("legal_actions" in c.initialObservation, false);
    assert.equal("paths" in c.initialObservation, false);
    if (scenarioId === "S2") {
      assert.ok(c.initialObservation.history.some(({ action, message }) => action === "read Focus papers" && /Focus Corporation/.test(message)));
      assert.equal(chooseBaselineAction(c.initialObservation), "go to living room");
    }
    if (scenarioId === "S3") {
      assert.ok(c.initialObservation.history.some(({ action }) => action === "ask Baxter about concert"));
      assert.ok(c.initialObservation.history.some(({ action }) => action === "analyze fragment"));
      assert.ok(c.initialObservation.evidence.includes("new chemical"));
      assert.ok(c.initialObservation.history.some(({ action, message }) => action === "search Dunbar" && /LoBlo/.test(message)));
      assert.ok(c.initialObservation.history.some(({ action, message }) => action === "search Mrs. Robner" && /Allergone/.test(message)));
      assert.ok(c.initialObservation.evidence.includes("LoBlo"));
      assert.ok(c.initialObservation.evidence.includes("Allergone"));
      assert.equal(chooseBaselineAction(c.initialObservation), "go to library");
    }
  }
  assert.throws(() => buildCheckpoint("S2", 1101), /does not use seed/);
});

test("watch runner persists sanitized model events and waits for explicit continuation", async () => {
  const traceDir = await mkdtemp(join(tmpdir(), "deadline-watch-test-"));
  try {
    const config = { provider: "openai", model: "test-model", apiKey: "DO-NOT-STORE", modelConfigId: "test-config", maxCalls: 5, timeoutMs: 100 };
    const runner = new TrialRunner({
      trials: [TRIALS[0], TRIALS[1], TRIALS[2]], config, traceDir,
      chooseAction: async ({ observation }) => ({ action: observation.choices?.length ? "close the case" : observation.room === "living room" ? "accuse Baxter" : "go to living room", latencyMs: 3, usage: { input_tokens: 1, output_tokens: 1 }, raw: "private reasoning must not be stored" }),
    });
    await runner.start();
    assert.equal(runner.status, "awaiting_continue");
    assert.equal(runner.trialIndex, 0);
    const publicJson = JSON.stringify(runner.snapshot());
    assert.doesNotMatch(publicJson, /DO-NOT-STORE|private reasoning|legal_actions|clues|culprit/);
    let traceName = (await readdir(traceDir)).find((name) => name.endsWith("S1-T1-1101.json"));
    let trace = JSON.parse(await readFile(join(traceDir, traceName), "utf8"));
    assert.equal(trace.summary.modelCalls, 2);
    assert.equal(trace.events[0].action, "accuse Baxter");
    assert.equal(trace.events[0].usage.input_tokens, 1);
    assert.equal(JSON.stringify(trace).includes("DO-NOT-STORE"), false);
    assert.equal(JSON.stringify(trace).includes("private reasoning"), false);
    await runner.continue();
    assert.equal(runner.trialIndex, 1);
    assert.equal(runner.status, "awaiting_continue");
    traceName = (await readdir(traceDir)).find((name) => name.endsWith("S2-T1-2201.json"));
    trace = JSON.parse(await readFile(join(traceDir, traceName), "utf8"));
    assert.equal(trace.bootstrap.successfulActions, 17);
  } finally { await rm(traceDir, { recursive: true, force: true }); }
});

test("watch model receives refreshed history with checkpoint setup, rejected guesses, and later successes", async () => {
  const traceDir = await mkdtemp(join(tmpdir(), "deadline-observable-state-test-"));
  const seenObservations = [];
  const seenArgumentKeys = [];
  try {
    const runner = new TrialRunner({
      trials: [TRIALS[1]],
      config: { provider: "openai", model: "test-model", apiKey: "test-key", modelConfigId: "test-config", maxCalls: 3, timeoutMs: 100 },
      traceDir,
      chooseAction: async (args) => {
        seenArgumentKeys.push(Object.keys(args).sort());
        seenObservations.push(structuredClone(args.observation));
        if (seenObservations.length === 1) return { action: "inspect Allergone" };
        if (args.observation.history.at(-1)?.valid === false) return { action: "inspect body" };
        return { action: "go to living room" };
      },
    });
    await runner.start();
    assert.equal(seenObservations.length, 3);
    assert.equal(seenObservations[0].room, "library");
    assert.equal(seenObservations[0].history.length, 17);
    assert.equal(seenObservations[0].history[0].action, "go to library");
    assert.ok(seenObservations[0].history.some(({ action, message }) => action === "read Focus papers" && /Focus Corporation/.test(message)));
    assert.equal(seenObservations[1].history.length, 18, "the rejected query and its response enter engine history");
    assert.equal(seenObservations[1].history.at(-1).action, "inspect Allergone");
    assert.equal(seenObservations[1].history.at(-1).valid, false);
    assert.ok(seenObservations[1].history.at(-1).message);
    assert.equal(seenObservations[2].history.length, 19, "the next successful action and response also enter history");
    assert.equal(seenObservations[2].history.at(-1).action, "inspect body");
    assert.equal(seenObservations[2].history.at(-1).valid, true);
    assert.ok(seenObservations[2].history.at(-1).message);
    assert.equal(seenObservations[2].history.some(({ action, valid }) => action === "inspect Allergone" && valid === false), true);
    for (const keys of seenArgumentKeys) {
      assert.ok(keys.includes("observation"));
      assert.equal(keys.includes("sessionHistory"), false);
      assert.equal(keys.includes("lastFeedback"), false);
    }
    assert.equal("legal_actions" in seenObservations[0], false);
    assert.equal("paths" in seenObservations[0], false);
    const traceName = (await readdir(traceDir)).find((name) => name.endsWith("S2-T1-2201.json"));
    const trace = JSON.parse(await readFile(join(traceDir, traceName), "utf8"));
    assert.equal("previousActionFeedback" in trace.events[0], false, "the engine history is the model's only memory transcript");
  } finally { await rm(traceDir, { recursive: true, force: true }); }
});

test("watch runner saves a terminal outcome when the model fails after accusing", async () => {
  const traceDir = await mkdtemp(join(tmpdir(), "deadline-pending-choice-error-"));
  let calls = 0;
  try {
    const runner = new TrialRunner({
      trials: [TRIALS[0]],
      config: { provider: "openai", model: "test-model", apiKey: "test-key", modelConfigId: "test-config", maxCalls: 5, timeoutMs: 100 },
      traceDir,
      chooseAction: async () => {
        calls += 1;
        if (calls === 1) return { action: "accuse Dunbar" };
        throw new Error("simulated provider failure");
      },
    });
    await runner.start();
    const snapshot = runner.snapshot();
    assert.equal(snapshot.status, "finished");
    assert.equal(snapshot.outcome.status, "terminal");
    assert.equal(snapshot.outcome.reason, "model_error");
    assert.deepEqual(snapshot.observation.choices, []);
    const traceName = (await readdir(traceDir)).find((name) => name.endsWith("S1-T1-1101.json"));
    const trace = JSON.parse(await readFile(join(traceDir, traceName), "utf8"));
    assert.equal(trace.summary.finalOutcome.status, "terminal");
    assert.equal(trace.summary.finalOutcome.reason, "model_error");
    assert.deepEqual(trace.summary.finalOutcome.accusations, ["Dunbar"]);
    assert.equal(trace.events.at(-1).outcome.reason, "model_error");
  } finally { await rm(traceDir, { recursive: true, force: true }); }
});

test("evaluation cost uses only returned token counts and dated matching model rates", () => {
  const pricing = { provider: "openai", model: "test-model", asOf: "2026-11-04", sourceUrl: "https://platform.openai.com/docs/pricing", inputUsdPerMillion: 1, outputUsdPerMillion: 2 };
  const result = calculateOpenAICost([{ model: "test-model", events: [
    { source: "model", usage: { input_tokens: 1_000_000, output_tokens: 500_000 } },
    { source: "model", usage: null },
  ] }], pricing);
  assert.equal(result.estimatedUsd, 2);
  assert.equal(result.missingUsageEvents, 1);
  assert.throws(() => calculateOpenAICost([{ model: "other-model", events: [] }], pricing), /must match/);
});
