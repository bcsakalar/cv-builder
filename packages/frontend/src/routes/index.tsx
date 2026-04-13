import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentCVs } from "@/components/dashboard/RecentCVs";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { useGetCVs } from "@/hooks/useCV";
import { useGitHubAnalyses } from "@/hooks/useGitHub";
import { useTranslation } from "react-i18next";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useTranslation();
  const { data: cvs } = useGetCVs();
  const { data: analyses } = useGitHubAnalyses();

  const completedAnalyses = analyses?.filter((a) => a.status === "COMPLETED").length ?? 0;

  const lastEditDate = cvs?.length
    ? cvs.reduce((latest, cv) => {
        const d = new Date(cv.updatedAt);
        return d > latest ? d : latest;
      }, new Date(0))
    : null;

  return (
    <MainLayout>
      <div className="space-y-8 p-8">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <StatsCards
          totalCVs={cvs?.length ?? 0}
          analyzedRepos={completedAnalyses}
          lastEdit={lastEditDate}
        />
        <QuickActions />
        <RecentCVs cvs={cvs ?? []} />
      </div>
    </MainLayout>
  );
}
