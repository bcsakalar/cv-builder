import type {
  AIATSFixChecklistItem,
  AIATSResult,
  AIATSSectionScore,
  AIRecruiterReadabilityMetrics,
} from "@cvbuilder/shared";

const STOP_WORDS = new Set([
  "about", "after", "also", "an", "and", "are", "back", "been", "being", "build", "built", "can",
  "for", "from", "into", "its", "job", "must", "our", "role", "that", "the", "their", "this", "with",
  "you", "your", "will", "have", "has", "using", "use", "used", "work", "works", "years", "team",
  "developer", "engineer", "experience", "looking", "preferred", "strong", "ability",
]);

const ACTION_VERBS = [
  "built", "delivered", "designed", "improved", "optimized", "owned", "launched", "led", "implemented",
  "shipped", "scaled", "automated", "reduced", "created", "mentored", "architected", "developed",
];

const HARD_SKILL_TERMS = [
  "typescript", "javascript", "node.js", "node", "react", "next.js", "next", "postgresql", "postgres",
  "mysql", "mongodb", "redis", "docker", "kubernetes", "aws", "azure", "gcp", "graphql", "rest",
  "playwright", "vitest", "jest", "cypress", "ci/cd", "terraform", "prisma", "tailwind", "sql",
  "python", "java", "go", "rust", "c#", "express", "nestjs", "fastapi", "linux",
];

type CVLike = Record<string, unknown>;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    : [];
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function uniqueItems(values: string[], limit = Number.POSITIVE_INFINITY): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= limit) break;
  }

  return result;
}

function collectBulletPoints(cv: CVLike): string[] {
  const experiences = toRecordArray(cv.experiences).flatMap((item) => toStringArray(item.achievements));
  const projects = toRecordArray(cv.projects).flatMap((item) => toStringArray(item.highlights));
  return [...experiences, ...projects].map(normalizeText).filter(Boolean);
}

function collectCorpus(cv: CVLike): string {
  const summary = normalizeText((cv.summary as Record<string, unknown> | null)?.content);
  const coverLetter = normalizeText((cv.coverLetter as Record<string, unknown> | null)?.content);
  const experiences = toRecordArray(cv.experiences).flatMap((item) => [
    normalizeText(item.jobTitle),
    normalizeText(item.company),
    normalizeText(item.description),
    ...toStringArray(item.achievements),
    ...toStringArray(item.technologies),
  ]);
  const projects = toRecordArray(cv.projects).flatMap((item) => [
    normalizeText(item.name),
    normalizeText(item.description),
    ...toStringArray(item.highlights),
    ...toStringArray(item.technologies),
  ]);
  const skills = toRecordArray(cv.skills).map((item) => normalizeText(item.name));

  return [summary, coverLetter, ...experiences, ...projects, ...skills]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function hasDigits(value: string): boolean {
  return /\d/.test(value);
}

function countActionVerbs(value: string): boolean {
  const lower = value.toLocaleLowerCase();
  return ACTION_VERBS.some((verb) => lower.includes(`${verb} `) || lower.startsWith(verb));
}

function buildReadability(cv: CVLike): AIRecruiterReadabilityMetrics {
  const summary = normalizeText((cv.summary as Record<string, unknown> | null)?.content);
  const coverLetter = normalizeText((cv.coverLetter as Record<string, unknown> | null)?.content);
  const descriptions = [
    summary,
    coverLetter,
    ...toRecordArray(cv.experiences).map((item) => normalizeText(item.description)),
    ...toRecordArray(cv.projects).map((item) => normalizeText(item.description)),
  ].filter(Boolean);
  const bulletPoints = collectBulletPoints(cv);
  const sentences = descriptions
    .flatMap((value) => value.split(/[.!?]+/))
    .map((value) => normalizeText(value))
    .filter(Boolean);
  const wordCount = sentences.reduce((total, sentence) => total + sentence.split(/\s+/).filter(Boolean).length, 0);
  const averageSentenceLength = sentences.length > 0 ? Number((wordCount / sentences.length).toFixed(1)) : 0;
  const metricCoverage = bulletPoints.length > 0
    ? clampScore((bulletPoints.filter(hasDigits).length / bulletPoints.length) * 100)
    : 0;
  const actionVerbUsage = bulletPoints.length > 0
    ? clampScore((bulletPoints.filter(countActionVerbs).length / bulletPoints.length) * 100)
    : 0;

  const notes: string[] = [];
  let score = 100;

  if (averageSentenceLength > 24) {
    score -= 18;
    notes.push("Shorten long sentences to improve recruiter readability.");
  } else if (averageSentenceLength < 10 && averageSentenceLength > 0) {
    score -= 6;
    notes.push("Add a bit more context to summary statements so they feel less abrupt.");
  }

  if (metricCoverage < 35) {
    score -= 14;
    notes.push("Add more measurable outcomes such as delivery speed, scale, or revenue impact.");
  }

  if (actionVerbUsage < 45) {
    score -= 12;
    notes.push("Lead bullets with stronger action verbs like built, optimized, or delivered.");
  }

  if (sentences.length === 0) {
    score = 35;
    notes.push("Add concise narrative content before running ATS checks for stronger results.");
  }

  return {
    score: clampScore(score),
    averageSentenceLength,
    metricCoverage,
    actionVerbUsage,
    notes: uniqueItems(notes),
  };
}

function buildSectionScores(cv: CVLike): AIATSSectionScore[] {
  const summary = normalizeText((cv.summary as Record<string, unknown> | null)?.content);
  const experiences = toRecordArray(cv.experiences);
  const projects = toRecordArray(cv.projects);
  const skills = toRecordArray(cv.skills);
  const educations = toRecordArray(cv.educations);

  const summaryScore = clampScore(
    (summary ? 40 : 0) +
    (summary.length >= 120 ? 30 : summary.length >= 70 ? 20 : summary ? 10 : 0) +
    (/(built|led|optimized|delivered|improved|scaled|automated)/i.test(summary) ? 20 : 0) +
    (hasDigits(summary) ? 10 : 0)
  );

  const experienceBullets = experiences.flatMap((item) => toStringArray(item.achievements));
  const experienceScore = clampScore(
    Math.min(experiences.length * 22, 44) +
    Math.min(experienceBullets.length * 7, 28) +
    Math.min(experiences.flatMap((item) => toStringArray(item.technologies)).length * 4, 16) +
    Math.min(experienceBullets.filter(hasDigits).length * 6, 12)
  );

  const skillCount = skills.length;
  const skillCategories = new Set(skills.map((skill) => String(skill.category ?? "OTHER"))).size;
  const skillScore = clampScore(
    Math.min(skillCount * 8, 56) +
    Math.min(skillCategories * 12, 24) +
    (skillCount >= 8 ? 20 : skillCount >= 4 ? 12 : skillCount > 0 ? 6 : 0)
  );

  const projectScore = clampScore(
    Math.min(projects.length * 24, 48) +
    Math.min(projects.flatMap((item) => toStringArray(item.highlights)).length * 8, 24) +
    Math.min(projects.flatMap((item) => toStringArray(item.technologies)).length * 4, 20) +
    (projects.some((item) => normalizeText(item.githubUrl) || normalizeText(item.url)) ? 8 : 0)
  );

  const educationScore = clampScore(
    educations.length === 0 ? 45 : Math.min(educations.length * 32, 64) + Math.min(educations.length * 12, 24) + 12
  );

  return [
    { sectionId: "summary", score: summaryScore, reason: summary ? "Summary exists but can be sharpened with clearer impact phrasing." : "Add a professional summary to frame your value quickly." },
    { sectionId: "experience", score: experienceScore, reason: experienceBullets.some(hasDigits) ? "Experience section already includes some measurable impact." : "Add quantified bullets to improve the experience narrative." },
    { sectionId: "skills", score: skillScore, reason: skillCount >= 8 ? "Skill coverage is solid and broad." : "Expand your hard-skill inventory to better match engineering roles." },
    { sectionId: "projects", score: projectScore, reason: projects.length > 0 ? "Projects strengthen your developer-first positioning." : "Add portfolio-grade projects to showcase practical engineering impact." },
    { sectionId: "education", score: educationScore, reason: educations.length > 0 ? "Education section is present and provides baseline credibility." : "Education is optional, but adding it can help with ATS completeness." },
  ];
}

function extractKeywordCandidates(jobDescription: string): string[] {
  const normalized = jobDescription.toLocaleLowerCase();
  const matches = normalized.match(/[a-z0-9.+#/-]{3,}/g) ?? [];
  const counts = new Map<string, number>();

  for (const match of matches) {
    if (STOP_WORDS.has(match)) continue;
    counts.set(match, (counts.get(match) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)
    .map(([keyword]) => keyword)
    .slice(0, 12);
}

function prettifySkill(value: string): string {
  const lower = value.toLocaleLowerCase();
  const special = {
    "node.js": "Node.js",
    "next.js": "Next.js",
    "ci/cd": "CI/CD",
    "c#": "C#",
    aws: "AWS",
    gcp: "GCP",
    sql: "SQL",
  } as const;

  if (lower in special) {
    return special[lower as keyof typeof special];
  }

  return value
    .split(/[\s/-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractHardSkillCandidates(jobDescription: string): string[] {
  const normalized = jobDescription.toLocaleLowerCase();
  return uniqueItems(
    HARD_SKILL_TERMS.filter((term) => normalized.includes(term)).map(prettifySkill),
    10
  );
}

function buildFixChecklist(
  sectionScores: AIATSSectionScore[],
  readability: AIRecruiterReadabilityMetrics,
  keywordGaps: string[],
  hardSkillGaps: string[]
): AIATSFixChecklistItem[] {
  const items: AIATSFixChecklistItem[] = [];

  for (const section of sectionScores.filter((entry) => entry.score < 70)) {
    items.push({
      id: `${section.sectionId}-boost`,
      label: `Improve the ${section.sectionId} section`,
      reason: section.reason,
      priority: section.score < 50 ? "high" : "medium",
      sectionId: section.sectionId,
    });
  }

  if (keywordGaps.length > 0) {
    items.push({
      id: "keyword-gap-review",
      label: "Add missing role keywords from the target job description",
      reason: `Top gaps: ${keywordGaps.slice(0, 3).join(", ")}`,
      priority: "high",
      sectionId: "summary",
    });
  }

  if (hardSkillGaps.length > 0) {
    items.push({
      id: "hard-skill-gap-review",
      label: "Close missing hard-skill gaps",
      reason: `Missing hard skills: ${hardSkillGaps.slice(0, 3).join(", ")}`,
      priority: "high",
      sectionId: "skills",
    });
  }

  if (readability.metricCoverage < 35) {
    items.push({
      id: "metrics-upgrade",
      label: "Quantify more bullets with measurable outcomes",
      reason: "Recruiters respond better when bullets include scale, speed, revenue, or reliability metrics.",
      priority: "medium",
      sectionId: "experience",
    });
  }

  if (readability.averageSentenceLength > 24) {
    items.push({
      id: "sentence-length-reduction",
      label: "Shorten long sentences",
      reason: "Long sentences reduce skim-readability for recruiters and ATS screeners.",
      priority: "medium",
    });
  }

  if (readability.actionVerbUsage < 45) {
    items.push({
      id: "action-verb-upgrade",
      label: "Rewrite bullets with stronger action verbs",
      reason: "Use verbs like built, optimized, automated, or led for more executive clarity.",
      priority: "medium",
      sectionId: "experience",
    });
  }

  return items.slice(0, 8);
}

export function buildAtsAnalysis(
  cv: CVLike,
  baseResult: Pick<AIATSResult, "score" | "issues" | "suggestions">,
  jobDescription?: string
): AIATSResult {
  const sectionScores = buildSectionScores(cv);
  const readability = buildReadability(cv);
  const cvCorpus = collectCorpus(cv);
  const keywordCandidates = jobDescription ? extractKeywordCandidates(jobDescription) : [];
  const hardSkillCandidates = jobDescription ? extractHardSkillCandidates(jobDescription) : [];
  const keywordGaps = keywordCandidates.filter((keyword) => !cvCorpus.includes(keyword)).slice(0, 8).map(prettifySkill);
  const hardSkillGaps = hardSkillCandidates.filter((skill) => !cvCorpus.includes(skill.toLocaleLowerCase())).slice(0, 8);

  const sectionAverage = sectionScores.reduce((total, section) => total + section.score, 0) / Math.max(sectionScores.length, 1);
  const gapPenalty = keywordGaps.length * 3 + hardSkillGaps.length * 4;
  const computedScore = clampScore(sectionAverage * 0.65 + readability.score * 0.35 - gapPenalty);
  const score = clampScore(baseResult.score > 0 ? (baseResult.score + computedScore) / 2 : computedScore);

  const derivedIssues = [
    ...sectionScores.filter((section) => section.score < 60).map((section) => `${section.sectionId} is underdeveloped for ATS screening.`),
    ...(keywordGaps.length > 0 ? [`Missing target-role keywords: ${keywordGaps.slice(0, 4).join(", ")}.`] : []),
    ...(hardSkillGaps.length > 0 ? [`Missing hard skills: ${hardSkillGaps.slice(0, 4).join(", ")}.`] : []),
  ];

  const derivedSuggestions = [
    ...sectionScores.filter((section) => section.score < 70).map((section) => `Improve ${section.sectionId} with more concrete impact and specificity.`),
    ...readability.notes,
  ];

  return {
    score,
    issues: uniqueItems([...(baseResult.issues ?? []), ...derivedIssues], 10),
    suggestions: uniqueItems([...(baseResult.suggestions ?? []), ...derivedSuggestions], 10),
    keywordGaps,
    hardSkillGaps,
    sectionScores,
    recruiterReadability: readability,
    fixChecklist: buildFixChecklist(sectionScores, readability, keywordGaps, hardSkillGaps),
  };
}