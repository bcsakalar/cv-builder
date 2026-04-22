import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { FileText, Loader2, Sparkles } from "lucide-react";
import type { CVDetail } from "@/services/cv.api";
import { useSectionMutation } from "@/hooks/useCV";
import { useGenerateCoverLetter } from "@/hooks/useAI";
import { useAutoSave } from "@/hooks/useDebounce";

const createSchema = (t: TFunction) => z.object({
  content: z.string().max(10000, t("common.maxLength", { count: 10000 })).default(""),
  aiGenerated: z.boolean().default(false),
});

type FormData = z.infer<ReturnType<typeof createSchema>>;

export function CoverLetterSection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const [jobDescription, setJobDescription] = useState("");
  const { upsertCoverLetter } = useSectionMutation(cv.id);
  const coverLetterMut = useGenerateCoverLetter();
  const schema = createSchema(t);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: cv.coverLetter ?? { content: "", aiGenerated: false },
  });

  useEffect(() => {
    form.reset(cv.coverLetter ?? { content: "", aiGenerated: false });
  }, [cv.coverLetter, form]);

  const content = useWatch({ control: form.control, name: "content" }) ?? "";

  useAutoSave(form.watch, (data) => upsertCoverLetter.mutateAsync(data));

  const handleGenerate = () => {
    coverLetterMut.mutate(
      { cvId: cv.id, jobDescription: jobDescription.trim() || undefined },
      {
        onSuccess: (data) => {
          form.setValue("content", data.coverLetter, { shouldDirty: true, shouldTouch: true });
          form.setValue("aiGenerated", true, { shouldDirty: true, shouldTouch: true });
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium">{t("editorSections.coverLetter.title")}</label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={coverLetterMut.isPending}
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          {coverLetterMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {t("editorSections.coverLetter.generate")}
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("editorSections.coverLetter.jobDescription")}</label>
        <textarea
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          rows={4}
          placeholder={t("editorSections.coverLetter.jobDescriptionPlaceholder")}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <FileText size={14} className="mt-0.5" />
          <p>{t("editorSections.coverLetter.hint")}</p>
        </div>
      </div>

      <textarea
        {...form.register("content")}
        rows={12}
        placeholder={t("editorSections.coverLetter.placeholder")}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <p className="text-xs text-muted-foreground">
        {t("editorSections.coverLetter.count", { count: content.length, max: 10000 })}
      </p>
    </div>
  );
}
