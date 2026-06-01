// ═══════════════════════════════════════════════════════════
// CandidateFunnel — interactive recruiting pipeline summary.
// Gives recruiters an at-a-glance view of the candidate distribution
// (Strong / Potential / Weak), average score, and link-quality risk —
// and doubles as a one-click filter for the candidate list.
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link2Off, Users } from "lucide-react";
import type { CandidateRecommendation, RecruiterCandidateListItem } from "@cvbuilder/shared";
import { ScoreRing } from "./recruiter-ui";

interface CandidateFunnelProps {
  candidates: RecruiterCandidateListItem[];
  activeRecommendation?: CandidateRecommendation;
  onSelectRecommendation: (recommendation?: CandidateRecommendation) => void;
}

const SEGMENTS: Array<{ key: CandidateRecommendation; bar: string; tile: string; ring: string }> = [
  { key: "STRONG_MATCH", bar: "bg-emerald-500", tile: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500" },
  { key: "POTENTIAL_MATCH", bar: "bg-amber-500", tile: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500" },
  { key: "WEAK_MATCH", bar: "bg-rose-500", tile: "text-rose-600 dark:text-rose-400", ring: "ring-rose-500" },
];

export function CandidateFunnel({ candidates, activeRecommendation, onSelectRecommendation }: CandidateFunnelProps) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const counts: Record<CandidateRecommendation, number> = {
      STRONG_MATCH: 0,
      POTENTIAL_MATCH: 0,
      WEAK_MATCH: 0,
    };
    let scoreSum = 0;
    let scored = 0;
    let brokenLinks = 0;

    for (const c of candidates) {
      const rec = c.evaluation?.recommendation;
      if (rec) counts[rec] += 1;
      if (typeof c.evaluation?.overallScore === "number") {
        scoreSum += c.evaluation.overallScore;
        scored += 1;
      }
      if (c.brokenLinkCount > 0) brokenLinks += 1;
    }

    return {
      counts,
      total: candidates.length,
      avgScore: scored > 0 ? Math.round(scoreSum / scored) : null,
      brokenLinks,
    };
  }, [candidates]);

  if (stats.total === 0) return null;

  const toggle = (rec: CandidateRecommendation) =>
    onSelectRecommendation(activeRecommendation === rec ? undefined : rec);

  return (
    <section
      data-testid="recruiter-funnel"
      className="rounded-2xl border bg-card p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t("recruiter.funnel.title")}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{t("recruiter.funnel.basedOn", { count: stats.total })}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        {/* Clickable distribution tiles */}
        <div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => onSelectRecommendation(undefined)}
              className={`rounded-xl border p-3 text-left transition hover:bg-accent/50 ${
                !activeRecommendation ? "border-primary ring-1 ring-primary" : ""
              }`}
            >
              <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
              <p className="text-xs text-muted-foreground">{t("recruiter.funnel.all")}</p>
            </button>

            {SEGMENTS.map((segment) => {
              const active = activeRecommendation === segment.key;
              return (
                <button
                  key={segment.key}
                  type="button"
                  data-testid={`recruiter-funnel-${segment.key}`}
                  onClick={() => toggle(segment.key)}
                  className={`rounded-xl border p-3 text-left transition hover:bg-accent/50 ${
                    active ? `border-primary ring-1 ${segment.ring}` : ""
                  }`}
                >
                  <p className={`text-2xl font-bold tabular-nums ${segment.tile}`}>{stats.counts[segment.key]}</p>
                  <p className="text-xs text-muted-foreground">{t(`recruiter.recommendations.${segment.key}`)}</p>
                </button>
              );
            })}
          </div>

          {/* Stacked distribution bar */}
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            {SEGMENTS.map((segment) => {
              const value = stats.counts[segment.key];
              const pct = stats.total > 0 ? (value / stats.total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={segment.key}
                  className={segment.bar}
                  style={{ width: `${pct}%`, transition: "width 0.5s ease" }}
                  title={`${t(`recruiter.recommendations.${segment.key}`)}: ${value}`}
                />
              );
            })}
          </div>
        </div>

        {/* Average score + link-quality risk */}
        <div className="flex items-center gap-5 lg:border-l lg:pl-5">
          <div className="text-center">
            <ScoreRing value={stats.avgScore} size={64} />
            <p className="mt-1 text-xs text-muted-foreground">{t("recruiter.funnel.avgScore")}</p>
          </div>
          <div className="text-center">
            <div
              className={`inline-flex size-16 items-center justify-center rounded-full text-2xl font-bold tabular-nums ${
                stats.brokenLinks > 0
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
              }`}
            >
              {stats.brokenLinks > 0 ? <Link2Off size={20} className="mr-1" /> : null}
              {stats.brokenLinks}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("recruiter.funnel.brokenLinks")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
