// ═══════════════════════════════════════════════════════════
// Recruiter — shared presentational primitives & helpers
// Extracted from the former monolith so the workbench, funnel, and
// comparison views share one consistent, well-designed visual language.
// ═══════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import type { CandidateEvaluationBreakdown, CandidateRecommendation, RecruiterBatchStatus } from "@cvbuilder/shared";

// ── Helpers ──────────────────────────────────────────────

export function parseSkillsInput(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(locale);
}

export function recommendationClass(recommendation?: CandidateRecommendation | null): string {
  switch (recommendation) {
    case "STRONG_MATCH":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "POTENTIAL_MATCH":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "WEAK_MATCH":
    default:
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
  }
}

export function batchStatusClass(status?: RecruiterBatchStatus | null): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "COMPLETED_WITH_ERRORS":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "FAILED":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
    case "PROCESSING":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
    case "PENDING":
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300";
  }
}

/** Per-factor bars shown in the candidate detail breakdown. */
export const scoreLabelMap: Array<{ key: keyof CandidateEvaluationBreakdown; tone: string }> = [
  { key: "mustHaveScore", tone: "bg-emerald-500" },
  { key: "keywordScore", tone: "bg-blue-500" },
  { key: "experienceScore", tone: "bg-indigo-500" },
  { key: "readabilityScore", tone: "bg-amber-500" },
  { key: "linkQualityScore", tone: "bg-cyan-500" },
  { key: "riskPenalty", tone: "bg-rose-500" },
];

/** Hex color for a 0–100 score (used by ScoreRing + funnel). */
export function scoreColor(value: number | null | undefined): string {
  if (typeof value !== "number") return "#94a3b8"; // slate-400
  if (value >= 75) return "#10b981"; // emerald-500
  if (value >= 50) return "#f59e0b"; // amber-500
  return "#f43f5e"; // rose-500
}

// ── Components ───────────────────────────────────────────

export function Chip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "danger" | "success" | "warning";
}) {
  const classes =
    tone === "danger"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
      : tone === "success"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        : tone === "warning"
          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          : "bg-muted text-muted-foreground";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}>{children}</span>;
}

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/**
 * Circular score gauge (0–100), color-graded. Replaces bare score numbers so
 * candidate quality is readable at a glance across the table and detail panel.
 */
export function ScoreRing({
  value,
  size = 56,
  stroke = 5,
}: {
  value: number | null | undefined;
  size?: number;
  stroke?: number;
}) {
  const v = typeof value === "number" ? Math.max(0, Math.min(100, Math.round(value))) : null;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = v === null ? circumference : circumference - (v / 100) * circumference;
  const color = scoreColor(v);
  const fontSize = Math.round(size * 0.3);

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={v === null ? "No score" : `Score ${v} of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted-foreground/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute font-bold tabular-nums" style={{ fontSize }}>
        {v === null ? "—" : v}
      </span>
    </div>
  );
}

/** Themed recommendation pill (Strong / Potential / Weak / pending). */
export function RecommendationBadge({
  recommendation,
  label,
}: {
  recommendation?: CandidateRecommendation | null;
  label: string;
}) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${recommendationClass(recommendation)}`}>
      {label}
    </span>
  );
}
