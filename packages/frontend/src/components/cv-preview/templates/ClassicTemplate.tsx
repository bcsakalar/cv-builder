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

export function ClassicTemplate({ cv, theme }: TemplateProps) {
  const pi = cv.personalInfo as Record<string, string> | null;
  const photoUrl = resolveProfilePhotoUrl(pi);
  const sectionLabel = (sectionKey: string) => getSectionLabelForLocale(sectionKey, cv.locale);
  const languageProficiencyLabel = (value: unknown) =>
    getLanguageProficiencyLabelForLocale(typeof value === "string" ? value : undefined, cv.locale);

  const heading = (title: string) => (
    <>
      <h2 className="mb-1 text-sm font-bold uppercase tracking-widest" style={{ fontFamily: `"${theme.headingFont}", serif` }}>
        {title}
      </h2>
      <hr className="mb-2" style={{ borderColor: theme.secondaryColor }} />
    </>
  );

  return (
    <div
      className="mx-auto max-w-[210mm] rounded-lg shadow-sm"
      style={{
        fontFamily: `"${theme.bodyFont}", "Times New Roman", serif`,
        fontSize: `${theme.fontSize}px`,
        color: theme.textColor,
        backgroundColor: theme.bgColor,
        padding: "2.5rem",
      }}
    >
      {/* Centered header */}
      <header className="mb-6 text-center">
        {photoUrl && (
          <img src={photoUrl} alt={translateForLocale(cv.locale, "upload.profileAlt")} className="mx-auto mb-3 h-20 w-20 rounded-full object-cover" />
        )}
        <h1 className="text-3xl font-bold" style={{ fontFamily: `"${theme.headingFont}", serif` }}>
          {pi?.firstName ?? ""} {pi?.lastName ?? ""}
        </h1>
        {pi?.professionalTitle && (
          <p className="mt-1 text-sm italic" style={{ color: theme.secondaryColor }}>
            {pi.professionalTitle}
          </p>
        )}
        <PreviewContactItems
          personalInfo={pi}
          className="mt-2 flex flex-wrap justify-center gap-3 text-xs"
          itemClassName="break-all"
          style={{ color: theme.secondaryColor }}
        />
        <hr className="mt-4" style={{ borderColor: theme.textColor }} />
      </header>

      {cv.summary?.content && (
        <section className="mb-5">
          {heading(sectionLabel("summary"))}
          <p className="whitespace-pre-line text-justify">{cv.summary.content}</p>
        </section>
      )}

      {cv.coverLetter?.content && (
        <section className="mb-5">
          {heading(sectionLabel("coverLetter"))}
          <p className="whitespace-pre-line text-justify">{cv.coverLetter.content}</p>
        </section>
      )}

      {cv.experiences.length > 0 && (
        <section className="mb-5">
          {heading(sectionLabel("experience"))}
          {cv.experiences.map((exp: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between">
                <strong>{String(exp.jobTitle)}</strong>
                <em className="text-xs">{formatPreviewDateRange(exp.startDate, exp.endDate, Boolean(exp.isCurrent), cv.locale)}</em>
              </div>
              <p className="italic" style={{ color: theme.secondaryColor }}>{String(exp.company)}</p>
              {!!exp.description && <p className="mt-1 whitespace-pre-line">{String(exp.description)}</p>}
            </div>
          ))}
        </section>
      )}

      {cv.educations.length > 0 && (
        <section className="mb-5">
          {heading(sectionLabel("education"))}
          {cv.educations.map((edu: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between">
                <strong>{String(edu.degree)}{edu.fieldOfStudy ? ` — ${String(edu.fieldOfStudy)}` : ""}</strong>
                <em className="text-xs">{formatPreviewDateRange(edu.startDate, edu.endDate, Boolean(edu.isCurrent), cv.locale)}</em>
              </div>
              <p className="italic" style={{ color: theme.secondaryColor }}>{String(edu.institution)}</p>
            </div>
          ))}
        </section>
      )}

      {cv.skills.length > 0 && (
        <section className="mb-5">
          {heading(sectionLabel("skills"))}
          <p>{cv.skills.map((s: Record<string, unknown>) => String(s.name)).join(", ")}</p>
        </section>
      )}

      {cv.projects.length > 0 && (
        <section className="mb-5">
          {heading(sectionLabel("projects"))}
          {cv.projects.map((p: Record<string, unknown>, i: number) => {
            const project = buildPreviewProject(p, cv.locale, { technologyLimit: 8, highlightLimit: 4 });

            return (
              <div key={i} className="mb-4">
                <strong>{project.name}</strong>
                {project.metaLine && <p className="mt-0.5 text-xs italic" style={{ color: theme.secondaryColor }}>{project.metaLine}</p>}
                {project.description && <p className="mt-1 whitespace-pre-line">{project.description}</p>}
                {project.highlights.length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {project.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                )}
                {project.signalLine && <p className="mt-1 text-xs" style={{ color: theme.secondaryColor }}>{project.signalLine}</p>}
                {project.technologies.length > 0 && (
                  <p className="mt-1 text-xs" style={{ color: theme.secondaryColor }}>
                    {project.technologies.join(", ")}{project.extraTechnologyCount > 0 ? `, +${project.extraTechnologyCount}` : ""}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {cv.certifications.length > 0 && (
        <section className="mb-5">
          {heading(sectionLabel("certifications"))}
          {cv.certifications.map((c: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-2">
              <strong>{String(c.name)}</strong>
              {!!c.issuingOrganization && <span className="italic" style={{ color: theme.secondaryColor }}> — {String(c.issuingOrganization)}</span>}
            </div>
          ))}
        </section>
      )}

      {cv.languages.length > 0 && (
        <section className="mb-5">
          {heading(sectionLabel("languages"))}
          <p>{cv.languages.map((l: Record<string, unknown>) => `${String(l.name)}${l.proficiency ? ` (${languageProficiencyLabel(l.proficiency)})` : ""}`).join(", ")}</p>
        </section>
      )}

      {cv.volunteerExperiences.length > 0 && (
        <section className="mb-5">
          {heading(sectionLabel("volunteering"))}
          {cv.volunteerExperiences.map((v: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between">
                <strong>{String(v.role)}</strong>
                <em className="text-xs">{formatPreviewDateRange(v.startDate, v.endDate, false, cv.locale)}</em>
              </div>
              <p className="italic" style={{ color: theme.secondaryColor }}>{String(v.organization)}</p>
              {!!v.description && <p className="mt-1 whitespace-pre-line">{String(v.description)}</p>}
            </div>
          ))}
        </section>
      )}

      {cv.publications.length > 0 && (
        <section className="mb-5">
          {heading(sectionLabel("publications"))}
          {cv.publications.map((p: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-2">
              <strong>{String(p.title)}</strong>
              {!!p.publisher && <span className="italic" style={{ color: theme.secondaryColor }}> — {String(p.publisher)}</span>}
            </div>
          ))}
        </section>
      )}

      {cv.awards.length > 0 && (
        <section className="mb-5">
          {heading(sectionLabel("awards"))}
          {cv.awards.map((a: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-2">
              <strong>{String(a.title)}</strong>
              {!!a.issuer && <span className="italic" style={{ color: theme.secondaryColor }}> — {String(a.issuer)}</span>}
            </div>
          ))}
        </section>
      )}

      {cv.references.length > 0 && (
        <section className="mb-5">
          {heading(sectionLabel("references"))}
          {cv.references.map((r: Record<string, unknown>, i: number) => (
            <div key={i} className="mb-2">
              <strong>{String(r.name)}</strong> — {String(r.title)}, {String(r.company)}
              {!!r.email && <p className="text-xs" style={{ color: theme.secondaryColor }}>{String(r.email)}</p>}
            </div>
          ))}
        </section>
      )}

      {cv.hobbies.length > 0 && (
        <section className="mb-5">
          {heading(sectionLabel("hobbies"))}
          <p>{cv.hobbies.map((h: Record<string, unknown>) => String(h.name)).join(", ")}</p>
        </section>
      )}
    </div>
  );
}
