import { githubService } from "./github.service";
import { prisma } from "../../lib/prisma";
import { cacheDelete, cacheGet, cacheSet } from "../../lib/redis";

const mockQueueAdd = jest.fn();

jest.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    cV: {
      findFirst: jest.fn(),
    },
    project: {
      count: jest.fn(),
      create: jest.fn(),
    },
    gitHubAnalysis: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("../../lib/redis", () => ({
  cacheDelete: jest.fn(),
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
}));

jest.mock("../../utils/helpers", () => ({
  encrypt: jest.fn().mockReturnValue("encrypted-token"),
  decrypt: jest.fn().mockReturnValue("ghp_test_token"),
}));

jest.mock("../../config/env", () => ({
  env: {
    NODE_ENV: "development",
    ENCRYPTION_KEY: "0".repeat(64),
    CORS_ORIGIN: "http://localhost:5173",
    GITHUB_OAUTH_CLIENT_ID: "github-client-id",
    GITHUB_OAUTH_CLIENT_SECRET: "github-client-secret",
    GITHUB_OAUTH_REDIRECT_URI: "http://localhost:3001/api/github/oauth/callback",
  },
}));

jest.mock("../../lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));
jest.mock("../../lib/queue", () => ({
  QUEUE_NAMES: {
    GITHUB_ANALYSIS: "github-analysis",
  },
  getQueue: jest.fn(() => ({
    add: mockQueueAdd,
  })),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;
const USER_ID = "00000000-0000-0000-0000-000000000001";
const CV_ID = "03d5953f-4341-4935-9e64-3831e40fb2f7";

const mockUser = (prisma as unknown as { user: { findUnique: jest.Mock; update: jest.Mock } }).user;
const mockCV = (prisma as unknown as { cV: { findFirst: jest.Mock } }).cV;
const mockProject = (prisma as unknown as { project: { count: jest.Mock; create: jest.Mock } }).project;
const mockAnalysis = (prisma as unknown as { gitHubAnalysis: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock } }).gitHubAnalysis;
const mockCacheDelete = cacheDelete as jest.MockedFunction<typeof cacheDelete>;
const mockCacheGet = cacheGet as jest.MockedFunction<typeof cacheGet>;
const mockCacheSet = cacheSet as jest.MockedFunction<typeof cacheSet>;

function buildCompletedAnalysisResult(overrides?: Record<string, unknown>) {
  return {
    repoFullName: "mock-dev/platform-repo",
    name: "platform-repo",
    description: "Developer workflow platform",
    url: "https://github.com/mock-dev/platform-repo",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    primaryLanguage: "TypeScript",
    languages: [
      { language: "TypeScript", percentage: 82 },
      { language: "SQL", percentage: 10 },
      { language: "CSS", percentage: 8 },
    ],
    totalCommits: 128,
    stars: 42,
    forks: 7,
    watchers: 11,
    openIssues: 3,
    license: "MIT",
    topics: ["automation", "developer-tools"],
    technologies: ["Node.js", "React", "PostgreSQL", "Playwright"],
    contributors: [
      { login: "mock-dev", contributions: 96 },
      { login: "teammate", contributions: 32 },
    ],
    fileTree: {
      totalFiles: 120,
      totalDirectories: 18,
      maxDepth: 5,
      projectType: "fullstack",
      keyDirectories: ["packages/frontend", "packages/backend"],
    },
    dependencyInfo: {
      frameworks: ["React", "Express"],
      databases: ["PostgreSQL"],
      uiLibraries: ["Tailwind CSS"],
      testingTools: ["Playwright", "Vitest"],
      buildTools: ["Vite"],
      linters: ["ESLint"],
      packageManager: "npm",
      dependenciesCount: 42,
      devDependenciesCount: 18,
      source: "package.json",
    },
    codeQuality: {
      hasTests: true,
      hasCI: true,
      hasDocker: true,
      hasTypeScript: true,
      hasLinting: true,
      hasReadme: true,
      hasLicense: true,
      hasContributing: true,
      hasChangelog: false,
      qualityScore: 84,
    },
    commitAnalytics: {
      recentActivityCount: 14,
      averagePerWeek: 3.5,
      activeDays: 48,
      lastCommitDate: "2026-04-10T00:00:00.000Z",
      firstCommitDate: "2025-01-02T00:00:00.000Z",
      totalCommits: 128,
      authorBreakdown: { "mock-dev": 96, teammate: 32 },
      usesConventionalCommits: true,
    },
    aiInsights: {
      projectSummary: "Full-stack platform for automating developer workflows.",
      architectureAnalysis: "Monorepo setup separates frontend, backend, and shared contracts.",
      techStackAssessment: "Modern TypeScript stack with strong testing and delivery practices.",
      strengths: [
        "Clear separation between UI, API, and shared modules",
        "Well-defined testing and CI workflow",
      ],
      detectedSkills: ["TypeScript", "React", "Node.js", "Testing"],
      complexityLevel: "complex",
      cvReadyDescription: "Built a full-stack workflow platform with React, TypeScript, PostgreSQL, and Playwright. Focused on maintainable architecture, automated testing, and delivery quality.",
      cvHighlights: [
        "Built a full-stack workflow platform spanning React frontends, Node.js APIs, and shared packages.",
        "Implemented automated quality gates with Playwright, Vitest, and CI workflows.",
        "Structured the codebase for maintainable delivery across frontend, backend, and shared contracts.",
      ],
    },
    ...overrides,
  };
}

function buildCompletedAnalysis(overrides?: Record<string, unknown>) {
  return {
    id: "analysis-1",
    status: "COMPLETED",
    result: buildCompletedAnalysisResult(overrides),
  };
}

describe("githubService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockQueueAdd.mockReset();
    mockAnalysis.findFirst.mockResolvedValue(null);
  });

  describe("getConnectionStatus", () => {
    it("should return connected if token exists", async () => {
      mockUser.findUnique.mockResolvedValue({
        githubToken: "encrypted",
        githubUsername: "testuser",
      });

      const result = await githubService.getConnectionStatus(USER_ID);

      expect(result).toEqual({ connected: true, username: "testuser", oauthConfigured: true });
    });

    it("should return not connected if no token", async () => {
      mockUser.findUnique.mockResolvedValue({ githubToken: null, githubUsername: null });

      const result = await githubService.getConnectionStatus(USER_ID);

      expect(result).toEqual({ connected: false, username: null, oauthConfigured: true });
    });
  });

  describe("disconnect", () => {
    it("should clear user github fields", async () => {
      mockUser.update.mockResolvedValue({});

      await githubService.disconnect(USER_ID);

      expect(mockUser.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { githubToken: null, githubUsername: null },
      });
    });
  });

  describe("getAnalyses", () => {
    it("should list analyses", async () => {
      mockAnalysis.findMany.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);

      const result = await githubService.getAnalyses(USER_ID);

      expect(result).toHaveLength(2);
    });

    it("adds impact analysis metadata to completed analyses", async () => {
      mockAnalysis.findMany.mockResolvedValue([buildCompletedAnalysis()]);

      const result = await githubService.getAnalyses(USER_ID);

      expect(result[0]?.result).toEqual(
        expect.objectContaining({
          impactAnalysis: expect.objectContaining({
            impactScore: expect.any(Number),
          }),
        })
      );
    });
  });

  describe("getAnalysis", () => {
    it("should return an analysis by id", async () => {
      const analysis = { id: "a1", repoFullName: "user/repo" };
      mockAnalysis.findFirst.mockResolvedValue(analysis);

      const result = await githubService.getAnalysis(USER_ID, "a1");

      expect(result).toEqual(analysis);
    });

    it("should throw if analysis not found", async () => {
      mockAnalysis.findFirst.mockResolvedValue(null);

      await expect(githubService.getAnalysis(USER_ID, "nonexistent")).rejects.toThrow();
    });
  });

  describe("connect", () => {
    it("should validate token and store encrypted", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ login: "testuser", avatar_url: "url", name: "Test" }),
      });
      mockUser.update.mockResolvedValue({ githubUsername: "testuser" });

      const result = await githubService.connect(USER_ID, "ghp_valid_token");

      expect(result.username).toBe("testuser");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/user",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer ghp_valid_token",
          }),
        })
      );
    });

    it("should throw on invalid token", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      await expect(githubService.connect(USER_ID, "invalid")).rejects.toThrow();
    });
  });

  describe("OAuth", () => {
    it("creates an OAuth authorize URL and stores state", async () => {
      const result = await githubService.getOAuthAuthorizeUrl(USER_ID);

      expect(result.authUrl).toContain("https://github.com/login/oauth/authorize");
      expect(result.authUrl).toContain("client_id=github-client-id");
      expect(mockCacheSet).toHaveBeenCalledWith(expect.stringContaining("github-oauth:"), { userId: USER_ID }, 600);
    });

    it("stores the requesting frontend origin with the oauth state when provided", async () => {
      await githubService.getOAuthAuthorizeUrl(USER_ID, "http://localhost:5174/");

      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.stringContaining("github-oauth:"),
        { userId: USER_ID, origin: "http://localhost:5174" },
        600
      );
    });

    it("exchanges callback code for a token and redirects to the frontend", async () => {
      mockCacheGet.mockResolvedValue({ userId: USER_ID });
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: "gho_live_token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: "oauth-user", avatar_url: "url", name: "OAuth User" }),
        });
      mockUser.update.mockResolvedValue({ githubUsername: "oauth-user" });

      const redirectUrl = await githubService.completeOAuthCallback("code-123", "state-123");

      expect(mockUser.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: expect.objectContaining({ githubUsername: "oauth-user" }),
      });
      expect(mockCacheDelete).toHaveBeenCalledWith("github-oauth:state-123");
      expect(redirectUrl).toBe("http://localhost:5173/github?github_oauth=success");
    });

    it("redirects GitHub OAuth callbacks back to the originating frontend when available", async () => {
      mockCacheGet.mockResolvedValue({ userId: USER_ID, origin: "http://localhost:5174" });
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: "gho_live_token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: "oauth-user", avatar_url: "url", name: "OAuth User" }),
        });
      mockUser.update.mockResolvedValue({ githubUsername: "oauth-user" });

      const redirectUrl = await githubService.completeOAuthCallback("code-123", "state-123");

      expect(redirectUrl).toBe("http://localhost:5174/github?github_oauth=success");
    });
  });

  describe("getRepos", () => {
    it("returns CV-aware fit scores when a CV is selected", async () => {
      mockUser.findUnique.mockResolvedValue({ githubToken: "encrypted-token" });
      mockCV.findFirst.mockResolvedValue({
        id: CV_ID,
        userId: USER_ID,
        personalInfo: { professionalTitle: "Full-Stack Developer" },
        summary: { content: "TypeScript platform engineer" },
        experiences: [],
        skills: [{ name: "TypeScript" }, { name: "PostgreSQL" }],
        projects: [{ technologies: ["React", "Playwright"] }],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            id: 1,
            full_name: "mock-dev/platform-repo",
            name: "platform-repo",
            description: "TypeScript React platform repo",
            language: "TypeScript",
            stargazers_count: 22,
            forks_count: 4,
            html_url: "https://github.com/mock-dev/platform-repo",
            updated_at: "2026-04-12T00:00:00.000Z",
            topics: ["react", "platform"],
            private: false,
          },
        ]),
      });

      const result = await githubService.getRepos(USER_ID, 1, 30, CV_ID);

      expect(result[0]).toEqual(
        expect.objectContaining({
          name: "platform-repo",
          fitScore: expect.any(Number),
          fitReasons: expect.any(Array),
        })
      );
    });
  });

  describe("createAnalysis", () => {
    it("queues analysis jobs with the requested locale", async () => {
      const createdAnalysis = {
        id: "analysis-1",
        username: "mock-dev",
        status: "PENDING",
        result: { repoFullName: "mock-dev/platform-repo" },
        userId: USER_ID,
      };
      mockAnalysis.create.mockResolvedValue(createdAnalysis);

      const result = await githubService.createAnalysis(USER_ID, "mock-dev/platform-repo", "tr");

      expect(mockAnalysis.create).toHaveBeenCalledWith({
        data: {
          username: "mock-dev",
          repoFullName: "mock-dev/platform-repo",
          locale: "tr",
          analysisVersion: "github-analysis-v2",
          status: "PENDING",
          result: {
            repoFullName: "mock-dev/platform-repo",
            analysisLocale: "tr",
            analysisVersion: "github-analysis-v2",
          },
          userId: USER_ID,
        },
      });
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "analyze",
        expect.objectContaining({
          analysisId: "analysis-1",
          repoFullName: "mock-dev/platform-repo",
          userId: USER_ID,
          locale: "tr",
        })
      );
      expect(result).toEqual(createdAnalysis);
    });

    it("reuses an existing completed analysis for the same repo and locale", async () => {
      const existingAnalysis = {
        id: "analysis-existing",
        username: "mock-dev",
        repoFullName: "mock-dev/platform-repo",
        locale: "en",
        analysisVersion: "github-analysis-v2",
        status: "COMPLETED",
        result: { repoFullName: "mock-dev/platform-repo" },
      };
      mockAnalysis.findFirst.mockResolvedValue(existingAnalysis);

      const result = await githubService.createAnalysis(USER_ID, "mock-dev/platform-repo", "en");

      expect(result).toEqual(existingAnalysis);
      expect(mockAnalysis.create).not.toHaveBeenCalled();
      expect(mockAnalysis.update).not.toHaveBeenCalled();
      expect(mockQueueAdd).not.toHaveBeenCalled();
    });

    it("force refreshes an existing analysis instead of creating a duplicate row", async () => {
      const existingAnalysis = {
        id: "analysis-existing",
        username: "mock-dev",
        repoFullName: "mock-dev/platform-repo",
        locale: "en",
        analysisVersion: "github-analysis-v2",
        status: "COMPLETED",
        result: { repoFullName: "mock-dev/platform-repo" },
      };
      const refreshedAnalysis = { ...existingAnalysis, status: "PENDING" };
      mockAnalysis.findFirst.mockResolvedValue(existingAnalysis);
      mockAnalysis.update.mockResolvedValue(refreshedAnalysis);

      const result = await githubService.createAnalysis(USER_ID, "mock-dev/platform-repo", "en", { force: true });

      expect(mockAnalysis.create).not.toHaveBeenCalled();
      expect(mockAnalysis.update).toHaveBeenCalledWith({
        where: { id: "analysis-existing" },
        data: expect.objectContaining({
          repoFullName: "mock-dev/platform-repo",
          locale: "en",
          analysisVersion: "github-analysis-v2",
          status: "PENDING",
          error: null,
        }),
      });
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "analyze",
        expect.objectContaining({ analysisId: "analysis-existing", repoFullName: "mock-dev/platform-repo", locale: "en" })
      );
      expect(result).toEqual(refreshedAnalysis);
    });
  });

  describe("importToCV", () => {
    it("returns a structured import preview for completed analyses", async () => {
      mockCV.findFirst.mockResolvedValue({
        id: CV_ID,
        userId: USER_ID,
        personalInfo: { professionalTitle: "Full-Stack Developer" },
        summary: { content: "TypeScript platform engineer" },
        experiences: [],
        skills: [{ name: "TypeScript" }, { name: "PostgreSQL" }],
        projects: [{ technologies: ["React", "Playwright"] }],
      });
      mockAnalysis.findFirst.mockResolvedValue(buildCompletedAnalysis());

      const result = await githubService.getImportPreview(USER_ID, "analysis-1", CV_ID);

      expect(result).toMatchObject({
        analysisId: "analysis-1",
        repoFullName: "mock-dev/platform-repo",
        draft: {
          name: "platform-repo",
          role: null,
          technologies: [],
          url: "https://github.com/mock-dev/platform-repo",
          githubUrl: "https://github.com/mock-dev/platform-repo",
          githubRepoData: expect.objectContaining({
            projectType: "fullstack",
            qualityScore: 84,
            contributorCount: 2,
            hasCI: true,
            impactAnalysis: expect.objectContaining({
              impactScore: expect.any(Number),
            }),
          }),
        },
        dependencyInfo: {
          frameworks: ["React", "Express"],
          databases: ["PostgreSQL"],
          testingTools: ["Playwright", "Vitest"],
        },
      });

      expect(result.draft.highlights).toEqual(expect.arrayContaining([
        expect.stringContaining("full-stack workflow platform"),
        expect.stringContaining("automated quality gates"),
      ]));
    });

    it("preserves the full AI-ready description without truncating it", async () => {
      const fullDescription = [
        "Designed and implemented a local-first TypeScript CLI for job discovery, scraping, and application assistance, utilizing SQLite for data storage, Playwright for browser automation, and Ollama for language model integration.",
        "Built robust browser workflows for job applications and packaged the tool with maintainable command modules.",
        "Added automated tests and an interactive dashboard to support data visibility and long-term maintenance.",
      ].join(" ");

      mockAnalysis.findFirst.mockResolvedValue(buildCompletedAnalysis({
        description: "Short repository description",
        aiInsights: {
          ...buildCompletedAnalysisResult().aiInsights,
          cvReadyDescription: fullDescription,
          projectSummary: "Short AI summary",
        },
      }));

      const result = await githubService.getImportPreview(USER_ID, "analysis-1");

      expect(result.draft.description).toBe(fullDescription);
      expect(result.draft.description).not.toContain("…");
      expect(result.draft.description).not.toContain("Short AI summary");
    });

    it("applies reviewed overrides and invalidates cached CV detail after importing a project", async () => {
      mockCV.findFirst.mockResolvedValue({ id: CV_ID, userId: USER_ID });
      mockAnalysis.findFirst.mockResolvedValue(buildCompletedAnalysis());
      mockProject.count.mockResolvedValue(0);
      mockProject.create.mockResolvedValue({ id: "project-1" });

      await githubService.importToCV(USER_ID, CV_ID, "analysis-1", {
        name: " Reviewed Platform ",
        role: " Lead Full-Stack Developer ",
        description: "Reviewed summary for CV import.",
        highlights: [" Led architecture across frontend and backend ", "Led architecture across frontend and backend", "Shipped CI/CD automation"],
      });

      expect(mockProject.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cvId: CV_ID,
          name: "Reviewed Platform",
          description: "Reviewed summary for CV import.",
          role: "Lead Full-Stack Developer",
          technologies: [],
          highlights: ["Led architecture across frontend and backend", "Shipped CI/CD automation"],
          url: "https://github.com/mock-dev/platform-repo",
          githubUrl: "https://github.com/mock-dev/platform-repo",
          orderIndex: 0,
        }),
      });
      expect(mockCacheDelete).toHaveBeenCalledWith(`cv:${USER_ID}:${CV_ID}`);
    });

    it("allows completed analyses to be removed from history", async () => {
      mockAnalysis.findFirst.mockResolvedValue(buildCompletedAnalysis());
      mockAnalysis.delete.mockResolvedValue({ id: "analysis-1" });

      const result = await githubService.deleteAnalysis(USER_ID, "analysis-1");

      expect(mockAnalysis.delete).toHaveBeenCalledWith({ where: { id: "analysis-1" } });
      expect(result).toEqual({ id: "analysis-1", deleted: true });
    });

    it("blocks removal while an analysis is still processing", async () => {
      mockAnalysis.findFirst.mockResolvedValue({ id: "analysis-1", status: "PROCESSING" });

      await expect(githubService.deleteAnalysis(USER_ID, "analysis-1")).rejects.toThrow(
        "Active analyses cannot be removed until processing finishes"
      );
    });
  });
});
