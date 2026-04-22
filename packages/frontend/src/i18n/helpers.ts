import { CV_SECTIONS } from "@cvbuilder/shared";
import type { TOptions } from "i18next";
import i18n from "@/i18n";
import { normalizeAppLocale } from "./locale";

export function translate(key: string, options?: TOptions): string {
  return i18n.t(key, options) as string;
}

export function translateForLocale(locale: string | undefined, key: string, options?: TOptions): string {
  return i18n.t(key, { lng: normalizeAppLocale(locale), ...options }) as string;
}

export function getSectionLabel(sectionKey: string, options?: TOptions): string {
  return translate(`cvSections.${sectionKey}.label`, {
    defaultValue: CV_SECTIONS[sectionKey]?.label ?? sectionKey,
    ...options,
  });
}

export function getSectionLabelForLocale(sectionKey: string, locale?: string): string {
  return translateForLocale(locale, `cvSections.${sectionKey}.label`, {
    defaultValue: CV_SECTIONS[sectionKey]?.label ?? sectionKey,
  });
}

export function getLanguageProficiencyLabelForLocale(proficiency?: string, locale?: string): string {
  if (!proficiency) return "";

  return translateForLocale(locale, languageProficiencyLabelKeys[proficiency] ?? "", {
    defaultValue: proficiency,
  });
}

const templateNameKeys: Record<string, string> = {
  "classic-professional": "templates.templateNames.classicProfessional",
  "modern-minimal": "templates.templateNames.modernMinimal",
  "creative-portfolio": "templates.templateNames.creativePortfolio",
  "academic-cv": "templates.templateNames.academicCv",
  "tech-developer": "templates.templateNames.techDeveloper",
};

const templateDescriptionKeys: Record<string, string> = {
  "classic-professional": "templates.templateDescriptions.classicProfessional",
  "modern-minimal": "templates.templateDescriptions.modernMinimal",
  "creative-portfolio": "templates.templateDescriptions.creativePortfolio",
  "academic-cv": "templates.templateDescriptions.academicCv",
  "tech-developer": "templates.templateDescriptions.techDeveloper",
};

const templateCategoryLabelKeys: Record<string, string> = {
  PROFESSIONAL: "templates.categories.professional",
  MODERN: "templates.categories.modern",
  CREATIVE: "templates.categories.creative",
  ACADEMIC: "templates.categories.academic",
  TECHNICAL: "templates.categories.technical",
};

export function getDateLocale(locale?: string): string {
  return normalizeAppLocale(locale) === "tr" ? "tr-TR" : "en-US";
}

export function getStatusLabel(status?: string): string {
  if (!status) return "";

  return translate(`status.${status.toLowerCase()}`, {
    defaultValue: status,
  });
}

export function getTemplateName(slug?: string, fallback?: string): string {
  if (!slug) return fallback ?? "";

  return translate(templateNameKeys[slug] ?? "", {
    defaultValue: fallback ?? slug,
  });
}

export function getTemplateDescription(slug?: string, fallback?: string): string {
  if (!slug) return fallback ?? "";

  return translate(templateDescriptionKeys[slug] ?? "", {
    defaultValue: fallback ?? "",
  });
}

export function getTemplateCategoryLabel(category?: string): string {
  if (!category) return "";

  return translate(templateCategoryLabelKeys[category] ?? "", {
    defaultValue: category,
  });
}

export const skillCategoryLabelKeys: Record<string, string> = {
  TECHNICAL: "editorSections.skills.categories.technical",
  SOFT: "editorSections.skills.categories.soft",
  LANGUAGE: "editorSections.skills.categories.language",
  TOOL: "editorSections.skills.categories.tool",
  FRAMEWORK: "editorSections.skills.categories.framework",
  OTHER: "editorSections.skills.categories.other",
};

export const skillLevelLabelKeys: Record<string, string> = {
  BEGINNER: "editorSections.skills.levels.beginner",
  INTERMEDIATE: "editorSections.skills.levels.intermediate",
  ADVANCED: "editorSections.skills.levels.advanced",
  EXPERT: "editorSections.skills.levels.expert",
};

export const languageProficiencyLabelKeys: Record<string, string> = {
  NATIVE: "editorSections.languages.levels.native",
  BILINGUAL: "editorSections.languages.levels.bilingual",
  FULL_PROFESSIONAL: "editorSections.languages.levels.fullProfessional",
  PROFESSIONAL_WORKING: "editorSections.languages.levels.professionalWorking",
  LIMITED_WORKING: "editorSections.languages.levels.limitedWorking",
  ELEMENTARY: "editorSections.languages.levels.elementary",
  FLUENT: "editorSections.languages.levels.fluent",
  ADVANCED: "editorSections.languages.levels.advanced",
  INTERMEDIATE: "editorSections.languages.levels.intermediate",
  BEGINNER: "editorSections.languages.levels.beginner",
};