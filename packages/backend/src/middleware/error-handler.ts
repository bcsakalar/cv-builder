// ═══════════════════════════════════════════════════════════
// Central Error Handler Middleware
// ═══════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error";
import { sendError } from "../utils/api-response";
import { logger } from "../lib/logger";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join(".");
      const key = path || "_root";
      if (!details[key]) {
        details[key] = [];
      }
      details[key].push(issue.message);
    }

    sendError(res, 400, "VALIDATION_ERROR", "Validation failed", details);
    return;
  }

  // Custom API errors
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, {
        code: err.code,
        stack: err.stack,
      });
    }

    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // Prisma known errors
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as Error & { code: string; meta?: Record<string, unknown> };

    switch (prismaErr.code) {
      case "P2002":
        sendError(res, 409, "CONFLICT", "A record with this value already exists");
        return;
      case "P2025":
        sendError(res, 404, "NOT_FOUND", "Record not found");
        return;
      default:
        logger.error("Prisma error", {
          code: prismaErr.code,
          meta: prismaErr.meta,
        });
        sendError(res, 500, "DATABASE_ERROR", "Database operation failed");
        return;
    }
  }

  // Unknown errors
  logger.error("Unhandled error", {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  sendError(
    res,
    500,
    "INTERNAL_ERROR",
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message
  );
}
