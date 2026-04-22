import { createRoute, useNavigate } from "@tanstack/react-router";
import { rootRoute } from "../__root";
import { useCreateCV } from "@/hooks/useCV";
import { useTemplates } from "@/hooks/useTemplates";
import { MainLayout } from "@/components/layout/MainLayout";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/stores/app.store";
import type { AppLocale } from "@/i18n/locale";
import { getTemplateName } from "@/i18n/helpers";

export const cvNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cv/new",
  component: NewCVPage,
});

type CreateForm = {
  title: string;
  templateId: string;
  locale: AppLocale;
};

function NewCVPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createCV = useCreateCV();
  const { data: templates } = useTemplates();
  const appLocale = useAppStore((state) => state.locale);

  const createSchema = z.object({
    title: z.string().min(1, t("cvNew.titleRequired")).max(100),
    templateId: z.string().min(1, t("cvNew.templateRequired")),
    locale: z.enum(["en", "tr"]).default(appLocale),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      title: "",
      templateId: "",
      locale: appLocale,
    },
  });

  useEffect(() => {
    setValue("locale", appLocale);
  }, [appLocale, setValue]);

  const onSubmit = (data: CreateForm) => {
    createCV.mutate(data, {
      onSuccess: (cv) => {
        navigate({ to: `/cv/${cv.id}/edit` });
      },
    });
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-lg p-8">
        <h1 className="mb-6 text-2xl font-bold">{t("cvNew.title")}</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t("cvNew.cvTitle")}</label>
            <input
              {...register("title")}
              placeholder={t("cvNew.titlePlaceholder")}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t("cvNew.template")}</label>
            <select {...register("templateId")} className="w-full rounded-md border px-3 py-2 text-sm">
              <option value="">{t("cvNew.selectTemplate")}</option>
              {templates?.map((tmpl: { id: string; name: string; slug: string }) => (
                <option key={tmpl.id} value={tmpl.id}>{getTemplateName(tmpl.slug, tmpl.name)}</option>
              ))}
            </select>
            {errors.templateId && (
              <p className="mt-1 text-xs text-destructive">{errors.templateId.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t("cvNew.language")}</label>
            <select {...register("locale")} className="w-full rounded-md border px-3 py-2 text-sm">
              <option value="en">{t("languages.en")}</option>
              <option value="tr">{t("languages.tr")}</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={createCV.isPending}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createCV.isPending ? t("cvNew.creating") : t("cvNew.createCv")}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}
