import type { CandidateLinkType } from "@cvbuilder/shared";

const SKILL_LEXICON = [
  "typescript",
  "javascript",
  "node.js",
  "nodejs",
  "node",
  "react",
  "react.js",
  "reactjs",
  "next.js",
  "nextjs",
  "next",
  "vue",
  "angular",
  "svelte",
  "express",
  "nestjs",
  "fastify",
  "graphql",
  "rest api",
  "restful api",
  "rest",
  "postgresql",
  "postgres",
  "mysql",
  "mongodb",
  "redis",
  "prisma",
  "docker",
  "kubernetes",
  "aws",
  "azure",
  "gcp",
  "terraform",
  "ci/cd",
  "cicd",
  "continuous integration",
  "github actions",
  "playwright",
  "vitest",
  "jest",
  "cypress",
  "python",
  "java",
  "go",
  "rust",
  "c#",
  "tailwind",
  "tailwind css",
  "css",
  "html",
  "sql",
  "machine learning",
  "data analysis",
  "react native",
  "flutter",
  "php",
  "laravel",
  "django",
  "flask",
  "fastapi",
  "linux",
  "zustand",
  "tanstack query",
  "tanstack router",
  "bullmq",
  "ollama",
  "llm",
] as const;

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g;
const URL_REGEX = /(?:(?:https?:\/\/)|(?:www\.))[\w.-]+(?:\.[\w.-]+)+(?:[/?#][^\s<>()"']*)?/gi;
const YEAR_RANGE_REGEX = /(19\d{2}|20\d{2})\s*[-–]\s*(present|current|19\d{2}|20\d{2})/gi;
const EXPLICIT_YEARS_REGEX = /(\d{1,2})\+?\s+years?/gi;
const NAME_PATTERN = /^[\p{L}][\p{L}'’.-]+(?:\s+[\p{L}][\p{L}'’.-]+){1,3}$/u;

export interface ParsedCandidateLink {
  url: string;
  normalizedUrl: string;
  host: string;
  linkType: CandidateLinkType;
}

export interface ParsedCandidateProfile {
  fullName: string | null;
  headline: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  yearsOfExperience: number | null;
  summary: string | null;
  topSkills: string[];
  completenessScore: number;
  missingFields: string[];
  rawTextSnippet: string;
  links: ParsedCandidateLink[];
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\u0000/g, " ").replace(/\s+/g, " ").trim();
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function normalizeUrl(value: string): string | null {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function inferLinkType(host: string): CandidateLinkType {
  const lower = host.toLowerCase();
  if (lower.includes("github.com")) return "GITHUB";
  if (lower.includes("linkedin.com")) return "LINKEDIN";
  if (lower.includes("behance.net") || lower.includes("dribbble.com") || lower.includes("medium.com") || lower.includes("notion.site")) {
    return "PORTFOLIO";
  }
  return "OTHER";
}

function extractNonEmptyLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
}

function pickFullName(lines: string[]): string | null {
  for (const line of lines.slice(0, 8)) {
    if (line.length < 4 || line.length > 60) continue;
    if (line.includes("@") || line.includes("http") || /\d/.test(line)) continue;
    if (NAME_PATTERN.test(line)) {
      return line;
    }
  }

  return null;
}

function pickHeadline(lines: string[], fullName: string | null): string | null {
  for (const line of lines.slice(0, 12)) {
    if (line === fullName) continue;
    if (line.length < 6 || line.length > 90) continue;
    if (line.includes("@") || line.includes("http")) continue;
    if (/curriculum vitae|resume|cv/i.test(line)) continue;
    return line;
  }

  return null;
}

function pickLocation(lines: string[]): string | null {
  for (const line of lines.slice(0, 12)) {
    if (line.includes("@") || line.includes("http") || /\d{4,}/.test(line)) continue;
    if (line.includes(",") && line.length <= 80) {
      return line;
    }
  }

  return null;
}

function extractTopSkills(text: string): string[] {
  const normalized = text.toLowerCase();

  return unique(
    SKILL_LEXICON.filter((skill) => normalized.includes(skill)).map((skill) => {
      if (skill === "typescript") return "TypeScript";
      if (skill === "javascript") return "JavaScript";
      if (skill === "node.js" || skill === "nodejs" || skill === "node") return "Node.js";
      if (skill === "react.js" || skill === "reactjs" || skill === "react") return "React";
      if (skill === "next.js" || skill === "nextjs" || skill === "next") return "Next.js";
      if (skill === "ci/cd" || skill === "cicd" || skill === "continuous integration") return "CI/CD";
      if (skill === "c#") return "C#";
      if (skill === "aws") return "AWS";
      if (skill === "gcp") return "GCP";
      if (skill === "postgresql" || skill === "postgres") return "PostgreSQL";
      if (skill === "sql") return "SQL";
      if (skill === "github actions") return "GitHub Actions";
      if (skill === "rest api" || skill === "restful api" || skill === "rest") return "REST API";
      if (skill === "tailwind" || skill === "tailwind css") return "Tailwind CSS";
      if (skill === "llm") return "LLM";
      return skill
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    })
  )
    .slice(0, 16);
}

function extractSummary(lines: string[], fullName: string | null, headline: string | null): string | null {
  const summaryLines = lines
    .filter((line) => line !== fullName && line !== headline)
    .filter((line) => !line.includes("@") && !line.includes("http"))
    .slice(0, 8);

  if (summaryLines.length === 0) {
    return null;
  }

  const summary = normalizeWhitespace(summaryLines.join(" "));
  return summary.length > 450 ? `${summary.slice(0, 447).trim()}...` : summary;
}

function extractYearsOfExperience(text: string): number | null {
  const explicitMatches = [...text.matchAll(EXPLICIT_YEARS_REGEX)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));

  if (explicitMatches.length > 0) {
    return Math.max(...explicitMatches);
  }

  const ranges = [...text.matchAll(YEAR_RANGE_REGEX)];
  if (ranges.length === 0) {
    return null;
  }

  const now = new Date().getFullYear();
  const total = ranges.reduce((sum, match) => {
    const start = Number(match[1]);
    const rawEnd = (match[2] ?? "").toLowerCase();
    const end = rawEnd === "present" || rawEnd === "current" ? now : Number(rawEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      return sum;
    }
    return sum + Math.min(15, end - start);
  }, 0);

  return total > 0 ? total : null;
}

function buildCompleteness(input: {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  headline: string | null;
  summary: string | null;
  topSkills: string[];
  links: ParsedCandidateLink[];
  rawTextSnippet: string;
}): { score: number; missingFields: string[] } {
  const missingFields: string[] = [];
  let score = 0;

  if (input.fullName) score += 20;
  else missingFields.push("fullName");

  if (input.email) score += 20;
  else missingFields.push("email");

  if (input.phone) score += 15;
  else missingFields.push("phone");

  if (input.headline) score += 10;
  else missingFields.push("headline");

  if (input.summary && input.summary.length >= 80) score += 15;
  else missingFields.push("summary");

  if (input.topSkills.length >= 4) score += 15;
  else missingFields.push("skills");

  if (input.links.length > 0) score += 5;
  else missingFields.push("links");

  if (input.rawTextSnippet.length >= 500) score += 10;
  else missingFields.push("contentDepth");

  return { score: Math.min(100, score), missingFields };
}

export function parseCandidateFromText(text: string): ParsedCandidateProfile {
  const cleanedText = text.replace(/\t/g, " ").trim();
  const lines = extractNonEmptyLines(cleanedText);
  const fullName = pickFullName(lines);
  const headline = pickHeadline(lines, fullName);
  const location = pickLocation(lines);
  const emails = unique((cleanedText.match(EMAIL_REGEX) ?? []).map((value) => value.trim().toLowerCase()));
  const phones = unique((cleanedText.match(PHONE_REGEX) ?? []).map((value) => normalizeWhitespace(value)).filter((value) => value.length >= 8));
  const rawLinks = unique(cleanedText.match(URL_REGEX) ?? []);
  const links: ParsedCandidateLink[] = rawLinks
    .map((value) => normalizeUrl(value))
    .filter((value): value is string => value !== null)
    .map((value) => {
      const url = new URL(value);
      return {
        url: value,
        normalizedUrl: value,
        host: url.hostname,
        linkType: inferLinkType(url.hostname),
      };
    })
    .slice(0, 8);
  const topSkills = extractTopSkills(cleanedText);
  const summary = extractSummary(lines, fullName, headline);
  const rawTextSnippet = cleanedText.length > 5000 ? `${cleanedText.slice(0, 4997).trim()}...` : cleanedText;
  const yearsOfExperience = extractYearsOfExperience(cleanedText.toLowerCase());
  const completeness = buildCompleteness({
    fullName,
    email: emails[0] ?? null,
    phone: phones[0] ?? null,
    headline,
    summary,
    topSkills,
    links,
    rawTextSnippet,
  });

  return {
    fullName,
    headline,
    email: emails[0] ?? null,
    phone: phones[0] ?? null,
    location,
    yearsOfExperience,
    summary,
    topSkills,
    completenessScore: completeness.score,
    missingFields: completeness.missingFields,
    rawTextSnippet,
    links,
  };
}
