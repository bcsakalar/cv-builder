import { formatDate } from "@cvbuilder/shared";
import { translateForLocale } from "@/i18n/helpers";

function normalizeLocale(locale?: string): string {
  if (!locale) return "en-US";
  if (locale.includes("-")) return locale;

  switch (locale) {
    case "tr":
      return "tr-TR";
    case "en":
      return "en-US";
    default:
      return locale;
  }
}

function getCurrentLabel(locale?: string): string {
  return translateForLocale(locale, "common.present");
}

function asDateString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function formatPreviewDate(value: unknown, locale?: string): string {
  const date = asDateString(value);

  if (!date) return "";

  if (/^\d{4}-\d{2}(-\d{2})?$/.test(date)) {
    return formatDate(date, normalizeLocale(locale));
  }

  return date;
}

export function formatPreviewDateRange(
  startDate: unknown,
  endDate: unknown,
  isCurrent = false,
  locale?: string,
): string {
  const start = formatPreviewDate(startDate, locale);

  if (!start) return "";

  const end = formatPreviewDate(endDate, locale);

  if (isCurrent || !end) {
    return `${start} – ${getCurrentLabel(locale)}`;
  }

  return `${start} – ${end}`;
}