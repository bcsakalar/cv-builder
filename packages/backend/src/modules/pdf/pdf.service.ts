// ═══════════════════════════════════════════════════════════
// PDF Service — generates a PDF by printing the SAME chromeless /print
// page the user previews. Headless Chrome navigates to the frontend
// route (authorized by a short-lived signed print token), waits for the
// React preview + fonts to finish, then prints. This guarantees the PDF
// is a 1:1 replica of the live preview — there is no second renderer to
// drift out of sync.
// ═══════════════════════════════════════════════════════════

import puppeteer, { type Browser } from "puppeteer";
import path from "node:path";
import { mkdir, stat, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { env } from "../../config/env";
import { getPrimaryFrontendOrigin, normalizeOrigin } from "../../config/cors";
import { MARGINS, PAGE_SIZES, type GeneratePDFInput } from "./pdf.schema";
import { mintPrintToken, verifyPrintToken } from "./pdf.token";
import { logger } from "../../lib/logger";

const PDF_DIR = path.resolve(env.UPLOAD_DIR, "pdfs");

/** Public export so the controller/tests share one canonical PDF directory. */
export function getPdfDir(): string {
  return PDF_DIR;
}

async function ensurePDFDir() {
  await mkdir(PDF_DIR, { recursive: true });
}

function resolvePrintBaseUrl(): string {
  const base = env.PRINT_BASE_URL ?? getPrimaryFrontendOrigin(env);
  if (!base) {
    throw ApiError.serviceUnavailable(
      "PDF rendering is not configured: set PRINT_BASE_URL or CORS_ORIGIN to the frontend origin"
    );
  }
  return normalizeOrigin(base);
}

function buildPrintUrl(cvId: string, token: string): string {
  const url = new URL(`/print/${encodeURIComponent(cvId)}`, `${resolvePrintBaseUrl()}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

export const pdfService = {
  /**
   * Returns the full CV detail + render options for a verified print token.
   * Consumed by the public render-data endpoint that the /print page calls.
   */
  async getRenderData(token: string | undefined) {
    const payload = verifyPrintToken(token);

    const cv = await prisma.cV.findFirst({
      where: { id: payload.cvId, userId: payload.userId },
      include: {
        personalInfo: true,
        summary: true,
        coverLetter: true,
        experiences: { orderBy: { orderIndex: "asc" } },
        educations: { orderBy: { orderIndex: "asc" } },
        skills: { orderBy: { orderIndex: "asc" } },
        projects: { orderBy: { orderIndex: "asc" } },
        certifications: { orderBy: { orderIndex: "asc" } },
        languages: { orderBy: { orderIndex: "asc" } },
        volunteerExperiences: { orderBy: { orderIndex: "asc" } },
        publications: { orderBy: { orderIndex: "asc" } },
        awards: { orderBy: { orderIndex: "asc" } },
        references: { orderBy: { orderIndex: "asc" } },
        hobbies: { orderBy: { orderIndex: "asc" } },
        customSections: { orderBy: { orderIndex: "asc" } },
        template: true,
      },
    });

    if (!cv) throw ApiError.notFound("CV");

    return {
      cv,
      theme: payload.theme ?? null,
      templateName: payload.templateName ?? cv.template?.slug ?? "modern",
      locale: payload.locale ?? cv.locale ?? "en",
    };
  },

  async generate(userId: string, cvId: string, input: GeneratePDFInput) {
    // Confirm ownership before spending a browser launch on it.
    const cv = await prisma.cV.findFirst({
      where: { id: cvId, userId },
      select: { id: true, slug: true, locale: true, template: { select: { slug: true } } },
    });
    if (!cv) throw ApiError.notFound("CV not found");

    const token = mintPrintToken({
      userId,
      cvId,
      templateName: input.templateName ?? cv.template?.slug ?? undefined,
      theme: input.theme,
      pageSize: input.pageSize,
      margin: input.margin,
      locale: cv.locale ?? "en",
    });

    const printUrl = buildPrintUrl(cvId, token);
    const pageSize = PAGE_SIZES[input.pageSize];
    const margin = MARGINS[input.margin];

    await ensurePDFDir();
    const fileName = `${cv.slug ?? cv.id}-${Date.now()}.pdf`;
    const filePath = path.join(PDF_DIR, fileName);

    let browser: Browser | undefined;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      });
      const page = await browser.newPage();
      // Match the preview canvas: 96 DPI, A4-ish viewport so layout settles
      // before the print media query applies the real page dimensions.
      await page.setViewport({ width: 820, height: 1160, deviceScaleFactor: 2 });

      const response = await page.goto(printUrl, {
        waitUntil: "networkidle0",
        timeout: env.PDF_RENDER_TIMEOUT_MS,
      });
      if (response && !response.ok()) {
        throw new Error(`Print page returned HTTP ${response.status()}`);
      }

      // The print page flips this flag once data + fonts + paint are done.
      await page.waitForFunction("window.__CV_READY__ === true", {
        timeout: env.PDF_RENDER_TIMEOUT_MS,
      });

      await page.emulateMediaType("print");
      await page.pdf({
        path: filePath,
        width: pageSize.width,
        height: pageSize.height,
        margin,
        printBackground: true,
      });
    } catch (err) {
      logger.error("PDF generation failed", {
        error: err instanceof Error ? err.message : String(err),
        cvId,
      });
      throw ApiError.internal(
        "PDF generation failed. Ensure the application frontend is reachable for printing."
      );
    } finally {
      if (browser) await browser.close();
    }

    const stats = await stat(filePath);

    return prisma.pDFExport.create({
      data: {
        id: randomUUID(),
        fileName,
        filePath,
        fileSize: stats.size,
        cvId,
      },
    });
  },

  async getExport(userId: string, exportId: string) {
    const pdfExport = await prisma.pDFExport.findFirst({
      where: { id: exportId, cv: { is: { userId } } },
    });
    if (!pdfExport) throw ApiError.notFound("PDF export not found");
    return pdfExport;
  },

  async listExports(userId: string, cvId: string) {
    return prisma.pDFExport.findMany({
      where: { cvId, cv: { is: { userId } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async deleteExport(userId: string, exportId: string) {
    const pdfExport = await prisma.pDFExport.findFirst({
      where: { id: exportId, cv: { is: { userId } } },
    });
    if (!pdfExport) throw ApiError.notFound("PDF export not found");

    // Delete file from disk
    try {
      await unlink(pdfExport.filePath);
    } catch {
      logger.warn("PDF file not found on disk during delete", { exportId });
    }

    await prisma.pDFExport.delete({ where: { id: exportId } });
  },
};
