import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useSectionMutation } from "@/hooks/useCV";
import type { CVDetail } from "@/services/cv.api";
import { Trash2, Plus } from "lucide-react";

const createVolunteerSchema = (t: TFunction) => z.object({
  organization: z.string().min(1, t("common.required")),
  role: z.string().min(1, t("common.required")),
  startDate: z.string().min(1, t("common.required")),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().optional(),
});

type VolunteerForm = z.infer<ReturnType<typeof createVolunteerSchema>>;

export function VolunteeringSection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const { volunteer } = useSectionMutation(cv.id);
  const volunteerSchema = createVolunteerSchema(t);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VolunteerForm>({ resolver: zodResolver(volunteerSchema) });

  const onAdd = (data: VolunteerForm) => {
    volunteer.add.mutate(data, { onSuccess: () => reset() });
  };

  return (
    <div className="space-y-4">
      {cv.volunteerExperiences.map((vol: Record<string, unknown>) => (
        <div key={String(vol.id)} className="rounded-lg border p-4">
          <div className="flex justify-between">
            <div>
              <p className="font-medium">{String(vol.role)}</p>
              <p className="text-sm text-muted-foreground">{String(vol.organization)}</p>
              <p className="text-xs text-muted-foreground">
                {String(vol.startDate)} – {vol.isCurrent ? t("common.present") : String(vol.endDate)}
              </p>
            </div>
            <button
              onClick={() => volunteer.remove.mutate(String(vol.id))}
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 size={16} />
            </button>
          </div>
          {!!vol.description && (
            <p className="mt-2 text-sm whitespace-pre-line">{String(vol.description)}</p>
          )}
        </div>
      ))}

      <form onSubmit={handleSubmit(onAdd)} className="space-y-3 rounded-lg border border-dashed p-4">
        <h4 className="text-sm font-medium flex items-center gap-1">
          <Plus size={14} /> {t("editorSections.volunteering.add")}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input {...register("organization")} placeholder={t("editorSections.volunteering.organization")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.organization && <p className="text-xs text-destructive mt-1">{errors.organization.message}</p>}
          </div>
          <div>
            <input {...register("role")} placeholder={t("editorSections.volunteering.role")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.role && <p className="text-xs text-destructive mt-1">{errors.role.message}</p>}
          </div>
          <input {...register("startDate")} type="date" className="rounded-md border px-3 py-2 text-sm" />
          <input {...register("endDate")} type="date" className="rounded-md border px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("isCurrent")} /> {t("editorSections.volunteering.currentlyVolunteering")}
        </label>
        <textarea {...register("description")} placeholder={t("editorSections.volunteering.description")} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          {t("common.add")}
        </button>
      </form>
    </div>
  );
}
