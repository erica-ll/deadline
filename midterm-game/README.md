# The Robner Case

A short, text-based investigation of Marshall Robner's death. This quick start
is for classmates who want to install the project and play the game themselves.

## Quick start: play the game yourself

Requires Node.js 20 or newer and npm. From the repository root, run:

```sh
cd deadline/midterm-game
npm ci
npm run dev
```

Open the local address Vite prints, usually <http://127.0.0.1:5173/>. Click
**Begin the investigation** after the introduction. On each turn, choose an
available action word, fill in the rest of the command using the scene and
clues, then press **Try this action**. The game does not show a list of valid
targets or complete commands: guessing is part of the investigation. If a
command is invalid, read the response and try another; it will not advance the
case. Use the notes on the right to review suspects, rooms, and evidence.

After accusing someone, choose **Close the case** to see the result or
**Continue investigating** to keep playing. **Restart** begins a new case.
**TRUTH** reveals the full solution and contains spoilers.

This is a manual playtest: play through the browser at your own pace and try
actions based on the story and clues. You do not need to run a script or set up
a model API. For feedback, note what you tried, what happened, and anything
that was unclear; keep those notes separate from automated test results.
The automated-player instructions below are for optional project evaluation;
they are not part of the manual playtest.

## Inspect and test the engine

While `npm run dev` is running, open
[`http://127.0.0.1:5173/test`](http://127.0.0.1:5173/test). The local Engine
Inspector can jump to named checkpoints, show the complete current engine
state alongside the player observation, list and submit every currently legal
command, accept arbitrary command guesses, and display the resulting feedback,
history, and terminal outcome. Presets include the major evidence stages,
the accusation outcomes, the baseline's complete solution, and an action-limit
episode. It does not enumerate every combinatorial state; load a checkpoint
and continue testing from there. This developer page exposes hidden state and
full legal actions, so it is for local inspection only, not part of player
observations or the game interface.

## Engine and commands

`src/engine.js` exports `DeadlineGame` with the machine interface:

```js
game.reset(seed)
game.observe("detective")
game.legal_actions("detective")
game.step("detective", action)
game.outcome()
```

The engine owns the case state and validates every action. `legal_actions()`
is available for engine-level rule checks and deterministic tests; it is not
provided to a human or machine player. The observation's `rooms` field lists
the four rooms and `actionWords` contains available command heads only.
Invalid actions do not consume a successful action or change evidence/location;
submitted calls
still count toward the separate call cap. The investigation ends after 75
successful actions. The player runner allows at most 100 model calls by default
and 60 seconds for each request; set `MAX_MODEL_CALLS` or `MODEL_TIMEOUT_MS`
to change those runner limits. The 75-action cap applies to successful actions;
rejected commands use model calls but do not advance that count.

The game starts in the Living Room. Movement, investigation, conversation,
evidence handling, and conclusions are available where the story permits.
The exact target vocabulary and context rules remain authoritative in the
engine and project action specification, but player interfaces do not
enumerate currently valid command combinations. Private suspect searches occur
only in a private interview. Public searches are refused. Analyzed
Garden-fragment evidence must be compared with LoBlo. A strong joint
conclusion also requires Dunbar's LoBlo, both concert ticket stubs and both
suspects' accounts establishing the murder timeline, a shaded notepad, and
reading the Focus papers. The Garden-hole inspection and
Kitchen count are optional observations, not outcome prerequisites.

The current engine version is `1.8.0`; the npm package version `1.0.0` is the
package release number and is tracked separately. The frozen scored model
configuration is OpenAI `gpt-6-luna`, config
`robner-checkpoints-v2-config-1`, prompt
`robner-action-heads-v6-rejection-history`, and context protocol
`engine-observation-history-v3`.
Private interviews do not move the detective to a named room; the engine marks
the interview as a separate scene and returns to the prior room when it ends.
Unresolved story notices are included in `observation.pendingMessages` and
remain visible until their related action is completed; the delivered-letter
notice clears when `read letter` is used.

## Play and evaluate the players

### Six-trial model watch suite

This suite uses the fixed `robner-checkpoints-v2` schedule: S1-T1/1101,
S2-T1/2201, S3-T1/3301, S1-T2/1102, S2-T2/2202, and S3-T2/3302. S1 is a
fresh case; S2 starts after the Library setup; S3 starts after the interviews
and Kitchen/Garden setup. Bootstrap is replayed through the engine and remains
in visible history. Those setup moves count toward 75 successful actions, but
not toward the player's 100 model calls. Each player trial gets up to 100 calls
and 60 seconds per request.

Configure OpenAI in `.env` (the watch server keeps credentials on the server;
they are never sent to the browser):

```sh
cp .env.example .env
```

Set `OPENAI_API_KEY`, `OPENAI_MODEL`, and `MODEL_CONFIG_ID` in that local file.
Do not paste credentials into a browser field or share `.env`.

From `deadline/midterm-game`, start the evaluation server:

```sh
npm run evaluate:model
```

Open the local URL printed by the command (normally
<http://127.0.0.1:5174/watch>). If that port is busy, the server tries the next
available local port and prints its URL. The page first shows configuration status;
server startup and opening the page do not make a provider call. **Start S1-T1**
is in the control bar directly below the page title. Start screen recording,
check that the left game view and right agent stream are visible, then click
**Start S1-T1**. The recording is the first of the six scheduled trials, not an
extra run. After S1-T1 reaches an outcome and its trace is saved, stop
recording. Click **Continue suite** once to start S2-T1. Continue to click it
after each subsequent trial you have inspected (S2-T1 through S3-T2); the
server never automatically starts the next trial. There is no Continue button
after the final trial. If an API request fails, its error is recorded and the
suite waits for your Continue click; it does not retry or substitute an action.
Every invalid model action is passed back as feedback and retained in the trace.
The episode ends at its normal action or model-call limit if the model does not
recover from repeated refusals.

For only the recording episode, start the same watch page with:

```sh
npm run play:model -- --scenario S1 --seed 1101 --watch
```

That command displays a single-trial **Start S1-T1** button. The live browser
view shows the actual episode's room and evidence on the left and submitted
actions, visible responses, validity, latency, usage metadata, and ending on
the right. It has no manual action controls and does not show model reasoning.
The six-suite traces are saved under `traces/evaluation/`; single-trial watch
traces use the same directory and stable trial filename.

If you need to choose a specific port, pass it explicitly, for example
`npm run evaluate:model -- --port 5180`. An explicitly requested busy port
produces a concise error instead of starting on a different port.

Run the paired deterministic baseline suite with no API key and no provider
calls:

```sh
npm run evaluate:baseline
```

It uses the same six scenario/seed pairs and writes one trace per pair under
`traces/evaluation-baseline/`. Both suites can also be run one-at-a-time for a
single scenario through the model command above. Starting a watch page never
starts the model until you press the explicit button.

After model traces are available, prepare a dated OpenAI pricing snapshot using
the frozen model's official rates, starting from
`evaluation-pricing.example.json`, then create a report (the committed snapshot
records the rates used for the current evaluation):

```sh
npm run report:evaluation -- --pricing evaluation-pricing-2026-11-05.json
```

The report pairs outcomes and call counts, and calculates estimated cost from
captured token usage and the pricing date/source in that file. It marks cost
incomplete when a request has no usage metadata; it never fills in missing
usage or assumes a rate.

### One-off player commands

Run the deterministic evidence-first baseline and save a JSON trace under
`traces/`:

```sh
npm run play:baseline -- --seed 11
```

For a one-off, non-watch model episode, configure OpenAI as above and run:

```sh
cp .env.example .env
```

```sh
npm run play:model -- --seed 11
```

The model receives the same player-facing case introduction and suspect
introductions as the human player, plus the current scene, available action
words, command forms, evidence, and an ordered history of all submitted
commands with their engine responses. Each history entry marks whether the
command succeeded. Rejected guesses are remembered but do not change evidence,
room, or the successful-action count. In S2 and S3, history includes the
checkpoint setup actions and responses. The engine history is the model's only
memory transcript; no separate session transcript is sent. The model does not
receive the full legal-action list, future paths, hidden engine state,
evaluator, or answer key. The prompt tells it to select an available action
word, fill the query from the provided command forms, and use prior rejection
feedback to avoid repeating unsupported commands. The engine validates each
full query. Provider failures and timeouts are recorded as terminal reasons,
not silently replaced with a move.

Suspect names accept the approved title, surname, and full-name forms. The
engine maps an accepted alias back to the canonical suspect name in game state
and outcomes.

The same `.env` file can hold credentials for Anthropic or Gemini. Add the
matching provider key and model, then call the runner directly:

```sh
node players/run.js --provider anthropic --seed 11
node players/run.js --provider gemini --seed 11
```

`OPENAI_BASE_URL`, `ANTHROPIC_BASE_URL`, and `GEMINI_BASE_URL` can point to
compatible API endpoints. Provider endpoint formats are documented in the
[OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create),
[Anthropic Messages API](https://platform.claude.com/docs/en/api/messages), and
[Gemini Interactions API](https://ai.google.dev/api/interactions-api).
The local `.env` file is ignored by Git and is not included in saved playtest
traces. `.env.example` contains only empty setting names for setup. Existing
shell environment variables take precedence over values from `.env`. The
optional `MAX_MODEL_CALLS` and `MODEL_TIMEOUT_MS` settings can also go in
`.env`; provider-specific base URLs work the same way.

## Tests and CI

```sh
npm test
npm run build
```

The course workflow is [`../.github/workflows/setup-check.yml`](../.github/workflows/setup-check.yml).
It runs `npm ci`, the deterministic tests, and the production build on pushes
and pull requests. Check recent GitHub workflow runs from the `deadline/`
repository root with:

```sh
gh run list --workflow setup-check.yml --limit 5
```

Local tests do not make a live model API request. A workflow run is only
reported as green after GitHub provides that evidence.

## Peer playtest notes

The detailed feedback received about The Robner Case is in
[`peer-feedback.md`](peer-feedback.md), with a summary and submission index in
[`PEER-PLAYTEST-NOTES.md`](PEER-PLAYTEST-NOTES.md).

## Research & Critical Depth (Rubric 1a): Rule/Source Map

The rubric's evidence labels are `code`, `manual`, `observed`, `assumed`, and
`design`. Every rule below is labeled `design`: it is a rule deliberately
selected or adapted for this bounded version. The label does not claim that
the implementation reproduces the original game's code. The approved
specifications define the implemented rules; the implementation and test
locators show where they are enforced and checked. Test names identify
representative checks, not exhaustive testing of every invalid action
combination.

| Implemented rule | Evidence label | Design/source locator | Enforcement and test locator |
| --- | --- | --- | --- |
| Initial state, four suspects, four rooms, officer supervision, private-interview scene, and Mrs. Robner's non-acting anxious presentation | `design` | [Story plan — Bounded cast and room model](../MIDTERM_STORY_RECONSTRUCTION_PLAN.md#bounded-cast-and-room-model); [Action dictionary — State and movement](../ACTION_DICTIONARY_AND_RULES.md#state-and-movement) | [Engine: `reset`](src/engine.js#L167) and [`observe`](src/engine.js#L179); [test: role boundaries](tests/engine.test.js#L7) |
| Room destinations, room-entry counts, and letter delivery on the second actual Living Room entry | `design` | [Action dictionary — State and movement](../ACTION_DICTIONARY_AND_RULES.md#state-and-movement); [Action dictionary — Living Room](../ACTION_DICTIONARY_AND_RULES.md#living-room) | [Engine: `step`](src/engine.js#L243) and [`_apply`](src/engine.js#L392); [test: second-entry letter](tests/engine.test.js#L230); [test: interview return does not count as entry](tests/engine.test.js#L258) |
| Inspecting and reading the delivered letter; keeping its arrival notice until it is read | `design` | [Action dictionary — State and movement](../ACTION_DICTIONARY_AND_RULES.md#state-and-movement); [Action dictionary — Living Room](../ACTION_DICTIONARY_AND_RULES.md#living-room) | [Engine: `_isLegal`](src/engine.js#L315) and [`_apply`](src/engine.js#L392); [test: second-entry letter and read state](tests/engine.test.js#L230) |
| Re-inspecting only found evidence from any room | `design` | [Action dictionary — Command forms](../ACTION_DICTIONARY_AND_RULES.md#command-forms); [Action dictionary — Room-specific object actions](../ACTION_DICTIONARY_AND_RULES.md#room-specific-object-actions) | [Engine: `evidenceInspectionTarget`](src/engine.js#L76), [`_isLegal`](src/engine.js#L315), and [`_apply`](src/engine.js#L392); [test: discovered evidence inspection](tests/engine.test.js#L104) |
| Accepted command forms, optional articles, suspect-name aliases, action heads, and action normalization | `design` | [Action dictionary — Command forms](../ACTION_DICTIONARY_AND_RULES.md#command-forms) | [Engine: `canonicalPerson`](src/engine.js#L59), [`normalizeAction`](src/engine.js#L107), and [`legal_action_words`](src/engine.js#L220); [tests: suspect aliases](tests/engine.test.js#L41) and [room names](tests/engine.test.js#L81) |
| Context and prerequisite validation; rejected actions record feedback without changing investigation facts or successful-action count | `design` | [Action dictionary — Command forms](../ACTION_DICTIONARY_AND_RULES.md#command-forms); [Action dictionary — Invalid commands and failure behavior](../ACTION_DICTIONARY_AND_RULES.md#invalid-commands-and-failure-behavior) | [Engine: `_isLegal`](src/engine.js#L315), [`_invalidReason`](src/engine.js#L373), and [`step`](src/engine.js#L243); [test: legal versus illegal state change](tests/engine.test.js#L185); [test: representative invalid prerequisites](tests/engine.test.js#L307) |
| Library body, teacup, saucer, Ebullion, desk, and notepad observations; shading the notepad | `design` | [Action dictionary — Library](../ACTION_DICTIONARY_AND_RULES.md#library); [Story plan — Evidence chain and likely suspicion](../MIDTERM_STORY_RECONSTRUCTION_PLAN.md#evidence-chain-and-likely-suspicion) | [Engine: `_isLegal`](src/engine.js#L315) and [`_apply`](src/engine.js#L392); [tests: Library descriptions](tests/engine.test.js#L348) and [source-supported Ebullion details](tests/engine.test.js#L335) |
| Independent bookcase/safe discovery; opening exposes documents, while reading Focus papers and the new will reveals their contents | `design` | [Action dictionary — Library](../ACTION_DICTIONARY_AND_RULES.md#library); [Story plan — Hidden safe: keep the bookshelf chain](../MIDTERM_STORY_RECONSTRUCTION_PLAN.md#hidden-safe-keep-the-bookshelf-chain) | [Engine: `_isLegal`](src/engine.js#L315) and [`_apply`](src/engine.js#L392); [tests: neutral safe opening](tests/engine.test.js#L290), [safe independent of notepad](tests/engine.test.js#L493), and [Focus papers prerequisite](tests/engine.test.js#L718) |
| Kitchen china inspection, search, and count | `design` | [Action dictionary — Kitchen](../ACTION_DICTIONARY_AND_RULES.md#kitchen) | [Engine: `_apply`](src/engine.js#L392); [test: Kitchen description](tests/engine.test.js#L362) |
| Garden holes and ladder inspection, fragment search, cleaning, analysis, and porcelain aliases | `design` | [Action dictionary — Garden](../ACTION_DICTIONARY_AND_RULES.md#garden) | [Engine: `_isLegal`](src/engine.js#L315) and [`_apply`](src/engine.js#L392); [tests: fragment prerequisite](tests/engine.test.js#L90), [porcelain aliases](tests/engine.test.js#L391), and [analysis result](tests/engine.test.js#L576) |
| Finding LoBlo and Allergone, comparing either with the new chemical in either discovery order, and the resulting positive or negative lab result | `design` | [Action dictionary — Garden](../ACTION_DICTIONARY_AND_RULES.md#garden); [Action dictionary — Interview and search rules](../ACTION_DICTIONARY_AND_RULES.md#interview-and-search-rules) | [Engine: `_isLegal`](src/engine.js#L315) and [`_apply`](src/engine.js#L392); [tests: discovery-order comparison](tests/engine.test.js#L420) and [Allergone regression](tests/engine.test.js#L611) |
| Public questions, private interviews, interview return, allowed topics, refusals, consensual searches, ticket stubs, and murder-timeline evidence | `design` | [Action dictionary — Suspect questions and interviews](../ACTION_DICTIONARY_AND_RULES.md#suspect-questions-and-interviews); [Action dictionary — Interview and search rules](../ACTION_DICTIONARY_AND_RULES.md#interview-and-search-rules) | [Engine: `_isLegal`](src/engine.js#L315), [`_answer`](src/engine.js#L546), and [`_updateMurderTimeline`](src/engine.js#L603); [tests: alibi refusal](tests/engine.test.js#L171), [ticket timeline](tests/engine.test.js#L533), and [interview privacy](tests/engine.test.js#L258) |
| Evidence confrontation pairs, public/private response differences, and the rule that showing evidence does not by itself prove guilt | `design` | [Action dictionary — Evidence confrontation](../ACTION_DICTIONARY_AND_RULES.md#evidence-confrontation) | [Engine: `_showPairs`](src/engine.js#L311) and [`_confront`](src/engine.js#L611); [tests: Focus papers confrontation](tests/engine.test.js#L461) and [accepted phrase forms](tests/engine.test.js#L476) |
| Accusation availability, supported joint accusations, accusation accumulation, and the `close the case` / `continue investigating` choice | `design` | [Action dictionary — Accusation outcomes](../ACTION_DICTIONARY_AND_RULES.md#accusation-outcomes); [Story plan — Accusation case reports and truth window](../MIDTERM_STORY_RECONSTRUCTION_PLAN.md#accusation-case-reports-and-truth-window) | [Engine: `_apply`](src/engine.js#L392) and [`_closeCase`](src/engine.js#L502); [tests: individual outcomes](tests/engine.test.js#L626), [continued accusations](tests/engine.test.js#L705), and [Dunbar choices](tests/engine.test.js#L734) |
| Case outcome conditions, evidence-dependent joint verdict, and the Dunbar post-case newspaper epilogue | `design` | [Action dictionary — Accusation outcomes](../ACTION_DICTIONARY_AND_RULES.md#accusation-outcomes); [Story plan — Incomplete accusation and post-case newspaper ending](../MIDTERM_STORY_RECONSTRUCTION_PLAN.md#incomplete-accusation-and-post-case-newspaper-ending) | [Engine: `_closeCase`](src/engine.js#L502) and [`_finish`](src/engine.js#L636); [tests: full and weak joint outcomes](tests/engine.test.js#L661) and [Dunbar epilogue](tests/engine.test.js#L734) |
| Binary outcome score: `1` for a complete evidence-supported conviction, `0` for other terminal outcomes, and `null` while ongoing or awaiting a choice | `design` | [Action dictionary — Outcome score](../ACTION_DICTIONARY_AND_RULES.md#outcome-score) | [Engine: `_closeCase`](src/engine.js#L502) and [`_finish`](src/engine.js#L636); [test: complete solution score](tests/engine.test.js#L597) and [test: complete overinclusive score](tests/engine.test.js#L691) |
| Successful-action limit, submitted-call limit, timeout behavior, terminal reasons, and limit precedence | `design` | [Story plan — Episode boundary and player choices](../MIDTERM_STORY_RECONSTRUCTION_PLAN.md#episode-boundary-and-player-choices); [Action dictionary — Interview and search rules](../ACTION_DICTIONARY_AND_RULES.md#interview-and-search-rules) | [Engine: constructor](src/engine.js#L161), [`outcome`](src/engine.js#L230), [`end_episode`](src/engine.js#L238), and [`step`](src/engine.js#L243); [model request timeout](players/model-player.js#L11); [runner error termination](players/trial-runner.js#L74); [tests: limits](tests/engine.test.js#L771) and [75th-action boundary](tests/engine.test.js#L785) |
| Detective observation boundary, available action-word heads, hidden-state separation, and no legal-action list to players | `design` | [Project instructions — How to work](../AGENTS.md#how-to-work); [Action dictionary — State and movement](../ACTION_DICTIONARY_AND_RULES.md#state-and-movement) | [Engine: `observe`](src/engine.js#L179), [`legal_actions`](src/engine.js#L214), and [`legal_action_words`](src/engine.js#L220); [tests: role and observation boundary](tests/engine.test.js#L7) and [model adapter input boundary](tests/engine.test.js#L825) |

## Research & Critical Depth (Rubric 1b): Scope, Omissions, and Adaptations

Included: one case, four suspects (Baxter, Dunbar, George, Mrs. Robner), four
rooms (Living Room, Library, Kitchen, Garden), a supervised group, voluntary
private interviews, the evidence chain, the optional hidden safe, five
accusation paths, the incomplete Dunbar-case epilogue, and an
evidence-dependent joint accusation. The complete bounded episode and
termination conditions are specified in [Episode boundary and player
choices](../MIDTERM_STORY_RECONSTRUCTION_PLAN.md#episode-boundary-and-player-choices).

Excluded: the larger cast and timeline, real-time movement, formal arrests,
other source ticket-search branches, parser synonyms, the combination puzzle,
the separate closet, and interactive simulation of the post-case murder. The
cuts keep the case finishable while preserving the approved clue logic.

## Research & Critical Depth (Rubric 1c): Sources and Reuse Terms

The game is an original implementation of a bounded adaptation. The historical
source collection identifies *Deadline* as a 1982 Infocom game written by Marc
Blank and states that the contributed source collection is not under an open
license ([collection README](../README.md), “What is this Repository?” and
“Purpose”). The student confirmed publication permission for source dialogue
used in this course adaptation. This project copies no source code, compiled
files, or assets. See the [story evidence notes](../STORY_AND_SUSPECT_EVIDENCE.md)
and [bounded route audit](SOURCE_FLOW_AUDIT.md) for source locations and
intentional differences. The approved story and action specifications are the
authority for this bounded adaptation; all implemented game rules are labeled
`design` because they are selected or adapted rules, not claims of upstream
code fidelity.
