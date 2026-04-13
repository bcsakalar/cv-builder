import { githubService } from "./github.service";
import { prisma } from "../../lib/prisma";
import { cacheDelete } from "../../lib/redis";

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
    },
  },
}));

jest.mock("../../lib/redis", () => ({
  cacheDelete: jest.fn(),
}));

jest.mock("../../utils/helpers", () => ({
  encrypt: jest.fn().mockReturnValue("encrypted-token"),
  decrypt: jest.fn().mockReturnValue("ghp_test_token"),
}));

jest.mock("../../config/env", () => ({
  env: {
    ENCRYPTION_KEY: "0".repeat(64),
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
    add: jest.fn(),
  })),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;
const USER_ID = "00000000-0000-0000-0000-000000000001";
const CV_ID = "03d5953f-4341-4935-9e64-3831e40fb2f7";

const mockUser = (prisma as unknown as { user: { findUnique: jest.Mock; update: jest.Mock } }).user;
const mockCV = (prisma as unknown as { cV: { findFirst: jest.Mock } }).cV;
const mockProject = (prisma as unknown as { project: { count: jest.Mock; create: jest.Mock } }).project;
const mockAnalysis = (prisma as unknown as { gitHubAnalysis: { findMany: jest.Mock; findFirst: jest.Mock } }).gitHubAnalysis;
const mockCacheDelete = cacheDelete as jest.MockedFunction<typeof cacheDelete>;

describe("githubService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getConnectionStatus", () => {
    it("should return connected if token exists", async () => {
      mockUser.findUnique.mockResolvedValue({
        githubToken: "encrypted",
        githubUsername: "testuser",
      });

      const result = await githubService.getConnectionStatus(USER_ID);

      expect(result).toEqual({ connected: true, username: "testuser" });
    });

    it("should return not connected if no token", async () => {
      mockUser.findUnique.mockResolvedValue({ githubToken: null, githubUsername: null });

      const result = await githubService.getConnectionStatus(USER_ID);

      expect(result).toEqual({ connected: false, username: null });
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

  describe("importToCV", () => {
    it("should invalidate cached CV detail after importing a project", async () => {
      mockCV.findFirst.mockResolvedValue({ id: CV_ID, userId: USER_ID });
      mockAnalysis.findFirst.mockResolvedValue({
        id: "analysis-1",
        status: "COMPLETED",
        result: {
          repoFullName: "bcsakalar/bcsakalar",
          name: "bcsakalar",
          description: "Profile repository",
          url: "https://github.com/bcsakalar/bcsakalar",
          createdAt: "2026-02-20T00:00:00.000Z",
          updatedAt: "2026-04-10T00:00:00.000Z",
          primaryLanguage: "Markdown",
          languages: [{ language: "Markdown", percentage: 100 }],
          totalCommits: 9,
          topics: [],
          fileTree: { totalFiles: 1, totalDirectories: 0 },
        },
      });
      mockProject.count.mockResolvedValue(0);
      mockProject.create.mockResolvedValue({ id: "project-1" });

      await githubService.importToCV(USER_ID, CV_ID, "analysis-1");

      expect(mockProject.create).toHaveBeenCalled();
      expect(mockCacheDelete).toHaveBeenCalledWith(`cv:${USER_ID}:${CV_ID}`);
    });
  });
});
