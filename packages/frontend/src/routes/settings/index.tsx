import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../__root";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAppStore } from "@/stores/app.store";
import { useTranslation } from "react-i18next";
import { Settings, Globe, Palette, Database, Info, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/i18n/locale";

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const LANGUAGES = [
  { value: "en", labelKey: "languages.en" },
  { value: "tr", labelKey: "languages.tr" },
] as const;

const THEMES = [
  { value: "light", labelKey: "settings.light", icon: Sun },
  { value: "dark", labelKey: "settings.dark", icon: Moon },
  { value: "system", labelKey: "settings.system", icon: Monitor },
] as const;

function SettingsPage() {
  const { t } = useTranslation();
  const { theme, locale, setTheme, setLocale } = useAppStore();

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl space-y-8 p-6">
        <div className="flex items-center gap-3">
          <Settings size={28} />
          <div>
            <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("settings.subtitle")}
            </p>
          </div>
        </div>

        {/* Language */}
        <section className="rounded-lg border p-6">
          <div className="mb-4 flex items-center gap-2">
            <Globe size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold">{t("settings.language")}</h2>
          </div>
          <select
            data-testid="settings-locale"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={locale}
            onChange={(e) => setLocale(e.target.value as AppLocale)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{t(l.labelKey)}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("settings.languageHint")}
          </p>
        </section>

        {/* Theme */}
        <section className="rounded-lg border p-6">
          <div className="mb-4 flex items-center gap-2">
            <Palette size={20} className="text-purple-500" />
            <h2 className="text-lg font-semibold">{t("settings.theme")}</h2>
          </div>
          <div className="flex gap-3">
            {THEMES.map(({ value, labelKey, icon: Icon }) => (
              <button
                key={value}
                type="button"
                data-testid={`settings-theme-${value}`}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors",
                  theme === value
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-accent"
                )}
              >
                <Icon size={16} />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </section>

        {/* Data */}
        <section className="rounded-lg border p-6">
          <div className="mb-4 flex items-center gap-2">
            <Database size={20} className="text-green-500" />
            <h2 className="text-lg font-semibold">{t("settings.data")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("settings.dataDesc")}
          </p>
        </section>

        {/* About */}
        <section className="rounded-lg border p-6">
          <div className="mb-4 flex items-center gap-2">
            <Info size={20} className="text-amber-500" />
            <h2 className="text-lg font-semibold">{t("settings.about")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("settings.aboutDesc")}
          </p>
        </section>
      </div>
    </MainLayout>
  );
}
