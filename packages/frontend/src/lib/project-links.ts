const PROJECTS_FOOTER_ENABLED_KEY = "projectsFooterEnabled";
const PROJECTS_FOOTER_URL_KEY = "projectsFooterUrl";

export { PROJECTS_FOOTER_ENABLED_KEY, PROJECTS_FOOTER_URL_KEY };

export interface ProjectsFooterSettings {
  enabled: boolean;
  url: string | null;
  displayUrl: string | null;
  shouldRender: boolean;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function formatProjectLink(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function getProjectsFooterSettings(themeConfig?: Record<string, unknown> | null): ProjectsFooterSettings {
  const enabled = themeConfig?.[PROJECTS_FOOTER_ENABLED_KEY] === true;
  const url = asText(themeConfig?.[PROJECTS_FOOTER_URL_KEY])?.replace(/\/$/, "") ?? null;

  return {
    enabled,
    url,
    displayUrl: url ? formatProjectLink(url) : null,
    shouldRender: enabled && url !== null,
  };
}