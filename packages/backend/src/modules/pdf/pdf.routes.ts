// ═══════════════════════════════════════════════════════════
// PDF Routes
// ═══════════════════════════════════════════════════════════

import { Router } from "express";
import { pdfController } from "./pdf.controller";
import { asyncHandler } from "../../middleware/async-handler";

const router = Router();

// POST /api/pdf/generate/:cvId — Generate PDF for a CV
router.post("/generate/:cvId", asyncHandler(pdfController.generate));

// GET /api/pdf/download/:exportId — Download generated PDF
router.get("/download/:exportId", asyncHandler(pdfController.download));

// GET /api/pdf/list/:cvId — List exports for a CV
router.get("/list/:cvId", asyncHandler(pdfController.list));

// DELETE /api/pdf/:exportId — Delete a PDF export
router.delete("/:exportId", asyncHandler(pdfController.remove));

export { router as pdfRoutes };
