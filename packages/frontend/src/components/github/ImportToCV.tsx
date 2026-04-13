import { useState } from "react";
import { useGetCVs } from "@/hooks/useCV";
import { useImportToCV, useBulkImportToCV } from "@/hooks/useGitHub";
import { Download, Loader2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ImportToCVProps {
  analysisIds: string[];
  onDone?: () => void;
}

export function ImportToCV({ analysisIds, onDone }: ImportToCVProps) {
  const { t } = useTranslation();
  const { data: cvs, isLoading: loadingCVs } = useGetCVs();
  const importMutation = useImportToCV();
  const bulkImportMutation = useBulkImportToCV();
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const [imported, setImported] = useState(false);

  const isSingle = analysisIds.length === 1;
  const isPending = importMutation.isPending || bulkImportMutation.isPending;

  function handleImport() {
    if (!selectedCvId) return;

    if (isSingle) {
      importMutation.mutate(
        { cvId: selectedCvId, analysisId: analysisIds[0]! },
        { onSuccess: () => { setImported(true); onDone?.(); } }
      );
    } else {
      bulkImportMutation.mutate(
        { cvId: selectedCvId, analysisIds },
        { onSuccess: () => { setImported(true); onDone?.(); } }
      );
    }
  }

  if (imported) {
    return (
      <div data-testid="github-imported" className="flex items-center gap-2 text-xs text-green-600">
        <Check size={14} /> {t("github.importedToCv")}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {loadingCVs ? (
        <Loader2 size={14} className="animate-spin text-muted-foreground" />
      ) : !cvs || cvs.length === 0 ? (
        <span className="text-xs text-muted-foreground">{t("github.noCvsFound")}</span>
      ) : (
        <>
          <select
            data-testid="github-import-cv-select"
            value={selectedCvId}
            onChange={(e) => setSelectedCvId(e.target.value)}
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
            data-testid="github-import-button"
            onClick={handleImport}
            disabled={!selectedCvId || isPending}
            className="flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Download size={12} />
            )}
            {isSingle ? t("github.addToCv") : t("github.addManyToCv", { count: analysisIds.length })}
          </button>
        </>
      )}
    </div>
  );
}
