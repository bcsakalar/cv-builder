import { create } from "zustand";

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  bgColor: string;
  headingFont: string;
  bodyFont: string;
  fontSize: number;
  layout: "single" | "two-column" | "three-column";
}

export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#2563eb",
  secondaryColor: "#64748b",
  accentColor: "#f59e0b",
  textColor: "#1e293b",
  bgColor: "#ffffff",
  headingFont: "Inter",
  bodyFont: "Inter",
  fontSize: 11,
  layout: "single",
};

export type TemplateName = "modern" | "classic" | "minimal" | "creative" | "corporate";

const TEMPLATE_PREVIEW_MAP: Record<string, TemplateName> = {
  modern: "modern",
  "modern-minimal": "modern",
  classic: "classic",
  "classic-professional": "classic",
  minimal: "minimal",
  "academic-cv": "minimal",
  creative: "creative",
  "creative-portfolio": "creative",
  corporate: "corporate",
  "tech-developer": "corporate",
};

function parseLayout(value: unknown): ThemeConfig["layout"] {
  switch (value) {
    case "single":
    case "SINGLE_COLUMN":
      return "single";
    case "two-column":
    case "TWO_COLUMN_LEFT":
    case "TWO_COLUMN_RIGHT":
      return "two-column";
    case "three-column":
    case "THREE_COLUMN":
    case "THREE_PANEL":
      return "three-column";
    default:
      return DEFAULT_THEME.layout;
  }
}

function parseString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function parseFontSize(value: unknown, customFontSize: unknown): number {
  if (value === "small") return 10;
  if (value === "medium") return 11;
  if (value === "large") return 12;
  if (value === "custom") return parseNumber(customFontSize, DEFAULT_THEME.fontSize);
  return parseNumber(value, DEFAULT_THEME.fontSize);
}

export function normalizeThemeConfig(themeConfig?: Record<string, unknown> | null): ThemeConfig {
  const config = themeConfig ?? {};

  return {
    primaryColor: parseString(config.primaryColor, DEFAULT_THEME.primaryColor),
    secondaryColor: parseString(config.secondaryColor, DEFAULT_THEME.secondaryColor),
    accentColor: parseString(config.accentColor, DEFAULT_THEME.accentColor),
    textColor: parseString(config.textColor, DEFAULT_THEME.textColor),
    bgColor: parseString(config.bgColor ?? config.backgroundColor, DEFAULT_THEME.bgColor),
    headingFont: parseString(config.headingFont, DEFAULT_THEME.headingFont),
    bodyFont: parseString(config.bodyFont, DEFAULT_THEME.bodyFont),
    fontSize: parseFontSize(config.fontSize, config.customFontSize),
    layout: parseLayout(config.layout),
  };
}

export function resolveTemplatePreview(templateSlug?: string | null): TemplateName {
  return TEMPLATE_PREVIEW_MAP[templateSlug ?? ""] ?? "modern";
}

interface ThemeState {
  theme: ThemeConfig;
  activeTemplate: TemplateName;
  setTheme: (theme: Partial<ThemeConfig>) => void;
  replaceTheme: (themeConfig?: Record<string, unknown> | null) => void;
  setActiveTemplate: (t: TemplateName) => void;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: DEFAULT_THEME,
  activeTemplate: "modern",
  setTheme: (patch) => set((s) => ({ theme: { ...s.theme, ...patch } })),
  replaceTheme: (themeConfig) => set({ theme: normalizeThemeConfig(themeConfig) }),
  setActiveTemplate: (activeTemplate) => set({ activeTemplate }),
  resetTheme: () => set({ theme: DEFAULT_THEME }),
}));
