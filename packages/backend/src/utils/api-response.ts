// ═══════════════════════════════════════════════════════════
// Standardized API Response Builders
// ═══════════════════════════════════════════════════════════

import type { Response } from "express";
import type { ApiSuccessResponse, ApiErrorResponse, PaginationMeta } from "@cvbuilder/shared";

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  meta?: PaginationMeta
): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };

  res.status(200).json(response);
}

export function sendCreated<T>(res: Response, data: T, message?: string): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };

  res.status(201).json(response);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, string[]>
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  res.status(statusCode).json(response);
}
