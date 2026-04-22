import { z } from "zod";

const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const stringBooleanToBoolean = (value: unknown) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
};

const nullableString = (maxLength: number) =>
  z.preprocess(emptyStringToNull, z.string().trim().max(maxLength).nullable().default(null));

const stringArraySchema = z
  .array(z.string().trim().min(1).max(80))
  .max(50)
  .default([])
  .transform((values) => values.map((value) => value.trim()));

export const recruiterJobIdParamSchema = z.object({
  jobId: z.string().uuid("Invalid job id"),
});

export const recruiterBatchIdParamSchema = z.object({
  batchId: z.string().uuid("Invalid batch id"),
});

export const recruiterCandidateIdParamSchema = z.object({
  candidateId: z.string().uuid("Invalid candidate id"),
});

export const createRecruiterJobSchema = z.object({
  title: z.string().trim().min(1, "Job title is required").max(200),
  company: nullableString(200),
  location: nullableString(200),
  locale: z.string().trim().min(2).max(5).default("en"),
  description: z.string().trim().min(40, "Job description should be at least 40 characters").max(20000),
  mustHaveSkills: stringArraySchema,
  niceToHaveSkills: stringArraySchema,
  minimumYearsExperience: z.preprocess(
    emptyStringToNull,
    z.coerce.number().min(0).max(60).nullable().default(null)
  ),
});

export const recruiterCandidateFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(["updatedAt", "overallScore", "yearsOfExperience", "completenessScore"])
    .default("overallScore"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.preprocess(emptyStringToUndefined, z.string().trim().max(120).optional()),
  recommendation: z.preprocess(
    emptyStringToUndefined,
    z.enum(["STRONG_MATCH", "POTENTIAL_MATCH", "WEAK_MATCH"]).optional()
  ),
  minScore: z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(0).max(100).optional()),
  hasBrokenLinks: z.preprocess(stringBooleanToBoolean, z.boolean().optional()),
  batchId: z.preprocess(emptyStringToUndefined, z.string().uuid().optional()),
});

export const reEvaluateCandidateSchema = z.object({
  force: z.boolean().default(true),
});

export type CreateRecruiterJobInput = z.infer<typeof createRecruiterJobSchema>;
export type RecruiterCandidateFiltersInput = z.infer<typeof recruiterCandidateFiltersSchema>;
export type ReEvaluateCandidateInput = z.infer<typeof reEvaluateCandidateSchema>;
