import { DEFAULT_THEME, normalizeThemeConfig, useThemeStore } from "@/stores/theme.store";
import type { ThemeConfig } from "@/stores/theme.store";
import { useUpdateTheme } from "@/hooks/useCV";
import { useTranslation } from "react-i18next";

const COLORS = [
  { labelKey: "themeCustomizer.colorLabels.primary", key: "primaryColor" as const },
  { labelKey: "themeCustomizer.colorLabels.secondary", key: "secondaryColor" as const },
  { labelKey: "themeCustomizer.colorLabels.accent", key: "accentColor" as const },
  { labelKey: "themeCustomizer.colorLabels.text", key: "textColor" as const },
  { labelKey: "themeCustomizer.colorLabels.background", key: "bgColor" as const },
];

const FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat",
  "Poppins", "Raleway", "Nunito", "Merriweather", "Playfair Display",
  "Source Sans Pro", "PT Sans", "Work Sans", "DM Sans", "IBM Plex Sans",
  "Libre Baskerville", "Crimson Text", "Fira Sans", "Barlow", "Josefin Sans",
];

const FONT_SIZES = [9, 10, 11, 12, 13, 14];

/** One-click professional theme presets (colors + fonts). */
const THEME_PRESETS: Array<{ name: string; theme: Partial<ThemeConfig> }> = [
  { name: "Modern Blue", theme: { primaryColor: "#2563eb", secondaryColor: "#64748b", accentColor: "#f59e0b", textColor: "#1e293b", bgColor: "#ffffff", headingFont: "Inter", bodyFont: "Inter" } },
  { name: "Slate Mono", theme: { primaryColor: "#0f172a", secondaryColor: "#475569", accentColor: "#0ea5e9", textColor: "#0f172a", bgColor: "#ffffff", headingFont: "DM Sans", bodyFont: "DM Sans" } },
  { name: "Emerald", theme: { primaryColor: "#059669", secondaryColor: "#6b7280", accentColor: "#f59e0b", textColor: "#1f2937", bgColor: "#ffffff", headingFont: "Poppins", bodyFont: "Open Sans" } },
  { name: "Royal Purple", theme: { primaryColor: "#7c3aed", secondaryColor: "#6b7280", accentColor: "#ec4899", textColor: "#1e1b4b", bgColor: "#ffffff", headingFont: "Montserrat", bodyFont: "Lato" } },
  { name: "Crimson", theme: { primaryColor: "#dc2626", secondaryColor: "#57534e", accentColor: "#ea580c", textColor: "#292524", bgColor: "#ffffff", headingFont: "Playfair Display", bodyFont: "Source Sans Pro" } },
  { name: "Teal Ink", theme: { primaryColor: "#0d9488", secondaryColor: "#64748b", accentColor: "#f97316", textColor: "#134e4a", bgColor: "#ffffff", headingFont: "Work Sans", bodyFont: "Work Sans" } },
];

const LAYOUTS = [
  { value: "single" as const, labelKey: "themeCustomizer.layouts.single", icon: "▐" },
  { value: "two-column" as const, labelKey: "themeCustomizer.layouts.twoColumn", icon: "▐▐" },
  { value: "three-column" as const, labelKey: "themeCustomizer.layouts.threeColumn", icon: "▐▐▐" },
];

interface ThemeCustomizerProps {
  cvId: string;
  defaultThemeConfig?: Record<string, unknown>;
  currentThemeConfig?: Record<string, unknown>;
}

export function ThemeCustomizer({ cvId, defaultThemeConfig, currentThemeConfig }: ThemeCustomizerProps) {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const replaceTheme = useThemeStore((s) => s.replaceTheme);
  const resetTheme = useThemeStore((s) => s.resetTheme);
  const updateTheme = useUpdateTheme(cvId);

  const handleChange = (patch: Partial<ThemeConfig>) => {
    setTheme(patch);
    updateTheme.mutate({ ...(currentThemeConfig ?? {}), ...theme, ...patch } as Record<string, unknown>);
  };

  const handleReset = () => {
    const nextTheme = defaultThemeConfig ? normalizeThemeConfig(defaultThemeConfig) : DEFAULT_THEME;

    if (defaultThemeConfig) {
      replaceTheme(defaultThemeConfig);
    } else {
      resetTheme();
    }

    updateTheme.mutate({ ...(currentThemeConfig ?? {}), ...nextTheme } as unknown as Record<string, unknown>);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("themeCustomizer.title")}</h3>
        <button
          type="button"
          data-testid="theme-reset"
          onClick={handleReset}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {t("common.reset")}
        </button>
      </div>

      {/* Presets */}
      <section>
        <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">{t("themeCustomizer.presets", { defaultValue: "Theme presets" })}</h4>
        <div className="grid grid-cols-3 gap-2">
          {THEME_PRESETS.map((preset) => {
            const active =
              theme.primaryColor === preset.theme.primaryColor &&
              theme.accentColor === preset.theme.accentColor &&
              theme.headingFont === preset.theme.headingFont;
            return (
              <button
                key={preset.name}
                type="button"
                data-testid={`theme-preset-${preset.name.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => handleChange(preset.theme)}
                className={`rounded-lg border p-2 text-center transition hover:bg-accent ${active ? "border-primary ring-1 ring-primary" : ""}`}
                title={preset.name}
              >
                <div className="mx-auto mb-1 flex justify-center gap-0.5">
                  <span style={{ background: preset.theme.primaryColor }} className="h-4 w-4 rounded-full border" />
                  <span style={{ background: preset.theme.accentColor }} className="h-4 w-4 rounded-full border" />
                  <span style={{ background: preset.theme.secondaryColor }} className="h-4 w-4 rounded-full border" />
                </div>
                <div className="truncate text-[11px]">{preset.name}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Colors */}
      <section>
        <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">{t("themeCustomizer.colors")}</h4>
        <div className="space-y-2">
          {COLORS.map(({ labelKey, key }) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-sm">{t(labelKey)}</label>
              <input
                type="color"
                data-testid={`theme-color-${key}`}
                value={theme[key]}
                onChange={(e) => handleChange({ [key]: e.target.value })}
                className="h-8 w-12 cursor-pointer rounded border border-input bg-transparent p-1"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Fonts */}
      <section>
        <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">{t("themeCustomizer.typography")}</h4>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t("themeCustomizer.headingFont")}</label>
            <select
              data-testid="theme-heading-font"
              value={theme.headingFont}
              onChange={(e) => handleChange({ headingFont: e.target.value })}
              className="w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground shadow-sm"
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t("themeCustomizer.bodyFont")}</label>
            <select
              data-testid="theme-body-font"
              value={theme.bodyFont}
              onChange={(e) => handleChange({ bodyFont: e.target.value })}
              className="w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground shadow-sm"
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t("themeCustomizer.fontSize")}</label>
            <select
              data-testid="theme-font-size"
              value={theme.fontSize}
              onChange={(e) => handleChange({ fontSize: Number(e.target.value) })}
              className="w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground shadow-sm"
            >
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>{s}pt</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Layout */}
      <section>
        <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">{t("themeCustomizer.layout")}</h4>
        <div className="grid grid-cols-3 gap-2">
          {LAYOUTS.map(({ value, labelKey, icon }) => (
            <button
              key={value}
              type="button"
              data-testid={`theme-layout-${value}`}
              onClick={() => handleChange({ layout: value })}
              className={`rounded-lg border p-3 text-center text-sm transition-colors ${
                theme.layout === value
                  ? "border-primary bg-primary/5 text-primary"
                  : "hover:bg-accent"
              }`}
            >
              <div className="text-lg">{icon}</div>
              <div className="mt-1 text-xs">{t(labelKey)}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
