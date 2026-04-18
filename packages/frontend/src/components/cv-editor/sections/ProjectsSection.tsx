import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { CVDetail } from "@/services/cv.api";
import { useSectionMutation } from "@/hooks/useCV";
import { useImproveProject } from "@/hooks/useAI";
import { Plus, Trash2, ExternalLink, Github, Sparkles, Loader2, ChevronDown, ChevronUp, Gauge } from "lucide-react";
import { buildPreviewProject } from "@/components/cv-preview/project-preview";

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

  const projects = cv.projects as (FormData & { id: string })[];

  return (
    <div className="space-y-4">
      {projects.map((proj) => (
        <ProjectCard
          key={proj.id}
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

function ProjectCard({ project, onRemove }: { project: FormData & { id: string }; onRemove: () => void }) {
  const { t, i18n } = useTranslation();
  const improveMut = useImproveProject();
  const [improved, setImproved] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const allHighlights = project.highlights ?? [];
  const previewProject = buildPreviewProject(project as unknown as Record<string, unknown>, i18n.language, {
    technologyLimit: expanded ? Math.max(project.technologies.length, 8) : 8,
    highlightLimit: expanded ? Math.max(allHighlights.length, 2) : 2,
  });
  const ghData = previewProject.githubRepoData;
  const projectTypeLabel = ghData?.projectType
    ? t(`github.projectTypes.${ghData.projectType}`, { defaultValue: ghData.projectType })
    : null;
  const complexityLabel = ghData?.complexityLevel
    ? t(`github.complexity.${ghData.complexityLevel}`, { defaultValue: ghData.complexityLevel })
    : null;
  const deliverySignals = [
    ghData?.hasTypeScript ? "TypeScript" : null,
    ghData?.hasTests ? t("github.tests") : null,
    ghData?.hasCI ? "CI" : null,
    ghData?.hasDocker ? "Docker" : null,
  ].filter((signal): signal is string => Boolean(signal));
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
            {projectTypeLabel && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                {projectTypeLabel}
              </span>
            )}
            {complexityLabel && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                {complexityLabel}
              </span>
            )}
            {ghData?.qualityScore != null && (
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                (ghData.qualityScore as number) >= 70
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : (ghData.qualityScore as number) >= 40
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}>
                <Gauge size={10} /> {ghData.qualityScore as number}/100
              </span>
            )}
          </div>

          {previewProject.metaLine && (
            <p className="mt-1 text-xs text-muted-foreground">{previewProject.metaLine}</p>
          )}

          {previewProject.signalLine && (
            <p className="mt-1 text-xs font-medium text-foreground/70">{previewProject.signalLine}</p>
          )}

          {deliverySignals.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {deliverySignals.map((signal) => (
                <span key={signal} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {signal}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {project.description && (
            <button
              onClick={() =>
                improveMut.mutate(
                  { name: project.name, description: project.description, technologies: project.technologies },
                  { onSuccess: (data) => setImproved(data.improved) }
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
          <p className="text-sm">{improved}</p>
          <div className="mt-2 flex gap-2">
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
