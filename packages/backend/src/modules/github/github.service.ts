// ═══════════════════════════════════════════════════════════
// GitHub Service — Token management & repo listing
// ═══════════════════════════════════════════════════════════

import type {
  DeepAnalysisResult,
  GitHubProjectImportDraft,
  GitHubProjectImportOverrides,
  GitHubProjectImportPreview,
  GitHubRepoData,
  GitHubProjectType,
} from "@cvbuilder/shared";
import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { encrypt, decrypt } from "../../utils/helpers";
import { logger } from "../../lib/logger";
import { getQueue, QUEUE_NAMES } from "../../lib/queue";
import { cacheDelete, cacheGet, cacheSet } from "../../lib/redis";
import { env } from "../../config/env";
import { attachImpactAnalysis, buildQuickRepoRecommendation } from "./github.scoring";
import crypto from "node:crypto";
import { GITHUB_ANALYSIS_VERSION } from "./github.constants";

function cvCacheKey(userId: string, cvId: string): string {
  return `cv:${userId}:${cvId}`;
}

const MAX_IMPORT_TECHNOLOGIES = 14;
const MAX_IMPORT_HIGHLIGHTS = 4;
const GITHUB_OAUTH_SCOPE = "read:user repo";
const GITHUB_OAUTH_STATE_TTL_SECONDS = 600;

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeListItem(value: string): string | null {
  const normalized = compactText(value).replace(/\s+([,.;!?])/g, "$1");
  return normalized.length > 0 ? normalized : null;
}

function uniqueStrings(values: Array<string | null | undefined>, limit = Number.POSITIVE_INFINITY): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!hasText(value)) continue;
    const normalized = compactText(value);
    const key = normalized.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= limit) break;
  }

  return result;
}

function truncateSentences(value: string, sentenceCount: number): string {
  const normalized = compactText(value);
  const sentences = normalized.match(/[^.!?]+[.!?]?/g)?.map((item) => item.trim()).filter(Boolean) ?? [];
  if (sentences.length <= sentenceCount) {
    return normalized;
  }

  return sentences.slice(0, sentenceCount).join(" ").trim();
}

function truncateLength(value: string, maxLength: number): string {
  const normalized = compactText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function splitSentences(value: string): string[] {
  return compactText(value)
    .match(/[^.!?]+[.!?]?/g)
    ?.map((item) => item.trim())
    .filter(Boolean) ?? [];
}

function mergeNarrativeParts(values: Array<string | null | undefined>, sentenceLimit: number): string {
  const seen = new Set<string>();
  const sentences: string[] = [];

  for (const value of values) {
    if (!hasText(value)) continue;
    for (const sentence of splitSentences(value)) {
      const key = sentence.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      sentences.push(sentence);
      if (sentences.length >= sentenceLimit) {
        return sentences.join(" ");
      }
    }
  }

  return sentences.join(" ");
}

function formatHumanList(values: string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0]!;
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function normalizeProjectDate(value: string | null | undefined): string | null {
  if (!hasText(value)) return null;

  const normalized = value.trim();
  const isoDateMatch = normalized.match(/^(\d{4}-\d{2})/);
  if (isoDateMatch?.[1]) {
    return isoDateMatch[1];
  }

  return normalized;
}

function buildTechnologyList(result: DeepAnalysisResult): string[] {
  const dependencyInfo = result.dependencyInfo;
  const languagePriority = [...result.languages]
    .sort((left, right) => right.percentage - left.percentage)
    .slice(0, 3)
    .map((language) => language.language);
  const curatedTechnologies = result.technologies ?? [];

  return uniqueStrings(
    [
      ...curatedTechnologies,
      ...(dependencyInfo?.frameworks ?? []),
      ...(dependencyInfo?.databases ?? []),
      ...(dependencyInfo?.uiLibraries ?? []),
      ...(dependencyInfo?.testingTools ?? []),
      ...(dependencyInfo?.buildTools ?? []),
      ...(dependencyInfo?.linters ?? []),
      result.primaryLanguage,
      ...languagePriority,
    ],
    MAX_IMPORT_TECHNOLOGIES
  );
}

function buildProjectDescription(result: DeepAnalysisResult): string {
  const ai = result.aiInsights;
  const preferred = mergeNarrativeParts([
    ai?.cvReadyDescription,
    ai?.projectSummary,
    result.description,
  ], 5);

  if (hasText(preferred)) {
    return truncateLength(truncateSentences(preferred, 5), 440);
  }

  const projectType = result.fileTree?.projectType ?? "unknown";
  const stackItems = buildTechnologyList(result).slice(0, 5);
  const stack = formatHumanList(stackItems);
  const qualitySignals = uniqueStrings([
    result.codeQuality?.hasTypeScript ? "TypeScript" : null,
    result.codeQuality?.hasTests ? "automated tests" : null,
    result.codeQuality?.hasCI ? "CI/CD workflows" : null,
    result.codeQuality?.hasDocker ? "Dockerized deployment" : null,
  ], 3);
  const typeLabel = projectType === "unknown" ? "software" : projectType;

  if (hasText(stack)) {
    return truncateLength(
      `Built a ${typeLabel} project using ${stack}. ${qualitySignals.length > 0 ? `Backed delivery with ${formatHumanList(qualitySignals)}.` : "Structured the repository with a maintainable, production-oriented engineering workflow."}`,
      440
    );
  }

  return `Built a ${typeLabel} project with a production-focused engineering setup and maintainable delivery workflow.`;
}

function buildArchitectureHighlight(projectType: GitHubProjectType): string | null {
  if (projectType === "fullstack") {
    return "Structured as a full-stack codebase with clear frontend, API, and shared-service boundaries.";
  }
  if (projectType === "monorepo") {
    return "Organized as a monorepo with separate applications and shared package boundaries.";
  }
  if (projectType === "frontend") {
    return "Frontend architecture emphasizes reusable UI structure, routing, and state-driven flows.";
  }
  if (projectType === "backend") {
    return "Backend architecture separates API, data access, and deployment concerns cleanly.";
  }
  if (projectType === "mobile") {
    return "Mobile-oriented repository includes platform-specific structure and shared application logic.";
  }
  if (projectType === "library" || projectType === "cli") {
    return "Reusable tooling structure keeps commands and modules isolated for maintainability.";
  }

  return null;
}

function buildQualityHighlight(result: DeepAnalysisResult): string | null {
  const quality = result.codeQuality;
  const signals = uniqueStrings([
    quality?.hasTests ? "automated tests" : null,
    quality?.hasCI ? "CI/CD workflows" : null,
    quality?.hasDocker ? "containerized deployment" : null,
    quality?.hasTypeScript ? "TypeScript" : null,
  ]);

  if (signals.length === 0) {
    return null;
  }

  if (signals.length === 1) {
    return `Engineering setup includes ${signals[0]}.`;
  }

  if (signals.length === 2) {
    return `Reinforced delivery quality with ${signals[0]} and ${signals[1]}.`;
  }

  return `Reinforced delivery quality with ${signals.slice(0, -1).join(", ")}, and ${signals.at(-1)}.`;
}

function buildStackHighlight(result: DeepAnalysisResult): string | null {
  const stack = buildTechnologyList(result).slice(0, 5);
  if (stack.length === 0) {
    return null;
  }

  return `Implemented core capabilities with ${formatHumanList(stack)}.`;
}

function buildActivityHighlight(result: DeepAnalysisResult): string | null {
  const recentActivity = result.commitAnalytics?.recentActivityCount ?? 0;
  const contributors = result.contributors?.length ?? 0;

  if (recentActivity > 0 && contributors > 1) {
    return `Sustained active delivery across ${contributors} contributors with ${recentActivity} recent commits.`;
  }

  if (recentActivity > 0) {
    return `Sustained active delivery with ${recentActivity} recent commits.`;
  }

  if (contributors > 1) {
    return `Collaborated across ${contributors} contributors on the repository's evolution.`;
  }

  return null;
}

function buildImpactSignalHighlight(result: DeepAnalysisResult): string | null {
  const primaryReason = result.impactAnalysis?.reasons?.[0];
  if (!hasText(primaryReason)) {
    return null;
  }

  return `${primaryReason.replace(/[.\s]+$/g, "")}.`;
}

function buildHighlights(result: DeepAnalysisResult): string[] {
  const aiHighlights = (result.aiInsights?.cvHighlights ?? [])
    .map(normalizeListItem)
    .filter((value): value is string => value !== null)
    .slice(0, MAX_IMPORT_HIGHLIGHTS);
  const aiStrengths = (result.aiInsights?.strengths ?? [])
    .map(normalizeListItem)
    .filter((value): value is string => value !== null)
    .slice(0, 3);
  const projectType = result.fileTree?.projectType ?? "unknown";

  return uniqueStrings(
    [
      ...aiHighlights,
      ...aiStrengths,
      buildImpactSignalHighlight(result),
      buildStackHighlight(result),
      buildArchitectureHighlight(projectType),
      buildQualityHighlight(result),
      buildActivityHighlight(result),
    ],
    MAX_IMPORT_HIGHLIGHTS
  );
}

function buildGitHubRepoData(result: DeepAnalysisResult): GitHubRepoData {
  return {
    stars: result.stars ?? 0,
    forks: result.forks ?? 0,
    watchers: result.watchers ?? 0,
    language: result.primaryLanguage ?? "",
    languageStats: Object.fromEntries(
      (result.languages ?? []).map((language) => [language.language, language.percentage])
    ),
    commitCount: result.totalCommits ?? 0,
    userCommitCount: result.totalCommits ?? 0,
    openIssues: result.openIssues ?? 0,
    topics: result.topics ?? [],
    license: result.license ?? null,
    projectType: result.fileTree?.projectType ?? null,
    qualityScore: result.codeQuality?.qualityScore ?? null,
    complexityLevel: result.aiInsights?.complexityLevel ?? null,
    projectSummary: result.aiInsights?.projectSummary ?? null,
    cvReadyDescription: result.aiInsights?.cvReadyDescription ?? null,
    architectureAnalysis: result.aiInsights?.architectureAnalysis ?? null,
    techStackAssessment: result.aiInsights?.techStackAssessment ?? null,
    detectedSkills: result.aiInsights?.detectedSkills ?? [],
    strengths: result.aiInsights?.strengths ?? [],
    cvHighlights: result.aiInsights?.cvHighlights ?? [],
    contributorCount: result.contributors?.length ?? 0,
    topContributors: (result.contributors ?? []).slice(0, 5),
    lastCommitDate: result.commitAnalytics?.lastCommitDate ?? null,
    recentActivityCount: result.commitAnalytics?.recentActivityCount ?? null,
    averagePerWeek: result.commitAnalytics?.averagePerWeek ?? null,
    activeDays: result.commitAnalytics?.activeDays ?? null,
    keyDirectories: result.fileTree?.keyDirectories ?? [],
    frameworks: result.dependencyInfo?.frameworks ?? [],
    databases: result.dependencyInfo?.databases ?? [],
    uiLibraries: result.dependencyInfo?.uiLibraries ?? [],
    testingTools: result.dependencyInfo?.testingTools ?? [],
    buildTools: result.dependencyInfo?.buildTools ?? [],
    linters: result.dependencyInfo?.linters ?? [],
    hasTests: result.codeQuality?.hasTests ?? false,
    hasCI: result.codeQuality?.hasCI ?? false,
    hasDocker: result.codeQuality?.hasDocker ?? false,
    hasTypeScript: result.codeQuality?.hasTypeScript ?? false,
    impactAnalysis: result.impactAnalysis ?? null,
  };
}

function buildImportDraft(result: DeepAnalysisResult): GitHubProjectImportDraft {
  const isPrivate = result.isPrivate === true;
  const repoUrl = isPrivate ? null : (result.url ?? null);

  return {
    name: result.name ?? result.repoFullName,
    description: buildProjectDescription(result),
    role: null,
    technologies: [],
    url: repoUrl,
    githubUrl: repoUrl,
    startDate: normalizeProjectDate(result.createdAt) ?? new Date().toISOString().slice(0, 7),
    endDate: null,
    highlights: buildHighlights(result),
    isFromGitHub: true,
    githubRepoData: buildGitHubRepoData(result),
  };
}

function applyImportOverrides(
  draft: GitHubProjectImportDraft,
  overrides?: GitHubProjectImportOverrides
): GitHubProjectImportDraft {
  if (!overrides) {
    return draft;
  }

  return {
    ...draft,
    name: overrides.name !== undefined && hasText(overrides.name) ? compactText(overrides.name) : draft.name,
    description: overrides.description !== undefined ? compactText(overrides.description) : draft.description,
    role: overrides.role !== undefined ? (hasText(overrides.role) ? compactText(overrides.role) : null) : draft.role,
    technologies: overrides.technologies !== undefined
      ? uniqueStrings(overrides.technologies, MAX_IMPORT_TECHNOLOGIES)
      : draft.technologies,
    highlights: overrides.highlights !== undefined
      ? uniqueStrings(
          overrides.highlights
            .map(normalizeListItem)
            .filter((value): value is string => value !== null),
          MAX_IMPORT_HIGHLIGHTS
        )
      : draft.highlights,
  };
}

function getCompletedAnalysisResult(analysis: { status: string; result: Prisma.JsonValue | DeepAnalysisResult | null }): DeepAnalysisResult {
  if (analysis.status !== "COMPLETED") {
    throw ApiError.badRequest("Analysis is not completed yet");
  }

  const result = analysis.result as unknown as DeepAnalysisResult | null;
  if (!result?.repoFullName) {
    throw ApiError.badRequest("Analysis has no result data");
  }

  return result;
}

function getAnalysisRepoFullName(analysis: { repoFullName?: string | null; result?: Prisma.JsonValue | DeepAnalysisResult | null }): string | null {
  if (hasText(analysis.repoFullName)) {
    return compactText(analysis.repoFullName);
  }

  const result = analysis.result as unknown as Record<string, unknown> | null;
  return typeof result?.repoFullName === "string" && hasText(result.repoFullName)
    ? compactText(result.repoFullName)
    : null;
}

function getAnalysisLocale(analysis: { locale?: string | null; result?: Prisma.JsonValue | DeepAnalysisResult | null }): "en" | "tr" {
  if (analysis.locale === "tr" || analysis.locale === "en") {
    return analysis.locale;
  }

  const result = analysis.result as unknown as Record<string, unknown> | null;
  return result?.analysisLocale === "tr" ? "tr" : "en";
}

async function findReusableAnalysis(userId: string, repoFullName: string, locale: "en" | "tr") {
  const byMetadata = await prisma.gitHubAnalysis.findFirst({
    where: {
      userId,
      repoFullName,
      locale,
      analysisVersion: GITHUB_ANALYSIS_VERSION,
      status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (byMetadata) {
    return byMetadata;
  }

  // Backward-compatible lookup for analyses created before repoFullName/locale columns existed.
  const candidates = await prisma.gitHubAnalysis.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return candidates.find((analysis) => {
    const storedRepoFullName = getAnalysisRepoFullName(analysis);
    return storedRepoFullName === repoFullName && getAnalysisLocale(analysis) === locale;
  }) ?? null;
}

async function enqueueAnalysisJob(options: {
  analysisId: string;
  repoFullName: string;
  userId: string;
  locale: "en" | "tr";
}) {
  await getQueue(QUEUE_NAMES.GITHUB_ANALYSIS).add("analyze", {
    analysisId: options.analysisId,
    repoFullName: options.repoFullName,
    userId: options.userId,
    locale: options.locale,
  });
}

function oauthStateKey(state: string): string {
  return `github-oauth:${state}`;
}

function ensureGitHubOAuthConfigured() {
  if (!env.GITHUB_OAUTH_CLIENT_ID || !env.GITHUB_OAUTH_CLIENT_SECRET || !env.GITHUB_OAUTH_REDIRECT_URI) {
    throw ApiError.badRequest("GitHub OAuth is not configured for this environment");
  }

  return {
    clientId: env.GITHUB_OAUTH_CLIENT_ID,
    clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET,
    redirectUri: env.GITHUB_OAUTH_REDIRECT_URI,
  };
}

async function fetchGitHubProfile(token: string) {
  const response = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
  });

  if (!response.ok) {
    throw ApiError.badRequest("Invalid GitHub token");
  }

  return response.json() as Promise<{ login: string; avatar_url: string; name: string }>;
}

async function getCvSignals(userId: string, cvId?: string) {
  if (!cvId) return null;

  const cv = await prisma.cV.findFirst({
    where: { id: cvId, userId },
    include: {
      personalInfo: true,
      summary: true,
      experiences: true,
      skills: true,
      projects: true,
    },
  });

  if (!cv) {
    throw ApiError.notFound("CV");
  }

  return cv as unknown as Record<string, unknown>;
}

function decorateAnalysisResult(result: DeepAnalysisResult, cv: Record<string, unknown> | null) {
  return attachImpactAnalysis(result, cv);
}

function buildImportPreviewPayload(analysisId: string, result: DeepAnalysisResult): GitHubProjectImportPreview {
  return {
    analysisId,
    repoFullName: result.repoFullName,
    draft: buildImportDraft(result),
    dependencyInfo: result.dependencyInfo
      ? {
          frameworks: result.dependencyInfo.frameworks,
          databases: result.dependencyInfo.databases,
          uiLibraries: result.dependencyInfo.uiLibraries,
          testingTools: result.dependencyInfo.testingTools,
          buildTools: result.dependencyInfo.buildTools,
          linters: result.dependencyInfo.linters,
        }
      : null,
  };
}

export const githubService = {
  async connect(userId: string, token: string) {
    const user = await fetchGitHubProfile(token);

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

  async getOAuthAuthorizeUrl(userId: string) {
    const { clientId, redirectUri } = ensureGitHubOAuthConfigured();
    const state = crypto.randomBytes(24).toString("hex");
    await cacheSet(oauthStateKey(state), { userId }, GITHUB_OAUTH_STATE_TTL_SECONDS);

    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", GITHUB_OAUTH_SCOPE);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("allow_signup", "true");

    return { authUrl: authUrl.toString() };
  },

  async completeOAuthCallback(code: string, state: string) {
    if (!code || !state) {
      throw ApiError.badRequest("Missing GitHub OAuth callback parameters");
    }

    const statePayload = await cacheGet<{ userId: string }>(oauthStateKey(state));
    if (!statePayload?.userId) {
      throw ApiError.badRequest("GitHub OAuth session expired or is invalid");
    }

    const { clientId, clientSecret, redirectUri } = ensureGitHubOAuthConfigured();
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        state,
      }),
    });

    const tokenPayload = await tokenResponse.json() as { access_token?: string; error?: string; error_description?: string };
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw ApiError.badRequest(tokenPayload.error_description || tokenPayload.error || "GitHub OAuth token exchange failed");
    }

    const githubUser = await fetchGitHubProfile(tokenPayload.access_token);
    await prisma.user.update({
      where: { id: statePayload.userId },
      data: {
        githubToken: encrypt(tokenPayload.access_token),
        githubUsername: githubUser.login,
      },
    });

    await cacheDelete(oauthStateKey(state));

    return `${env.CORS_ORIGIN.replace(/\/$/, "")}/github?github_oauth=success`;
  },

  async getRepos(userId: string, page = 1, perPage = 30, cvId?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.githubToken) throw ApiError.badRequest("GitHub not connected");

    const token = decrypt(user.githubToken);
    const cvSignals = await getCvSignals(userId, cvId);

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

    const mappedRepos = repos.map((r) => ({
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
      ...buildQuickRepoRecommendation({
        name: r.name,
        description: r.description,
        language: r.language,
        topics: r.topics ?? [],
        stargazersCount: r.stargazers_count,
        forksCount: r.forks_count,
        updatedAt: r.updated_at,
      }, cvSignals),
    }));

    return cvSignals
      ? mappedRepos.sort((left, right) => (right.fitScore ?? 0) - (left.fitScore ?? 0) || left.name.localeCompare(right.name))
      : mappedRepos;
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
      oauthConfigured: Boolean(env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET && env.GITHUB_OAUTH_REDIRECT_URI),
    };
  },

  async getAnalyses(userId: string, cvId?: string) {
    const cvSignals = await getCvSignals(userId, cvId);
    const analyses = await prisma.gitHubAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return analyses.map((analysis) => {
      const result = analysis.status === "COMPLETED" && analysis.result
        ? decorateAnalysisResult(analysis.result as unknown as DeepAnalysisResult, cvSignals)
        : analysis.result;

      return {
        ...analysis,
        result,
      };
    });
  },

  async getAnalysis(userId: string, id: string, cvId?: string) {
    const analysis = await prisma.gitHubAnalysis.findFirst({ where: { id, userId } });
    if (!analysis) throw ApiError.notFound("Analysis not found");
    if (analysis.status !== "COMPLETED" || !analysis.result) {
      return analysis;
    }

    const cvSignals = await getCvSignals(userId, cvId);
    return {
      ...analysis,
      result: decorateAnalysisResult(analysis.result as unknown as DeepAnalysisResult, cvSignals),
    };
  },

  async createAnalysis(userId: string, repoFullName: string, locale?: string, options?: { force?: boolean }) {
    const username = repoFullName.split("/")[0]!;
    const analysisLocale = locale === "tr" ? "tr" : "en";
    const force = options?.force === true;

    logger.info("Creating GitHub analysis", { repoFullName, locale: analysisLocale, force });

    const reusableAnalysis = await findReusableAnalysis(userId, repoFullName, analysisLocale);
    if (reusableAnalysis && !force) {
      logger.info("Reusing existing GitHub analysis", {
        analysisId: reusableAnalysis.id,
        repoFullName,
        locale: analysisLocale,
        status: reusableAnalysis.status,
      });
      return reusableAnalysis;
    }

    if (reusableAnalysis && force) {
      const refreshedAnalysis = await prisma.gitHubAnalysis.update({
        where: { id: reusableAnalysis.id },
        data: {
          username,
          repoFullName,
          locale: analysisLocale,
          analysisVersion: GITHUB_ANALYSIS_VERSION,
          status: "PENDING",
          result: { repoFullName, analysisLocale, analysisVersion: GITHUB_ANALYSIS_VERSION, refreshedAt: new Date().toISOString() },
          error: null,
          startedAt: null,
          completedAt: null,
        },
      });

      await enqueueAnalysisJob({ analysisId: refreshedAnalysis.id, repoFullName, userId, locale: analysisLocale });
      logger.info("GitHub analysis refresh job enqueued", { analysisId: refreshedAnalysis.id, repoFullName, locale: analysisLocale });
      return refreshedAnalysis;
    }

    const analysis = await prisma.gitHubAnalysis.create({
      data: {
        username,
        repoFullName,
        locale: analysisLocale,
        analysisVersion: GITHUB_ANALYSIS_VERSION,
        status: "PENDING",
        result: { repoFullName, analysisLocale, analysisVersion: GITHUB_ANALYSIS_VERSION },
        userId,
      },
    });

    await enqueueAnalysisJob({ analysisId: analysis.id, repoFullName, userId, locale: analysisLocale });

    logger.info("GitHub analysis job enqueued", { analysisId: analysis.id, repoFullName, locale: analysisLocale });

    return analysis;
  },

  async regenerateAnalysis(userId: string, analysisId: string, options?: { locale?: "en" | "tr"; force?: boolean }) {
    const analysis = await prisma.gitHubAnalysis.findFirst({ where: { id: analysisId, userId } });
    if (!analysis) {
      throw ApiError.notFound("Analysis not found");
    }

    const repoFullName = getAnalysisRepoFullName(analysis);
    if (!repoFullName) {
      throw ApiError.badRequest("Analysis does not contain a repository name to regenerate");
    }

    const locale = options?.locale ?? getAnalysisLocale(analysis);
    return this.createAnalysis(userId, repoFullName, locale, { force: options?.force ?? true });
  },

  async getImportPreview(userId: string, analysisId: string, cvId?: string) {
    const analysis = await this.getAnalysis(userId, analysisId, cvId);
    const result = getCompletedAnalysisResult(analysis);

    return buildImportPreviewPayload(analysis.id, result);
  },

  async deleteAnalysis(userId: string, id: string) {
    const analysis = await prisma.gitHubAnalysis.findFirst({ where: { id, userId } });
    if (!analysis) {
      throw ApiError.notFound("Analysis not found");
    }

    if (analysis.status === "PENDING" || analysis.status === "PROCESSING") {
      throw ApiError.badRequest("Active analyses cannot be removed until processing finishes");
    }

    await prisma.gitHubAnalysis.delete({ where: { id: analysis.id } });
    return { id: analysis.id, deleted: true };
  },

  // ── Import to CV ─────────────────────────────────────────

  async importToCV(userId: string, cvId: string, analysisId: string, projectOverrides?: GitHubProjectImportOverrides) {
    // Verify CV exists
    const cv = await prisma.cV.findFirst({ where: { id: cvId, userId } });
    if (!cv) throw ApiError.notFound("CV");

    const analysis = await this.getAnalysis(userId, analysisId);
    const result = getCompletedAnalysisResult(analysis);

    // Get current project count for orderIndex
    const projectCount = await prisma.project.count({ where: { cvId } });

    const draft = applyImportOverrides(buildImportDraft(result), projectOverrides);

    // Map analysis result → Project
    const project = await prisma.project.create({
      data: {
        cvId,
        name: draft.name,
        description: draft.description,
        role: draft.role,
        technologies: draft.technologies,
        url: draft.url,
        githubUrl: draft.githubUrl,
        startDate: draft.startDate,
        endDate: draft.endDate,
        highlights: draft.highlights,
        isFromGitHub: draft.isFromGitHub,
        githubAnalysisId: analysis.id,
        githubRepoData: draft.githubRepoData === null
          ? Prisma.JsonNull
          : (draft.githubRepoData as unknown as Prisma.InputJsonValue),
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
