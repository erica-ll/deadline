import { readFile } from "node:fs/promises";

export async function loadLocalEnv() {
  let contents;
  try { contents = await readFile(new URL("../.env", import.meta.url), "utf8"); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  for (const line of contents.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const entry = line.trim().replace(/^export\s+/, "");
    if (!entry || entry.startsWith("#")) continue;
    const match = entry.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "").trim();
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

export function modelConfig(provider = "openai") {
  const prefix = provider.toUpperCase();
  return { provider, model: process.env[`${prefix}_MODEL`] || "", apiKey: process.env[`${prefix}_API_KEY`] || "", baseUrl: process.env[`${prefix}_BASE_URL`] || undefined, modelConfigId: process.env.MODEL_CONFIG_ID || "robner-checkpoints-v2-config-1", maxCalls: Number(process.env.MAX_MODEL_CALLS || 100), timeoutMs: Number(process.env.MODEL_TIMEOUT_MS || 60_000) };
}
