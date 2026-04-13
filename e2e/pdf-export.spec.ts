import { expect, test, type Page } from "@playwright/test";
import { cleanupCvsByTitlePrefix } from "./utils/api";
import { createCv } from "./utils/cv";
import { buildTestCvTitle, TEST_CV_PREFIX } from "./utils/env";
import { apiSuccess } from "./utils/mock-api";

const PDF_TEST_CV_PREFIX = `${TEST_CV_PREFIX}-pdf`;

function waitForApiCall(page: Page, pathFragment: string, method = "GET") {
  return page.waitForResponse((response) =>
    response.url().includes(pathFragment) &&
    response.request().method() === method &&
    response.ok()
  );
}

test.beforeEach(async ({ request }) => {
  await cleanupCvsByTitlePrefix(request, PDF_TEST_CV_PREFIX);
});

test.afterEach(async ({ request }) => {
  await cleanupCvsByTitlePrefix(request, PDF_TEST_CV_PREFIX);
});

test("generates, downloads, and deletes a mocked PDF export @smoke", async ({ page }) => {
  const cvId = await createCv(page, buildTestCvTitle(PDF_TEST_CV_PREFIX));
  let exportsList: Array<{ id: string; fileName: string; fileSize: number; createdAt: string }> = [];
  const generatedExport = {
    id: "pdf-export-1",
    fileName: "cvbuilder-export.pdf",
    fileSize: 24576,
    createdAt: "2026-04-12T12:00:00.000Z",
  };

  await page.route(`**/api/pdf/list/${cvId}`, async (route) => {
    await route.fulfill({ json: apiSuccess(exportsList) });
  });

  await page.route(`**/api/pdf/generate/${cvId}`, async (route) => {
    exportsList = [generatedExport];
    await route.fulfill({ json: apiSuccess(generatedExport) });
  });

  await page.route(`**/api/pdf/download/${generatedExport.id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: Buffer.from("%PDF-1.4\n% mocked pdf content"),
    });
  });

  await page.route(`**/api/pdf/${generatedExport.id}`, async (route) => {
    exportsList = [];
    await route.fulfill({ json: apiSuccess({}) });
  });

  await page.getByTestId("editor-pdf-toggle").click();
  await expect(page.getByText("PDF Export")).toBeVisible();

  await page.getByTestId("pdf-page-size").selectOption("LETTER");
  await page.getByTestId("pdf-margin").selectOption("wide");

  await Promise.all([
    waitForApiCall(page, `/api/pdf/generate/${cvId}`, "POST"),
    page.getByTestId("pdf-generate-button").click(),
  ]);

  await expect(page.getByTestId(`pdf-download-${generatedExport.id}`)).toBeVisible();

  await Promise.all([
    waitForApiCall(page, `/api/pdf/download/${generatedExport.id}`, "GET"),
    page.getByTestId(`pdf-download-${generatedExport.id}`).click(),
  ]);

  await Promise.all([
    waitForApiCall(page, `/api/pdf/${generatedExport.id}`, "DELETE"),
    page.getByTestId(`pdf-delete-${generatedExport.id}`).click(),
  ]);

  await expect(page.getByTestId(`pdf-download-${generatedExport.id}`)).not.toBeVisible();
});
