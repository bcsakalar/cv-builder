// ═══════════════════════════════════════════════════════════
// PDF API Service
// ═══════════════════════════════════════════════════════════

import { api } from "@/lib/api";

export interface PDFExportResult {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

export interface GeneratePDFOptions {
  templateId?: string;
  pageSize?: "A4" | "LETTER" | "LEGAL";
  margin?: "narrow" | "normal" | "wide";
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    textColor?: string;
    bgColor?: string;
    headingFont?: string;
    bodyFont?: string;
    fontSize?: number;
    layout?: string;
  };
}

export const pdfApi = {
  async generate(cvId: string, options: GeneratePDFOptions = {}): Promise<PDFExportResult> {
    const res = await api.post(`/pdf/generate/${cvId}`, options);
    return res.data.data;
  },

  async download(exportId: string): Promise<Blob> {
    const res = await api.get(`/pdf/download/${exportId}`, {
      responseType: "blob",
    });
    return res.data;
  },

  async list(cvId: string): Promise<PDFExportResult[]> {
    const res = await api.get(`/pdf/list/${cvId}`);
    return res.data.data;
  },

  async remove(exportId: string): Promise<void> {
    await api.delete(`/pdf/${exportId}`);
  },
};
