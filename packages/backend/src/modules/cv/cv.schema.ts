// ═══════════════════════════════════════════════════════════
// CV Validation Schemas (Zod)
// ═══════════════════════════════════════════════════════════

import { z } from "zod";

const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const nullableString = (schema: z.ZodString) =>
  z.preprocess(emptyStringToNull, schema.nullable().default(null));

const nullableUrl = z.preprocess(
  emptyStringToNull,
  z.string().url().nullable().default(null)
);

const nullableEmail = z.preprocess(
  emptyStringToNull,
  z.string().email().nullable().default(null)
);

const LANGUAGE_PROFICIENCY_ALIASES = {
  FLUENT: "FULL_PROFESSIONAL",
  ADVANCED: "PROFESSIONAL_WORKING",
  INTERMEDIATE: "LIMITED_WORKING",
  BEGINNER: "ELEMENTARY",
} as const;

export const cvIdParamSchema = z.object({
  id: z.string().uuid("Invalid CV ID"),
});

export const createCVSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  templateId: z.string().min(1, "Template is required"),
  locale: z.string().min(2).max(5).default("en"),
});

export const updateCVSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  templateId: z.string().uuid().optional(),
  locale: z.string().min(2).max(5).optional(),
  isAtsOptimized: z.boolean().optional(),
});

export const updateThemeSchema = z.object({
  themeConfig: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    textColor: z.string().optional(),
    bgColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    headingFont: z.string().optional(),
    bodyFont: z.string().optional(),
    fontSize: z.number().int().min(6).max(30).optional(),
    layout: z.enum(["single", "two-column", "three-column"]).optional(),
    spacing: z.enum(["COMPACT", "NORMAL", "RELAXED"]).optional(),
    photoStyle: z.enum(["ROUND", "SQUARE", "ROUNDED", "NONE"]).optional(),
    sectionDivider: z.enum(["LINE", "THIN_LINE", "SPACE", "DECORATIVE"]).optional(),
    showIcons: z.boolean().optional(),
    pageSize: z.enum(["A4", "LETTER", "LEGAL"]).optional(),
    margin: z.enum(["NARROW", "NORMAL", "WIDE"]).optional(),
  }).passthrough(),
});

export const updateSectionOrderSchema = z.object({
  sectionOrder: z.array(z.string()).min(1, "At least one section is required"),
});

// ── Section Schemas ──────────────────────────────────────

export const personalInfoSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  professionalTitle: z.string().max(200).default(""),
  email: z.string().email(),
  phone: z.string().max(30).default(""),
  city: z.string().max(100).default(""),
  country: z.string().max(100).default(""),
  zipCode: z.string().max(20).default(""),
  dateOfBirth: z.string().nullable().default(null),
  nationality: z.string().max(100).nullable().default(null),
  website: z.string().url().nullable().default(null),
  linkedIn: z.string().url().nullable().default(null),
  github: z.string().url().nullable().default(null),
  twitter: z.string().url().nullable().default(null),
  stackoverflow: z.string().url().nullable().default(null),
  medium: z.string().url().nullable().default(null),
  behance: z.string().url().nullable().default(null),
  dribbble: z.string().url().nullable().default(null),
  profilePhotoUrl: z.string().nullable().default(null),
  address: z.string().max(300).nullable().default(null),
});

export const summarySchema = z.object({
  content: z.string().max(5000).default(""),
  aiGenerated: z.boolean().default(false),
});

export const experienceSchema = z.object({
  jobTitle: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  companyDescription: z.string().max(500).nullable().default(null),
  location: z.string().max(200).default(""),
  startDate: z.string().min(1),
  endDate: z.string().nullable().default(null),
  isCurrent: z.boolean().default(false),
  description: z.string().max(5000).default(""),
  achievements: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  orderIndex: z.number().int().min(0).default(0),
});

export const educationSchema = z.object({
  degree: z.string().min(1).max(200),
  fieldOfStudy: z.string().min(1).max(200),
  institution: z.string().min(1).max(200),
  location: z.string().max(200).default(""),
  startDate: z.string().min(1),
  endDate: z.string().nullable().default(null),
  gpa: z.string().max(10).nullable().default(null),
  relevantCoursework: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  orderIndex: z.number().int().min(0).default(0),
});

export const skillSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["TECHNICAL", "SOFT", "LANGUAGE", "TOOL", "FRAMEWORK", "OTHER"]),
  proficiencyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  yearsOfExperience: z.number().min(0).max(50).nullable().default(null),
  orderIndex: z.number().int().min(0).default(0),
});

export const projectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).default(""),
  role: z.string().max(200).nullable().default(null),
  technologies: z.array(z.string()).default([]),
  url: z.string().url().nullable().default(null),
  githubUrl: z.string().url().nullable().default(null),
  startDate: z.string().min(1),
  endDate: z.string().nullable().default(null),
  highlights: z.array(z.string()).default([]),
  isFromGitHub: z.boolean().default(false),
  githubRepoData: z.record(z.unknown()).nullable().default(null),
  orderIndex: z.number().int().min(0).default(0),
});

export const certificationSchema = z.object({
  name: z.string().min(1).max(200),
  issuingOrganization: z.string().min(1).max(200).optional(),
  issuer: z.string().min(1).max(200).optional(),
  issueDate: z.string().min(1),
  expirationDate: nullableString(z.string()),
  expiryDate: nullableString(z.string()).optional(),
  credentialId: nullableString(z.string().max(100)),
  credentialUrl: nullableUrl,
  orderIndex: z.number().int().min(0).default(0),
}).superRefine((value, ctx) => {
  if (!hasText(value.issuingOrganization) && !hasText(value.issuer)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["issuingOrganization"],
      message: "Issuing organization is required",
    });
  }
}).transform(({ expiryDate, issuer, issuingOrganization, expirationDate, ...rest }) => ({
  ...rest,
  issuingOrganization: issuingOrganization ?? issuer ?? "",
  expirationDate: expirationDate ?? expiryDate ?? null,
}));

export const languageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  language: z.string().min(1).max(100).optional(),
  proficiency: z.enum([
    "NATIVE",
    "BILINGUAL",
    "FULL_PROFESSIONAL",
    "PROFESSIONAL_WORKING",
    "LIMITED_WORKING",
    "ELEMENTARY",
    "FLUENT",
    "ADVANCED",
    "INTERMEDIATE",
    "BEGINNER",
  ]),
  orderIndex: z.number().int().min(0).default(0),
}).superRefine((value, ctx) => {
  if (!hasText(value.name) && !hasText(value.language)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["name"],
      message: "Language name is required",
    });
  }
}).transform(({ language, name, proficiency, ...rest }) => ({
  ...rest,
  name: name ?? language ?? "",
  proficiency: LANGUAGE_PROFICIENCY_ALIASES[
    proficiency as keyof typeof LANGUAGE_PROFICIENCY_ALIASES
  ] ?? proficiency,
}));

export const volunteerExperienceSchema = z.object({
  role: z.string().min(1).max(200),
  organization: z.string().min(1).max(200),
  location: z.string().max(200).nullable().default(null),
  startDate: z.string().min(1),
  endDate: z.string().nullable().default(null),
  description: z.string().max(5000).default(""),
  orderIndex: z.number().int().min(0).default(0),
});

export const publicationSchema = z.object({
  title: z.string().min(1).max(300),
  publisher: z.string().min(1).max(200),
  date: z.string().min(1).optional(),
  publishDate: z.string().min(1).optional(),
  url: nullableUrl,
  description: nullableString(z.string().max(2000)),
  orderIndex: z.number().int().min(0).default(0),
}).superRefine((value, ctx) => {
  if (!hasText(value.date) && !hasText(value.publishDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["date"],
      message: "Publication date is required",
    });
  }
}).transform(({ publishDate, date, ...rest }) => ({
  ...rest,
  date: date ?? publishDate ?? "",
}));

export const awardSchema = z.object({
  title: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  date: z.string().min(1),
  description: nullableString(z.string().max(2000)),
  orderIndex: z.number().int().min(0).default(0),
});

export const referenceSchema = z.object({
  name: z.string().min(1).max(200),
  title: z.string().min(1).max(200).optional(),
  position: z.string().min(1).max(200).optional(),
  company: z.string().min(1).max(200),
  email: nullableEmail,
  phone: nullableString(z.string().max(30)),
  relationship: z.string().min(1).max(200),
  orderIndex: z.number().int().min(0).default(0),
}).superRefine((value, ctx) => {
  if (!hasText(value.title) && !hasText(value.position)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["title"],
      message: "Reference title is required",
    });
  }
}).transform(({ position, title, ...rest }) => ({
  ...rest,
  title: title ?? position ?? "",
}));

export const hobbySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().default(null),
  orderIndex: z.number().int().min(0).default(0),
});

export const customSectionSchema = z.object({
  sectionTitle: z.string().min(1).max(200),
  content: z.record(z.unknown()),
  orderIndex: z.number().int().min(0).default(0),
});

// ── Type Exports ─────────────────────────────────────────

export type CreateCVInput = z.infer<typeof createCVSchema>;
export type UpdateCVInput = z.infer<typeof updateCVSchema>;
export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;
export type UpdateSectionOrderInput = z.infer<typeof updateSectionOrderSchema>;
export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;
export type SummaryInput = z.infer<typeof summarySchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type SkillInput = z.infer<typeof skillSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type CertificationInput = z.infer<typeof certificationSchema>;
export type LanguageInput = z.infer<typeof languageSchema>;
export type VolunteerExperienceInput = z.infer<typeof volunteerExperienceSchema>;
export type PublicationInput = z.infer<typeof publicationSchema>;
export type AwardInput = z.infer<typeof awardSchema>;
export type ReferenceInput = z.infer<typeof referenceSchema>;
export type HobbyInput = z.infer<typeof hobbySchema>;
export type CustomSectionInput = z.infer<typeof customSectionSchema>;
