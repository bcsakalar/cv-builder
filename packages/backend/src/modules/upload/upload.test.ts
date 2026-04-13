import { uploadService } from "./upload.service";
import { prisma } from "../../lib/prisma";
import { cacheDelete } from "../../lib/redis";
import fs from "node:fs/promises";
import sharp from "sharp";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    cV: {
      findFirst: jest.fn(),
    },
    personalInfo: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("node:fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("sharp", () => {
  const mockSharp = {
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
  };
  return jest.fn(() => mockSharp);
});

jest.mock("../../config/env", () => ({
  env: { UPLOAD_DIR: "./uploads" },
}));

jest.mock("../../lib/redis", () => ({
  cacheDelete: jest.fn().mockResolvedValue(undefined),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCacheDelete = cacheDelete as jest.MockedFunction<typeof cacheDelete>;
const USER_ID = "00000000-0000-0000-0000-000000000001";
const mockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname: "photo",
  originalname: "photo.jpg",
  encoding: "7bit",
  mimetype: "image/jpeg",
  size: 1024 * 100,
  buffer: Buffer.from("fake-image"),
  destination: "",
  filename: "",
  path: "",
  stream: null as never,
  ...overrides,
});

describe("uploadService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("uploadProfilePhoto", () => {
    it("should process and upload a photo", async () => {
      const file = mockFile();
      (mockPrisma.cV.findFirst as jest.Mock).mockResolvedValue({ id: "cv-123" });
      (mockPrisma.personalInfo.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.personalInfo.upsert as jest.Mock).mockResolvedValue({ id: "pi-1" });

      const result = await uploadService.uploadProfilePhoto(USER_ID, "cv-123", file);

      expect(result.url).toContain("/uploads/photos/cv-123-");
      expect(result.thumbnail).toContain("-thumb.webp");
      expect(sharp).toHaveBeenCalledWith(file.buffer);
      expect(fs.mkdir).toHaveBeenCalled();
      expect(mockCacheDelete).toHaveBeenCalledWith(`cv:${USER_ID}:cv-123`);
    });

    it("should reject invalid MIME type", async () => {
      const file = mockFile({ mimetype: "application/pdf" });
      (mockPrisma.cV.findFirst as jest.Mock).mockResolvedValue({ id: "cv-123" });

      await expect(
        uploadService.uploadProfilePhoto(USER_ID, "cv-123", file)
      ).rejects.toThrow("Invalid file type");
    });

    it("should reject oversized files", async () => {
      const file = mockFile({ size: 10 * 1024 * 1024 });
      (mockPrisma.cV.findFirst as jest.Mock).mockResolvedValue({ id: "cv-123" });

      await expect(
        uploadService.uploadProfilePhoto(USER_ID, "cv-123", file)
      ).rejects.toThrow("File too large");
    });

    it("should clean up old photo", async () => {
      const file = mockFile();
      (mockPrisma.cV.findFirst as jest.Mock).mockResolvedValue({ id: "cv-123" });
      (mockPrisma.personalInfo.findUnique as jest.Mock).mockResolvedValue({
        profilePhotoUrl: "/uploads/photos/old.webp",
      });
      (mockPrisma.personalInfo.upsert as jest.Mock).mockResolvedValue({ id: "pi-1" });

      await uploadService.uploadProfilePhoto(USER_ID, "cv-123", file);

      expect(fs.unlink).toHaveBeenCalled();
    });
  });

  describe("deleteProfilePhoto", () => {
    it("should delete photo and update DB", async () => {
      (mockPrisma.cV.findFirst as jest.Mock).mockResolvedValue({ id: "cv-123" });
      (mockPrisma.personalInfo.findUnique as jest.Mock).mockResolvedValue({
        profilePhotoUrl: "/uploads/photos/test.webp",
      });
      (mockPrisma.personalInfo.update as jest.Mock).mockResolvedValue({ id: "pi-1" });

      const result = await uploadService.deleteProfilePhoto(USER_ID, "cv-123");

      expect(result.success).toBe(true);
      expect(mockPrisma.personalInfo.update).toHaveBeenCalledWith({
        where: { cvId: "cv-123" },
        data: { profilePhotoUrl: null },
      });
      expect(mockCacheDelete).toHaveBeenCalledWith(`cv:${USER_ID}:cv-123`);
    });

    it("should handle no existing photo", async () => {
      (mockPrisma.cV.findFirst as jest.Mock).mockResolvedValue({ id: "cv-123" });
      (mockPrisma.personalInfo.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await uploadService.deleteProfilePhoto(USER_ID, "cv-123");

      expect(result.success).toBe(true);
      expect(mockPrisma.personalInfo.update).not.toHaveBeenCalled();
      expect(mockCacheDelete).toHaveBeenCalledWith(`cv:${USER_ID}:cv-123`);
    });
  });
});
