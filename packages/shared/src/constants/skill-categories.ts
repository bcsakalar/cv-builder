// ═══════════════════════════════════════════════════════════
// Skill Categories & Proficiency Constants
// ═══════════════════════════════════════════════════════════

import { SkillCategory, ProficiencyLevel, LanguageProficiency } from "../types/cv.types";

export interface CategoryInfo {
  value: SkillCategory;
  label: string;
  description: string;
  color: string;
}

export const SKILL_CATEGORIES: CategoryInfo[] = [
  {
    value: SkillCategory.TECHNICAL,
    label: "Technical",
    description: "Programming languages, algorithms, architecture",
    color: "#3B82F6",
  },
  {
    value: SkillCategory.SOFT,
    label: "Soft Skills",
    description: "Communication, leadership, teamwork",
    color: "#10B981",
  },
  {
    value: SkillCategory.LANGUAGE,
    label: "Language",
    description: "Spoken/written languages",
    color: "#8B5CF6",
  },
  {
    value: SkillCategory.TOOL,
    label: "Tools",
    description: "IDEs, CLI tools, productivity software",
    color: "#F59E0B",
  },
  {
    value: SkillCategory.FRAMEWORK,
    label: "Frameworks",
    description: "Libraries, frameworks, and platforms",
    color: "#EF4444",
  },
  {
    value: SkillCategory.OTHER,
    label: "Other",
    description: "Miscellaneous skills",
    color: "#6B7280",
  },
];

export interface ProficiencyInfo {
  value: ProficiencyLevel;
  label: string;
  percentage: number;
}

export const PROFICIENCY_LEVELS: ProficiencyInfo[] = [
  { value: ProficiencyLevel.BEGINNER, label: "Beginner", percentage: 25 },
  { value: ProficiencyLevel.INTERMEDIATE, label: "Intermediate", percentage: 50 },
  { value: ProficiencyLevel.ADVANCED, label: "Advanced", percentage: 75 },
  { value: ProficiencyLevel.EXPERT, label: "Expert", percentage: 100 },
];

export interface LanguageProficiencyInfo {
  value: LanguageProficiency;
  label: string;
  description: string;
}

export const LANGUAGE_PROFICIENCIES: LanguageProficiencyInfo[] = [
  { value: LanguageProficiency.NATIVE, label: "Native", description: "Native or bilingual proficiency" },
  { value: LanguageProficiency.BILINGUAL, label: "Bilingual", description: "Bilingual proficiency" },
  { value: LanguageProficiency.FULL_PROFESSIONAL, label: "Full Professional", description: "Full professional proficiency" },
  { value: LanguageProficiency.PROFESSIONAL_WORKING, label: "Professional Working", description: "Professional working proficiency" },
  { value: LanguageProficiency.LIMITED_WORKING, label: "Limited Working", description: "Limited working proficiency" },
  { value: LanguageProficiency.ELEMENTARY, label: "Elementary", description: "Elementary proficiency" },
];

export const GOOGLE_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Nunito",
  "Raleway",
  "Source Sans 3",
  "PT Sans",
  "Merriweather",
  "Playfair Display",
  "Lora",
  "Crimson Text",
  "Libre Baskerville",
  "IBM Plex Sans",
  "IBM Plex Serif",
  "Fira Sans",
  "Work Sans",
  "DM Sans",
  "Plus Jakarta Sans",
  "Outfit",
] as const;

export const DEFAULT_THEME_CONFIG = {
  primaryColor: "#2563EB",
  secondaryColor: "#475569",
  accentColor: "#3B82F6",
  textColor: "#1E293B",
  backgroundColor: "#FFFFFF",
  headingFont: "Inter",
  bodyFont: "Inter",
  fontSize: "medium" as const,
  layout: "SINGLE_COLUMN" as const,
  spacing: "NORMAL" as const,
  photoStyle: "ROUND" as const,
  sectionDivider: "LINE" as const,
  showIcons: true,
  pageSize: "A4" as const,
  margin: "NORMAL" as const,
};
