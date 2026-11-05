import "./style.css";
import "./watch.css";

const app = document.querySelector("#app");
let latest = null;
let source;

const esc = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pretty = (v) => String(v || "").replaceAll("_", " ");
function shell() {
  app.innerHTML = `<main class="desktop-shell watch-shell"><header class="watch-header"><div><h1>Deadline — Playtest</h1><p>Live view of the machine investigator. Actions and feedback come from the game engine.</p></div><span id="connection" class="watch-status">● LIVE · Connecting…</span></header><section class="watch-controls" id="controls"></section><div class="watch-grid"><section class="watch-left"><div class="watch-subhead"><h2>Investigation</h2><span id="trial-label"></span></div><div id="scene" class="watch-scene"></div><section class="watch-feedback"><h2>Latest visible response</h2><div id="feedback"></div></section><section class="watch-evidence"><h2>Case evidence</h2><ul id="evidence"></ul></section><section class="watch-history"><details id="initial-history"><summary>Visible history at trial start</summary><ol></ol></details></section></section><aside class="watch-right"><section><h2>Trial details</h2><div id="progress"></div><div id="limits"></div></section><section class="watch-stream-section"><h2>Agent activity</h2><ol id="stream" class="watch-stream"></ol></section></aside></div></main>`;
}
function render(state) {
  latest = state;
  document.querySelector("#connection").textContent = state.status === "running" ? "● LIVE · Connected" : "Connected";
  const ctrl = document.querySelector("#controls");
  const canStart = state.status === "ready" && state.readiness.length === 0;
  const canContinue = state.status === "awaiting_continue";
  const beforeFirstTrial = state.trialIndex < 0 && ["ready", "blocked", "error"].includes(state.status);
  const button = beforeFirstTrial ? `<button id="start-trial" class="primary-button" ${canStart ? "" : "disabled aria-disabled=\"true\""}>Start ${esc(state.plannedTrial?.trialId || "S1-T1")} <span>→</span></button>` : canContinue ? `<button id="continue-suite" class="primary-button">Continue suite <span>→</span></button>` : "";
  const statusText = state.status === "awaiting_continue" ? "Trial complete" : state.status === "finished" || state.status === "complete" ? "Suite complete" : state.status === "blocked" || state.status === "error" ? "Preflight needs attention" : state.status === "running" ? "Trial running" : "Ready to begin";
  const instruction = state.status === "awaiting_continue" ? "Review this trace, then continue to the next scheduled trial." : state.status === "finished" || state.status === "complete" ? "All scheduled trials have finished." : canStart ? "Starting the watch page does not call the model. Start the trial when you are ready." : "The trial cannot start until the items below are resolved.";
  ctrl.innerHTML = `<div><strong>${esc(statusText)}</strong><p>${esc(instruction)}</p>${state.readiness?.length ? `<ul class="readiness">${state.readiness.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}${state.error ? `<p class="watch-error">${esc(state.error)}</p>` : ""}</div>${button}`;
  document.querySelector("#start-trial")?.addEventListener("click", () => post("/api/watch/start"));
  document.querySelector("#continue-suite")?.addEventListener("click", () => post("/api/watch/continue"));
  const obs = state.observation || state.initialObservation;
  document.querySelector("#trial-label").textContent = state.trial ? `${state.trial.trialId} · ${state.trial.scenarioId} · seed ${state.trial.seed}` : "No trial started";
  document.querySelector("#scene").innerHTML = obs ? `<p class="scene-room">${esc(pretty(obs.room))}</p><p>${esc(obs.roomText)}</p>${obs.interviewee ? `<p>${esc(obs.interviewee)} is present for a private interview.</p>` : ""}${obs.terminal?.message ? `<p class="watch-outcome">${esc(obs.terminal.message)}</p>` : ""}${state.outcome?.status && state.outcome.status !== "ongoing" && state.outcome.status !== "choice" ? `<p class="watch-outcome">${esc(state.outcome.title || state.outcome.reason)} · ${esc(state.outcome.message || "")}</p>` : ""}` : `<p>Start the first trial to see the investigator’s initial observation.</p>`;
  const events = state.eventLog || [];
  const last = events.at(-1);
  document.querySelector("#feedback").innerHTML = last ? `<p><b>${esc(last.action || "Model request")}</b>${last.valid === false ? ` <span class="watch-invalid">(rejected)</span>` : ""}</p><p>${esc(last.message || last.error || "")}</p>${last.usage ? `<p>Provider usage: ${esc(JSON.stringify(last.usage))}</p>` : ""}` : `<p>No model action has been submitted in this trial.</p>`;
  const evidence = obs?.evidence || [];
  document.querySelector("#evidence").innerHTML = evidence.length ? evidence.map((item) => `<li>${esc(item)}</li>`).join("") : "<li>No evidence recorded.</li>";
  document.querySelector("#progress").innerHTML = `<p>${state.trialIndex < 0 ? "Trial 0" : `Trial ${state.trialIndex + 1} of ${state.totalTrials}`}</p><p>${esc(state.trial?.scenarioId || "Waiting")} · ${esc(state.trial?.trialId || "No trial started")} · seed ${esc(state.trial?.seed || "—")}</p><p>${esc(state.provider || "OpenAI")} / ${esc(state.model || "model not configured")} · game ${esc(state.gameVersion || "1.0.0")}</p>`;
  const lim = state.limits;
  document.querySelector("#limits").innerHTML = `<dl><dt>Successful actions</dt><dd>${lim ? `${obs?.successfulActions ?? 0} / ${lim.maxActions}` : "100 per trial"}</dd><dt>Setup actions</dt><dd>${lim ? lim.bootstrapActions : "Scenario-specific"}</dd><dt>Player calls</dt><dd>${events.length} / ${lim?.modelActionLimit ?? 200}</dd><dt>Effective engine calls</dt><dd>${lim?.effectiveMaxCalls ?? "Setup + 200"}</dd><dt>Request timeout</dt><dd>${lim ? `${lim.timeoutMs} ms` : "60 seconds"}</dd></dl>`;
  const startHistory = state.initialObservation?.history || [];
  document.querySelector("#initial-history ol").innerHTML = startHistory.map((item) => `<li><b>${esc(item.action)}</b><span>${esc(item.message)}</span></li>`).join("") || "<li>Fresh case; no setup history.</li>";
  document.querySelector("#stream").innerHTML = events.length ? events.map((event, i) => `<li><span class="stream-number">${i + 1}</span><div><p class="stream-action">${esc(event.action || "Provider request")}${event.valid === false ? ` <b class="watch-invalid"> · invalid</b>` : ""}</p><p>${esc(event.message || event.error || "Request failed")}</p><p class="stream-meta">${event.latencyMs == null ? "latency unavailable" : `${event.latencyMs} ms`}${event.usage ? ` · usage ${esc(JSON.stringify(event.usage))}` : ""}</p>${event.outcome?.status && event.outcome.status !== "ongoing" && event.outcome.status !== "choice" ? `<p class="stream-outcome">${esc(event.outcome.status)} · ${esc(event.outcome.reason)}</p>` : ""}</div></li>`).join("") : `<li class="stream-empty">Waiting for the first model action. The stream will contain submitted actions and engine responses, with no internal reasoning.</li>`;
}
async function post(path) { await fetch(path, { method: "POST" }); }

shell();
(async () => {
  try {
    const response = await fetch("/api/watch/state");
    render(await response.json());
    source = new EventSource("/api/watch/events");
    source.onmessage = (event) => render(JSON.parse(event.data));
    source.onerror = () => { document.querySelector("#connection").textContent = "● LIVE · Reconnecting…"; };
  } catch (error) { document.querySelector("#connection").textContent = "Unavailable"; document.querySelector("#controls").textContent = error.message; }
})();
