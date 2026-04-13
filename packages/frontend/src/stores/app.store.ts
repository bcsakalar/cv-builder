import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n from "@/i18n";
import { normalizeAppLocale, type AppLocale } from "@/i18n/locale";

type Theme = "light" | "dark" | "system";
const DEFAULT_LOCALE = normalizeAppLocale(i18n.resolvedLanguage ?? i18n.language);

interface AppState {
  sidebarOpen: boolean;
  theme: Theme;
  locale: AppLocale;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: AppLocale) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: "system",
      locale: DEFAULT_LOCALE,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => {
        const nextLocale = normalizeAppLocale(locale);
        i18n.changeLanguage(nextLocale);
        set({ locale: nextLocale });
      },
    }),
    {
      name: "cvbuilder-settings",
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<Pick<AppState, "sidebarOpen" | "theme" | "locale">> | undefined;
        const locale = normalizeAppLocale(persisted?.locale ?? currentState.locale);

        i18n.changeLanguage(locale);

        return {
          ...currentState,
          ...persisted,
          locale,
        };
      },
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
);
