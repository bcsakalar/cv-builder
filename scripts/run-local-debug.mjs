import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
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

function getServiceUrl(env, key, fallback) {
  return env[key] || process.env[key] || fallback;
}

function checkPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen({ port, exclusive: true });
  });
}

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.setTimeout(250);
    socket.once("connect", () => {
      socket.destroy();
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

async function isPortOccupied(port) {
  const connectionChecks = await Promise.all([
    canConnect("127.0.0.1", port),
    canConnect("::1", port),
    canConnect("localhost", port),
  ]);

  if (connectionChecks.some(Boolean)) {
    return true;
  }

  return !(await checkPortFree(port));
}

async function findAvailablePort(startPort) {
  let candidate = Number(startPort);

  while (await isPortOccupied(candidate)) {
    candidate += 1;
  }

  return candidate;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkTcp(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: Number(port) });

    socket.setTimeout(1000);
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

async function waitForTcp(host, port, timeoutMs = 30000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (await checkTcp(host, port)) {
      return true;
    }

    await sleep(1000);
  }

  return false;
}

async function ensureLocalInfra(baseEnv) {
  const databaseUrl = new URL(
    getServiceUrl(
      baseEnv,
      "DATABASE_URL",
      "postgresql://cvbuilder:cvbuilder_secret@localhost:5432/cvbuilder?schema=public"
    )
  );
  const redisUrl = new URL(
    getServiceUrl(baseEnv, "REDIS_URL", "redis://:redis_secret@localhost:6379")
  );

  const postgresReady = await checkTcp(databaseUrl.hostname, databaseUrl.port || 5432);
  const redisReady = await checkTcp(redisUrl.hostname, redisUrl.port || 6379);

  if (postgresReady && redisReady) {
    return;
  }

  const localHosts = new Set(["localhost", "127.0.0.1"]);
  const canAutoStart =
    process.env.LOCAL_DEBUG_AUTO_INFRA !== "0" &&
    localHosts.has(databaseUrl.hostname) &&
    localHosts.has(redisUrl.hostname);

  if (!canAutoStart) {
    console.error("Local infrastructure is not ready.");
    console.error(`PostgreSQL reachable: ${postgresReady}`);
    console.error(`Redis reachable: ${redisReady}`);
    console.error("Start your local services first or allow auto-start with Docker Compose.");
    process.exit(1);
  }

  console.log("Local PostgreSQL/Redis not reachable. Starting docker compose services...\n");

  const compose = spawnSync(
    "docker",
    ["compose", "up", "-d", "postgres", "redis"],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        ...baseEnv,
      },
      stdio: "inherit",
      shell: process.platform === "win32",
    }
  );

  if (compose.status !== 0) {
    console.error("Failed to start postgres/redis with docker compose.");
    process.exit(compose.status ?? 1);
  }

  const [postgresUp, redisUp] = await Promise.all([
    waitForTcp(databaseUrl.hostname, databaseUrl.port || 5432),
    waitForTcp(redisUrl.hostname, redisUrl.port || 6379),
  ]);

  if (!postgresUp || !redisUp) {
    console.error("Docker compose started, but postgres/redis did not become reachable in time.");
    console.error(`PostgreSQL reachable: ${postgresUp}`);
    console.error(`Redis reachable: ${redisUp}`);
    process.exit(1);
  }

  console.log("Local infrastructure is ready.\n");
}

function forward(child, label) {
  child.stdout?.on("data", (chunk) => {
    process.stdout.write(`[${label}] ${chunk}`);
  });

  child.stderr?.on("data", (chunk) => {
    process.stderr.write(`[${label}] ${chunk}`);
  });
}

const baseEnv = loadRootEnv();
await ensureLocalInfra(baseEnv);
const requestedBackendPort = process.env.LOCAL_BACKEND_PORT ?? "3002";
const requestedFrontendPort = process.env.LOCAL_FRONTEND_PORT ?? "5174";
const requestedInspectPort = process.env.LOCAL_DEBUG_INSPECT_PORT ?? "9229";
const strictPorts = process.env.LOCAL_DEBUG_STRICT_PORTS === "1";

async function resolvePort(requestedPort, label) {
  const numericPort = Number(requestedPort);

  if (!strictPorts) {
    return findAvailablePort(numericPort);
  }

  if (await isPortOccupied(numericPort)) {
    console.error(`${label} port ${numericPort} is already in use and LOCAL_DEBUG_STRICT_PORTS=1 was requested.`);
    process.exit(1);
  }

  return numericPort;
}

const backendPort = await resolvePort(requestedBackendPort, "Backend");
const frontendPort = await resolvePort(requestedFrontendPort, "Frontend");
const inspectPort = await resolvePort(requestedInspectPort, "Inspector");

console.log("CvBuilder full local debug\n");
console.log(`Backend API: http://localhost:${backendPort}`);
console.log(`Frontend:    http://localhost:${frontendPort}`);
console.log(`Inspector:   ws://127.0.0.1:${inspectPort}`);
console.log("");

const sharedEnv = {
  ...process.env,
  ...baseEnv,
  PORT: String(backendPort),
  CORS_ORIGIN: `http://localhost:${frontendPort}`,
  VITE_API_URL: `http://localhost:${backendPort}/api`,
  LOCAL_BACKEND_PORT: String(backendPort),
  LOCAL_FRONTEND_PORT: String(frontendPort),
  LOCAL_DEBUG_INSPECT_PORT: String(inspectPort),
};

const backend = spawn(
  process.execPath,
  [
    `--inspect=${inspectPort}`,
    path.join(rootDir, "node_modules", "tsx", "dist", "cli.mjs"),
    "watch",
    path.join("packages", "backend", "src", "server.ts"),
  ],
  {
    cwd: rootDir,
    env: sharedEnv,
    stdio: ["inherit", "pipe", "pipe"],
  }
);

const frontend = spawn(
  process.execPath,
  [
    path.join(rootDir, "node_modules", "vite", "bin", "vite.js"),
    "--host",
    "localhost",
    "--port",
    String(frontendPort),
    "--strictPort",
  ],
  {
    cwd: path.join(rootDir, "packages", "frontend"),
    env: sharedEnv,
    stdio: ["inherit", "pipe", "pipe"],
  }
);

forward(backend, "backend");
forward(frontend, "frontend");

let shuttingDown = false;

function killChildTree(child, signal = "SIGTERM") {
  if (!child || child.killed) return;

  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  child.kill(signal);
}

function terminateChildren(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;

  killChildTree(backend, signal);
  killChildTree(frontend, signal);
}

process.on("SIGINT", () => terminateChildren("SIGINT"));
process.on("SIGTERM", () => terminateChildren("SIGTERM"));

backend.on("exit", (code, signal) => {
  if (!shuttingDown) {
    terminateChildren(signal ?? "SIGTERM");
  }

  if (signal) return;
  process.exitCode = process.exitCode ?? code ?? 0;
});

frontend.on("exit", (code, signal) => {
  if (!shuttingDown) {
    terminateChildren(signal ?? "SIGTERM");
  }

  if (signal) return;
  process.exitCode = process.exitCode ?? code ?? 0;
});