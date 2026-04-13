import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../__root";
import { MainLayout } from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { templateApi } from "@/services/template.api";
import type { Template } from "@/services/template.api";
import { Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getTemplateCategoryLabel, getTemplateDescription, getTemplateName } from "@/i18n/helpers";

export const templatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/templates",
  component: TemplatesPage,
});

const TEMPLATE_PREVIEWS: Record<string, string> = {
  modern: "bg-gradient-to-br from-blue-500 to-purple-600",
  classic: "bg-gradient-to-br from-gray-700 to-gray-900",
  minimal: "bg-gradient-to-br from-gray-100 to-gray-300",
  creative: "bg-gradient-to-br from-pink-500 to-orange-400",
  corporate: "bg-gradient-to-br from-slate-700 to-blue-900",
};

function TemplatesPage() {
  const { t } = useTranslation();
  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => templateApi.getAll(),
  });

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("templates.title")}</h1>
          <p className="text-muted-foreground">{t("templates.subtitle")}</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-accent" />
            ))}
          </div>
        ) : !templates || templates.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <Palette className="mx-auto text-muted-foreground" size={48} />
            <p className="mt-4 text-muted-foreground">{t("templates.noTemplates")}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template: Template) => (
              <div key={template.id} className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
                <div
                  className={`flex h-48 items-center justify-center ${
                    TEMPLATE_PREVIEWS[template.slug] ?? "bg-gradient-to-br from-gray-200 to-gray-400"
                  }`}
                >
                  <span className="text-3xl font-bold text-white/80">{getTemplateName(template.slug, template.name)}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{getTemplateName(template.slug, template.name)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {getTemplateDescription(template.slug, template.description)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs">
                      {getTemplateCategoryLabel(template.category)}
                    </span>
                    {template.isPremium && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                        {t("templates.premium")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
