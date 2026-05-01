import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");

function parseEnvFile(content) {
  const parsed = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    parsed[key] = value;
  }

  return parsed;
}

async function loadEnv() {
  try {
    const content = await fs.readFile(envPath, "utf8");
    return parseEnvFile(content);
  } catch {
    return {};
  }
}

function compareVersion(current, minimum) {
  const currentParts = current.split(".").map(Number);
  const minimumParts = minimum.split(".").map(Number);

  for (let index = 0; index < minimumParts.length; index += 1) {
    const currentPart = currentParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;
    if (currentPart > minimumPart) return 1;
    if (currentPart < minimumPart) return -1;
  }

  return 0;
}

function checkTcp(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: Number(port) });

    socket.setTimeout(2500);
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function getServiceUrl(env, key, fallback) {
  return env[key] || process.env[key] || fallback;
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

function modelMatches(availableModel, configuredModel) {
  if (availableModel === configuredModel) return true;
  if (!configuredModel.includes(":")) {
    return availableModel.startsWith(`${configuredModel}:`);
  }
  return false;
}

function getRequiredOllamaModels(env) {
  return unique([
    ...csv(env.OLLAMA_REQUIRED_MODELS),
    env.OLLAMA_MODEL || "qwen3.5:9b",
    env.OLLAMA_CODE_MODEL || "qwen3.5:9b",
    env.OLLAMA_REPO_ANALYSIS_MODEL || "qwen2.5-coder:14b",
    env.OLLAMA_STRUCTURED_MODEL || "granite4.1:8b",
    env.OLLAMA_EMBEDDING_MODEL || "bge-m3",
  ]);
}

function printResult(ok, label, details) {
  const prefix = ok ? "[ok]" : "[fail]";
  console.log(`${prefix} ${label}${details ? ` - ${details}` : ""}`);
}

async function main() {
  console.log("CvBuilder local doctor\n");

  const env = await loadEnv();
  const results = [];

  const nodeVersion = process.versions.node;
  const nodeOk = compareVersion(nodeVersion, "22.0.0") >= 0;
  results.push(nodeOk);
  printResult(nodeOk, "Node.js", `detected ${nodeVersion}, requires >= 22.0.0`);

  const envExists = await fs.access(envPath).then(() => true).catch(() => false);
  results.push(envExists);
  printResult(envExists, ".env file", envExists ? envPath : "copy .env.example to .env first");

  const databaseUrl = getServiceUrl(env, "DATABASE_URL", "postgresql://cvbuilder:cvbuilder_secret@localhost:5432/cvbuilder?schema=public");
  const redisUrl = getServiceUrl(env, "REDIS_URL", "redis://:redis_secret@localhost:6379");
  const ollamaUrl = getServiceUrl(env, "OLLAMA_URL", "http://localhost:11434");

  const db = new URL(databaseUrl);
  const redis = new URL(redisUrl);
  const ollama = new URL(ollamaUrl);

  const postgresOk = await checkTcp(db.hostname, db.port || 5432);
  results.push(postgresOk);
  printResult(postgresOk, "PostgreSQL", `${db.hostname}:${db.port || 5432}`);

  const redisOk = await checkTcp(redis.hostname, redis.port || 6379);
  results.push(redisOk);
  printResult(redisOk, "Redis", `${redis.hostname}:${redis.port || 6379}`);

  let ollamaOk = false;
  let ollamaModels = [];
  try {
    const response = await fetch(new URL("/api/tags", ollama).toString());
    ollamaOk = response.ok;
    if (response.ok) {
      const data = await response.json();
      ollamaModels = Array.isArray(data.models)
        ? data.models.map((model) => model.name).filter(Boolean)
        : [];
    }
  } catch {
    ollamaOk = false;
  }

  results.push(ollamaOk);
  printResult(ollamaOk, "Ollama", ollama.origin);

  if (ollamaOk) {
    const requiredModels = getRequiredOllamaModels(env);
    const missingModels = requiredModels.filter(
      (model) => !ollamaModels.some((availableModel) => modelMatches(availableModel, model))
    );
    const modelsOk = missingModels.length === 0;

    results.push(modelsOk);
    printResult(
      modelsOk,
      "Ollama models",
      modelsOk
        ? requiredModels.join(", ")
        : `missing ${missingModels.join(", ")} — run npm run ollama:setup`
    );
  }

  const success = results.every(Boolean);
  console.log(`\n${success ? "Environment is ready." : "Environment is not ready."}`);

  if (!success) {
    process.exitCode = 1;
  }
}

await main();