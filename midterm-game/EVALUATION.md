# Evaluation record

## Frozen setup

The scored suite is `robner-checkpoints-v2`, with six paired trials and game
version `1.8.0`. The model configuration was frozen before the missing trial:
OpenAI `gpt-6-luna`; config ID `robner-checkpoints-v2-config-1`; prompt ID
`robner-action-heads-v6-rejection-history`; context protocol
`engine-observation-history-v3`; 75 successful actions; 100 model calls; and a
60-second request timeout. The npm package version (`1.0.0`) is separate from
the game version. The five earlier 1.8.0 model traces were checked against the
current engine and match this suite, configuration, prompt, context protocol,
and limits. They share run ID `2026-11-05T01-19-28-818Z-270e1159`. The missing
S3-T2/3302 trial was then run with the same settings and saved under its own
run ID. No rules, prompt, model configuration, or limits changed between
scored model trials.

The schedule is S1-T1/1101, S2-T1/2201, S3-T1/3301, S1-T2/1102,
S2-T2/2202, and S3-T2/3302. S1 starts fresh. S2 starts after the 17-action
Library investigation. S3 starts after the 24-action interview and
Kitchen/Garden investigation; it contains both concert ticket stubs and
accounts, the murder timeline, the Garden chemical, and both medicines.
Bootstrap actions are replayed through the engine, shown in observation
history, and count against the 75-action episode limit. They do not count as
model calls. Full checkpoint definitions and expected absent evidence are in
[`CHECKPOINT_IMPLEMENTATION_PROMPT.md`](CHECKPOINT_IMPLEMENTATION_PROMPT.md).

Both players use player-visible observations and submit guesses through the
same engine validator. Neither gets `legal_actions()`, hidden state, future
paths, or evaluator data. The baseline is a deterministic evidence-first
priority policy, so its successful route is scripted; its completions are a
comparison point, not evidence that a person or model independently inferred
the clues.

## Current results: game 1.8.0

| Trial | Seed / checkpoint | Model trace and result | Model calls (accepted / rejected) | Mean latency; input / output tokens | Baseline trace and result |
| --- | --- | --- | ---: | --- | --- |
| S1-T1 | 1101 / S1 fresh | [Trace](traces/evaluation/2026-11-05T01-19-28-818Z-270e1159-S1-T1-1101.json) — `model_call_limit` | 100 (65 / 35) | 2,529 ms; 327,314 / 11,885 | [Trace](traces/evaluation-baseline/2026-11-05T01-57-20-609Z-8810f56a-S1-T1-1101.json) — `complete_solution`, 26/26 accepted |
| S2-T1 | 2201 / S2 Library | [Trace](traces/evaluation/2026-11-05T01-19-28-818Z-270e1159-S2-T1-2201.json) — `incomplete_dunbar_case` | 91 (55 / 36) | 2,807 ms; 352,795 / 14,943 | [Trace](traces/evaluation-baseline/2026-11-05T01-57-20-609Z-8810f56a-S2-T1-2201.json) — `complete_solution`, 20/20 accepted |
| S3-T1 | 3301 / S3 interviews + Garden | [Trace](traces/evaluation/2026-11-05T01-19-28-818Z-270e1159-S3-T1-3301.json) — `episode_limit` | 84 (51 / 33) | 3,256 ms; 325,098 / 15,895 | [Trace](traces/evaluation-baseline/2026-11-05T01-57-20-609Z-8810f56a-S3-T1-3301.json) — `complete_solution`, 12/12 accepted |
| S1-T2 | 1102 / S1 fresh | [Trace](traces/evaluation/2026-11-05T01-19-28-818Z-270e1159-S1-T2-1102.json) — `model_call_limit` | 100 (61 / 39) | 2,386 ms; 326,402 / 11,140 | [Trace](traces/evaluation-baseline/2026-11-05T01-57-20-609Z-8810f56a-S1-T2-1102.json) — `complete_solution`, 26/26 accepted |
| S2-T2 | 2202 / S2 Library | [Trace](traces/evaluation/2026-11-05T01-19-28-818Z-270e1159-S2-T2-2202.json) — `episode_limit` | 89 (58 / 31) | 3,456 ms; 338,701 / 18,191 | [Trace](traces/evaluation-baseline/2026-11-05T01-57-20-609Z-8810f56a-S2-T2-2202.json) — `complete_solution`, 20/20 accepted |
| S3-T2 | 3302 / S3 interviews + Garden | [Trace](traces/evaluation/2026-11-05T02-10-25-808Z-ac5d2d84-S3-T2-3302.json) — `episode_limit`; accused Dunbar, then continued investigating | 76 (51 / 25) | 3,646 ms; 282,496 / 17,970 | [Trace](traces/evaluation-baseline/2026-11-05T01-57-20-609Z-8810f56a-S3-T2-3302.json) — `complete_solution`, 12/12 accepted |

All six current model traces have terminal outcomes and the full schedule is
recorded. The model did not solve any trial: two ended at the 100-call limit,
two at the 75-successful-action limit, one closed an incomplete Dunbar case,
and one S3 trial reached the action limit after an accusation and continued
investigating. The baseline solved all six with no rejected actions. Its route
is the fixed evidence-first policy in `players/baseline.js`, not an independent
clue-inference result. The baseline policy uses observations/history and the
engine’s `step()` validator; it does not call `legal_actions()` or read hidden
state.

The model traces recorded usage for every request. The S3-T2 result includes
76 latency and usage records. The evaluation report is generated from the
current-version trace set by `npm run report:evaluation`; older versions are
filtered out. A dated official pricing snapshot is
[`evaluation-pricing-2026-11-05.json`](evaluation-pricing-2026-11-05.json).
OpenAI's published `gpt-6-luna` rates are $0.10/1M uncached input,
$0.01/1M cached input, $0.50/1M output, and $0.125/1M or $0.25/1M for
30-minute or 12-hour cache writes ([official pricing](https://developers.openai.com/api/docs/pricing),
[model page](https://developers.openai.com/api/docs/models/gpt-6-luna)). The
traces record cache-write token counts but not the TTL split, so the report
estimates a range using those official low/high write rates. It does not infer
the missing TTL. The report also identifies any model calls without a saved
usage record. Pricing is an estimate from returned token counts, not a provider
invoice.

## Historical / diagnostic runs (not part of current comparison)

- The six-trial model run with run ID
  `2026-11-04T23-47-12-233Z-bbe1da82` used game `1.6.0`, a 50-action cap,
  and an earlier setup that still included alibi bootstrap queries. These
  traces are retained under `traces/evaluation/` and are not pooled with the
  1.8.0 results.
- Earlier 1.0.0 and 1.1.0 baseline runs remain under
  `traces/evaluation-baseline/`; they are not the current paired baselines.
- Two early single-trial model diagnostics under older prompt/context/game
  settings are also retained. They are not scored suite trials.
- No human playtest observation is claimed here.

## Reproduction and limits

Run `npm test` and `npm run build` for deterministic verification. Run
`npm run evaluate:baseline` to produce a new uniquely named six-trace baseline
batch. For model evaluation, `npm run evaluate:model` opens the watch page;
the user starts trials explicitly. The missing S3-T2 trial in this record was
run once through `TrialRunner` with the frozen settings; no retry or
substitution was made. Raw traces are append-only records and should not be
edited after creation.

The deterministic policy’s route is scripted and can converge rapidly; it is
not an independent player. Model results are one stochastic run per scheduled
seed, with invalid guesses preserved and counted against the call budget.
These results do not establish how human players perform. The game version is
part of every trace; results from other versions are historical only.
