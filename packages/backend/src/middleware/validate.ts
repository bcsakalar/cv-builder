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
      // Express 5: req.query is a read-only getter, validate only
      schemas.query.parse(req.query);
    }

    next();
  };
}
