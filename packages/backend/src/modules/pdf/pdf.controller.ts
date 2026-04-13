// ═══════════════════════════════════════════════════════════
// PDF Controller — Request handling layer
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from "express";
import { requireAuthUser } from "../../middleware/auth";
import { pdfService } from "./pdf.service";
import { generatePDFSchema } from "./pdf.schema";
import { sendCreated, sendSuccess } from "../../utils/api-response";
import { ApiError } from "../../utils/api-error";
import path from "node:path";

function currentUserId(req: Request): string {
  return requireAuthUser(req).userId;
}

export const pdfController = {
  async generate(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    if (!cvId) throw ApiError.badRequest("cvId is required");

    const input = generatePDFSchema.parse(req.body);
    const pdfExport = await pdfService.generate(currentUserId(req), cvId, input);

    sendCreated(res, {
      id: pdfExport.id,
      fileName: pdfExport.fileName,
      fileSize: pdfExport.fileSize,
      createdAt: pdfExport.createdAt,
    });
  },

  async download(req: Request, res: Response) {
    const exportId = req.params.exportId as string;
    if (!exportId) throw ApiError.badRequest("exportId is required");

    const pdfExport = await pdfService.getExport(currentUserId(req), exportId);

    // Security: ensure the file path is within the upload directory
    const resolvedPath = path.resolve(pdfExport.filePath);
    if (!resolvedPath.includes(path.sep + "pdfs" + path.sep)) {
      throw ApiError.forbidden("Invalid file path");
    }

    res.download(resolvedPath, pdfExport.fileName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ success: false, error: { code: "DOWNLOAD_ERROR", message: "File download failed" } });
      }
    });
  },

  async list(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    if (!cvId) throw ApiError.badRequest("cvId is required");

    const exports = await pdfService.listExports(currentUserId(req), cvId);
    sendSuccess(res, exports);
  },

  async remove(req: Request, res: Response) {
    const exportId = req.params.exportId as string;
    if (!exportId) throw ApiError.badRequest("exportId is required");

    await pdfService.deleteExport(currentUserId(req), exportId);
    sendSuccess(res, { deleted: true });
  },
};
