// ═══════════════════════════════════════════════════════════
// PDF Export — Zod schemas
// ═══════════════════════════════════════════════════════════

import { z } from "zod";

export const generatePDFSchema = z.object({
  templateId: z.string().uuid().optional(),
  pageSize: z.enum(["A4", "LETTER", "LEGAL"]).default("A4"),
  margin: z.enum(["narrow", "normal", "wide"]).default("normal"),
  theme: z
    .object({
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      textColor: z.string().optional(),
      bgColor: z.string().optional(),
      headingFont: z.string().optional(),
      bodyFont: z.string().optional(),
      fontSize: z.number().optional(),
      layout: z.enum(["single", "two-column", "three-column"]).optional(),
    })
    .optional(),
});

export type GeneratePDFInput = z.infer<typeof generatePDFSchema>;

export const MARGINS = {
  narrow: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
  normal: { top: "0.75in", right: "0.75in", bottom: "0.75in", left: "0.75in" },
  wide: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
} as const;

export const PAGE_SIZES = {
  A4: { width: "210mm", height: "297mm" },
  LETTER: { width: "8.5in", height: "11in" },
  LEGAL: { width: "8.5in", height: "14in" },
} as const;
