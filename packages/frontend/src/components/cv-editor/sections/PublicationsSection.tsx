import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useSectionMutation } from "@/hooks/useCV";
import type { CVDetail } from "@/services/cv.api";
import { Trash2, Plus } from "lucide-react";
import { nullIfBlank } from "./form-utils";

const createPubSchema = (t: TFunction) => z.object({
  title: z.string().trim().min(1, t("common.required")),
  publisher: z.string().trim().min(1, t("common.required")),
  date: z.string().min(1, t("common.required")),
  url: z.string().url(t("common.invalidUrl")).optional().or(z.literal("")),
  description: z.string().optional(),
});

type PubForm = z.infer<ReturnType<typeof createPubSchema>>;

export function PublicationsSection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const { publication } = useSectionMutation(cv.id);
  const pubSchema = createPubSchema(t);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PubForm>({ resolver: zodResolver(pubSchema) });

  const onAdd = (data: PubForm) => {
    publication.add.mutate({
      title: data.title.trim(),
      publisher: data.publisher.trim(),
      date: data.date,
      url: nullIfBlank(data.url),
      description: nullIfBlank(data.description),
      orderIndex: cv.publications.length,
    }, { onSuccess: () => reset() });
  };

  return (
    <div className="space-y-4">
      {cv.publications.map((pub: Record<string, unknown>) => (
        <div key={String(pub.id)} className="flex items-start justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">{String(pub.title)}</p>
            {!!pub.publisher && <p className="text-sm text-muted-foreground">{String(pub.publisher)}</p>}
            {!!pub.date && <p className="text-xs text-muted-foreground">{String(pub.date)}</p>}
          </div>
          <button
            onClick={() => publication.remove.mutate(pub.id as string)}
            className="text-destructive hover:text-destructive/80"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <form onSubmit={handleSubmit(onAdd)} className="space-y-3 rounded-lg border border-dashed p-4">
        <h4 className="text-sm font-medium flex items-center gap-1">
          <Plus size={14} /> {t("editorSections.publications.add")}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <input aria-label={t("editorSections.publications.title")} {...register("title")} placeholder={t("editorSections.publications.title")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <input aria-label={t("editorSections.publications.publisher")} {...register("publisher")} placeholder={t("editorSections.publications.publisher")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.publisher && <p className="text-xs text-destructive mt-1">{errors.publisher.message}</p>}
          </div>
          <div>
            <input aria-label={t("editorSections.publications.publishDate")} {...register("date")} type="date" className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
          </div>
          <input aria-label={t("editorSections.publications.url")} {...register("url")} placeholder={t("editorSections.publications.url")} className="col-span-2 rounded-md border px-3 py-2 text-sm" />
        </div>
        <textarea aria-label={t("editorSections.publications.description")} {...register("description")} placeholder={t("editorSections.publications.description")} rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          {t("common.add")}
        </button>
      </form>
    </div>
  );
}
