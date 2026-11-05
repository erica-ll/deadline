# Independent review findings

**Current review date:** 2026-11-04  
**Current review version:** 4.0  
**Current overall result:** pass

## Review 4.0 summary

I reviewed the current game engine, deterministic tests, checkpoint setup, and model runner against the current project instructions and action dictionary. The query/action limit increase to 100 and expanded suspect-name recognition were specified by the project documents and the user as intended changes; I did not treat them as mismatches. I found no material state-transition or conditional-outcome defect in this pass. The findings from versions 2.0 and 3.0 remain below as historical records; the fixes described in the later implementation response are present in the current code.

I ran `npm test`: all 52 tests passed. I did not invoke a model API or read `.env`. The review did not execute every possible accusation permutation or every invalid command; where noted, I verified order independence and prerequisite enforcement by tracing shared implementation logic and representative tests.

## Branch and boundary table

| Starting conditions and key choices | Expected state changes and ending | Verification |
|---|---|---|
| Fresh game; accuse George or Mrs. Robner; close | Accusation is recorded; `false_accusation_suicide` terminal | Executed in `single-suspect accusations reach their distinct case paths` |
| Accuse Dunbar; close | `incomplete_dunbar_case` terminal with the newspaper epilogue | Executed in `Dunbar closure has exactly its two choices and reaches its epilogue` |
| Accuse Dunbar; continue | Choice clears, investigation resumes, accusation remains recorded | Executed in `continue investigating preserves earlier accusations for the eventual case report` and Dunbar choice test |
| Accuse Baxter alone; close with insufficient evidence | `baxter_only`; DA declines to pursue charge | Executed in the single-suspect outcome test |
| Accuse Baxter alone; close with motive and method evidence | `baxter_only`; jury acquits | Executed in `Baxter-only closure with motive and method evidence reaches the acquittal branch` |
| Accuse George and Mrs. Robner without either culprit; close | `false_accusation_suicide` | Static tracing of the innocent-only membership predicate; the two individual outcomes are executed, but the combined accusation is not separately executed |
| Accuse Baxter and Dunbar; close without required evidence | `weak_case` | Executed in `closing a weak joint accusation produces an unproved-case outcome` |
| Accuse Baxter and Dunbar; close with all required evidence | `complete_solution` | Executed in the baseline completion and `complete evidence can still convict the true pair after an extra accusation is dropped` |
| Accuse both culprits with one or both innocent extras; close | `overinclusive_accusation`; extra charges are dropped; evidence controls conviction | One-extra weak and complete variants are executed; two-extra wording/variant is static only |
| Accuse, continue, then accumulate more accusations | Accusations persist in canonical `SUSPECTS` order; closing resolves the final set | Representative accumulation is executed; general order equivalence is statically verified from fixed-order union and membership-based resolver, not all permutations |
| 100th successful action is an accusation | `episode_limit` terminal takes precedence; no choices remain | Executed by `the 100th successful action accusation ends before exposing a choice` |
| Accusation is the final submitted call | `model_call_limit` terminal; no pending choices | Executed by `a final-call accusation ends instead of leaving an unusable choice` |
| Model runner fails while an accusation choice is pending | Runner failure becomes terminal while preserving the accusation | Engine and watch-runner regression tests execute this path |
| Any action after terminal outcome | Rejected; terminal outcome remains in force | Covered by terminal-state tests and `step` guard at `src/engine.js:237` |

## Dependency and conditional-transition checks

| Rule or action; design precondition | Implementation enforcement and state/visible response | Downstream dependency | Verification |
|---|---|---|---|
| Room travel: move to a different named room, not during private interview. | `_isLegal` checks room membership, current room, and interview state (`src/engine.js:313`); `_apply` changes room and issues the arrival response (`390–395`). | Library, Kitchen, and Garden actions become available by location; second actual Living Room entry delivers the letter. | Representative room movement and letter timing are executed; unsupported-room negative case is tested. |
| Letter: inspect/read only after delivery; reading adds evidence and removes its pending notice. | `_isLegal` gates on `letterDelivered` or already found evidence (`317`, `334`); `_apply` records letter evidence, clue, and clears notice (`444–445`). | Letter can be shown to Mrs. Robner; her Steven response depends on shown flag. | Letter delivery, inspect/read boundary, pending notice, and downstream response are tested. |
| Private interview and return: only an available suspect in the Living Room can be interviewed; only the active interviewee can be returned. | `_isLegal` checks room and active interview (`327–339`); `_apply` sets/clears `interviewee` without incrementing room entries (`397–403`). | Unlocks private question/search/show and interviewee accusation; return restores group state. | Alias and interview behavior are tested; current test asserts interview return does not deliver the letter. |
| Suspect search: public searches refuse without revealing inventory; private search only applies to current interviewee. | `_isLegal` allows only the private interview target; public refusal path is handled by `_apply` (`449–455`). Dunbar search finds LoBlo; Mrs. Robner search finds Allergone. | LoBlo supports poisoning comparison and conviction conditions; Allergone enables the optional negative comparison. | Public no-leak regression, private searches, and medicine-first comparison order are tested. |
| Questions: allowed topic and suspect in Living Room or active private interview; private concert/alibi evidence requires both private accounts. | `_isLegal` checks `TOPICS` and scene; `_answer` records private asked flags and sets `concert_contradiction` after both accounts (`331–339`, `520–526`). | Contradiction is required for complete joint accusation. | Private concert/alibi route and response mismatch are tested; all order permutations of the two interviews are statically equivalent because the clue check runs after each accepted private question. |
| Search holes finds fragment; clean requires fragment; analyze requires found and cleaned fragment. | Garden location and found/cleaned prerequisites in `_isLegal` (`356–360`); `_apply` records fragment, cleaned clue, then new chemical (`438–442`). | New chemical can be compared against LoBlo or Allergone. | Premature fragment and representative missing prerequisites are tested; full analysis path is exercised. |
| Medicine comparison requires new chemical and corresponding medicine found; either discovery order is valid. | `_isLegal` tests both evidence flags; comparison with LoBlo sets `poison_confirmed`, while Allergone returns a negative result (`315–316`, `442–443`). | Poison confirmation and LoBlo support strong joint/Baxter-only outcomes. | Both ingredient orders and Allergone comparison are tested. |
| Safe: inspect bookcase before searching it; search reveals safe; open safe only when found. Read documents only after opening. | Clue/state gates at `_isLegal` (`349–352`); `_apply` separates document discovery from document contents (`427–431`). | Reading Focus sets `focus_papers_read`; reading will reveals inheritance motive. Merely opening safe does not satisfy the strong-case condition. | Safe precondition and content boundary are tested, including invalid open and missing Focus-read outcome. |
| Evidence inspection: only found evidence; repeat inspection from any room. | `_isLegal` recognizes found items (`317–319`); `_apply` gives an item-specific description (`405–417`). | Gives players a way to revisit visible evidence without changing underlying clues. | Test inspects every discovered evidence item. |
| Show evidence: listed evidence/person pair, evidence found, target present. | `_showPairs`, `_isLegal`, and `_confront` enforce pairing/presence, record shown flag, and return the contextual response (`303–305`, `327–340`, `457`, `459+`). | Shown letter and Focus papers affect later dialogue; confrontation alone does not prove guilt. | Representative Focus and letter paths plus accepted name forms are tested; remaining pair combinations are statically checked. |
| Accuse: target present; joint accusation only in Living Room and in supported combinations; no evidence prerequisite. | `_isLegal` validates the accusation set and context (`320–325`); `_apply` unions names into fixed suspect order and opens the choice (`460–471`). | Close resolves accumulated accusations; continue preserves them. | Single, joint, overbroad, present/absent, private interview, continuation, and limit paths have representative tests. |
| Strong joint ending: both culprits accused and all five required evidence flags/items. | `_closeCase` requires poison confirmation, LoBlo, concert contradiction, Focus read, and notepad read (`505–514`). | `complete_solution`; otherwise `weak_case`, with missing-Focus/missing-note/generic response selection. | Complete and representative weak/missing-Focus routes execute; every individual missing-flag combination is not separately tested. |
| Action and call limits: successful actions capped at 100; every submitted call counts; action cap has precedence when both coincide. | `step` increments submitted calls, increments successful actions only for legal actions, and checks terminal limits (`235–260`). | Stops investigation and suppresses accusation choices at limits. | Tests cover invalid calls, exact 100th-action accusation, and final-call accusation. |
| Terminal behavior: closed outcomes cannot accept further actions; runner failures must resolve a pending choice. | Engine terminal guard and `end_episode` replacement behavior (`230–237`); runner catches errors and persists terminal snapshot. | Prevents stuck choice after a model/API error and preserves final trace. | Engine and runner regressions execute pending-choice failure and terminal persistence. |

## Findings

No material game-state, conditional-transition, or intended-design mismatch was identified in this review. The following coverage limits are not observed defects:

- Every multi-accusation permutation was not executed. `normalizeAction` canonicalizes joint names and `_apply` stores the union in fixed `SUSPECTS` order; `_closeCase` resolves by membership/count and evidence predicates. This supports order independence away from episode limits. Tests exercise representative accumulation, not all permutations.
- The two-innocent joint accusation and both innocent extras in an overinclusive accusation were not separately executed. Their conditions and message construction were statically traced; single-innocent and one-extra paths execute.
- Not every possible missing evidence flag, invalid target, or invalid room/action combination has a dedicated test. Shared `_isLegal` gates and representative negative cases were inspected; the full Cartesian invalid-action matrix remains unexecuted.
- No live provider or API path was exercised in this review. The deterministic suite covers runner behavior with injected action providers, not network service availability.

## Writing-style flag

The writing is generally clear and fits a detective case record. The laboratory comparison is concise enough to follow but remains technical/report-like. Dunbar’s epilogue has a final explanatory sentence that reads as case-summary exposition rather than a dramatized scene; it is understandable and consistent with the approved outcome. I found no passage too ornate or too simple to understand.

## Checks performed

- `npm test` — **52 passed, 0 failed** on 2026-11-04.
- Static inspection of current `src/engine.js`, `players/checkpoints.js`, `players/trial-runner.js`, `players/model-player.js`, `players/run.js`, `players/watch-server.js`, `tests/engine.test.js`, and `tests/checkpoints.test.js`.
- Did not invoke a model API, read `.env`, modify game code, or modify tests.

---

**Current review date:** 2026-11-04  
**Current review version:** 3.0  
**Current overall result:** needs changes

## Review 3.0 summary

I rechecked the current engine and tests against the current project guidance, story plan, and action dictionary. At this review snapshot, the successful-action cap was 50 (it was later raised to 100). The three issues recorded in review 2.0 are fixed in the current implementation: interview return does not count as Living Room re-entry, opening the safe identifies the documents without stating their conclusions, and an accusation on the final call ends the episode instead of leaving a choice. I found one additional runner failure path: a model error or timeout while the game awaits a close/continue choice leaves the engine in a nonterminal choice even though the runner exits.

There is also a defensive `unsupported_accusation` ending branch that is unreachable through valid player actions: closure is only enabled after an accusation, valid accusations always name at least one suspect, and `_closeCase` partitions every nonempty set of the four suspects into another outcome. It has no effect on play, but it is dead terminal code. The current medical-comparison prose remains dense and more report-like than detective-story narration; it is understandable and follows the specified lab result.

### Finding 1: runner errors do not terminate a pending accusation choice

**File/line:** [`src/engine.js`](src/engine.js#L142) lines 142–144; [`players/run.js`](players/run.js#L38) lines 38–43 and 55–56.  
**Affected path:** A model timeout/API error occurs while the engine is awaiting `close the case` or `continue investigating`.

**Expected:** `end_episode(reason, message)` should end an episode when the runner stops for an error, including when the engine currently has a pending accusation choice. The runner catches the error and breaks its loop, then serializes `game.outcome()`.

**Actual:** `end_episode` only calls `_finish` when `!this.state.terminal`. A pending choice is stored in `state.terminal` with `choice: true`, so the call is ignored. The runner exits after its catch, but the saved trace outcome remains `status: "choice"`, `reason: "accusation_pending"`, with live choices. No terminal reason or error message reaches the outcome.

**Reproduction:** Fresh game → `accuse Dunbar` → `end_episode("timeout_limit", "timeout")`. Direct execution returns `status: "choice"` with two choices and reason `accusation_pending`.

**Coverage note:** The 38-test suite covers pending-choice resolution, terminal rejection, call limit, and provider response parsing, but not `end_episode` while a choice is pending. This path matters because `players/run.js` invokes `end_episode` on model timeout and API error.

### Current branch and boundary verification

| Branch or boundary | Current result | Verification |
|---|---|---|
| Dunbar-only accusation: close | `incomplete_dunbar_case` and newspaper epilogue | Executed by deterministic test |
| Dunbar-only accusation: continue | Keeps accusation/evidence; investigation resumes | Executed by deterministic test |
| Baxter-only, insufficient motive/method | `baxter_only`, DA declines | Executed by deterministic test |
| Baxter-only with motive and method | `baxter_only`, jury acquits | Executed by deterministic test added since v2 |
| George and/or Mrs. Robner only | Suicide finding | Each single-suspect case executed; joint case statically traced |
| Joint Baxter and Dunbar, incomplete evidence | `weak_case` | Executed, including missing Focus papers |
| Joint Baxter and Dunbar, full required evidence | `complete_solution` | Executed by direct branch test and baseline |
| Both culprits plus innocent extra(s) | `overinclusive_accusation`, extra charge dropped; evidence controls verdict | One extra executed with weak and full evidence; two extras static only |
| Accusation is action 50 | `episode_limit`, no close/continue choice | Executed by deterministic boundary test |
| Action and call limits reached together | `episode_limit` takes precedence | Executed by deterministic test |
| Accusation is final submitted call | `model_call_limit`, terminal, no choices | Executed by deterministic regression test |
| Model API error/timeout while an accusation choice is pending | Expected terminal error outcome; actual outcome remains a live choice after runner exits | Directly reproduced; finding 1 |
| Accusation order | Same canonical name set and same ending away from limits | Code proof plus representative opposite orders and accumulation tests; not every permutation executed |

### Current dependency audit deltas and remaining static checks

The full dependency matrix and rule map under review 2.0 remain useful as the broader action inventory. The following changed or newly covered transitions were rechecked in the current code:

| Rule / exact precondition | Current enforcement and resulting state | Downstream effect | Evidence |
|---|---|---|---|
| Interview return only ends the active interview; it does not count as room entry. | `src/engine.js` 303–305 clears `interviewee`; no room-entry or letter state is touched. | Letter still requires leaving and re-entering the Living Room; notice persists until read. | Executed: tests 81 and 109; regression checks return-before-leave, valid later arrival, and persistent notice. |
| Open safe only after finding it; opening exposes documents, not their contents. | `_isLegal` 254 gates on `safeFound`; `_apply` 318 sets `safeOpen` and found document entries, with neutral response. | Read Focus papers sets `focus_papers_read`, used in joint/Baxter outcomes; reading will gives George motive. | Executed: tests 141–156 check neutral response, evidence availability, and content learned on read; invalid open prerequisite in test 158. |
| Accusation on action 50 ends immediately; if both limits coincide, action cap takes priority. | `step` 165–168 checks successful-action limit before submitted-call limit, including a pending choice. | Terminal `episode_limit`; no choices and no later actions. | Executed: tests 631–646. |
| Accusation on the final submitted call ends immediately. | The post-action call-cap check applies to a pending accusation choice; `_finish` replaces it with terminal outcome. | Terminal `model_call_limit`; no unresolved choice. | Executed: tests 648–657. |
| Baxter-only closure with motive and method evidence; Baxter named, Dunbar absent. | `_closeCase` checks Focus papers + notepad for motive and poison confirmation + LoBlo for method. | Acquittal branch rather than DA-declines branch. | Executed: test 492; insufficient-evidence branch remains covered by test 419. |
| Invalid action with missing prerequisites/context. | `_isLegal` rejects; `step` does not increment successful-action count or mutate observable investigation state. | No clue/evidence or location transition occurs. | Executed representative negative table in tests 158–180; not every rule/action pair was tested. |

### Remaining unexecuted combinations

- Joint accusation against both innocent suspects is statically covered by the `accused.every(...)` outcome predicate; the two single-suspect variants are executed.
- Overbroad accusation naming both innocent extras has no direct execution. One-extra examples demonstrate the same membership-based path; the message pluralization and extra list for two extras are static only.
- The complete joint-case predicate is executed as a whole, but each individual missing clue-group combination is not. The required predicate is `poison_confirmed && found.LoBlo && concert_contradiction && focus_papers_read && notepad_read` at `src/engine.js` 371 and 395.
- Opposite individual accusation orders are representative checks, not exhaustive permutations. `normalizeAction` and accusation accumulation canonicalize names into `SUSPECTS` order, while `_closeCase` depends on membership/count; absent a step-limit boundary, order does not alter closure category. Batching or ordering can affect which successful action reaches 50, and that boundary is separately tested.
- Not every action’s wrong-room or missing-evidence case has its own test. The matrix in review 2.0 lists those static guards; the new test exercises representative cases and confirms visible game state remains unchanged.
- Model error or timeout during a pending accusation choice has no test and fails the terminal-state requirement; add an engine regression for `end_episode` in choice state and a runner-level assertion that the emitted trace is terminal.

### Low-severity unreachable branch

`src/engine.js` 404–405 retains the fallback `unsupported_accusation`. It cannot be reached via the public action contract: `close the case` is legal only while an accusation choice is pending, and all valid single or joint accusations add at least one of the four known suspects. The resolver handles innocent-only, Dunbar-only, Baxter-only, and Baxter-plus-Dunbar sets, with the overinclusive branch handling extras. This is dead fallback logic rather than a player-facing failure; no test is needed to demonstrate reachability beyond that static partition.

### Writing-style flag

The safe-opening prose issue is fixed. The lab comparison at `src/engine.js` 331 remains a dense, technical paragraph, but it is understandable and matches the specified report. The suspect responses are concise; none in this recheck was too artistic to understand. Overall, the writing works as clear evidence reporting, with the lab passage the least detective-like chunk.

### Current checks

- `npm test`: 38 passed, 0 failed on 2026-11-04.
- No code or tests were modified as part of this review.
- I did not run `npm run build` in this pass; the prior implementation response records a successful build after the fixes.

---

## Historical review 2.0 findings (2026-11-03)

This is a read-only review of the implementation under `deadline/midterm-game`. I treated `deadline/AGENTS.md`, `deadline/MIDTERM_STORY_RECONSTRUCTION_PLAN.md`, and `deadline/ACTION_DICTIONARY_AND_RULES.md` as the intended design. I used `SOURCE_FLOW_AUDIT.md` as the implementer's state-transition summary, then checked its claims against the code and tests. No game code or tests were changed.

## Findings ordered by severity

### 1. Private interview return can deliver the letter without leaving the Living Room

**File/line:** [`src/engine.js`](src/engine.js#L303), especially lines 305–307.
**Affected path:** Any private interview before the detective leaves the Living Room.

**Expected:** The letter arrives only after the detective leaves the group and later re-enters the Living Room. Starting presence is entry one. A private interview is a special scene and returning the interviewee to the group is not a room departure and re-entry. See `MIDTERM_STORY_RECONSTRUCTION_PLAN.md` lines 58–60 and `ACTION_DICTIONARY_AND_RULES.md` lines 22–26, 31–34.

**Actual:** `return <person>` increments `roomEntries`; the initial interview return therefore delivers the letter. This exposes the letter early and makes the stated “second Living Room entry” depend on interviewing rather than room movement.

**Reproduction:** Fresh game → `interview privately Baxter` → `return Baxter`. The resulting observation has `letterDelivered: true` and a pending arrival notice, although the detective did not leave the room.

**Coverage note:** `the letter is readable only after the second Living Room entry` tests actual room movement. Test `a letter notice persists alongside a private-interview return response...` at `tests/engine.test.js` lines 109–127 instead asserts that interview return produces a letter notice; it currently codifies the unintended transition.

### 2. Opening the safe gives away document conclusions before either document is read

**File/line:** [`src/engine.js`](src/engine.js#L321).
**Affected path:** Library safe and motive/red-herring evidence.

**Expected:** `open safe` makes the two documents available to read. `read Focus papers` gives Baxter’s embezzlement and cover-up facts; `read new will` establishes George’s inheritance motive. The design explicitly requires reading Focus papers to satisfy the motive evidence condition (`MIDTERM_STORY_RECONSTRUCTION_PLAN.md` lines 150–154; action dictionary lines 76–78).

**Actual:** The `open safe` response itself says the papers are about Baxter’s Focus involvement and that the will leaves George nothing and the estate to his wife. The player learns those conclusions without either read action. The strong-case flag still requires reading Focus papers, so the player-visible knowledge and evidence state diverge.

**Reproduction:** `go to library` → `inspect bookcase` → `search bookcase` → `open safe`.

**Coverage note:** `bookcase and safe can be discovered without shading the notepad` checks discovery and found evidence, but does not check the opening response for premature conclusions. This mismatch was verified by static inspection; the existing execution path is also in the suite.

### 3. A last-call accusation leaves a choice that cannot be resolved

**File/line:** [`src/engine.js`](src/engine.js#L165), with the submitted-call check at lines 167–169.
**Affected path:** Any accusation made on the final allowed model call.

**Expected:** At the configured call limit, the episode ends; otherwise an accusation choice is usable only if a call remains. The project instructions set a per-episode model-call limit, and the action dictionary defines precedence for the 30-successful-action limit.

**Actual:** The post-action model-call check is gated on `!this.state.terminal`. An accusation creates a `choice` terminal, so the engine remains in that choice after the limit is reached. The next attempt to choose close/continue is rejected as over-limit and then ends the episode, making the choice unusable.

**Reproduction:** `new DeadlineGame({maxCalls: 1})` → `accuse Dunbar`. At submitted call 1, outcome is still `status: "choice"` with both choices exposed.

**Coverage note:** The existing limit test uses two invalid calls and does not cover a terminal choice on the final allowed call. Reproduced directly against the engine.

## Branch outcome table

| Starting condition and key choices | Expected state change and ending | Verification |
|---|---|---|
| Accuse Dunbar; close immediately | Preserve Dunbar accusation; `incomplete_dunbar_case` with newspaper epilogue | Executed: test 512; code traced |
| Accuse Dunbar; continue; investigate or accuse again | Preserve Dunbar and all evidence; resume investigation; eventual closure uses the accumulated set | Executed: tests 419 and 512; code traced |
| Accuse Baxter only; close with weak evidence | `baxter_only`; DA declines | Executed: test 419 |
| Accuse Baxter only; close with motive and method | `baxter_only`; jury acquits | Static only; no test for this conditional subcase |
| Accuse George and/or Mrs. Robner only; close | `false_accusation_suicide` | Executed individually in test 419; pair case statically traced |
| Accuse Baxter and Dunbar; close without all five required clue groups | `weak_case` | Executed: tests 439 and 496 |
| Accuse Baxter and Dunbar; close after all required clues | `complete_solution` | Executed: tests 340 and 390 |
| Accuse both culprits plus one or both innocent suspects; close | `overinclusive_accusation`; extras dropped; evidence decides conviction versus unproved | One extra tested with weak and complete evidence in tests 458 and 469; two extras static only |
| Any accusation as successful action 30 | Immediate terminal `episode_limit`; no close/continue choice | Directly executed in this review; no exact boundary test |
| Accusation on final submitted call | Expected call-limit termination; actual pending choice cannot be resolved | Directly reproduced; defect 3 |

The case category is selected from the accumulated accusation set, and the code canonicalizes that set, so representative different orders produce the same outcome away from limits. The 30-action and model-call limits are separate boundary transitions and can supersede the ordinary accusation flow.

## Dependency and transition audit

The matrix groups actions that share one precondition and transition. “Executed” refers to a deterministic test or a targeted direct engine execution; “static” means checked from implementation logic and the listed test coverage, not every route executed. A rule marked mixed has some tested representatives and some code-only variants.

| Rule/action and exact design precondition | Enforcement and state change / player-visible result | Downstream dependency or outcome | Test/check status |
|---|---|---|---|
| Start/reset; no precondition. Begin in Living Room, entry count 1, no letter, no evidence or accusation. | `engine.js` 74–83 initializes these fields; `observe` exposes location and action words. | Sets initial room for public questions, interviews, accusations, and later letter entry counting. | Executed: `reset, observations, and legal actions preserve role boundaries` (test 7). |
| Move to a different one of four rooms; current room must differ; no movement during interview. | `_isLegal` 220 and `_apply` 292–297. Updates room; entering Living Room increments count and on count ≥2 delivers letter and queues notice. | Makes room-local actions available; room return can deliver letter. Interview-return version is defect 1. | Executed: legal movement/invalid state test (36); letter by room return (81). Interview boundary directly executed for finding 1. |
| Inspect/read letter; Living Room and letter delivered; read clears notice and records evidence. | `_isLegal` 238; `_apply` 336–337. `inspect` gives envelope/postmark; `read` adds `letter`, sets `letter_read`, clears pending notice. | `show letter` to Mrs. Robner; reading content gives relationship and red-herring context. | Executed for room-delivered letter, inspection, reading, notice clear, and no affair confession: test 81. Premature interview delivery separately reproduced. |
| Inspect exposed objects; correct room. Most checks only set clue or found flags; body/desk/notepad/bookcase/holes/china observations have separate results. | Candidate lists and room gates in `_candidates` 199–205, `_isLegal` 247–264; results in `_apply` 310–333. | Notepad inspection enables shade; bookcase inspection enables search; fragment must be found before inspection; china observation supports pattern comparison; holes/ladder are optional inference clues. | Mixed: Library descriptions and shading prerequisite in test 142; room descriptions/ladder in 156 and 167; clue wording in 298. Exact valid room gates and repeated inspections mostly static. |
| `shade notepad`; Library and prior `inspect notepad`. | `_isLegal` 252; `_apply` 318 sets `notepad_read` and Baxter motive, reports impressions naming Baxter/Focus. | Required for strong joint case; contributes motive for Baxter-only evidence condition. | Executed, including invalid before inspect only indirectly via legal list after inspect: test 142 checks availability then success; missing-prerequisite rejection is static. Strong outcome exercised by baseline. |
| `search bookcase`; Library and prior disturbed-section observation. `open safe`; Library and safe found. | `_isLegal` 253–254; `_apply` 319–322. Sets `safeFound`, then `safeOpen` and found docs. Opening response leaks document conclusions (finding 2). | Read actions need `safeOpen`; read Focus sets `focus_papers_read`; read will adds George motive evidence. | Executed discovery and open without notepad: test 287. `open safe` before search invalid is covered in test 235’s early read invalid, but not a direct early-open assertion in the displayed suite; gate is otherwise statically verified. Premature disclosure found by static and action reproduction. |
| Read Focus papers/new will; Library, safe open. `read papers` is the supported alias. | `_isLegal` 255; `_apply` 322–323. Reading Focus sets found evidence, `baxter_motive`, and `focus_papers_read`; will sets found `new will`. | Focus-read flag is required for complete joint evidence and contributes to Baxter-only motive branch; new will is red-herring context and confrontation pairing. | Executed: alias/evidence content at test 235; Focus topic/confrontation paths at 255 and 270; no direct test of read-new-will prerequisite/result. |
| Analyze teacup/saucer; Library and corresponding found item. | `_isLegal` 256; `_apply` 324 adds evidence and fingerprint result. | Optional corroboration only; neither item enters strong-case predicate. | Static only for prerequisite and both results; no located direct tests for these two lab actions. |
| Kitchen china inspection/search/count; Kitchen. | `_isLegal` 259; `_apply` 325–327 sets examined/counted flags and reports pattern/count. | Pattern comparison with cleaned fragment requires `china_examined`; count is optional, not a conviction prerequisite. | Executed description/count and no inference language in test 298; room/action in test 156. Exact repeated-action behavior is static. |
| Search Garden holes; Garden. It always finds the fragment in this bounded implementation. | `_isLegal` 260–264; `_apply` 330 sets found `porcelain fragment`, returns fragment/cut response. | Enables inspect/clean; fragment analysis and later comparison derive poison method. | Executed in multiple paths (tests 185, 298, 371, 404, 442); deterministic guaranteed-find behavior is covered by those paths. |
| Clean fragment; Garden and fragment found. Analyze fragment; Garden, fragment found, and cleaned. | `_isLegal` 262–263; `_apply` 332–333. Clean sets flag; analysis sets `fragment_analyzed` and found `new chemical`. | New chemical plus LoBlo/Allergone enables comparison; LoBlo comparison sets poison confirmation. | Executed fragment aliases and no chemical on clean in test 185; analyze/compare in tests 214, 298, 371, 404. Analyze-before-clean rejection is not directly asserted; statically verified in `_isLegal` 263. |
| Compare new chemical with LoBlo or Allergone; both items in evidence; any room; either argument order. | `_isLegal` 222–223 normalizes either order; `_apply` 334–335. LoBlo result sets `poison_confirmed`; Allergone reports no match and sets no clue. | LoBlo confirmation plus found LoBlo participates in Baxter-only and joint-case conditions. Allergone is optional exclusion. | Executed: both comparison orders with medicine-first and chemical-first paths in tests 214 and 404; missing Allergone reagent rejection in 404; missing LoBlo rejection in 185. General all-room behavior directly tested during interview in 185; all room variants otherwise statically equivalent. |
| Public questions; Living Room, allowed subject/topic. Private questions; only current interviewee and allowed topic. | `_isLegal` 231–243; `_answer` 412–456 records asked flags, returns quoted answer. Private Baxter/Dunbar `alibi` or `concert` sets concert contradiction once both accounts exist. | Concert contradiction is required for complete joint case; other topics provide red-herring/context; showing an item can condition some answers. | Executed: all public questions at test 354; private concert at 327 and alibi complete path at 340; evidence-conditioned Focus/Steven answers at 255, 270. Invalid topic/person/context cases partially covered in test 36 and static gates. |
| Start private interview; Living Room, present suspect, no current interview. Return; only current interviewee. | `_isLegal` 231–235 and Living Room check 241; `_apply` 299–308 changes `interviewee`, then clears it and returns suspect. Officer/group narrative is response. | Enables private questions, searches, shows, and single-person accusation; return restores group interactions. It incorrectly increments letter entry count (finding 1). | Executed across interview tests 109, 214, 255, 327, 340, 512; no direct test of a second interview being blocked while one is active, static only. |
| Search suspect publicly; Living Room. Refuse without searching. Search privately; only interviewee. | `_isLegal` 240, 234; `_apply` 341–347. Public refusal is valid and consumes a successful action but adds no evidence. Private Dunbar adds LoBlo; Mrs. Robner adds Allergone; Baxter/George add none. | LoBlo is required for complete joint case and Baxter method branch; Allergone enables optional comparison. | Executed public no-leak regression at test 381; private medicine search/order at 214, 404, 512. Baxter/George no-item responses static only. |
| Show evidence; allowed person/evidence pair, evidence found, target present (Living Room or that person’s interview). | `_showPairs` 210–212 and `_isLegal` 236/243; `_confront` 459–473 records shown flag and returns public/private response. | Shown letter conditions Mrs. Robner’s Steven answer; Focus papers condition Baxter answer; confrontations do not set conviction clues. | Executed Focus papers to Baxter and its alias in tests 255 and 270; other five pairings and invalid pairings mostly static. |
| Single accusation; person present in Living Room or is the interviewee. Joint accusations; Living Room only and supported combinations. No evidence prerequisite. | `_isLegal` 224–229; `_apply` 352–363 adds accusation names and creates choice. | `close` resolves accumulated set; `continue` preserves it. At successful action 30 the action-limit terminal overrides the choice. | Executed availability/context and accusation prompt at test 50; overbroad name canonicalization/extra suspect in 458; 30th action direct execution below. Other rejected joint forms statically checked. |
| Continue investigating; only in accusation choice. Preserve evidence/accusations and clear choice. Close; only in choice, then terminal. | `_isLegal` 218; `_apply` 350–351; `_closeCase` 368–409. Terminal states reject future actions (`step` 149). | Accumulated accusation set selects outcome; evidence flags select conditional joint/Baxter result. | Executed continuation/preservation in tests 419, 483, 512; post-terminal rejection in test 419 lines 427–429; remaining conditional branches below. |
| Close with innocent-only accusation(s); accuse George/Mrs. Robner without Baxter or Dunbar. | `_closeCase` 394–396 returns `false_accusation_suicide`. | Terminal suicide report. | Executed for George and Mrs. Robner individually in test 419; both together is static, with same `.every` predicate. |
| Close with Dunbar, without Baxter, optionally innocent extras. | `_closeCase` 390–393 returns `incomplete_dunbar_case`, dropping unsupported extras and including newspaper epilogue. No evidence predicate. | Terminal; Truth window’s Afterward section is conditional on exactly Dunbar in accusation record. | Executed Dunbar-only close and separate continuation in test 512; Dunbar plus extra innocent is static. |
| Close with Baxter, without Dunbar, optionally innocent extras. | `_closeCase` 381–389; if Focus papers + notepad and poison confirmation + found LoBlo, Baxter-only acquittal; otherwise DA declines. | Terminal `baxter_only`. | Executed only less-evidence/declined path in test 419. The complete motive+method Baxter-only acquittal branch has no located test; static condition and response verified. |
| Close with both true suspects, no innocent extra. | `_closeCase` 397–406; full predicate is poison confirmed + LoBlo found + concert contradiction + Focus papers read + notepad read. Missing clues produce weak case. | `complete_solution` vs `weak_case`. Missing-clue message selection prioritizes missing Focus, then missing note, then generic account gap. | Executed complete in tests 340 and 390; weak in 439 and missing Focus specifically in 496. Other isolated missing-predicate combinations are not each executed; predicate and branch text statically checked. |
| Close with both true suspects and innocent extras. | `_closeCase` 372–380 uses same evidence predicate; unsupported extra names dropped in report. | `overinclusive_accusation`, conviction or unproved outcome. | Executed weak and complete representatives in tests 458 and 469; both extras together and every evidence-missing variant static. |
| Successful-action limit; 30th valid action ends immediately, including accusation. Invalid action does not increment successful actions. | `step` 155–166 increments only legal actions and then finishes at limit, overriding accusation choice. | `episode_limit`; no further actions accepted. | Boundary directly executed: 29 successful `ask Baxter about alibi` actions then `accuse Baxter` ended at action 30 with `episode_limit`, terminal status, and zero choices. Existing test 549 only exercises a two-action non-accusation limit; exact default-limit accusation boundary lacks a test. Invalid no-state-change covered at test 36. |
| Submitted-call limit; every submitted call counts, including invalid calls; model-call cap configurable. | `step` 150–160 counts calls; 167–169 checks reached limit only if no terminal is pending. | `model_call_limit` when no pending choice; final-call accusation is stuck in unusable choice (finding 3). | Invalid-call limit executed in test 549. Accusation-at-limit directly reproduced. |

## Accusation order and boundary analysis

The design says accusation order does not matter and later accusations accumulate. In the code, `normalizeAction` canonicalizes a joint command into `SUSPECTS` order (engine lines 40–46), and `_apply` stores the union of previous and new names in that same fixed order (lines 352–357). `_closeCase` branches on membership and count, not chronology (lines 370–408). Therefore, absent an episode limit, the final accusation set determines the case category; order among accusation actions cannot change the ending or its evidence predicate.

Representative execution confirmed this: accusing Baxter then Dunbar, versus Dunbar then Baxter with a continue between them, produced the same `["Baxter","Dunbar"]` record and `weak_case` result. Existing test `continue investigating preserves earlier accusations...` (483–494) verifies accumulation across an innocent accusation and a joint command; test 458 submits a joint command in noncanonical order and verifies canonical handling. These results support equivalence by set membership; every permutation was not executed and was not needed to establish that code property.

Order and batching can still change whether the 30-action boundary is reached on an accusation: a joint command is one successful action, while separate accusation actions require an accusation and a continue choice for each additional accusation. The limit rule itself is uniform: any accusation as action 30 ends with `episode_limit` and no close/continue choice. That exact boundary was directly executed during this review. A new deterministic regression test should minimally put the game at 29 successful actions, accuse, and assert terminal status, `episode_limit`, preserved accused list, and no choices.

## Paths verified by execution

- All 33 existing deterministic tests passed in the previous review run (`npm test`: 33 passed, 0 failed).
- This review directly executed the 30-successful-action accusation boundary: action 30 produced terminal `episode_limit`, retained Baxter in the accusation record, and exposed no choices.
- This review directly compared two accusation orders (Baxter→Dunbar and Dunbar→Baxter); both resolved to the same canonical set and `weak_case` ending.
- Earlier direct reproduction confirmed letter delivery after interview return and the call-limit accusation choice.
- Existing tests execute representative room transitions, letter room-entry delivery, required clue path, both ingredient orders for comparisons, public/private search, clue-gated safe and fragment routes, full and weak joint cases, single-target endings, continuation, terminal rejection, invalid action behavior, and invalid-call limits. Individual entries are mapped in the dependency matrix.

## Paths verified only by static tracing

- Every unlisted pairing/order permutation of accumulated accusations. The code’s canonical-set storage and membership-based resolver establish order independence away from limits; only representative orders were executed.
- Some negative prerequisites and exact room variants where a shared `_isLegal` guard handles them (for example, analyze teacup before finding it, analyze fragment before cleaning, and invalid private-interview cross-target questions).
- Each separate missing-clue combination for the weak joint ending; the full predicate and representative missing Focus/missing notes behavior were checked, not all combinations executed.
- Baxter-only acquittal with both motive and method evidence; the less-evidence branch is tested.
- Joint innocent accusations, both innocent extras on an overbroad charge, some no-item search responses, and all evidence-confrontation pairings beyond tested examples.

## Paths still unverified and why they matter

- **Automated regression for the 30th-action accusation:** behavior was directly executed and is correct, but the suite does not lock the precedence rule. Add the minimal test described above.
- **Automated regression for final-call accusation:** a defect was directly reproduced. Add a test with `maxCalls: 1` and an accusation as call one; assert that the episode is terminal at the cap and that no unusable choice remains. The precise desired terminal reason should follow the project’s call-limit policy.
- **Letter entry count after interview return:** an existing test currently expects the defective delivery; the rule and implementation mismatch are confirmed. Correcting code/test behavior requires a separate implementation change authorization; this review did not make one.
- **Complete Baxter-only evidence threshold:** the branch condition is explicit and statically understood, but this particular ending subcase lacks deterministic coverage. The smallest test should establish both flags for motive and method, close after Baxter-only accusation, and assert the acquittal text; a paired missing-evidence case already exists.
- **Full invalid-prerequisite matrix:** not every invalid action was individually executed. The dependency matrix identifies those that rely on common static guards. Their importance is lower than the reproduced state-transition defects, but a future table-driven test can assert invalid actions leave evidence, location, clue flags, and successful-action count unchanged.

## Writing-style flag

Most prose is clear and concrete. Some passages lean toward compact evidence summaries rather than a detective story, especially the technical LoBlo/Ebullion comparison (`engine.js` 334) and evidence inventory during safe opening (`engine.js` 321). The latter also reveals document conclusions prematurely (finding 2). The short public answers are plain and understandable; I did not find prose so ornate that its meaning became unclear.

## Unsupported assumptions and other notes

- The engine deterministically finds the porcelain fragment on the first `search holes`; the bounded action dictionary specifies that action as finding it, so this is supported by the approved adaptation.
- Public suspect search is treated as a valid, successful interaction that consumes one successful action while revealing no inventory. This matches the specified refusal behavior.
- The `TRUE` window intentionally exposes the full case account, as the design explicitly refers to the truth window and gates only its `Afterward` section. I did not count that interface as an information-boundary defect.
- No further material mismatches were identified in the accusation categories, full-joint evidence predicate, conditional outcomes, or terminal rejection beyond the findings above.

## Implementation response (2026-11-03)

All three findings above were fixed in `src/engine.js` and covered by
deterministic regressions in `tests/engine.test.js`:

- Returning from a private interview no longer increments Living Room entry
  count or delivers the letter. The letter notice still persists across
  later actions until `read letter`.
- `open safe` now identifies the documents without stating their conclusions;
  those facts appear when the player reads each document.
- Reaching the submitted-call limit ends a pending accusation choice with
  `model_call_limit`, so the player is never left with an unusable choice.
- Additional regressions cover an accusation on successful action 30, the
  complete-evidence Baxter-only acquittal path, and representative invalid
  prerequisites preserving investigation state.

Verification: `npm test` passed all 38 tests on 2026-11-03. `npm run build`
was run after these fixes and completed successfully.

## Later configuration change (2026-11-04)

The successful-action limit was raised from 30 to 50 after historical review
2.0. Review 3.0 examined that 50-action configuration. It was subsequently
raised from 50 to 100 after the six model trials all reached the prior cap; the
current implementation and regression test use action 100.


## Implementation response to review 3.0 (2026-11-04)

The pending-choice error path and other review notes have been addressed:

- `end_episode` now replaces an unresolved accusation choice with a terminal
  runner-error outcome while preserving the accumulated accusations. Engine and
  watch-runner tests cover the terminal result and saved trace.
- Removed the unreachable player-facing `unsupported_accusation` ending; an
  impossible internal suspect set now raises an invariant error.
- Reworded the LoBlo comparison result into shorter sentences while retaining
  the lab findings about Methsparin, Ebullion, and the fatal interaction.
- Updated the settled action-limit instructions to 100, reflecting the later
  evaluation change.

Verification after these changes: `npm test` passed all 52 deterministic tests
and `npm run build` completed successfully. The final sentence of the original
review 3.0 note is superseded by review 4.0 above, which records the fresh
independent review on 2026-11-04.
