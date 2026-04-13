import { expect, test } from "@playwright/test";
import { cleanupCvsByTitlePrefix } from "./utils/api";
import { buildTestCvTitle, TEST_CV_PREFIX } from "./utils/env";
import { createCv, fillPersonalInfo, openSummarySection, waitForAutoSave } from "./utils/cv";

const CRUD_TEST_CV_PREFIX = `${TEST_CV_PREFIX}-crud`;

test.beforeEach(async ({ request }) => {
  await cleanupCvsByTitlePrefix(request, CRUD_TEST_CV_PREFIX);
});

test.afterEach(async ({ request }) => {
  await cleanupCvsByTitlePrefix(request, CRUD_TEST_CV_PREFIX);
});

test("validates required fields before creating a CV @smoke", async ({ page }) => {
  await page.goto("/cv/new");
  await expect(page).toHaveURL(/\/cv\/new$/);

  await page.getByRole("button", { name: "Create CV" }).click();

  await expect(page.getByText("Title is required")).toBeVisible();
  await expect(page.getByText("Template is required")).toBeVisible();
  await expect(page).toHaveURL(/\/cv\/new$/);
});

test("creates a CV, autosaves edits, survives reload, and deletes it from the list @smoke", async ({ page }) => {
  const title = buildTestCvTitle(CRUD_TEST_CV_PREFIX);
  const summary = `Playwright summary ${Date.now()}`;
  const personalInfo = {
    firstName: "Playwright",
    lastName: "Automation",
    professionalTitle: "QA Engineer",
    email: `playwright.${Date.now()}@example.com`,
  };

  await createCv(page, title);
  await fillPersonalInfo(page, personalInfo);
  await waitForAutoSave(page);

  await expect(page.locator('input[name="firstName"]').first()).toHaveValue(personalInfo.firstName);
  await expect(page.locator('input[name="email"]').first()).toHaveValue(personalInfo.email);

  await openSummarySection(page);
  await page.getByPlaceholder("Write a brief professional summary...").fill(summary);
  await waitForAutoSave(page);

  await expect(page.getByText(summary)).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/cv\/[^/]+\/edit$/);
  await expect(page.locator('input[name="firstName"]').first()).toHaveValue(personalInfo.firstName);
  await expect(page.locator('input[name="email"]').first()).toHaveValue(personalInfo.email);

  await openSummarySection(page);
  await expect(page.getByPlaceholder("Write a brief professional summary...")).toHaveValue(summary);
  await expect(page.getByText(summary)).toBeVisible();

  await page.goto("/cv");
  const cvCard = page.locator("div.rounded-lg.border.bg-card", { hasText: title }).first();

  await expect(cvCard).toBeVisible();

  page.once("dialog", (dialog) => {
    void dialog.accept();
  });

  await cvCard.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
});