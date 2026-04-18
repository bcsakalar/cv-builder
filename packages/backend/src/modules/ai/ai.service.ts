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

async function getCVData(userId: string, cvId: string) {
  const cv = await aiRepository.findCVForUser(userId, cvId);
  if (!cv) throw ApiError.notFound("CV not found");
  return cv;
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
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // continue
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]!.trim()) as T;
    } catch {
      // continue
    }
  }

  const objMatch = trimmed.match(/(\{[\s\S]*\})/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[1]!) as T;
    } catch {
      // continue
    }
  }

  const arrMatch = trimmed.match(/(\[[\s\S]*\])/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[1]!) as T;
    } catch {
      // continue
    }
  }

  logger.warn("Failed to parse AI JSON response", { raw: trimmed.slice(0, 200) });
  return fallback;
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
    const { system, buildPrompt } = AI_PROMPTS.generateSummary;

    logger.info("Generating AI summary", { cvId, locale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "summary",
      locale,
      targetSection: "summary",
      input: { cvId },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(cv as unknown as Record<string, unknown>),
          system: localizeSystemPrompt(system, locale),
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
    const { system, buildPrompt } = AI_PROMPTS.suggestSkills;
    const existingSkillNames = new Set(
      ((cv.skills ?? []) as Record<string, unknown>[])
        .map((skill) => normalizeSkillName(String(skill.name ?? "")).toLowerCase())
        .filter(Boolean)
    );

    logger.info("Suggesting skills", { cvId, locale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "skills",
      locale,
      targetSection: "skills",
      input: { cvId },
      execute: async () => {
        try {
          const result = await ollama.generate({
            prompt: buildPrompt(cv as unknown as Record<string, unknown>),
            system: localizeSystemPrompt(system, locale, true),
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

  async atsCheck(userId: string, cvId: string, locale?: string): Promise<AIATSCheckResponse> {
    const cv = await getCVData(userId, cvId);
    const { system, buildPrompt } = AI_PROMPTS.atsCheck;

    logger.info("Running ATS check", { cvId, locale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "ats",
      locale,
      targetSection: "general",
      input: { cvId },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(cv as unknown as Record<string, unknown>),
          system: localizeSystemPrompt(system, locale, true),
          temperature: 0.25,
          json: true,
        });

        return parseAtsResult(result);
      },
    });

    return { ...output, artifact };
  },

  async generateCoverLetter(userId: string, cvId: string, jobDescription?: string, locale?: string): Promise<AICoverLetterResponse> {
    const cv = await getCVData(userId, cvId);
    const { system, buildPrompt } = AI_PROMPTS.generateCoverLetter;

    logger.info("Generating cover letter", { cvId, locale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "cover_letter",
      locale,
      targetSection: "general",
      input: { cvId, ...(jobDescription ? { jobDescription } : {}) },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(cv as unknown as Record<string, unknown>, jobDescription),
          system: localizeSystemPrompt(system, locale),
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
    const { system, buildPrompt } = AI_PROMPTS.generateSummary;

    return ollama.generateStreaming(
      {
        prompt: buildPrompt(cv as unknown as Record<string, unknown>),
        system: localizeSystemPrompt(system, locale),
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
    const { system, buildPrompt } = AI_PROMPTS.reviewCV;

    logger.info("Reviewing CV", { cvId, locale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "review",
      locale,
      targetSection: "general",
      input: { cvId },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(cv as unknown as Record<string, unknown>),
          system: localizeSystemPrompt(system, locale, true),
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
    const { system, buildPrompt } = AI_PROMPTS.jobMatch;

    logger.info("Analyzing job match", { cvId, locale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "job_match",
      locale,
      targetSection: "general",
      input: { cvId, jobDescription },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(cv as unknown as Record<string, unknown>, jobDescription),
          system: localizeSystemPrompt(system, locale, true),
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
    const { system, buildPrompt } = AI_PROMPTS.tailorCV;

    logger.info("Tailoring CV", { cvId, locale });
    const { output, artifact } = await runToolWithArtifact({
      userId,
      cvId,
      tool: "tailor",
      locale,
      targetSection: "general",
      input: { cvId, jobDescription },
      execute: async () => {
        const result = await ollama.generate({
          prompt: buildPrompt(cv as unknown as Record<string, unknown>, jobDescription),
          system: localizeSystemPrompt(system, locale, true),
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

  async deepAnalyzeRepo(repoData: {
    name: string;
    description: string | null;
    languages: { language: string; percentage: number }[];
    topics: string[];
    fileTree: { totalFiles: number; totalDirectories: number; filesByExtension: Record<string, number>; configFiles: string[]; projectType: string; keyDirectories: string[] };
    dependencies: { source: string; dependencies: Record<string, string>; devDependencies: Record<string, string> } | null;
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
  }, locale?: string): Promise<{
    projectSummary: string;
    architectureAnalysis: string;
    techStackAssessment: string;
    complexityLevel: GitHubComplexityLevel;
    detectedSkills: string[];
    strengths: string[];
    improvements: string[];
    cvReadyDescription: string;
  }> {
    const { system, buildPrompt } = AI_PROMPTS.deepRepoAnalysis;

    logger.info("Running deep AI analysis on repo", { name: repoData.name, locale });
    const result = await ollama.generate({
      prompt: buildPrompt(repoData),
      system: localizeSystemPrompt(system, locale, true),
      temperature: 0.4,
      json: true,
    });

    const parsed = extractJSON<Record<string, unknown>>(result, {});
    const validComplexity = ["simple", "medium", "complex"];
    return {
      projectSummary: typeof parsed.projectSummary === "string" ? parsed.projectSummary : "",
      architectureAnalysis: typeof parsed.architectureAnalysis === "string" ? parsed.architectureAnalysis : "",
      techStackAssessment: typeof parsed.techStackAssessment === "string" ? parsed.techStackAssessment : "",
      complexityLevel: validComplexity.includes(parsed.complexityLevel as string)
        ? (parsed.complexityLevel as GitHubComplexityLevel)
        : "medium",
      detectedSkills: Array.isArray(parsed.detectedSkills) ? parsed.detectedSkills.filter((skill): skill is string => typeof skill === "string") : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter((strength): strength is string => typeof strength === "string") : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.filter((improvement): improvement is string => typeof improvement === "string") : [],
      cvReadyDescription: typeof parsed.cvReadyDescription === "string" ? parsed.cvReadyDescription : "",
    };
  },
};
