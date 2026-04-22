// ═══════════════════════════════════════════════════════════
// Zod Validation Middleware Factory
// ═══════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }

    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as Record<string, string>;
    }

    if (schemas.query) {
      const parsedQuery = schemas.query.parse(req.query);
      Object.defineProperty(req, "query", {
        value: parsedQuery,
        configurable: true,
        enumerable: true,
        writable: true,
      });
    }

    next();
  };
}
