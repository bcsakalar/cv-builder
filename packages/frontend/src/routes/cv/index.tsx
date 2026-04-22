import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { rootRoute } from "../__root";
import { useGetCVs, useDeleteCV, useCloneCV } from "@/hooks/useCV";
import { MainLayout } from "@/components/layout/MainLayout";
import { Trash2, Edit, Plus, FileText, CopyPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getDateLocale, getStatusLabel, getTemplateName } from "@/i18n/helpers";
import { useState } from "react";

export const cvIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cv",
  component: CVListPage,
});

function CVListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: cvs, isLoading } = useGetCVs();
  const deleteMutation = useDeleteCV();
  const cloneMutation = useCloneCV();
  const dateLocale = getDateLocale(i18n.language);
  const [cloneTargetId, setCloneTargetId] = useState<string | null>(null);
  const [cloneLocale, setCloneLocale] = useState("en");
  const [cloneRole, setCloneRole] = useState("");

  const openClonePanel = (cv: NonNullable<typeof cvs>[number]) => {
    setCloneTargetId(cv.id);
    setCloneLocale(cv.locale.toLowerCase().startsWith("tr") ? "en" : "tr");
    setCloneRole(cv.personalInfo?.professionalTitle ?? "");
  };

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
                    type="button"
                    onClick={() => openClonePanel(cv)}
                    className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    <CopyPlus size={12} /> {t("cvList.cloneVariant", { defaultValue: "Clone variant" })}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t("cvList.deleteConfirm"))) deleteMutation.mutate(cv.id);
                    }}
                    className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={12} /> {t("cvList.delete")}
                  </button>
                </div>

                {cloneTargetId === cv.id && (
                  <div className="mt-3 space-y-3 rounded-lg border border-dashed p-3">
                    <div className="flex gap-2">
                      {[
                        { value: "en", label: "EN" },
                        { value: "tr", label: "TR" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setCloneLocale(option.value)}
                          className={`rounded-md px-2.5 py-1 text-xs ${
                            cloneLocale === option.value ? "bg-primary text-primary-foreground" : "border hover:bg-accent"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <input
                      value={cloneRole}
                      onChange={(event) => setCloneRole(event.target.value)}
                      placeholder={t("cvList.cloneRolePlaceholder", { defaultValue: "Optional role focus, e.g. Frontend Engineer" })}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          cloneMutation.mutate(
                            {
                              id: cv.id,
                              locale: cloneLocale,
                              targetRole: cloneRole.trim() || undefined,
                            },
                            {
                              onSuccess: (cloned) => {
                                setCloneTargetId(null);
                                void navigate({ to: `/cv/${cloned.id}/edit` as string });
                              },
                            }
                          );
                        }}
                        disabled={cloneMutation.isPending}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {cloneMutation.isPending ? t("common.loading") : t("cvList.createVariant", { defaultValue: "Create variant" })}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCloneTargetId(null)}
                        className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
