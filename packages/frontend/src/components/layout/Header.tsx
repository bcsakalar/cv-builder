import { useRouterState } from "@tanstack/react-router";
import { useAppStore } from "@/stores/app.store";
import { useAuthStore } from "@/stores/auth.store";
import { useLogout } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { LogOut, Menu, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Header() {
  const { t } = useTranslation();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const breadcrumb = getBreadcrumb(pathname, t);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-card/95 px-6 backdrop-blur">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded-md p-2 hover:bg-accent md:hidden"
          aria-label={t("common.toggleMenu")}
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold">{breadcrumb}</h1>
      </div>
      <div className="flex items-center gap-3">
        {user && <span className="hidden text-sm text-muted-foreground md:inline">{user.name}</span>}
        <Link
          to="/cv/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          {t("header.newCv")}
        </Link>
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={t("header.logout")}
        >
          <LogOut size={16} />
          <span className="hidden md:inline">{t("header.logout")}</span>
        </button>
      </div>
    </header>
  );
}

function getBreadcrumb(pathname: string, t: (key: string) => string): string {
  if (pathname === "/") return t("nav.dashboard");
  if (pathname === "/cv") return t("nav.myCvs");
  if (pathname === "/cv/new") return t("header.createNewCv");
  if (pathname.startsWith("/cv/") && pathname.endsWith("/edit")) return t("header.editCv");
  if (pathname === "/github") return t("header.githubIntegration");
  if (pathname === "/templates") return t("nav.templates");
  if (pathname === "/settings") return t("nav.settings");
  return t("common.appName");
}
