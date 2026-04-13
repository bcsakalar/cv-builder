import { FileText, Github, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getDateLocale } from "@/i18n/helpers";

interface StatsCardsProps {
  totalCVs: number;
  analyzedRepos: number;
  lastEdit: Date | null;
}

function formatLastEdit(date: Date | null, t: (k: string) => string, locale: string): string {
  if (!date) return "—";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (mins < 1) return t("dashboard.justNow");
  if (mins < 60) return rtf.format(-mins, "minute");
  const hours = Math.floor(mins / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return rtf.format(-days, "day");
  return date.toLocaleDateString(locale);
}

export function StatsCards({ totalCVs, analyzedRepos, lastEdit }: StatsCardsProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);

  const stats = [
    { label: t("dashboard.totalCvs"), value: totalCVs, icon: FileText, color: "text-blue-500" },
    { label: t("dashboard.githubRepos"), value: analyzedRepos, icon: Github, color: "text-purple-500" },
    { label: t("dashboard.lastEdit"), value: formatLastEdit(lastEdit, t, dateLocale), icon: Clock, color: "text-orange-500" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <stat.icon size={20} className={stat.color} />
          </div>
          <p className="mt-2 text-2xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
