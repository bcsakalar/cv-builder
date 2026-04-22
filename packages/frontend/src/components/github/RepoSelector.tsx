import { useGitHubRepos, useAnalyzeRepo } from "@/hooks/useGitHub";
import { AnalysisProgress } from "./AnalysisProgress";
import { Star, GitFork, ExternalLink, Search as SearchIcon, Loader2, Sparkles, Target } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/stores/app.store";
import { normalizeAppLocale, type AppLocale } from "@/i18n/locale";

interface RepoSelectorProps {
  selectedCvId?: string;
}

export function RepoSelector({ selectedCvId }: RepoSelectorProps) {
  const { t } = useTranslation();
  const appLocale = useAppStore((state) => state.locale);
  const { data: repos, isLoading } = useGitHubRepos(1, selectedCvId);
  const analyzeMutation = useAnalyzeRepo();
  const [search, setSearch] = useState("");
  const [analysisLocale, setAnalysisLocale] = useState<AppLocale>(appLocale);
  // Track which repos are being analyzed (repo fullName → analysisId)
  const [activeAnalyses, setActiveAnalyses] = useState<Record<string, string>>({});

  const filtered = repos?.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.language?.toLowerCase().includes(search.toLowerCase())
  );

  function handleAnalyze(repoFullName: string) {
    analyzeMutation.mutate({ repoFullName, locale: analysisLocale }, {
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
      {selectedCvId && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
          <Sparkles size={14} className="mt-0.5 shrink-0" />
          <p>
            {t("github.repoFitHint", {
              defaultValue: "Repositories are ranked using the selected CV so the best fit candidates rise to the top.",
            })}
          </p>
        </div>
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <SearchIcon size={14} className="text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("github.searchRepos")}
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <div className="rounded-lg border px-3 py-2">
          <label htmlFor="github-analysis-language" className="mb-1 block text-xs font-medium text-muted-foreground">
            {t("github.analysisLanguage", { defaultValue: "Analysis language" })}
          </label>
          <select
            id="github-analysis-language"
            data-testid="github-analysis-language-select"
            value={analysisLocale}
            onChange={(event) => setAnalysisLocale(normalizeAppLocale(event.target.value))}
            className="w-full bg-transparent text-sm outline-none"
          >
            <option value="en">{t("languages.en")}</option>
            <option value="tr">{t("languages.tr")}</option>
          </select>
        </div>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        {t("github.analysisLanguageHint", {
          defaultValue: "AI will write repository insights in the language you choose here.",
        })}
      </p>

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
                  {typeof repo.fitScore === "number" && (
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      repo.fitScore >= 75
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : repo.fitScore >= 55
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      <Target size={10} className="mr-1 inline" />
                      {repo.fitScore}% {t("github.fit", { defaultValue: "fit" })}
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
                {repo.fitReasons && repo.fitReasons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {repo.fitReasons.slice(0, 2).map((reason) => (
                      <span key={reason} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
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
                  data-testid={`github-analyze-${repo.id}`}
                  disabled={analyzeMutation.isPending || !!activeAnalyses[repo.fullName]}
                  className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
