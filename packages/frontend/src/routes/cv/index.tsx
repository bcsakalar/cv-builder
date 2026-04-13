import { createRoute, Link } from "@tanstack/react-router";
import { rootRoute } from "../__root";
import { useGetCVs, useDeleteCV } from "@/hooks/useCV";
import { MainLayout } from "@/components/layout/MainLayout";
import { Trash2, Edit, Plus, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getDateLocale, getStatusLabel, getTemplateName } from "@/i18n/helpers";

export const cvIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cv",
  component: CVListPage,
});

function CVListPage() {
  const { t, i18n } = useTranslation();
  const { data: cvs, isLoading } = useGetCVs();
  const deleteMutation = useDeleteCV();
  const dateLocale = getDateLocale(i18n.language);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-accent" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("cvList.title")}</h1>
          <Link
            to="/cv/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} /> {t("cvList.newCv")}
          </Link>
        </div>

        {!cvs || cvs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <FileText className="mx-auto mb-4 text-muted-foreground" size={48} />
            <h3 className="text-lg font-medium">{t("cvList.noCvsYet")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("cvList.createFirstCv")}</p>
            <Link
              to="/cv/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              <Plus size={16} /> {t("cvList.createCv")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cvs.map((cv) => (
              <div key={cv.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{cv.title}</h3>
                    {cv.personalInfo && (
                      <p className="text-sm text-muted-foreground">
                        {cv.personalInfo.firstName} {cv.personalInfo.lastName}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      cv.status === "PUBLISHED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {getStatusLabel(cv.status)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {getTemplateName(cv.template.slug, cv.template.name)} • {t("cvList.updated")} {new Date(cv.updatedAt).toLocaleDateString(dateLocale)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    to={`/cv/${cv.id}/edit` as string}
                    className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs hover:bg-accent/80"
                  >
                    <Edit size={12} /> {t("cvList.edit")}
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(t("cvList.deleteConfirm"))) deleteMutation.mutate(cv.id);
                    }}
                    className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={12} /> {t("cvList.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
