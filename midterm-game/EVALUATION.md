# Evaluation record

## Declared evaluation suite

Suite `robner-checkpoints-v2` was declared on 2026-11-04. The latest completed
six-trial OpenAI run used model `gpt-6-luna`, config
`robner-checkpoints-v2-config-1`, game `1.6.0`, prompt
`robner-action-heads-v6-rejection-history`, context protocol
`engine-observation-history-v3`, a 50-successful-action cap, and a 100-call
model budget. Every trial
hit that cap without solving the case. Based on those results, the successful-action cap is now 100; the updated
game is `1.7.0`, and reruns under that version are pending. The configured
model-call limit has since been raised to 200; no trials at the new call limit
have been run.
Unlike the earlier
`robner-midterm-v1`, these are three distinct, reproducible starting states in
the same bounded case; seeds identify repeatable trials and do not themselves
change the case. Scenario 3 is held out from prompt tuning. Freeze and record
the model, prompt/configuration identifier, and game version before running
the six scored live trials. Do not tune between these trials.

Both players receive the same engine observation and action validation. The
observation is the machine player's observable state: the same case briefing,
suspect introductions, action-word list, command protocol, current scene and
evidence shown to the human player, plus an ordered `history` of submitted
commands and their engine responses. Each entry marks whether the command was
accepted. Rejected commands remain in history but do not change investigation
facts or the successful-action count. S2 and S3 histories contain every setup
action and response because the checkpoint builder replays setup through the
engine. No separate session-memory transcript is sent to the model. Neither
player receives `legal_actions()` or future paths.

Freeze and report this context protocol with the model configuration. The
checkpoint builder must construct each state by replaying the legal setup
actions listed below through the engine. Record that setup transcript as
bootstrap history. Bootstrap actions count toward the game's 100-action limit,
but they are not model calls; the model-call budget starts at zero when the
player trial begins. The runner must report bootstrap actions separately from
actions submitted by the player.

### Exact scenario definitions

| ID | Starting state and exact setup | Evidence/state that must still be absent | Player task |
| --- | --- | --- | --- |
| S1 Fresh case | Call `reset(seed)` with seed 1101 or 1102. Start in the Living Room; no interview, evidence, clue, question, shown item, accusation, pending message, or prior action. `roomEntries=1`, `successfulActions=0`, model calls=0. | All investigation progress is empty; letter is not delivered. | Investigate from the opening and reach the best-supported case outcome. |
| S2 Library completed | Starting from S1, replay in order: `go to library`; `inspect body`; `inspect teacup`; `search body`; `inspect saucer`; `inspect Ebullion`; `inspect desk`; `search desk`; `inspect notepad`; `shade notepad`; `inspect bookcase`; `search bookcase`; `open safe`; `read Focus papers`; `read new will`; `analyze teacup`; `analyze saucer`. Start the player in the Library. The bootstrap has 17 successful actions. | No Kitchen/Garden evidence; no suspect interview, question, search, or accusation; no Living Room re-entry, delivered/read letter, or pending letter message. | Continue from the completed Library investigation, investigate remaining rooms and people, and reach the best-supported case outcome. |
| S3 Interviews + Kitchen/Garden completed | Starting from S1, replay in order: interview each of `Baxter`, `Dunbar`, `George`, and `Mrs. Robner` privately and ask about alibi; while Dunbar is interviewed, `search Dunbar`; while Mrs. Robner is interviewed, `search Mrs. Robner`; return each person to the group. Then do `go to kitchen`, `inspect china`, `search china`, `count china`, `go to garden`, `inspect holes`, `inspect ladder`, `search holes`, `inspect fragment`, `clean fragment`, `analyze fragment`. Start the player in the Garden. The bootstrap has 25 successful actions. | The starting evidence includes the Garden fragment/new chemical and both medicines (LoBlo and Allergone). No Library entry/action, teacup/saucer/Ebullion/Focus papers/notepad/safe evidence, letter delivery/read, medicine comparison, or accusation. All four interviews are closed. | Investigate the remaining Library and suspect evidence, compare either medicine with the Garden chemical, and reach the best-supported case outcome. |

For S2 and S3, preserve the setup actions in the visible game history and
trace. Enforce the 100-action cap against bootstrap plus player actions. Do not
silently reset `successfulActions` after setup. Bootstrap submissions must not
consume the model's 200-call budget; configure the engine's submitted-call
guard so the player still has at most 200 submitted calls after bootstrap, and
report the player model-call count separately. If any listed bootstrap action
is illegal or the resulting observation/state differs from this specification,
fail checkpoint construction visibly and do not start a trial.

### Paired trial schedule

Run the cases sequentially in this order, one live episode at a time. Show each
model trial in the same local split-screen watch page: the actual game UI on the
left and the live player-visible agent action stream on the right. The first
episode is also the recording/watch run; it counts as S1-T1 and is not an extra
seventh trial. Erica opens the local page, checks the split-screen, starts
screen recording, and clicks **Start S1-T1**. After its terminal outcome and
trace are saved, she stops recording and clicks **Continue suite** to start the
next trial. A failed provider request still counts as a trial, is recorded as
a failure, and does not trigger an automatic retry.

| Order | Trial ID | Scenario | Seed | Model-player result under 1.6.0 / 50-action cap | Baseline status |
| ---: | --- | --- | ---: | --- | --- |
| 1 | S1-T1 | S1 Fresh case | 1101 | [`episode_limit`](traces/evaluation/2026-11-04T23-47-12-233Z-bbe1da82-S1-T1-1101.json); 79 calls, 50 accepted, 29 rejected; no accusation | Prior 1.1.0 baseline: `complete_solution`, 25 calls |
| 2 | S2-T1 | S2 Library completed | 2201 | [`episode_limit`](traces/evaluation/2026-11-04T23-47-12-233Z-bbe1da82-S2-T1-2201.json); 65 calls, 33 accepted player actions plus 17 setup actions, 32 rejected; no accusation | Prior 1.1.0 baseline: `complete_solution`, 19 calls |
| 3 | S3-T1 | S3 Interviews + Kitchen/Garden completed (held out) | 3301 | [`episode_limit`](traces/evaluation/2026-11-04T23-47-12-233Z-bbe1da82-S3-T1-3301.json); 34 calls, 25 accepted player actions plus 25 setup actions, 9 rejected; accused Mrs. Robner | Prior 1.1.0 baseline: `complete_solution`, 20 calls |
| 4 | S1-T2 | S1 Fresh case | 1102 | [`episode_limit`](traces/evaluation/2026-11-04T23-47-12-233Z-bbe1da82-S1-T2-1102.json); 75 calls, 50 accepted, 25 rejected; accused George | Prior 1.1.0 baseline: `complete_solution`, 25 calls |
| 5 | S2-T2 | S2 Library completed | 2202 | [`episode_limit`](traces/evaluation/2026-11-04T23-47-12-233Z-bbe1da82-S2-T2-2202.json); 49 calls, 33 accepted player actions plus 17 setup actions, 16 rejected; accused Mrs. Robner | Prior 1.1.0 baseline: `complete_solution`, 19 calls |
| 6 | S3-T2 | S3 Interviews + Kitchen/Garden completed (held out) | 3302 | [`episode_limit`](traces/evaluation/2026-11-04T23-47-12-233Z-bbe1da82-S3-T2-3302.json); 38 calls, 25 accepted player actions plus 25 setup actions, 13 rejected; accused Dunbar | Prior 1.1.0 baseline: `complete_solution`, 20 calls |

The baseline was rerun with game `1.1.0` after the evidence-reinspection rule
and room-list field were added. Those six traces remain recorded as the 1.1.0
baseline; rerun them under 1.7.0 before treating them as paired results for the
current mechanics. Earlier version `1.0.0` traces remain preserved. The
baseline is deterministic, so repeated outcomes may match; retain one trace
per scheduled pair to make the pairing explicit. Seeds
label trials and are not evidence of randomized content. Model/API sampling
settings are part of the frozen configuration.

The checkpoints and implementation requirements are specified in
[`CHECKPOINT_IMPLEMENTATION_PROMPT.md`](CHECKPOINT_IMPLEMENTATION_PROMPT.md).

## Implemented baseline

The baseline is a deterministic evidence-first policy, not a random mover. It
prioritizes private concert interviews and Dunbar's medicine, then Baxter's
motive, the china count, ladder holes, fragment analysis, and the final
comparison. It chooses from the observation and history alone; the engine
validates each submitted guess. The comparison should report invalid moves,
calls, latency, tokens, and failures rather than only the ending.

## Results and traces

- Baseline, seed 1: `complete_solution`, 23 successful actions, 0 model calls.
  See [`baseline-seed-1-1793664458403.json`](traces/baseline-seed-1-1793664458403.json).
- Baseline, seed 11: `complete_solution`, 23 successful actions, 0 model calls.
  See [`baseline-seed-11-1793664458511.json`](traces/baseline-seed-11-1793664458511.json).
- On 2026-11-02, `npm test` passed all 21 deterministic tests and
  `npm run build` completed. The source-to-bounded route comparison is in
  [`SOURCE_FLOW_AUDIT.md`](SOURCE_FLOW_AUDIT.md).
- On 2026-11-03, fixes from the independent review were verified with
  `npm test`: all 38 deterministic tests passed. Coverage now includes the
  private-interview letter-entry boundary, neutral safe opening, final-call
  accusation termination, the then-configured 30th-action accusation
  boundary, and the evidence-supported Baxter-only acquittal branch.
  Representative invalid prerequisite actions are also checked for state
  preservation.
- On 2026-11-04, Erica raised the successful-action limit from 30 to 50.
  The engine and player runner now use 50 by default, and the boundary
  regression test exercises an accusation as action 50.
- On 2026-11-04, after reviewing the six 1.6.0 agent traces above, the
  successful-action cap was raised from 50 to 100: all six trials ended
  at the old cap, including S3-T1 and S3-T2, which started with the
  Garden chemical and both medicines already discovered. `npm test`
  then passed all 50 deterministic tests and `npm run build` completed
  with game 1.7.0. The six model trials and six paired baselines have
  not yet been rerun under 1.7.0.
- On 2026-11-04, private interview opening text was updated to suggest an
  alibi question, and `ask <person> about the alibi`, `his alibi`, and
  `her alibi` topic variants were covered by deterministic tests. The
  latest `npm test` run passed all 54 tests; no build or live evaluation
  was run for this copy change.
- On 2026-11-04, the default model-call limit was raised from 100 to 200
  at Erica’s request. Engine, standalone runner, checkpoint runner, watch
  defaults, and documentation now use 200; the 100-successful-action
  cap is unchanged. Existing model traces retain their original 100-call
  limit, and no model or baseline evaluation has been rerun at 200. After this
  change, `npm test` passed all 53 deterministic tests and `npm run build`
  completed successfully.
- After implementing review 3.0 findings on 2026-11-04, `npm test` passed
  all 52 deterministic tests and `npm run build` completed successfully.
  This includes engine and saved-trace runner regressions for a provider
  failure while an accusation choice is pending. No model or baseline
  evaluation was launched as part of this verification.
- On 2026-11-04, `npm run evaluate:baseline` completed all six declared
  scenario/seed pairs with game `1.1.0` and `complete_solution`: 25 calls for
  S1, 19 for S2, and 20 for S3 in both repetitions. Current traces use the run
  prefix `2026-11-04T21-48-42-686Z-c2dae245-` and are stored under
  [`traces/evaluation-baseline/`](traces/evaluation-baseline/). Version
  `1.0.0` traces remain preserved as historical records.
- A route-by-route baseline summary is recorded in
  [`BASELINE_TRIAL_SUMMARY.md`](BASELINE_TRIAL_SUMMARY.md).
- The checkpoint runner now replays all setup actions through the engine,
  verifies each of the six scheduled checkpoints, retains bootstrap actions
  against the 100-successful-action cap, and gives the player a separate 200-call
  budget. `npm run evaluate:model` starts a local page without a model call;
  only **Start S1-T1** (or Start for a single-scenario watch) starts a provider
  request. The user must press **Continue suite** after inspecting each
  non-final trial. Model traces persist atomically under
  `traces/evaluation/`, with timestamped, run-prefixed filenames so later
  runs preserve earlier traces; they omit credentials and internal reasoning.
- Two diagnostic OpenAI model attempts for S1-T1/1101 are recorded in
  [`2026-11-04T19-13-15-727Z-11f85b8e-S1-T1-1101.json`](traces/evaluation/2026-11-04T19-13-15-727Z-11f85b8e-S1-T1-1101.json)
  and
  [`2026-11-04T20-07-17-890Z-e995392a-S1-T1-1101.json`](traces/evaluation/2026-11-04T20-07-17-890Z-e995392a-S1-T1-1101.json).
  The first, under prompt v1 without session history, stopped at its last saved
  event after 45 calls (3 valid, 42 invalid) and was still ongoing. The second,
  under the earlier session transcript approach, finished at the 60-call limit
  with 27 valid and 33 invalid calls. Both predate the current prompt/context and game version;
  they are diagnostic, not scored results.
  The traces include usage metadata for recorded requests. No total cost is
  claimed without applying dated official pricing.
- No human playtest has been conducted in this implementation session.

## Observed regression

During development, a direct reproduction showed that the legal public action
`search Dunbar` incorrectly returned her private LoBlo inventory. The
regression test `observed regression: public suspect search must refuse
without revealing inventory` failed with the message revealing LoBlo. The
engine was changed to return a public refusal without inventory, and the same
test now passes. During the source audit, the Mrs. Robner medicine comparison
was offered in the Garden but rejected by the engine. Its legality condition
was added and the regression test now passes. A separate focused check found
submitted-call exhaustion was not terminal after invalid actions; the limit
check now covers that path.

## Limits and next evidence

The model API runner defaults to 200 calls per episode and 60 seconds per call;
the episode itself is capped at 100 successful actions. `MAX_MODEL_CALLS` and
`MODEL_TIMEOUT_MS` change the runner defaults. Provider usage metadata is
stored in traces when returned. Calculate and report estimated cost from the
recorded token usage and dated official pricing for the frozen model. Two
pre-current-configuration OpenAI attempts exist for S1-T1; they are diagnostic
only, not completed scored results. Current `1.1.0` baseline traces are
recorded above; they predate the current `1.7.0` mechanics and are not paired
baseline runs for the latest model trials. Older baseline traces in `traces/`
predate this checkpoint suite and do not count toward its six paired baseline
runs. `review.md` contains independent review 3.0, written against the pre-1.7.0
50-action configuration; its status is “needs changes.” Resolve its open finding
and obtain a fresh read-only review. Peer playtest notes remain outstanding.
