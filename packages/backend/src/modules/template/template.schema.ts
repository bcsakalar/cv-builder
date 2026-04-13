// ═══════════════════════════════════════════════════════════
// Template Validation Schemas (Zod)
// ═══════════════════════════════════════════════════════════

import { z } from "zod";

export const templateIdParamSchema = z.object({
  id: z.string().uuid("Invalid template ID"),
});

export const templateQuerySchema = z.object({
  category: z
    .enum([
      "PROFESSIONAL",
      "CREATIVE",
      "MODERN",
      "MINIMAL",
      "ACADEMIC",
      "TECHNICAL",
    ])
    .optional(),
  isActive: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

export type TemplateQuery = z.infer<typeof templateQuerySchema>;
