// ═══════════════════════════════════════════════════════════
// Print Token — short-lived signed token authorizing the chromeless
// /print page (and the public render-data endpoint it calls) to read a
// single CV. Headless Chrome has no user session, so authorization is
// carried entirely by this token: it is signed with JWT_SECRET, bound to
// {userId, cvId}, and expires within seconds.
// ═══════════════════════════════════════════════════════════

import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env";
import { ApiError } from "../../utils/api-error";

/** Render options the print page needs to mirror the live preview exactly. */
export const printTokenPayloadSchema = z.object({
  userId: z.string().min(1),
  cvId: z.string().min(1),
  templateName: z.string().min(1).optional(),
  theme: z.record(z.unknown()).optional(),
  pageSize: z.enum(["A4", "LETTER", "LEGAL"]).optional(),
  margin: z.enum(["narrow", "normal", "wide"]).optional(),
  locale: z.string().optional(),
});

export type PrintTokenPayload = z.infer<typeof printTokenPayloadSchema>;

const PRINT_TOKEN_TTL_SECONDS = 120;
const PRINT_TOKEN_SUBJECT = "cv-print";

export function mintPrintToken(payload: PrintTokenPayload): string {
  const options: SignOptions = {
    expiresIn: PRINT_TOKEN_TTL_SECONDS,
    subject: PRINT_TOKEN_SUBJECT,
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyPrintToken(token: string | undefined | null): PrintTokenPayload {
  if (!token || typeof token !== "string") {
    throw ApiError.unauthorized("Missing print token");
  }

  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { subject: PRINT_TOKEN_SUBJECT });
  } catch {
    // Covers expired, malformed, wrong-subject, and tampered tokens.
    throw ApiError.unauthorized("Invalid or expired print token");
  }

  const parsed = printTokenPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw ApiError.unauthorized("Malformed print token");
  }

  return parsed.data;
}
