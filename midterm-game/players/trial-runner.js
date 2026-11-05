import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { GAME_VERSION, buildCheckpoint } from "./checkpoints.js";
import { chooseModelAction } from "./model-player.js";

export const MODEL_PROMPT_ID = "robner-action-heads-v6-rejection-history";
export const MODEL_CONTEXT_ID = "engine-observation-history-v3";
const redact = (message, apiKey) => String(message || "Model request failed.").replaceAll(apiKey || "\u0000", "[redacted]").replace(/(sk-[A-Za-z0-9_-]{12,})/g, "[redacted]").slice(0, 500);

function publicSnapshot(run) {
  return {
    status: run.status, trialIndex: run.trialIndex, totalTrials: run.trials.length,
    plannedTrial: run.trials[0] ? { trialId: run.trials[0].trialId, scenarioId: run.trials[0].scenarioId, seed: run.trials[0].seed } : null,
    trial: run.current ? { trialId: run.current.trialId, scenarioId: run.current.scenarioId, seed: run.current.seed } : null,
    provider: run.config.provider, model: run.config.model, modelConfigId: run.config.modelConfigId,
    gameVersion: GAME_VERSION,
    limits: run.current ? { maxActions: 75, bootstrapActions: run.current.bootstrap.length, modelActionLimit: run.config.maxCalls, effectiveMaxCalls: run.current.maxCalls } : null,
    initialObservation: run.current?.initialObservation || null,
    observation: run.current?.game.observe("detective") || null,
    outcome: run.current?.game.outcome() || null,
    eventLog: run.current?.events || [], error: run.error || null,
    readiness: run.readiness || [],
  };
}

export class TrialRunner {
  constructor({ trials, config, traceDir, chooseAction = chooseModelAction }) {
    this.trials = trials;
    this.runId = new Date().toISOString().replace(/[:.]/g, "-") + `-${randomUUID().slice(0, 8)}`;
    this.config = config;
    this.traceDir = traceDir;
    this.chooseAction = chooseAction;
    this.trialIndex = -1;
    this.current = null;
    this.status = "ready";
    this.error = null;
    this.listeners = new Set();
    this.readiness = [];
    this.running = false;
  }
  snapshot() { return publicSnapshot(this); }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit() { const data = JSON.stringify(this.snapshot()); for (const listener of this.listeners) listener(data); }
  async start() { if (this.status !== "ready" || !this.config.apiKey || !this.config.model) return; await this._beginNext(); }
  async continue() { if (this.status !== "awaiting_continue" || this.running) return; await this._beginNext(); }
  async _beginNext() {
    this.trialIndex += 1;
    if (this.trialIndex >= this.trials.length) { this.current = null; this.status = "complete"; this.emit(); return; }
    const trial = this.trials[this.trialIndex];
    try {
      const built = buildCheckpoint(trial.scenarioId, trial.seed, { maxCalls: this.config.maxCalls });
      this.current = { ...built, ...trial, events: [], calls: 0, successfulPlayerActions: 0, invalidPlayerActions: 0, startedAt: new Date().toISOString(), modelCalls: 0 };
      this.status = "running"; this.error = null;
      await this._persist(); this.emit();
      await this._play();
    } catch (error) { this.error = redact(error.message, this.config.apiKey); this.status = "error"; this.emit(); }
  }
  async _play() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.current && this.current.game.outcome().status === "ongoing" || this.current && this.current.game.outcome().status === "choice") {
        const c = this.current;
        if (c.modelCalls >= this.config.maxCalls) { c.game.end_episode("model_call_limit", "The configured model-call limit was reached."); break; }
        const observation = c.game.observe("detective");
        const at = Date.now(); c.modelCalls += 1;
        try {
          const selected = await this.chooseAction({ ...this.config, observation });
          const result = c.game.step("detective", selected.action);
          c.calls += 1;
          if (result.valid) c.successfulPlayerActions += 1; else c.invalidPlayerActions += 1;
          c.events.push({ observation, action: selected.action, source: "model", valid: result.valid, message: result.message, room: result.observation.room, evidence: result.observation.evidence, accusations: result.observation.accusations, pendingMessages: result.observation.pendingMessages, latencyMs: selected.latencyMs ?? Date.now() - at, usage: selected.usage || null, outcome: result.outcome, occurredAt: new Date().toISOString() });
        } catch (error) {
          const message = redact(error.message, this.config.apiKey);
          const reason = error.code === "timeout_limit" ? "timeout_limit" : "model_error";
          c.game.end_episode(reason, message);
          c.events.push({ observation, source: "model", error: message, latencyMs: Date.now() - at, outcome: c.game.outcome(), occurredAt: new Date().toISOString() });
          this.error = message;
          break;
        }
        await this._persist(); this.emit();
      }
      if (this.current) {
        this.current.finishedAt = new Date().toISOString();
        this.status = this.trialIndex === this.trials.length - 1 ? "finished" : "awaiting_continue";
        await this._persist(); this.emit();
      }
    } finally { this.running = false; }
  }
  async _persist() {
    const c = this.current; if (!c) return;
    await mkdir(this.traceDir, { recursive: true });
    const trace = {
      schemaVersion: 2, suiteId: "robner-checkpoints-v2", runId: this.runId, trialId: c.trialId, scenarioId: c.scenarioId, seed: c.seed,
      startedAt: c.startedAt, finishedAt: c.finishedAt || null, provider: this.config.provider, model: this.config.model,
      modelConfigId: this.config.modelConfigId, promptId: MODEL_PROMPT_ID, contextProtocolId: MODEL_CONTEXT_ID, gameVersion: GAME_VERSION,
      limits: { successfulActionLimit: 75, modelActionLimit: this.config.maxCalls, effectiveEngineCallLimit: c.maxCalls, timeoutMs: this.config.timeoutMs },
      bootstrap: { actions: c.bootstrap.map(({ action }) => action), successfulActions: c.bootstrap.length, submittedCalls: c.bootstrap.length, validation: c.checkpointValidation },
      initialObservation: c.initialObservation, events: c.events,
      summary: { modelCalls: c.modelCalls, playerSubmittedCalls: c.modelCalls, playerActions: c.events.filter((event) => event.action).length, successfulPlayerActions: c.successfulPlayerActions, invalidPlayerActions: c.invalidPlayerActions, finalOutcome: c.game.outcome() },
    };
    const target = join(this.traceDir, `${this.runId}-${c.trialId}-${c.seed}.json`);
    const temp = `${target}.tmp`;
    await writeFile(temp, JSON.stringify(trace, null, 2));
    await rename(temp, target);
  }
}

export function validateSuiteCheckpoints(trials) {
  return trials.map((trial) => {
    const checkpoint = buildCheckpoint(trial.scenarioId, trial.seed, { maxCalls: 100 });
    return { trialId: trial.trialId, scenarioId: trial.scenarioId, seed: trial.seed, passed: checkpoint.checkpointValidation.passed, checks: checkpoint.checkpointValidation.checks };
  });
}
