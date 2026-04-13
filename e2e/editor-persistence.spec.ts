import { expect, test } from "@playwright/test";
import { cleanupCvsByTitlePrefix } from "./utils/api";
import { addEducation, addExperience, addSkill, createCv, openSection, openThemeCustomizer, selectEditorTemplate, updateThemeColor } from "./utils/cv";
import { buildTestCvTitle, TEST_CV_PREFIX } from "./utils/env";

const EDITOR_TEST_CV_PREFIX = `${TEST_CV_PREFIX}-editor`;

test.beforeEach(async ({ request }) => {
  await cleanupCvsByTitlePrefix(request, EDITOR_TEST_CV_PREFIX);
});

test.afterEach(async ({ request }) => {
  await cleanupCvsByTitlePrefix(request, EDITOR_TEST_CV_PREFIX);
});

test("persists template selection and theme customization across reload @smoke", async ({ page }) => {
  const title = buildTestCvTitle(EDITOR_TEST_CV_PREFIX);
  const cvId = await createCv(page, title);

  await selectEditorTemplate(page, cvId, "Classic Professional");
  await openThemeCustomizer(page);
  await updateThemeColor(page, cvId, "primaryColor", "#123456");

  await page.reload();

  await expect(page.getByTestId("editor-template-select").locator("option:checked")).toHaveText("Classic Professional");
  await openThemeCustomizer(page);
  await expect(page.getByTestId("theme-color-primaryColor")).toHaveValue("#123456");
});

test("persists multiple edited CV sections across reload @smoke", async ({ page }) => {
  const title = buildTestCvTitle(EDITOR_TEST_CV_PREFIX);
  const cvId = await createCv(page, title);

  await addExperience(page, cvId, {
    jobTitle: "Senior QA Engineer",
    company: "Playwright Labs",
    location: "Remote",
    startDate: "2024-01",
    description: "Built deterministic browser automation coverage for resume workflows.",
  });

  await addEducation(page, cvId, {
    degree: "BSc",
    fieldOfStudy: "Computer Engineering",
    institution: "Automation University",
    startDate: "2019-09",
  });

  await addSkill(page, cvId, {
    name: "Playwright",
    category: "TOOL",
    proficiencyLevel: "EXPERT",
    yearsOfExperience: 3,
  });

  await page.reload();

  await openSection(page, "Work Experience");
  await expect(page.getByText("Senior QA Engineer").first()).toBeVisible();
  await expect(page.getByText("Playwright Labs · Remote").first()).toBeVisible();

  await openSection(page, "Education");
  await expect(page.getByRole("heading", { name: "BSc" }).first()).toBeVisible();
  await expect(page.getByText("Computer Engineering").first()).toBeVisible();
  await expect(page.getByText("Automation University").first()).toBeVisible();

  await openSection(page, "Skills");
  await expect(page.getByText("Playwright").first()).toBeVisible();
  await expect(page.getByText(/expert/i).first()).toBeVisible();
});