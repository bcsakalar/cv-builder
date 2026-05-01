import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const envExamplePath = path.join(rootDir, ".env.example");

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");

function parseEnvFile(content) {
  const parsed = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");
    parsed[key] = value;
  }

  return parsed;
}

async function readEnvFile(filePath) {
  try {
    return parseEnvFile(await fs.readFile(filePath, "utf8"));
  } catch {
    return {};
  }
}

function csv(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function hasExactTag(model) {
  return model.includes(":");
}

function modelMatches(availableModel, configuredModel) {
  if (availableModel === configuredModel) return true;
  if (!hasExactTag(configuredModel)) {
    return availableModel.startsWith(`${configuredModel}:`);
  }
  return false;
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`);
  }
  return response.json();
}

async function listModels(baseUrl) {
  const data = await fetchJson(new URL("/api/tags", baseUrl).toString());
  return Array.isArray(data.models) ? data.models.map((model) => model.name).filter(Boolean) : [];
}

async function pullModel(baseUrl, modelName) {
  console.log(`[pull] ${modelName} indiriliyor...`);

  const response = await fetch(new URL("/api/pull", baseUrl).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelName, stream: true }),
  });

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    throw new Error(`Ollama pull failed for ${modelName}: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastStatus = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.status && event.status !== lastStatus) {
          lastStatus = event.status;
          console.log(`  ${event.status}`);
        }
      } catch {
        // Ignore malformed stream fragments.
      }
    }
  }

  console.log(`[ok] ${modelName} hazır.`);
}

function getConfiguredModels(env) {
  const requiredModels = csv(env.OLLAMA_REQUIRED_MODELS);
  const coreModels = [
    env.OLLAMA_MODEL,
    env.OLLAMA_CODE_MODEL,
    env.OLLAMA_REPO_ANALYSIS_MODEL,
    env.OLLAMA_STRUCTURED_MODEL,
    env.OLLAMA_EMBEDDING_MODEL,
  ];
  const optionalFallbackModels = unique([
    env.OLLAMA_FALLBACK_MODEL,
    ...csv(env.OLLAMA_REPO_ANALYSIS_FALLBACK_MODELS),
  ]);

  return {
    required: unique([...requiredModels, ...coreModels]),
    optionalFallbacks: optionalFallbackModels,
  };
}

async function main() {
  console.log(`CvBuilder Ollama ${checkOnly ? "check" : "setup"}\n`);

  const exampleEnv = await readEnvFile(envExamplePath);
  const localEnv = await readEnvFile(envPath);
  const env = { ...exampleEnv, ...localEnv, ...process.env };
  const baseUrl = env.OLLAMA_URL || "http://localhost:11434";
  const { required, optionalFallbacks } = getConfiguredModels(env);

  let availableModels = [];
  try {
    availableModels = await listModels(baseUrl);
  } catch (error) {
    console.error(`[fail] Ollama erişilemiyor: ${baseUrl}`);
    console.error(`       ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[ok] Ollama erişilebilir: ${baseUrl}`);
  console.log(`[info] Kurulu modeller: ${availableModels.length ? availableModels.join(", ") : "yok"}\n`);

  const missingRequired = required.filter((model) => !availableModels.some((available) => modelMatches(available, model)));
  const missingOptional = optionalFallbacks.filter((model) => !availableModels.some((available) => modelMatches(available, model)));

  for (const model of required) {
    const ok = !missingRequired.includes(model);
    console.log(`${ok ? "[ok]" : "[missing]"} required ${model}`);
  }

  for (const model of optionalFallbacks) {
    const ok = !missingOptional.includes(model);
    console.log(`${ok ? "[ok]" : "[warn]"} fallback ${model}`);
  }

  if (checkOnly) {
    if (missingRequired.length) {
      console.error(`\n[fail] Eksik zorunlu model(ler): ${missingRequired.join(", ")}`);
      console.error("       npm run ollama:setup ile eksikleri indirebilirsin.");
      process.exitCode = 1;
      return;
    }

    console.log("\nOllama model yapılandırması hazır.");
    return;
  }

  for (const model of missingRequired) {
    await pullModel(baseUrl, model);
  }

  availableModels = await listModels(baseUrl);
  const stillMissing = required.filter((model) => !availableModels.some((available) => modelMatches(available, model)));
  if (stillMissing.length) {
    console.error(`\n[fail] İndirilemeyen model(ler): ${stillMissing.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nOllama model kurulumu tamamlandı. Küçük bir GPU kahvesi hak edildi ☕");
}

await main();