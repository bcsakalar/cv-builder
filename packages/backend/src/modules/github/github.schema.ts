// ═══════════════════════════════════════════════════════════
// GitHub — Zod schemas
// ═══════════════════════════════════════════════════════════

import { z } from "zod";

export const connectGitHubSchema = z.object({
  token: z.string().min(1, "GitHub token is required"),
});

export type ConnectGitHubInput = z.infer<typeof connectGitHubSchema>;

export const analyzeRepoSchema = z.object({
  repoFullName: z.string().regex(/^[^/]+\/[^/]+$/, "Must be owner/repo format"),
});

export type AnalyzeRepoInput = z.infer<typeof analyzeRepoSchema>;

export const importToCVSchema = z.object({
  analysisId: z.string().uuid("Invalid analysis ID"),
});

export type ImportToCVInput = z.infer<typeof importToCVSchema>;

export const bulkImportToCVSchema = z.object({
  analysisIds: z.array(z.string().uuid()).min(1, "At least one analysis ID is required"),
});

export type BulkImportToCVInput = z.infer<typeof bulkImportToCVSchema>;
