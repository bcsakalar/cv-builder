import type { Request, Response, NextFunction } from "express";
import { requireAuthUser } from "../../middleware/auth";
import { uploadService } from "./upload.service";
import { sendSuccess, sendError } from "../../utils/api-response";
import { uploadPhotoSchema } from "./upload.schema";

function currentUserId(req: Request): string {
  return requireAuthUser(req).userId;
}

export const uploadController = {
  async uploadPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const { cvId } = uploadPhotoSchema.parse(req.params);

      if (!req.file) {
        return sendError(res, 400, "NO_FILE", "No file uploaded");
      }

      const result = await uploadService.uploadProfilePhoto(currentUserId(req), cvId, req.file);
      sendSuccess(res, result, "Profile photo uploaded");
    } catch (error) {
      next(error);
    }
  },

  async deletePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const { cvId } = uploadPhotoSchema.parse(req.params);
      const result = await uploadService.deleteProfilePhoto(currentUserId(req), cvId);
      sendSuccess(res, result, "Profile photo deleted");
    } catch (error) {
      next(error);
    }
  },
};
