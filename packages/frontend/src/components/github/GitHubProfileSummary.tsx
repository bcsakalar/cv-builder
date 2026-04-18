import { useGitHubProfileSummary } from "@/hooks/useAI";
import { Sparkles, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function GitHubProfileSummary() {
  const { t } = useTranslation();
  const profileMut = useGitHubProfileSummary();

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("github.profileSummaryTitle")}</h3>
        <button
          onClick={() => profileMut.mutate()}
          disabled={profileMut.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {profileMut.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          {profileMut.data ? t("github.regenerate") : t("github.generateFromRepos")}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("github.profileSummaryDescription")}
      </p>

      {profileMut.data && (
        <div className="mt-3 rounded-lg border bg-purple-50/50 p-3 dark:bg-purple-950/50">
          <p className="whitespace-pre-line text-sm">{profileMut.data.summary}</p>
        </div>
      )}

      {profileMut.error && (
        <p className="mt-2 text-xs text-destructive">
          {t("github.profileSummaryFailed")}
        </p>
      )}
    </div>
  );
}
