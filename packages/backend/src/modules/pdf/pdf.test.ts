import { pdfService } from "./pdf.service";
import { prisma } from "../../lib/prisma";

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
}));

jest.mock("../../config/env", () => ({
  env: { UPLOAD_DIR: "./uploads" },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const USER_ID = "00000000-0000-0000-0000-000000000001";

describe("pdfService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getExport", () => {
    it("should return an export by id", async () => {
      const mockExport = { id: "exp-1", filePath: "test.pdf" };
      (mockPrisma.pDFExport.findFirst as jest.Mock).mockResolvedValue(mockExport);

      const result = await pdfService.getExport(USER_ID, "exp-1");

      expect(result).toEqual(mockExport);
    });

    it("should throw ApiError for non-existent export", async () => {
      (mockPrisma.pDFExport.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(pdfService.getExport(USER_ID, "nonexistent")).rejects.toThrow();
    });
  });

  describe("listExports", () => {
    it("should list exports for a CV", async () => {
      const exports = [{ id: "1" }, { id: "2" }];
      (mockPrisma.pDFExport.findMany as jest.Mock).mockResolvedValue(exports);

      const result = await pdfService.listExports(USER_ID, "cv-1");

      expect(result).toHaveLength(2);
      expect(mockPrisma.pDFExport.findMany).toHaveBeenCalledWith({
        where: { cvId: "cv-1", cv: { is: { userId: USER_ID } } },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("deleteExport", () => {
    it("should delete export and file", async () => {
      (mockPrisma.pDFExport.findFirst as jest.Mock).mockResolvedValue({
        id: "exp-1",
        filePath: "./uploads/pdfs/test.pdf",
      });
      (mockPrisma.pDFExport.delete as jest.Mock).mockResolvedValue({ id: "exp-1" });

      await pdfService.deleteExport(USER_ID, "exp-1");

      expect(mockPrisma.pDFExport.delete).toHaveBeenCalledWith({
        where: { id: "exp-1" },
      });
    });
  });

  describe("generate", () => {
    it("should throw if CV not found", async () => {
      (mockPrisma.cV.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        pdfService.generate(USER_ID, "nonexistent", {})
      ).rejects.toThrow();
    });
  });
});
