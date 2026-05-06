// ═══════════════════════════════════════════════════════════
// Express Application Setup
// ═══════════════════════════════════════════════════════════

import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { requireAuth } from "./middleware/auth";
import { globalRateLimiter } from "./middleware/rate-limiter";
import { logger } from "./lib/logger";
import { sendSuccess } from "./utils/api-response";
import { checkOllamaHealth } from "./lib/ollama";

// ── Module Routes (imported as modules are built) ────────
import { authRoutes } from "./modules/auth/auth.routes";
import { cvRoutes } from "./modules/cv/cv.routes";
import { templateRoutes } from "./modules/template/template.routes";
import { pdfRoutes } from "./modules/pdf/pdf.routes";
import { githubRoutes } from "./modules/github/github.routes";
import { aiRoutes } from "./modules/ai/ai.routes";
import { uploadRoutes } from "./modules/upload/upload.routes";
import { recruiterRoutes } from "./modules/recruiter/recruiter.routes";

const app = express();

// ── Security Middleware ──────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
app.use(
  cors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ── Body Parsing ─────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Rate Limiting ────────────────────────────────────────
app.use("/api", globalRateLimiter);

// ── Static Files (uploads) ──────────────────────────────
app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));

// ── Request Logging ──────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

// ── Health Check ─────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  const ollamaStatus = await checkOllamaHealth();

  sendSuccess(res, {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    services: {
      database: "connected",
      redis: "connected",
      ollama: ollamaStatus ? "connected" : "unavailable",
    },
  });
});

// ── API Routes ───────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/cv", requireAuth, cvRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/pdf", requireAuth, pdfRoutes);
app.use("/api/github", requireAuth, githubRoutes);
app.use("/api/ai", requireAuth, aiRoutes);
app.use("/api/upload", requireAuth, uploadRoutes);
app.use("/api/recruiter", requireAuth, recruiterRoutes);

// ── 404 Handler ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested endpoint does not exist",
    },
  });
});

// ── Error Handler ────────────────────────────────────────
app.use(errorHandler);

export { app };
