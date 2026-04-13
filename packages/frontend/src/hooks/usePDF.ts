// ═══════════════════════════════════════════════════════════
// PDF Hooks — TanStack Query hooks for PDF operations
// ═══════════════════════════════════════════════════════════

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pdfApi, type GeneratePDFOptions } from "@/services/pdf.api";
import { toast } from "sonner";
import { translate } from "@/i18n/helpers";

const pdfKeys = {
  all: ["pdf"] as const,
  list: (cvId: string) => [...pdfKeys.all, "list", cvId] as const,
};

export function usePDFExports(cvId: string) {
  return useQuery({
    queryKey: pdfKeys.list(cvId),
    queryFn: () => pdfApi.list(cvId),
  });
}

export function useGeneratePDF() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ cvId, options }: { cvId: string; options?: GeneratePDFOptions }) =>
      pdfApi.generate(cvId, options),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: pdfKeys.list(vars.cvId) });
      toast.success(translate("toasts.pdf.generated", { fileName: data.fileName }));
    },
    onError: () => toast.error(translate("toasts.pdf.generationFailed")),
  });
}

export function useDownloadPDF() {
  return useMutation({
    mutationFn: async ({ exportId, fileName }: { exportId: string; fileName: string }) => {
      const blob = await pdfApi.download(exportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error(translate("toasts.pdf.downloadFailed")),
  });
}

export function useDeletePDFExport() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ exportId, cvId }: { exportId: string; cvId: string }) =>
      pdfApi.remove(exportId).then(() => cvId),
    onSuccess: (cvId) => {
      qc.invalidateQueries({ queryKey: pdfKeys.list(cvId) });
      toast.success(translate("toasts.pdf.deleted"));
    },
    onError: () => toast.error(translate("toasts.pdf.deleteFailed")),
  });
}
