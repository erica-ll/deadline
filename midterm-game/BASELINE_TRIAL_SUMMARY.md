# Baseline trial behavior

All six `robner-checkpoints-v2` baseline trials reached `complete_solution`.
There were no invalid actions and no dead ends. Both seeds for each scenario
followed the same route.

| Trials | Calls | Observed route and conclusion | Trace files |
| --- | ---: | --- | --- |
| S1-T1 / S1-T2 | 25 each | Privately questioned Baxter and Dunbar about the concert, searched Dunbar and found LoBlo, followed the Library clues to the shaded notepad and Focus papers, counted the Kitchen china, found and analyzed the Garden fragment, and compared its chemical with LoBlo. Then accused Baxter and Dunbar and closed the case. | [S1-T1](traces/evaluation-baseline/2026-11-04T21-48-42-686Z-c2dae245-S1-T1-1101.json), [S1-T2](traces/evaluation-baseline/2026-11-04T21-48-42-686Z-c2dae245-S1-T2-1102.json) |
| S2-T1 / S2-T2 | 19 each | From the completed Library checkpoint, went to the Living Room for the Baxter and Dunbar interviews and Dunbar's LoBlo; then checked the Kitchen count and Garden fragment, compared the chemical with LoBlo, and closed on the joint accusation. | [S2-T1](traces/evaluation-baseline/2026-11-04T21-48-42-686Z-c2dae245-S2-T1-2201.json), [S2-T2](traces/evaluation-baseline/2026-11-04T21-48-42-686Z-c2dae245-S2-T2-2202.json) |
| S3-T1 / S3-T2 | 20 each | From the Garden checkpoint, went to the Living Room for the Baxter and Dunbar concert accounts and Dunbar's LoBlo; visited the Library for the notepad and Focus papers; returned to the Garden to compare the chemical with LoBlo; then closed on the joint accusation. | [S3-T1](traces/evaluation-baseline/2026-11-04T21-48-42-686Z-c2dae245-S3-T1-3301.json), [S3-T2](traces/evaluation-baseline/2026-11-04T21-48-42-686Z-c2dae245-S3-T2-3302.json) |

These are deterministic baseline runs on game version 1.1.0, not model-player
runs or human playtest observations. The baseline chooses from player
observations and history, and each attempted action is validated by the engine.
