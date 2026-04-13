import { useAnalysisProgress } from "@/hooks/useGitHub";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AnalysisProgressProps {
  analysisId: string;
  repoName?: string;
}

export function AnalysisProgress({ analysisId, repoName }: AnalysisProgressProps) {
  const { t } = useTranslation();
  const { progress } = useAnalysisProgress(analysisId);

  if (!progress) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <Loader2 size={14} className="animate-spin text-blue-500" />
        <span className="text-xs text-blue-700">
          {repoName ? t("github.connectingStreamWithRepo", { repoName }) : t("github.connectingStream")}
        </span>
      </div>
    );
  }

  const isDone = progress.stage === "completed";
  const isFailed = progress.stage === "failed";
  const label = t(`github.analysisStages.${progress.stage}`, { defaultValue: progress.message });

  return (
    <div
      className={`rounded-lg border p-3 ${
        isDone
          ? "border-green-200 bg-green-50"
          : isFailed
            ? "border-red-200 bg-red-50"
            : "border-blue-200 bg-blue-50"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        {isDone ? (
          <CheckCircle size={14} className="text-green-500" />
        ) : isFailed ? (
          <XCircle size={14} className="text-red-500" />
        ) : (
          <Loader2 size={14} className="animate-spin text-blue-500" />
        )}
        <span
          className={`text-xs font-medium ${
            isDone ? "text-green-700" : isFailed ? "text-red-700" : "text-blue-700"
          }`}
        >
          {label}
        </span>
      </div>

      {/* Progress bar */}
      {!isFailed && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isDone ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      )}

      {isFailed && progress.message && (
        <p className="mt-1 text-xs text-red-600">{progress.message}</p>
      )}
    </div>
  );
}
