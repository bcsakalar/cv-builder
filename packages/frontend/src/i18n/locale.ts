export const SUPPORTED_LOCALES = ["en", "tr"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export function normalizeAppLocale(value: unknown, fallback: AppLocale = "en"): AppLocale {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.toLowerCase();

  if (normalized.startsWith("tr")) {
    return "tr";
  }

  if (normalized.startsWith("en")) {
    return "en";
  }

  return fallback;
}