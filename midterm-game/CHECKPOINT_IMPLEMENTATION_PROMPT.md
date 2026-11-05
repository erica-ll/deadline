# Implementation-agent prompt: evaluation checkpoints and live watch suite

Copy the prompt below into the implementation-agent session. The agent must
not start live model trials; Erica will run the declared suite after reviewing
the implementation and freezing the model configuration.

---

You are implementing deterministic evaluation checkpoints and live watch
output for `deadline/midterm-game`. Follow `deadline/AGENTS.md` and the
`deadline-midterm` skill. Before editing, give Erica a short file-by-file plan
and inspection commands. Read the current project instructions, action
dictionary, story plan, rubric, README, EVALUATION.md, engine, player runner,
baseline, model player, and current tests. Treat
`EVALUATION.md`'s `robner-checkpoints-v2` suite as the exact intended state
contract. If an action in a checkpoint prelude is not legal or a listed state
condition conflicts with the authoritative action dictionary, stop and report
the mismatch; do not invent a rule or silently edit the suite.

## Scope

Implement only:

1. Reproducible starts for S1, S2, and S3 exactly as declared in
   `EVALUATION.md`.
2. A sequential evaluation runner for the six declared model trials and the
   matching baseline trials.
3. A browser watch page with the actual game UI on the left and a live agent
   action stream on the right, backed by the same live run and complete
   per-trial JSON traces with the metadata listed below.
4. README instructions for constructing/running the suite and recording the
   first trial.

Do not change story rules, clues, actions, evidence dependencies, outcomes,
model prompt, 75-action limit, or default 100-model-call/60-second-timeout
limits unless a later explicit student instruction authorizes a change; record
any such change in `EVALUATION.md`. Do not tune or run the live model during
implementation. Do not read,
print, copy, or edit `.env`; preserve secret handling and never include secret
values in output, trace, tests, or docs. API credentials must remain server-side
and must never be sent to a browser.

## Checkpoint construction

Build each checkpoint by calling the existing engine reset and replaying the
exact legal setup actions from `EVALUATION.md` through `game.step()` in order.
Do not directly set clue/evidence flags or mutate hidden engine state to fake
a checkpoint. Verify every bootstrap action is accepted. If any action is
rejected, stop that scenario visibly with the action and rejection reason; do
not begin a player trial from a partial setup.

Keep the bootstrap action history visible to the player and in the trace. The
game's successful-action counter includes bootstrap actions and must not be
reset: the 75-action episode cap applies to bootstrap plus player actions. The
model's 100-call budget begins at zero for the player's live trial because
bootstrap actions are evaluator setup, not model calls. Configure the engine's
submitted-call guard so that the player can still make at most 100 submitted
calls after bootstrap. Report bootstrap action/call counts separately from
player actions and model calls; explain the distinction in the trace schema and
README. The agent receives only normal player observations, including the
visible bootstrap history. Treat the engine observation's ordered history of
submitted commands and their responses, including rejected commands, as the
agent's sole memory; mark each entry's validity and do not add a separate
transcript of attempted or rejected actions. A rejected command must be
remembered but must not change investigation facts or successful-action
count. The agent should use rejection feedback to avoid repeating the same
unsupported command unless new information changes the situation. It must not receive
the fixture definition, hidden state, legal-action list, evaluator data, or
answer key.

S1 is a normal fresh `reset(seed)`. S2 and S3 must match their ordered setup
actions, start rooms, and absent-state requirements in the evaluation suite.
Before returning a prepared checkpoint, validate its player-visible
observation and its required evaluation-only state assertions against the
suite definition. A mismatch is a setup error, never a warning to ignore.

Provide a stable scenario selector such as `--scenario S1|S2|S3` and stable
trial seeds from the evaluation suite. The same scenario/seed pair must build
the same checkpoint for both players. Keep `legal_actions()` evaluator-only;
do not expose it to the model or baseline.

## Sequential runs

Add commands equivalent to:

```sh
npm run play:model -- --scenario S1 --seed 1101 --watch
npm run evaluate:model -- --suite robner-checkpoints-v2 --watch
npm run evaluate:baseline -- --suite robner-checkpoints-v2
```

The `--watch` model command must start or connect to a local watch server and
print the local URL to open. Starting the server or loading the watch page must
not make a provider call. The page must first show an idle/preflight state and
an explicit **Start S1-T1** button. Erica will open the page, check both panes,
start screen recording, then click the button; only that click may launch the
first model trial. Keep the button disabled while configuration or checkpoint
preflight fails, and show a readable error without making a provider call.
After S1-T1 ends and its trace is safely saved, show the outcome and an
explicit **Continue suite** button. Erica may stop recording before clicking
it; the next scheduled trial then starts. Do not automatically begin S2-T1
immediately after S1-T1.

Fallback: if the local-server architecture cannot reliably wait for a page
button before starting the run, change the command so it automatically opens
the watch URL in Google Chrome, and still gate every provider call behind the
page's **Start S1-T1** button. On macOS, safely spawn `open -a "Google Chrome"
<local-url>` without shell interpolation. If Chrome is unavailable, print the
URL and a clear instruction; never fall back to starting the model before the
page is ready.

The model suite must run these trials sequentially, in the declared order:
S1-T1/1101, S2-T1/2201, S3-T1/3301, S1-T2/1102, S2-T2/2202,
S3-T2/3302. Do not parallelize live calls. Finish and persist one trial's
trace before offering **Continue suite** for the next scheduled trial. Record
failures and allow Erica to continue after inspecting each terminal report;
never silently retry, substitute a baseline move, or label a fallback as a
model action. The suite runner itself must not tune prompts or configuration.
Run the baseline on the same six scenario/seed pairs and save one trace per
pair.

S1-T1 is the watch/recording run and counts as one of the six required live
trials; do not add a seventh recording-only live run. After she stops screen
recording and clicks **Continue suite**, Erica can run the remaining trials.
Provide a single-trial command so the first episode can also be run without
the remaining cases. Every live request, including failed requests, is part
of the trace and trial count.

## Split-screen browser watch page

Implement a dedicated local watch page (for example `/watch`) styled as a
presentation view, following the supplied reference image's overall
composition: the real game view occupies the left, and the live agent activity
panel occupies the right. This is a view of the actual ongoing episode, not a
separate simulation, a replay, or a mock dashboard.

The left pane must reuse the game's normal presentation and display the
current player-visible scene, room description, evidence and feedback as the
engine updates them. It must update from events produced by the running model
episode. Disable manual action entry and game controls in this spectator view
so no viewer can accidentally choose or submit moves. Do not display truth,
hidden state, evaluator checkpoints, full legal-action lists, or any content
the detective could not currently observe.

The right pane is a scrollable event stream for that same episode. Show:

- scenario ID, trial ID, seed, provider/model, game version, and effective
  limits, but never credentials or environment values;
- the current player-visible room/scene and relevant player-visible
  observation/history;
- each attempted action exactly as submitted, whether it was valid, the
  engine's visible response, and the resulting visible state/ending;
- action/call counters, per-request latency, and provider token usage when
  returned;
- provider errors, timeouts, invalid actions, and terminal reason without
  hiding or retrying them.

The browser must receive events from the local runner through a local-only
server stream such as SSE or WebSocket. Run the model and hold the API key
server-side only; never call the provider directly from browser code and never
send credentials to the page. The right pane may show the model's submitted
action, but not internal reasoning or chain-of-thought. Do not print or render
hidden engine state, answer-key data, full legal actions, source code, `.env`
contents, API keys, or private model reasoning. The page must reflect the
actual live run, not a replay or manually selected action. An optional short
delay between completed turns may make a recording readable; it must not add
model calls or alter gameplay.

Render the layout responsively, but optimize the recording view for a desktop
screen with both panes legible at once. Include a clear Live indicator and a
visible final outcome. If the browser disconnects, the backend run must keep
recording its trace and must not silently restart or duplicate the episode.

## Trace and evaluation evidence

Write a distinct trace for every scheduled trial, with a stable trial ID in
its filename. Persist after each completed action/request (for example via a
temporary file and atomic rename), then finalize it at episode end, so an
interrupted suite does not erase earlier trials. Include at least:

- trial ID, scenario ID, seed, timestamp, provider/model, model/config/prompt
  identifier, game version, and effective action/call/timeout limits;
- exact bootstrap action list and count, bootstrap outcome/checkpoint
  validation, and the resulting initial player observation;
- every player observation, prior visible feedback, submitted model action,
  validity, visible engine response, source, outcome, latency, and token
  usage where available;
- bootstrap actions, player successful actions, player submitted/model calls,
  invalid actions, terminal status/reason/score, start/end time, and any error.

Never store credentials or internal model reasoning. Do not invent token usage
or cost when the provider omits metadata. The evaluation report must calculate
estimated cost using the captured usage and dated official pricing, and must
report all six outcomes including failures. Keep baseline traces paired to the
same scenario/seed IDs; baseline and model receive the same observations and
rules.

## Documentation and reporting

Update `README.md` with working-directory-specific commands, scenario names,
what bootstrap history means, the model and baseline suite commands, how to
open the local split-screen watch page, safe API-key setup, and how to record
S1-T1. State that the video shows the actual game UI beside a live stream of
the model's submitted actions and visible game responses, with no manual move
selection. Tell Erica to start screen recording before starting S1-T1 and stop
after that episode's terminal outcome; S1-T1 remains part of the six-trial
suite. Do not claim that model trials or a recording have already happened.

Do not replace or fabricate human-playtest notes. Do not mark an independent
review complete; the current `review.md` reports an unresolved issue and must
be handled separately.

At completion, report changed files, commands actually run and results,
whether any deterministic checkpoint validation was performed, and all
remaining work. Do not make live API calls, record a video, commit, or push.

---
