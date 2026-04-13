import { useEffect, useState } from "react";
import { CV_SECTIONS } from "@cvbuilder/shared";
import { useCVStore } from "@/stores/cv.store";
import type { CVDetail } from "@/services/cv.api";
import { PersonalInfoSection } from "./sections/PersonalInfoSection";
import { SummarySection } from "./sections/SummarySection";
import { ExperienceSection } from "./sections/ExperienceSection";
import { EducationSection } from "./sections/EducationSection";
import { SkillsSection } from "./sections/SkillsSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { CertificationsSection } from "./sections/CertificationsSection";
import { LanguagesSection } from "./sections/LanguagesSection";
import { VolunteeringSection } from "./sections/VolunteeringSection";
import { PublicationsSection } from "./sections/PublicationsSection";
import { AwardsSection } from "./sections/AwardsSection";
import { ReferencesSection } from "./sections/ReferencesSection";
import { HobbiesSection } from "./sections/HobbiesSection";
import { CustomSectionEditor } from "./sections/CustomSectionEditor";
import { CVPreview } from "../cv-preview/CVPreview";
import { ThemeCustomizer } from "../theme/ThemeCustomizer";
import { PDFExportPanel } from "../pdf/PDFExportPanel";
import { AIAssistPanel } from "./AIAssistPanel";
import { ChevronRight, Palette, FileDown, Sparkles } from "lucide-react";
import { resolveTemplatePreview, useThemeStore } from "@/stores/theme.store";
import { useTemplates } from "@/hooks/useTemplates";
import { useUpdateCV } from "@/hooks/useCV";
import { useTranslation } from "react-i18next";
import { getSectionLabel, getTemplateName } from "@/i18n/helpers";

interface CVEditorLayoutProps {
  cv: CVDetail;
}

export function CVEditorLayout({ cv }: CVEditorLayoutProps) {
  const { t } = useTranslation();
  const activeSection = useCVStore((s) => s.activeSection);
  const setActiveSection = useCVStore((s) => s.setActiveSection);
  const saveStatus = useCVStore((s) => s.saveStatus);
  const [showPreview, setShowPreview] = useState(true);
  const [showTheme, setShowTheme] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(cv.templateId);
  const replaceTheme = useThemeStore((s) => s.replaceTheme);
  const setActiveTemplate = useThemeStore((s) => s.setActiveTemplate);
  const { data: templates = [] } = useTemplates();
  const updateCV = useUpdateCV(cv.id);

  const sectionOrder = (cv.sectionOrder as string[]) || Object.keys(CV_SECTIONS);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? cv.template;

  useEffect(() => {
    replaceTheme(cv.themeConfig);
    setActiveTemplate(resolveTemplatePreview(cv.template.slug));
  }, [cv.template.slug, cv.themeConfig, replaceTheme, setActiveTemplate]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);

    const nextTemplate = templates.find((template) => template.id === templateId);
    if (!nextTemplate) return;

    setActiveTemplate(resolveTemplatePreview(nextTemplate.slug));

    if (templateId !== cv.templateId) {
      updateCV.mutate(
        { templateId },
        {
          onError: () => {
            setSelectedTemplateId(cv.templateId);
            setActiveTemplate(resolveTemplatePreview(cv.template.slug));
          },
        }
      );
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Section nav */}
      <nav className="w-52 shrink-0 overflow-y-auto border-r bg-card p-2">
        {sectionOrder.map((key) => {
          const section = CV_SECTIONS[key];
          if (!section) return null;
          return (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                activeSection === key
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground"
              }`}
            >
              <ChevronRight size={14} />
              {getSectionLabel(key)}
            </button>
          );
        })}
      </nav>

      {/* Editor pane */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {getSectionLabel(activeSection)}
            </h2>
            <span className="text-xs text-muted-foreground">
              {saveStatus === "saving" && t("editor.saveStatus.saving")}
              {saveStatus === "saved" && `✓ ${t("editor.saveStatus.saved")}`}
              {saveStatus === "error" && `⚠ ${t("editor.saveStatus.error")}`}
            </span>
          </div>
          <SectionEditor section={activeSection} cv={cv} />
        </div>
      </div>

      {/* Preview pane */}
      {showPreview && (
        <div className="w-[45%] shrink-0 overflow-y-auto border-l bg-gray-50">
          {/* Template selector toolbar */}
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white/90 px-4 py-2 backdrop-blur-sm">
            <select
              data-testid="editor-template-select"
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="rounded border px-2 py-1 text-xs"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{getTemplateName(template.slug, template.name)}</option>
              ))}
            </select>
            <button
              type="button"
              data-testid="editor-theme-toggle"
              onClick={() => setShowTheme(!showTheme)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${showTheme ? "bg-primary text-white" : "border hover:bg-accent"}`}
            >
              <Palette size={12} /> {t("editor.theme")}
            </button>
            <button
              type="button"
              data-testid="editor-pdf-toggle"
              onClick={() => setShowPDF(!showPDF)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${showPDF ? "bg-primary text-white" : "border hover:bg-accent"}`}
            >
              <FileDown size={12} /> {t("editor.pdf")}
            </button>
            <button
              type="button"
              data-testid="editor-ai-toggle"
              onClick={() => setShowAI(!showAI)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${showAI ? "bg-purple-600 text-white" : "border hover:bg-accent"}`}
            >
              <Sparkles size={12} /> {t("editor.ai")}
            </button>
          </div>
          {showTheme && (
            <div className="border-b bg-white p-4">
              <ThemeCustomizer cvId={cv.id} defaultThemeConfig={selectedTemplate.defaultThemeConfig} />
            </div>
          )}
          {showPDF && (
            <div className="border-b bg-white p-4">
              <PDFExportPanel cvId={cv.id} />
            </div>
          )}
          {showAI && (
            <div className="border-b bg-white p-4">
              <AIAssistPanel cvId={cv.id} />
            </div>
          )}
          <div className="p-4">
            <CVPreview cv={cv} />
          </div>
        </div>
      )}

      {/* Toggle preview */}
      <button
        type="button"
        onClick={() => setShowPreview(!showPreview)}
        className="absolute right-2 top-20 z-10 rounded-md border bg-card px-2 py-1 text-xs shadow"
      >
        {showPreview ? t("editor.hidePreview") : t("editor.showPreview")} {t("editor.preview")}
      </button>
    </div>
  );
}

function SectionEditor({ section, cv }: { section: string; cv: CVDetail }) {
  const { t } = useTranslation();

  switch (section) {
    case "personalInfo":
    case "socialLinks":
      return <PersonalInfoSection cv={cv} />;
    case "summary":
      return <SummarySection cv={cv} />;
    case "experience":
      return <ExperienceSection cv={cv} />;
    case "education":
      return <EducationSection cv={cv} />;
    case "skills":
      return <SkillsSection cv={cv} />;
    case "projects":
      return <ProjectsSection cv={cv} />;
    case "certifications":
      return <CertificationsSection cv={cv} />;
    case "languages":
      return <LanguagesSection cv={cv} />;
    case "volunteering":
      return <VolunteeringSection cv={cv} />;
    case "publications":
      return <PublicationsSection cv={cv} />;
    case "awards":
      return <AwardsSection cv={cv} />;
    case "references":
      return <ReferencesSection cv={cv} />;
    case "hobbies":
      return <HobbiesSection cv={cv} />;
    case "customSection":
      return <CustomSectionEditor cv={cv} />;
    default:
      return (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>{t("editor.comingSoon", { section: getSectionLabel(section) })}</p>
        </div>
      );
  }
}
