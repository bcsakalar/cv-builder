import { useId, useState } from "react";
import { useGeneratePDF, useDownloadPDF, usePDFExports, useDeletePDFExport } from "@/hooks/usePDF";
import { useThemeStore } from "@/stores/theme.store";
import { FileDown, Loader2, Trash2, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeAppLocale } from "@/i18n/locale";

interface PDFExportPanelProps {
  cvId: string;
}

export function PDFExportPanel({ cvId }: PDFExportPanelProps) {
  const { t, i18n } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const [pageSize, setPageSize] = useState<"A4" | "LETTER" | "LEGAL">("A4");
  const [margin, setMargin] = useState<"narrow" | "normal" | "wide">("normal");
  const pageSizeId = useId();
  const marginId = useId();

  const generateMutation = useGeneratePDF();
  const downloadMutation = useDownloadPDF();
  const deleteMutation = useDeletePDFExport();
  const { data: exports } = usePDFExports(cvId);
  const dateLocale = normalizeAppLocale(i18n.language) === "tr" ? "tr-TR" : "en-US";

  const handleGenerate = () => {
    generateMutation.mutate({
      cvId,
      options: { pageSize, margin, theme },
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{t("pdf.title")}</h3>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={pageSizeId} className="text-xs text-muted-foreground">{t("pdf.pageSize")}</label>
          <select
            id={pageSizeId}
            data-testid="pdf-page-size"
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value as "A4" | "LETTER" | "LEGAL")}
            className="w-full rounded border px-2 py-1 text-xs"
          >
            <option value="A4">{t("pdf.pageSizes.a4")}</option>
            <option value="LETTER">{t("pdf.pageSizes.letter")}</option>
            <option value="LEGAL">{t("pdf.pageSizes.legal")}</option>
          </select>
        </div>
        <div>
          <label htmlFor={marginId} className="text-xs text-muted-foreground">{t("pdf.margins")}</label>
          <select
            id={marginId}
            data-testid="pdf-margin"
            value={margin}
            onChange={(e) => setMargin(e.target.value as "narrow" | "normal" | "wide")}
            className="w-full rounded border px-2 py-1 text-xs"
          >
            <option value="narrow">{t("pdf.marginOptions.narrow")}</option>
            <option value="normal">{t("pdf.marginOptions.normal")}</option>
            <option value="wide">{t("pdf.marginOptions.wide")}</option>
          </select>
        </div>
      </div>

      <button
        data-testid="pdf-generate-button"
        onClick={handleGenerate}
        disabled={generateMutation.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {generateMutation.isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <FileDown size={16} />
        )}
        {generateMutation.isPending ? t("pdf.generating") : t("pdf.generate")}
      </button>

      {/* Export History */}
      {exports && exports.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">{t("pdf.previousExports")}</h4>
          {exports.map((exp) => (
            <div key={exp.id} className="flex items-center justify-between rounded border px-3 py-2 text-xs">
              <div>
                <p className="font-medium">{exp.fileName}</p>
                <p className="text-muted-foreground">
                  {(exp.fileSize / 1024).toFixed(1)} KB · {new Date(exp.createdAt).toLocaleDateString(dateLocale)}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  data-testid={`pdf-download-${exp.id}`}
                  onClick={() => downloadMutation.mutate({ exportId: exp.id, fileName: exp.fileName })}
                  className="rounded p-1 hover:bg-accent"
                  title={t("common.download")}
                >
                  <Download size={14} />
                </button>
                <button
                  data-testid={`pdf-delete-${exp.id}`}
                  onClick={() => deleteMutation.mutate({ exportId: exp.id, cvId })}
                  className="rounded p-1 text-red-500 hover:bg-red-50"
                  title={t("common.delete")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
