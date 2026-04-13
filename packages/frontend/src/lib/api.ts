import axios from "axios";
import { API_BASE_URL } from "./constants";
import type { ApiSuccessResponse } from "@cvbuilder/shared";
import { useAuthStore } from "@/stores/auth.store";
import { normalizeAppLocale } from "@/i18n/locale";
import { translate } from "@/i18n/helpers";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 180000,
});

// Request interceptor — send current UI locale as Accept-Language
api.interceptors.request.use((config) => {
  try {
    const saved = localStorage.getItem("cvbuilder-settings");
    const locale = normalizeAppLocale(saved ? JSON.parse(saved)?.state?.locale : undefined);
    config.headers["Accept-Language"] = locale;
  } catch {
    config.headers["Accept-Language"] = "en";
  }

  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor — unwrap data
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearSession();

      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth";
      }
    }

    const message =
      error.response?.data?.error?.message ??
      error.message ??
      translate("common.unexpectedError");

    return Promise.reject(new Error(message));
  }
);

// Helper to extract data from API response
export function unwrap<T>(response: { data: ApiSuccessResponse<T> }): T {
  return response.data.data;
}
