// ═══════════════════════════════════════════════════════════
// Template Repository — Data access layer
// ═══════════════════════════════════════════════════════════

import { prisma } from "../../lib/prisma";
import type { Prisma } from "@prisma/client";

export const templateRepository = {
  async findAll(filters?: { category?: string; isActive?: boolean }) {
    const where: Prisma.TemplateWhereInput = {};

    if (filters?.category) {
      where.category = filters.category as Prisma.EnumTemplateCategoryFilter;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.template.findMany({
      where,
      orderBy: { name: "asc" },
    });
  },

  async findById(id: string) {
    return prisma.template.findUnique({ where: { id } });
  },

  async findBySlug(slug: string) {
    return prisma.template.findUnique({ where: { slug } });
  },
};
