import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle } from "lucide-react";
import type { CVDetail } from "@/services/cv.api";
import { computeCVStrength, type StrengthLevel } from "./cv-strength";

interface CVStrengthPanelProps {
  cv: CVDetail;
}

const LEVEL_COLOR: Record<StrengthLevel, { ring: string; bar: string; text: string }> = {
  low: { ring: "#f43f5e", bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  medium: { ring: "#f59e0b", bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  high: { ring: "#10b981", bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
};

/**
 * Live CV strength meter: a deterministic 0–100 score plus an actionable
 * checklist (biggest wins first). Updates instantly as the user edits — no
 * AI round-trip — complementing the AI "Review" with concrete next steps.
 */
export function CVStrengthPanel({ cv }: CVStrengthPanelProps) {
  const { t } = useTranslation();
  const result = useMemo(() => computeCVStrength(cv), [cv]);
  const color = LEVEL_COLOR[result.level];

  const todo = result.checks.filter((c) => !c.done).sort((a, b) => b.points - a.points);
  const done = result.checks.filter((c) => c.done);

  return (
    <div className="space-y-4" data-testid="cv-strength-panel">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t("cvStrength.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("cvStrength.subtitle")}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums" data-testid="cv-strength-score">
            <span className={color.text}>{result.score}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <span className={`text-xs font-medium ${color.text}`}>{t(`cvStrength.level.${result.level}`)}</span>
        </div>
      </div>

      <div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${color.bar}`}
            style={{ width: `${result.score}%`, transition: "width 0.5s ease" }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t("cvStrength.completed", { completed: result.completedCount, total: result.totalCount })}
        </p>
      </div>

      {todo.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("cvStrength.toImprove")}</p>
          {todo.map((check) => (
            <div key={check.id} className="flex items-center justify-between gap-2 rounded-lg border bg-background/60 px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <Circle size={15} className="shrink-0 text-muted-foreground/60" />
                {t(check.labelKey)}
              </span>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                +{check.points}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-3 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {t("cvStrength.allDone")}
        </div>
      )}

      {done.length > 0 ? (
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            {t("cvStrength.completedSection", { count: done.length })}
          </summary>
          <div className="mt-2 space-y-1.5">
            {done.map((check) => (
              <div key={check.id} className="flex items-center gap-2 px-3 text-sm text-muted-foreground">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                <span className="line-through decoration-muted-foreground/40">{t(check.labelKey)}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
