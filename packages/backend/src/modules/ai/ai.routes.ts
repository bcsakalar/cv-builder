// ═══════════════════════════════════════════════════════════
// AI Routes
// ═══════════════════════════════════════════════════════════

import { Router } from "express";
import { aiController } from "./ai.controller";
import { asyncHandler } from "../../middleware/async-handler";

const router = Router();

// Health
router.get("/health", asyncHandler(aiController.health));

// Summary
router.post("/summary/:cvId", asyncHandler(aiController.generateSummary));
router.get("/summary/:cvId/stream", asyncHandler(aiController.generateSummaryStream));

// Experience
router.post("/improve-experience", asyncHandler(aiController.improveExperience));

// Project
router.post("/improve-project", asyncHandler(aiController.improveProject));

// Skills
router.post("/suggest-skills/:cvId", asyncHandler(aiController.suggestSkills));

// ATS check
router.post("/ats-check/:cvId", asyncHandler(aiController.atsCheck));

// Cover letter
router.post("/cover-letter/:cvId", asyncHandler(aiController.generateCoverLetter));

// CV Review (comprehensive)
router.post("/review/:cvId", asyncHandler(aiController.reviewCV));

// Job Match analysis
router.post("/job-match/:cvId", asyncHandler(aiController.jobMatch));

// Tailor CV for job
router.post("/tailor/:cvId", asyncHandler(aiController.tailorCV));

// GitHub profile summary
router.post("/github-summary", asyncHandler(aiController.githubProfileSummary));

export { router as aiRoutes };
