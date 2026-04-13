// ═══════════════════════════════════════════════════════════
// PDF Service — PDF generation using Puppeteer
// ═══════════════════════════════════════════════════════════

import puppeteer from "puppeteer";
import path from "node:path";
import { mkdir, stat, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { env } from "../../config/env";
import { renderCVToHTML } from "./pdf.templates";
import { MARGINS, PAGE_SIZES, type GeneratePDFInput } from "./pdf.schema";
import { logger } from "../../lib/logger";

const PDF_DIR = path.resolve(env.UPLOAD_DIR, "pdfs");

async function ensurePDFDir() {
  await mkdir(PDF_DIR, { recursive: true });
}

export const pdfService = {
  async generate(userId: string, cvId: string, input: GeneratePDFInput) {
    // Fetch the full CV with relations
    const cv = await prisma.cV.findFirst({
      where: { id: cvId, userId },
      include: {
        personalInfo: true,
        summary: true,
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

    if (!cv) throw ApiError.notFound("CV not found");

    // Determine template name
    const templateName = cv.template?.slug ?? "modern";

    // Render HTML
    const html = renderCVToHTML(cv, templateName, input.theme);

    // Configure page size & margins
    const pageSize = PAGE_SIZES[input.pageSize];
    const margin = MARGINS[input.margin];

    // Launch Puppeteer and generate PDF
    await ensurePDFDir();
    const fileName = `${cv.slug ?? cv.id}-${Date.now()}.pdf`;
    const filePath = path.join(PDF_DIR, fileName);

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      await page.pdf({
        path: filePath,
        width: pageSize.width,
        height: pageSize.height,
        margin,
        printBackground: true,
      });
    } catch (err) {
      logger.error("PDF generation failed", { error: err, cvId });
      throw ApiError.internal("PDF generation failed");
    } finally {
      if (browser) await browser.close();
    }

    // Get file size
    const stats = await stat(filePath);

    // Save PDFExport record
    const pdfExport = await prisma.pDFExport.create({
      data: {
        id: randomUUID(),
        fileName,
        filePath,
        fileSize: stats.size,
        cvId,
      },
    });

    return pdfExport;
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
