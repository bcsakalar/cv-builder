import type { DeepAnalysisResult } from "@cvbuilder/shared";
import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../__root";
import { MainLayout } from "@/components/layout/MainLayout";
import { GitHubConnect } from "@/components/github/GitHubConnect";
import { RepoSelector } from "@/components/github/RepoSelector";
import { AnalysisDetail } from "@/components/github/AnalysisDetail";
import { GitHubProfileSummary } from "@/components/github/GitHubProfileSummary";
import { useGitHubStatus, useGitHubAnalyses } from "@/hooks/useGitHub";
import { Github, Clock, CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { getDateLocale, getStatusLabel } from "@/i18n/helpers";

export const githubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/github",
  component: GitHubPage,
});

function GitHubPage() {
  const { t, i18n } = useTranslation();
  const { data: status } = useGitHubStatus();
  const { data: analyses } = useGitHubAnalyses();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dateLocale = getDateLocale(i18n.language);

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

        <GitHubConnect />

        {status?.connected && (
          <>
            <div>
              <h2 className="mb-4 text-lg font-semibold">{t("github.yourRepos")}</h2>
              <RepoSelector />
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
                            <AnalysisDetail
                              result={a.result as DeepAnalysisResult}
                              analysisId={a.id}
                              onClose={() => setExpandedId(null)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Developer Profile Summary */}
              <GitHubProfileSummary />
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
