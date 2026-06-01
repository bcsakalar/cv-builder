// ═══════════════════════════════════════════════════════════
// CandidateDetailDrawer — focused slide-over for a single candidate.
// Replaces the old endless-scroll side column: a fixed-height drawer with
// tabs (Overview / Match / Document / Notes) so everything is reachable
// without scrolling a cramped panel. Fully localized.
//
// The body is keyed by candidate id so its local state (active tab + note
// drafts) resets cleanly when a different candidate is opened — no effect.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Link2, RefreshCcw, X } from "lucide-react";
import type { CandidateProfile } from "@cvbuilder/shared";
import { Chip, RecommendationBadge, ScoreRing, scoreLabelMap } from "./recruiter-ui";

type DetailTab = "overview" | "evidence" | "document" | "notes";

interface CandidateDetailDrawerProps {
  candidate: CandidateProfile | null;
  open: boolean;
  onClose: () => void;
  onReEvaluate: () => void;
  reEvaluating: boolean;
  onSaveMetadata: (data: { notes: string | null; tags: string[] }) => void;
  savingMetadata: boolean;
  locale: string;
}

export function CandidateDetailDrawer({ candidate, open, onClose, ...rest }: CandidateDetailDrawerProps) {
  // Close on Escape for keyboard users (external listener — safe in an effect).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !candidate) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl">
        <CandidateDetailBody key={candidate.id} candidate={candidate} onClose={onClose} {...rest} />
      </aside>
    </div>
  );
}

function CandidateDetailBody({
  candidate,
  onClose,
  onReEvaluate,
  reEvaluating,
  onSaveMetadata,
  savingMetadata,
  locale,
}: Omit<CandidateDetailDrawerProps, "candidate" | "open"> & { candidate: CandidateProfile }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DetailTab>("overview");
  const [notesDraft, setNotesDraft] = useState(candidate.notes ?? "");
  const [tagsDraft, setTagsDraft] = useState((candidate.tags ?? []).join(", "));

  const evaluation = candidate.evaluation;
  const dateLocale = locale.startsWith("tr") ? "tr-TR" : "en-US";
  const recommendationLabel = evaluation?.recommendation
    ? t(`recruiter.recommendations.${evaluation.recommendation}`)
    : t("recruiter.common.pending");

  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: "overview", label: t("recruiter.detail.tabs.overview") },
    { id: "evidence", label: t("recruiter.detail.tabs.evidence") },
    { id: "document", label: t("recruiter.detail.tabs.document") },
    { id: "notes", label: t("recruiter.detail.tabs.notes") },
  ];

  const saveMetadata = () => {
    const tags = tagsDraft.split(",").map((v) => v.trim()).filter(Boolean);
    onSaveMetadata({ notes: notesDraft.trim() || null, tags });
  };

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b p-5">
        <div className="flex items-center gap-4">
          <ScoreRing value={evaluation?.overallScore} size={64} />
          <div>
            <h3 className="text-lg font-semibold">{candidate.fullName || t("recruiter.common.unknownCandidate")}</h3>
            <p className="text-sm text-muted-foreground">{candidate.headline || candidate.email || t("recruiter.common.notAvailable")}</p>
            <div className="mt-1.5">
              <RecommendationBadge recommendation={evaluation?.recommendation} label={recommendationLabel} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReEvaluate}
            disabled={reEvaluating}
            className="inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
          >
            <RefreshCcw size={14} className="mr-2" />
            {reEvaluating ? t("recruiter.actions.reevaluating") : t("recruiter.actions.reEvaluate")}
          </button>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="rounded-xl border p-2 hover:bg-accent">
            <X size={16} />
          </button>
        </div>
      </header>

      <nav className="flex shrink-0 gap-1 border-b px-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`recruiter-detail-tab-${item.id}`}
            onClick={() => setTab(item.id)}
            className={`relative px-4 py-3 text-sm font-medium transition ${
              tab === item.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
            {tab === item.id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === "overview" ? (
          <div className="space-y-5">
            {evaluation ? (
              <>
                <div className="grid gap-3">
                  {scoreLabelMap.map((item) => {
                    const score = evaluation[item.key] ?? 0;
                    return (
                      <div key={item.key}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span>{t(`recruiter.breakdown.${item.key}`)}</span>
                          <span className="font-medium tabular-nums">{score}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className={`h-2 rounded-full ${item.tone}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2 rounded-2xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    {t("recruiter.candidateDetail.summary")}
                  </div>
                  <p className="text-sm text-muted-foreground">{evaluation.shortSummary}</p>
                  {evaluation.explanation ? <p className="text-sm text-muted-foreground">{evaluation.explanation}</p> : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ChipGroup title={t("recruiter.detail.matchedHardSkills")} items={evaluation.matchedHardSkills} tone="success" />
                  <ChipGroup title={t("recruiter.detail.matchedKeywords")} items={evaluation.matchedKeywords} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("recruiter.common.pending")}</p>
            )}
          </div>
        ) : null}

        {tab === "evidence" ? (
          <div className="space-y-5">
            {evaluation && evaluation.matchEvidence.length > 0 ? (
              <div>
                <p className="mb-3 text-sm font-medium">{t("recruiter.detail.matchEvidence")}</p>
                <div className="space-y-2">
                  {evaluation.matchEvidence.slice(0, 10).map((item, index) => (
                    <div key={`${item.term}-${index}`} className="rounded-xl border bg-muted/30 p-3 text-xs">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Chip tone={item.source === "mustHave" ? "success" : "default"}>{item.term}</Chip>
                        <span className="text-muted-foreground">
                          {item.source === "mustHave" ? t("recruiter.detail.mustHave") : t("recruiter.detail.keyword")}
                        </span>
                      </div>
                      <p className="leading-relaxed text-muted-foreground">{item.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <ChipGroup title={t("recruiter.candidateDetail.strengths")} items={evaluation?.strengths ?? []} tone="success" />
              <ChipGroup title={t("recruiter.candidateDetail.missingSkills")} items={evaluation?.missingHardSkills ?? []} tone="warning" />
              <ChipGroup title={t("recruiter.candidateDetail.riskFlags")} items={evaluation?.riskFlags ?? []} tone="danger" />
            </div>
          </div>
        ) : null}

        {tab === "document" ? (
          <div className="space-y-5">
            <div className="rounded-2xl border p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Link2 size={16} />
                {t("recruiter.candidateDetail.links")}
              </div>
              <div className="space-y-2">
                {candidate.links.map((link) => (
                  <div key={link.id} className="rounded-xl bg-muted/30 p-3 text-sm">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <a href={link.finalUrl || link.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                        {link.title || link.host}
                      </a>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${link.accessible === false ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"}`}>
                        {link.accessible === false ? t("recruiter.links.broken") : t("recruiter.links.ok")}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{link.description || link.url}</p>
                  </div>
                ))}
                {!candidate.links.length ? <p className="text-sm text-muted-foreground">{t("recruiter.links.empty")}</p> : null}
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border p-4 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                <p className="font-medium text-foreground">{candidate.document.originalFileName}</p>
                <p>{t("recruiter.candidateDetail.documentStatus", { status: candidate.document.extractionStatus })}</p>
              </div>
              <div>
                <p>{t("recruiter.detail.extractedChars", { count: candidate.document.extractedTextLength })}</p>
                <p>{t("recruiter.candidateDetail.completeness", { score: candidate.completenessScore })}</p>
                <p>{new Date(candidate.updatedAt).toLocaleString(dateLocale)}</p>
              </div>
            </div>

            {candidate.document.extractedTextPreview ? (
              <div className="rounded-2xl border p-4">
                <p className="mb-2 text-sm font-medium">{t("recruiter.detail.extractedPreview")}</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{candidate.document.extractedTextPreview}</pre>
              </div>
            ) : (
              <div className="rounded-2xl border p-4">
                <p className="mb-2 text-sm font-medium">{t("recruiter.candidateDetail.rawPreview")}</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{candidate.rawTextSnippet}</pre>
              </div>
            )}
          </div>
        ) : null}

        {tab === "notes" ? (
          <div className="space-y-4" data-testid="recruiter-notes-section">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{t("recruiter.notes.tagsLabel")}</label>
              <input
                type="text"
                data-testid="recruiter-tags-input"
                value={tagsDraft}
                onChange={(e) => setTagsDraft(e.target.value)}
                placeholder="senior, react, remote"
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                {(candidate.tags ?? []).map((tag) => (
                  <Chip key={tag} tone="success">{tag}</Chip>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{t("recruiter.notes.notesLabel")}</label>
              <textarea
                data-testid="recruiter-notes-input"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={6}
                placeholder={t("recruiter.notes.placeholder")}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              data-testid="recruiter-save-metadata"
              onClick={saveMetadata}
              disabled={savingMetadata}
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {savingMetadata ? t("recruiter.notes.saving") : t("recruiter.notes.save")}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function ChipGroup({ title, items, tone }: { title: string; items: string[]; tone?: "default" | "success" | "warning" | "danger" }) {
  return (
    <div className="rounded-2xl border p-4">
      <p className="mb-3 text-sm font-medium">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Chip key={item} tone={tone}>{item}</Chip>
        ))}
        {items.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : null}
      </div>
    </div>
  );
}
