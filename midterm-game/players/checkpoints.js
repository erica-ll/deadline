import { DeadlineGame } from "../src/engine.js";

export const GAME_VERSION = "1.7.0";
export const SUITE_ID = "robner-checkpoints-v2";
export const MAX_ACTIONS = 100;
export const DEFAULT_MAX_CALLS = 200;
export const DEFAULT_TIMEOUT_MS = 60_000;

const interviewActions = ["Baxter", "Dunbar", "George", "Mrs. Robner"].flatMap((person) => [
  `interview privately ${person}`,
  `ask ${person} about alibi`,
  ...(["Dunbar", "Mrs. Robner"].includes(person) ? [`search ${person}`] : []),
  `return ${person}`,
]);

export const SCENARIOS = {
  S1: {
    id: "S1",
    title: "Fresh case",
    seeds: [1101, 1102],
    actions: [],
    startRoom: "living room",
  },
  S2: {
    id: "S2",
    title: "Library completed",
    seeds: [2201, 2202],
    actions: [
      "go to library", "inspect body", "inspect teacup", "search body",
      "inspect saucer", "inspect Ebullion", "inspect desk", "search desk",
      "inspect notepad", "shade notepad", "inspect bookcase", "search bookcase",
      "open safe", "read Focus papers", "read new will", "analyze teacup",
      "analyze saucer",
    ],
    startRoom: "library",
  },
  S3: {
    id: "S3",
    title: "Interviews + Kitchen/Garden completed",
    seeds: [3301, 3302],
    actions: [
      ...interviewActions,
      "go to kitchen", "inspect china", "search china", "count china",
      "go to garden", "inspect holes", "inspect ladder", "search holes",
      "inspect fragment", "clean fragment", "analyze fragment",
    ],
    startRoom: "garden",
  },
};

export const TRIALS = [
  { trialId: "S1-T1", scenarioId: "S1", seed: 1101 },
  { trialId: "S2-T1", scenarioId: "S2", seed: 2201 },
  { trialId: "S3-T1", scenarioId: "S3", seed: 3301 },
  { trialId: "S1-T2", scenarioId: "S1", seed: 1102 },
  { trialId: "S2-T2", scenarioId: "S2", seed: 2202 },
  { trialId: "S3-T2", scenarioId: "S3", seed: 3302 },
];

function check(name, passed) {
  return { name, passed: Boolean(passed) };
}

function validateState(scenario, game, observation) {
  const s = game.state;
  const { actions } = scenario;
  const evidence = new Set(observation.evidence);
  const checks = [
    check("expected start room", observation.room === scenario.startRoom),
    check("bootstrap action count", s.successfulActions === actions.length),
    check("Living Room entry count remains one", s.roomEntries === 1),
    check("no active private interview", s.interviewee === null),
    check("no letter delivery or pending message", !s.letterDelivered && s.pendingMessages.length === 0),
    check("no accusation", s.accusations.length === 0),
  ];

  if (scenario.id === "S1") {
    checks.push(
      check("fresh evidence and clues", evidence.size === 0 && Object.keys(s.clues).length === 0),
      check("fresh questions, shown items, and history", Object.keys(s.asked).length === 0 && Object.keys(s.shown).length === 0 && s.log.length === 0),
      check("fresh engine call count", s.submittedCalls === 0),
    );
  } else if (scenario.id === "S2") {
    const forbiddenEvidence = ["porcelain fragment", "new chemical", "LoBlo", "Allergone", "letter"];
    checks.push(
      check("Library setup has exactly 17 successful actions", s.successfulActions === 17),
      check("no suspect questions or searches", Object.keys(s.asked).length === 0 && !evidence.has("LoBlo") && !evidence.has("Allergone")),
      check("no Kitchen or Garden evidence", forbiddenEvidence.every((item) => !evidence.has(item))),
      check("safe documents were read", s.safeOpen && s.clues.focus_papers_read && evidence.has("Focus papers") && evidence.has("new will")),
      check("no return to Living Room", s.roomEntries === 1),
    );
  } else if (scenario.id === "S3") {
    const forbiddenEvidence = ["teacup", "saucer", "Ebullion", "Focus papers", "new will", "letter"];
    const expectedPrivateAlibis = ["Baxter", "Dunbar", "George", "Mrs. Robner"].every((person) => s.asked[`${person}:alibi:private`] === true);
    const visitedLibrary = s.log.some(({ action }) => action === "go to library" || ["inspect body", "inspect teacup", "inspect saucer", "inspect Ebullion", "inspect desk", "inspect notepad", "inspect bookcase"].includes(action));
    checks.push(
      check("all four private alibi interviews are complete", expectedPrivateAlibis),
      check("no Library visits or evidence", !visitedLibrary && forbiddenEvidence.every((item) => !evidence.has(item))),
      check("Garden fragment is cleaned and analyzed", evidence.has("porcelain fragment") && evidence.has("new chemical") && s.clues.fragment_cleaned && s.clues.fragment_analyzed),
      check("Dunbar and Mrs. Robner medicines were found by private search", s.log.some(({ action }) => action === "search Dunbar") && s.log.some(({ action }) => action === "search Mrs. Robner") && evidence.has("LoBlo") && evidence.has("Allergone")),
      check("no medicine comparison or accusation", !s.clues.poison_confirmed && s.accusations.length === 0),
      check("no accusation or shown evidence", Object.keys(s.shown).length === 0),
    );
  }

  return { passed: checks.every(({ passed }) => passed), checks };
}

export function buildCheckpoint(scenarioId, seed, { maxCalls = DEFAULT_MAX_CALLS } = {}) {
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) throw new Error(`Unknown scenario ${scenarioId}. Choose S1, S2, or S3.`);
  if (!scenario.seeds.includes(Number(seed))) {
    throw new Error(`${scenarioId} does not use seed ${seed} in ${SUITE_ID}.`);
  }

  const bootstrapActions = [...scenario.actions];
  const game = new DeadlineGame({ maxActions: MAX_ACTIONS, maxCalls: bootstrapActions.length + maxCalls });
  game.reset(Number(seed));
  const bootstrap = [];

  for (const action of bootstrapActions) {
    const result = game.step("detective", action);
    if (!result.valid) {
      throw new Error(`Checkpoint ${scenarioId} setup rejected “${action}”: ${result.message}`);
    }
    bootstrap.push({ action, response: result.message, observation: result.observation });
  }

  const initialObservation = game.observe("detective");
  const checkpointValidation = validateState(scenario, game, initialObservation);
  if (!checkpointValidation.passed) {
    const failed = checkpointValidation.checks.filter(({ passed }) => !passed).map(({ name }) => name);
    throw new Error(`Checkpoint ${scenarioId} does not match ${SUITE_ID}: ${failed.join(", ")}`);
  }

  return {
    game,
    scenarioId,
    seed: Number(seed),
    bootstrap,
    checkpointValidation,
    initialObservation,
    maxCalls: bootstrapActions.length + maxCalls,
  };
}

export function trialByScenarioSeed(scenarioId, seed) {
  return TRIALS.find((trial) => trial.scenarioId === scenarioId && trial.seed === Number(seed)) || null;
}
