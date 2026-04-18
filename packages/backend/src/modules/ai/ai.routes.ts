// ═══════════════════════════════════════════════════════════
// AI Routes
// ═══════════════════════════════════════════════════════════

import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { aiRateLimiter } from "../../middleware/rate-limiter";
import { validate } from "../../middleware/validate";
import { aiController } from "./ai.controller";
import {
  artifactIdParamSchema,
  artifactListQuerySchema,
  coverLetterBodySchema,
  cvIdParamSchema,
  improveExperienceBodySchema,
  improveProjectBodySchema,
  jobMatchBodySchema,
  tailorBodySchema,
} from "./ai.schema";

const router = Router();

router.get("/health", asyncHandler(aiController.health));
router.get("/artifacts", validate({ query: artifactListQuerySchema }), asyncHandler(aiController.listArtifacts));
router.post("/artifacts/:artifactId/apply", aiRateLimiter, validate({ params: artifactIdParamSchema }), asyncHandler(aiController.applyArtifact));
router.post("/artifacts/:artifactId/dismiss", validate({ params: artifactIdParamSchema }), asyncHandler(aiController.dismissArtifact));

router.post("/summary/:cvId", aiRateLimiter, validate({ params: cvIdParamSchema }), asyncHandler(aiController.generateSummary));
router.get("/summary/:cvId/stream", aiRateLimiter, validate({ params: cvIdParamSchema }), asyncHandler(aiController.generateSummaryStream));

router.post("/improve-experience", aiRateLimiter, validate({ body: improveExperienceBodySchema }), asyncHandler(aiController.improveExperience));
router.post("/improve-project", aiRateLimiter, validate({ body: improveProjectBodySchema }), asyncHandler(aiController.improveProject));

router.post("/suggest-skills/:cvId", aiRateLimiter, validate({ params: cvIdParamSchema }), asyncHandler(aiController.suggestSkills));
router.post("/ats-check/:cvId", aiRateLimiter, validate({ params: cvIdParamSchema }), asyncHandler(aiController.atsCheck));
router.post("/cover-letter/:cvId", aiRateLimiter, validate({ params: cvIdParamSchema, body: coverLetterBodySchema }), asyncHandler(aiController.generateCoverLetter));
router.post("/review/:cvId", aiRateLimiter, validate({ params: cvIdParamSchema }), asyncHandler(aiController.reviewCV));
router.post("/job-match/:cvId", aiRateLimiter, validate({ params: cvIdParamSchema, body: jobMatchBodySchema }), asyncHandler(aiController.jobMatch));
router.post("/tailor/:cvId", aiRateLimiter, validate({ params: cvIdParamSchema, body: tailorBodySchema }), asyncHandler(aiController.tailorCV));
router.post("/github-summary", aiRateLimiter, asyncHandler(aiController.githubProfileSummary));

export { router as aiRoutes };
