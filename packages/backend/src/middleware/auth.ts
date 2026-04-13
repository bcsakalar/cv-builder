import type { NextFunction, Request, Response } from "express";
import type { AuthPayload } from "@cvbuilder/shared";
import { ApiError } from "../utils/api-error";
import { authService } from "../modules/auth/auth.service";

function extractBearerToken(req: Request): string | null {
  const header = req.get("Authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next(ApiError.unauthorized("Missing authentication token"));
    return;
  }

  req.auth = authService.verifyToken(token);
  next();
}

export function requireAuthUser(req: Request): AuthPayload {
  if (!req.auth) {
    throw ApiError.unauthorized("Authentication required");
  }

  return req.auth;
}