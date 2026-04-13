import type { AuthPayload } from "@cvbuilder/shared";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export {};