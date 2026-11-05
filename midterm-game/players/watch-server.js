import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createServer as createViteServer } from "vite";
import { loadLocalEnv, modelConfig } from "./config.js";
import { TRIALS } from "./checkpoints.js";
import { TrialRunner, validateSuiteCheckpoints } from "./trial-runner.js";

await loadLocalEnv();
const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
if (args.includes("--suite") && arg("--suite", "") !== "robner-checkpoints-v2") throw new Error("Unknown evaluation suite. Use --suite robner-checkpoints-v2.");
const single = args.includes("--scenario");
const suiteTrials = single
  ? [{ trialId: `${arg("--scenario", "S1")}-T1`, scenarioId: arg("--scenario", "S1"), seed: Number(arg("--seed", "1101")) }]
  : TRIALS;
const provider = (arg("--provider", "openai")).toLowerCase();
const config = modelConfig(provider);
const projectDir = fileURLToPath(new URL("../", import.meta.url));
const readiness = [];
let checkpoints = [];
try { checkpoints = validateSuiteCheckpoints(suiteTrials); }
catch (error) { readiness.push("Checkpoint setup preflight failed. No trial can start until the checkpoint problem is fixed."); console.error(`Checkpoint preflight failed: ${error.message}`); }
if (provider !== "openai") readiness.push("For this evaluation run, choose OpenAI as the provider.");
if (!config.apiKey) readiness.push("Set OPENAI_API_KEY in the environment or local .env file.");
if (!config.model) readiness.push("Set OPENAI_MODEL in the environment or local .env file.");
if (!process.env.MODEL_CONFIG_ID) readiness.push("Set MODEL_CONFIG_ID to identify this model configuration.");
if (checkpoints.some((checkpoint) => !checkpoint.passed)) readiness.push("One or more checkpoints failed validation; inspect the preflight details.");
if (!Number.isInteger(config.maxCalls) || config.maxCalls < 1) readiness.push("MAX_MODEL_CALLS must be a positive whole number.");
if (!Number.isFinite(config.timeoutMs) || config.timeoutMs < 1) readiness.push("MODEL_TIMEOUT_MS must be a positive number.");
const runner = new TrialRunner({ trials: suiteTrials, config, traceDir: resolve(projectDir, "traces/evaluation") });
runner.readiness = readiness;
runner.status = readiness.length ? "blocked" : "ready";

const vite = await createViteServer({
  root: projectDir,
  configFile: false,
  appType: "spa",
  server: { middlewareMode: true },
});
const server = createServer((req, res) => {
  if (req.url === "/api/watch/state" && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(runner.snapshot()));
    return;
  }
  if (req.url === "/api/watch/events" && req.method === "GET") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    res.write(`data: ${JSON.stringify(runner.snapshot())}\n\n`);
    const unsubscribe = runner.subscribe((data) => res.write(`data: ${data}\n\n`));
    res.on("close", unsubscribe);
    return;
  }
  if (["/api/watch/start", "/api/watch/continue"].includes(req.url) && req.method === "POST") {
    const method = req.url.endsWith("/start") ? runner.start() : runner.continue();
    res.writeHead(202, { "content-type": "application/json" });
    res.end(JSON.stringify({ accepted: true }));
    method.catch((error) => { runner.error = String(error.message); runner.status = "error"; runner.emit(); });
    return;
  }
  vite.middlewares(req, res);
});
const explicitPort = args.includes("--port");
const requestedPort = Number(arg("--port", "5174"));
function listen(port) {
  return new Promise((resolveListen, rejectListen) => {
    const onError = (error) => {
      server.off("listening", onListening);
      rejectListen(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolveListen();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });
}
let port = requestedPort;
while (true) {
  try {
    await listen(port);
    console.log(`Deadline evaluation watch: http://127.0.0.1:${port}/watch`);
    break;
  } catch (error) {
    if (error.code !== "EADDRINUSE" || explicitPort || port >= requestedPort + 20) {
      await vite.close();
      console.error(error.code === "EADDRINUSE" ? `Port ${port} is already in use. Choose another with --port <number>.` : error.message);
      process.exitCode = 1;
      break;
    }
    port += 1;
  }
}
process.on("SIGINT", async () => { await vite.close(); server.close(() => process.exit(0)); });
process.on("SIGTERM", async () => { await vite.close(); server.close(() => process.exit(0)); });
