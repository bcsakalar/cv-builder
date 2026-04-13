import { useGitHubRepos, useAnalyzeRepo } from "@/hooks/useGitHub";
import { AnalysisProgress } from "./AnalysisProgress";
import { Star, GitFork, ExternalLink, Search as SearchIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function RepoSelector() {
  const { t } = useTranslation();
  const { data: repos, isLoading } = useGitHubRepos();
  const analyzeMutation = useAnalyzeRepo();
  const [search, setSearch] = useState("");
  // Track which repos are being analyzed (repo fullName → analysisId)
  const [activeAnalyses, setActiveAnalyses] = useState<Record<string, string>>({});

  const filtered = repos?.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.language?.toLowerCase().includes(search.toLowerCase())
  );

  function handleAnalyze(repoFullName: string) {
    analyzeMutation.mutate(repoFullName, {
      onSuccess: (analysis) => {
        setActiveAnalyses((prev) => ({ ...prev, [repoFullName]: analysis.id }));
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> {t("github.loadingRepos")}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-lg border px-3 py-2">
        <SearchIcon size={14} className="text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("github.searchRepos")}
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      <div className="space-y-2">
        {filtered?.map((repo) => (
          <div key={repo.id} className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-sm">{repo.name}</p>
                  {repo.language && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      {repo.language}
                    </span>
                  )}
                </div>
                {repo.description && (
                  <p className="truncate text-xs text-muted-foreground mt-0.5">{repo.description}</p>
                )}
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Star size={10} /> {repo.stars}</span>
                  <span className="flex items-center gap-1"><GitFork size={10} /> {repo.forks}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 text-muted-foreground hover:bg-accent"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => handleAnalyze(repo.fullName)}
                  disabled={analyzeMutation.isPending || !!activeAnalyses[repo.fullName]}
                  className="rounded bg-primary px-3 py-1 text-xs text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {activeAnalyses[repo.fullName] ? t("github.analyzing") : t("github.analyze")}
                </button>
              </div>
            </div>

            {/* Inline progress for active analysis */}
            {activeAnalyses[repo.fullName] && (
              <AnalysisProgress
                analysisId={activeAnalyses[repo.fullName]!}
                repoName={repo.name}
              />
            )}
          </div>
        ))}

        {filtered?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("github.noReposFound")}</p>
        )}
      </div>
    </div>
  );
}
