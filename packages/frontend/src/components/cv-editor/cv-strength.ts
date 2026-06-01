// ═══════════════════════════════════════════════════════════
// CV Strength — deterministic, instant CV quality scoring.
// No AI call: a transparent, weighted checklist (sums to 100) that guides
// the user toward a recruiter-ready CV. Pure + unit-tested so the meter is
// reliable and the same logic can power tooltips/badges elsewhere.
// ═══════════════════════════════════════════════════════════

import type { CVDetail } from "@/services/cv.api";

export type StrengthLevel = "low" | "medium" | "high";

export interface StrengthCheck {
  id: string;
  /** i18n key under `cvStrength.checks.*`. */
  labelKey: string;
  done: boolean;
  points: number;
}

export interface CVStrengthResult {
  /** 0–100 weighted score. */
  score: number;
  level: StrengthLevel;
  completedCount: number;
  totalCount: number;
  checks: StrengthCheck[];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasText(value: unknown, minLength = 1): boolean {
  return text(value).length >= minLength;
}

/** Detects metrics/achievements ("40%", "12 projects", "$2M") in a description. */
function looksQuantified(value: unknown): boolean {
  return /\d+\s*%|\$\s?\d|\b\d{2,}\b/.test(text(value));
}

/**
 * Computes a transparent CV strength score from the live CV data.
 * Weights sum to exactly 100.
 */
export function computeCVStrength(cv: CVDetail): CVStrengthResult {
  const pi = (cv.personalInfo ?? {}) as Record<string, unknown>;
  const experiences = (cv.experiences ?? []) as Array<Record<string, unknown>>;
  const summaryContent = text(cv.summary?.content);

  const expWithDescription = experiences.filter((exp) => hasText(exp.description, 40)).length;

  const checks: StrengthCheck[] = [
    { id: "name", labelKey: "cvStrength.checks.name", done: hasText(pi.firstName) && hasText(pi.lastName), points: 8 },
    { id: "title", labelKey: "cvStrength.checks.title", done: hasText(pi.professionalTitle), points: 7 },
    { id: "email", labelKey: "cvStrength.checks.email", done: hasText(pi.email), points: 5 },
    {
      id: "contact",
      labelKey: "cvStrength.checks.contact",
      done: hasText(pi.phone) || hasText(pi.city) || hasText(pi.country) || hasText(pi.location),
      points: 5,
    },
    {
      id: "links",
      labelKey: "cvStrength.checks.links",
      done: hasText(pi.website) || hasText(pi.github) || hasText(pi.linkedIn) || hasText(pi.linkedin),
      points: 5,
    },
    { id: "summary", labelKey: "cvStrength.checks.summary", done: summaryContent.length > 0, points: 10 },
    { id: "richSummary", labelKey: "cvStrength.checks.richSummary", done: summaryContent.length >= 200, points: 5 },
    { id: "experience", labelKey: "cvStrength.checks.experience", done: experiences.length > 0, points: 12 },
    {
      id: "expDescriptions",
      labelKey: "cvStrength.checks.expDescriptions",
      done: experiences.length > 0 && expWithDescription >= Math.ceil(experiences.length / 2),
      points: 8,
    },
    {
      id: "quantified",
      labelKey: "cvStrength.checks.quantified",
      done: experiences.some((exp) => looksQuantified(exp.description)),
      points: 7,
    },
    { id: "education", labelKey: "cvStrength.checks.education", done: (cv.educations ?? []).length > 0, points: 8 },
    { id: "skills", labelKey: "cvStrength.checks.skills", done: (cv.skills ?? []).length >= 5, points: 8 },
    { id: "project", labelKey: "cvStrength.checks.project", done: (cv.projects ?? []).length > 0, points: 7 },
    { id: "language", labelKey: "cvStrength.checks.language", done: (cv.languages ?? []).length > 0, points: 5 },
  ];

  const score = checks.reduce((sum, check) => sum + (check.done ? check.points : 0), 0);
  const completedCount = checks.filter((check) => check.done).length;
  const level: StrengthLevel = score >= 80 ? "high" : score >= 50 ? "medium" : "low";

  return { score, level, completedCount, totalCount: checks.length, checks };
}
