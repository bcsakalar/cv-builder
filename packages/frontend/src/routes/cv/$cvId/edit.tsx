import { createRoute, useParams } from "@tanstack/react-router";
import { rootRoute } from "../../__root";
import { useGetCV } from "@/hooks/useCV";
import { MainLayout } from "@/components/layout/MainLayout";
import { CVEditorLayout } from "@/components/cv-editor/CVEditorLayout";
import { useCVStore } from "@/stores/cv.store";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export const cvEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cv/$cvId/edit",
  component: CVEditPage,
});

function CVEditPage() {
  const { t } = useTranslation();
  const { cvId } = useParams({ from: "/cv/$cvId/edit" });
  const { data: cv, isLoading, error } = useGetCV(cvId);
  const setActiveCV = useCVStore((s) => s.setActiveCV);

  useEffect(() => {
    if (cv) setActiveCV(cv);
    return () => setActiveCV(null);
  }, [cv, setActiveCV]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !cv) {
    return (
      <MainLayout>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-destructive">{t("cvEdit.notFound")}</p>
            <p className="text-sm text-muted-foreground">
              {error?.message ?? t("cvEdit.notFoundDesc")}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <CVEditorLayout cv={cv} />
    </MainLayout>
  );
}
