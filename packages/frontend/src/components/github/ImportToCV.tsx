import type { GitHubProjectImportPreview } from "@cvbuilder/shared";
import { useEffect, useState } from "react";
import { useGetCVs } from "@/hooks/useCV";
import { useBulkImportToCV, useImportPreview, useImportToCV } from "@/hooks/useGitHub";
import { Check, Download, Loader2, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ImportToCVProps {
  analysisIds: string[];
  onDone?: () => void;
}

interface ReviewDraftState {
  name: string;
  description: string;
  highlightsText: string;
}

function buildReviewDraft(preview: GitHubProjectImportPreview): ReviewDraftState {
  return {
    name: preview.draft.name,
    description: preview.draft.description,
    highlightsText: preview.draft.highlights.join("\n"),
  };
}

function parseLineSeparatedList(raw: string): string[] {
  return raw
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ImportToCV({ analysisIds, onDone }: ImportToCVProps) {
  const { t } = useTranslation();
  const { data: cvs, isLoading: loadingCVs } = useGetCVs();
  const previewMutation = useImportPreview();
  const importMutation = useImportToCV();
  const bulkImportMutation = useBulkImportToCV();
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const [imported, setImported] = useState(false);
  const [dismissedPreviewAnalysisId, setDismissedPreviewAnalysisId] = useState<string | null>(null);
  const [reviewDraftState, setReviewDraftState] = useState<ReviewDraftState | null>(null);

  const isSingle = analysisIds.length === 1;
  const isPending = previewMutation.isPending || importMutation.isPending || bulkImportMutation.isPending;
  const preview = previewMutation.data;
  const previewDraft = preview && dismissedPreviewAnalysisId !== preview.analysisId ? buildReviewDraft(preview) : null;
  const reviewDraft = reviewDraftState ?? previewDraft;
  const reviewOpen = Boolean(preview && reviewDraft);
  const githubData = preview?.draft.githubRepoData;
  const impactAnalysis = githubData?.impactAnalysis ?? null;
  const suggestedStack = preview?.dependencyInfo
    ? [
        ...preview.dependencyInfo.frameworks,
        ...preview.dependencyInfo.databases,
        ...preview.dependencyInfo.uiLibraries,
        ...preview.dependencyInfo.testingTools,
      ].slice(0, 8)
    : [];
  const detectedSkills = (githubData?.detectedSkills ?? []).slice(0, 8);
  const strengths = (githubData?.strengths ?? []).slice(0, 4);
  const architectureText = githubData?.architectureAnalysis?.trim() || null;
  const stackAssessmentText = githubData?.techStackAssessment?.trim() || null;
  const cvReadyText = githubData?.cvHighlights?.length ? githubData.cvHighlights : [];
  const summaryText = githubData?.projectSummary?.trim() || preview?.draft.description?.trim() || null;

  function closeReview() {
    setDismissedPreviewAnalysisId(preview?.analysisId ?? null);
    setReviewDraftState(null);
  }

  function updateReviewDraft(updater: (current: ReviewDraftState) => ReviewDraftState) {
    const currentDraft = reviewDraft ?? (preview ? buildReviewDraft(preview) : null);
    if (!currentDraft) return;

    setReviewDraftState(updater(currentDraft));
  }

  function handleStartImport() {
    if (!selectedCvId) return;

    if (!isSingle) {
      bulkImportMutation.mutate(
        { cvId: selectedCvId, analysisIds },
        { onSuccess: () => { setImported(true); onDone?.(); } }
      );
      return;
    }

    previewMutation.mutate({ analysisId: analysisIds[0]!, cvId: selectedCvId }, {
      onSuccess: (nextPreview) => {
        setDismissedPreviewAnalysisId(null);
        setReviewDraftState(buildReviewDraft(nextPreview));
      },
    });
  }

  function handleConfirmImport() {
    if (!selectedCvId || !isSingle || !reviewDraft) return;

    importMutation.mutate(
      {
        cvId: selectedCvId,
        analysisId: analysisIds[0]!,
        projectOverrides: {
          name: reviewDraft.name.trim(),
          description: reviewDraft.description.trim(),
          highlights: parseLineSeparatedList(reviewDraft.highlightsText),
        },
      },
      {
        onSuccess: () => {
          setImported(true);
          closeReview();
          onDone?.();
        },
      }
    );
  }

  useEffect(() => {
    if (!reviewOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [reviewOpen]);

  if (imported) {
    return (
      <div data-testid="github-imported" className="flex items-center gap-2 text-xs text-green-600">
        <Check size={14} /> {t("github.importedToCv")}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {loadingCVs ? (
        <Loader2 size={14} className="animate-spin text-muted-foreground" />
      ) : !cvs || cvs.length === 0 ? (
        <span className="text-xs text-muted-foreground">{t("github.noCvsFound")}</span>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <select
              data-testid="github-import-cv-select"
              value={selectedCvId}
              onChange={(event) => setSelectedCvId(event.target.value)}
              className="h-8 min-w-32 rounded border border-input bg-card px-2 text-xs text-foreground shadow-sm"
            >
              <option value="">{t("github.selectCv")}</option>
              {cvs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.title}
                </option>
              ))}
            </select>
            <button
              data-testid={isSingle ? "github-import-review-button" : "github-import-button"}
              onClick={handleStartImport}
              disabled={!selectedCvId || isPending}
              className="flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : isSingle ? (
                <Sparkles size={12} />
              ) : (
                <Download size={12} />
              )}
              {isSingle ? t("github.reviewAndAddToCv") : t("github.addManyToCv", { count: analysisIds.length })}
            </button>
          </div>

          {reviewOpen && reviewDraft && preview && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={closeReview}
            >
              <div
                data-testid="github-import-review"
                role="dialog"
                aria-modal="true"
                aria-labelledby="github-import-review-title"
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p id="github-import-review-title" className="text-base font-semibold">{t("github.importReviewTitle")}</p>
                    <p className="max-w-2xl text-sm text-muted-foreground">{t("github.importReviewDescription")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeReview}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={t("github.cancelReview")}
                  >
                    <X size={16} />
                  </button>
                </div>

                {githubData && (
                  <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {githubData.projectType && <span className="rounded-full bg-accent px-2 py-0.5 font-medium">{githubData.projectType}</span>}
                    {githubData.complexityLevel && <span className="rounded-full bg-accent px-2 py-0.5 font-medium">{githubData.complexityLevel}</span>}
                  </div>
                )}

                {(impactAnalysis || githubData?.qualityScore !== undefined) && (
                  <div className="mb-4 grid gap-2 sm:grid-cols-3">
                    {impactAnalysis && (
                      <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("github.impactScore", { defaultValue: "Impact score" })}</p>
                        <p className="mt-1 text-lg font-semibold">{impactAnalysis.impactScore}</p>
                      </div>
                    )}
                    {impactAnalysis?.fitScore !== null && impactAnalysis?.fitScore !== undefined && (
                      <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("github.fitScore", { defaultValue: "CV fit score" })}</p>
                        <p className="mt-1 text-lg font-semibold">{impactAnalysis.fitScore}</p>
                      </div>
                    )}
                    {githubData?.qualityScore !== undefined && githubData?.qualityScore !== null && (
                      <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("github.qualityScore")}</p>
                        <p className="mt-1 text-lg font-semibold">{githubData.qualityScore}</p>
                      </div>
                    )}
                  </div>
                )}

                {summaryText && (
                  <div className="mb-4 rounded-lg border border-border/70 bg-muted/20 p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{t("github.aiProjectSummary")}</p>
                    <p className="text-sm leading-relaxed text-foreground">{summaryText}</p>
                  </div>
                )}

                {impactAnalysis?.reasons && impactAnalysis.reasons.length > 0 && (
                  <div className="mb-4 rounded-lg border border-border/70 bg-muted/10 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{t("github.impactHighlights", { defaultValue: "Impact highlights" })}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {impactAnalysis.reasons.map((reason) => (
                        <span key={reason} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{reason}</span>
                      ))}
                    </div>
                  </div>
                )}

                {suggestedStack.length > 0 && (
                  <div className="mb-4 rounded-lg border border-border/70 bg-muted/30 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{t("github.suggestedStack")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedStack.map((item) => (
                        <span key={item} className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium">{item}</span>
                      ))}
                    </div>
                  </div>
                )}

                {detectedSkills.length > 0 && (
                  <div className="mb-4 rounded-lg border border-border/70 bg-muted/10 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{t("github.detectedSkills")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detectedSkills.map((skill) => (
                        <span key={skill} className="rounded-full bg-accent px-2 py-1 text-xs font-medium">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {strengths.length > 0 && (
                  <div className="mb-4 rounded-lg border border-border/70 bg-muted/10 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{t("github.strengths")}</p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {strengths.map((strength) => (
                        <li key={strength} className="flex items-start gap-2">
                          <Check size={14} className="mt-0.5 shrink-0 text-green-500" />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {cvReadyText.length > 0 && (
                  <div className="mb-4 rounded-lg border border-border/70 bg-muted/10 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{t("github.projectHighlights")}</p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {cvReadyText.map((highlight) => (
                        <li key={highlight} className="flex items-start gap-2">
                          <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(architectureText || stackAssessmentText) && (
                  <div className="mb-4 grid gap-4 md:grid-cols-2">
                    {architectureText && (
                      <div className="rounded-lg border border-border/70 bg-muted/10 p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">{t("github.architectureAnalysis")}</p>
                        <p className="text-sm leading-relaxed text-foreground">{architectureText}</p>
                      </div>
                    )}
                    {stackAssessmentText && (
                      <div className="rounded-lg border border-border/70 bg-muted/10 p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">{t("github.aiAssessment")}</p>
                        <p className="text-sm leading-relaxed text-foreground">{stackAssessmentText}</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="github-import-name" className="mb-1 block text-xs font-medium">{t("github.projectName")}</label>
                  <input
                    id="github-import-name"
                    value={reviewDraft.name}
                    onChange={(event) => updateReviewDraft((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="github-import-description" className="mb-1 block text-xs font-medium">{t("github.projectDescription")}</label>
                  <textarea
                    id="github-import-description"
                    rows={5}
                    value={reviewDraft.description}
                    onChange={(event) => updateReviewDraft((current) => ({ ...current, description: event.target.value }))}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="github-import-highlights" className="mb-1 block text-xs font-medium">{t("github.projectHighlights")}</label>
                  <textarea
                    id="github-import-highlights"
                    rows={5}
                    value={reviewDraft.highlightsText}
                    onChange={(event) => updateReviewDraft((current) => ({ ...current, highlightsText: event.target.value }))}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{t("github.projectHighlightsHint")}</p>
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border/70 pt-4">
                  <button type="button" onClick={closeReview} className="rounded-lg border border-input px-3 py-2 text-sm hover:bg-accent">
                    {t("github.cancelReview")}
                  </button>
                  <button
                    data-testid="github-import-button"
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={importMutation.isPending}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {importMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {t("github.confirmImport")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
