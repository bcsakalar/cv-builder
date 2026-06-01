// ═══════════════════════════════════════════════════════════
// Public Print Routes — token-gated, NO session auth.
// Consumed by the chromeless frontend /print page that headless Chrome
// loads while generating a PDF. Authorization is the signed print token.
// ═══════════════════════════════════════════════════════════

import { Router } from "express";
import { pdfController } from "./pdf.controller";
import { asyncHandler } from "../../middleware/async-handler";

const router = Router();

// GET /api/print/render-data?token=... — full CV detail + render options
router.get("/render-data", asyncHandler(pdfController.renderData));

export { router as printRoutes };
