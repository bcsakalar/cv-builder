// ═══════════════════════════════════════════════════════════
// PDF HTML Template Renderer
// ═══════════════════════════════════════════════════════════

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  bgColor: string;
  headingFont: string;
  bodyFont: string;
  fontSize: number;
  layout: string;
}

type ThemeOverride = Partial<ThemeConfig> & {
  backgroundColor?: string;
  customFontSize?: number;
  fontSize?: number | "small" | "medium" | "large" | "custom";
};

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#2563eb",
  secondaryColor: "#64748b",
  accentColor: "#f59e0b",
  textColor: "#1e293b",
  bgColor: "#ffffff",
  headingFont: "Inter",
  bodyFont: "Inter",
  fontSize: 11,
  layout: "single",
};

function esc(str: unknown): string {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveFontSize(fontSize: unknown, customFontSize?: unknown): number {
  if (typeof fontSize === "number" && Number.isFinite(fontSize)) {
    return fontSize;
  }

  if (fontSize === "small") return 10;
  if (fontSize === "large") return 12;
  if (fontSize === "custom" && typeof customFontSize === "number" && Number.isFinite(customFontSize)) {
    return customFontSize;
  }

  return DEFAULT_THEME.fontSize;
}

function resolveTheme(themeOverride?: ThemeOverride): ThemeConfig {
  if (!themeOverride) {
    return DEFAULT_THEME;
  }

  return {
    ...DEFAULT_THEME,
    ...themeOverride,
    bgColor:
      typeof themeOverride.bgColor === "string" && themeOverride.bgColor.trim().length > 0
        ? themeOverride.bgColor
        : typeof themeOverride.backgroundColor === "string" && themeOverride.backgroundColor.trim().length > 0
        ? themeOverride.backgroundColor
        : DEFAULT_THEME.bgColor,
    fontSize: resolveFontSize(themeOverride.fontSize, themeOverride.customFontSize),
  };
}

function getPdfLocale(cv: { locale?: string | null }): "tr" | "en" {
  return String(cv.locale ?? "en").toLowerCase().startsWith("tr") ? "tr" : "en";
}

function getPdfLabels(locale: "tr" | "en") {
  if (locale === "tr") {
    return {
      summary: "Profesyonel Özet",
      coverLetter: "Ön Yazı",
      experience: "Deneyim",
      education: "Eğitim",
      skills: "Yetenekler",
      projects: "Projeler",
      certifications: "Sertifikalar",
      languages: "Diller",
      technologies: "Teknolojiler",
      present: "Devam Ediyor",
    };
  }

  return {
    summary: "Professional Summary",
    coverLetter: "Cover Letter",
    experience: "Work Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    certifications: "Certifications",
    languages: "Languages",
    technologies: "Technologies",
    present: "Present",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderCVToHTML(cv: any, _templateName: string, themeOverride?: ThemeOverride): string {
  const theme = resolveTheme(themeOverride);
  const pi = cv.personalInfo ?? {};
  const locale = getPdfLocale(cv);
  const labels = getPdfLabels(locale);

  const sections: string[] = [];

  // Header
  sections.push(`
    <header style="margin-bottom:24px;border-bottom:3px solid ${theme.primaryColor};padding-bottom:16px">
      <h1 style="font-family:${theme.headingFont},sans-serif;font-size:28px;margin:0;color:${theme.textColor}">
        ${esc(pi.firstName)} ${esc(pi.lastName)}
      </h1>
      ${pi.professionalTitle ? `<p style="color:${theme.secondaryColor};margin:4px 0 0">${esc(pi.professionalTitle)}</p>` : ""}
      <div style="margin-top:8px;font-size:10px;color:${theme.secondaryColor}">
        ${[pi.email, pi.phone, pi.city, pi.website].filter(Boolean).map(esc).join(" &bull; ")}
      </div>
    </header>
  `);

  // Summary
  if (cv.summary?.content) {
    sections.push(sectionBlock(labels.summary, cv.summary.content, theme));
  }

  // Cover Letter
  if (cv.coverLetter?.content) {
    sections.push(sectionBlock(labels.coverLetter, cv.coverLetter.content, theme));
  }

  // Experience
  if (cv.experiences?.length) {
    const items = cv.experiences
      .map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <strong>${esc(e.jobTitle)}</strong>
          <span style="font-size:10px;color:${theme.secondaryColor}">${esc(e.startDate)} – ${e.isCurrent ? labels.present : esc(e.endDate)}</span>
        </div>
        <div style="color:${theme.primaryColor};font-size:12px">${esc(e.company)}${e.location ? ` | ${esc(e.location)}` : ""}</div>
        ${e.description ? `<p style="margin:4px 0 0;white-space:pre-line">${esc(e.description)}</p>` : ""}
      </div>`
      )
      .join("");
    sections.push(sectionHeading(labels.experience, theme) + items);
  }

  // Education
  if (cv.educations?.length) {
    const items = cv.educations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => `
      <div style="margin-bottom:8px">
        <strong>${esc(e.degree)}${e.fieldOfStudy ? ` — ${esc(e.fieldOfStudy)}` : ""}</strong>
        <div style="font-size:11px;color:${theme.secondaryColor}">${esc(e.institution)}</div>
      </div>`
      )
      .join("");
    sections.push(sectionHeading(labels.education, theme) + items);
  }

  // Skills
  if (cv.skills?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tags = cv.skills.map((s: any) => `<span style="display:inline-block;background:${theme.primaryColor}15;color:${theme.primaryColor};padding:2px 8px;border-radius:4px;margin:2px;font-size:10px">${esc(s.name)}</span>`).join("");
    sections.push(sectionHeading(labels.skills, theme) + `<div>${tags}</div>`);
  }

  // Projects
  if (cv.projects?.length) {
    const items = cv.projects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => `<div style="margin-bottom:10px"><strong>${esc(p.name)}</strong>${p.description ? `<p style="margin:2px 0">${esc(p.description)}</p>` : ""}${Array.isArray(p.technologies) && p.technologies.length > 0 ? `<p style="margin:4px 0 0;font-size:10px;color:${theme.secondaryColor}">${labels.technologies}: ${p.technologies.map(esc).join(", ")}</p>` : ""}</div>`)
      .join("");
    sections.push(sectionHeading(labels.projects, theme) + items);
  }

  // Certifications
  if (cv.certifications?.length) {
    const items = cv.certifications
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => `<div>${esc(c.name)}${c.issuingOrganization ? ` — <span style="color:${theme.secondaryColor}">${esc(c.issuingOrganization)}</span>` : ""}</div>`)
      .join("");
    sections.push(sectionHeading(labels.certifications, theme) + items);
  }

  // Languages
  if (cv.languages?.length) {
    const items = cv.languages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((l: any) => `${esc(l.name)}${l.proficiency ? ` (${esc(l.proficiency)})` : ""}`)
      .join(" &bull; ");
    sections.push(sectionHeading(labels.languages, theme) + `<p>${items}</p>`);
  }

  const body = sections.join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(cv.title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${theme.bodyFont}, -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: ${theme.fontSize}px;
      color: ${theme.textColor};
      background: ${theme.bgColor};
      line-height: 1.6;
    }
    h1, h2, h3 { font-family: ${theme.headingFont}, sans-serif; }
    .cv-container { max-width: 800px; margin: 0 auto; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="cv-container">${body}</div>
</body>
</html>`;
}

function sectionHeading(title: string, theme: ThemeConfig): string {
  return `<h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${theme.primaryColor};border-bottom:2px solid ${theme.primaryColor};padding-bottom:4px;margin:20px 0 10px">${esc(title)}</h2>`;
}

function sectionBlock(title: string, content: string, theme: ThemeConfig): string {
  return `
    <section style="margin-bottom:16px">
      ${sectionHeading(title, theme)}
      <p style="white-space:pre-line">${esc(content)}</p>
    </section>
  `;
}
