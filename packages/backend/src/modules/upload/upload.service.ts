import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import { prisma } from "../../lib/prisma";
import { cacheDelete } from "../../lib/redis";
import { ApiError } from "../../utils/api-error";
import { env } from "../../config/env";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "./upload.schema";

const PHOTOS_DIR = path.join(env.UPLOAD_DIR, "photos");

function cacheKey(userId: string, cvId: string): string {
  return `cv:${userId}:${cvId}`;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function ensureCVAccess(userId: string, cvId: string): Promise<void> {
  const cv = await prisma.cV.findFirst({
    where: { id: cvId, userId },
    select: { id: true },
  });

  if (!cv) {
    throw ApiError.notFound("CV");
  }
}

export const uploadService = {
  async uploadProfilePhoto(userId: string, cvId: string, file: Express.Multer.File) {
    await ensureCVAccess(userId, cvId);

    // Validate MIME
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File too large. Maximum 5MB");
    }

    await ensureDir(PHOTOS_DIR);

    const timestamp = Date.now();
    const mainFilename = `${cvId}-${timestamp}.webp`;
    const thumbFilename = `${cvId}-${timestamp}-thumb.webp`;

    // Process with Sharp: main image 400x400, thumbnail 100x100
    await sharp(file.buffer)
      .resize(400, 400, { fit: "cover", position: "center" })
      .webp({ quality: 85 })
      .toFile(path.join(PHOTOS_DIR, mainFilename));

    await sharp(file.buffer)
      .resize(100, 100, { fit: "cover", position: "center" })
      .webp({ quality: 80 })
      .toFile(path.join(PHOTOS_DIR, thumbFilename));

    // Remove old photo if exists
    const existingInfo = await prisma.personalInfo.findUnique({
      where: { cvId },
      select: { profilePhotoUrl: true },
    });
    if (existingInfo?.profilePhotoUrl) {
      await this.deleteOldPhoto(existingInfo.profilePhotoUrl);
    }

    const photoUrl = `/uploads/photos/${mainFilename}`;

    // Update DB
    await prisma.personalInfo.upsert({
      where: { cvId },
      update: { profilePhotoUrl: photoUrl },
      create: {
        cvId,
        firstName: "",
        lastName: "",
        email: "",
        profilePhotoUrl: photoUrl,
      },
    });

    await cacheDelete(cacheKey(userId, cvId));

    // Clean up uploaded buffer file if stored on disk
    if (file.path) {
      await fs.unlink(file.path).catch(() => {});
    }

    return {
      url: photoUrl,
      thumbnail: `/uploads/photos/${thumbFilename}`,
    };
  },

  async deleteProfilePhoto(userId: string, cvId: string) {
    await ensureCVAccess(userId, cvId);

    const info = await prisma.personalInfo.findUnique({
      where: { cvId },
      select: { profilePhotoUrl: true },
    });

    if (info?.profilePhotoUrl) {
      await this.deleteOldPhoto(info.profilePhotoUrl);

      await prisma.personalInfo.update({
        where: { cvId },
        data: { profilePhotoUrl: null },
      });
    }

    await cacheDelete(cacheKey(userId, cvId));

    return { success: true };
  },

  async deleteOldPhoto(photoUrl: string) {
    const filename = path.basename(photoUrl);
    const mainPath = path.join(PHOTOS_DIR, filename);
    const thumbPath = path.join(PHOTOS_DIR, filename.replace(".webp", "-thumb.webp"));

    await fs.unlink(mainPath).catch(() => {});
    await fs.unlink(thumbPath).catch(() => {});
  },
};
