import { pdfService } from "./pdf.service";
import { mintPrintToken } from "./pdf.token";
import { prisma } from "../../lib/prisma";
import puppeteer from "puppeteer";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    cV: { findFirst: jest.fn() },
    pDFExport: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("puppeteer", () => ({
  launch: jest.fn(),
}));

jest.mock("node:fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({ size: 2048 }),
}));

jest.mock("../../lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock("../../config/env", () => ({
  env: {
    UPLOAD_DIR: "./uploads",
    JWT_SECRET: "test-secret-value-12345",
    JWT_EXPIRES_IN: "7d",
    PRINT_BASE_URL: "http://localhost:5173",
    PDF_RENDER_TIMEOUT_MS: 30000,
    CORS_ORIGIN: "http://localhost:5173",
    NODE_ENV: "test",
  },
}));

const mockPrisma = prisma as unknown as {
  cV: { findFirst: jest.Mock };
  pDFExport: { create: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; delete: jest.Mock };
};
const mockLaunch = puppeteer.launch as jest.Mock;
const USER_ID = "00000000-0000-0000-0000-000000000001";

function mockBrowserPage() {
  const page = {
    setViewport: jest.fn().mockResolvedValue(undefined),
    goto: jest.fn().mockResolvedValue({ ok: () => true, status: () => 200 }),
    waitForFunction: jest.fn().mockResolvedValue(undefined),
    emulateMediaType: jest.fn().mockResolvedValue(undefined),
    pdf: jest.fn().mockResolvedValue(Buffer.from("pdf")),
  };
  const browser = { newPage: jest.fn().mockResolvedValue(page), close: jest.fn().mockResolvedValue(undefined) };
  mockLaunch.mockResolvedValue(browser);
  return { browser, page };
}

describe("pdfService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getExport", () => {
    it("returns an export by id", async () => {
      const mockExport = { id: "exp-1", filePath: "test.pdf" };
      mockPrisma.pDFExport.findFirst.mockResolvedValue(mockExport);
      await expect(pdfService.getExport(USER_ID, "exp-1")).resolves.toEqual(mockExport);
    });

    it("throws for a non-existent export", async () => {
      mockPrisma.pDFExport.findFirst.mockResolvedValue(null);
      await expect(pdfService.getExport(USER_ID, "nope")).rejects.toThrow();
    });
  });

  describe("listExports", () => {
    it("lists exports for a CV scoped to the user", async () => {
      mockPrisma.pDFExport.findMany.mockResolvedValue([{ id: "1" }, { id: "2" }]);
      const result = await pdfService.listExports(USER_ID, "cv-1");
      expect(result).toHaveLength(2);
      expect(mockPrisma.pDFExport.findMany).toHaveBeenCalledWith({
        where: { cvId: "cv-1", cv: { is: { userId: USER_ID } } },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("deleteExport", () => {
    it("deletes the export record and its file", async () => {
      mockPrisma.pDFExport.findFirst.mockResolvedValue({ id: "exp-1", filePath: "./uploads/pdfs/test.pdf" });
      mockPrisma.pDFExport.delete.mockResolvedValue({ id: "exp-1" });
      await pdfService.deleteExport(USER_ID, "exp-1");
      expect(mockPrisma.pDFExport.delete).toHaveBeenCalledWith({ where: { id: "exp-1" } });
    });
  });

  describe("generate", () => {
    it("throws if the CV is not found", async () => {
      mockPrisma.cV.findFirst.mockResolvedValue(null);
      await expect(
        pdfService.generate(USER_ID, "nonexistent", { pageSize: "A4", margin: "normal" })
      ).rejects.toThrow();
    });

    it("prints the chromeless /print route and records the export", async () => {
      mockPrisma.cV.findFirst.mockResolvedValue({
        id: "cv-1",
        slug: "jane-doe",
        locale: "tr",
        template: { slug: "classic" },
      });
      mockPrisma.pDFExport.create.mockImplementation(({ data }) => Promise.resolve(data));
      const { page } = mockBrowserPage();

      const result = await pdfService.generate(USER_ID, "cv-1", {
        pageSize: "A4",
        margin: "normal",
        templateName: "modern",
      });

      // Navigated to the SAME preview route, carrying the signed print token.
      const gotoUrl = page.goto.mock.calls[0][0] as string;
      expect(gotoUrl).toContain("http://localhost:5173/print/cv-1");
      expect(gotoUrl).toContain("token=");

      // Waited for the preview to signal readiness before printing.
      expect(page.waitForFunction).toHaveBeenCalledWith(
        "window.__CV_READY__ === true",
        expect.anything()
      );
      expect(page.emulateMediaType).toHaveBeenCalledWith("print");
      expect(page.pdf).toHaveBeenCalled();
      expect(result.fileName).toContain("jane-doe");
      expect(result.fileSize).toBe(2048);
    });

    it("fails clearly when the print page is unreachable", async () => {
      mockPrisma.cV.findFirst.mockResolvedValue({ id: "cv-1", slug: "x", locale: "en", template: { slug: "modern" } });
      const { page } = mockBrowserPage();
      page.goto.mockResolvedValue({ ok: () => false, status: () => 502 });

      await expect(
        pdfService.generate(USER_ID, "cv-1", { pageSize: "A4", margin: "normal" })
      ).rejects.toThrow();
    });
  });

  describe("getRenderData", () => {
    it("returns CV detail + render options for a valid print token", async () => {
      const cv = { id: "cv-1", locale: "tr", template: { slug: "classic" }, projects: [] };
      mockPrisma.cV.findFirst.mockResolvedValue(cv);
      const token = mintPrintToken({ userId: USER_ID, cvId: "cv-1", templateName: "modern", locale: "tr" });

      const data = await pdfService.getRenderData(token);
      expect(data.cv).toBe(cv);
      expect(data.templateName).toBe("modern");
      expect(data.locale).toBe("tr");
      expect(mockPrisma.cV.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "cv-1", userId: USER_ID } })
      );
    });

    it("rejects an invalid or missing token before touching the database", async () => {
      await expect(pdfService.getRenderData("tampered")).rejects.toThrow();
      await expect(pdfService.getRenderData(undefined)).rejects.toThrow();
      expect(mockPrisma.cV.findFirst).not.toHaveBeenCalled();
    });

    it("throws when the token is valid but the CV is gone", async () => {
      mockPrisma.cV.findFirst.mockResolvedValue(null);
      const token = mintPrintToken({ userId: USER_ID, cvId: "cv-1" });
      await expect(pdfService.getRenderData(token)).rejects.toThrow();
    });
  });
});
