import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { CVDetail } from "@/services/cv.api";
import { useSectionMutation } from "@/hooks/useCV";
import { Plus, Trash2 } from "lucide-react";

const createSchema = (t: TFunction) => z.object({
  degree: z.string().min(1, t("common.required")),
  fieldOfStudy: z.string().min(1, t("common.required")),
  institution: z.string().min(1, t("common.required")),
  location: z.string().default(""),
  startDate: z.string().min(1, t("common.required")),
  endDate: z.string().nullable().default(null),
  gpa: z.string().nullable().default(null),
  relevantCoursework: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  orderIndex: z.number().default(0),
});

type FormData = z.infer<ReturnType<typeof createSchema>>;

export function EducationSection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const { addEducation, updateEducation, removeEducation } = useSectionMutation(cv.id);

  const educations = cv.educations as (FormData & { id: string })[];

  return (
    <div className="space-y-4">
      {educations.map((edu) => (
        <div key={edu.id} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{edu.degree}</h4>
              <p className="text-sm text-muted-foreground">{edu.fieldOfStudy}</p>
              <p className="text-sm text-muted-foreground">{edu.institution}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditingId(editingId === edu.id ? null : edu.id)} className="rounded px-2 py-1 text-xs hover:bg-accent">
                {editingId === edu.id ? t("common.close") : t("common.edit")}
              </button>
              <button onClick={() => removeEducation.mutate(edu.id)} className="rounded p-1 text-destructive hover:bg-destructive/10">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          {editingId === edu.id && (
            <EducationForm
              defaults={edu}
              onSubmit={(data) => {
                updateEducation.mutate({ id: edu.id, data: data as Record<string, unknown> });
                setEditingId(null);
              }}
            />
          )}
        </div>
      ))}

      {isAdding ? (
        <div className="rounded-lg border p-4">
          <EducationForm
            defaults={{ orderIndex: educations.length } as FormData}
            onSubmit={(data) => {
              addEducation.mutate(data as Record<string, unknown>);
              setIsAdding(false);
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      ) : (
        <button onClick={() => setIsAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm text-muted-foreground hover:bg-accent">
          <Plus size={16} /> {t("editorSections.education.add")}
        </button>
      )}
    </div>
  );
}

function EducationForm({ defaults, onSubmit, onCancel }: { defaults: Partial<FormData>; onSubmit: (d: FormData) => void; onCancel?: () => void }) {
  const { t } = useTranslation();
  const formId = useId();
  const schema = createSchema(t);
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { degree: "", fieldOfStudy: "", institution: "", location: "", startDate: "", endDate: null, gpa: null, relevantCoursework: [], achievements: [], orderIndex: 0, ...defaults } });
  const degreeId = `${formId}-degree`;
  const fieldOfStudyId = `${formId}-field-of-study`;
  const institutionId = `${formId}-institution`;
  const startDateId = `${formId}-start-date`;
  const endDateId = `${formId}-end-date`;
  const gpaId = `${formId}-gpa`;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor={degreeId} className="mb-1 block text-xs font-medium">{t("editorSections.education.degree")}</label><input id={degreeId} {...form.register("degree")} className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
        <div><label htmlFor={fieldOfStudyId} className="mb-1 block text-xs font-medium">{t("editorSections.education.fieldOfStudy")}</label><input id={fieldOfStudyId} {...form.register("fieldOfStudy")} className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
      </div>
      <div><label htmlFor={institutionId} className="mb-1 block text-xs font-medium">{t("editorSections.education.institution")}</label><input id={institutionId} {...form.register("institution")} className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><label htmlFor={startDateId} className="mb-1 block text-xs font-medium">{t("editorSections.education.start")}</label><input id={startDateId} {...form.register("startDate")} type="month" className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
        <div><label htmlFor={endDateId} className="mb-1 block text-xs font-medium">{t("editorSections.education.end")}</label><input id={endDateId} {...form.register("endDate")} type="month" className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
        <div><label htmlFor={gpaId} className="mb-1 block text-xs font-medium">{t("editorSections.education.gpa")}</label><input id={gpaId} {...form.register("gpa")} className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">{t("common.save")}</button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">{t("common.cancel")}</button>}
      </div>
    </form>
  );
}
