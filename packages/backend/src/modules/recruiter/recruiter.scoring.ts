import type { CandidateLink, CandidateRecommendation } from "@cvbuilder/shared";

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "build",
  "built",
  "candidate",
  "engineering",
  "experience",
  "for",
  "from",
  "have",
  "help",
  "into",
  "job",
  "looking",
  "must",
  "our",
  "role",
  "that",
  "the",
  "their",
  "this",
  "using",
  "with",
  "you",
  "your",
]);

const TERM_ALIASES: Record<string, string[]> = {
  "node.js": ["node", "nodejs", "node js"],
  node: ["node.js", "nodejs", "node js"],
  react: ["react.js", "reactjs", "react js"],
  "next.js": ["next", "nextjs", "next js"],
  postgresql: ["postgres", "postgre sql"],
  postgres: ["postgresql", "postgre sql"],
  mongodb: ["mongo", "mongo db"],
  "ci/cd": ["ci cd", "cicd", "continuous integration", "continuous delivery", "continuous deployment"],
  "rest api": ["rest", "restful", "api", "apis"],
  rest: ["rest api", "restful api", "api", "apis"],
  api: ["apis", "rest api", "backend api"],
  docker: ["dockerfile", "docker compose", "dockerized", "container", "containerized"],
  kubernetes: ["k8s"],
  "github actions": ["github workflow", "github workflows", "ci/cd"],
  typescript: ["ts"],
  javascript: ["js"],
  "c#": ["csharp", "c sharp", ".net", "dotnet"],
  azure: ["microsoft azure"],
  aws: ["amazon web services"],
  gcp: ["google cloud", "google cloud platform"],
};

export interface RecruiterJobForScoring {
  title: string;
  description: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  minimumYearsExperience: number | null;
}

export interface CandidateForScoring {
  fullName: string | null;
  headline: string | null;
  summary: string | null;
  topSkills: string[];
  completenessScore: number;
  yearsOfExperience: number | null;
  rawTextSnippet: string;
  fullText?: string | null;
  email: string | null;
  phone: string | null;
}

export interface CandidateMatchEvidence {
  term: string;
  source: "mustHave" | "keyword";
  evidence: string;
}

export interface CandidateScoreResult {
  overallScore: number;
  mustHaveScore: number;
  keywordScore: number;
  experienceScore: number;
  readabilityScore: number;
  linkQualityScore: number;
  riskPenalty: number;
  recommendation: CandidateRecommendation;
  matchedKeywords: string[];
  matchedHardSkills: string[];
  missingKeywords: string[];
  missingHardSkills: string[];
  matchEvidence: CandidateMatchEvidence[];
  strengths: string[];
  riskFlags: string[];
  shortSummary: string;
  explanation: string;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bnode\s*js\b/g, "node.js")
    .replace(/\bnext\s*js\b/g, "next.js")
    .replace(/\breact\s*js\b/g, "react")
    .replace(/\bpostgre\s*sql\b/g, "postgresql")
    .replace(/\bci\s*[/-]?\s*cd\b/g, "ci/cd")
    .replace(/\bc\s*sharp\b/g, "c#")
    .replace(/[^a-z0-9+#/.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniq(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function prettifyTerm(value: string): string {
  const normalized = normalizeTerm(value);
  if (normalized === "node.js") return "Node.js";
  if (normalized === "next.js") return "Next.js";
  if (normalized === "c#") return "C#";
  if (normalized === "ci/cd") return "CI/CD";
  if (normalized === "rest api") return "REST API";
  if (normalized === "api") return "API";
  if (normalized === "postgresql" || normalized === "postgres") return "PostgreSQL";
  if (normalized === "mongodb") return "MongoDB";
  if (normalized === "aws") return "AWS";
  if (normalized === "gcp") return "GCP";
  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expandTerm(term: string): string[] {
  const normalized = normalizeTerm(term);
  const aliases = TERM_ALIASES[normalized] ?? [];
  return uniq([normalized, ...aliases.map(normalizeTerm)]).filter((value) => value.length > 0);
}

function buildTermPattern(term: string): RegExp {
  const escaped = escapeRegex(normalizeTerm(term))
    .replace(/\\\./g, "[\\s.-]?")
    .replace(/\\\//g, "[\\s/-]?")
    .replace(/\s+/g, "[\\s._/-]+");

  return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i");
}

function findEvidence(rawCorpus: string, variants: string[]): string | null {
  const compactCorpus = rawCorpus.replace(/\s+/g, " ").trim();
  const normalizedCorpus = normalizeTerm(compactCorpus);

  for (const variant of variants) {
    const pattern = buildTermPattern(variant);
    const normalizedMatch = pattern.exec(normalizedCorpus);
    if (!normalizedMatch?.[0]) continue;

    const plainVariant = normalizeTerm(variant).replace(/[./]/g, " ");
    const rawIndex = compactCorpus.toLowerCase().indexOf(plainVariant.split(" ")[0] ?? "");
    const start = rawIndex >= 0 ? Math.max(0, rawIndex - 70) : 0;
    const end = rawIndex >= 0 ? Math.min(compactCorpus.length, rawIndex + 130) : Math.min(compactCorpus.length, 180);
    return compactCorpus.slice(start, end).trim();
  }

  return null;
}

function deriveKeywords(description: string): string[] {
  const tokens = description.toLowerCase().match(/[a-z0-9+#/.-]{3,}/g) ?? [];
  const counts = new Map<string, number>();

  for (const token of tokens) {
    const normalized = normalizeTerm(token);
    if (!normalized || STOP_WORDS.has(normalized)) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || right[0].localeCompare(left[0]))
    .map(([token]) => token)
    .slice(0, 12);
}

function computeCoverage(
  requiredTerms: string[],
  corpus: string,
  rawCorpus: string,
  source: CandidateMatchEvidence["source"]
): { score: number; missing: string[]; matched: string[]; evidence: CandidateMatchEvidence[] } {
  if (requiredTerms.length === 0) {
    return { score: 75, missing: [], matched: [], evidence: [] };
  }

  const normalizedRequired = uniq(requiredTerms.map(normalizeTerm));
  const matched: string[] = [];
  const missing: string[] = [];
  const evidence: CandidateMatchEvidence[] = [];

  for (const term of normalizedRequired) {
    const variants = expandTerm(term);
    const hasDirectMatch = variants.some((variant) => buildTermPattern(variant).test(corpus));
    const hasPhraseParts = !hasDirectMatch && term.includes(" ")
      ? term.split(" ").filter((part) => part.length >= 3).every((part) => buildTermPattern(part).test(corpus))
      : false;

    if (hasDirectMatch || hasPhraseParts) {
      matched.push(term);
      const snippet = findEvidence(rawCorpus, variants) ?? `Matched evidence for ${prettifyTerm(term)} in the extracted CV text.`;
      evidence.push({ term: prettifyTerm(term), source, evidence: snippet });
    } else {
      missing.push(term);
    }
  }

  const score = clampScore((matched.length / normalizedRequired.length) * 100);

  return {
    score,
    matched: matched.map(prettifyTerm),
    missing: missing.map(prettifyTerm),
    evidence,
  };
}

function computeExperienceScore(candidateYears: number | null, minimumYearsExperience: number | null, evidenceScore: number): number {
  if (minimumYearsExperience === null || minimumYearsExperience === undefined) {
    return clampScore((candidateYears ?? 2) * 12 + evidenceScore * 0.4);
  }

  if (candidateYears === null) {
    return clampScore(evidenceScore * 0.5);
  }

  const ratio = candidateYears / Math.max(1, minimumYearsExperience);
  return clampScore(Math.min(100, ratio * 80) + evidenceScore * 0.2);
}

function computeLinkScore(links: CandidateLink[]): { score: number; brokenLinks: number; accessibleLinks: number; signalBoost: number } {
  if (links.length === 0) {
    return { score: 30, brokenLinks: 0, accessibleLinks: 0, signalBoost: 0 };
  }

  const brokenLinks = links.filter((link) => link.inspectionStatus === "FAILED" || link.inspectionStatus === "BLOCKED" || link.accessible === false).length;
  const accessibleLinks = links.filter((link) => link.accessible === true).length;
  const signalTypes = new Set(links.filter((link) => link.linkType !== "OTHER").map((link) => link.linkType));
  const signalBoost = signalTypes.size * 8;
  const reliability = accessibleLinks / links.length;

  return {
    score: clampScore(reliability * 70 + signalBoost),
    brokenLinks,
    accessibleLinks,
    signalBoost,
  };
}

function recommendationFromScore(score: number): CandidateRecommendation {
  if (score >= 80) return "STRONG_MATCH";
  if (score >= 55) return "POTENTIAL_MATCH";
  return "WEAK_MATCH";
}

export function scoreCandidate(job: RecruiterJobForScoring, candidate: CandidateForScoring, links: CandidateLink[]): CandidateScoreResult {
  const fullCandidateText = candidate.fullText && candidate.fullText.trim().length > candidate.rawTextSnippet.length
    ? candidate.fullText
    : candidate.rawTextSnippet;
  const rawCorpus = [
    candidate.headline,
    candidate.summary,
    fullCandidateText,
    ...candidate.topSkills,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ");
  const corpus = normalizeTerm(rawCorpus);

  const mustHaveFallback = job.mustHaveSkills.length > 0 ? job.mustHaveSkills : deriveKeywords(job.description).slice(0, 5);
  const keywordFallback = job.niceToHaveSkills.length > 0 ? job.niceToHaveSkills : deriveKeywords(job.description).slice(0, 10);

  const mustHaveCoverage = computeCoverage(mustHaveFallback, corpus, rawCorpus, "mustHave");
  const keywordCoverage = computeCoverage(keywordFallback, corpus, rawCorpus, "keyword");
  const evidenceCount = (fullCandidateText.match(/\d+/g) ?? []).length;
  const experienceScore = computeExperienceScore(candidate.yearsOfExperience, job.minimumYearsExperience, evidenceCount * 5);
  const readabilityScore = candidate.completenessScore;
  const linkScore = computeLinkScore(links);

  const riskFlags: string[] = [];
  let riskPenalty = 0;

  if (!candidate.email) {
    riskFlags.push("Missing email address");
    riskPenalty += 6;
  }

  if (!candidate.phone) {
    riskFlags.push("Missing phone number");
    riskPenalty += 4;
  }

  if (mustHaveCoverage.score < 50) {
    riskFlags.push("Less than half of the must-have criteria are evidenced");
    riskPenalty += 10;
  }

  if (linkScore.brokenLinks > 0) {
    riskFlags.push(`${linkScore.brokenLinks} broken or blocked link${linkScore.brokenLinks > 1 ? "s" : ""} found`);
    riskPenalty += Math.min(8, linkScore.brokenLinks * 2);
  }

  if (candidate.completenessScore < 55 && fullCandidateText.length < 1200) {
    riskFlags.push("Candidate profile is incomplete");
    riskPenalty += 5;
  }

  const textDepthBoost = fullCandidateText.length >= 1500 ? 4 : fullCandidateText.length >= 800 ? 2 : 0;

  const overallScore = clampScore(
    mustHaveCoverage.score * 0.42 +
      keywordCoverage.score * 0.18 +
      experienceScore * 0.15 +
      readabilityScore * 0.13 +
      linkScore.score * 0.12 -
        riskPenalty +
        textDepthBoost
  );

  const recommendation = recommendationFromScore(overallScore);
  const strengths: string[] = [];

  if (mustHaveCoverage.score >= 75) {
    strengths.push(`Matches ${mustHaveCoverage.matched.length}/${mustHaveFallback.length} must-have skills`);
  }
  if (experienceScore >= 70) {
    strengths.push("Experience evidence meets or exceeds the job's expected level");
  }
  if (linkScore.accessibleLinks >= 2) {
    strengths.push("Multiple accessible profile or portfolio links are available");
  }
  if (readabilityScore >= 75) {
    strengths.push("CV structure is complete enough for fast recruiter review");
  }

  if (strengths.length === 0) {
    strengths.push("Candidate has some relevant signals but needs closer manual review");
  }

  const matchedLabel = candidate.fullName ?? candidate.headline ?? "This candidate";
  const shortSummary = `${matchedLabel} scored ${overallScore}/100 with ${mustHaveCoverage.matched.length}/${mustHaveFallback.length || 1} must-have matches and ${linkScore.brokenLinks} problematic links.`;
  const matchEvidence = [...mustHaveCoverage.evidence, ...keywordCoverage.evidence].slice(0, 12);
  const explanation = `${shortSummary} Recommendation: ${recommendation.replace(/_/g, " ").toLowerCase()}. Missing hard skills: ${mustHaveCoverage.missing.slice(0, 4).join(", ") || "none"}. Missing keywords: ${keywordCoverage.missing.slice(0, 4).join(", ") || "none"}.`;

  return {
    overallScore,
    mustHaveScore: mustHaveCoverage.score,
    keywordScore: keywordCoverage.score,
    experienceScore,
    readabilityScore,
    linkQualityScore: linkScore.score,
    riskPenalty,
    recommendation,
    matchedKeywords: keywordCoverage.matched,
    matchedHardSkills: mustHaveCoverage.matched,
    missingKeywords: keywordCoverage.missing,
    missingHardSkills: mustHaveCoverage.missing,
    matchEvidence,
    strengths,
    riskFlags,
    shortSummary,
    explanation,
  };
}
