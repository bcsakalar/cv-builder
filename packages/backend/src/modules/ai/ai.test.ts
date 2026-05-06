import { aiService } from "./ai.service";

const mockGenerate = jest.fn();
const mockGenerateStreaming = jest.fn();
const mockCheckOllamaHealth = jest.fn();
const mockCheckModelAvailable = jest.fn();
const mockGetAvailableModels = jest.fn();
const mockCacheDelete = jest.fn();

jest.mock("../../lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback((jest.requireMock("../../lib/prisma") as { prisma: unknown }).prisma)),
    cV: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    gitHubAnalysis: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    aiArtifact: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    skill: {
      count: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    summary: {
      upsert: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("../../lib/ollama", () => ({
  ollama: {
    generate: (...args: unknown[]) => mockGenerate(...args),
    generateStreaming: (...args: unknown[]) => mockGenerateStreaming(...args),
    generateWithFallback: async (options: { models: string[]; [key: string]: unknown }) => {
      const { models, ...rest } = options;
      let lastError: unknown = new Error("no models");
      for (const model of models) {
        try {
          const response = await mockGenerate({ ...rest, model });
          if (typeof response === "string" && response.trim()) {
            return { response, model };
          }
          lastError = new Error("empty response");
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    },
  },
  checkOllamaHealth: () => mockCheckOllamaHealth(),
  checkModelAvailable: () => mockCheckModelAvailable(),
  getAvailableModels: () => mockGetAvailableModels(),
}));

jest.mock("../../lib/redis", () => ({
  cacheDelete: (...args: unknown[]) => mockCacheDelete(...args),
}));

jest.mock("../../lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

jest.mock("../../config/env", () => ({
  env: {
    OLLAMA_MODEL: "qwen3.5:9b",
    OLLAMA_CODE_MODEL: "qwen3.5:9b",
    OLLAMA_EMBEDDING_MODEL: "nomic-embed-text:v1.5",
  },
}));

import { prisma } from "../../lib/prisma";

const USER_ID = "user-1";
const CV_ID = "cv-1";

const mockCVFind = (prisma as unknown as { cV: { findFirst: jest.Mock; update: jest.Mock } }).cV.findFirst;
const mockCVUpdate = (prisma as unknown as { cV: { findFirst: jest.Mock; update: jest.Mock } }).cV.update;
const mockAnalysesFindMany = (prisma as unknown as { gitHubAnalysis: { findMany: jest.Mock } }).gitHubAnalysis.findMany;
const mockAiArtifactCreate = (prisma as unknown as { aiArtifact: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock } }).aiArtifact.create;
const mockAiArtifactFindMany = (prisma as unknown as { aiArtifact: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock } }).aiArtifact.findMany;
const mockAiArtifactFindFirst = (prisma as unknown as { aiArtifact: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock } }).aiArtifact.findFirst;
const mockAiArtifactUpdate = (prisma as unknown as { aiArtifact: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock } }).aiArtifact.update;
const mockSkillCount = (prisma as unknown as { skill: { count: jest.Mock; findMany: jest.Mock; createMany: jest.Mock } }).skill.count;
const mockSkillFindMany = (prisma as unknown as { skill: { count: jest.Mock; findMany: jest.Mock; createMany: jest.Mock } }).skill.findMany;
const mockSkillCreateMany = (prisma as unknown as { skill: { count: jest.Mock; findMany: jest.Mock; createMany: jest.Mock } }).skill.createMany;
const mockSummaryUpsert = (prisma as unknown as { summary: { upsert: jest.Mock } }).summary.upsert;
const mockProject = (prisma as unknown as { project: { findFirst: jest.Mock; update: jest.Mock } }).project;
const mockGitHubAnalysis = (prisma as unknown as { gitHubAnalysis: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock } }).gitHubAnalysis;

const MOCK_CV = {
  id: CV_ID,
  personalInfo: {
    firstName: "John",
    lastName: "Doe",
    professionalTitle: "Developer",
    email: "john@example.com",
  },
  summary: { content: "Experienced developer" },
  experiences: [
    {
      jobTitle: "Senior Dev",
      company: "Tech Co",
      startDate: "2020-01",
      description: "Led team of 5 engineers",
      achievements: ["Built API serving 10k req/s"],
      technologies: ["TypeScript", "Node.js"],
    },
  ],
  skills: [{ name: "TypeScript", category: "TECHNICAL" }],
  educations: [{ degree: "BSc", fieldOfStudy: "CS", institution: "MIT", startDate: "2016" }],
  projects: [{ name: "OpenLib", description: "Open source library", technologies: ["Rust"] }],
  certifications: [],
  languages: [{ name: "English", proficiency: "NATIVE" }],
};

const MOCK_REPO_ANALYSIS_INPUT = {
  name: "CvBuilder",
  description: "AI-powered CV builder for software engineers.",
  languages: [
    { language: "TypeScript", percentage: 82 },
    { language: "CSS", percentage: 10 },
    { language: "HTML", percentage: 8 },
  ],
  topics: ["cv", "automation", "developer-tools"],
  fileTree: {
    totalFiles: 120,
    totalDirectories: 18,
    maxDepth: 5,
    filesByExtension: { ".ts": 60, ".tsx": 24, ".css": 8 },
    configFiles: ["package.json", "vite.config.ts", "playwright.config.ts"],
    projectType: "fullstack",
    keyDirectories: ["packages/frontend", "packages/backend", "packages/shared"],
  },
  dependencies: {
    source: "package.json",
    dependencies: {
      react: "^19.0.0",
      express: "^5.0.0",
      prisma: "^6.0.0",
      redis: "^5.0.0",
      bullmq: "^5.0.0",
    },
    devDependencies: {
      "@playwright/test": "^1.0.0",
      vitest: "^3.0.0",
      tailwindcss: "^4.0.0",
      vite: "^6.0.0",
      eslint: "^9.0.0",
    },
  },
  readmeContent: "# CvBuilder\nAI-powered CV builder with GitHub analysis and recruiter tooling.",
  sourceSnippets: [
    {
      path: "packages/backend/src/server.ts",
      content: "import express from 'express'; import { Queue } from 'bullmq'; const redis = 'redis'; const prisma = 'prisma';",
    },
    {
      path: "packages/frontend/src/main.tsx",
      content: "import React from 'react'; import { QueryClientProvider } from '@tanstack/react-query';",
    },
  ],
  commitCount: 128,
  contributors: 2,
  stars: 42,
  qualityScore: 84,
  hasTests: true,
  hasCI: true,
  hasDocker: true,
  hasTypeScript: true,
  recentActivityCount: 14,
  activeDays: 48,
  recentCommits: ["feat: add github analysis", "test: cover import preview flow"],
  dependencySignals: {
    frameworks: ["react", "express"],
    databases: ["prisma", "redis"],
    uiLibraries: ["tailwindcss"],
    testingTools: ["@playwright/test", "vitest"],
    buildTools: ["vite"],
    linters: ["eslint"],
  },
};

function buildArtifactRecord(overrides?: Record<string, unknown>) {
  return {
    id: "artifact-1",
    tool: "SUMMARY",
    status: "READY",
    title: "Professional summary draft",
    provider: "ollama",
    model: "qwen3.5:9b",
    locale: "en",
    targetSection: "summary",
    input: { promptVersion: "developer-cv-v2", cvId: CV_ID },
    output: "Generated output",
    summary: "Generated output",
    error: null,
    cvId: CV_ID,
    appliedAt: null,
    dismissedAt: null,
    createdAt: new Date("2026-04-12T10:00:00.000Z"),
    updatedAt: new Date("2026-04-12T10:00:00.000Z"),
    ...overrides,
  };
}

describe("aiService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockCVFind.mockResolvedValue(MOCK_CV);
    mockAiArtifactCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      buildArtifactRecord({
        tool: data.tool,
        status: data.status ?? "READY",
        title: data.title,
        provider: data.provider,
        model: data.model,
        locale: data.locale,
        targetSection: data.targetSection,
        input: data.input,
        output: data.output,
        summary: data.summary,
        error: data.error ?? null,
        cvId: data.cvId ?? null,
      })
    );
    mockAiArtifactUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      buildArtifactRecord({
        status: data.status ?? "READY",
        appliedAt: data.appliedAt ?? null,
        dismissedAt: data.dismissedAt ?? null,
      })
    );
  });

  describe("getHealth", () => {
    it("reports readiness and available models", async () => {
      mockCheckOllamaHealth.mockResolvedValue(true);
      mockCheckModelAvailable.mockResolvedValue(true);
      mockGetAvailableModels.mockResolvedValue(["qwen3.5:9b", "nomic-embed-text:v1.5"]);

      const result = await aiService.getHealth();

      expect(result.ready).toBe(true);
      expect(result.availableModels).toEqual(["qwen3.5:9b", "nomic-embed-text:v1.5"]);
      expect(result.readinessIssues).toHaveLength(0);
    });
  });

  describe("generateSummary", () => {
    it("returns a summary and persists an artifact", async () => {
      mockGenerate.mockResolvedValue("Senior developer focused on delivery quality and platform engineering.");

      const result = await aiService.generateSummary(USER_ID, CV_ID);

      expect(result.summary).toContain("delivery quality");
      expect(result.artifact.tool).toBe("summary");
      expect(mockAiArtifactCreate).toHaveBeenCalled();
    });
  });

  describe("suggestSkills", () => {
    it("deduplicates suggestions and persists a skills artifact", async () => {
      mockGenerate.mockResolvedValue(JSON.stringify(["React", "Docker", "TypeScript", "react"]));

      const result = await aiService.suggestSkills(USER_ID, CV_ID);

      expect(result.skills).toEqual(["React", "Docker"]);
      expect(result.artifact.tool).toBe("skills");
      expect(mockAiArtifactCreate).toHaveBeenCalled();
    });

    it("falls back when Ollama fails", async () => {
      mockGenerate.mockRejectedValue(new Error("Ollama unavailable"));

      const result = await aiService.suggestSkills(USER_ID, CV_ID);

      expect(result.skills).toContain("Node.js");
      expect(result.artifact.tool).toBe("skills");
    });
  });

  describe("atsCheck", () => {
    it("enriches ATS output with keyword gaps, section scores, and checklist items", async () => {
      mockGenerate.mockResolvedValue(
        JSON.stringify({
          score: 72,
          issues: ["Summary could be more targeted"],
          suggestions: ["Add stronger project outcomes"],
        })
      );

      const result = await aiService.atsCheck(USER_ID, CV_ID, {
        locale: "en",
        jobDescription: "Senior TypeScript backend engineer with PostgreSQL, Docker, CI/CD, and Playwright experience.",
      });

      expect(result.score).toBeGreaterThan(0);
      expect(result.sectionScores.length).toBeGreaterThan(0);
      expect(result.fixChecklist.length).toBeGreaterThan(0);
      expect(result.keywordGaps).toEqual(expect.arrayContaining([expect.any(String)]));
      expect(result.hardSkillGaps).toEqual(expect.arrayContaining([expect.any(String)]));
      expect(result.artifact.tool).toBe("ats");
    });
  });

  describe("listArtifacts", () => {
    it("maps persisted artifacts back to API contracts", async () => {
      mockAiArtifactFindMany.mockResolvedValue([
        buildArtifactRecord({ tool: "REVIEW", output: { overallScore: 82, sections: [], strengths: [], improvements: [], summary: "Strong baseline" }, summary: "Overall CV score 82/100" }),
      ]);

      const result = await aiService.listArtifacts(USER_ID, { cvId: CV_ID, limit: 5 });

      expect(result).toHaveLength(1);
      expect(result[0]?.tool).toBe("review");
      expect(result[0]?.status).toBe("ready");
    });
  });

  describe("applyArtifact", () => {
    it("applies a summary artifact to the CV", async () => {
      mockAiArtifactFindFirst.mockResolvedValue(
        buildArtifactRecord({ tool: "SUMMARY", output: "Updated professional summary", summary: "Updated professional summary" })
      );

      const result = await aiService.applyArtifact(USER_ID, "artifact-1");

      expect(mockSummaryUpsert).toHaveBeenCalledWith({
        where: { cvId: CV_ID },
        create: { cvId: CV_ID, content: "Updated professional summary", aiGenerated: true },
        update: { content: "Updated professional summary", aiGenerated: true },
      });
      expect(mockAiArtifactUpdate).toHaveBeenCalled();
      expect(mockCacheDelete).toHaveBeenCalledWith(`cv:${USER_ID}:${CV_ID}`);
      expect(result.actions[0]?.type).toBe("summary_updated");
      expect(result.artifact.status).toBe("applied");
    });

    it("applies a tailoring artifact by updating summary, skills, and ATS flag", async () => {
      mockAiArtifactFindFirst.mockResolvedValue(
        buildArtifactRecord({
          tool: "TAILOR",
          targetSection: "general",
          title: "CV tailoring plan",
          output: {
            suggestedSummary: "Platform engineer with strong QA automation depth.",
            skillsToAdd: ["Playwright", "TypeScript"],
            skillsToHighlight: ["CI/CD"],
            experienceTips: [],
            overallStrategy: "Lead with platform reliability outcomes.",
          },
        })
      );
      mockSkillFindMany.mockResolvedValue([{ name: "TypeScript" }]);
      mockSkillCount.mockResolvedValue(2);
      mockSkillCreateMany.mockResolvedValue({ count: 1 });
      mockCVUpdate.mockResolvedValue({ id: CV_ID });

      const result = await aiService.applyArtifact(USER_ID, "artifact-1");

      expect(mockSummaryUpsert).toHaveBeenCalled();
      expect(mockSkillCreateMany).toHaveBeenCalledWith({
        data: [
          {
            cvId: CV_ID,
            name: "Playwright",
            category: "TECHNICAL",
            proficiencyLevel: "INTERMEDIATE",
            yearsOfExperience: null,
            orderIndex: 2,
          },
        ],
      });
      expect(mockCVUpdate).toHaveBeenCalledWith({ where: { id: CV_ID }, data: { isAtsOptimized: true } });
      expect(result.actions.map((action) => action.type)).toEqual(["summary_updated", "skills_added", "cv_flagged"]);
    });

    it("applies a project improvement artifact and syncs linked GitHub analysis", async () => {
      mockAiArtifactFindFirst.mockResolvedValue(
        buildArtifactRecord({
          tool: "PROJECT_IMPROVEMENT",
          targetSection: "projects",
          title: "Project description rewrite",
          input: { promptVersion: "developer-cv-v2", projectId: "project-1" },
          output: "Built a polished full-stack CV workflow with strong GitHub analysis and recruiter-ready positioning.",
        })
      );
      mockProject.findFirst.mockResolvedValue({
        id: "project-1",
        cvId: CV_ID,
        githubAnalysisId: "analysis-1",
        githubRepoData: { projectSummary: "Old summary" },
      });
      mockProject.update.mockResolvedValue({ id: "project-1" });
      mockGitHubAnalysis.findFirst.mockResolvedValue({
        id: "analysis-1",
        result: {
          repoFullName: "mock-dev/platform-repo",
          aiInsights: { cvReadyDescription: "Old CV description" },
        },
      });
      mockGitHubAnalysis.update.mockResolvedValue({ id: "analysis-1" });

      const result = await aiService.applyArtifact(USER_ID, "artifact-1");

      expect(mockProject.update).toHaveBeenCalledWith({
        where: { id: "project-1" },
        data: expect.objectContaining({
          description: "Built a polished full-stack CV workflow with strong GitHub analysis and recruiter-ready positioning.",
          githubRepoData: expect.objectContaining({
            aiImprovedDescription: "Built a polished full-stack CV workflow with strong GitHub analysis and recruiter-ready positioning.",
          }),
        }),
      });
      expect(mockGitHubAnalysis.update).toHaveBeenCalledWith({
        where: { id: "analysis-1" },
        data: {
          result: expect.objectContaining({
            aiInsights: expect.objectContaining({
              cvReadyDescription: "Built a polished full-stack CV workflow with strong GitHub analysis and recruiter-ready positioning.",
            }),
            cvImprovement: expect.objectContaining({ projectId: "project-1" }),
          }),
        },
      });
      expect(result.actions.map((action) => action.type)).toEqual(["project_updated", "github_analysis_updated"]);
      expect(mockCacheDelete).toHaveBeenCalledWith(`cv:${USER_ID}:${CV_ID}`);
    });
  });

  describe("dismissArtifact", () => {
    it("marks an artifact as dismissed", async () => {
      mockAiArtifactFindFirst.mockResolvedValue(buildArtifactRecord());
      mockAiArtifactUpdate.mockResolvedValue(buildArtifactRecord({ status: "DISMISSED", dismissedAt: new Date("2026-04-12T11:00:00.000Z") }));

      const result = await aiService.dismissArtifact(USER_ID, "artifact-1");

      expect(result.status).toBe("dismissed");
      expect(mockAiArtifactUpdate).toHaveBeenCalled();
    });
  });

  describe("githubProfileSummary", () => {
    it("returns a profile summary and persists an artifact", async () => {
      mockAnalysesFindMany.mockResolvedValue([
        {
          id: "a-1",
          status: "COMPLETED",
          result: {
            name: "my-app",
            description: "Full-stack app",
            primaryLanguage: "TypeScript",
            technologies: ["TypeScript", "React"],
            stars: 42,
            forks: 5,
          },
        },
      ]);
      mockGenerate.mockResolvedValue("A versatile developer with deep TypeScript and React experience.");

      const result = await aiService.githubProfileSummary(USER_ID);

      expect(result.summary).toContain("TypeScript");
      expect(result.artifact.tool).toBe("github_profile_summary");
    });

    it("throws if no completed analyses exist", async () => {
      mockAnalysesFindMany.mockResolvedValue([]);

      await expect(aiService.githubProfileSummary(USER_ID)).rejects.toThrow("No completed GitHub analyses found");
    });
  });

  describe("deepAnalyzeRepo", () => {
    it("parses wrapped JSON and fills missing insight fields from deterministic fallback", async () => {
      mockGenerate.mockResolvedValue(`Here is the analysis you requested:\n\n\
\
\`\`\`json\n{"projectSummary":"CvBuilder delivers an AI-assisted workflow for creating and refining software engineering CVs.","detectedSkills":["React","React","BullMQ job queues"],"cvHighlights":["Built an end-to-end CV workflow platform."]}\n\`\`\``);

      const result = await aiService.deepAnalyzeRepo(MOCK_REPO_ANALYSIS_INPUT, "en");

      expect(result.projectSummary).toContain("AI-assisted workflow");
      expect(result.architectureAnalysis.length).toBeGreaterThan(40);
      expect(result.techStackAssessment.length).toBeGreaterThan(40);
      expect(result.detectedSkills).toEqual(expect.arrayContaining(["React", "BullMQ job queues"]));
      expect(result.cvHighlights.length).toBeGreaterThanOrEqual(3);
      expect(result.complexityLevel).toBe("complex");
    });

    it("returns deterministic fallback insights when model generation fails", async () => {
      mockGenerate.mockRejectedValue(new Error("Model returned malformed output"));

      const result = await aiService.deepAnalyzeRepo(MOCK_REPO_ANALYSIS_INPUT, "en");

      expect(result.projectSummary).toContain("CvBuilder");
      expect(result.cvReadyDescription).toMatch(/^Built /);
      expect(result.detectedSkills).toEqual(expect.arrayContaining(["React", "Express", "Prisma ORM", "CI/CD pipelines"]));
      expect(result.improvements.length).toBeGreaterThanOrEqual(4);
    });
  });
});
