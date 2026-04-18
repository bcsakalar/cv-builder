import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { CVDetail } from "@/services/cv.api";
import { useSectionMutation } from "@/hooks/useCV";
import { useAutoSave } from "@/hooks/useDebounce";
import { useGenerateSummary, useStreamingSummary } from "@/hooks/useAI";
import { Sparkles, Loader2, Zap } from "lucide-react";

const createSchema = (t: TFunction) => z.object({
  content: z.string().max(5000, t("common.maxLength", { count: 5000 })).default(""),
  aiGenerated: z.boolean().default(false),
});

type FormData = z.infer<ReturnType<typeof createSchema>>;

export function SummarySection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const { upsertSummary } = useSectionMutation(cv.id);
  const summaryMut = useGenerateSummary();
  const { text: streamText, isStreaming, startStream } = useStreamingSummary();
  const schema = createSchema(t);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: cv.summary ?? { content: "", aiGenerated: false },
  });
  const content = useWatch({ control: form.control, name: "content" }) ?? "";

  useAutoSave(form.watch, (data) => {
    upsertSummary.mutate(data);
  });

  const handleGenerate = () => {
    summaryMut.mutate(cv.id, {
      onSuccess: (data) => {
        form.setValue("content", data.summary);
        form.setValue("aiGenerated", true);
      },
    });
  };

  const handleStream = () => {
    startStream(cv.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{t("editorSections.summary.title")}</label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={summaryMut.isPending || isStreaming}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            {summaryMut.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {t("editorSections.summary.generate")}
          </button>
          <button
            type="button"
            onClick={handleStream}
            disabled={summaryMut.isPending || isStreaming}
            className="flex items-center gap-1.5 rounded-md border border-purple-300 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 disabled:opacity-50"
          >
            {isStreaming ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Zap size={12} />
            )}
            {t("editorSections.summary.stream")}
          </button>
        </div>
      </div>

      {/* Streaming preview */}
      {isStreaming && streamText && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
          <p className="text-sm whitespace-pre-line">{streamText}</p>
          <button
            type="button"
            onClick={() => {
              form.setValue("content", streamText);
              form.setValue("aiGenerated", true);
            }}
            className="mt-2 rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700"
          >
            {t("editorSections.summary.apply")}
          </button>
        </div>
      )}

      <textarea
        {...form.register("content")}
        rows={6}
        placeholder={t("editorSections.summary.placeholder")}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <p className="text-xs text-muted-foreground">
        {t("editorSections.summary.count", { count: content.length, max: 5000 })}
      </p>
    </div>
  );
}
