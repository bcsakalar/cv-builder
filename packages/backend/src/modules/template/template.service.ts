// ═══════════════════════════════════════════════════════════
// Template Service — Business logic layer
// ═══════════════════════════════════════════════════════════

import { templateRepository } from "./template.repository";
import { ApiError } from "../../utils/api-error";
import { cacheGet, cacheSet } from "../../lib/redis";

export const templateService = {
  async getAll(filters?: { category?: string; isActive?: boolean }) {
    const cacheKeyStr = `templates:${JSON.stringify(filters ?? {})}`;
    const cached = await cacheGet(cacheKeyStr);
    if (cached) return cached;

    const templates = await templateRepository.findAll(filters);
    await cacheSet(cacheKeyStr, templates, 3600); // 1 hour
    return templates;
  },

  async getById(id: string) {
    const cached = await cacheGet(`template:${id}`);
    if (cached) return cached;

    const template = await templateRepository.findById(id);
    if (!template) throw ApiError.notFound("Template");

    await cacheSet(`template:${id}`, template, 3600);
    return template;
  },
};
