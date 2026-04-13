import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useSectionMutation } from "@/hooks/useCV";
import type { CVDetail } from "@/services/cv.api";
import { Trash2, Plus } from "lucide-react";

const createCustomSchema = (t: TFunction) => z.object({
  title: z.string().min(1, t("common.required")),
  content: z.string().min(1, t("common.required")),
});

type CustomForm = z.infer<ReturnType<typeof createCustomSchema>>;

export function CustomSectionEditor({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const { customSection } = useSectionMutation(cv.id);
  const customSchema = createCustomSchema(t);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomForm>({ resolver: zodResolver(customSchema) });

  const onAdd = (data: CustomForm) => {
    customSection.add.mutate(data, { onSuccess: () => reset() });
  };

  return (
    <div className="space-y-4">
      {cv.customSections.map((sec: Record<string, unknown>) => (
        <div key={sec.id as string} className="rounded-lg border p-4">
          <div className="flex justify-between">
            <h4 className="font-medium">{sec.title as string}</h4>
            <button
              onClick={() => customSection.remove.mutate(sec.id as string)}
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <p className="mt-1 text-sm whitespace-pre-line">{JSON.stringify(sec.content)}</p>
        </div>
      ))}

      <form onSubmit={handleSubmit(onAdd)} className="space-y-3 rounded-lg border border-dashed p-4">
        <h4 className="text-sm font-medium flex items-center gap-1">
          <Plus size={14} /> {t("editorSections.customSection.add")}
        </h4>
        <div>
          <input {...register("title")} placeholder={t("editorSections.customSection.title")} className="w-full rounded-md border px-3 py-2 text-sm" />
          {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <textarea {...register("content")} placeholder={t("editorSections.customSection.contentPlaceholder")} rows={4} className="w-full rounded-md border px-3 py-2 text-sm" />
          {errors.content && <p className="text-xs text-destructive mt-1">{errors.content.message}</p>}
        </div>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          {t("common.add")}
        </button>
      </form>
    </div>
  );
}
