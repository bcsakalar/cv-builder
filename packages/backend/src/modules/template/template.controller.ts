// ═══════════════════════════════════════════════════════════
// Template Controller — Request handling layer
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from "express";
import { templateService } from "./template.service";
import { sendSuccess } from "../../utils/api-response";

export const templateController = {
  async getAll(req: Request, res: Response) {
    const templates = await templateService.getAll(req.query as any);
    sendSuccess(res, templates, "Templates retrieved successfully");
  },

  async getById(req: Request, res: Response) {
    const template = await templateService.getById(req.params.id as string);
    sendSuccess(res, template, "Template retrieved successfully");
  },
};
