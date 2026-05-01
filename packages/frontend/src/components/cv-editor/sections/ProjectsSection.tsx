import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { CVDetail } from "@/services/cv.api";
import { useSectionMutation, useUpdateTheme } from "@/hooks/useCV";
import { useApplyAIArtifact, useImproveProject } from "@/hooks/useAI";
import { Plus, Trash2, ExternalLink, Github, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { buildPreviewProject } from "@/components/cv-preview/project-preview";
import { useCVStore } from "@/stores/cv.store";
import {
  getProjectsFooterSettings,
  PROJECTS_FOOTER_ENABLED_KEY,
  PROJECTS_FOOTER_URL_KEY,
} from "@/lib/project-links";

const createSchema = (t: TFunction) => z.object({
  name: z.string().min(1, t("common.required")),
  description: z.string().default(""),
  role: z.string().nullable().default(null),
  technologies: z.array(z.string()).default([]),
  url: z.string().url(t("common.invalidUrl")).nullable().or(z.literal("")).transform((v) => v || null),
  githubUrl: z.string().url(t("common.invalidUrl")).nullable().or(z.literal("")).transform((v) => v || null),
  startDate: z.string().min(1, t("common.required")),
  endDate: z.string().nullable().default(null),
  highlights: z.array(z.string()).default([]),
  isFromGitHub: z.boolean().default(false),
  githubRepoData: z.record(z.unknown()).nullable().default(null),
  orderIndex: z.number().default(0),
});

type FormData = z.infer<ReturnType<typeof createSchema>>;

export function ProjectsSection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const { addProject, removeProject } = useSectionMutation(cv.id);
  const updateTheme = useUpdateTheme(cv.id);
  const setSaveStatus = useCVStore((state) => state.setSaveStatus);
  const footerSettings = getProjectsFooterSettings(cv.themeConfig);
  const footerSourceKey = `${cv.id}:${footerSettings.enabled}:${footerSettings.url ?? ""}`;
  const [footerDraft, setFooterDraft] = useState<{ sourceKey: string; enabled: boolean; url: string } | null>(null);
  const footerEnabled = footerDraft?.sourceKey === footerSourceKey ? footerDraft.enabled : footerSettings.enabled;
  const footerUrl = footerDraft?.sourceKey === footerSourceKey ? footerDraft.url : footerSettings.url ?? "";

  const projects = cv.projects as (FormData & { id: string })[];

  function persistProjectsFooter(nextEnabled: boolean, nextUrl: string) {
    const normalizedUrl = nextUrl.trim();
    setSaveStatus("saving");

    updateTheme.mutate(
      {
        ...(cv.themeConfig ?? {}),
        [PROJECTS_FOOTER_ENABLED_KEY]: nextEnabled,
        [PROJECTS_FOOTER_URL_KEY]: normalizedUrl.length > 0 ? normalizedUrl : null,
      },
      {
        onSuccess: () => setSaveStatus("saved"),
        onError: () => setSaveStatus("error"),
      }
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((proj) => (
        <ProjectCard
          key={proj.id}
          cvId={cv.id}
          project={proj}
          onRemove={() => removeProject.mutate(proj.id)}
        />
      ))}

      {isAdding ? (
        <div className="rounded-lg border p-4">
          <ProjectForm
            orderIndex={projects.length}
            onSubmit={(data) => {
              addProject.mutate(data as Record<string, unknown>);
              setIsAdding(false);
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      ) : (
        <button onClick={() => setIsAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm text-muted-foreground hover:bg-accent">
          <Plus size={16} /> {t("editorSections.projects.add")}
        </button>
      )}

      <div className="rounded-lg border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">{t("editorSections.projects.moreProjectsTitle")}</h4>
            <p className="text-xs text-muted-foreground">{t("editorSections.projects.moreProjectsDescription")}</p>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={footerEnabled}
              onChange={(event) => {
                const nextEnabled = event.target.checked;
                setFooterDraft({ sourceKey: footerSourceKey, enabled: nextEnabled, url: footerUrl });
                persistProjectsFooter(nextEnabled, footerUrl);
              }}
              className="h-4 w-4 rounded border-input"
            />
            {t("editorSections.projects.showMoreProjectsLink")}
          </label>
        </div>

        <div className="mt-3 space-y-1">
          <label htmlFor="projects-footer-url" className="block text-xs font-medium">
            {t("editorSections.projects.githubProfileUrl")}
          </label>
          <input
            id="projects-footer-url"
            type="url"
            value={footerUrl}
            disabled={!footerEnabled}
            placeholder="https://github.com/username"
            onChange={(event) => setFooterDraft({ sourceKey: footerSourceKey, enabled: footerEnabled, url: event.target.value })}
            onBlur={() => persistProjectsFooter(footerEnabled, footerUrl)}
            className="w-full rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="text-[11px] text-muted-foreground">{t("editorSections.projects.githubProfileUrlHint")}</p>
        </div>
      </div>
    </div>
  );
}

function ProjectForm({ orderIndex, onSubmit, onCancel }: { orderIndex: number; onSubmit: (d: FormData) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const schema = createSchema(t);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", role: null, technologies: [], url: null, githubUrl: null, startDate: "", endDate: null, highlights: [], isFromGitHub: false, githubRepoData: null, orderIndex },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div><label className="mb-1 block text-xs font-medium">{t("editorSections.projects.name")}</label><input {...form.register("name")} className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
      <div><label className="mb-1 block text-xs font-medium">{t("editorSections.projects.description")}</label><textarea {...form.register("description")} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="mb-1 block text-xs font-medium">{t("editorSections.projects.startDate")}</label><input {...form.register("startDate")} type="month" className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
        <div><label className="mb-1 block text-xs font-medium">{t("editorSections.projects.url")}</label><input {...form.register("url")} type="url" className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">{t("common.add")}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">{t("common.cancel")}</button>
      </div>
    </form>
  );
}

function ProjectCard({ cvId, project, onRemove }: { cvId: string; project: FormData & { id: string }; onRemove: () => void }) {
  const { t, i18n } = useTranslation();
  const improveMut = useImproveProject();
  const applyArtifact = useApplyAIArtifact();
  const [improved, setImproved] = useState<{ text: string; artifactId: string } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const allHighlights = project.highlights ?? [];
  const previewProject = buildPreviewProject(project as unknown as Record<string, unknown>, i18n.language, {
    technologyLimit: expanded ? Math.max(project.technologies.length, 8) : 8,
    highlightLimit: expanded ? Math.max(allHighlights.length, 2) : 2,
  });
  const hasHiddenHighlights = allHighlights.length > previewProject.highlights.length;

  return (
    <div className={`rounded-lg border p-4 ${project.isFromGitHub ? "border-l-4 border-l-purple-500" : ""}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-base">{previewProject.name}</h4>
            {project.isFromGitHub && (
              <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                <Github size={10} /> {t("nav.github")}
              </span>
            )}
          </div>

          {previewProject.metaLine && (
            <p className="mt-1 text-xs text-muted-foreground">{previewProject.metaLine}</p>
          )}

        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {project.description && (
            <button
              onClick={() =>
                improveMut.mutate(
                  { cvId, projectId: project.id, name: project.name, description: project.description, technologies: project.technologies },
                  { onSuccess: (data) => setImproved({ text: data.improved, artifactId: data.artifact.id }) }
                )
              }
              disabled={improveMut.isPending}
              className="rounded p-1.5 text-purple-600 hover:bg-purple-50 disabled:opacity-50 dark:hover:bg-purple-950"
              title={t("editorSections.projects.improveWithAi")}
            >
              {improveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            </button>
          )}
          {project.githubUrl && (
            <a href={project.githubUrl as string} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 hover:bg-accent" title={t("editorSections.projects.viewOnGithub")}>
              <Github size={14} />
            </a>
          )}
          {project.url && project.url !== project.githubUrl && (
            <a href={project.url as string} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 hover:bg-accent" title={t("editorSections.projects.visitProject")}>
              <ExternalLink size={14} />
            </a>
          )}
          <button onClick={onRemove} className="rounded p-1.5 text-destructive hover:bg-destructive/10" title={t("common.remove")}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Description */}
      {previewProject.description && (
        <p className="mt-2 text-sm text-foreground/80 leading-relaxed">{previewProject.description}</p>
      )}

      {/* Highlights */}
      {previewProject.highlights.length > 0 && (
        <ul className="mt-2.5 space-y-1 pl-4">
          {previewProject.highlights.map((highlight, index) => (
            <li key={`${highlight}-${index}`} className="list-disc text-xs text-muted-foreground">
              {highlight}
            </li>
          ))}
        </ul>
      )}

      {previewProject.repositoryUrl && previewProject.signalLine && (
        <a
          href={previewProject.repositoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Github size={12} />
          {t("editorSections.projects.repositoryLinkLabel")}: {previewProject.signalLine}
        </a>
      )}

      {/* Technologies */}
      {previewProject.technologies.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {previewProject.technologies.map((technology) => (
            <span key={technology} className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium">{technology}</span>
          ))}
          {previewProject.extraTechnologyCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {t("editorSections.projects.moreCount", { count: previewProject.extraTechnologyCount })}
            </button>
          )}
        </div>
      )}

      {/* Expand hidden highlights */}
      {hasHiddenHighlights && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {t("editorSections.projects.highlightsCount", { count: allHighlights.length })}
          </button>
        </div>
      )}

      {/* AI improved description */}
      {improved && (
        <div className="mt-3 rounded border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-800 dark:bg-purple-950/50">
          <p className="mb-2 text-xs font-medium text-purple-700 dark:text-purple-300">{t("editorSections.projects.improvedDescription")}</p>
          <p className="text-sm">{improved.text}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() =>
                applyArtifact.mutate(improved.artifactId, {
                  onSuccess: () => setImproved(null),
                })
              }
              disabled={applyArtifact.isPending}
              className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
            >
              {applyArtifact.isPending ? t("editorSections.projects.applyingImprovement") : t("editorSections.projects.applyImprovement")}
            </button>
            <button
              onClick={() => setImproved(null)}
              className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              {t("common.dismiss")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
