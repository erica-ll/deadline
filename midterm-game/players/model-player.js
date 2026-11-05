const SYSTEM = `You are an investigator playing a bounded text detective game. Your goal is to solve the case by finding additional evidence and using it with evidence already discovered. The player-facing case briefing is observation.caseIntroduction, and observation.suspects contains the same suspect introductions shown to a human player; use that context without assuming guilt. Investigate objects, inspect items listed in observation.evidence when you need more detail, ask relevant questions, and compare or show evidence when useful; base accusations on evidence rather than guesses. The ultimate goal is to accuse the suspect or suspects when the evidence supports a conclusion and the accuse action word is available, then choose whether to close the case or continue investigating. The observation is the engine's player-visible state: it contains the current scene and evidence plus observation.history, the ordered record of every submitted command and the engine response. Each entry has valid=true for an accepted action and valid=false for a rejected command. The engine refreshes this history before every model call, including checkpoint setup, so use it as your memory. Successful actions advance the investigation; rejected commands do not change investigation facts, but their rejection responses remain in history. Review rejected entries and do not repeat the same unsupported command unless new evidence or circumstances change. No separate transcript or hidden state is provided. No complete legal-action list or future path is provided. Follow observation.commandProtocol exactly: choose a currently available action head from observation.actionWords, begin your query with that exact phrase, and fill the rest using a command form from observation.actionGuide. Do not guess a different action head or invent a target unsupported by observations. These forms explain syntax, not valid targets or complete legal commands; the engine validates the completed query against the current state. observation.rooms lists the rooms in this house; use one of those exact room names after 'go to' and do not invent other rooms. When filling a command template, use the simplest direct name or keyword supported by the observation or conversation. Leave out descriptive filler and container phrases; use the object's core name without adding words that are not needed to identify it. If observation.choices is nonempty, choose one of its listed action values exactly. Continue investigating toward a well-supported conclusion, then accuse when ready. You have no tools and no access to game files. Return only JSON of the form {"action":"your attempted action"}.`;

function parseAction(text) {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.action === "string") return parsed.action;
  } catch { /* submit the unparsed answer so the engine records the invalid move */ }
  return String(text).trim();
}

async function request(url, headers, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("model_timeout")), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal });
    const payload = await response.json();
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
    return { payload, latencyMs: Date.now() - started };
  } catch (error) {
    if (controller.signal.aborted) {
      const timeout = new Error(`Model request exceeded ${timeoutMs} ms.`);
      timeout.code = "timeout_limit";
      throw timeout;
    }
    throw error;
  } finally { clearTimeout(timer); }
}

export async function chooseModelAction({ provider, model, apiKey, observation, timeoutMs = 60_000, baseUrl }) {
  const input = JSON.stringify({ observation });
  const providers = {
    openai: async () => {
      const { payload, latencyMs } = await request(baseUrl || "https://api.openai.com/v1/responses", {
        Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json",
      }, { model, instructions: SYSTEM, input }, timeoutMs);
      const text = payload.output?.flatMap((item) => item.content || []).find((part) => part.type === "output_text")?.text ?? payload.output_text ?? "";
      return { action: parseAction(text), latencyMs, usage: payload.usage || null, raw: text };
    },
    anthropic: async () => {
      const { payload, latencyMs } = await request(baseUrl || "https://api.anthropic.com/v1/messages", {
        "x-api-key": apiKey, "anthropic-version": process.env.ANTHROPIC_VERSION || "2023-06-01", "content-type": "application/json",
      }, { model, max_tokens: 300, system: SYSTEM, messages: [{ role: "user", content: input }] }, timeoutMs);
      const text = payload.content?.filter((part) => part.type === "text").map((part) => part.text).join("\n") || "";
      return { action: parseAction(text), latencyMs, usage: payload.usage || null, raw: text };
    },
    gemini: async () => {
      const { payload, latencyMs } = await request(baseUrl || "https://generativelanguage.googleapis.com/v1beta/interactions", {
        "x-goog-api-key": apiKey, "Content-Type": "application/json",
      }, { model, system_instruction: SYSTEM, input, store: false }, timeoutMs);
      const text = payload.steps?.filter((step) => step.type === "model_output").flatMap((step) => step.content || []).filter((part) => part.type === "text").map((part) => part.text).join("\n") || "";
      return { action: parseAction(text), latencyMs, usage: payload.usage || null, raw: text };
    },
  };
  if (!providers[provider]) throw new Error(`Unknown provider: ${provider}`);
  if (!apiKey || !model) throw new Error(`Set the ${provider.toUpperCase()} API key and model name in the environment.`);
  return providers[provider]();
}
