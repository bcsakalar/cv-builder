export const E2E_FRONTEND_ORIGIN = `http://localhost:${process.env.LOCAL_FRONTEND_PORT ?? "5274"}`;
export const E2E_BACKEND_ORIGIN = `http://localhost:${process.env.LOCAL_BACKEND_PORT ?? "3202"}`;
export const E2E_API_BASE_URL = `${E2E_BACKEND_ORIGIN}/api`;

export const DEMO_USER = {
  email: "demo@cvbuilder.local",
  password: "DemoPassword123!",
  name: "Demo User",
};

export const TEST_CV_PREFIX = "e2e-playwright-cv";

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildTestCvTitle(prefix = TEST_CV_PREFIX): string {
  return `${prefix}-${uniqueSuffix()}`;
}

export function buildTestUser() {
  const suffix = uniqueSuffix();

  return {
    name: `Playwright User ${suffix}`,
    email: `playwright.${suffix}@cvbuilder.local`,
    password: `Playwright!${suffix}`,
  };
}