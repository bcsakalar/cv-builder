import type { DeepAnalysisResult, GitHubImpactAnalysis } from "@cvbuilder/shared";

type CVLike = Record<string, unknown>;

interface RepoListLike {
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function recordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    : [];
}

function unique(values: string[], limit = Number.POSITIVE_INFINITY): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalize(value);
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= limit) break;
  }

  return result;
}

function buildCvSignalTerms(cv?: CVLike | null): string[] {
  if (!cv) return [];

  const skills = recordArray(cv.skills).map((item) => normalize(item.name));
  const projectTechnologies = recordArray(cv.projects).flatMap((item) => stringArray(item.technologies));
  const experienceTechnologies = recordArray(cv.experiences).flatMap((item) => stringArray(item.technologies));
  const summary = normalize((cv.summary as Record<string, unknown> | null)?.content);
  const title = normalize((cv.personalInfo as Record<string, unknown> | null)?.professionalTitle);

  return unique([
    ...skills,
    ...projectTechnologies,
    ...experienceTechnologies,
    ...summary.split(/[^a-zA-Z0-9.+#/-]+/),
    ...title.split(/[^a-zA-Z0-9.+#/-]+/),
  ].filter((value) => value.length >= 2));
}

function intersectCount(left: string[], rightCorpus: string): number {
  return left.filter((item) => rightCorpus.includes(item.toLocaleLowerCase())).length;
}

export function buildQuickRepoRecommendation(repo: RepoListLike, cv?: CVLike | null) {
  const reasons: string[] = [];
  if (!cv) {
    return { fitScore: null as number | null, fitReasons: [] as string[], recommended: false };
  }

  const cvTerms = buildCvSignalTerms(cv).map((item) => item.toLocaleLowerCase());
  const corpus = [repo.name, repo.description ?? "", repo.language ?? "", ...(repo.topics ?? [])]
    .join(" ")
    .toLocaleLowerCase();

  const termMatches = intersectCount(cvTerms, corpus);
  let score = 25 + Math.min(termMatches * 9, 36);

  if (repo.language && cvTerms.includes(repo.language.toLocaleLowerCase())) {
    score += 12;
    reasons.push(`${repo.language} aligns with the selected CV stack.`);
  }

  if ((repo.topics ?? []).length > 0 && termMatches > 0) {
    reasons.push(`Repository topics overlap with your CV skills and projects.`);
  }

  if (repo.stargazersCount >= 10) {
    score += 10;
    reasons.push("Repository has visible community traction.");
  }

  if (repo.forksCount >= 3) {
    score += 6;
  }

  const daysSinceUpdate = Math.max(1, Math.round((Date.now() - new Date(repo.updatedAt).getTime()) / 86400000));
  if (daysSinceUpdate <= 60) {
    score += 12;
    reasons.push("Repository shows recent activity.");
  }

  return {
    fitScore: clampScore(score),
    fitReasons: unique(reasons, 3),
    recommended: score >= 65,
  };
}

export function buildImpactAnalysis(result: DeepAnalysisResult, cv?: CVLike | null): GitHubImpactAnalysis {
  const documentation = clampScore(
    (result.hasReadme ? 35 : 10) +
    (result.license ? 15 : 0) +
    (result.description ? 10 : 0) +
    Math.min((result.topics?.length ?? 0) * 8, 16) +
    (result.codeQuality?.hasContributing ? 12 : 0) +
    (result.codeQuality?.hasChangelog ? 12 : 0)
  );

  const engineering = clampScore(
    (result.codeQuality?.qualityScore ?? 0) * 0.6 +
    ((result.codeQuality?.hasTests ? 12 : 0) + (result.codeQuality?.hasCI ? 12 : 0) + (result.codeQuality?.hasDocker ? 8 : 0) + (result.codeQuality?.hasTypeScript ? 8 : 0))
  );

  const activity = clampScore(
    Math.min((result.commitAnalytics?.recentActivityCount ?? 0) * 4, 40) +
    Math.min((result.commitAnalytics?.totalCommits ?? result.totalCommits ?? 0) / 3, 35) +
    Math.min((result.commitAnalytics?.activeDays ?? 0) / 3, 25)
  );

  const community = clampScore(
    Math.min(result.stars * 1.6, 45) +
    Math.min(result.forks * 3, 20) +
    Math.min(result.watchers * 2, 10) +
    Math.min((result.contributors?.length ?? 0) * 8, 25)
  );

  const fitSignalTerms = buildCvSignalTerms(cv);
  const deepCorpus = [
    result.primaryLanguage ?? "",
    ...(result.technologies ?? []),
    ...(result.dependencyInfo?.frameworks ?? []),
    ...(result.dependencyInfo?.databases ?? []),
    ...(result.dependencyInfo?.uiLibraries ?? []),
    ...(result.dependencyInfo?.testingTools ?? []),
    ...(result.topics ?? []),
    result.aiInsights?.projectSummary ?? "",
    result.aiInsights?.techStackAssessment ?? "",
  ].join(" ").toLocaleLowerCase();
  const matchedSignals = intersectCount(fitSignalTerms.map((item) => item.toLocaleLowerCase()), deepCorpus);
  const fitScore = cv
    ? clampScore(
        20 +
        Math.min(matchedSignals * 8, 48) +
        ((result.primaryLanguage && fitSignalTerms.map((item) => item.toLocaleLowerCase()).includes(result.primaryLanguage.toLocaleLowerCase())) ? 12 : 0) +
        ((result.codeQuality?.hasTests ? 8 : 0) + (result.codeQuality?.hasCI ? 6 : 0))
      )
    : null;

  const reasons = unique([
    documentation >= 70 ? "Repository is well-documented and presentation-ready." : null,
    engineering >= 70 ? "Engineering quality signals are strong (tests, CI, or tooling depth)." : null,
    activity >= 65 ? "Commit history shows active and sustained delivery." : null,
    community >= 55 ? "Stars, forks, and contributor signals add external credibility." : null,
    fitScore !== null && fitScore >= 70 ? "Repository strongly matches the selected CV tech narrative." : null,
  ].filter((value): value is string => typeof value === "string"), 4);

  return {
    impactScore: clampScore((documentation + engineering + activity + community) / 4),
    fitScore,
    breakdown: {
      documentation,
      engineering,
      activity,
      community,
      relevance: fitScore,
    },
    reasons,
  };
}

export function attachImpactAnalysis(result: DeepAnalysisResult, cv?: CVLike | null): DeepAnalysisResult {
  return {
    ...result,
    impactAnalysis: buildImpactAnalysis(result, cv),
  };
}