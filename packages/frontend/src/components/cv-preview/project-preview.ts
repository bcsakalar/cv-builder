import type { GitHubRepoData } from "@cvbuilder/shared";
import { formatPreviewDateRange } from "./date-range";
import { formatProjectLink } from "@/lib/project-links";

interface BuildPreviewProjectOptions {
  technologyLimit?: number;
  highlightLimit?: number;
}

export interface PreviewProjectViewModel {
  name: string;
  description: string | null;
  metaLine: string | null;
  signalLine: string | null;
  repositoryUrl: string | null;
  repositoryDisplayUrl: string | null;
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

function resolveProjectDescription(
  description: string | null,
  githubRepoData: GitHubRepoData | null,
  isFromGitHub: boolean
): string | null {
  if (!isFromGitHub) {
    return description;
  }

  const fullGitHubDescription = asText(githubRepoData?.cvReadyDescription) ?? asText(githubRepoData?.projectSummary);
  if (!fullGitHubDescription) {
    return description;
  }

  if (!description) {
    return fullGitHubDescription;
  }

  return /(?:…|\.\.\.)$/.test(description) ? fullGitHubDescription : description;
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
  const repositoryUrl = isFromGitHub ? (asText(project.githubUrl) ?? asText(project.url)) : null;
  const visibleTechnologies = isFromGitHub ? [] : technologies;
  const description = resolveProjectDescription(asText(project.description), githubRepoData, isFromGitHub);

  return {
    name: asText(project.name) ?? "",
    description,
    metaLine: joinParts([asText(project.role), isFromGitHub ? null : (dateRange || null)]),
    signalLine: repositoryUrl ? formatProjectLink(repositoryUrl) : null,
    repositoryUrl,
    repositoryDisplayUrl: repositoryUrl ? formatProjectLink(repositoryUrl) : null,
    technologies: visibleTechnologies.slice(0, technologyLimit),
    extraTechnologyCount: Math.max(0, visibleTechnologies.length - technologyLimit),
    highlights,
    githubRepoData,
  };
}