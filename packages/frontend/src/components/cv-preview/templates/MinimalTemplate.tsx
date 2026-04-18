import type { CVDetail } from "@/services/cv.api";
import type { ThemeConfig } from "@/stores/theme.store";
import { formatPreviewDateRange } from "../date-range";
import { buildPreviewProject } from "../project-preview";
import { PreviewContactItems } from "../PreviewContactItems";
import { resolveProfilePhotoUrl } from "../personal-info";
import { getSectionLabelForLocale, translateForLocale } from "@/i18n/helpers";

interface TemplateProps {
  cv: CVDetail;
  theme: ThemeConfig;
}

export function MinimalTemplate({ cv, theme }: TemplateProps) {
  const pi = cv.personalInfo as Record<string, string> | null;
  const photoUrl = resolveProfilePhotoUrl(pi);
  const sectionLabel = (sectionKey: string) => getSectionLabelForLocale(sectionKey, cv.locale);

  const heading = (title: string) => (
    <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.3em]" style={{ color: theme.secondaryColor }}>
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
        padding: "3rem",
        lineHeight: 1.8,
      }}
    >
      <header className="mb-10 flex items-center gap-6">
        {photoUrl && (
          <img src={photoUrl} alt={translateForLocale(cv.locale, "upload.profileAlt")} className="h-20 w-20 rounded-full object-cover" />
        )}
        <div>
          <h1 className="text-4xl font-light tracking-wide" style={{ fontFamily: theme.headingFont }}>
            {pi?.firstName ?? ""} {pi?.lastName ?? ""}
          </h1>
          {pi?.professionalTitle && (
            <p className="mt-2 text-sm font-light tracking-wider uppercase" style={{ color: theme.secondaryColor }}>
              {pi.professionalTitle}
            </p>
          )}
          <PreviewContactItems
            personalInfo={pi}
            className="mt-4 flex flex-wrap gap-6 text-xs"
            itemClassName="break-all"
            style={{ color: theme.secondaryColor }}
          />
        </div>
      </header>

      {cv.summary?.content && (
        <section className="mb-8">
          <p className="whitespace-pre-line font-light">{cv.summary.content}</p>
        </section>
      )}

      {cv.experiences.length > 0 && (
        <section className="mb-8">
          {heading(sectionLabel("experience"))}
          {cv.experiences.map((exp: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-5">
              <p className="font-medium">{String(exp.jobTitle)}</p>
              <p className="text-xs" style={{ color: theme.secondaryColor }}>
                {String(exp.company)} · {formatPreviewDateRange(exp.startDate, exp.endDate, Boolean(exp.isCurrent), cv.locale)}
              </p>
              {!!exp.description && <p className="mt-2 font-light whitespace-pre-line">{String(exp.description)}</p>}
            </div>
          ))}
        </section>
      )}

      {cv.educations.length > 0 && (
        <section className="mb-8">
          {heading(sectionLabel("education"))}
          {cv.educations.map((edu: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-3">
              <p className="font-medium">{String(edu.degree)}</p>
              <p className="text-xs" style={{ color: theme.secondaryColor }}>{String(edu.institution)}</p>
            </div>
          ))}
        </section>
      )}

      {cv.skills.length > 0 && (
        <section className="mb-8">
          {heading(sectionLabel("skills"))}
          <p className="font-light">
            {cv.skills.map((s: Record<string, unknown>) => String(s.name)).join(" · ")}
          </p>
        </section>
      )}

      {cv.projects.length > 0 && (
        <section className="mb-8">
          {heading(sectionLabel("projects"))}
          {cv.projects.map((p: Record<string, unknown>, i: number) => {
            const project = buildPreviewProject(p, cv.locale, { technologyLimit: 5, highlightLimit: 2 });

            return (
              <div key={i} className="mb-5">
                <p className="font-medium">{project.name}</p>
                {project.metaLine && <p className="mt-0.5 text-xs" style={{ color: theme.secondaryColor }}>{project.metaLine}</p>}
                {project.description && <p className="mt-1 font-light whitespace-pre-line">{project.description}</p>}
                {project.highlights.length > 0 && (
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm font-light">
                    {project.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                )}
                {project.signalLine && <p className="mt-2 text-xs" style={{ color: theme.secondaryColor }}>{project.signalLine}</p>}
                {project.technologies.length > 0 && (
                  <p className="mt-1 text-xs" style={{ color: theme.secondaryColor }}>
                    {project.technologies.join(" · ")}{project.extraTechnologyCount > 0 ? ` · +${project.extraTechnologyCount}` : ""}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {cv.certifications.length > 0 && (
        <section className="mb-8">
          {heading(sectionLabel("certifications"))}
          {cv.certifications.map((c: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-2">
              <p className="font-medium">{String(c.name)}</p>
              {!!c.issuingOrganization && <p className="text-xs" style={{ color: theme.secondaryColor }}>{String(c.issuingOrganization)}</p>}
            </div>
          ))}
        </section>
      )}

      {cv.languages.length > 0 && (
        <section className="mb-8">
          {heading(sectionLabel("languages"))}
          <p className="font-light">
            {cv.languages.map((l: Record<string, unknown>) => `${String(l.name)} (${String(l.proficiency)})`).join(" · ")}
          </p>
        </section>
      )}

      {cv.volunteerExperiences.length > 0 && (
        <section className="mb-8">
          {heading(sectionLabel("volunteering"))}
          {cv.volunteerExperiences.map((v: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-4">
              <p className="font-medium">{String(v.role)}</p>
              <p className="text-xs" style={{ color: theme.secondaryColor }}>
                {String(v.organization)} · {formatPreviewDateRange(v.startDate, v.endDate, false, cv.locale)}
              </p>
              {!!v.description && <p className="mt-1 font-light whitespace-pre-line">{String(v.description)}</p>}
            </div>
          ))}
        </section>
      )}

      {cv.publications.length > 0 && (
        <section className="mb-8">
          {heading(sectionLabel("publications"))}
          {cv.publications.map((p: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-2">
              <p className="font-medium">{String(p.title)}</p>
              {!!p.publisher && <p className="text-xs" style={{ color: theme.secondaryColor }}>{String(p.publisher)}</p>}
            </div>
          ))}
        </section>
      )}

      {cv.awards.length > 0 && (
        <section className="mb-8">
          {heading(sectionLabel("awards"))}
          {cv.awards.map((a: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-2">
              <p className="font-medium">{String(a.title)}</p>
              {!!a.issuer && <p className="text-xs" style={{ color: theme.secondaryColor }}>{String(a.issuer)}</p>}
            </div>
          ))}
        </section>
      )}

      {cv.references.length > 0 && (
        <section className="mb-8">
          {heading(sectionLabel("references"))}
          {cv.references.map((r: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-2">
              <p className="font-medium">{String(r.name)} — {String(r.title)}, {String(r.company)}</p>
              {!!r.email && <p className="text-xs" style={{ color: theme.secondaryColor }}>{String(r.email)}</p>}
            </div>
          ))}
        </section>
      )}

      {cv.hobbies.length > 0 && (
        <section className="mb-8">
          {heading(sectionLabel("hobbies"))}
          <p className="font-light">
            {cv.hobbies.map((h: Record<string, unknown>) => String(h.name)).join(" · ")}
          </p>
        </section>
      )}
    </div>
  );
}
