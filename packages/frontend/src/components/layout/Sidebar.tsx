import { Link, useRouterState } from "@tanstack/react-router";
import { useAppStore } from "@/stores/app.store";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  FileText,
  Github,
  Palette,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/cv", labelKey: "nav.myCvs", icon: FileText },
  { to: "/github", labelKey: "nav.github", icon: Github },
  { to: "/templates", labelKey: "nav.templates", icon: Palette },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function Sidebar() {
  const { t } = useTranslation();
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-full flex-col border-r bg-card transition-all duration-300 ${
        sidebarOpen ? "w-64" : "w-16"
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {sidebarOpen && (
          <Link to="/" className="text-xl font-bold text-primary">
            {t("common.appName")}
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1.5 hover:bg-accent"
          aria-label={t("common.toggleSidebar")}
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => {
          const isActive = currentPath === to || (to !== "/" && currentPath.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon size={20} />
              {sidebarOpen && <span>{t(labelKey)}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
