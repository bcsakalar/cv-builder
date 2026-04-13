// ═══════════════════════════════════════════════════════════
// GitHub Service — Token management & repo listing
// ═══════════════════════════════════════════════════════════

import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { encrypt, decrypt } from "../../utils/helpers";
import { logger } from "../../lib/logger";
import { getQueue, QUEUE_NAMES } from "../../lib/queue";
import { cacheDelete } from "../../lib/redis";

function cvCacheKey(userId: string, cvId: string): string {
  return `cv:${userId}:${cvId}`;
}

export const githubService = {
  async connect(userId: string, token: string) {
    // Validate token against GitHub API
    const response = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });
    if (!response.ok) {
      throw ApiError.badRequest("Invalid GitHub token");
    }

    const user = (await response.json()) as { login: string; avatar_url: string; name: string };

    // Encrypt and store token
    const encryptedToken = encrypt(token);
    await prisma.user.update({
      where: { id: userId },
      data: {
        githubToken: encryptedToken,
        githubUsername: user.login,
      },
    });

    return { username: user.login, avatarUrl: user.avatar_url, name: user.name };
  },

  async disconnect(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { githubToken: null, githubUsername: null },
    });
  },

  async getRepos(userId: string, page = 1, perPage = 30) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.githubToken) throw ApiError.badRequest("GitHub not connected");

    const token = decrypt(user.githubToken);

    const response = await fetch(
      `https://api.github.com/user/repos?sort=updated&direction=desc&per_page=${perPage}&page=${page}&type=owner`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" } }
    );

    if (!response.ok) throw ApiError.internal("Failed to fetch repos");

    const repos = (await response.json()) as Array<{
      id: number;
      full_name: string;
      name: string;
      description: string | null;
      language: string | null;
      stargazers_count: number;
      forks_count: number;
      html_url: string;
      updated_at: string;
      topics: string[];
      private: boolean;
    }>;

    return repos.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      url: r.html_url,
      updatedAt: r.updated_at,
      topics: r.topics ?? [],
      isPrivate: r.private,
    }));
  },

  async getRepoDetails(userId: string, repoFullName: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.githubToken) throw ApiError.badRequest("GitHub not connected");

    const token = decrypt(user.githubToken);

    // Parallel fetch: repo metadata, languages, recent commits 
    const [repoRes, langRes, commitsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repoFullName}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
      }),
      fetch(`https://api.github.com/repos/${repoFullName}/languages`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
      }),
      fetch(`https://api.github.com/repos/${repoFullName}/commits?per_page=10`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
      }),
    ]);

    if (!repoRes.ok) throw ApiError.notFound("Repository not found");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = (await repoRes.json()) as any;
    const languages = langRes.ok ? ((await langRes.json()) as Record<string, number>) : {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commits = commitsRes.ok ? ((await commitsRes.json()) as any[]) : [];

    // Calculate language percentages
    const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
    const languageBreakdown = Object.entries(languages).map(([lang, bytes]) => ({
      language: lang,
      percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
    }));

    return {
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      topics: repo.topics ?? [],
      license: repo.license?.spdx_id,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      languages: languageBreakdown,
      recentCommits: commits.slice(0, 10).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any) => ({
          sha: c.sha?.substring(0, 7),
          message: c.commit?.message?.split("\n")[0],
          date: c.commit?.author?.date,
        })
      ),
    };
  },

  async getConnectionStatus(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return {
      connected: !!user?.githubToken,
      username: user?.githubUsername ?? null,
    };
  },

  async getAnalyses(userId: string) {
    return prisma.gitHubAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async getAnalysis(userId: string, id: string) {
    const analysis = await prisma.gitHubAnalysis.findFirst({ where: { id, userId } });
    if (!analysis) throw ApiError.notFound("Analysis not found");
    return analysis;
  },

  async createAnalysis(userId: string, repoFullName: string, locale?: string) {
    const username = repoFullName.split("/")[0]!;

    logger.info("Creating GitHub analysis", { repoFullName });

    const analysis = await prisma.gitHubAnalysis.create({
      data: {
        username,
        status: "PENDING",
        result: { repoFullName },
        userId,
      },
    });

    // Enqueue the analysis job
    await getQueue(QUEUE_NAMES.GITHUB_ANALYSIS).add("analyze", {
      analysisId: analysis.id,
      repoFullName,
      userId,
      locale: locale ?? "en",
    });

    logger.info("GitHub analysis job enqueued", { analysisId: analysis.id, repoFullName });

    return analysis;
  },

  // ── Import to CV ─────────────────────────────────────────

  async importToCV(userId: string, cvId: string, analysisId: string) {
    // Verify CV exists
    const cv = await prisma.cV.findFirst({ where: { id: cvId, userId } });
    if (!cv) throw ApiError.notFound("CV");

    // Get completed analysis
    const analysis = await this.getAnalysis(userId, analysisId);
    if (analysis.status !== "COMPLETED") {
      throw ApiError.badRequest("Analysis is not completed yet");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = analysis.result as any;
    if (!result?.repoFullName) {
      throw ApiError.badRequest("Analysis has no result data");
    }

    // Get current project count for orderIndex
    const projectCount = await prisma.project.count({ where: { cvId } });

    // Extract AI insights if available
    const ai = result.aiInsights as {
      projectSummary?: string;
      cvReadyDescription?: string;
      detectedSkills?: string[];
      strengths?: string[];
      architectureAnalysis?: string;
      techStackAssessment?: string;
      complexityLevel?: string;
    } | null;

    // Use AI-generated description if available, fallback to repo description
    const description = ai?.cvReadyDescription ?? ai?.projectSummary ?? result.description ?? "";

    // Build richer technologies list from analysis data
    const depInfo = result.dependencyInfo as {
      frameworks?: string[];
      databases?: string[];
      uiLibraries?: string[];
      testingTools?: string[];
      buildTools?: string[];
    } | null;

    // Combine all tech sources for a comprehensive list
    const techSet = new Set<string>(result.technologies ?? []);
    if (depInfo?.frameworks) depInfo.frameworks.forEach((f: string) => techSet.add(f));
    if (depInfo?.databases) depInfo.databases.forEach((d: string) => techSet.add(d));
    if (depInfo?.uiLibraries) depInfo.uiLibraries.forEach((u: string) => techSet.add(u));
    const technologies = [...techSet];

    // Build meaningful highlights from analysis data
    const highlights: string[] = [];
    if (ai?.strengths?.length) {
      for (const s of ai.strengths) highlights.push(s);
    }
    if (result.stars > 0) highlights.push(`${result.stars} stars on GitHub`);
    if (result.totalCommits > 0) highlights.push(`${result.totalCommits} commits`);
    if (result.fileTree?.totalFiles) highlights.push(`${result.fileTree.totalFiles} files across ${result.fileTree.totalDirectories} directories`);
    if (result.codeQuality?.hasTests) highlights.push("Includes unit/integration tests");
    if (result.codeQuality?.hasCI) highlights.push("CI/CD pipeline configured");
    if (result.codeQuality?.hasDocker) highlights.push("Dockerized deployment");
    if (result.codeQuality?.hasTypeScript) highlights.push("Full TypeScript implementation");
    if (result.contributors?.length > 1) highlights.push(`${result.contributors.length} contributors`);
    if (result.license) highlights.push(`${result.license} licensed`);

    // Determine role from project type
    const projectType = result.fileTree?.projectType as string | undefined;
    const role = projectType === "fullstack" ? "Full-Stack Developer"
      : projectType === "frontend" ? "Frontend Developer"
      : projectType === "backend" ? "Backend Developer"
      : projectType === "monorepo" ? "Lead Developer"
      : projectType === "mobile" ? "Mobile Developer"
      : "Developer";

    // For private repos, omit URLs to avoid exposing private links
    const isPrivate = result.isPrivate === true;
    const repoUrl = isPrivate ? null : (result.url ?? null);

    // Map analysis result → Project
    const project = await prisma.project.create({
      data: {
        cvId,
        name: result.name ?? result.repoFullName,
        description,
        role,
        technologies,
        url: repoUrl,
        githubUrl: repoUrl,
        startDate: result.createdAt ?? new Date().toISOString(),
        endDate: result.updatedAt ?? null,
        highlights,
        isFromGitHub: true,
        githubRepoData: {
          stars: result.stars ?? 0,
          forks: result.forks ?? 0,
          watchers: result.watchers ?? 0,
          language: result.primaryLanguage ?? "",
          languageStats: Object.fromEntries(
            (result.languages ?? []).map((l: { language: string; percentage: number }) => [l.language, l.percentage])
          ),
          commitCount: result.totalCommits ?? 0,
          userCommitCount: result.totalCommits ?? 0,
          openIssues: result.openIssues ?? 0,
          topics: result.topics ?? [],
          license: result.license ?? null,
          // Extra deep analysis data
          projectType: projectType ?? "unknown",
          qualityScore: result.codeQuality?.qualityScore ?? null,
          detectedSkills: ai?.detectedSkills ?? [],
          architectureAnalysis: ai?.architectureAnalysis ?? null,
          techStackAssessment: ai?.techStackAssessment ?? null,
          complexityLevel: ai?.complexityLevel ?? null,
        } as Prisma.InputJsonValue,
        orderIndex: projectCount,
      },
    });

    await cacheDelete(cvCacheKey(userId, cvId));
    logger.info("GitHub analysis imported to CV", { cvId, analysisId, projectId: project.id });
    return project;
  },

  async bulkImportToCV(userId: string, cvId: string, analysisIds: string[]) {
    const results = [];
    for (const analysisId of analysisIds) {
      const project = await this.importToCV(userId, cvId, analysisId);
      results.push(project);
    }
    return results;
  },
};
