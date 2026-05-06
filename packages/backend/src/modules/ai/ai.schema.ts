// ═══════════════════════════════════════════════════════════
// AI Validation Schemas
// ═══════════════════════════════════════════════════════════

import { z } from "zod";

export const aiToolKindSchema = z.enum([
  "summary",
  "skills",
  "ats",
  "review",
  "job_match",
  "tailor",
  "cover_letter",
  "github_profile_summary",
  "project_improvement",
  "experience_improvement",
]);

export const cvIdParamSchema = z.object({
  cvId: z.string().uuid("Invalid CV ID"),
});

export const artifactIdParamSchema = z.object({
  artifactId: z.string().uuid("Invalid artifact ID"),
});

export const improveExperienceBodySchema = z.object({
  description: z.string().trim().min(1),
  jobTitle: z.string().trim().min(1),
  company: z.string().trim().min(1),
});

export const improveProjectBodySchema = z.object({
  cvId: z.string().uuid("Invalid CV ID").optional(),
  projectId: z.string().uuid("Invalid project ID").optional(),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  technologies: z.array(z.string().trim()).default([]),
});

export const coverLetterToneSchema = z.enum(["formal", "conversational", "technical"]);

export const coverLetterBodySchema = z.object({
  jobDescription: z.string().trim().min(1).optional(),
  tone: coverLetterToneSchema.optional().default("formal"),
  alternatives: z.coerce.boolean().optional().default(false),
});

export const atsCheckBodySchema = z.object({
  jobDescription: z.string().trim().min(10).optional(),
});

export const jobMatchBodySchema = z.object({
  jobDescription: z.string().trim().min(10, "Job description must be at least 10 characters"),
});

export const tailorBodySchema = z.object({
  jobDescription: z.string().trim().min(10, "Job description must be at least 10 characters"),
});

export const artifactListQuerySchema = z.object({
  cvId: z.string().uuid("Invalid CV ID").optional(),
  tool: aiToolKindSchema.optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export type ImproveExperienceBody = z.infer<typeof improveExperienceBodySchema>;
export type ImproveProjectBody = z.infer<typeof improveProjectBodySchema>;
export type CoverLetterBody = z.infer<typeof coverLetterBodySchema>;
export type AtsCheckBody = z.infer<typeof atsCheckBodySchema>;
export type JobMatchBody = z.infer<typeof jobMatchBodySchema>;
export type TailorBody = z.infer<typeof tailorBodySchema>;
export type ArtifactListQuery = z.infer<typeof artifactListQuerySchema>;
