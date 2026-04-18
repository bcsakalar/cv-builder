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
  role: string;
  description: string;
  technologiesText: string;
  highlightsText: string;
}

function buildReviewDraft(preview: GitHubProjectImportPreview): ReviewDraftState {
  return {
    name: preview.draft.name,
    role: preview.draft.role ?? "",
    description: preview.draft.description,
    technologiesText: preview.draft.technologies.join(", "),
    highlightsText: preview.draft.highlights.join("\n"),
  };
}

function parseCommaSeparatedList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraftState | null>(null);

  const isSingle = analysisIds.length === 1;
  const isPending = previewMutation.isPending || importMutation.isPending || bulkImportMutation.isPending;
  const preview = previewMutation.data;
  const githubData = preview?.draft.githubRepoData;
  const suggestedStack = preview?.dependencyInfo
    ? [
        ...preview.dependencyInfo.frameworks,
        ...preview.dependencyInfo.databases,
        ...preview.dependencyInfo.uiLibraries,
        ...preview.dependencyInfo.testingTools,
      ].slice(0, 8)
    : [];

  useEffect(() => {
    if (!previewMutation.data) return;

    setReviewDraft(buildReviewDraft(previewMutation.data));
    setReviewOpen(true);
  }, [previewMutation.data]);

  function closeReview() {
    setReviewOpen(false);
    setReviewDraft(null);
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

    previewMutation.mutate(analysisIds[0]!);
  }

  function handleConfirmImport() {
    if (!selectedCvId || !isSingle || !reviewDraft) return;

    importMutation.mutate(
      {
        cvId: selectedCvId,
        analysisId: analysisIds[0]!,
        projectOverrides: {
          name: reviewDraft.name.trim(),
          role: reviewDraft.role.trim() || null,
          description: reviewDraft.description.trim(),
          technologies: parseCommaSeparatedList(reviewDraft.technologiesText),
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
              className="h-7 rounded border bg-background px-2 text-xs"
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
              className="flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs text-white hover:bg-primary/90 disabled:opacity-50"
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
            <div data-testid="github-import-review" className="rounded-lg border bg-background p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{t("github.importReviewTitle")}</p>
                  <p className="text-xs text-muted-foreground">{t("github.importReviewDescription")}</p>
                </div>
                <button
                  type="button"
                  onClick={closeReview}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={t("github.cancelReview")}
                >
                  <X size={14} />
                </button>
              </div>

              {githubData && (
                <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {githubData.projectType && <span className="rounded-full bg-accent px-2 py-0.5">{githubData.projectType}</span>}
                  {githubData.qualityScore != null && <span className="rounded-full bg-accent px-2 py-0.5">{t("github.qualityScore")}: {githubData.qualityScore}/100</span>}
                  {githubData.commitCount > 0 && <span className="rounded-full bg-accent px-2 py-0.5">{githubData.commitCount} {t("github.metrics.commits")}</span>}
                  {(githubData.contributorCount ?? 0) > 1 && <span className="rounded-full bg-accent px-2 py-0.5">{githubData.contributorCount} {t("github.metrics.contributors")}</span>}
                </div>
              )}

              {suggestedStack.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{t("github.suggestedStack")}</p>
                  <div className="flex flex-wrap gap-1">
                    {suggestedStack.map((item) => (
                      <span key={item} className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium">{item}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor="github-import-name" className="mb-1 block text-xs font-medium">{t("github.projectName")}</label>
                  <input
                    id="github-import-name"
                    value={reviewDraft.name}
                    onChange={(event) => setReviewDraft((current) => current ? { ...current, name: event.target.value } : current)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="github-import-role" className="mb-1 block text-xs font-medium">{t("github.projectRole")}</label>
                  <input
                    id="github-import-role"
                    value={reviewDraft.role}
                    onChange={(event) => setReviewDraft((current) => current ? { ...current, role: event.target.value } : current)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label htmlFor="github-import-description" className="mb-1 block text-xs font-medium">{t("github.projectDescription")}</label>
                <textarea
                  id="github-import-description"
                  rows={4}
                  value={reviewDraft.description}
                  onChange={(event) => setReviewDraft((current) => current ? { ...current, description: event.target.value } : current)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor="github-import-technologies" className="mb-1 block text-xs font-medium">{t("github.technologies")}</label>
                  <textarea
                    id="github-import-technologies"
                    rows={3}
                    value={reviewDraft.technologiesText}
                    onChange={(event) => setReviewDraft((current) => current ? { ...current, technologiesText: event.target.value } : current)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{t("github.projectTechnologiesHint")}</p>
                </div>
                <div>
                  <label htmlFor="github-import-highlights" className="mb-1 block text-xs font-medium">{t("github.projectHighlights")}</label>
                  <textarea
                    id="github-import-highlights"
                    rows={3}
                    value={reviewDraft.highlightsText}
                    onChange={(event) => setReviewDraft((current) => current ? { ...current, highlightsText: event.target.value } : current)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{t("github.projectHighlightsHint")}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={closeReview} className="rounded-lg border px-3 py-2 text-sm">
                  {t("github.cancelReview")}
                </button>
                <button
                  data-testid="github-import-button"
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importMutation.isPending}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {importMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {t("github.confirmImport")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
