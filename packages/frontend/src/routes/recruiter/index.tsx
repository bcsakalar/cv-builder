import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../__root";
import { MainLayout } from "@/components/layout/MainLayout";
import { RecruiterWorkbench } from "@/components/recruiter/RecruiterWorkbench";

export const recruiterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recruiter",
  component: RecruiterPage,
});

function RecruiterPage() {
  return (
    <MainLayout>
      <RecruiterWorkbench />
    </MainLayout>
  );
}