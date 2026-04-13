import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useSectionMutation } from "@/hooks/useCV";
import type { CVDetail } from "@/services/cv.api";
import { Trash2, Plus } from "lucide-react";
import { nullIfBlank } from "./form-utils";

const createAwardSchema = (t: TFunction) => z.object({
  title: z.string().trim().min(1, t("common.required")),
  issuer: z.string().trim().min(1, t("common.required")),
  date: z.string().min(1, t("common.required")),
  description: z.string().optional(),
});

type AwardForm = z.infer<ReturnType<typeof createAwardSchema>>;

export function AwardsSection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const { award } = useSectionMutation(cv.id);
  const awardSchema = createAwardSchema(t);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AwardForm>({ resolver: zodResolver(awardSchema) });

  const onAdd = (data: AwardForm) => {
    award.add.mutate({
      title: data.title.trim(),
      issuer: data.issuer.trim(),
      date: data.date,
      description: nullIfBlank(data.description),
      orderIndex: cv.awards.length,
    }, { onSuccess: () => reset() });
  };

  return (
    <div className="space-y-4">
      {cv.awards.map((a: Record<string, unknown>) => (
        <div key={String(a.id)} className="flex items-start justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">{String(a.title)}</p>
            {!!a.issuer && <p className="text-sm text-muted-foreground">{String(a.issuer)}</p>}
            {!!a.date && <p className="text-xs text-muted-foreground">{String(a.date)}</p>}
          </div>
          <button
            onClick={() => award.remove.mutate(a.id as string)}
            className="text-destructive hover:text-destructive/80"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <form onSubmit={handleSubmit(onAdd)} className="space-y-3 rounded-lg border border-dashed p-4">
        <h4 className="text-sm font-medium flex items-center gap-1">
          <Plus size={14} /> {t("editorSections.awards.add")}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input aria-label={t("editorSections.awards.title")} {...register("title")} placeholder={t("editorSections.awards.title")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <input aria-label={t("editorSections.awards.issuer")} {...register("issuer")} placeholder={t("editorSections.awards.issuer")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.issuer && <p className="text-xs text-destructive mt-1">{errors.issuer.message}</p>}
          </div>
          <div>
            <input aria-label={t("editorSections.awards.date")} {...register("date")} type="date" className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
          </div>
        </div>
        <textarea aria-label={t("editorSections.awards.description")} {...register("description")} placeholder={t("editorSections.awards.description")} rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          {t("common.add")}
        </button>
      </form>
    </div>
  );
}
