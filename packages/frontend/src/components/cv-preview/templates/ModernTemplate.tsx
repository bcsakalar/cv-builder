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

export function ModernTemplate({ cv, theme }: TemplateProps) {
  const pi = cv.personalInfo as Record<string, string> | null;
  const photoUrl = resolveProfilePhotoUrl(pi);
  const sectionLabel = (sectionKey: string) => getSectionLabelForLocale(sectionKey, cv.locale);
  const languageProficiencyLabel = (value: unknown) =>
    getLanguageProficiencyLabelForLocale(typeof value === "string" ? value : undefined, cv.locale);

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
      {/* Header with colored bar */}
      <div className="flex items-center gap-5 p-8 pb-4" style={{ borderBottom: `3px solid ${theme.primaryColor}` }}>
        {photoUrl && (
          <img src={photoUrl} alt={translateForLocale(cv.locale, "upload.profileAlt")} className="h-20 w-20 rounded-full object-cover" />
        )}
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: theme.headingFont, color: theme.primaryColor }}>
            {pi?.firstName ?? ""} {pi?.lastName ?? ""}
          </h1>
          {pi?.professionalTitle && (
            <p className="mt-1 text-lg" style={{ color: theme.secondaryColor }}>
              {pi.professionalTitle}
            </p>
          )}
          <PreviewContactItems
            personalInfo={pi}
            className="mt-3 flex flex-wrap gap-4 text-xs"
            itemClassName="break-all"
            style={{ color: theme.secondaryColor }}
          />
        </div>
      </div>

      <div className={theme.layout === "two-column" ? "flex gap-6 p-8" : "p-8 space-y-6"}>
        <div className={theme.layout === "two-column" ? "flex-1" : ""}>
          {cv.summary?.content && (
            <Section title={sectionLabel("summary")} color={theme.primaryColor} font={theme.headingFont}>
              <p className="whitespace-pre-line">{cv.summary.content}</p>
            </Section>
          )}

          {cv.coverLetter?.content && (
            <Section title={sectionLabel("coverLetter")} color={theme.primaryColor} font={theme.headingFont}>
              <p className="whitespace-pre-line">{cv.coverLetter.content}</p>
            </Section>
          )}

          {cv.experiences.length > 0 && (
            <Section title={sectionLabel("experience")} color={theme.primaryColor} font={theme.headingFont}>
              {cv.experiences.map((exp: Record<string, unknown>, i: number) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between">
                    <strong>{String(exp.jobTitle)}</strong>
                    <span className="text-xs" style={{ color: theme.secondaryColor }}>
                      {formatPreviewDateRange(exp.startDate, exp.endDate, Boolean(exp.isCurrent), cv.locale)}
                    </span>
                  </div>
                  <p style={{ color: theme.secondaryColor }}>{String(exp.company)}</p>
                  {!!exp.description && <p className="mt-1 whitespace-pre-line">{String(exp.description)}</p>}
                </div>
              ))}
            </Section>
          )}

          {cv.educations.length > 0 && (
            <Section title={sectionLabel("education")} color={theme.primaryColor} font={theme.headingFont}>
              {cv.educations.map((edu: Record<string, unknown>, i: number) => (
                <div key={i} className="mb-2">
                  <strong>{String(edu.degree)}</strong>
                  <p style={{ color: theme.secondaryColor }}>{String(edu.institution)}</p>
                </div>
              ))}
            </Section>
          )}

          {cv.projects.length > 0 && (
            <Section title={sectionLabel("projects")} color={theme.primaryColor} font={theme.headingFont}>
              {cv.projects.map((p: Record<string, unknown>, i: number) => {
                const project = buildPreviewProject(p, cv.locale, { technologyLimit: 8, highlightLimit: 4 });

                return (
                  <div key={i} className="mb-4">
                    <strong>{project.name}</strong>
                    {project.metaLine && <p className="mt-0.5 text-xs" style={{ color: theme.secondaryColor }}>{project.metaLine}</p>}
                    {project.description && <p className="mt-1 whitespace-pre-line">{project.description}</p>}
                    {project.highlights.length > 0 && (
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                        {project.highlights.map((highlight) => (
                          <li key={highlight}>{highlight}</li>
                        ))}
                      </ul>
                    )}
                    {project.signalLine && <p className="mt-2 text-xs font-medium" style={{ color: theme.secondaryColor }}>{project.signalLine}</p>}
                    {project.technologies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {project.technologies.map((technology) => (
                          <span key={technology} className="rounded px-1.5 py-0.5 text-xs" style={{ backgroundColor: `${theme.primaryColor}10`, color: theme.primaryColor }}>{technology}</span>
                        ))}
                        {project.extraTechnologyCount > 0 && (
                          <span className="rounded px-1.5 py-0.5 text-xs" style={{ backgroundColor: `${theme.primaryColor}08`, color: theme.secondaryColor }}>+{project.extraTechnologyCount}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </Section>
          )}

          {cv.volunteerExperiences.length > 0 && (
            <Section title={sectionLabel("volunteering")} color={theme.primaryColor} font={theme.headingFont}>
              {cv.volunteerExperiences.map((v: Record<string, unknown>, i: number) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between">
                    <strong>{String(v.role)}</strong>
                    <span className="text-xs" style={{ color: theme.secondaryColor }}>
                      {formatPreviewDateRange(v.startDate, v.endDate, false, cv.locale)}
                    </span>
                  </div>
                  <p style={{ color: theme.secondaryColor }}>{String(v.organization)}</p>
                  {!!v.description && <p className="mt-1 whitespace-pre-line">{String(v.description)}</p>}
                </div>
              ))}
            </Section>
          )}

          {cv.publications.length > 0 && (
            <Section title={sectionLabel("publications")} color={theme.primaryColor} font={theme.headingFont}>
              {cv.publications.map((p: Record<string, unknown>, i: number) => (
                <div key={i} className="mb-2">
                  <strong>{String(p.title)}</strong>
                  {!!p.publisher && <span style={{ color: theme.secondaryColor }}> — {String(p.publisher)}</span>}
                </div>
              ))}
            </Section>
          )}

          {cv.awards.length > 0 && (
            <Section title={sectionLabel("awards")} color={theme.primaryColor} font={theme.headingFont}>
              {cv.awards.map((a: Record<string, unknown>, i: number) => (
                <div key={i} className="mb-2">
                  <strong>{String(a.title)}</strong>
                  {!!a.issuer && <span style={{ color: theme.secondaryColor }}> — {String(a.issuer)}</span>}
                </div>
              ))}
            </Section>
          )}

          {cv.references.length > 0 && (
            <Section title={sectionLabel("references")} color={theme.primaryColor} font={theme.headingFont}>
              {cv.references.map((r: Record<string, unknown>, i: number) => (
                <div key={i} className="mb-2">
                  <strong>{String(r.name)}</strong> — {String(r.title)}, {String(r.company)}
                  {!!r.email && <p className="text-xs" style={{ color: theme.secondaryColor }}>{String(r.email)}</p>}
                </div>
              ))}
            </Section>
          )}
        </div>

        {theme.layout === "two-column" && (
          <div className="w-1/3">
            {cv.skills.length > 0 && (
              <Section title={sectionLabel("skills")} color={theme.primaryColor} font={theme.headingFont}>
                <div className="flex flex-wrap gap-1.5">
                  {cv.skills.map((s: Record<string, unknown>, i: number) => (
                    <span key={i} className="rounded px-2 py-0.5 text-xs" style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}>
                      {String(s.name)}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {cv.languages.length > 0 && (
              <Section title={sectionLabel("languages")} color={theme.primaryColor} font={theme.headingFont}>
                {cv.languages.map((l: Record<string, unknown>, i: number) => (
                  <p key={i}>{String(l.name)} <span className="text-xs" style={{ color: theme.secondaryColor }}>({languageProficiencyLabel(l.proficiency)})</span></p>
                ))}
              </Section>
            )}

            {cv.certifications.length > 0 && (
              <Section title={sectionLabel("certifications")} color={theme.primaryColor} font={theme.headingFont}>
                {cv.certifications.map((c: Record<string, unknown>, i: number) => (
                  <div key={i} className="mb-2">
                    <p className="font-medium text-sm">{String(c.name)}</p>
                    {!!c.issuingOrganization && <p className="text-xs" style={{ color: theme.secondaryColor }}>{String(c.issuingOrganization)}</p>}
                  </div>
                ))}
              </Section>
            )}

            {cv.hobbies.length > 0 && (
              <Section title={sectionLabel("hobbies")} color={theme.primaryColor} font={theme.headingFont}>
                <div className="flex flex-wrap gap-1.5">
                  {cv.hobbies.map((h: Record<string, unknown>, i: number) => (
                    <span key={i} className="rounded px-2 py-0.5 text-xs" style={{ backgroundColor: `${theme.primaryColor}10` }}>
                      {String(h.name)}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {theme.layout !== "two-column" && (
          <>
            {cv.skills.length > 0 && (
              <Section title={sectionLabel("skills")} color={theme.primaryColor} font={theme.headingFont}>
                <div className="flex flex-wrap gap-1.5">
                  {cv.skills.map((s: Record<string, unknown>, i: number) => (
                    <span key={i} className="rounded px-2 py-0.5 text-xs" style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}>
                      {String(s.name)}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {cv.certifications.length > 0 && (
              <Section title={sectionLabel("certifications")} color={theme.primaryColor} font={theme.headingFont}>
                {cv.certifications.map((c: Record<string, unknown>, i: number) => (
                  <div key={i} className="mb-2">
                    <strong>{String(c.name)}</strong>
                    {!!c.issuingOrganization && <span style={{ color: theme.secondaryColor }}> — {String(c.issuingOrganization)}</span>}
                  </div>
                ))}
              </Section>
            )}

            {cv.languages.length > 0 && (
              <Section title={sectionLabel("languages")} color={theme.primaryColor} font={theme.headingFont}>
                <p>{cv.languages.map((l: Record<string, unknown>) => `${String(l.name)} (${languageProficiencyLabel(l.proficiency)})`).join(", ")}</p>
              </Section>
            )}

            {cv.hobbies.length > 0 && (
              <Section title={sectionLabel("hobbies")} color={theme.primaryColor} font={theme.headingFont}>
                <p>{cv.hobbies.map((h: Record<string, unknown>) => String(h.name)).join(", ")}</p>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, color, font, children }: { title: string; color: string; font: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="mb-2 border-b pb-1 text-sm font-bold uppercase tracking-wider" style={{ fontFamily: font, color, borderColor: `${color}30` }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
