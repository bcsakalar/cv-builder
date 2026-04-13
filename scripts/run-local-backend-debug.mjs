import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(scriptPath);
const rootDir = path.resolve(scriptsDir, "..");
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

function loadRootEnv() {
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return parseEnvFile(fs.readFileSync(envPath, "utf8"));
}

const baseEnv = loadRootEnv();
const backendPort = process.env.LOCAL_BACKEND_PORT ?? "3002";
const frontendPort = process.env.LOCAL_FRONTEND_PORT ?? "5174";
const inspectPort = process.env.LOCAL_DEBUG_INSPECT_PORT ?? "9229";

const child = spawn(
  process.execPath,
  [
    `--inspect=${inspectPort}`,
    path.join(rootDir, "node_modules", "tsx", "dist", "cli.mjs"),
    "watch",
    path.join("packages", "backend", "src", "server.ts"),
  ],
  {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...baseEnv,
      ...process.env,
      PORT: backendPort,
      CORS_ORIGIN: `http://localhost:${frontendPort}`,
    },
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});