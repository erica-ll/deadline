# Baseline trial behavior

## Current paired baseline: game 1.8.0

Policy ID: `deterministic-baseline-v1`. This is a scripted evidence-first
priority route. It chooses from the same player-visible observation and
history used by the model player; it submits ordinary guessed commands to the
engine's `step()` validator. It does not inspect `legal_actions()`, hidden
state, or evaluator-only data. The successful routes below demonstrate that
the fixed policy can follow its planned sequence. They do not establish that
a human or model independently inferred the clues.

All six trials had zero rejected actions and ended `complete_solution`:

| Trials | Player actions | Route summary | Trace files |
| --- | ---: | --- | --- |
| S1-T1 / S1-T2 | 26 each | Interviewed Baxter and Dunbar, obtained their concert tickets and accounts, followed the Library and Garden evidence, compared the chemical with LoBlo, and closed on the joint accusation. | [S1-T1](traces/evaluation-baseline/2026-11-05T01-57-20-609Z-8810f56a-S1-T1-1101.json), [S1-T2](traces/evaluation-baseline/2026-11-05T01-57-20-609Z-8810f56a-S1-T2-1102.json) |
| S2-T1 / S2-T2 | 20 each | From the completed Library checkpoint, visited the Living Room for the concert interviews and searches, then completed the Kitchen/Garden comparison route and closed on the joint accusation. | [S2-T1](traces/evaluation-baseline/2026-11-05T01-57-20-609Z-8810f56a-S2-T1-2201.json), [S2-T2](traces/evaluation-baseline/2026-11-05T01-57-20-609Z-8810f56a-S2-T2-2202.json) |
| S3-T1 / S3-T2 | 12 each | From the interviews and Garden checkpoint, visited the Library for the Focus papers and notepad, compared the chemical with LoBlo, then closed on the joint accusation. | [S3-T1](traces/evaluation-baseline/2026-11-05T01-57-20-609Z-8810f56a-S3-T1-3301.json), [S3-T2](traces/evaluation-baseline/2026-11-05T01-57-20-609Z-8810f56a-S3-T2-3302.json) |

The 17 S2 setup actions and 24 S3 setup actions are stored separately as
bootstrap history and count toward the shared 75-action game limit. Baseline
player-action counts above exclude those checkpoint actions. The baseline
trace run ID is `2026-11-05T01-57-20-609Z-8810f56a`.

## Historical baseline traces

The previous six-trial baseline batches for game versions 1.0.0 and 1.1.0
remain in `traces/evaluation-baseline/`. They are preserved as historical
records and are not paired with the 1.8.0 model results. Earlier summaries
from those runs should not be interpreted as current-version results.
