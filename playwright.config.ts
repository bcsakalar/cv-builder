import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const rootDir = __dirname;
const frontendPort = process.env.LOCAL_FRONTEND_PORT ?? "5274";
const backendPort = process.env.LOCAL_BACKEND_PORT ?? "3202";
const inspectPort = process.env.LOCAL_DEBUG_INSPECT_PORT ?? "9329";
const authStatePath = path.join(rootDir, "e2e", ".auth", "demo-user.json");

export default defineConfig({
  testDir: path.join(rootDir, "e2e"),
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: path.join(rootDir, "playwright-report") }],
  ],
  use: {
    baseURL: `http://localhost:${frontendPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "auth-chromium",
      testMatch: /auth\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "app-chromium",
      dependencies: ["setup"],
      testIgnore: [/auth\.setup\.ts/, /auth\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        storageState: authStatePath,
      },
    },
  ],
});