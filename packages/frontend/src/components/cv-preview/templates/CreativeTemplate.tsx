import type { CVDetail } from "@/services/cv.api";
import type { ThemeConfig } from "@/stores/theme.store";
import { formatPreviewDateRange } from "../date-range";
import { buildPreviewProject } from "../project-preview";
import { PreviewContactItems } from "../PreviewContactItems";
import { resolveProfilePhotoUrl } from "../personal-info";
import { getLanguageProficiencyLabelForLocale, getSectionLabelForLocale, translateForLocale } from "@/i18n/helpers";

interface TemplateProps {
  cv: CVDetail;
  theme: ThemeConfig;
}

export function CreativeTemplate({ cv, theme }: TemplateProps) {
  const pi = cv.personalInfo as Record<string, string> | null;
  const photoUrl = resolveProfilePhotoUrl(pi);
  const sectionLabel = (sectionKey: string) => getSectionLabelForLocale(sectionKey, cv.locale);
  const languageProficiencyLabel = (value: unknown) =>
    getLanguageProficiencyLabelForLocale(typeof value === "string" ? value : undefined, cv.locale);

  const sectionTitle = (title: string) => (
    <div className="mb-4 flex items-center gap-2">
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.accentColor }} />
      <h2 className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: theme.headingFont, color: theme.primaryColor }}>
        {title}
      </h2>
    </div>
  );

  return (
    <div
      className="mx-auto max-w-[210mm] overflow-hidden rounded-lg shadow-sm"
      style={{
        fontFamily: theme.bodyFont,
        fontSize: `${theme.fontSize}px`,
        color: theme.textColor,
        backgroundColor: theme.bgColor,
      }}
    >
      {/* Hero header */}
      <div
        className="relative flex items-center gap-6 px-8 py-10"
        style={{
          background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`,
          color: "#fff",
        }}
      >
        <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-full opacity-20" style={{ backgroundColor: "#fff" }} />
        {photoUrl && (
          <img src={photoUrl} alt={translateForLocale(cv.locale, "upload.profileAlt")} className="h-24 w-24 rounded-full border-2 border-white/40 object-cover" />
        )}
        <div>
          <h1 className="text-4xl font-bold" style={{ fontFamily: theme.headingFont }}>
            {pi?.firstName ?? ""} {pi?.lastName ?? ""}
          </h1>
          {pi?.professionalTitle && (
            <p className="mt-1 text-lg font-light opacity-90">{pi.professionalTitle}</p>
          )}
          <PreviewContactItems
            personalInfo={pi}
            className="mt-4 flex flex-wrap gap-4 text-sm opacity-85"
            itemClassName="break-all"
          />
        </div>
      </div>

      <div className="p-8">
        {cv.summary?.content && (
          <section className="mb-8">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.accentColor }} />
              <h2 className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: theme.headingFont, color: theme.primaryColor }}>
                {sectionLabel("summary")}
              </h2>
            </div>
            <p className="whitespace-pre-line leading-relaxed">{cv.summary.content}</p>
          </section>
        )}

        {cv.coverLetter?.content && (
          <section className="mb-8">
            {sectionTitle(sectionLabel("coverLetter"))}
            <p className="whitespace-pre-line leading-relaxed">{cv.coverLetter.content}</p>
          </section>
        )}

        {cv.experiences.length > 0 && (
          <section className="mb-8">
            {sectionTitle(sectionLabel("experience"))}
            <div className="relative ml-1.5 border-l-2" style={{ borderColor: theme.primaryColor }}>
              {cv.experiences.map((exp: Record<string, unknown>, i: number) => (
                <div key={i} className="relative mb-6 pl-6">
                  <div
                    className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full"
                    style={{ backgroundColor: theme.accentColor }}
                  />
                  <p className="font-bold">{String(exp.jobTitle)}</p>
                  <p className="text-sm font-medium" style={{ color: theme.primaryColor }}>
                    {String(exp.company)}
                  </p>
                  <p className="text-xs opacity-60">
                    {formatPreviewDateRange(exp.startDate, exp.endDate, Boolean(exp.isCurrent), cv.locale)}
                  </p>
                  {!!exp.description && (
                    <p className="mt-2 whitespace-pre-line text-sm">{String(exp.description)}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {cv.educations.length > 0 && (
          <section className="mb-8">
            {sectionTitle(sectionLabel("education"))}
            {cv.educations.map((edu: Record<string, unknown>, i: number) => (
              <div key={i} className="mb-4 rounded-lg border p-4" style={{ borderColor: `${theme.primaryColor}33` }}>
                <p className="font-bold">{String(edu.degree)}</p>
                <p className="text-sm" style={{ color: theme.primaryColor }}>{String(edu.institution)}</p>
                {!!edu.fieldOfStudy && <p className="text-sm opacity-70">{String(edu.fieldOfStudy)}</p>}
              </div>
            ))}
          </section>
        )}

        {cv.skills.length > 0 && (
          <section className="mb-8">
            {sectionTitle(sectionLabel("skills"))}
            <div className="flex flex-wrap gap-2">
              {cv.skills.map((s: Record<string, unknown>, i: number) => (
                <span
                  key={i}
                  className="rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {String(s.name)}
                </span>
              ))}
            </div>
          </section>
        )}

        {cv.projects.length > 0 && (
          <section className="mb-8">
            {sectionTitle(sectionLabel("projects"))}
            <div className="grid grid-cols-2 gap-4">
              {cv.projects.map((p: Record<string, unknown>, i: number) => {
                const project = buildPreviewProject(p, cv.locale, { technologyLimit: 5, highlightLimit: 2 });

                return (
                  <div key={i} className="rounded-lg p-4" style={{ backgroundColor: `${theme.primaryColor}0A` }}>
                    <p className="font-bold">{project.name}</p>
                    {project.metaLine && <p className="mt-0.5 text-xs opacity-70">{project.metaLine}</p>}
                    {project.description && <p className="mt-1 text-sm whitespace-pre-line">{project.description}</p>}
                    {project.highlights.length > 0 && (
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                        {project.highlights.map((highlight) => (
                          <li key={highlight}>{highlight}</li>
                        ))}
                      </ul>
                    )}
                    {project.signalLine && <p className="mt-2 text-xs font-medium" style={{ color: theme.primaryColor }}>{project.signalLine}</p>}
                    {project.technologies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {project.technologies.map((technology) => (
                          <span key={technology} className="rounded-full px-2 py-0.5 text-xs opacity-70" style={{ backgroundColor: `${theme.primaryColor}15` }}>{technology}</span>
                        ))}
                        {project.extraTechnologyCount > 0 && (
                          <span className="rounded-full px-2 py-0.5 text-xs opacity-60" style={{ backgroundColor: `${theme.primaryColor}10` }}>+{project.extraTechnologyCount}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {cv.certifications.length > 0 && (
          <section className="mb-8">
            {sectionTitle(sectionLabel("certifications"))}
            {cv.certifications.map((c: Record<string, unknown>, i: number) => (
              <div key={i} className="mb-3 rounded-lg border p-3" style={{ borderColor: `${theme.primaryColor}33` }}>
                <p className="font-bold">{String(c.name)}</p>
                {!!c.issuingOrganization && <p className="text-sm" style={{ color: theme.primaryColor }}>{String(c.issuingOrganization)}</p>}
              </div>
            ))}
          </section>
        )}

        {cv.languages.length > 0 && (
          <section className="mb-8">
            {sectionTitle(sectionLabel("languages"))}
            <div className="flex flex-wrap gap-2">
              {cv.languages.map((l: Record<string, unknown>, i: number) => (
                <span key={i} className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}>
                  {String(l.name)} — {languageProficiencyLabel(l.proficiency)}
                </span>
              ))}
            </div>
          </section>
        )}

        {cv.volunteerExperiences.length > 0 && (
          <section className="mb-8">
            {sectionTitle(sectionLabel("volunteering"))}
            {cv.volunteerExperiences.map((v: Record<string, unknown>, i: number) => (
              <div key={i} className="mb-4">
                <p className="font-bold">{String(v.role)}</p>
                <p className="text-sm font-medium" style={{ color: theme.primaryColor }}>{String(v.organization)}</p>
                <p className="text-xs opacity-60">{formatPreviewDateRange(v.startDate, v.endDate, false, cv.locale)}</p>
                {!!v.description && <p className="mt-1 text-sm whitespace-pre-line">{String(v.description)}</p>}
              </div>
            ))}
          </section>
        )}

        {cv.publications.length > 0 && (
          <section className="mb-8">
            {sectionTitle(sectionLabel("publications"))}
            {cv.publications.map((p: Record<string, unknown>, i: number) => (
              <div key={i} className="mb-2">
                <p className="font-bold">{String(p.title)}</p>
                {!!p.publisher && <p className="text-sm" style={{ color: theme.primaryColor }}>{String(p.publisher)}</p>}
              </div>
            ))}
          </section>
        )}

        {cv.awards.length > 0 && (
          <section className="mb-8">
            {sectionTitle(sectionLabel("awards"))}
            {cv.awards.map((a: Record<string, unknown>, i: number) => (
              <div key={i} className="mb-2">
                <p className="font-bold">{String(a.title)}</p>
                {!!a.issuer && <p className="text-sm" style={{ color: theme.primaryColor }}>{String(a.issuer)}</p>}
              </div>
            ))}
          </section>
        )}

        {cv.references.length > 0 && (
          <section className="mb-8">
            {sectionTitle(sectionLabel("references"))}
            <div className="grid grid-cols-2 gap-4">
              {cv.references.map((r: Record<string, unknown>, i: number) => (
                <div key={i} className="rounded-lg p-3" style={{ backgroundColor: `${theme.primaryColor}0A` }}>
                  <p className="font-bold">{String(r.name)}</p>
                  <p className="text-sm">{String(r.title)}, {String(r.company)}</p>
                  {!!r.email && <p className="text-xs" style={{ color: theme.primaryColor }}>{String(r.email)}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {cv.hobbies.length > 0 && (
          <section className="mb-8">
            {sectionTitle(sectionLabel("hobbies"))}
            <div className="flex flex-wrap gap-2">
              {cv.hobbies.map((h: Record<string, unknown>, i: number) => (
                <span key={i} className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${theme.primaryColor}15` }}>
                  {String(h.name)}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
