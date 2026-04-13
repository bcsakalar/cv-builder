// ═══════════════════════════════════════════════════════════
// CV Data Models — Core type definitions for the CV Builder
// ═══════════════════════════════════════════════════════════

export enum CVStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
}

export enum SkillCategory {
  TECHNICAL = "TECHNICAL",
  SOFT = "SOFT",
  LANGUAGE = "LANGUAGE",
  TOOL = "TOOL",
  FRAMEWORK = "FRAMEWORK",
  OTHER = "OTHER",
}

export enum ProficiencyLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
  EXPERT = "EXPERT",
}

export enum LanguageProficiency {
  NATIVE = "NATIVE",
  BILINGUAL = "BILINGUAL",
  FULL_PROFESSIONAL = "FULL_PROFESSIONAL",
  PROFESSIONAL_WORKING = "PROFESSIONAL_WORKING",
  LIMITED_WORKING = "LIMITED_WORKING",
  ELEMENTARY = "ELEMENTARY",
}

export enum TemplateCategory {
  MODERN = "MODERN",
  CLASSIC = "CLASSIC",
  MINIMAL = "MINIMAL",
  CREATIVE = "CREATIVE",
  CORPORATE = "CORPORATE",
}

export enum AnalysisStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum PageSize {
  A4 = "A4",
  LETTER = "LETTER",
  LEGAL = "LEGAL",
}

export enum SpacingPreset {
  COMPACT = "COMPACT",
  NORMAL = "NORMAL",
  RELAXED = "RELAXED",
}

export enum LayoutType {
  SINGLE_COLUMN = "SINGLE_COLUMN",
  TWO_COLUMN_LEFT = "TWO_COLUMN_LEFT",
  TWO_COLUMN_RIGHT = "TWO_COLUMN_RIGHT",
  THREE_PANEL = "THREE_PANEL",
}

export enum PhotoStyle {
  ROUND = "ROUND",
  SQUARE = "SQUARE",
  ROUNDED = "ROUNDED",
  NONE = "NONE",
}

export enum SectionDivider {
  LINE = "LINE",
  THIN_LINE = "THIN_LINE",
  SPACE = "SPACE",
  DECORATIVE = "DECORATIVE",
}

export enum MarginSize {
  NARROW = "NARROW",
  NORMAL = "NORMAL",
  WIDE = "WIDE",
}

// ── Theme Configuration ──────────────────────────────────

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  headingFont: string;
  bodyFont: string;
  fontSize: "small" | "medium" | "large" | "custom";
  customFontSize?: number;
  layout: LayoutType;
  spacing: SpacingPreset;
  photoStyle: PhotoStyle;
  sectionDivider: SectionDivider;
  showIcons: boolean;
  pageSize: PageSize;
  margin: MarginSize;
}

// ── Personal Info ────────────────────────────────────────

export interface PersonalInfo {
  id: string;
  cvId: string;
  firstName: string;
  lastName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  zipCode: string;
  dateOfBirth: string | null;
  nationality: string | null;
  website: string | null;
  linkedIn: string | null;
  github: string | null;
  twitter: string | null;
  stackoverflow: string | null;
  medium: string | null;
  behance: string | null;
  dribbble: string | null;
  profilePhotoUrl: string | null;
  address: string | null;
}

// ── Summary ──────────────────────────────────────────────

export interface Summary {
  id: string;
  cvId: string;
  content: string;
  aiGenerated: boolean;
}

// ── Experience ───────────────────────────────────────────

export interface Experience {
  id: string;
  cvId: string;
  jobTitle: string;
  company: string;
  companyDescription: string | null;
  location: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string;
  achievements: string[];
  technologies: string[];
  orderIndex: number;
}

// ── Education ────────────────────────────────────────────

export interface Education {
  id: string;
  cvId: string;
  degree: string;
  fieldOfStudy: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string | null;
  gpa: string | null;
  relevantCoursework: string[];
  achievements: string[];
  orderIndex: number;
}

// ── Skill ────────────────────────────────────────────────

export interface Skill {
  id: string;
  cvId: string;
  name: string;
  category: SkillCategory;
  proficiencyLevel: ProficiencyLevel;
  yearsOfExperience: number | null;
  orderIndex: number;
}

// ── Project ──────────────────────────────────────────────

export interface Project {
  id: string;
  cvId: string;
  name: string;
  description: string;
  role: string | null;
  technologies: string[];
  url: string | null;
  githubUrl: string | null;
  startDate: string;
  endDate: string | null;
  highlights: string[];
  isFromGitHub: boolean;
  githubRepoData: GitHubRepoData | null;
  orderIndex: number;
}

export interface GitHubRepoData {
  stars: number;
  forks: number;
  watchers: number;
  language: string;
  languageStats: Record<string, number>;
  commitCount: number;
  userCommitCount: number;
  openIssues: number;
  topics: string[];
  license: string | null;
}

// ── Certification ────────────────────────────────────────

export interface Certification {
  id: string;
  cvId: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  orderIndex: number;
}

// ── Language ─────────────────────────────────────────────

export interface Language {
  id: string;
  cvId: string;
  name: string;
  proficiency: LanguageProficiency;
  orderIndex: number;
}

// ── Volunteer Experience ─────────────────────────────────

export interface VolunteerExperience {
  id: string;
  cvId: string;
  role: string;
  organization: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  description: string;
  orderIndex: number;
}

// ── Publication ──────────────────────────────────────────

export interface Publication {
  id: string;
  cvId: string;
  title: string;
  publisher: string;
  date: string;
  url: string | null;
  description: string | null;
  orderIndex: number;
}

// ── Award ────────────────────────────────────────────────

export interface Award {
  id: string;
  cvId: string;
  title: string;
  issuer: string;
  date: string;
  description: string | null;
  orderIndex: number;
}

// ── Reference ────────────────────────────────────────────

export interface Reference {
  id: string;
  cvId: string;
  name: string;
  title: string;
  company: string;
  email: string | null;
  phone: string | null;
  relationship: string;
  orderIndex: number;
}

// ── Hobby ────────────────────────────────────────────────

export interface Hobby {
  id: string;
  cvId: string;
  name: string;
  description: string | null;
  orderIndex: number;
}

// ── Custom Section ───────────────────────────────────────

export interface CustomSection {
  id: string;
  cvId: string;
  sectionTitle: string;
  content: Record<string, unknown>;
  orderIndex: number;
}

// ── Template ─────────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  slug: string;
  description: string;
  previewImageUrl: string;
  category: TemplateCategory;
  layoutConfig: Record<string, unknown>;
  isDefault: boolean;
  createdAt: string;
}

// ── CV (Full) ────────────────────────────────────────────

export interface CV {
  id: string;
  userId: string;
  title: string;
  slug: string;
  status: CVStatus;
  templateId: string;
  themeConfig: ThemeConfig;
  sectionOrder: string[];
  locale: string;
  isAtsOptimized: boolean;
  lastExportedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CVWithRelations extends CV {
  personalInfo: PersonalInfo | null;
  summary: Summary | null;
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  volunteerExperiences: VolunteerExperience[];
  publications: Publication[];
  awards: Award[];
  references: Reference[];
  hobbies: Hobby[];
  customSections: CustomSection[];
  template: Template;
}

// ── PDF Export ────────────────────────────────────────────

export interface PDFExport {
  id: string;
  cvId: string;
  templateId: string;
  filePath: string;
  fileSize: number;
  generatedAt: string;
}

// ── GitHub Analysis ──────────────────────────────────────

export interface GitHubAnalysis {
  id: string;
  cvId: string;
  repoFullName: string;
  analysisResult: GitHubAnalysisResult;
  status: AnalysisStatus;
  analyzedAt: string | null;
  createdAt: string;
}

export interface GitHubAnalysisResult {
  summary: string;
  technologies: CategorizedTechnologies;
  complexityLevel: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  userContribution: string;
  highlights: string[];
  projectType: string;
  architecturePatterns: string[];
  testCoverage: string | null;
  repoMetadata: RepoMetadata;
  dependencies: DependencyInfo[];
}

export interface CategorizedTechnologies {
  languages: string[];
  frameworks: string[];
  libraries: string[];
  tools: string[];
  databases: string[];
  cloud: string[];
  other: string[];
}

export interface RepoMetadata {
  name: string;
  fullName: string;
  description: string | null;
  homepage: string | null;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  topics: string[];
  license: string | null;
  createdAt: string;
  updatedAt: string;
  languageBreakdown: Record<string, number>;
  totalCommits: number;
  userCommits: number;
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: "production" | "development";
  ecosystem: string;
}

// ── Create / Update DTOs ─────────────────────────────────

export interface CreateCVInput {
  title: string;
  templateId: string;
  locale?: string;
}

export interface UpdateCVInput {
  title?: string;
  status?: CVStatus;
  templateId?: string;
  locale?: string;
  isAtsOptimized?: boolean;
}

export interface UpdateThemeInput {
  themeConfig: Partial<ThemeConfig>;
}

export interface UpdateSectionOrderInput {
  sectionOrder: string[];
}
