import { expect, test, type Page } from "@playwright/test";
import { cleanupCvsByTitlePrefix } from "./utils/api";
import { createCv } from "./utils/cv";
import { buildTestCvTitle, TEST_CV_PREFIX } from "./utils/env";
import { apiSuccess } from "./utils/mock-api";

const AI_TEST_CV_PREFIX = `${TEST_CV_PREFIX}-ai`;

function waitForApiCall(page: Page, pathFragment: string, method = "POST") {
  return page.waitForResponse((response) =>
    response.url().includes(pathFragment) &&
    response.request().method() === method &&
    response.ok()
  );
}

async function openAiPanel(page: Page) {
  await page.getByTestId("editor-ai-toggle").click();
  await expect(page.getByTestId("ai-assist-panel")).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await cleanupCvsByTitlePrefix(request, AI_TEST_CV_PREFIX);
});

test.afterEach(async ({ request }) => {
  await cleanupCvsByTitlePrefix(request, AI_TEST_CV_PREFIX);
});

test("renders mocked AI review, summary, skills, and ATS results @smoke", async ({ page }) => {
  const cvId = await createCv(page, buildTestCvTitle(AI_TEST_CV_PREFIX));

  await page.route(`**/api/ai/review/${cvId}`, async (route) => {
    await route.fulfill({
      json: apiSuccess({
        overallScore: 88,
        sections: [
          { name: "Experience", score: 92, feedback: "Strong, achievement-focused experience entries." },
          { name: "Summary", score: 81, feedback: "Professional tone is clear and relevant." },
        ],
        strengths: ["Clear technical positioning", "Well-structured project highlights"],
        improvements: ["Add quantified impact for recent roles"],
        summary: "This CV is already strong, but adding measurable business outcomes will make it more compelling.",
      }),
    });
  });

  await page.route(`**/api/ai/summary/${cvId}`, async (route) => {
    await route.fulfill({
      json: apiSuccess({
        summary: "Senior QA engineer specializing in deterministic browser automation, release hardening, and CI reliability.",
      }),
    });
  });

  await page.route(`**/api/ai/suggest-skills/${cvId}`, async (route) => {
    await route.fulfill({
      json: apiSuccess({
        skills: ["Playwright", "TypeScript", "Release Engineering"],
      }),
    });
  });

  await page.route(`**/api/ai/ats-check/${cvId}`, async (route) => {
    await route.fulfill({
      json: apiSuccess({
        score: 91,
        issues: ["Recent roles need more quantified outcomes"],
        suggestions: ["Add metrics for test stability and release velocity"],
      }),
    });
  });

  await openAiPanel(page);

  await Promise.all([
    waitForApiCall(page, `/api/ai/review/${cvId}`),
    page.getByTestId("ai-review-submit").click(),
  ]);

  await expect(page.getByText("Clear technical positioning")).toBeVisible();
  await expect(page.getByText("Add quantified impact for recent roles")).toBeVisible();
  await expect(page.getByText("achievement-focused experience entries")).toBeVisible();

  await page.getByTestId("ai-tab-summary").click();
  await Promise.all([
    waitForApiCall(page, `/api/ai/summary/${cvId}`),
    page.getByTestId("ai-summary-submit").click(),
  ]);

  await expect(page.getByText("Senior QA engineer specializing in deterministic browser automation")).toBeVisible();

  await page.getByTestId("ai-tab-skills").click();
  await Promise.all([
    waitForApiCall(page, `/api/ai/suggest-skills/${cvId}`),
    page.getByTestId("ai-skills-submit").click(),
  ]);

  await expect(page.getByText("Release Engineering")).toBeVisible();

  await page.getByTestId("ai-tab-ats").click();
  await Promise.all([
    waitForApiCall(page, `/api/ai/ats-check/${cvId}`),
    page.getByTestId("ai-ats-submit").click(),
  ]);

  await expect(page.getByText("Recent roles need more quantified outcomes")).toBeVisible();
  await expect(page.getByText("Add metrics for test stability and release velocity")).toBeVisible();
});

test("renders mocked AI match, tailoring, and cover-letter outputs @smoke", async ({ page }) => {
  const cvId = await createCv(page, buildTestCvTitle(AI_TEST_CV_PREFIX));

  await page.route(`**/api/ai/job-match/${cvId}`, async (route) => {
    await route.fulfill({
      json: apiSuccess({
        matchScore: 84,
        matchingSkills: ["Playwright", "CI/CD"],
        missingSkills: ["Kubernetes"],
        keywordGaps: ["observability"],
        suggestions: ["Highlight release-risk reduction work"],
        summary: "Your background aligns well with the automation core of this role.",
      }),
    });
  });

  await page.route(`**/api/ai/tailor/${cvId}`, async (route) => {
    await route.fulfill({
      json: apiSuccess({
        suggestedSummary: "QA engineer focused on browser automation, resilient CI pipelines, and shipping confidence at scale.",
        skillsToAdd: ["Observability"],
        skillsToHighlight: ["Playwright"],
        experienceTips: [
          { company: "Playwright Labs", suggestion: "Emphasize flake reduction and release confidence metrics." },
        ],
        overallStrategy: "Center the CV around quality engineering impact and measurable release outcomes.",
      }),
    });
  });

  await page.route(`**/api/ai/cover-letter/${cvId}`, async (route) => {
    await route.fulfill({
      json: apiSuccess({
        coverLetter: "Dear Hiring Team, I build reliable browser automation systems that reduce release risk and improve developer confidence.",
      }),
    });
  });

  await openAiPanel(page);

  await page.getByTestId("ai-tab-match").click();
  await page.getByTestId("ai-match-job-description").fill("Need a QA engineer with Playwright, CI/CD, and observability experience.");
  await Promise.all([
    waitForApiCall(page, `/api/ai/job-match/${cvId}`),
    page.getByTestId("ai-match-submit").click(),
  ]);

  await expect(page.getByText("Your background aligns well with the automation core of this role.")).toBeVisible();
  await expect(page.getByText("Kubernetes")).toBeVisible();
  await expect(page.getByText(/^observability$/i)).toBeVisible();

  await page.getByTestId("ai-tab-tailor").click();
  await page.getByTestId("ai-tailor-job-description").fill("Need a QA engineer with Playwright, CI/CD, and observability experience.");
  await Promise.all([
    waitForApiCall(page, `/api/ai/tailor/${cvId}`),
    page.getByTestId("ai-tailor-submit").click(),
  ]);

  await expect(page.getByText("QA engineer focused on browser automation, resilient CI pipelines")).toBeVisible();
  await expect(page.getByText(/^\+ Observability$/)).toBeVisible();
  await expect(page.getByText("Center the CV around quality engineering impact and measurable release outcomes.")).toBeVisible();

  await page.getByTestId("ai-tab-cover").click();
  await page.getByTestId("ai-cover-job-description").fill("Need a QA engineer with Playwright, CI/CD, and observability experience.");
  await Promise.all([
    waitForApiCall(page, `/api/ai/cover-letter/${cvId}`),
    page.getByTestId("ai-cover-submit").click(),
  ]);

  await expect(page.getByText("Dear Hiring Team, I build reliable browser automation systems")).toBeVisible();
});
