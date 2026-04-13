// ═══════════════════════════════════════════════════════════
// Template Routes
// ═══════════════════════════════════════════════════════════

import { Router } from "express";
import { templateController } from "./template.controller";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware/async-handler";
import { templateIdParamSchema, templateQuerySchema } from "./template.schema";

const router = Router();

router.get(
  "/",
  validate({ query: templateQuerySchema }),
  asyncHandler(templateController.getAll)
);

router.get(
  "/:id",
  validate({ params: templateIdParamSchema }),
  asyncHandler(templateController.getById)
);

export { router as templateRoutes };
