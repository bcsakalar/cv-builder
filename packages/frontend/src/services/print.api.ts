import axios from "axios";
import type { ApiSuccessResponse } from "@cvbuilder/shared";
import { API_BASE_URL } from "@/lib/constants";
import type { CVDetail } from "./cv.api";

export interface PrintRenderData {
  cv: CVDetail;
  theme: Record<string, unknown> | null;
  templateName: string;
  locale: string;
}

/**
 * Fetches CV render data for the chromeless print page using ONLY the signed
 * print token. Uses a bare axios instance (no auth interceptor / 401 redirect)
 * because the print page runs in headless Chrome with no user session.
 */
export async function fetchPrintRenderData(token: string, signal?: AbortSignal): Promise<PrintRenderData> {
  const res = await axios.get<ApiSuccessResponse<PrintRenderData>>(
    `${API_BASE_URL}/print/render-data`,
    { params: { token }, timeout: 30000, signal },
  );
  return res.data.data;
}
