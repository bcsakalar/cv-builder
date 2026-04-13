import { expect, test } from "@playwright/test";
import { cleanupCvsByTitlePrefix } from "./utils/api";
import {
  addAward,
  addCertification,
  addLanguage,
  addPublication,
  addReference,
  createCv,
  openSection,
} from "./utils/cv";
import { buildTestCvTitle, TEST_CV_PREFIX } from "./utils/env";

const SECTION_TEST_CV_PREFIX = `${TEST_CV_PREFIX}-sections`;

test.beforeEach(async ({ request }) => {
  await cleanupCvsByTitlePrefix(request, SECTION_TEST_CV_PREFIX);
});

test.afterEach(async ({ request }) => {
  await cleanupCvsByTitlePrefix(request, SECTION_TEST_CV_PREFIX);
});

test("creates validation-sensitive CV sections and preserves them after reload", async ({ page }) => {
  const title = buildTestCvTitle(SECTION_TEST_CV_PREFIX);
  const cvId = await createCv(page, title);

  await addCertification(page, cvId, {
    name: "AWS Certified Developer",
    issuingOrganization: "Amazon Web Services",
    issueDate: "2024-01-01",
  });

  await addLanguage(page, cvId, {
    name: "English",
    proficiency: "FULL_PROFESSIONAL",
  });

  await addPublication(page, cvId, {
    title: "Reliable Automation at Scale",
    publisher: "QA Weekly",
    date: "2024-05-01",
    description: "Explains how to stabilize browser-driven resume workflows.",
  });

  await addAward(page, cvId, {
    title: "Engineering Excellence Award",
    issuer: "CvBuilder",
    date: "2024-06-01",
  });

  await addReference(page, cvId, {
    name: "Jane Doe",
    company: "CvBuilder",
    title: "Engineering Manager",
    relationship: "Former manager",
    email: "jane.doe@example.com",
  });

  await page.reload();

  await openSection(page, "Certifications");
  await expect(page.getByText("AWS Certified Developer").first()).toBeVisible();
  await expect(page.getByText("Amazon Web Services").first()).toBeVisible();

  await openSection(page, "Languages");
  await expect(page.getByText("English").first()).toBeVisible();
  await expect(page.getByText("Full Professional").first()).toBeVisible();

  await openSection(page, "Publications");
  await expect(page.getByText("Reliable Automation at Scale").first()).toBeVisible();
  await expect(page.getByText("QA Weekly").first()).toBeVisible();

  await openSection(page, "Awards & Honors");
  await expect(page.getByText("Engineering Excellence Award").first()).toBeVisible();
  await expect(page.getByText("CvBuilder").first()).toBeVisible();

  await openSection(page, "References");
  await expect(page.getByText("Jane Doe").first()).toBeVisible();
  await expect(page.getByText("Engineering Manager at CvBuilder").first()).toBeVisible();
  await expect(page.getByText("jane.doe@example.com").first()).toBeVisible();
});