// ═══════════════════════════════════════════════════════════
// AI Service — artifact-aware Ollama orchestration
// ═══════════════════════════════════════════════════════════

import type {
  AIArtifact,
  AIArtifactApplyResult,
  AIATSCheckResponse,
  AIATSResult,
  AICoverLetterResponse,
  AICVReviewResponse,
  AICVReviewResult,
  AIGitHubProfileSummaryResponse,
  AIHealthResult,
  AIImproveTextResult,
  AIJobMatchResponse,
  AIJobMatchResult,
  AISkillSuggestionResult,
  AISummaryGenerationResult,
  AITailorResponse,
  AITailorResult,
  AITargetSection,
  AIToolKind,
  GitHubComplexityLevel,
} from "@cvbuilder/shared";
import type { Prisma } from "@prisma/client";
import { AiArtifactStatus, AiToolKind } from "@prisma/client";
import { ollamaConfig } from "../../config/ollama";
import { logger } from "../../lib/logger";
import { checkModelAvailable, checkOllamaHealth, getAvailableModels, ollama } from "../../lib/ollama";
import { prisma } from "../../lib/prisma";
import { cacheDelete } from "../../lib/redis";
import { ApiError } from "../../utils/api-error";
import { aiRepository, AI_ARTIFACT_SELECT } from "./ai.repository";
import { AI_PROMPTS, localizeSystemPrompt } from "./ai.prompts";
import { buildAtsAnalysis } from "./ai.ats";

type ArtifactRecord = Prisma.AiArtifactGetPayload<{ select: typeof AI_ARTIFACT_SELECT }>;

const PROMPT_VERSION = "developer-cv-v2";
const MAX_HISTORY_ITEMS = 10;

const TOOL_TO_DB: Record<AIToolKind, AiToolKind> = {
  summary: AiToolKind.SUMMARY,
  skills: AiToolKind.SKILLS,
  ats: AiToolKind.ATS,
  review: AiToolKind.REVIEW,
  job_match: AiToolKind.JOB_MATCH,
  tailor: AiToolKind.TAILOR,
  cover_letter: AiToolKind.COVER_LETTER,
  github_profile_summary: AiToolKind.GITHUB_PROFILE_SUMMARY,
  project_improvement: AiToolKind.PROJECT_IMPROVEMENT,
  experience_improvement: AiToolKind.EXPERIENCE_IMPROVEMENT,
};

const DB_TO_TOOL: Record<AiToolKind, AIToolKind> = {
  [AiToolKind.SUMMARY]: "summary",
  [AiToolKind.SKILLS]: "skills",
  [AiToolKind.ATS]: "ats",
  [AiToolKind.REVIEW]: "review",
  [AiToolKind.JOB_MATCH]: "job_match",
  [AiToolKind.TAILOR]: "tailor",
  [AiToolKind.COVER_LETTER]: "cover_letter",
  [AiToolKind.GITHUB_PROFILE_SUMMARY]: "github_profile_summary",
  [AiToolKind.PROJECT_IMPROVEMENT]: "project_improvement",
  [AiToolKind.EXPERIENCE_IMPROVEMENT]: "experience_improvement",
};

const DB_TO_STATUS = {
  [AiArtifactStatus.READY]: "ready",
  [AiArtifactStatus.APPLIED]: "applied",
  [AiArtifactStatus.DISMISSED]: "dismissed",
  [AiArtifactStatus.FAILED]: "failed",
} as const;

interface DeepRepoAnalysisInput {
  name: string;
  description: string | null;
  languages: { language: string; percentage: number }[];
  topics: string[];
  fileTree: {
    totalFiles: number;
    totalDirectories: number;
    maxDepth?: number;
    filesByExtension: Record<string, number>;
    configFiles: string[];
    projectType: string;
    keyDirectories: string[];
  };
  dependencies: {
    source: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } | null;
  readmeContent: string | null;
  sourceSnippets: { path: string; content: string }[];
  commitCount: number;
  contributors: number;
  stars: number;
  qualityScore: number;
  hasTests: boolean;
  hasCI: boolean;
  hasDocker: boolean;
  hasTypeScript: boolean;
  recentActivityCount: number;
  activeDays: number;
  recentCommits: string[];
  dependencySignals: {
    frameworks: string[];
    databases: string[];
    uiLibraries: string[];
    testingTools: string[];
    buildTools: string[];
    linters: string[];
  } | null;
}

interface DeepRepoAnalysisOutput {
  projectSummary: string;
  architectureAnalysis: string;
  techStackAssessment: string;
  complexityLevel: GitHubComplexityLevel;
  detectedSkills: string[];
  strengths: string[];
  improvements: string[];
  cvReadyDescription: string;
  cvHighlights: string[];
}

interface RepoAnalysisAttemptResult {
  parsed: Record<string, unknown>;
  merged: DeepRepoAnalysisOutput;
  qualityScore: number;
  directFieldCount: number;
}

function cvCacheKey(userId: string, cvId: string): string {
  return `cv:${userId}:${cvId}`;
}

function normalizeLocale(locale?: string): string {
  return locale?.trim() || "en";
}

function truncateText(value: string, maxLength = 180): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function toInputJson(value?: Record<string, unknown>): Prisma.InputJsonValue | null {
  if (!value) {
    return null;
  }

  return value as Prisma.InputJsonValue;
}

function toOutputJson(value: unknown): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) {
    return null;
  }

  return value as Prisma.InputJsonValue;
}

function withPromptVersion(input?: Record<string, unknown>): Record<string, unknown> {
  return {
    promptVersion: PROMPT_VERSION,
    ...(input ?? {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSkillName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeSkillSuggestions(skills: string[], existingSkillNames: Set<string>): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const skill of skills) {
    const nextSkill = normalizeSkillName(skill);
    if (!nextSkill || nextSkill.length > 100) continue;

    const skillKey = nextSkill.toLowerCase();
    if (seen.has(skillKey) || existingSkillNames.has(skillKey)) continue;

    seen.add(skillKey);
    normalized.push(nextSkill);
  }

  return normalized.slice(0, 10);
}

const SKILL_SUGGESTION_RULES = [
  {
    keywords: ["typescript", "javascript", "node", "express", "backend", "api"],
    suggestions: ["TypeScript", "JavaScript", "Node.js", "REST APIs", "Testing", "CI/CD"],
  },
  {
    keywords: ["react", "next", "frontend", "ui", "css", "tailwind"],
    suggestions: ["React", "Frontend Development", "State Management", "Accessibility"],
  },
  {
    keywords: ["playwright", "cypress", "selenium", "qa", "test", "automation"],
    suggestions: ["Playwright", "Test Automation", "Quality Assurance", "End-to-End Testing", "CI/CD"],
  },
  {
    keywords: ["docker", "kubernetes", "devops", "cloud", "aws", "azure", "gcp"],
    suggestions: ["Docker", "Kubernetes", "Cloud Infrastructure", "Monitoring", "CI/CD"],
  },
  {
    keywords: ["postgres", "mysql", "mongodb", "database", "sql", "prisma"],
    suggestions: ["SQL", "PostgreSQL", "Database Design", "Data Modeling"],
  },
  {
    keywords: ["python", "django", "flask", "fastapi"],
    suggestions: ["Python", "API Development", "Automation"],
  },
  {
    keywords: ["lead", "manager", "architect", "mentor"],
    suggestions: ["Leadership", "Mentoring", "Stakeholder Communication"],
  },
] as const;

const REPO_SKILL_LABELS: Record<string, string> = {
  react: "React",
  "react-dom": "React",
  next: "Next.js",
  vue: "Vue",
  nuxt: "Nuxt",
  angular: "Angular",
  svelte: "Svelte",
  express: "Express",
  fastify: "Fastify",
  nestjs: "NestJS",
  "@nestjs/core": "NestJS",
  prisma: "Prisma ORM",
  "@prisma/client": "Prisma ORM",
  pg: "PostgreSQL",
  redis: "Redis",
  ioredis: "Redis",
  bullmq: "BullMQ job queues",
  axios: "Axios",
  zod: "Zod validation",
  "react-hook-form": "React Hook Form",
  zustand: "Zustand state management",
  "@tanstack/react-query": "TanStack Query",
  "@tanstack/react-router": "TanStack Router",
  tailwindcss: "Tailwind CSS",
  "@tailwindcss/vite": "Tailwind CSS",
  playwright: "Playwright E2E testing",
  "@playwright/test": "Playwright E2E testing",
  vitest: "Vitest",
  jest: "Jest",
  puppeteer: "Puppeteer",
  i18next: "i18next",
  "react-i18next": "react-i18next",
  "lucide-react": "Lucide React",
  "socket.io": "Socket.IO",
};

async function getCVData(userId: string, cvId: string) {
  const cv = await aiRepository.findCVForUser(userId, cvId);
  if (!cv) throw ApiError.notFound("CV not found");
  return cv;
}

function resolveCvLocale(cv: { locale?: string | null }, fallback?: string): string {
  return normalizeLocale(cv.locale ?? fallback);
}

function buildArtifactTitle(tool: AIToolKind): string {
  switch (tool) {
    case "summary":
      return "Professional summary draft";
    case "skills":
      return "Suggested skills";
    case "ats":
      return "ATS readiness check";
    case "review":
      return "CV review";
    case "job_match":
      return "Job match analysis";
    case "tailor":
      return "CV tailoring plan";
    case "cover_letter":
      return "Cover letter draft";
    case "github_profile_summary":
      return "GitHub developer profile summary";
    case "project_improvement":
      return "Project description rewrite";
    case "experience_improvement":
      return "Experience rewrite";
    default:
      return "AI output";
  }
}

function buildArtifactSummary(tool: AIToolKind, output: unknown): string | null {
  if (typeof output === "string") {
    return truncateText(output);
  }

  if (Array.isArray(output)) {
    return output.length > 0 ? `Prepared ${output.length} suggestions` : "No suggestions generated";
  }

  if (!isRecord(output)) {
    return null;
  }

  if (tool === "ats" && typeof output.score === "number") {
    return `ATS score ${Math.max(0, Math.min(100, output.score))}/100`;
  }

  if (tool === "review" && typeof output.overallScore === "number") {
    return `Overall CV score ${Math.max(0, Math.min(100, output.overallScore))}/100`;
  }

  if (tool === "job_match" && typeof output.matchScore === "number") {
    return `Job match ${Math.max(0, Math.min(100, output.matchScore))}%`;
  }

  if (tool === "tailor") {
    if (typeof output.overallStrategy === "string" && output.overallStrategy.trim()) {
      return truncateText(output.overallStrategy);
    }

    if (Array.isArray(output.skillsToAdd)) {
      return `Prepared ${output.skillsToAdd.length} skills to add`;
    }
  }

  return null;
}

function mapArtifact<TOutput = unknown>(artifact: ArtifactRecord): AIArtifact<TOutput> {
  return {
    id: artifact.id,
    tool: DB_TO_TOOL[artifact.tool],
    status: DB_TO_STATUS[artifact.status],
    title: artifact.title,
    cvId: artifact.cvId,
    targetSection: (artifact.targetSection as AITargetSection | null) ?? null,
    input: (artifact.input as Record<string, unknown> | null) ?? null,
    output: (artifact.output as TOutput | null) ?? null,
    summary: artifact.summary,
    provider: artifact.provider,
    model: artifact.model,
    locale: artifact.locale,
    error: artifact.error,
    createdAt: artifact.createdAt.toISOString(),
    updatedAt: artifact.updatedAt.toISOString(),
    appliedAt: artifact.appliedAt?.toISOString() ?? null,
    dismissedAt: artifact.dismissedAt?.toISOString() ?? null,
  };
}

async function persistArtifact<TOutput>(options: {
  userId: string;
  cvId?: string | null;
  tool: AIToolKind;
  locale?: string;
  targetSection: AITargetSection;
  input?: Record<string, unknown>;
  output: TOutput;
  status?: AiArtifactStatus;
  error?: string | null;
}): Promise<AIArtifact<TOutput>> {
  const artifact = await aiRepository.createArtifact({
    userId: options.userId,
    cvId: options.cvId ?? null,
    tool: TOOL_TO_DB[options.tool],
    status: options.status,
    title: buildArtifactTitle(options.tool),
    provider: "ollama",
    model: ollamaConfig.defaultModel,
    locale: normalizeLocale(options.locale),
    targetSection: options.targetSection,
    input: toInputJson(withPromptVersion(options.input)),
    output: toOutputJson(options.output),
    summary: buildArtifactSummary(options.tool, options.output),
    error: options.error ?? null,
  });

  return mapArtifact<TOutput>(artifact);
}

async function createFailureArtifact(options: {
  userId: string;
  cvId?: string | null;
  tool: AIToolKind;
  locale?: string;
  targetSection: AITargetSection;
  input?: Record<string, unknown>;
  error: string;
}) {
  try {
    await aiRepository.createArtifact({
      userId: options.userId,
      cvId: options.cvId ?? null,
      tool: TOOL_TO_DB[options.tool],
      status: AiArtifactStatus.FAILED,
      title: buildArtifactTitle(options.tool),
      provider: "ollama",
      model: ollamaConfig.defaultModel,
      locale: normalizeLocale(options.locale),
      targetSection: options.targetSection,
      input: toInputJson(withPromptVersion(options.input)),
      summary: truncateText(options.error),
      error: options.error,
    });
  } catch (persistError) {
    logger.warn("Failed to persist AI failure artifact", {
      tool: options.tool,
      error: persistError instanceof Error ? persistError.message : String(persistError),
    });
  }
}

async function runToolWithArtifact<TOutput>(options: {
  userId: string;
  cvId?: string | null;
  tool: AIToolKind;
  locale?: string;
  targetSection: AITargetSection;
  input?: Record<string, unknown>;
  execute: () => Promise<TOutput>;
}): Promise<{ output: TOutput; artifact: AIArtifact<TOutput> }> {
  try {
    const output = await options.execute();
    const artifact = await persistArtifact({
      userId: options.userId,
      cvId: options.cvId,
      tool: options.tool,
      locale: options.locale,
      targetSection: options.targetSection,
      input: options.input,
      output,
    });

    return { output, artifact };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await createFailureArtifact({
      userId: options.userId,
      cvId: options.cvId,
      tool: options.tool,
      locale: options.locale,
      targetSection: options.targetSection,
      input: options.input,
      error: message,
    });
    throw error;
  }
}

/**
 * Robust JSON extraction — handles markdown code fences,
 * extra text, and partial JSON from LLM outputs.
 */
function extractJSON<T>(raw: string, fallback: T): T {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();

  function tryParseCandidate(candidate: string): T | undefined {
    const normalized = candidate
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .trim();
    const variants = [
      normalized,
      normalized.replace(/,\s*([}\]])/g, "$1"),
    ];

    for (const variant of variants) {
      try {
        return JSON.parse(variant) as T;
      } catch {
        // keep trying other candidates
      }
    }

    return undefined;
  }

  function collectBalancedJsonCandidates(source: string): string[] {
    const candidates: string[] = [];

    for (let start = 0; start < source.length; start++) {
      const opener = source[start];
      if (opener !== "{" && opener !== "[") {
        continue;
      }

      const stack = [opener];
      let inString = false;
      let escaped = false;

      for (let cursor = start + 1; cursor < source.length; cursor++) {
        const char = source[cursor]!;

        if (inString) {
          if (escaped) {
            escaped = false;
            continue;
          }

          if (char === "\\") {
            escaped = true;
            continue;
          }

          if (char === '"') {
            inString = false;
          }

          continue;
        }

        if (char === '"') {
          inString = true;
          continue;
        }

        if (char === "{" || char === "[") {
          stack.push(char);
          continue;
        }

        if (char === "}" || char === "]") {
          const expected = char === "}" ? "{" : "[";
          if (stack.at(-1) !== expected) {
            break;
          }

          stack.pop();
          if (stack.length === 0) {
            candidates.push(source.slice(start, cursor + 1));
            break;
          }
        }
      }
    }

    return candidates;
  }

  const candidates: string[] = [trimmed];
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    candidates.push(fenceMatch[1].trim());
  }

  candidates.push(...collectBalancedJsonCandidates(trimmed));
  if (fenceMatch?.[1]) {
    candidates.push(...collectBalancedJsonCandidates(fenceMatch[1]));
  }

  for (const candidate of candidates) {
    const parsed = tryParseCandidate(candidate);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  logger.warn("Failed to parse AI JSON response", { raw: trimmed.slice(0, 300) });
  return fallback;
}

function normalizeInsightText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .replace(/^[-*•]+\s*/g, "")
    .replace(/^\d+[.)]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return /^(n\/a|none|null|undefined|unknown)$/i.test(normalized) ? "" : normalized;
}

function uniqueInsightItems(
  values: unknown[],
  limit = Number.POSITIVE_INFINITY,
  options: { minLength?: number; maxLength?: number } = {}
): string[] {
  const minLength = options.minLength ?? 3;
  const maxLength = options.maxLength ?? 220;
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalizeInsightText(value);
    if (!normalized || normalized.length < minLength || normalized.length > maxLength) {
      continue;
    }

    const key = normalized.toLocaleLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function formatHumanList(values: string[]): string {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0]!;
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function mapRepoSkillLabel(value: string): string | null {
  const normalized = normalizeInsightText(value);
  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();
  if (lower.startsWith("@types/")) {
    return null;
  }

  if (REPO_SKILL_LABELS[lower]) {
    return REPO_SKILL_LABELS[lower];
  }

  if (lower.startsWith("@radix-ui/")) {
    return "Radix UI";
  }

  return normalized;
}

function repoSourceContains(repoData: DeepRepoAnalysisInput, pattern: RegExp): boolean {
  return repoData.sourceSnippets.some((snippet) => pattern.test(`${snippet.path}\n${snippet.content}`));
}

function buildRepoTypeLabel(projectType: string): string {
  switch (projectType) {
    case "fullstack":
      return "full-stack application";
    case "monorepo":
      return "multi-package engineering platform";
    case "frontend":
      return "frontend product application";
    case "backend":
      return "backend service platform";
    case "library":
      return "reusable library";
    case "cli":
      return "developer tooling project";
    case "mobile":
      return "mobile application";
    default:
      return "software system";
  }
}

function buildRepoTechnologyList(repoData: DeepRepoAnalysisInput, limit = 10): string[] {
  const dependencyNames = repoData.dependencies
    ? [
        ...Object.keys(repoData.dependencies.dependencies),
        ...Object.keys(repoData.dependencies.devDependencies),
      ]
        .map(mapRepoSkillLabel)
        .filter((value): value is string => Boolean(value))
    : [];

  const categorizedNames = repoData.dependencySignals
    ? [
        ...repoData.dependencySignals.frameworks,
        ...repoData.dependencySignals.databases,
        ...repoData.dependencySignals.uiLibraries,
        ...repoData.dependencySignals.testingTools,
        ...repoData.dependencySignals.buildTools,
        ...repoData.dependencySignals.linters,
      ]
        .map(mapRepoSkillLabel)
        .filter((value): value is string => Boolean(value))
    : [];

  const topLanguages = repoData.languages
    .sort((left, right) => right.percentage - left.percentage)
    .slice(0, 4)
    .map((language) => language.language);

  return uniqueInsightItems(
    [...categorizedNames, ...dependencyNames, ...topLanguages, ...repoData.topics.map(mapRepoSkillLabel)],
    limit,
    { minLength: 2, maxLength: 80 }
  );
}

function buildRepoQualitySignals(repoData: DeepRepoAnalysisInput): string[] {
  return uniqueInsightItems(
    [
      repoData.hasTypeScript ? "TypeScript" : null,
      repoData.hasTests ? "automated tests" : null,
      repoData.hasCI ? "CI/CD workflows" : null,
      repoData.hasDocker ? "Dockerized environments" : null,
      repoData.readmeContent ? "technical documentation" : null,
    ],
    5,
    { minLength: 4, maxLength: 40 }
  );
}

function inferRepoComplexity(repoData: DeepRepoAnalysisInput): GitHubComplexityLevel {
  let score = 0;

  if (repoData.fileTree.projectType === "fullstack" || repoData.fileTree.projectType === "monorepo") score += 2;
  if (repoData.fileTree.totalFiles >= 80) score += 1;
  if (repoData.fileTree.totalFiles >= 200) score += 1;
  if (repoData.fileTree.totalDirectories >= 15) score += 1;
  if (repoData.languages.length >= 3) score += 1;
  if (repoData.dependencySignals) {
    const signalCount = [
      repoData.dependencySignals.frameworks.length,
      repoData.dependencySignals.databases.length,
      repoData.dependencySignals.uiLibraries.length,
      repoData.dependencySignals.testingTools.length,
      repoData.dependencySignals.buildTools.length,
      repoData.dependencySignals.linters.length,
    ].filter((count) => count > 0).length;
    if (signalCount >= 4) score += 1;
  }
  if (repoData.hasTests && repoData.hasCI) score += 1;
  if (repoData.hasDocker) score += 1;

  if (score >= 6) return "complex";
  if (score >= 3) return "medium";
  return "simple";
}

function buildFallbackRepoAnalysis(repoData: DeepRepoAnalysisInput): DeepRepoAnalysisOutput {
  const technologies = buildRepoTechnologyList(repoData, 12);
  const stack = technologies.slice(0, 4);
  const qualitySignals = buildRepoQualitySignals(repoData);
  const projectTypeLabel = buildRepoTypeLabel(repoData.fileTree.projectType);
  const directories = repoData.fileTree.keyDirectories.slice(0, 4);
  const configFiles = repoData.fileTree.configFiles.slice(0, 5);
  const complexityLevel = inferRepoComplexity(repoData);

  const projectSummary = normalizeInsightText(repoData.description)
    ? `${repoData.name} is a ${projectTypeLabel} focused on ${normalizeInsightText(repoData.description)}. Repository evidence points to a concrete implementation stack spanning ${formatHumanList(stack.length > 0 ? stack : technologies.slice(0, 3)) || "multiple production-oriented technologies"}. ${qualitySignals.length > 0 ? `Engineering maturity is reinforced by ${formatHumanList(qualitySignals)}.` : "The structure suggests deliberate engineering practices rather than a lightweight scaffold."}`
    : `${repoData.name} is a ${projectTypeLabel} built around ${formatHumanList(stack.length > 0 ? stack : technologies.slice(0, 3)) || "a modern application stack"}. ${qualitySignals.length > 0 ? `Engineering maturity is reinforced by ${formatHumanList(qualitySignals)}.` : "Repository structure suggests deliberate engineering practices rather than a lightweight scaffold."}`;

  const architectureAnalysis = [
    `The repository spans ${repoData.fileTree.totalFiles} files across ${repoData.fileTree.totalDirectories} directories and reads like a ${projectTypeLabel} rather than a toy project.`,
    directories.length > 0
      ? `Key directories such as ${formatHumanList(directories)} indicate intentional separation of concerns and clearer ownership boundaries.`
      : `Directory layout suggests deliberate separation of product, platform, and support concerns.`,
    configFiles.length > 0
      ? `Operational tooling is visible through ${formatHumanList(configFiles)}, which signals attention to build, lint, test, or deployment workflows.`
      : null,
    repoData.sourceSnippets.length > 0
      ? `Selected source files show that the implementation is anchored in real application modules instead of placeholder boilerplate.`
      : null,
  ].filter(Boolean).join(" ");

  const frameworkSignals = uniqueInsightItems(repoData.dependencySignals?.frameworks ?? [], 4, { minLength: 2, maxLength: 60 }).map(mapRepoSkillLabel).filter((value): value is string => Boolean(value));
  const databaseSignals = uniqueInsightItems(repoData.dependencySignals?.databases ?? [], 3, { minLength: 2, maxLength: 60 }).map(mapRepoSkillLabel).filter((value): value is string => Boolean(value));
  const testingSignals = uniqueInsightItems(repoData.dependencySignals?.testingTools ?? [], 3, { minLength: 2, maxLength: 60 }).map(mapRepoSkillLabel).filter((value): value is string => Boolean(value));
  const techStackAssessment = [
    stack.length > 0 ? `Core technologies include ${formatHumanList(stack)}.` : null,
    frameworkSignals.length > 0 ? `Framework choices such as ${formatHumanList(frameworkSignals)} point to a coherent delivery stack.` : null,
    databaseSignals.length > 0 ? `Data-layer signals include ${formatHumanList(databaseSignals)}.` : null,
    testingSignals.length > 0 ? `Verification tooling is present through ${formatHumanList(testingSignals)}.` : null,
    qualitySignals.length > 0 ? `Combined with ${formatHumanList(qualitySignals)}, the stack reads as production-minded and maintainable.` : `Even without every operational signal present, the stack appears intentional and credible.`,
  ].filter(Boolean).join(" ");

  const detectedSkills = uniqueInsightItems(
    [
      ...technologies,
      repoData.fileTree.projectType === "monorepo" ? "Monorepo architecture" : null,
      repoData.fileTree.projectType === "fullstack" ? "Full-stack system design" : null,
      repoData.hasCI ? "CI/CD pipelines" : null,
      repoData.hasTests ? "Automated testing" : null,
      repoData.hasDocker ? "Dockerized delivery" : null,
      repoData.readmeContent ? "Technical documentation" : null,
      repoSourceContains(repoData, /auth|jwt|oauth/i) ? "Authentication flows" : null,
      repoSourceContains(repoData, /redis|cache/i) ? "Caching with Redis" : null,
      repoSourceContains(repoData, /bullmq|queue/i) ? "Background job processing" : null,
      repoSourceContains(repoData, /prisma|postgres|sql/i) ? "Relational data modeling" : null,
      repoSourceContains(repoData, /zod|schema/i) ? "Schema validation" : null,
      repoSourceContains(repoData, /playwright|vitest|jest/i) ? "Quality engineering" : null,
    ],
    16,
    { minLength: 3, maxLength: 80 }
  );

  const strengths = uniqueInsightItems(
    [
      repoData.fileTree.projectType === "fullstack" ? "Implementation spans product-facing UI, API, and shared logic rather than a single isolated layer." : null,
      repoData.fileTree.projectType === "monorepo" ? "Repository structure separates applications and shared packages cleanly." : null,
      repoData.hasTests ? "Automated testing is present, which improves release confidence." : null,
      repoData.hasCI ? "Delivery workflow includes CI/CD automation for repeatable verification." : null,
      repoData.hasDocker ? "Containerized environments reduce setup drift across development and deployment." : null,
      repoData.recentActivityCount > 0 ? "Recent commit activity suggests the codebase is actively maintained." : null,
      repoData.contributors > 1 ? "Multiple contributors indicate collaborative development practices." : null,
      repoData.qualityScore >= 70 ? "Repository quality signals point to a production-minded engineering workflow." : null,
      repoData.readmeContent ? "Repository includes documentation that improves onboarding and communication." : null,
    ],
    6,
    { minLength: 18, maxLength: 180 }
  );

  const improvements = uniqueInsightItems(
    [
      repoData.hasTests
        ? "Expand integration and contract tests around the highest-risk interfaces to complement the current test suite."
        : "Add automated test coverage around the most important workflows and repository boundaries.",
      repoData.hasCI
        ? "Extend the existing CI pipeline with dependency, secret, and supply-chain scanning."
        : "Introduce CI validation for build, lint, test, and security checks.",
      repoData.hasDocker
        ? "Add preview or release-promotion environments on top of the current Docker workflow."
        : "Add a reproducible container workflow for development and deployment parity.",
      repoData.readmeContent
        ? "Add architecture decision records or operational runbooks to capture system trade-offs explicitly."
        : "Document setup, architecture, and contribution workflows to reduce onboarding time.",
      "Instrument performance and reliability monitoring around the most critical execution paths.",
      repoData.contributors <= 1 ? "Add contribution guidelines, issue templates, or release notes to strengthen collaboration signals." : null,
    ],
    6,
    { minLength: 18, maxLength: 200 }
  );

  const cvReadyDescription = [
    `Built a ${projectTypeLabel} using ${formatHumanList(stack.length > 0 ? stack : technologies.slice(0, 4)) || "a pragmatic production stack"}.`,
    directories.length > 0
      ? `Structured the codebase around ${formatHumanList(directories)} to keep responsibilities separated and maintainable.`
      : `Structured the codebase to keep product, platform, and operational concerns clearly separated.`,
    qualitySignals.length > 0
      ? `Reinforced delivery quality with ${formatHumanList(qualitySignals)}.`
      : null,
  ].filter(Boolean).join(" ");

  const cvHighlights = uniqueInsightItems(
    [
      stack.length > 0 ? `Implemented core capabilities with ${formatHumanList(stack)}.` : null,
      directories.length > 0 ? `Organized the repository around ${formatHumanList(directories)} for clearer ownership boundaries.` : null,
      qualitySignals.length > 0 ? `Backed the codebase with ${formatHumanList(qualitySignals)} to improve release confidence.` : null,
      repoData.recentActivityCount > 0 ? `Maintained active delivery with ${repoData.recentActivityCount} commits in the last 30 days.` : null,
      repoData.contributors > 1 ? `Collaborated across ${repoData.contributors} contributors on the repository's evolution.` : null,
    ],
    4,
    { minLength: 16, maxLength: 160 }
  );

  return {
    projectSummary,
    architectureAnalysis,
    techStackAssessment,
    complexityLevel,
    detectedSkills,
    strengths,
    improvements,
    cvReadyDescription,
    cvHighlights,
  };
}

function mergeRepoAnalysis(primary: Record<string, unknown>, fallback: DeepRepoAnalysisOutput): DeepRepoAnalysisOutput {
  const validComplexities: GitHubComplexityLevel[] = ["simple", "medium", "complex"];
  const complexityLevel = validComplexities.includes(primary.complexityLevel as GitHubComplexityLevel)
    ? (primary.complexityLevel as GitHubComplexityLevel)
    : fallback.complexityLevel;

  return {
    projectSummary: normalizeInsightText(primary.projectSummary) || fallback.projectSummary,
    architectureAnalysis: normalizeInsightText(primary.architectureAnalysis) || fallback.architectureAnalysis,
    techStackAssessment: normalizeInsightText(primary.techStackAssessment) || fallback.techStackAssessment,
    complexityLevel,
    detectedSkills: uniqueInsightItems(
      [
        ...(Array.isArray(primary.detectedSkills) ? primary.detectedSkills : []),
        ...fallback.detectedSkills,
      ],
      16,
      { minLength: 3, maxLength: 80 }
    ),
    strengths: uniqueInsightItems(
      [
        ...(Array.isArray(primary.strengths) ? primary.strengths : []),
        ...fallback.strengths,
      ],
      6,
      { minLength: 18, maxLength: 180 }
    ),
    improvements: uniqueInsightItems(
      [
        ...(Array.isArray(primary.improvements) ? primary.improvements : []),
        ...fallback.improvements,
      ],
      6,
      { minLength: 18, maxLength: 200 }
    ),
    cvReadyDescription: normalizeInsightText(primary.cvReadyDescription) || fallback.cvReadyDescription,
    cvHighlights: uniqueInsightItems(
      [
        ...(Array.isArray(primary.cvHighlights) ? primary.cvHighlights : []),
        ...fallback.cvHighlights,
      ],
      4,
      { minLength: 16, maxLength: 160 }
    ),
  };
}

function scoreRepoAnalysis(primary: Record<string, unknown>, merged: DeepRepoAnalysisOutput): RepoAnalysisAttemptResult {
  const directFieldCount = [
    normalizeInsightText(primary.projectSummary),
    normalizeInsightText(primary.architectureAnalysis),
    normalizeInsightText(primary.techStackAssessment),
    normalizeInsightText(primary.cvReadyDescription),
  ].filter(Boolean).length;

  const parsedSkills = uniqueInsightItems(Array.isArray(primary.detectedSkills) ? primary.detectedSkills : [], 20, {
    minLength: 3,
    maxLength: 80,
  }).length;
  const parsedHighlights = uniqueInsightItems(Array.isArray(primary.cvHighlights) ? primary.cvHighlights : [], 6, {
    minLength: 16,
    maxLength: 160,
  }).length;
  const parsedStrengths = uniqueInsightItems(Array.isArray(primary.strengths) ? primary.strengths : [], 6, {
    minLength: 18,
    maxLength: 180,
  }).length;

  const qualityScore = directFieldCount * 2 + Math.min(parsedSkills, 8) + Math.min(parsedHighlights, 4) + Math.min(parsedStrengths, 4);

  return {
    parsed: primary,
    merged,
    directFieldCount,
    qualityScore,
  };
}

function shouldRetryRepoAnalysis(attempt: RepoAnalysisAttemptResult): boolean {
  return attempt.directFieldCount < 3 || attempt.qualityScore < 11 || attempt.merged.detectedSkills.length < 8 || attempt.merged.cvHighlights.length < 4;
}

function deriveFallbackSkillSuggestions(cvData: Record<string, unknown>, existingSkillNames: Set<string>): string[] {
  const personalInfo = cvData.personalInfo as Record<string, unknown> | null;
  const summary = cvData.summary as Record<string, unknown> | null;
  const experiences = (cvData.experiences ?? []) as Record<string, unknown>[];
  const projects = (cvData.projects ?? []) as Record<string, unknown>[];
  const inferred: string[] = [];

  const addStringArray = (values: unknown) => {
    if (!Array.isArray(values)) return;

    for (const value of values) {
      if (typeof value === "string") {
        inferred.push(value);
      }
    }
  };

  for (const experience of experiences) {
    addStringArray(experience.technologies);
  }

  for (const project of projects) {
    addStringArray(project.technologies);
  }

  const corpus = [
    personalInfo?.professionalTitle,
    summary?.content,
    ...experiences.flatMap((experience) => [
      experience.jobTitle,
      experience.description,
      ...(Array.isArray(experience.achievements) ? experience.achievements : []),
      ...(Array.isArray(experience.technologies) ? experience.technologies : []),
    ]),
    ...projects.flatMap((project) => [
      project.name,
      project.description,
      ...(Array.isArray(project.technologies) ? project.technologies : []),
    ]),
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

  for (const rule of SKILL_SUGGESTION_RULES) {
    if (rule.keywords.some((keyword) => corpus.includes(keyword))) {
      inferred.push(...rule.suggestions);
    }
  }

  if (experiences.length > 0) {
    inferred.push("Communication", "Problem Solving");
  }

  const suggestions = sanitizeSkillSuggestions(inferred, existingSkillNames);
  if (suggestions.length > 0) {
    return suggestions;
  }

  return sanitizeSkillSuggestions([
    "Communication",
    "Problem Solving",
    "Collaboration",
    "Adaptability",
  ], existingSkillNames);
}

function parseAtsResult(result: string): AIATSResult {
  const parsed = extractJSON<{ score?: number; issues?: string[]; suggestions?: string[] }>(result, {});
  return {
    score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 50,
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    keywordGaps: [],
    hardSkillGaps: [],
    sectionScores: [],
    recruiterReadability: {
      score: 0,
      averageSentenceLength: 0,
      metricCoverage: 0,
      actionVerbUsage: 0,
      notes: [],
    },
    fixChecklist: [],
  };
}

function parseReviewResult(result: string): AICVReviewResult {
  const parsed = extractJSON<Record<string, unknown>>(result, {});
  return {
    overallScore: typeof parsed.overallScore === "number" ? Math.min(100, Math.max(0, parsed.overallScore)) : 50,
    sections: Array.isArray(parsed.sections) ? parsed.sections as AICVReviewResult["sections"] : [],
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths as string[] : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements as string[] : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
  };
}

function parseJobMatchResult(result: string): AIJobMatchResult {
  const parsed = extractJSON<Record<string, unknown>>(result, {});
  return {
    matchScore: typeof parsed.matchScore === "number" ? Math.min(100, Math.max(0, parsed.matchScore)) : 50,
    matchingSkills: Array.isArray(parsed.matchingSkills) ? parsed.matchingSkills as string[] : [],
    missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills as string[] : [],
    keywordGaps: Array.isArray(parsed.keywordGaps) ? parsed.keywordGaps as string[] : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions as string[] : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
  };
}

function parseTailorResult(result: string): AITailorResult {
  const parsed = extractJSON<Record<string, unknown>>(result, {});
  return {
    suggestedSummary: typeof parsed.suggestedSummary === "string" ? parsed.suggestedSummary : "",
    skillsToAdd: Array.isArray(parsed.skillsToAdd) ? parsed.skillsToAdd as string[] : [],
    skillsToHighlight: Array.isArray(parsed.skillsToHighlight) ? parsed.skillsToHighlight as string[] : [],
    experienceTips: Array.isArray(parsed.experienceTips) ? parsed.experienceTips as AITailorResult["experienceTips"] : [],
    overallStrategy: typeof parsed.overallStrategy === "string" ? parsed.overallStrategy : "",
  };
}

function extractArtifactString(artifact: ArtifactRecord): string {
  return typeof artifact.output === "string" ? artifact.output : "";
}

function extractArtifactStringArray(artifact: ArtifactRecord): string[] {
  return Array.isArray(artifact.output)
    ? artifact.output.filter((item): item is string => typeof item === "string")
    : [];
}

function extractTailorArtifact(artifact: ArtifactRecord): AITailorResult {
  return parseTailorResult(JSON.stringify(artifact.output ?? {}));
}

export const aiService = {
  async getHealth(): Promise<AIHealthResult> {
    const [ollamaUp, modelReady, models] = await Promise.all([
      checkOllamaHealth(),
      checkModelAvailable(ollamaConfig.defaultModel),
      getAvailableModels(),
    ]);

    const readinessIssues: string[] = [];
    if (!ollamaUp) readinessIssues.push("Ollama is unavailable");
    if (!modelReady) readinessIssues.push(`Model ${ollamaConfig.defaultModel} is not available`);

    return {
      provider: "ollama",
      ollama: ollamaUp ? "connected" : "unavailable",
      ready: ollamaUp && modelReady,
      readinessIssues,
      model: ollamaConfig.defaultModel,
      modelAvailable: modelReady,
      availableModels: models,
    };
  },

  async listArtifacts(userId: string, filters: { cvId?: string; tool?: AIToolKind; limit?: number }) {
    const limit = filters.limit ?? MAX_HISTORY_ITEMS;
    const artifacts = await aiRepository.listArtifacts(userId, {
      cvId: filters.cvId,
      tool: filters.tool ? TOOL_TO_DB[filters.tool] : undefined,
      limit,
    });

    return artifacts.map((artifact) => mapArtifact(artifact));
  },

  async generateSummary(userId: string, cvId: string, locale?: string): Promise<AISummaryGenerationResult> {
    const cv = await getCVData(userId, cvId);
    const effectiveLocale = resolveCvLocale(cv, locale);
    const { system, buildPrompt } = AI_PROMPTS.generateSummary;

    logger.info("Generating AI summary", { cvId, locale: effectiveLocale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "summary",
      locale: effectiveLocale,
      targetSection: "summary",
      input: { cvId },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(cv as unknown as Record<string, unknown>),
          system: localizeSystemPrompt(system, effectiveLocale),
          temperature: 0.6,
        });

        return result.trim();
      },
    });

    return { summary: output, artifact };
  },

  async improveExperience(
    userId: string,
    description: string,
    jobTitle: string,
    company: string,
    locale?: string
  ): Promise<AIImproveTextResult> {
    const { system, buildPrompt } = AI_PROMPTS.improveExperience;

    logger.info("Improving experience description", { jobTitle, company });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      tool: "experience_improvement",
      locale,
      targetSection: "experience",
      input: { description, jobTitle, company },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(description, jobTitle, company),
          system: localizeSystemPrompt(system, locale),
          temperature: 0.55,
        });

        return result.trim();
      },
    });

    return { improved: output, artifact };
  },

  async suggestSkills(userId: string, cvId: string, locale?: string): Promise<AISkillSuggestionResult> {
    const cv = await getCVData(userId, cvId);
    const effectiveLocale = resolveCvLocale(cv, locale);
    const { system, buildPrompt } = AI_PROMPTS.suggestSkills;
    const existingSkillNames = new Set(
      ((cv.skills ?? []) as Record<string, unknown>[])
        .map((skill) => normalizeSkillName(String(skill.name ?? "")).toLowerCase())
        .filter(Boolean)
    );

    logger.info("Suggesting skills", { cvId, locale: effectiveLocale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "skills",
      locale: effectiveLocale,
      targetSection: "skills",
      input: { cvId },
      execute: async () => {
        try {
          const result = await ollama.generate({
            prompt: buildPrompt(cv as unknown as Record<string, unknown>),
            system: localizeSystemPrompt(system, effectiveLocale, true),
            temperature: 0.45,
            json: true,
          });

          const parsed = extractJSON<unknown>(result, []);
          let extractedSkills: string[] = [];

          if (Array.isArray(parsed)) {
            extractedSkills = parsed.filter((skill): skill is string => typeof skill === "string");
          } else if (parsed && typeof parsed === "object") {
            const values = Object.values(parsed as Record<string, unknown>);
            const arr = values.find((value) => Array.isArray(value)) as unknown[] | undefined;
            if (arr) {
              extractedSkills = arr.filter((skill): skill is string => typeof skill === "string");
            }
          }

          const normalizedSuggestions = sanitizeSkillSuggestions(extractedSkills, existingSkillNames);
          if (normalizedSuggestions.length > 0) {
            return normalizedSuggestions;
          }

          logger.warn("AI returned no usable skill suggestions, using fallback", { cvId });
        } catch (error) {
          logger.warn("AI skill suggestion generation failed, using fallback", {
            cvId,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        return deriveFallbackSkillSuggestions(cv as unknown as Record<string, unknown>, existingSkillNames);
      },
    });

    return { skills: output, artifact };
  },

  async atsCheck(userId: string, cvId: string, options?: { locale?: string; jobDescription?: string }): Promise<AIATSCheckResponse> {
    const cv = await getCVData(userId, cvId);
    const effectiveLocale = resolveCvLocale(cv, options?.locale);
    const { system, buildPrompt } = AI_PROMPTS.atsCheck;

    logger.info("Running ATS check", { cvId, locale: effectiveLocale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "ats",
      locale: effectiveLocale,
      targetSection: "general",
      input: { cvId, ...(options?.jobDescription ? { jobDescription: options.jobDescription } : {}) },
      execute: async () => {
        let baseResult: AIATSResult;

        try {
          const result = await ollama.generate({
            prompt: buildPrompt(cv as unknown as Record<string, unknown>),
            system: localizeSystemPrompt(system, effectiveLocale, true),
            temperature: 0.25,
            json: true,
          });

          baseResult = parseAtsResult(result);
        } catch (error) {
          logger.warn("ATS model output unavailable, using deterministic fallback", {
            cvId,
            error: error instanceof Error ? error.message : String(error),
          });
          baseResult = parseAtsResult("{}");
        }

        return buildAtsAnalysis(cv as unknown as Record<string, unknown>, baseResult, options?.jobDescription);
      },
    });

    return { ...output, artifact };
  },

  async generateCoverLetter(userId: string, cvId: string, jobDescription?: string, locale?: string): Promise<AICoverLetterResponse> {
    const cv = await getCVData(userId, cvId);
    const effectiveLocale = resolveCvLocale(cv, locale);
    const { system, buildPrompt } = AI_PROMPTS.generateCoverLetter;

    logger.info("Generating cover letter", { cvId, locale: effectiveLocale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "cover_letter",
      locale: effectiveLocale,
      targetSection: "coverLetter",
      input: { cvId, ...(jobDescription ? { jobDescription } : {}) },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(cv as unknown as Record<string, unknown>, jobDescription),
          system: localizeSystemPrompt(system, effectiveLocale),
          temperature: 0.65,
        });

        return result.trim();
      },
    });

    return { coverLetter: output, artifact };
  },

  async generateSummaryStreaming(
    userId: string,
    cvId: string,
    onChunk: (chunk: string) => void,
    locale?: string
  ): Promise<string> {
    const cv = await getCVData(userId, cvId);
    const effectiveLocale = resolveCvLocale(cv, locale);
    const { system, buildPrompt } = AI_PROMPTS.generateSummary;

    return ollama.generateStreaming(
      {
        prompt: buildPrompt(cv as unknown as Record<string, unknown>),
        system: localizeSystemPrompt(system, effectiveLocale),
        temperature: 0.6,
      },
      onChunk
    );
  },

  async improveProject(
    userId: string,
    name: string,
    description: string,
    technologies: string[],
    locale?: string
  ): Promise<AIImproveTextResult> {
    const { system, buildPrompt } = AI_PROMPTS.improveProject;

    logger.info("Improving project description", { name });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      tool: "project_improvement",
      locale,
      targetSection: "projects",
      input: { name, description, technologies },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(name, description, technologies),
          system: localizeSystemPrompt(system, locale),
          temperature: 0.55,
        });

        return result.trim();
      },
    });

    return { improved: output, artifact };
  },

  async reviewCV(userId: string, cvId: string, locale?: string): Promise<AICVReviewResponse> {
    const cv = await getCVData(userId, cvId);
    const effectiveLocale = resolveCvLocale(cv, locale);
    const { system, buildPrompt } = AI_PROMPTS.reviewCV;

    logger.info("Reviewing CV", { cvId, locale: effectiveLocale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "review",
      locale: effectiveLocale,
      targetSection: "general",
      input: { cvId },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(cv as unknown as Record<string, unknown>),
          system: localizeSystemPrompt(system, effectiveLocale, true),
          temperature: 0.25,
          json: true,
        });

        return parseReviewResult(result);
      },
    });

    return { ...output, artifact };
  },

  async jobMatch(userId: string, cvId: string, jobDescription: string, locale?: string): Promise<AIJobMatchResponse> {
    const cv = await getCVData(userId, cvId);
    const effectiveLocale = resolveCvLocale(cv, locale);
    const { system, buildPrompt } = AI_PROMPTS.jobMatch;

    logger.info("Analyzing job match", { cvId, locale: effectiveLocale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "job_match",
      locale: effectiveLocale,
      targetSection: "general",
      input: { cvId, jobDescription },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(cv as unknown as Record<string, unknown>, jobDescription),
          system: localizeSystemPrompt(system, effectiveLocale, true),
          temperature: 0.25,
          json: true,
        });

        return parseJobMatchResult(result);
      },
    });

    return { ...output, artifact };
  },

  async tailorCV(userId: string, cvId: string, jobDescription: string, locale?: string): Promise<AITailorResponse> {
    const cv = await getCVData(userId, cvId);
    const effectiveLocale = resolveCvLocale(cv, locale);
    const { system, buildPrompt } = AI_PROMPTS.tailorCV;

    logger.info("Tailoring CV", { cvId, locale: effectiveLocale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "tailor",
      locale: effectiveLocale,
      targetSection: "general",
      input: { cvId, jobDescription },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(cv as unknown as Record<string, unknown>, jobDescription),
          system: localizeSystemPrompt(system, effectiveLocale, true),
          temperature: 0.35,
          json: true,
        });

        return parseTailorResult(result);
      },
    });

    return { ...output, artifact };
  },

  async githubProfileSummary(userId: string, locale?: string): Promise<AIGitHubProfileSummaryResponse> {
    const analyses = await prisma.gitHubAnalysis.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (!analyses.length) {
      throw ApiError.badRequest("No completed GitHub analyses found. Analyze some repos first.");
    }

    const { system, buildPrompt } = AI_PROMPTS.githubProfileSummary;

    logger.info("Generating GitHub profile summary", { userId, analysisCount: analyses.length, locale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      tool: "github_profile_summary",
      locale,
      targetSection: "github",
      input: { analysisCount: analyses.length },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(analyses as unknown as Record<string, unknown>[]),
          system: localizeSystemPrompt(system, locale),
          temperature: 0.6,
        });

        return result.trim();
      },
    });

    return { summary: output, artifact };
  },

  async applyArtifact(userId: string, artifactId: string): Promise<AIArtifactApplyResult> {
    const artifact = await aiRepository.findArtifactById(userId, artifactId);
    if (!artifact) {
      throw ApiError.notFound("AI artifact");
    }

    if (artifact.status === AiArtifactStatus.APPLIED) {
      return {
        artifact: mapArtifact(artifact),
        actions: [{ type: "noop", message: "Artifact already applied" }],
      };
    }

    if (!artifact.cvId) {
      throw ApiError.badRequest("This AI output is not attached to a CV and cannot be applied automatically");
    }

    const actions: AIArtifactApplyResult["actions"] = [];

    switch (artifact.tool) {
      case AiToolKind.SUMMARY: {
        const summary = extractArtifactString(artifact).trim();
        if (!summary) {
          throw ApiError.badRequest("Summary artifact has no content to apply");
        }

        await aiRepository.upsertSummary(artifact.cvId, summary);
        actions.push({ type: "summary_updated", message: "Updated CV summary from AI suggestion" });
        break;
      }

      case AiToolKind.SKILLS: {
        const suggestions = extractArtifactStringArray(artifact);
        const existingNames = new Set(
          (await aiRepository.getSkillNames(artifact.cvId)).map((skill) => normalizeSkillName(skill.name).toLowerCase())
        );
        const nextSkills = sanitizeSkillSuggestions(suggestions, existingNames);
        const addedCount = await aiRepository.addSkills(artifact.cvId, nextSkills);
        actions.push({
          type: "skills_added",
          message: addedCount > 0 ? "Added AI-suggested skills to the CV" : "No new skills were added",
          count: addedCount,
        });
        break;
      }

      case AiToolKind.COVER_LETTER: {
        const coverLetter = extractArtifactString(artifact).trim();
        if (!coverLetter) {
          throw ApiError.badRequest("Cover letter artifact has no content to apply");
        }

        await aiRepository.upsertCoverLetter(artifact.cvId, coverLetter);
        actions.push({ type: "artifact_state_updated", message: "Applied cover letter to the CV" });
        break;
      }

      case AiToolKind.TAILOR: {
        const tailor = extractTailorArtifact(artifact);
        const summary = tailor.suggestedSummary.trim();
        if (summary) {
          await aiRepository.upsertSummary(artifact.cvId, summary);
          actions.push({ type: "summary_updated", message: "Applied tailored summary to the CV" });
        }

        const existingNames = new Set(
          (await aiRepository.getSkillNames(artifact.cvId)).map((skill) => normalizeSkillName(skill.name).toLowerCase())
        );
        const nextSkills = sanitizeSkillSuggestions(tailor.skillsToAdd, existingNames);
        const addedCount = await aiRepository.addSkills(artifact.cvId, nextSkills);
        actions.push({
          type: "skills_added",
          message: addedCount > 0 ? "Added tailored skills to the CV" : "No new tailored skills were added",
          count: addedCount,
        });

        await aiRepository.markCvAtsOptimized(artifact.cvId);
        actions.push({ type: "cv_flagged", message: "Marked the CV as ATS-optimized" });
        break;
      }

      default:
        throw ApiError.badRequest("This AI output cannot be applied automatically");
    }

    const updatedArtifact = await aiRepository.updateArtifact(artifact.id, {
      status: AiArtifactStatus.APPLIED,
      appliedAt: new Date(),
      dismissedAt: null,
    });

    await cacheDelete(cvCacheKey(userId, artifact.cvId));

    return {
      artifact: mapArtifact(updatedArtifact),
      actions,
    };
  },

  async dismissArtifact(userId: string, artifactId: string) {
    const artifact = await aiRepository.findArtifactById(userId, artifactId);
    if (!artifact) {
      throw ApiError.notFound("AI artifact");
    }

    const updatedArtifact = await aiRepository.updateArtifact(artifact.id, {
      status: AiArtifactStatus.DISMISSED,
      dismissedAt: new Date(),
    });

    return mapArtifact(updatedArtifact);
  },

  async deepAnalyzeRepo(repoData: DeepRepoAnalysisInput, locale?: string): Promise<DeepRepoAnalysisOutput> {
    const { system, buildPrompt, buildCompactPrompt } = AI_PROMPTS.deepRepoAnalysis;
    const fallback = buildFallbackRepoAnalysis(repoData);
    const candidateModels = uniqueInsightItems([
      ollamaConfig.repoAnalysisModel,
      ollamaConfig.codeModel,
      ollamaConfig.defaultModel,
    ], 3, { minLength: 2, maxLength: 80 });

    const runAttempt = async (
      prompt: string,
      attemptLabel: "full" | "compact",
      temperature: number,
      model: string
    ): Promise<RepoAnalysisAttemptResult> => {
      const result = await ollama.generate({
        model,
        prompt,
        system: localizeSystemPrompt(system, locale, true),
        temperature,
        topP: 0.9,
        json: true,
      });

      const parsed = extractJSON<Record<string, unknown>>(result, {});
      const merged = mergeRepoAnalysis(parsed, fallback);
      const scored = scoreRepoAnalysis(parsed, merged);

      logger.info("Completed repo analysis attempt", {
        name: repoData.name,
        locale,
        attemptLabel,
        model,
        promptLength: prompt.length,
        qualityScore: scored.qualityScore,
        directFieldCount: scored.directFieldCount,
        detectedSkills: scored.merged.detectedSkills.length,
        highlights: scored.merged.cvHighlights.length,
      });

      return scored;
    };

    logger.info("Running deep AI analysis on repo", { name: repoData.name, locale });
    try {
      const primaryPrompt = buildPrompt(repoData);
      const compactPrompt = buildCompactPrompt(repoData);
      let bestAttempt: RepoAnalysisAttemptResult | null = null;
      let lastError: unknown = null;

      for (const model of candidateModels) {
        try {
          const firstAttempt = await runAttempt(primaryPrompt, "full", ollamaConfig.repoAnalysisTemperature, model);
          bestAttempt = !bestAttempt || firstAttempt.qualityScore > bestAttempt.qualityScore ? firstAttempt : bestAttempt;

          if (!shouldRetryRepoAnalysis(firstAttempt)) {
            return firstAttempt.merged;
          }

          logger.warn("Repo analysis response was too weak, retrying with compact prompt", {
            name: repoData.name,
            locale,
            model,
            qualityScore: firstAttempt.qualityScore,
          });

          const secondAttempt = await runAttempt(compactPrompt, "compact", Math.max(0.35, ollamaConfig.repoAnalysisTemperature - 0.05), model);
          bestAttempt = secondAttempt.qualityScore >= (bestAttempt?.qualityScore ?? 0) ? secondAttempt : bestAttempt;

          if (!shouldRetryRepoAnalysis(secondAttempt)) {
            return secondAttempt.merged;
          }
        } catch (error) {
          lastError = error;
          logger.warn("Repo analysis model attempt failed, trying fallback model", {
            name: repoData.name,
            locale,
            model,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (bestAttempt) {
        return bestAttempt.merged;
      }

      throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "All repo-analysis models failed"));
    } catch (error) {
      logger.warn("Deep AI repository analysis failed, using deterministic fallback", {
        name: repoData.name,
        locale,
        modelCandidates: candidateModels,
        error: error instanceof Error ? error.message : String(error),
      });
      return fallback;
    }
  },
};
