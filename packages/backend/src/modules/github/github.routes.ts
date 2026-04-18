// ═══════════════════════════════════════════════════════════
// GitHub Routes
// ═══════════════════════════════════════════════════════════

import { Router } from "express";
import { githubController } from "./github.controller";
import { asyncHandler } from "../../middleware/async-handler";

const router = Router();

// Connection management
router.post("/connect", asyncHandler(githubController.connect));
router.post("/disconnect", asyncHandler(githubController.disconnect));
router.get("/status", asyncHandler(githubController.status));

// Repos
router.get("/repos", asyncHandler(githubController.repos));
router.get("/repos/:owner/:repo", asyncHandler(githubController.repoDetails));

// Analysis
router.post("/analyze", asyncHandler(githubController.analyze));
router.get("/analyses", asyncHandler(githubController.getAnalyses));
router.get("/analyses/:id", asyncHandler(githubController.getAnalysis));
router.get("/analyses/:id/stream", asyncHandler(githubController.streamAnalysis));

// Import to CV
router.post("/import-preview", asyncHandler(githubController.importPreview));
router.post("/import/:cvId", asyncHandler(githubController.importToCV));
router.post("/import-bulk/:cvId", asyncHandler(githubController.bulkImportToCV));

export { router as githubRoutes };
