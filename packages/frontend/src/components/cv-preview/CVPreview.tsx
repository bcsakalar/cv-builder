import type { CVDetail } from "@/services/cv.api";
import { useThemeStore } from "@/stores/theme.store";
import { useGoogleFonts } from "@/hooks/useGoogleFonts";
import { ModernTemplate } from "./templates/ModernTemplate";
import { ClassicTemplate } from "./templates/ClassicTemplate";
import { MinimalTemplate } from "./templates/MinimalTemplate";
import { CreativeTemplate } from "./templates/CreativeTemplate";
import { CorporateTemplate } from "./templates/CorporateTemplate";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface CVPreviewProps {
  cv: CVDetail;
}

const TEMPLATES = {
  modern: ModernTemplate,
  classic: ClassicTemplate,
  minimal: MinimalTemplate,
  creative: CreativeTemplate,
  corporate: CorporateTemplate,
} as const;

export function CVPreview({ cv }: CVPreviewProps) {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const activeTemplate = useThemeStore((s) => s.activeTemplate);
  const Template = TEMPLATES[activeTemplate];

  const fonts = useMemo(
    () => [theme.headingFont, theme.bodyFont].filter(Boolean),
    [theme.headingFont, theme.bodyFont],
  );
  useGoogleFonts(fonts);

  const pi = cv.personalInfo as Record<string, string> | null;
  const isEmpty =
    cv.experiences.length === 0 &&
    cv.educations.length === 0 &&
    cv.skills.length === 0 &&
    !cv.summary?.content &&
    !cv.coverLetter?.content &&
    !pi?.firstName;

  if (isEmpty) {
    return (
      <div className="mx-auto max-w-[210mm] rounded-lg border bg-card p-8 shadow-sm">
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-sm">{t("editor.emptyPreview")}</p>
        </div>
      </div>
    );
  }

  return <Template cv={cv} theme={theme} />;
}
