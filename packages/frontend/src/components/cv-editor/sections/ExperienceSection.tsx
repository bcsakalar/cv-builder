import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { CVDetail } from "@/services/cv.api";
import { useSectionMutation } from "@/hooks/useCV";
import { useImproveExperience } from "@/hooks/useAI";
import { Plus, Trash2, GripVertical, Sparkles, Loader2 } from "lucide-react";

const createSchema = (t: TFunction) => z.object({
  jobTitle: z.string().min(1, t("common.required")),
  company: z.string().min(1, t("common.required")),
  companyDescription: z.string().nullable().default(null),
  location: z.string().default(""),
  startDate: z.string().min(1, t("common.required")),
  endDate: z.string().nullable().default(null),
  isCurrent: z.boolean().default(false),
  description: z.string().default(""),
  achievements: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  orderIndex: z.number().default(0),
});

type FormData = z.infer<ReturnType<typeof createSchema>>;

export function ExperienceSection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const { addExperience, updateExperience, removeExperience } = useSectionMutation(cv.id);

  const experiences = cv.experiences as (FormData & { id: string })[];

  return (
    <div className="space-y-4">
      {experiences.map((exp) => (
        <div key={exp.id} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical size={16} className="text-muted-foreground cursor-grab" />
              <div>
                <h4 className="font-medium">{exp.jobTitle}</h4>
                <p className="text-sm text-muted-foreground">{exp.company} · {exp.location}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setEditingId(editingId === exp.id ? null : exp.id)}
                aria-expanded={editingId === exp.id}
                aria-controls={`${exp.id}-experience-form`}
                className="rounded-md px-2 py-1 text-xs hover:bg-accent"
              >
                {editingId === exp.id ? t("common.close") : t("common.edit")}
              </button>
              <button
                type="button"
                onClick={() => removeExperience.mutate(exp.id)}
                aria-label={t("editorSections.experience.deleteAria", { title: exp.jobTitle })}
                className="rounded-md p-1 text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          {editingId === exp.id && (
            <div id={`${exp.id}-experience-form`}>
              <ExperienceForm
                defaultValues={exp}
                onSubmit={(data) => {
                  updateExperience.mutate({ id: exp.id, data: data as Record<string, unknown> });
                  setEditingId(null);
                }}
              />
            </div>
          )}
        </div>
      ))}

      <AddExperienceForm
        orderIndex={experiences.length}
        onSubmit={(data) => addExperience.mutate(data as Record<string, unknown>)}
      />
    </div>
  );
}

function AddExperienceForm({ orderIndex, onSubmit }: { orderIndex: number; onSubmit: (data: FormData) => void }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm text-muted-foreground hover:bg-accent"
      >
        <Plus size={16} /> {t("editorSections.experience.add")}
      </button>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <ExperienceForm
        defaultValues={{ orderIndex } as FormData}
        onSubmit={(data) => {
          onSubmit(data);
          setIsOpen(false);
        }}
        onCancel={() => setIsOpen(false)}
      />
    </div>
  );
}

function ExperienceForm({
  defaultValues,
  onSubmit,
  onCancel,
}: {
  defaultValues: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const schema = createSchema(t);
  const formId = useId();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      jobTitle: "",
      company: "",
      location: "",
      startDate: "",
      endDate: null,
      isCurrent: false,
      description: "",
      achievements: [],
      technologies: [],
      orderIndex: 0,
      companyDescription: null,
      ...defaultValues,
    },
  });

  const jobTitleId = `${formId}-job-title`;
  const companyId = `${formId}-company`;
  const locationId = `${formId}-location`;
  const startDateId = `${formId}-start-date`;
  const endDateId = `${formId}-end-date`;
  const isCurrentId = `${formId}-is-current`;
  const descriptionId = `${formId}-description`;
  const isCurrent = useWatch({ control: form.control, name: "isCurrent" }) ?? false;
  const description = useWatch({ control: form.control, name: "description" }) ?? "";
  const jobTitle = useWatch({ control: form.control, name: "jobTitle" }) ?? "";
  const company = useWatch({ control: form.control, name: "company" }) ?? "";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={jobTitleId} className="mb-1 block text-xs font-medium">{t("editorSections.experience.jobTitle")}</label>
          <input id={jobTitleId} {...form.register("jobTitle")} className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor={companyId} className="mb-1 block text-xs font-medium">{t("editorSections.experience.company")}</label>
          <input id={companyId} {...form.register("company")} className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor={locationId} className="mb-1 block text-xs font-medium">{t("editorSections.experience.location")}</label>
          <input id={locationId} {...form.register("location")} className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor={startDateId} className="mb-1 block text-xs font-medium">{t("editorSections.experience.startDate")}</label>
          <input id={startDateId} {...form.register("startDate")} type="month" className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor={endDateId} className="mb-1 block text-xs font-medium">{t("editorSections.experience.endDate")}</label>
          <input
            id={endDateId}
            {...form.register("endDate")}
            type="month"
            disabled={isCurrent}
            className="w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
      </div>
      <label htmlFor={isCurrentId} className="flex items-center gap-2 text-sm">
        <input id={isCurrentId} {...form.register("isCurrent")} type="checkbox" className="rounded" />
        {t("editorSections.experience.currentlyWorking")}
      </label>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor={descriptionId} className="text-xs font-medium">{t("editorSections.experience.description")}</label>
          <ImproveButton
            description={description}
            jobTitle={jobTitle}
            company={company}
            onImproved={(text) => form.setValue("description", text)}
          />
        </div>
        <textarea id={descriptionId} {...form.register("description")} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
          {t("common.save")}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">
            {t("common.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}

function ImproveButton({
  description,
  jobTitle,
  company,
  onImproved,
}: {
  description: string;
  jobTitle: string;
  company: string;
  onImproved: (text: string) => void;
}) {
  const { t } = useTranslation();
  const improveMut = useImproveExperience();

  if (!description.trim()) return null;

  return (
    <button
      type="button"
      onClick={() =>
        improveMut.mutate(
          { description, jobTitle, company },
          { onSuccess: (data) => onImproved(data.improved) }
        )
      }
      disabled={improveMut.isPending}
      className="flex items-center gap-1 rounded border border-purple-300 px-2 py-0.5 text-xs text-purple-600 hover:bg-purple-50 disabled:opacity-50"
    >
      {improveMut.isPending ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <Sparkles size={10} />
      )}
      {t("editorSections.experience.improveWithAi")}
    </button>
  );
}
