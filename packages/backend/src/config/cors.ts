import type { CorsOptions } from "cors";
import type { Env } from "./env";

const DEV_LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

export function getConfiguredOrigins(corsOrigin: string): string[] {
  return [...new Set(
    corsOrigin
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
      .map(normalizeOrigin)
  )];
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  config: Pick<Env, "CORS_ORIGIN" | "NODE_ENV">
): boolean {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  const configuredOrigins = getConfiguredOrigins(config.CORS_ORIGIN);

  if (configuredOrigins.includes(normalizedOrigin)) {
    return true;
  }

  return config.NODE_ENV === "development" && DEV_LOCALHOST_ORIGIN_PATTERN.test(normalizedOrigin);
}

export function getPrimaryFrontendOrigin(
  config: Pick<Env, "CORS_ORIGIN" | "NODE_ENV">,
  requestedOrigin?: string
): string {
  if (requestedOrigin && isAllowedCorsOrigin(requestedOrigin, config)) {
    return normalizeOrigin(requestedOrigin);
  }

  const [configuredOrigin] = getConfiguredOrigins(config.CORS_ORIGIN);
  if (configuredOrigin) {
    return configuredOrigin;
  }

  return config.NODE_ENV === "development" ? "http://localhost:5173" : "";
}

export function buildCorsOriginOption(
  config: Pick<Env, "CORS_ORIGIN" | "NODE_ENV">
): CorsOptions["origin"] {
  return (origin, callback) => {
    if (isAllowedCorsOrigin(origin ?? undefined, config)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Not allowed by CORS: ${origin ?? "unknown-origin"}`));
  };
}