import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(scriptPath);
const rootDir = path.resolve(scriptsDir, "..");

let backendPort = process.env.LOCAL_BACKEND_PORT ?? "3202";
let frontendPort = process.env.LOCAL_FRONTEND_PORT ?? "5274";
let inspectPort = process.env.LOCAL_DEBUG_INSPECT_PORT ?? "9329";
const playwrightArgs = process.argv.slice(2);
const reuseExistingStack = process.env.LOCAL_E2E_REUSE_STACK === "1";

let devServer = null;
let playwright = null;
let shuttingDown = false;

function buildE2eEnv() {
  return {
    ...process.env,
    LOCAL_BACKEND_PORT: backendPort,
    LOCAL_FRONTEND_PORT: frontendPort,
    LOCAL_DEBUG_INSPECT_PORT: inspectPort,
    PLAYWRIGHT_HTML_OPEN: "never",
  };
}

function currentFrontendUrl() {
  return `http://localhost:${frontendPort}`;
}

function currentBackendUrl() {
  return `http://localhost:${backendPort}/api/templates`;
}

function updateStackPorts(output) {
  const text = output.toString();
  const backendMatch = text.match(/Backend API:\s+http:\/\/localhost:(\d+)/);
  const frontendMatch = text.match(/Frontend:\s+http:\/\/localhost:(\d+)/);
  const inspectMatch = text.match(/Inspector:\s+ws:\/\/127\.0\.0\.1:(\d+)/);

  if (backendMatch) {
    backendPort = backendMatch[1];
  }

  if (frontendMatch) {
    frontendPort = frontendMatch[1];
  }

  if (inspectMatch) {
    inspectPort = inspectMatch[1];
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function urlReady(url) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(3000),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function waitForReady(getUrls, timeoutMs = 240000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const urls = getUrls();
    const checks = await Promise.all(urls.map((url) => urlReady(url)));
    if (checks.every(Boolean)) {
      return true;
    }

    await sleep(1000);
  }

  return false;
}

function killChild(child, signal = "SIGTERM") {
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

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  killChild(playwright, "SIGTERM");
  if (devServer) {
    killChild(devServer, "SIGTERM");
  }

  process.exit(code);
}

async function ensureStack() {
  if (reuseExistingStack && (await waitForReady(() => [currentFrontendUrl(), currentBackendUrl()], 5000))) {
    return;
  }

  devServer = spawn("npm", ["run", "dev:debug"], {
    cwd: rootDir,
    shell: process.platform === "win32",
    stdio: ["inherit", "pipe", "pipe"],
    env: {
      ...buildE2eEnv(),
      LOCAL_DEBUG_AUTO_INFRA: process.env.LOCAL_DEBUG_AUTO_INFRA ?? "1",
      LOCAL_DEBUG_STRICT_PORTS: process.env.LOCAL_DEBUG_STRICT_PORTS ?? "0",
    },
  });

  devServer.stdout?.on("data", (chunk) => {
    updateStackPorts(chunk);
    process.stdout.write(`[e2e-stack] ${chunk}`);
  });

  devServer.stderr?.on("data", (chunk) => {
    updateStackPorts(chunk);
    process.stderr.write(`[e2e-stack] ${chunk}`);
  });

  const ready = await waitForReady(() => [currentFrontendUrl(), currentBackendUrl()]);
  if (!ready) {
    console.error(`Timed out waiting for E2E stack on ${currentFrontendUrl()} and ${currentBackendUrl()}`);
    shutdown(1);
  }
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

await ensureStack();

playwright = spawn(
  process.execPath,
  [path.join(rootDir, "node_modules", "playwright", "cli.js"), "test", ...playwrightArgs],
  {
    cwd: rootDir,
    stdio: "inherit",
    env: buildE2eEnv(),
  }
);

playwright.on("exit", (code, signal) => {
  if (signal) {
    shutdown(1);
    return;
  }

  shutdown(code ?? 0);
});