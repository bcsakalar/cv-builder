import type { CSSProperties } from "react";
import type { ThemeConfig } from "@/stores/theme.store";
import type { ProjectVisibility } from "./project-preview";
import { translateForLocale } from "@/i18n/helpers";

interface ProjectVisibilityBadgeProps {
  visibility: ProjectVisibility | null;
  theme: ThemeConfig;
  locale?: string;
  className?: string;
}

/**
 * Small themed "Public" / "Private" badge shown next to a GitHub-imported
 * project's name. Rendered identically in the live preview and the print PDF
 * (the PDF renders these same components), so the badge stays in 1:1 sync.
 */
export function ProjectVisibilityBadge({ visibility, theme, locale, className }: ProjectVisibilityBadgeProps) {
  if (!visibility) return null;

  const isPublic = visibility === "public";
  const label = translateForLocale(
    locale,
    isPublic ? "editorSections.projects.visibilityPublic" : "editorSections.projects.visibilityPrivate",
  );

  const baseColor = isPublic ? theme.primaryColor : theme.secondaryColor;
  const style: CSSProperties = {
    display: "inline-block",
    verticalAlign: "middle",
    borderRadius: "9999px",
    padding: "1px 8px",
    fontSize: "0.625rem",
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: "0.02em",
    color: baseColor,
    border: `1px solid ${baseColor}`,
    // Tint the background lightly using an 8-digit hex alpha suffix.
    backgroundColor: `${baseColor}1a`,
    whiteSpace: "nowrap",
  };

  return (
    <span className={className} style={style} data-testid={`project-visibility-${visibility}`}>
      {label}
    </span>
  );
}
