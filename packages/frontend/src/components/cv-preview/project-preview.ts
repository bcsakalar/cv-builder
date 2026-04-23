import type { GitHubRepoData } from "@cvbuilder/shared";
import { formatPreviewDateRange } from "./date-range";

interface BuildPreviewProjectOptions {
  technologyLimit?: number;
  highlightLimit?: number;
}

export interface PreviewProjectViewModel {
  name: string;
  description: string | null;
  metaLine: string | null;
  signalLine: string | null;
  technologies: string[];
  extraTechnologyCount: number;
  highlights: string[];
  githubRepoData: GitHubRepoData | null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function asGitHubRepoData(value: unknown): GitHubRepoData | null {
  return value && typeof value === "object" ? (value as GitHubRepoData) : null;
}

function joinParts(parts: Array<string | null | undefined>): string | null {
  const filtered = parts.filter((part): part is string => typeof part === "string" && part.length > 0);
  return filtered.length > 0 ? filtered.join(" · ") : null;
}

export function buildPreviewProject(
  project: Record<string, unknown>,
  locale?: string,
  options: BuildPreviewProjectOptions = {}
): PreviewProjectViewModel {
  const technologyLimit = options.technologyLimit ?? 8;
  const highlightLimit = options.highlightLimit ?? 4;
  const githubRepoData = asGitHubRepoData(project.githubRepoData);
  const technologies = asStringArray(project.technologies);
  const highlights = asStringArray(project.highlights).slice(0, highlightLimit);
  const isFromGitHub = project.isFromGitHub === true;
  const dateRange = formatPreviewDateRange(project.startDate, project.endDate, false, locale);

  return {
    name: asText(project.name) ?? "",
    description: asText(project.description),
    metaLine: joinParts([asText(project.role), isFromGitHub ? null : (dateRange || null)]),
    signalLine: null,
    technologies: technologies.slice(0, technologyLimit),
    extraTechnologyCount: Math.max(0, technologies.length - technologyLimit),
    highlights,
    githubRepoData,
  };
}