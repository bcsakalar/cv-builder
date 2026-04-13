import type { CVDetail } from "@/services/cv.api";
import type { ThemeConfig } from "@/stores/theme.store";
import { formatPreviewDateRange } from "../date-range";
import { PreviewContactItems } from "../PreviewContactItems";
import { resolveProfilePhotoUrl } from "../personal-info";
import { getSectionLabelForLocale, translateForLocale } from "@/i18n/helpers";

interface TemplateProps {
  cv: CVDetail;
  theme: ThemeConfig;
}

export function CorporateTemplate({ cv, theme }: TemplateProps) {
  const pi = cv.personalInfo as Record<string, string> | null;
  const photoUrl = resolveProfilePhotoUrl(pi);
  const sectionLabel = (sectionKey: string) => getSectionLabelForLocale(sectionKey, cv.locale);

  const sectionHeading = (title: string) => (
    <h2
      className="mb-3 border-b-2 pb-1 text-sm font-bold uppercase tracking-wider"
      style={{
        fontFamily: theme.headingFont,
        borderColor: theme.primaryColor,
        color: theme.primaryColor,
      }}
    >
      {title}
    </h2>
  );

  return (
    <div
      className="mx-auto max-w-[210mm] rounded-lg shadow-sm"
      style={{
        fontFamily: theme.bodyFont,
        fontSize: `${theme.fontSize}px`,
        color: theme.textColor,
        backgroundColor: theme.bgColor,
      }}
    >
      {/* Header bar */}
      <div className="flex items-center gap-6 px-8 py-6" style={{ borderBottom: `3px solid ${theme.primaryColor}` }}>
        {photoUrl && (
          <img src={photoUrl} alt={translateForLocale(cv.locale, "upload.profileAlt")} className="h-20 w-20 rounded-full object-cover" />
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold" style={{ fontFamily: theme.headingFont }}>
            {pi?.firstName ?? ""} {pi?.lastName ?? ""}
          </h1>
          {pi?.professionalTitle && (
            <p className="mt-0.5 text-base" style={{ color: theme.secondaryColor }}>
              {pi.professionalTitle}
            </p>
          )}
        </div>
        <PreviewContactItems
          personalInfo={pi}
          className="flex flex-col items-end gap-1 text-right text-xs leading-6"
          itemClassName="break-all"
          style={{ color: theme.secondaryColor }}
        />
      </div>

      <div className="p-8">
        {cv.summary?.content && (
          <section className="mb-6">
            {sectionHeading(sectionLabel("summary"))}
            <p className="whitespace-pre-line leading-relaxed">{cv.summary.content}</p>
          </section>
        )}

        {cv.experiences.length > 0 && (
          <section className="mb-6">
            {sectionHeading(sectionLabel("experience"))}
            {cv.experiences.map((exp: Record<string, unknown>, i: number) => (
              <div key={i} className="mb-5">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">{String(exp.jobTitle)}</span>
                  <span className="text-xs" style={{ color: theme.secondaryColor }}>
                    {formatPreviewDateRange(exp.startDate, exp.endDate, Boolean(exp.isCurrent), cv.locale)}
                  </span>
                </div>
                <p className="text-sm font-medium" style={{ color: theme.primaryColor }}>
                  {String(exp.company)}{exp.location ? ` | ${String(exp.location)}` : ""}
                </p>
                {!!exp.description && (
                  <p className="mt-1 whitespace-pre-line text-sm">{String(exp.description)}</p>
                )}
                {Array.isArray(exp.highlights) && (exp.highlights as string[]).length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {(exp.highlights as string[]).map((h, j) => (
                      <li key={j}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {cv.educations.length > 0 && (
          <section className="mb-6">
            {sectionHeading(sectionLabel("education"))}
            {cv.educations.map((edu: Record<string, unknown>, i: number) => (
              <div key={i} className="mb-3 flex items-baseline justify-between">
                <div>
                  <span className="font-bold">{String(edu.degree)}</span>
                  {!!edu.fieldOfStudy && <span className="text-sm"> – {String(edu.fieldOfStudy)}</span>}
                  <p className="text-sm" style={{ color: theme.secondaryColor }}>
                    {String(edu.institution)}
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs" style={{ color: theme.secondaryColor }}>
                  {formatPreviewDateRange(edu.startDate, edu.endDate, Boolean(edu.isCurrent), cv.locale)}
                </span>
              </div>
            ))}
          </section>
        )}

        <div className={theme.layout === "two-column" ? "grid grid-cols-2 gap-8" : ""}>
          {cv.skills.length > 0 && (
            <section className="mb-6">
              {sectionHeading(sectionLabel("skills"))}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {cv.skills.map((s: Record<string, unknown>, i: number) => (
                  <span key={i}>• {String(s.name)}</span>
                ))}
              </div>
            </section>
          )}

          {cv.certifications.length > 0 && (
            <section className="mb-6">
              {sectionHeading(sectionLabel("certifications"))}
              {cv.certifications.map((c: Record<string, unknown>, i: number) => (
                <div key={i} className="mb-2 text-sm">
                  <span className="font-medium">{String(c.name)}</span>
                  {!!c.issuingOrganization && <span className="opacity-70"> — {String(c.issuingOrganization)}</span>}
                </div>
              ))}
            </section>
          )}

          {cv.languages.length > 0 && (
            <section className="mb-6">
              {sectionHeading(sectionLabel("languages"))}
              <div className="flex flex-wrap gap-4 text-sm">
                {cv.languages.map((l: Record<string, unknown>, i: number) => (
                  <span key={i}>
                    {String(l.name)}{l.proficiency ? ` (${String(l.proficiency)})` : ""}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {cv.projects.length > 0 && (
          <section className="mb-6">
            {sectionHeading(sectionLabel("projects"))}
            {cv.projects.map((p: Record<string, unknown>, i: number) => (
              <div key={i} className="mb-4">
                <p className="font-bold">{String(p.name)}</p>
                {!!p.description && <p className="mt-1 text-sm whitespace-pre-line">{String(p.description)}</p>}
                {Array.isArray(p.technologies) && (p.technologies as string[]).length > 0 && (
                  <p className="mt-1 text-xs" style={{ color: theme.secondaryColor }}>{(p.technologies as string[]).join(", ")}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {cv.volunteerExperiences.length > 0 && (
          <section className="mb-6">
            {sectionHeading(sectionLabel("volunteering"))}
            {cv.volunteerExperiences.map((v: Record<string, unknown>, i: number) => (
              <div key={i} className="mb-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">{String(v.role)}</span>
                  <span className="text-xs" style={{ color: theme.secondaryColor }}>
                    {formatPreviewDateRange(v.startDate, v.endDate, false, cv.locale)}
                  </span>
                </div>
                <p className="text-sm font-medium" style={{ color: theme.primaryColor }}>{String(v.organization)}</p>
                {!!v.description && <p className="mt-1 text-sm whitespace-pre-line">{String(v.description)}</p>}
              </div>
            ))}
          </section>
        )}

        {cv.publications.length > 0 && (
          <section className="mb-6">
            {sectionHeading(sectionLabel("publications"))}
            {cv.publications.map((p: Record<string, unknown>, i: number) => (
              <div key={i} className="mb-2 text-sm">
                <span className="font-medium">{String(p.title)}</span>
                {!!p.publisher && <span className="opacity-70"> — {String(p.publisher)}</span>}
              </div>
            ))}
          </section>
        )}

        {cv.awards.length > 0 && (
          <section className="mb-6">
            {sectionHeading(sectionLabel("awards"))}
            {cv.awards.map((a: Record<string, unknown>, i: number) => (
              <div key={i} className="mb-2 text-sm">
                <span className="font-medium">{String(a.title)}</span>
                {!!a.issuer && <span className="opacity-70"> — {String(a.issuer)}</span>}
              </div>
            ))}
          </section>
        )}

        {cv.references.length > 0 && (
          <section className="mb-6">
            {sectionHeading(sectionLabel("references"))}
            {cv.references.map((r: Record<string, unknown>, i: number) => (
              <div key={i} className="mb-3">
                <p className="font-bold">{String(r.name)}</p>
                <p className="text-sm">{String(r.title)}, {String(r.company)}</p>
                {!!r.email && <p className="text-xs" style={{ color: theme.secondaryColor }}>{String(r.email)}</p>}
              </div>
            ))}
          </section>
        )}

        {cv.hobbies.length > 0 && (
          <section className="mb-6">
            {sectionHeading(sectionLabel("hobbies"))}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {cv.hobbies.map((h: Record<string, unknown>, i: number) => (
                <span key={i}>• {String(h.name)}</span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
