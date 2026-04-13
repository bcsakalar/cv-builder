// ═══════════════════════════════════════════════════════════
// AI Service — Ollama-powered CV assistance
// ═══════════════════════════════════════════════════════════

import { ollama } from "../../lib/ollama";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { AI_PROMPTS, localizeSystemPrompt } from "./ai.prompts";
import { logger } from "../../lib/logger";

// ── CV data helpers ──────────────────────────────────────

const CV_INCLUDE = {
  personalInfo: true,
  summary: true,
  experiences: { orderBy: { orderIndex: "asc" as const } },
  educations: { orderBy: { orderIndex: "asc" as const } },
  skills: { orderBy: { orderIndex: "asc" as const } },
  projects: { orderBy: { orderIndex: "asc" as const } },
  certifications: { orderBy: { orderIndex: "asc" as const } },
  languages: { orderBy: { orderIndex: "asc" as const } },
};

async function getCVData(userId: string, cvId: string) {
  const cv = await prisma.cV.findFirst({
    where: { id: cvId, userId },
    include: CV_INCLUDE,
  });
  if (!cv) throw ApiError.notFound("CV not found");
  return cv;
}

/**
 * Robust JSON extraction — handles markdown code fences,
 * extra text, and partial JSON from LLM outputs.
 */
function extractJSON<T>(raw: string, fallback: T): T {
  // 1. Try direct parse
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // continue
  }

  // 2. Strip markdown fences: ```json ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]!.trim()) as T;
    } catch {
      // continue
    }
  }

  // 3. Extract first JSON object or array
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

// ── Service methods ──────────────────────────────────────

export const aiService = {
  // ── Existing features ────────────────────────────────

  async generateSummary(userId: string, cvId: string, locale?: string): Promise<string> {
    const cv = await getCVData(userId, cvId);
    const { system, buildPrompt } = AI_PROMPTS.generateSummary;

    logger.info("Generating AI summary", { cvId, locale });
    const result = await ollama.generate({
      prompt: buildPrompt(cv as unknown as Record<string, unknown>),
      system: localizeSystemPrompt(system, locale),
      temperature: 0.7,
    });

    return result.trim();
  },

  async improveExperience(
    description: string,
    jobTitle: string,
    company: string,
    locale?: string
  ): Promise<string> {
    const { system, buildPrompt } = AI_PROMPTS.improveExperience;

    logger.info("Improving experience description");
    const result = await ollama.generate({
      prompt: buildPrompt(description, jobTitle, company),
      system: localizeSystemPrompt(system, locale),
      temperature: 0.6,
    });

    return result.trim();
  },

  async suggestSkills(userId: string, cvId: string, locale?: string): Promise<string[]> {
    const cv = await getCVData(userId, cvId);
    const { system, buildPrompt } = AI_PROMPTS.suggestSkills;
    const existingSkillNames = new Set(
      ((cv.skills ?? []) as Record<string, unknown>[])
        .map((skill) => normalizeSkillName(String(skill.name ?? "")).toLowerCase())
        .filter(Boolean)
    );

    logger.info("Suggesting skills", { cvId, locale });
    try {
      const result = await ollama.generate({
        prompt: buildPrompt(cv as unknown as Record<string, unknown>),
        system: localizeSystemPrompt(system, locale, true),
        temperature: 0.5,
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

    return deriveFallbackSkillSuggestions(
      cv as unknown as Record<string, unknown>,
      existingSkillNames
    );
  },

  async atsCheck(userId: string, cvId: string, locale?: string): Promise<{ score: number; issues: string[]; suggestions: string[] }> {
    const cv = await getCVData(userId, cvId);
    const { system, buildPrompt } = AI_PROMPTS.atsCheck;

    logger.info("Running ATS check", { cvId, locale });
    const result = await ollama.generate({
      prompt: buildPrompt(cv as unknown as Record<string, unknown>),
      system: localizeSystemPrompt(system, locale, true),
      temperature: 0.3,
      json: true,
    });

    const parsed = extractJSON<{ score?: number; issues?: string[]; suggestions?: string[] }>(result, {});
    return {
      score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 50,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  },

  async generateCoverLetter(userId: string, cvId: string, jobDescription?: string, locale?: string): Promise<string> {
    const cv = await getCVData(userId, cvId);
    const { system, buildPrompt } = AI_PROMPTS.generateCoverLetter;

    logger.info("Generating cover letter", { cvId, locale });
    const result = await ollama.generate({
      prompt: buildPrompt(cv as unknown as Record<string, unknown>, jobDescription),
      system: localizeSystemPrompt(system, locale),
      temperature: 0.7,
    });

    return result.trim();
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
        temperature: 0.7,
      },
      onChunk
    );
  },

  // ── New: improve project description ─────────────────

  async improveProject(
    name: string,
    description: string,
    technologies: string[],
    locale?: string
  ): Promise<string> {
    const { system, buildPrompt } = AI_PROMPTS.improveProject;

    logger.info("Improving project description", { name });
    const result = await ollama.generate({
      prompt: buildPrompt(name, description, technologies),
      system: localizeSystemPrompt(system, locale),
      temperature: 0.6,
    });

    return result.trim();
  },

  // ── New: comprehensive CV review ─────────────────────

  async reviewCV(userId: string, cvId: string, locale?: string): Promise<{
    overallScore: number;
    sections: { name: string; score: number; feedback: string }[];
    strengths: string[];
    improvements: string[];
    summary: string;
  }> {
    const cv = await getCVData(userId, cvId);
    const { system, buildPrompt } = AI_PROMPTS.reviewCV;

    logger.info("Reviewing CV", { cvId, locale });
    const result = await ollama.generate({
      prompt: buildPrompt(cv as unknown as Record<string, unknown>),
      system: localizeSystemPrompt(system, locale, true),
      temperature: 0.3,
      json: true,
    });

    const parsed = extractJSON<Record<string, unknown>>(result, {});
    return {
      overallScore: typeof parsed.overallScore === "number" ? Math.min(100, Math.max(0, parsed.overallScore)) : 50,
      sections: Array.isArray(parsed.sections) ? parsed.sections as { name: string; score: number; feedback: string }[] : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths as string[] : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements as string[] : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };
  },

  // ── New: job match analysis ──────────────────────────

  async jobMatch(userId: string, cvId: string, jobDescription: string, locale?: string): Promise<{
    matchScore: number;
    matchingSkills: string[];
    missingSkills: string[];
    keywordGaps: string[];
    suggestions: string[];
    summary: string;
  }> {
    const cv = await getCVData(userId, cvId);
    const { system, buildPrompt } = AI_PROMPTS.jobMatch;

    logger.info("Analyzing job match", { cvId, locale });
    const result = await ollama.generate({
      prompt: buildPrompt(cv as unknown as Record<string, unknown>, jobDescription),
      system: localizeSystemPrompt(system, locale, true),
      temperature: 0.3,
      json: true,
    });

    const parsed = extractJSON<Record<string, unknown>>(result, {});
    return {
      matchScore: typeof parsed.matchScore === "number" ? Math.min(100, Math.max(0, parsed.matchScore)) : 50,
      matchingSkills: Array.isArray(parsed.matchingSkills) ? parsed.matchingSkills as string[] : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills as string[] : [],
      keywordGaps: Array.isArray(parsed.keywordGaps) ? parsed.keywordGaps as string[] : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions as string[] : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };
  },

  // ── New: tailor CV for job ───────────────────────────

  async tailorCV(userId: string, cvId: string, jobDescription: string, locale?: string): Promise<{
    suggestedSummary: string;
    skillsToAdd: string[];
    skillsToHighlight: string[];
    experienceTips: { company: string; suggestion: string }[];
    overallStrategy: string;
  }> {
    const cv = await getCVData(userId, cvId);
    const { system, buildPrompt } = AI_PROMPTS.tailorCV;

    logger.info("Tailoring CV", { cvId, locale });
    const result = await ollama.generate({
      prompt: buildPrompt(cv as unknown as Record<string, unknown>, jobDescription),
      system: localizeSystemPrompt(system, locale, true),
      temperature: 0.4,
      json: true,
    });

    const parsed = extractJSON<Record<string, unknown>>(result, {});
    return {
      suggestedSummary: typeof parsed.suggestedSummary === "string" ? parsed.suggestedSummary : "",
      skillsToAdd: Array.isArray(parsed.skillsToAdd) ? parsed.skillsToAdd as string[] : [],
      skillsToHighlight: Array.isArray(parsed.skillsToHighlight) ? parsed.skillsToHighlight as string[] : [],
      experienceTips: Array.isArray(parsed.experienceTips) ? parsed.experienceTips as { company: string; suggestion: string }[] : [],
      overallStrategy: typeof parsed.overallStrategy === "string" ? parsed.overallStrategy : "",
    };
  },

  // ── New: GitHub profile summary from analyses ────────

  async githubProfileSummary(userId: string, locale?: string): Promise<string> {
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
    const result = await ollama.generate({
      prompt: buildPrompt(analyses as unknown as Record<string, unknown>[]),
      system: localizeSystemPrompt(system, locale),
      temperature: 0.7,
    });

    return result.trim();
  },

  // ── New: Deep repo analysis via AI ───────────────────

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
    hasTests: boolean;
    hasCI: boolean;
    hasDocker: boolean;
  }, locale?: string): Promise<{
    projectSummary: string;
    architectureAnalysis: string;
    techStackAssessment: string;
    complexityLevel: "simple" | "medium" | "complex";
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
      complexityLevel: validComplexity.includes(parsed.complexityLevel as string) ? (parsed.complexityLevel as "simple" | "medium" | "complex") : "medium",
      detectedSkills: Array.isArray(parsed.detectedSkills) ? parsed.detectedSkills.filter((s): s is string => typeof s === "string") : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter((s): s is string => typeof s === "string") : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.filter((s): s is string => typeof s === "string") : [],
      cvReadyDescription: typeof parsed.cvReadyDescription === "string" ? parsed.cvReadyDescription : "",
    };
  },
};
