import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { Router } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { recruiterController } from "./recruiter.controller";
import {
  createRecruiterJobSchema,
  recruiterBatchIdParamSchema,
  recruiterCandidateFiltersSchema,
  recruiterCandidateIdParamSchema,
  recruiterJobIdParamSchema,
  reEvaluateCandidateSchema,
} from "./recruiter.schema";

const router = Router();
const recruiterUploadsDir = path.join(env.UPLOAD_DIR, "candidate-cvs", "incoming");
fs.mkdirSync(recruiterUploadsDir, { recursive: true });

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, "-").replace(/-+/g, "-");
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, recruiterUploadsDir);
  },
  filename: (_req, file, cb) => {
    const safeName = sanitizeFileName(file.originalname);
    const extension = path.extname(safeName) || ".pdf";
    const nameWithoutExtension = path.basename(safeName, extension).slice(0, 80) || "candidate";
    cb(null, `${Date.now()}-${crypto.randomUUID()}-${nameWithoutExtension}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: env.RECRUITER_MAX_PDF_SIZE,
    files: env.RECRUITER_MAX_BATCH_FILES,
  },
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === "application/pdf";
    const isPdfName = file.originalname.toLowerCase().endsWith(".pdf");
    if (isPdfMime || isPdfName) {
      cb(null, true);
      return;
    }

    cb(new Error("Only PDF files are allowed"));
  },
});

router.post(
  "/jobs",
  validate({ body: createRecruiterJobSchema }),
  asyncHandler(recruiterController.createJob)
);

router.get(
  "/jobs",
  asyncHandler(recruiterController.listJobs)
);

router.get(
  "/jobs/:jobId",
  validate({ params: recruiterJobIdParamSchema }),
  asyncHandler(recruiterController.getJob)
);

router.post(
  "/jobs/:jobId/batches",
  validate({ params: recruiterJobIdParamSchema }),
  upload.array("files", env.RECRUITER_MAX_BATCH_FILES),
  asyncHandler(recruiterController.createBatch)
);

router.get(
  "/batches/:batchId",
  validate({ params: recruiterBatchIdParamSchema }),
  asyncHandler(recruiterController.getBatch)
);

router.get(
  "/jobs/:jobId/candidates",
  validate({ params: recruiterJobIdParamSchema, query: recruiterCandidateFiltersSchema }),
  asyncHandler(recruiterController.listCandidates)
);

router.get(
  "/candidates/:candidateId",
  validate({ params: recruiterCandidateIdParamSchema }),
  asyncHandler(recruiterController.getCandidate)
);

router.post(
  "/candidates/:candidateId/re-evaluate",
  validate({ params: recruiterCandidateIdParamSchema, body: reEvaluateCandidateSchema }),
  asyncHandler(recruiterController.reEvaluateCandidate)
);

export { router as recruiterRoutes };
