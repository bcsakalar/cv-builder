import { Router } from "express";
import multer from "multer";
import { uploadController } from "./upload.controller";
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from "./upload.schema";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: JPEG, PNG, WebP"));
    }
  },
});

const router = Router();

router.post("/photo/:cvId", upload.single("photo"), uploadController.uploadPhoto);
router.delete("/photo/:cvId", uploadController.deletePhoto);

export const uploadRoutes = router;
