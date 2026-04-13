import { Link } from "@tanstack/react-router";
import { FileText, MoreVertical, Trash2, Edit } from "lucide-react";
import type { CVListItem } from "@/services/cv.api";
import { useDeleteCV } from "@/hooks/useCV";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getDateLocale, getStatusLabel, getTemplateName } from "@/i18n/helpers";

interface RecentCVsProps {
  cvs: CVListItem[];
}

export function RecentCVs({ cvs }: RecentCVsProps) {
  const { t } = useTranslation();

  if (cvs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-12 text-center">
        <FileText size={48} className="mx-auto text-muted-foreground/40" />
        <h3 className="mt-4 text-lg font-semibold">{t("dashboard.noCvsYet")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.createFirstCv")}
        </p>
        <Link
          to="/cv/new"
          className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("dashboard.createCv")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cvs.map((cv) => (
        <CVCard key={cv.id} cv={cv} />
      ))}
    </div>
  );
}

function CVCard({ cv }: { cv: CVListItem }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const deleteMutation = useDeleteCV();
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);

  const displayName = cv.personalInfo
    ? `${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`
    : cv.title;

  return (
    <div className="group relative rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <Link to={`/cv/${cv.id}/edit` as string} className="flex-1">
          <h3 className="font-semibold text-card-foreground line-clamp-1">{cv.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{displayName}</p>
        </Link>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-1 hover:bg-accent"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border bg-popover p-1 shadow-md">
              <Link
                to={`/cv/${cv.id}/edit` as string}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setMenuOpen(false)}
              >
                <Edit size={14} /> {t("cvList.edit")}
              </Link>
              <button
                onClick={() => {
                  deleteMutation.mutate(cv.id);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={14} /> {t("cvList.delete")}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            cv.status === "PUBLISHED"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {getStatusLabel(cv.status)}
        </span>
        <span className="text-xs text-muted-foreground">
          {getTemplateName(cv.template.slug, cv.template.name)}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("cvList.updated")} {new Date(cv.updatedAt).toLocaleDateString(dateLocale)}
      </p>
    </div>
  );
}
