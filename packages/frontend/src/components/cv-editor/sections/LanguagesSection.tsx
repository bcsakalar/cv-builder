import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useSectionMutation } from "@/hooks/useCV";
import type { CVDetail } from "@/services/cv.api";
import { Trash2, Plus } from "lucide-react";
import { languageProficiencyLabelKeys } from "@/i18n/helpers";

const LANGUAGE_LEVELS = [
  "NATIVE",
  "BILINGUAL",
  "FULL_PROFESSIONAL",
  "PROFESSIONAL_WORKING",
  "LIMITED_WORKING",
  "ELEMENTARY",
] as const;

const createLangSchema = (t: TFunction) => z.object({
  name: z.string().trim().min(1, t("common.required")),
  proficiency: z.enum(LANGUAGE_LEVELS),
});

type LangForm = z.infer<ReturnType<typeof createLangSchema>>;

export function LanguagesSection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const { language } = useSectionMutation(cv.id);
  const langSchema = createLangSchema(t);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LangForm>({
    resolver: zodResolver(langSchema),
    defaultValues: { proficiency: "PROFESSIONAL_WORKING" },
  });

  const onAdd = (data: LangForm) => {
    language.add.mutate({
      name: data.name.trim(),
      proficiency: data.proficiency,
      orderIndex: cv.languages.length,
    }, { onSuccess: () => reset({ name: "", proficiency: "PROFESSIONAL_WORKING" }) });
  };

  return (
    <div className="space-y-4">
      {cv.languages.map((lang: Record<string, unknown>) => (
        <div key={lang.id as string} className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <span className="font-medium">{lang.name as string}</span>
            <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {t(languageProficiencyLabelKeys[lang.proficiency as string] ?? "editorSections.languages.levels.intermediate")}
            </span>
          </div>
          <button
            onClick={() => language.remove.mutate(lang.id as string)}
            className="text-destructive hover:text-destructive/80"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <form onSubmit={handleSubmit(onAdd)} className="space-y-3 rounded-lg border border-dashed p-4">
        <h4 className="text-sm font-medium flex items-center gap-1">
          <Plus size={14} /> {t("editorSections.languages.add")}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input aria-label={t("editorSections.languages.language")} {...register("name")} placeholder={t("editorSections.languages.language")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <select aria-label={t("editorSections.languages.proficiency")} {...register("proficiency")} className="rounded-md border px-3 py-2 text-sm">
            <option value="NATIVE">{t("editorSections.languages.levels.native")}</option>
            <option value="BILINGUAL">{t("editorSections.languages.levels.bilingual")}</option>
            <option value="FULL_PROFESSIONAL">{t("editorSections.languages.levels.fullProfessional")}</option>
            <option value="PROFESSIONAL_WORKING">{t("editorSections.languages.levels.professionalWorking")}</option>
            <option value="LIMITED_WORKING">{t("editorSections.languages.levels.limitedWorking")}</option>
            <option value="ELEMENTARY">{t("editorSections.languages.levels.elementary")}</option>
          </select>
        </div>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          {t("common.add")}
        </button>
      </form>
    </div>
  );
}
