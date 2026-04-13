import { expect, test } from "@playwright/test";
import { apiSuccess } from "./utils/mock-api";

const mockRepo = {
  id: 101,
  fullName: "mock-dev/mock-repo",
  name: "mock-repo",
  description: "Browser automation toolkit",
  language: "TypeScript",
  stars: 42,
  forks: 7,
  url: "https://github.com/mock-dev/mock-repo",
  updatedAt: "2026-04-12T12:00:00.000Z",
  topics: ["automation", "playwright"],
};

const completedAnalysis = {
  id: "analysis-1",
  username: "mock-dev",
  status: "COMPLETED" as const,
  error: null,
  createdAt: "2026-04-12T12:00:00.000Z",
  result: {
    repoFullName: "mock-dev/mock-repo",
    name: "mock-repo",
    description: "Browser automation toolkit",
    stars: 42,
    forks: 7,
    watchers: 11,
    openIssues: 3,
    license: "MIT",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z",
    topics: ["automation", "playwright"],
    languages: [{ language: "TypeScript", percentage: 82, bytes: 123456 }],
    primaryLanguage: "TypeScript",
    technologies: ["Playwright", "React"],
    totalCommits: 128,
    recentCommits: [],
    hasReadme: true,
    url: "https://github.com/mock-dev/mock-repo",
    defaultBranch: "main",
    isArchived: false,
    isFork: false,
  },
};

test("connects and disconnects a mocked GitHub account @smoke", async ({ page }) => {
  let connected = false;

  await page.route("**/api/github/status", async (route) => {
    await route.fulfill({
      json: apiSuccess({ connected, username: connected ? "mock-dev" : null }),
    });
  });

  await page.route("**/api/github/connect", async (route) => {
    connected = true;
    await route.fulfill({
      json: apiSuccess({ username: "mock-dev", avatarUrl: "", name: "Mock Dev" }),
    });
  });

  await page.route("**/api/github/disconnect", async (route) => {
    connected = false;
    await route.fulfill({ json: apiSuccess({}) });
  });

  await page.route("**/api/github/repos**", async (route) => {
    await route.fulfill({ json: apiSuccess([]) });
  });

  await page.route("**/api/github/analyses**", async (route) => {
    await route.fulfill({ json: apiSuccess([]) });
  });

  await page.goto("/github");

  await expect(page.getByTestId("github-token-input")).toBeVisible();
  await page.getByTestId("github-token-input").fill("ghp_mock_token_for_e2e");
  await page.getByTestId("github-connect-button").click();

  await expect(page.getByText("Connected as @mock-dev")).toBeVisible();
  await expect(page.getByTestId("github-disconnect-button")).toBeVisible();

  await page.getByTestId("github-disconnect-button").click();
  await expect(page.getByTestId("github-connect-button")).toBeVisible();
});

test("analyzes a mocked repo, expands the result, and imports it into a CV @smoke", async ({ page }) => {
  let analyses: typeof completedAnalysis[] = [];

  await page.route("**/api/github/status", async (route) => {
    await route.fulfill({ json: apiSuccess({ connected: true, username: "mock-dev" }) });
  });

  await page.route("**/api/github/repos**", async (route) => {
    await route.fulfill({ json: apiSuccess([mockRepo]) });
  });

  await page.route("**/api/github/analyses", async (route) => {
    await route.fulfill({ json: apiSuccess(analyses) });
  });

  await page.route("**/api/github/analyze", async (route) => {
    analyses = [completedAnalysis];
    await route.fulfill({
      json: apiSuccess({
        id: completedAnalysis.id,
        username: completedAnalysis.username,
        status: "PROCESSING",
        result: null,
        error: null,
        createdAt: completedAnalysis.createdAt,
      }),
    });
  });

  await page.route(`**/api/github/analyses/${completedAnalysis.id}/stream`, async (route) => {
    await route.abort();
  });

  await page.route("**/api/cv", async (route) => {
    await route.fulfill({
      json: apiSuccess([
        {
          id: "cv-import-target",
          title: "E2E Import Target",
        },
      ]),
    });
  });

  await page.route("**/api/github/import/cv-import-target", async (route) => {
    await route.fulfill({ json: apiSuccess({ imported: true }) });
  });

  await page.route("**/api/ai/github-summary", async (route) => {
    await route.fulfill({
      json: apiSuccess({
        summary: "Automation-focused full-stack developer with strong TypeScript and testing depth.",
      }),
    });
  });

  await page.goto("/github");

  await expect(page.getByText("mock-repo")).toBeVisible();
  await page.getByRole("button", { name: "Analyze" }).click();

  await expect(page.getByText("mock-dev/mock-repo")).toBeVisible();
  await page.getByText("mock-dev/mock-repo").click();

  await expect(page.getByText("Browser automation toolkit").last()).toBeVisible();
  await expect(page.getByText("TypeScript 82%")).toBeVisible();

  await page.getByTestId("github-import-cv-select").selectOption("cv-import-target");
  await page.getByTestId("github-import-button").click();
  await expect(page.getByTestId("github-imported")).toBeVisible();

  await page.getByRole("button", { name: /Generate from Repos/i }).click();
  await expect(page.getByText("Automation-focused full-stack developer with strong TypeScript and testing depth.")).toBeVisible();
});
