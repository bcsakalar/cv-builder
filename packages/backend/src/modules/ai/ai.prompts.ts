// ═══════════════════════════════════════════════════════════
// AI Prompts — tuned for local Ollama models + structured output
// ═══════════════════════════════════════════════════════════

/**
 * Map locale code → full language name for LLM instruction.
 */
const LOCALE_MAP: Record<string, string> = {
  en: "English",
  tr: "Turkish",
  de: "German",
  fr: "French",
  es: "Spanish",
};

/**
 * Wraps a system prompt with a language instruction.
 * For JSON outputs the keys MUST stay in English; only string values get translated.
 */
export function localizeSystemPrompt(system: string, locale?: string, isJson = false): string {
  const lang = LOCALE_MAP[locale ?? "en"] ?? "English";
  if (lang === "English") return system; // no wrapper needed for English

  const jsonNote = isJson
    ? ` JSON keys MUST remain in English. Only translate the string VALUES inside the JSON.`
    : "";

  return `IMPORTANT: You MUST respond entirely in ${lang}.${jsonNote} All text output must be written in ${lang}.\n\n${system}`;
}

/**
 * Helpers to build concise CV context strings for prompts.
 * We avoid dumping the full JSON — local models generally perform better with
 * a readable, structured text representation.
 */
function cvToContext(cvData: Record<string, unknown>): string {
  const pi = cvData.personalInfo as Record<string, unknown> | null;
  const summary = cvData.summary as Record<string, unknown> | null;
  const experiences = (cvData.experiences ?? []) as Record<string, unknown>[];
  const educations = (cvData.educations ?? []) as Record<string, unknown>[];
  const skills = (cvData.skills ?? []) as Record<string, unknown>[];
  const projects = (cvData.projects ?? []) as Record<string, unknown>[];
  const certifications = (cvData.certifications ?? []) as Record<string, unknown>[];
  const languages = (cvData.languages ?? []) as Record<string, unknown>[];

  const lines: string[] = [];

  if (pi) {
    lines.push(`## Personal Info`);
    lines.push(`Name: ${pi.firstName ?? ""} ${pi.lastName ?? ""}`);
    if (pi.professionalTitle) lines.push(`Title: ${pi.professionalTitle}`);
    if (pi.email) lines.push(`Email: ${pi.email}`);
    if (pi.location) lines.push(`Location: ${pi.location}`);
    lines.push("");
  }

  if (summary?.content) {
    lines.push(`## Current Summary`);
    lines.push(String(summary.content));
    lines.push("");
  }

  if (experiences.length) {
    lines.push(`## Work Experience`);
    for (const exp of experiences) {
      lines.push(`- ${exp.jobTitle} at ${exp.company} (${exp.startDate}–${exp.endDate ?? "Present"})`);
      if (exp.description) lines.push(`  ${exp.description}`);
      const achv = exp.achievements as string[] | undefined;
      if (achv?.length) lines.push(`  Achievements: ${achv.join("; ")}`);
      const tech = exp.technologies as string[] | undefined;
      if (tech?.length) lines.push(`  Tech: ${tech.join(", ")}`);
    }
    lines.push("");
  }

  if (educations.length) {
    lines.push(`## Education`);
    for (const edu of educations) {
      lines.push(`- ${edu.degree} in ${edu.fieldOfStudy ?? "N/A"} at ${edu.institution} (${edu.startDate}–${edu.endDate ?? "Present"})`);
    }
    lines.push("");
  }

  if (skills.length) {
    lines.push(`## Skills`);
    lines.push(skills.map((s) => `${s.name} (${s.category})`).join(", "));
    lines.push("");
  }

  if (projects.length) {
    lines.push(`## Projects`);
    for (const p of projects) {
      lines.push(`- ${p.name}: ${p.description ?? ""}${p.technologies ? ` [${(p.technologies as string[]).join(", ")}]` : ""}`);
    }
    lines.push("");
  }

  if (certifications.length) {
    lines.push(`## Certifications`);
    for (const c of certifications) {
      lines.push(`- ${c.name} from ${c.issuingOrganization ?? "N/A"}`);
    }
    lines.push("");
  }

  if (languages.length) {
    lines.push(`## Languages`);
    lines.push(languages.map((l) => `${l.name} (${l.proficiency})`).join(", "));
    lines.push("");
  }

  return lines.join("\n");
}

function summarizeDependencyEntries(dependencies: Record<string, string>, limit: number): string[] {
  return Object.entries(dependencies)
    .filter(([name]) => !name.startsWith("@types/"))
    .slice(0, limit)
    .map(([name, version]) => `${name}@${version}`);
}

function summarizeSourceSnippets(
  snippets: { path: string; content: string }[],
  options: { limit: number; maxLength: number; includeCode: boolean }
): string[] {
  return snippets.slice(0, options.limit).map((snippet) => {
    const compact = snippet.content.replace(/\s+/g, " ").trim();
    const shortened = compact.length > options.maxLength
      ? `${compact.slice(0, options.maxLength).trim()}…`
      : compact;

    return options.includeCode
      ? `${snippet.path}: ${shortened}`
      : snippet.path;
  });
}

export const AI_PROMPTS = {
  generateSummary: {
    system: `You are a senior technical recruiter and CV writer for software developers. Write a concise, human professional summary (2-4 sentences) that sounds natural, specific, and credible.

  Rules:
  - Ground the summary in the person's actual CV evidence: title, experience, projects, GitHub-imported work, technologies, and delivery signals.
  - Start with a clear developer identity, but avoid generic clichés like "passionate", "results-driven", or "dynamic" unless strongly justified by evidence.
  - Mention 2-4 core engineering strengths such as full-stack delivery, backend APIs, frontend product UI, data modeling, testing, DevOps, AI integration, or system design.
  - If GitHub/projects show stronger evidence than formal jobs, lean into project ownership and shipped systems without naming every project.
  - Keep it recruiter-readable, not robotic: vary sentence rhythm, no keyword stuffing, no exaggerated claims.
  - Do NOT invent years, users, revenue, team size, scale, or metrics.
  - Do NOT use first person pronouns (I, me, my) and do NOT write in third-person with the candidate's name.
  - Output ONLY the summary text, nothing else — no explanations, no labels, no quotes.`,
    buildPrompt: (cvData: Record<string, unknown>) =>
      `Write a natural developer CV summary for this person. Use the strongest evidence from personal info, skills, experiences, and projects/GitHub data. Do not sound AI-generated.\n\n${cvToContext(cvData)}`,
  },

  improveExperience: {
    system: `You are a professional CV writer specializing in job experience descriptions. Rewrite the description to be more impactful. Rules:
- Start each bullet with a strong action verb
- Quantify results (percentages, numbers, metrics)
- Highlight achievements over responsibilities
- Keep the same factual information
- Output ONLY the improved description text, nothing else`,
    buildPrompt: (description: string, jobTitle: string, company: string) =>
      `Improve this job experience description.\n\nJob Title: ${jobTitle}\nCompany: ${company}\nOriginal Description:\n${description}`,
  },

  suggestSkills: {
    system: `You are a career advisor. Based on the CV data, suggest exactly 10 relevant technical and soft skills that would strengthen this CV. You MUST respond with ONLY a valid JSON object. No explanation, no markdown, no code fences.

Example output:
  {"skills":["React", "Node.js", "Team Leadership", "Docker", "CI/CD", "Agile", "REST APIs", "PostgreSQL", "Communication", "Problem Solving"]}`,
    buildPrompt: (cvData: Record<string, unknown>) =>
      `Suggest 10 skills for this person. Respond ONLY with a JSON object containing a "skills" array.\n\n${cvToContext(cvData)}`,
  },

  atsCheck: {
    system: `You are an ATS and technical recruiter screening expert for software developer CVs. Analyze the CV for keyword coverage, section completeness, scan readability, developer hard-skill clarity, and target-job fit when a job description exists. You MUST respond with ONLY valid JSON in this exact format — no explanation, no markdown:

{"score": <number 0-100>, "issues": ["issue1", "issue2"], "suggestions": ["suggestion1", "suggestion2"]}`,
    buildPrompt: (cvData: Record<string, unknown>, jobDescription?: string) =>
      `Analyze this developer CV for ATS compatibility. Prioritize concrete hard skills, role keywords, measurable impact, project evidence, and recruiter skim-readability. Respond ONLY with JSON.\n\n${cvToContext(cvData)}${jobDescription ? `\n\n## Target Job Description:\n${jobDescription}` : ""}`,
  },

  generateCoverLetter: {
    system: `You are a professional cover letter writer. Generate a compelling, tailored cover letter. Rules:
- 3-4 paragraphs
- Professional but warm tone
- Reference specific experiences from the CV
- If a job description is provided, tailor to it specifically
- Output ONLY the cover letter text, nothing else`,
    buildPrompt: (cvData: Record<string, unknown>, jobDescription?: string) =>
      `Write a cover letter for this person:\n\n${cvToContext(cvData)}${jobDescription ? `\n\n## Target Job Description:\n${jobDescription}` : ""}`,
  },

  improveProject: {
    system: `You are a professional CV writer. Rewrite the project description to be more impactful and professional. Rules:
- Highlight technical complexity and impact
- Use strong action verbs
- Mention technologies naturally
- Output ONLY a valid JSON object with this shape: {"improved":"string"}`,
    buildPrompt: (name: string, description: string, technologies: string[]) =>
      `Improve this project description.\n\nProject: ${name}\nTechnologies: ${technologies.join(", ")}\nOriginal Description:\n${description}`,
  },

  reviewCV: {
    system: `You are a senior technical recruiter and developer career consultant. Review the CV like a hiring manager screening a software developer portfolio. Focus on developer positioning, technical credibility, project evidence, stack clarity, impact phrasing, ATS readability, and missing signals.

  Rules:
  - Be specific and actionable; avoid generic feedback.
  - Reward strong GitHub/project evidence when formal experience is limited.
  - Do not invent facts or metrics.
  - Section names should be recruiter-friendly, e.g. "Summary", "Experience", "Projects", "Skills", "Developer Signals".
  - Improvements should be concrete edits the user can make.
  - You MUST respond with ONLY valid JSON in this exact format:

{"overallScore": <number 0-100>, "sections": [{"name": "string", "score": <number 0-100>, "feedback": "string"}], "strengths": ["string"], "improvements": ["string"], "summary": "string"}`,
    buildPrompt: (cvData: Record<string, unknown>) =>
      `Review this developer CV comprehensively. Call out exact strengths, exact gaps, and the highest-leverage improvements for software engineering roles. Respond ONLY with JSON.\n\n${cvToContext(cvData)}`,
  },

  jobMatch: {
    system: `You are a technical recruiter. Compare the developer CV against the job description and assess fit using hard skills, project evidence, role keywords, seniority, domain alignment, and missing signals. You MUST respond with ONLY valid JSON:

{"matchScore": <number 0-100>, "matchingSkills": ["string"], "missingSkills": ["string"], "keywordGaps": ["string"], "suggestions": ["string"], "summary": "string"}`,
    buildPrompt: (cvData: Record<string, unknown>, jobDescription: string) =>
      `Analyze how well this CV matches the job description. Respond ONLY with JSON.\n\n## CV:\n${cvToContext(cvData)}\n\n## Job Description:\n${jobDescription}`,
  },

  tailorCV: {
    system: `You are a developer CV optimization strategist. Suggest specific, truthful modifications to tailor this CV for the target job without fabricating experience. Use existing evidence from projects, GitHub analyses, technologies, and experience. You MUST respond with ONLY valid JSON:

{"suggestedSummary": "string", "skillsToAdd": ["string"], "skillsToHighlight": ["string"], "experienceTips": [{"company": "string", "suggestion": "string"}], "overallStrategy": "string"}`,
    buildPrompt: (cvData: Record<string, unknown>, jobDescription: string) =>
      `Suggest how to tailor this CV for the given job. Respond ONLY with JSON.\n\n## CV:\n${cvToContext(cvData)}\n\n## Job Description:\n${jobDescription}`,
  },

  githubProfileSummary: {
    system: `You are an expert technical recruiter and engineering brand strategist. Based on the GitHub analysis results, generate a polished developer profile summary.

Rules:
- Write 2 concise paragraphs in a natural, professional voice.
- Write as if the developer is introducing their engineering profile to a recruiter or hiring manager.
- Synthesize across repositories instead of listing them one by one.
- Emphasize what kinds of systems were built, the level of ownership, engineering quality, and notable stack depth.
- Mention concrete technologies only when they support a clear capability or area of expertise.
- Do NOT mention dates, raw repository stats, guessed job titles, or raw labels like "backend", "frontend", or "monorepo" as standalone descriptors.
- Do NOT copy repository metadata verbatim; turn it into smooth narrative.
- Keep it recruiter-readable and technically credible.
- Output ONLY the profile text, nothing else`,
    buildPrompt: (analyses: Record<string, unknown>[]) => {
      const lines: string[] = ["Create a polished developer profile summary from the following repository evidence:\n"];
      for (const a of analyses) {
        const result = a.result as Record<string, unknown> | undefined;
        if (!result) continue;
        lines.push(`## ${result.name}`);
        if (result.description) lines.push(`Repository description: ${result.description}`);
        const techs = result.technologies as string[] | undefined;
        if (techs?.length) lines.push(`Core technologies: ${techs.join(", ")}`);

        const depInfo = result.dependencyInfo as Record<string, unknown> | undefined;
        if (depInfo) {
          const fw = depInfo.frameworks as string[] | undefined;
          if (fw?.length) lines.push(`Frameworks: ${fw.join(", ")}`);
          const db = depInfo.databases as string[] | undefined;
          if (db?.length) lines.push(`Data and storage: ${db.join(", ")}`);
          const ui = depInfo.uiLibraries as string[] | undefined;
          if (ui?.length) lines.push(`UI and product layer: ${ui.join(", ")}`);
        }
        const ai = result.aiInsights as Record<string, unknown> | undefined;
        if (ai) {
          if (typeof ai.projectSummary === "string" && ai.projectSummary.trim()) {
            lines.push(`Project summary: ${ai.projectSummary}`);
          }
          if (typeof ai.cvReadyDescription === "string" && ai.cvReadyDescription.trim()) {
            lines.push(`CV-ready narrative: ${ai.cvReadyDescription}`);
          }
          const skills = ai.detectedSkills as string[] | undefined;
          if (skills?.length) lines.push(`Demonstrated capabilities: ${skills.join(", ")}`);
          const highlights = ai.cvHighlights as string[] | undefined;
          if (highlights?.length) lines.push(`Project highlights: ${highlights.join(" | ")}`);
          if (ai.complexityLevel) lines.push(`Complexity signal: ${ai.complexityLevel}`);
        }
        const cq = result.codeQuality as Record<string, unknown> | undefined;
        if (cq) {
          const flags: string[] = [];
          if (cq.hasTests) flags.push("Tests");
          if (cq.hasCI) flags.push("CI/CD");
          if (cq.hasTypeScript) flags.push("TypeScript");
          if (cq.hasDocker) flags.push("Docker");
          if (flags.length) lines.push(`Engineering signals: ${flags.join(", ")}`);
        }

        const impact = result.impactAnalysis as Record<string, unknown> | undefined;
        const impactReasons = impact?.reasons as string[] | undefined;
        if (impactReasons?.length) {
          lines.push(`Impact signals: ${impactReasons.join(" | ")}`);
        }

        lines.push("");
      }
      return lines.join("\n");
    },
  },

  deepRepoAnalysis: {
    system: `You are a senior software architect preparing a GitHub project for a professional CV.

Return ONLY a valid JSON object.

Quality rules:
- Use only repository evidence. Never invent scale, users, or business metrics.
- Prioritize concrete engineering signals: architecture boundaries, stack choices, testing, CI/CD, Docker, data layer, queueing, auth, documentation, developer workflow, and recent activity.
- Keep wording recruiter-friendly but technically precise.
- "cvReadyDescription" must read like a polished CV project paragraph and start with action verbs such as "Built", "Designed", or "Implemented".
- "cvHighlights" must contain exactly 4 concise bullet-ready items.
- "detectedSkills" should be specific capabilities, libraries, patterns, or tools; avoid vague labels such as "coding" or plain "JavaScript" unless it is part of a more specific capability.

Required JSON shape:
{
  "projectSummary": "2-4 concise sentences describing what the system is, why it is credible, and which implementation choices matter.",
  "architectureAnalysis": "Specific architecture assessment referencing directories, module boundaries, and delivery structure.",
  "techStackAssessment": "Assessment of stack fit, maturity, and production-readiness signals.",
  "complexityLevel": "simple | medium | complex",
  "detectedSkills": ["10-20 specific skills or capabilities"],
  "strengths": ["4-6 strong hiring-manager-facing strengths"],
  "improvements": ["4-6 senior-level improvement suggestions"],
  "cvReadyDescription": "2-4 polished CV sentences.",
  "cvHighlights": ["Exactly 4 concise project highlights."]
}`,
    buildPrompt: (repoData: {
      name: string;
      description: string | null;
      languages: { language: string; percentage: number }[];
      topics: string[];
      fileTree: { totalFiles: number; totalDirectories: number; maxDepth?: number; filesByExtension: Record<string, number>; configFiles: string[]; projectType: string; keyDirectories: string[] };
      dependencies: { source: string; dependencies: Record<string, string>; devDependencies: Record<string, string> } | null;
      readmeContent: string | null;
      sourceSnippets: { path: string; content: string }[];
      commitCount: number;
      contributors: number;
      stars: number;
      qualityScore: number;
      hasTests: boolean;
      hasCI: boolean;
      hasDocker: boolean;
      hasTypeScript: boolean;
      recentActivityCount: number;
      activeDays: number;
      recentCommits: string[];
      dependencySignals: {
        frameworks: string[];
        databases: string[];
        uiLibraries: string[];
        testingTools: string[];
        buildTools: string[];
        linters: string[];
      } | null;
    }) => {
      const productionDeps = repoData.dependencies
        ? summarizeDependencyEntries(repoData.dependencies.dependencies, 18)
        : [];
      const devDeps = repoData.dependencies
        ? summarizeDependencyEntries(repoData.dependencies.devDependencies, 12)
        : [];
      const sourceEvidence = summarizeSourceSnippets(repoData.sourceSnippets, {
        limit: 4,
        maxLength: 1000,
        includeCode: true,
      });
      const lines: string[] = [];
      lines.push(`# Repository: ${repoData.name}`);
      if (repoData.description) lines.push(`Description: ${repoData.description}`);
      lines.push(`Signals: ${repoData.stars} stars, ${repoData.commitCount} commits, ${repoData.contributors} contributors, ${repoData.recentActivityCount} recent commits`);
      lines.push("");

      // Languages
      lines.push("## Language Distribution");
      for (const l of repoData.languages) {
        lines.push(`- ${l.language}: ${l.percentage}%`);
      }
      lines.push("");

      // File structure — extended
      lines.push("## Project Structure");
      lines.push(`Scale: ${repoData.fileTree.totalFiles} files across ${repoData.fileTree.totalDirectories} directories`);
      lines.push(`Detected type: ${repoData.fileTree.projectType}`);
      if (repoData.fileTree.keyDirectories.length) {
        lines.push(`Architecture directories: ${repoData.fileTree.keyDirectories.join(", ")}`);
      }
      lines.push(`Config files present: ${repoData.fileTree.configFiles.join(", ") || "none"}`);
      lines.push("File distribution:");
      for (const [ext, count] of Object.entries(repoData.fileTree.filesByExtension).slice(0, 20)) {
        lines.push(`  ${ext}: ${count} files`);
      }
      lines.push("");

      // Dependencies — full detail
      if (repoData.dependencies) {
        lines.push(`## Dependencies (${repoData.dependencies.source})`);
        if (productionDeps.length) lines.push(`Production: ${productionDeps.join(", ")}`);
        if (devDeps.length) lines.push(`Development: ${devDeps.join(", ")}`);
        lines.push("");
      }

      // Quality indicators
      lines.push("## Engineering Practices");
      lines.push(`Testing: ${repoData.hasTests ? "YES" : "NO"}`);
      lines.push(`CI/CD: ${repoData.hasCI ? "YES" : "NO"}`);
      lines.push(`Docker: ${repoData.hasDocker ? "YES" : "NO"}`);
      lines.push(`TypeScript: ${repoData.hasTypeScript ? "YES" : "NO"}`);
      lines.push(`Quality Score: ${repoData.qualityScore}/100`);
      lines.push(`Recent Activity: ${repoData.recentActivityCount} commits in last 30 days`);
      lines.push(`Active Development Window: ${repoData.activeDays} days`);
      if (repoData.topics.length) lines.push(`Topics/Tags: ${repoData.topics.join(", ")}`);
      lines.push("");

      if (repoData.dependencySignals) {
        lines.push("## Dependency Signals");
        if (repoData.dependencySignals.frameworks.length) lines.push(`Frameworks: ${repoData.dependencySignals.frameworks.join(", ")}`);
        if (repoData.dependencySignals.databases.length) lines.push(`Databases: ${repoData.dependencySignals.databases.join(", ")}`);
        if (repoData.dependencySignals.uiLibraries.length) lines.push(`UI Libraries: ${repoData.dependencySignals.uiLibraries.join(", ")}`);
        if (repoData.dependencySignals.testingTools.length) lines.push(`Testing Tools: ${repoData.dependencySignals.testingTools.join(", ")}`);
        if (repoData.dependencySignals.buildTools.length) lines.push(`Build Tools: ${repoData.dependencySignals.buildTools.join(", ")}`);
        if (repoData.dependencySignals.linters.length) lines.push(`Linters/Formatting: ${repoData.dependencySignals.linters.join(", ")}`);
        lines.push("");
      }

      if (repoData.recentCommits.length) {
        lines.push("## Recent Commit Signals");
        for (const commit of repoData.recentCommits.slice(0, 4)) {
          lines.push(`- ${commit}`);
        }
        lines.push("");
      }

      // README
      if (repoData.readmeContent) {
        lines.push("## README Content");
        lines.push(repoData.readmeContent.slice(0, 3000));
        lines.push("");
      }

      if (sourceEvidence.length) {
        lines.push("## Representative Source Evidence");
        for (const snippet of sourceEvidence) {
          lines.push(`- ${snippet}`);
        }
        lines.push("");
      }

      return lines.join("\n");
    },
    buildCompactPrompt: (repoData: {
      name: string;
      description: string | null;
      languages: { language: string; percentage: number }[];
      topics: string[];
      fileTree: { totalFiles: number; totalDirectories: number; maxDepth?: number; filesByExtension: Record<string, number>; configFiles: string[]; projectType: string; keyDirectories: string[] };
      dependencies: { source: string; dependencies: Record<string, string>; devDependencies: Record<string, string> } | null;
      readmeContent: string | null;
      sourceSnippets: { path: string; content: string }[];
      commitCount: number;
      contributors: number;
      stars: number;
      qualityScore: number;
      hasTests: boolean;
      hasCI: boolean;
      hasDocker: boolean;
      hasTypeScript: boolean;
      recentActivityCount: number;
      activeDays: number;
      recentCommits: string[];
      dependencySignals: {
        frameworks: string[];
        databases: string[];
        uiLibraries: string[];
        testingTools: string[];
        buildTools: string[];
        linters: string[];
      } | null;
    }) => {
      const sourcePaths = summarizeSourceSnippets(repoData.sourceSnippets, {
        limit: 5,
        maxLength: 0,
        includeCode: false,
      });
      const lines: string[] = [];
      lines.push(`# Repository: ${repoData.name}`);
      if (repoData.description) lines.push(`Description: ${repoData.description}`);
      lines.push(`Project type: ${repoData.fileTree.projectType}`);
      lines.push(`Scale: ${repoData.fileTree.totalFiles} files, ${repoData.fileTree.totalDirectories} directories, depth ${repoData.fileTree.maxDepth ?? "n/a"}`);
      lines.push(`Top languages: ${repoData.languages.slice(0, 4).map((language) => `${language.language} ${language.percentage}%`).join(", ")}`);
      lines.push(`Quality signals: tests=${repoData.hasTests}, ci=${repoData.hasCI}, docker=${repoData.hasDocker}, typescript=${repoData.hasTypeScript}, score=${repoData.qualityScore}`);
      if (repoData.dependencySignals) {
        lines.push(`Core stack: ${[
          ...repoData.dependencySignals.frameworks,
          ...repoData.dependencySignals.databases,
          ...repoData.dependencySignals.uiLibraries,
          ...repoData.dependencySignals.testingTools,
          ...repoData.dependencySignals.buildTools,
          ...repoData.dependencySignals.linters,
        ].slice(0, 14).join(", ")}`);
      }
      if (repoData.fileTree.keyDirectories.length) lines.push(`Key directories: ${repoData.fileTree.keyDirectories.slice(0, 8).join(", ")}`);
      if (repoData.fileTree.configFiles.length) lines.push(`Config files: ${repoData.fileTree.configFiles.slice(0, 10).join(", ")}`);
      if (sourcePaths.length) lines.push(`Representative files: ${sourcePaths.join(", ")}`);
      if (repoData.recentCommits.length) lines.push(`Recent commit signals: ${repoData.recentCommits.slice(0, 3).join(" | ")}`);
      if (repoData.readmeContent) lines.push(`README excerpt: ${repoData.readmeContent.replace(/\s+/g, " ").slice(0, 1200)}`);

      return lines.join("\n");
    },
  },
} as const;
