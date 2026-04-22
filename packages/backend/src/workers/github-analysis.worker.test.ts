jest.mock("../lib/queue", () => ({
  createWorker: jest.fn(),
  QUEUE_NAMES: {
    GITHUB_ANALYSIS: "github-analysis",
  },
}));

jest.mock("../lib/prisma", () => ({
  prisma: {
    gitHubAnalysis: { update: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

jest.mock("../lib/redis", () => ({
  redis: {
    publish: jest.fn(),
  },
}));

jest.mock("../utils/helpers", () => ({
  decrypt: jest.fn((value: string) => value),
}));

jest.mock("../lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../modules/ai/ai.service", () => ({
  aiService: {
    deepAnalyzeRepo: jest.fn(),
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  buildDependencyInfoFromManifestEntries,
  findManifestCandidates,
  parseManifestContent,
  startGitHubAnalysisWorker,
} from "./github-analysis.worker";
import { createWorker } from "../lib/queue";
import { prisma } from "../lib/prisma";
import { aiService } from "../modules/ai/ai.service";

const mockCreateWorker = createWorker as jest.MockedFunction<typeof createWorker>;
const mockPrisma = prisma as unknown as {
  gitHubAnalysis: { update: jest.Mock };
  user: { findUnique: jest.Mock };
};
const mockAiService = aiService as unknown as {
  deepAnalyzeRepo: jest.Mock;
};

function createJsonResponse(status: number, body: unknown, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
  });
}

describe("github-analysis.worker manifest handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("finds nested manifest files even when no root manifest exists", () => {
    const candidates = findManifestCandidates([
      { path: "backend/package.json", type: "blob" },
      { path: "mobile/pubspec.yaml", type: "blob" },
      { path: "android/app/build.gradle.kts", type: "blob" },
      { path: "README.md", type: "blob" },
    ]);

    expect(candidates.map((candidate) => candidate.path)).toEqual([
      "backend/package.json",
      "mobile/pubspec.yaml",
      "android/app/build.gradle.kts",
    ]);
  });

  it("parses pubspec.yaml dependency blocks", () => {
    const parsed = parseManifestContent(
      "pub",
      [
        "dependencies:",
        "  flutter:",
        "    sdk: flutter",
        "  provider: ^6.1.2",
        "dev_dependencies:",
        "  flutter_test:",
        "    sdk: flutter",
        "  flutter_lints: ^5.0.0",
      ].join("\n")
    );

    expect(parsed).toEqual({
      dependencies: {
        flutter: "*",
        provider: "^6.1.2",
      },
      devDependencies: {
        flutter_test: "*",
        flutter_lints: "^5.0.0",
      },
    });
  });

  it("merges dependency data from multiple nested manifests", () => {
    const dependencyInfo = buildDependencyInfoFromManifestEntries([
      {
        path: "backend/package.json",
        source: "npm",
        content: JSON.stringify({
          dependencies: {
            express: "^5.0.1",
            prisma: "^6.3.0",
          },
          devDependencies: {
            vite: "^6.0.0",
            eslint: "^9.0.0",
          },
        }),
      },
      {
        path: "mobile/pubspec.yaml",
        source: "pub",
        content: [
          "dependencies:",
          "  flutter:",
          "    sdk: flutter",
          "  provider: ^6.1.2",
          "dev_dependencies:",
          "  flutter_test:",
          "    sdk: flutter",
          "  flutter_lints: ^5.0.0",
        ].join("\n"),
      },
      {
        path: "android/app/build.gradle.kts",
        source: "gradle",
        content: [
          "dependencies {",
          "  implementation(\"org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1\")",
          "  testImplementation(\"junit:junit:4.13.2\")",
          "}",
        ].join("\n"),
      },
    ]);

    expect(dependencyInfo).toMatchObject({
      source: "backend/package.json (+2 more)",
      dependencies: expect.objectContaining({
        express: "^5.0.1",
        prisma: "^6.3.0",
        flutter: "*",
        provider: "^6.1.2",
        "kotlinx-coroutines-core": "1.8.1",
      }),
      devDependencies: expect.objectContaining({
        vite: "^6.0.0",
        eslint: "^9.0.0",
        flutter_test: "*",
        flutter_lints: "^5.0.0",
        junit: "4.13.2",
      }),
    });

    expect(dependencyInfo?.frameworks).toEqual(expect.arrayContaining(["express", "flutter", "provider"]));
    expect(dependencyInfo?.testingTools).toEqual(expect.arrayContaining(["flutter_test", "junit"]));
    expect(dependencyInfo?.buildTools).toContain("vite");
    expect(dependencyInfo?.linters).toEqual(expect.arrayContaining(["eslint", "flutter_lints"]));
    expect(dependencyInfo?.databases).toContain("prisma");
  });

  it("falls back to public GitHub API access when a PAT cannot read a public repository deeply", async () => {
    mockCreateWorker.mockReturnValue({} as never);
    mockPrisma.user.findUnique.mockResolvedValue({ githubToken: "encrypted-token" });
    mockPrisma.gitHubAnalysis.update.mockResolvedValue({});
    mockAiService.deepAnalyzeRepo.mockResolvedValue({
      projectSummary: "Public repo",
      architectureAnalysis: "Simple public repository",
      techStackAssessment: "TypeScript",
      complexityLevel: "simple",
      detectedSkills: ["TypeScript"],
      strengths: ["Readable code"],
      improvements: [],
      cvReadyDescription: "Built a public TypeScript project.",
    });

    mockFetch.mockImplementation((url: string, init?: { headers?: Record<string, string> }) => {
      const authHeader = init?.headers?.Authorization;

      if (url === "https://api.github.com/repos/mock-dev/public-repo") {
        if (authHeader) {
          return Promise.resolve(createJsonResponse(403, { message: "Resource not accessible by personal access token" }));
        }

        return Promise.resolve(createJsonResponse(200, {
          name: "public-repo",
          description: "Public repository",
          default_branch: "main",
          topics: ["typescript"],
          stargazers_count: 5,
          forks_count: 1,
          watchers_count: 2,
          open_issues_count: 0,
          license: { spdx_id: "MIT" },
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
          html_url: "https://github.com/mock-dev/public-repo",
          archived: false,
          fork: false,
          private: false,
        }));
      }

      if (url === "https://api.github.com/repos/mock-dev/public-repo/languages") {
        return Promise.resolve(createJsonResponse(200, { TypeScript: 100 }));
      }

      if (url === "https://api.github.com/repos/mock-dev/public-repo/git/trees/main?recursive=1") {
        return Promise.resolve(createJsonResponse(200, {
          tree: [
            { path: "README.md", type: "blob", size: 40 },
            { path: "src/index.ts", type: "blob", size: 120 },
          ],
        }));
      }

      if (url === "https://api.github.com/repos/mock-dev/public-repo/commits?per_page=100") {
        return Promise.resolve(createJsonResponse(200, []));
      }

      if (url === "https://api.github.com/repos/mock-dev/public-repo/contributors?per_page=10") {
        return Promise.resolve(createJsonResponse(200, []));
      }

      if (url === "https://api.github.com/repos/mock-dev/public-repo/readme") {
        return Promise.resolve(createJsonResponse(200, {
          encoding: "base64",
          content: Buffer.from("# Public Repo", "utf8").toString("base64"),
        }));
      }

      if (url === "https://api.github.com/repos/mock-dev/public-repo/contents/src/index.ts") {
        return Promise.resolve(createJsonResponse(200, {
          encoding: "base64",
          content: Buffer.from("export const value = 1;", "utf8").toString("base64"),
        }));
      }

      return Promise.resolve(createJsonResponse(404, { message: "Not Found" }));
    });

    startGitHubAnalysisWorker();
    const processor = mockCreateWorker.mock.calls[0]?.[1] as (job: {
      id: string;
      attemptsMade: number;
      opts: { attempts: number };
      data: { analysisId: string; repoFullName: string; userId: string; locale?: string };
    }) => Promise<unknown>;

    const result = await processor({
      id: "job-1",
      attemptsMade: 0,
      opts: { attempts: 3 },
      data: {
        analysisId: "analysis-1",
        repoFullName: "mock-dev/public-repo",
        userId: "user-1",
        locale: "en",
      },
    });

    expect(result).toEqual(expect.objectContaining({
      repoFullName: "mock-dev/public-repo",
      name: "public-repo",
      primaryLanguage: "TypeScript",
    }));

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/repos/mock-dev/public-repo",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer encrypted-token",
        }),
      })
    );

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/mock-dev/public-repo",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      })
    );

    expect(mockPrisma.gitHubAnalysis.update).toHaveBeenLastCalledWith({
      where: { id: "analysis-1" },
      data: expect.objectContaining({ status: "COMPLETED" }),
    });
  });
});
