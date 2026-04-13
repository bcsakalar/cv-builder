import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(scriptPath);
const rootDir = path.resolve(scriptsDir, "..");

const backendPort = process.env.LOCAL_BACKEND_PORT ?? "3002";
const frontendPort = process.env.LOCAL_FRONTEND_PORT ?? "5174";

const child = spawn(
  process.execPath,
  [
    path.join(rootDir, "node_modules", "vite", "bin", "vite.js"),
    "--host",
    "localhost",
    "--port",
    frontendPort,
    "--strictPort",
  ],
  {
    cwd: path.join(rootDir, "packages", "frontend"),
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_API_URL: `http://localhost:${backendPort}/api`,
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