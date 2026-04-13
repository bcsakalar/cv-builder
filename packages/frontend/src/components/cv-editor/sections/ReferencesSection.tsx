import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useSectionMutation } from "@/hooks/useCV";
import type { CVDetail } from "@/services/cv.api";
import { Trash2, Plus } from "lucide-react";
import { nullIfBlank } from "./form-utils";

const createRefSchema = (t: TFunction) => z.object({
  name: z.string().trim().min(1, t("common.required")),
  company: z.string().trim().min(1, t("common.required")),
  title: z.string().trim().min(1, t("common.required")),
  email: z.string().email(t("common.invalidEmail")).optional().or(z.literal("")),
  phone: z.string().optional(),
  relationship: z.string().trim().min(1, t("common.required")),
});

type RefForm = z.infer<ReturnType<typeof createRefSchema>>;

export function ReferencesSection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const { reference } = useSectionMutation(cv.id);
  const refSchema = createRefSchema(t);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RefForm>({ resolver: zodResolver(refSchema) });

  const onAdd = (data: RefForm) => {
    reference.add.mutate({
      name: data.name.trim(),
      title: data.title.trim(),
      company: data.company.trim(),
      email: nullIfBlank(data.email),
      phone: nullIfBlank(data.phone),
      relationship: data.relationship.trim(),
      orderIndex: cv.references.length,
    }, { onSuccess: () => reset() });
  };

  return (
    <div className="space-y-4">
      {cv.references.map((ref: Record<string, unknown>) => (
        <div key={String(ref.id)} className="flex items-start justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">{String(ref.name)}</p>
            {!!ref.title && (
              <p className="text-sm text-muted-foreground">
                {ref.company
                  ? t("editorSections.references.positionAtCompany", {
                      position: String(ref.title),
                      company: String(ref.company),
                    })
                  : String(ref.title)}
              </p>
            )}
            {!!ref.email && <p className="text-xs text-muted-foreground">{String(ref.email)}</p>}
          </div>
          <button
            onClick={() => reference.remove.mutate(ref.id as string)}
            className="text-destructive hover:text-destructive/80"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <form onSubmit={handleSubmit(onAdd)} className="space-y-3 rounded-lg border border-dashed p-4">
        <h4 className="text-sm font-medium flex items-center gap-1">
          <Plus size={14} /> {t("editorSections.references.add")}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input aria-label={t("editorSections.references.fullName")} {...register("name")} placeholder={t("editorSections.references.fullName")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <input aria-label={t("editorSections.references.company")} {...register("company")} placeholder={t("editorSections.references.company")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.company && <p className="text-xs text-destructive mt-1">{errors.company.message}</p>}
          </div>
          <div>
            <input aria-label={t("editorSections.references.position")} {...register("title")} placeholder={t("editorSections.references.position")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <input aria-label={t("editorSections.references.relationship")} {...register("relationship")} placeholder={t("editorSections.references.relationship")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.relationship && <p className="text-xs text-destructive mt-1">{errors.relationship.message}</p>}
          </div>
          <div>
            <input aria-label={t("editorSections.references.email")} {...register("email")} placeholder={t("editorSections.references.email")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <input aria-label={t("editorSections.references.phone")} {...register("phone")} placeholder={t("editorSections.references.phone")} className="rounded-md border px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          {t("common.add")}
        </button>
      </form>
    </div>
  );
}
