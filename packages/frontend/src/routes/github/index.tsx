import type { DeepAnalysisResult } from "@cvbuilder/shared";
import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../__root";
import { MainLayout } from "@/components/layout/MainLayout";
import { lazy, Suspense, useEffect, useState } from "react";
import { useGitHubStatus, useGitHubAnalyses } from "@/hooks/useGitHub";
import { useGetCVs } from "@/hooks/useCV";
import { useQueryClient } from "@tanstack/react-query";
import { Github, Clock, CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getDateLocale, getStatusLabel } from "@/i18n/helpers";
import { toast } from "sonner";

const LazyGitHubConnect = lazy(() => import("@/components/github/GitHubConnect").then((module) => ({ default: module.GitHubConnect })));
const LazyRepoSelector = lazy(() => import("@/components/github/RepoSelector").then((module) => ({ default: module.RepoSelector })));
const LazyAnalysisDetail = lazy(() => import("@/components/github/AnalysisDetail").then((module) => ({ default: module.AnalysisDetail })));
const LazyGitHubProfileSummary = lazy(() => import("@/components/github/GitHubProfileSummary").then((module) => ({ default: module.GitHubProfileSummary })));

function SectionFallback({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{label}</div>;
}

export const githubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/github",
  component: GitHubPage,
});

function GitHubPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { data: status } = useGitHubStatus();
  const { data: cvs = [] } = useGetCVs();
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const { data: analyses } = useGitHubAnalyses(selectedCvId || undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dateLocale = getDateLocale(i18n.language);

  useEffect(() => {
    if (!selectedCvId && cvs.length > 0) {
      setSelectedCvId(cvs[0]?.id ?? "");
    }
  }, [cvs, selectedCvId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthState = params.get("github_oauth");
    if (!oauthState) return;

    if (oauthState === "success") {
      toast.success(t("github.oauthSuccess", { defaultValue: "GitHub OAuth connection completed." }));
      qc.invalidateQueries({ queryKey: ["github"] });
    } else {
      const message = params.get("message") || t("github.oauthError", { defaultValue: "GitHub OAuth could not be completed." });
      toast.error(message);
    }

    window.history.replaceState({}, "", window.location.pathname);
  }, [qc, t]);

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-8 p-6">
        <div className="flex items-center gap-3">
          <Github size={28} />
          <div>
            <h1 className="text-2xl font-bold">{t("github.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("github.subtitle")}
            </p>
          </div>
        </div>

        <Suspense fallback={<SectionFallback label={t("github.loadingConnect", { defaultValue: "Loading connection panel…" })} />}>
          <LazyGitHubConnect />
        </Suspense>

        {status?.connected && (
          <>
            {cvs.length > 0 && (
              <div className="rounded-lg border bg-card p-4">
                <label className="mb-2 block text-sm font-medium">
                  {t("github.selectedCvContext", { defaultValue: "Selected CV context" })}
                </label>
                <select
                  value={selectedCvId}
                  onChange={(event) => setSelectedCvId(event.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">{t("github.noCvContext", { defaultValue: "No CV selected" })}</option>
                  {cvs.map((cv) => (
                    <option key={cv.id} value={cv.id}>{cv.title}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("github.selectedCvContextHint", {
                    defaultValue: "Use a CV here to rank repositories by fit and show relevance-aware impact scoring in analysis history.",
                  })}
                </p>
              </div>
            )}

            <div>
              <h2 className="mb-4 text-lg font-semibold">{t("github.yourRepos")}</h2>
              <Suspense fallback={<SectionFallback label={t("github.loadingRepos", { defaultValue: "Loading repositories…" })} />}>
                <LazyRepoSelector selectedCvId={selectedCvId || undefined} />
              </Suspense>
            </div>

            {analyses && analyses.length > 0 && (
              <>
                <div>
                  <h2 className="mb-4 text-lg font-semibold">{t("github.analysisHistory")}</h2>
                <div className="space-y-2">
                  {analyses.map((a) => {
                    const isExpanded = expandedId === a.id;
                    const repoName = a.result?.repoFullName;

                    return (
                      <div key={a.id} className="space-y-0">
                        <div
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50 ${
                            isExpanded ? "rounded-b-none border-b-0" : ""
                          }`}
                          onClick={() => {
                            if (a.status === "COMPLETED" && a.result) {
                              setExpandedId(isExpanded ? null : a.id);
                            }
                          }}
                        >
                          {a.status === "PENDING" && <Clock size={16} className="text-yellow-500" />}
                          {a.status === "PROCESSING" && (
                            <Loader2 size={16} className="animate-spin text-blue-500" />
                          )}
                          {a.status === "COMPLETED" && <CheckCircle size={16} className="text-green-500" />}
                          {a.status === "FAILED" && <XCircle size={16} className="text-red-500" />}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{repoName ?? a.username}</p>
                            <p className="text-xs text-muted-foreground">
                              {getStatusLabel(a.status)} • {new Date(a.createdAt).toLocaleDateString(dateLocale)}
                            </p>
                            {a.status === "FAILED" && a.error && (
                              <p className="mt-0.5 text-xs text-red-500">{a.error}</p>
                            )}
                          </div>
                          {a.status === "COMPLETED" && a.result && (
                            <span className="text-muted-foreground">
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </span>
                          )}
                        </div>

                        {/* Expanded detail view */}
                        {isExpanded && a.result && (
                          <div className="rounded-b-lg border border-t-0 px-3 pb-3">
                            <Suspense fallback={<SectionFallback label={t("github.loadingAnalysis", { defaultValue: "Loading analysis detail…" })} />}>
                              <LazyAnalysisDetail
                                result={a.result as DeepAnalysisResult}
                                analysisId={a.id}
                                onClose={() => setExpandedId(null)}
                              />
                            </Suspense>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Developer Profile Summary */}
              <Suspense fallback={<SectionFallback label={t("github.loadingProfileSummary", { defaultValue: "Loading profile summary…" })} />}>
                <LazyGitHubProfileSummary />
              </Suspense>
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
