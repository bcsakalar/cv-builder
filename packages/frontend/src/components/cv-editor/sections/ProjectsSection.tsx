import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { CVDetail } from "@/services/cv.api";
import { useSectionMutation } from "@/hooks/useCV";
import { useImproveProject } from "@/hooks/useAI";
import { Plus, Trash2, ExternalLink, Github, Sparkles, Loader2, Star, GitFork, GitCommit, Calendar, ChevronDown, ChevronUp, Shield, Gauge } from "lucide-react";
import { normalizeAppLocale } from "@/i18n/locale";

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

  const ghData = project.githubRepoData as Record<string, unknown> | null;
  const projectType = typeof ghData?.projectType === "string" ? ghData.projectType : null;
  const highlights = (project.highlights ?? []) as string[];
  const dateLocale = normalizeAppLocale(i18n.language) === "tr" ? "tr-TR" : "en-US";

  // Format date for display
  const formatDate = (d: string | null) => {
    if (!d) return null;
    try {
      const date = new Date(d);
      return date.toLocaleDateString(dateLocale, { year: "numeric", month: "short" });
    } catch { return d; }
  };

  return (
    <div className={`rounded-lg border p-4 ${project.isFromGitHub ? "border-l-4 border-l-purple-500" : ""}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-base">{project.name}</h4>
            {project.isFromGitHub && (
              <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                <Github size={10} /> {t("nav.github")}
              </span>
            )}
            {project.role && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {project.role}
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

          {/* Date range */}
          {(project.startDate || project.endDate) && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar size={10} />
              {formatDate(project.startDate as string)}
              {project.endDate ? ` — ${formatDate(project.endDate as string)}` : ` — ${t("common.present")}`}
            </div>
          )}

          {/* GitHub Stats row */}
          {ghData && (
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              {(ghData.stars as number) > 0 && (
                <span className="flex items-center gap-1"><Star size={11} className="text-yellow-500" /> {ghData.stars as number}</span>
              )}
              {(ghData.forks as number) > 0 && (
                <span className="flex items-center gap-1"><GitFork size={11} /> {ghData.forks as number}</span>
              )}
              {(ghData.commitCount as number) > 0 && (
                <span className="flex items-center gap-1"><GitCommit size={11} /> {ghData.commitCount as number}</span>
              )}
              {projectType && (
                <span className="flex items-center gap-1"><Shield size={11} /> {projectType}</span>
              )}
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
                  { onSuccess: (data) => setImproved(data) }
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
      {project.description && (
        <p className="mt-2 text-sm text-foreground/80 leading-relaxed">{project.description}</p>
      )}

      {/* Technologies */}
      {project.technologies.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {project.technologies.slice(0, expanded ? undefined : 8).map((t: string) => (
            <span key={t} className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium">{t}</span>
          ))}
          {!expanded && project.technologies.length > 8 && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t("editorSections.projects.moreCount", { count: project.technologies.length - 8 })}</span>
          )}
        </div>
      )}

      {/* Expandable highlights */}
      {highlights.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {t("editorSections.projects.highlightsCount", { count: highlights.length })}
          </button>
          {expanded && (
            <ul className="mt-1.5 space-y-1 pl-4">
              {highlights.map((h, i) => (
                <li key={i} className="text-xs text-muted-foreground list-disc">{h}</li>
              ))}
            </ul>
          )}
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
