import { Link } from "@tanstack/react-router";
import { Plus, Github, Palette } from "lucide-react";
import { useTranslation } from "react-i18next";

export function QuickActions() {
  const { t } = useTranslation();

  const actions = [
    { label: t("dashboard.newCv"), to: "/cv/new", icon: Plus, color: "bg-blue-500" },
    { label: t("dashboard.connectGithub"), to: "/github", icon: Github, color: "bg-purple-500" },
    { label: t("dashboard.browseTemplates"), to: "/templates", icon: Palette, color: "bg-emerald-500" },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Link
          key={action.label}
          to={action.to}
          className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <span className={`rounded-md p-1.5 text-white ${action.color}`}>
            <action.icon size={14} />
          </span>
          {action.label}
        </Link>
      ))}
    </div>
  );
}
