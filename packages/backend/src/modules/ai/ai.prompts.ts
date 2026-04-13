// ═══════════════════════════════════════════════════════════
// AI Prompts — Engineered for Qwen3 + structured output
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
 * We avoid dumping the full JSON — Qwen performs better with
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

export const AI_PROMPTS = {
  generateSummary: {
    system: `You are a professional CV writer. Write a concise, compelling professional summary (2-4 sentences) that serves as a personal brand statement. Rules:
- Start with the person's professional identity (e.g. "Experienced Full-Stack Developer", "Results-driven Software Engineer")
- Mention years of experience or seniority level if inferable from the CV timeline
- Highlight 2-3 core expertise areas or technologies they specialize in
- End with their value proposition — what unique value they bring
- Write in first person WITHOUT using "I" (e.g. "Passionate about...", "Experienced in...")
- Do NOT list specific project names, company names, or detailed achievements
- Do NOT include specific metrics or numbers from individual projects
- Keep it general and professional — this is a "who am I" career positioning statement
- Output ONLY the summary text, nothing else — no explanations, no labels, no quotes`,
    buildPrompt: (cvData: Record<string, unknown>) =>
      `Write a professional summary (personal brand statement) for this person. Focus on their overall professional identity, not specific projects:\n\n${cvToContext(cvData)}`,
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
    system: `You are a career advisor. Based on the CV data, suggest exactly 10 relevant technical and soft skills that would strengthen this CV. You MUST respond with ONLY a valid JSON array of strings. No explanation, no markdown, no code fences.

Example output:
["React", "Node.js", "Team Leadership", "Docker", "CI/CD", "Agile", "REST APIs", "PostgreSQL", "Communication", "Problem Solving"]`,
    buildPrompt: (cvData: Record<string, unknown>) =>
      `Suggest 10 skills for this person. Respond ONLY with a JSON array.\n\n${cvToContext(cvData)}`,
  },

  atsCheck: {
    system: `You are an ATS (Applicant Tracking System) expert. Analyze the CV and provide a detailed assessment. You MUST respond with ONLY valid JSON in this exact format — no explanation, no markdown:

{"score": <number 0-100>, "issues": ["issue1", "issue2"], "suggestions": ["suggestion1", "suggestion2"]}`,
    buildPrompt: (cvData: Record<string, unknown>) =>
      `Analyze this CV for ATS compatibility. Respond ONLY with JSON.\n\n${cvToContext(cvData)}`,
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
- Output ONLY the improved description text, nothing else`,
    buildPrompt: (name: string, description: string, technologies: string[]) =>
      `Improve this project description.\n\nProject: ${name}\nTechnologies: ${technologies.join(", ")}\nOriginal Description:\n${description}`,
  },

  reviewCV: {
    system: `You are a senior career consultant. Review the CV comprehensively and provide actionable feedback. You MUST respond with ONLY valid JSON in this exact format:

{"overallScore": <number 0-100>, "sections": [{"name": "string", "score": <number 0-100>, "feedback": "string"}], "strengths": ["string"], "improvements": ["string"], "summary": "string"}`,
    buildPrompt: (cvData: Record<string, unknown>) =>
      `Review this CV comprehensively. Respond ONLY with JSON.\n\n${cvToContext(cvData)}`,
  },

  jobMatch: {
    system: `You are a hiring consultant. Compare the CV against the job description and assess fit. You MUST respond with ONLY valid JSON:

{"matchScore": <number 0-100>, "matchingSkills": ["string"], "missingSkills": ["string"], "keywordGaps": ["string"], "suggestions": ["string"], "summary": "string"}`,
    buildPrompt: (cvData: Record<string, unknown>, jobDescription: string) =>
      `Analyze how well this CV matches the job description. Respond ONLY with JSON.\n\n## CV:\n${cvToContext(cvData)}\n\n## Job Description:\n${jobDescription}`,
  },

  tailorCV: {
    system: `You are a career strategist. Suggest specific modifications to tailor this CV for the target job. You MUST respond with ONLY valid JSON:

{"suggestedSummary": "string", "skillsToAdd": ["string"], "skillsToHighlight": ["string"], "experienceTips": [{"company": "string", "suggestion": "string"}], "overallStrategy": "string"}`,
    buildPrompt: (cvData: Record<string, unknown>, jobDescription: string) =>
      `Suggest how to tailor this CV for the given job. Respond ONLY with JSON.\n\n## CV:\n${cvToContext(cvData)}\n\n## Job Description:\n${jobDescription}`,
  },

  githubProfileSummary: {
    system: `You are a tech recruiter writing a developer profile summary. Based on the GitHub analysis results, generate a professional developer profile. Rules:
- 2-3 paragraph narrative
- Highlight key technologies, frameworks, and architectural patterns
- Mention notable projects, their complexity, and impact
- Reference specific skills demonstrated across repositories
- Professional and engaging tone
- Output ONLY the profile text, nothing else`,
    buildPrompt: (analyses: Record<string, unknown>[]) => {
      const lines: string[] = ["Analyzed GitHub Repositories:\n"];
      for (const a of analyses) {
        const result = a.result as Record<string, unknown> | undefined;
        if (!result) continue;
        lines.push(`- ${result.name}: ${result.description ?? "No description"}`);
        if (result.primaryLanguage) lines.push(`  Primary: ${result.primaryLanguage}`);
        const techs = result.technologies as string[] | undefined;
        if (techs?.length) lines.push(`  Technologies: ${techs.join(", ")}`);
        lines.push(`  Stars: ${result.stars ?? 0}, Forks: ${result.forks ?? 0}`);

        // Deep analysis data
        const depInfo = result.dependencyInfo as Record<string, unknown> | undefined;
        if (depInfo) {
          const fw = depInfo.frameworks as string[] | undefined;
          if (fw?.length) lines.push(`  Frameworks: ${fw.join(", ")}`);
          const db = depInfo.databases as string[] | undefined;
          if (db?.length) lines.push(`  Databases: ${db.join(", ")}`);
        }
        const ai = result.aiInsights as Record<string, unknown> | undefined;
        if (ai) {
          if (ai.complexityLevel) lines.push(`  Complexity: ${ai.complexityLevel}`);
          const skills = ai.detectedSkills as string[] | undefined;
          if (skills?.length) lines.push(`  Skills Demonstrated: ${skills.join(", ")}`);
        }
        const ft = result.fileTree as Record<string, unknown> | undefined;
        if (ft?.projectType) lines.push(`  Project Type: ${ft.projectType}`);
        const cq = result.codeQuality as Record<string, unknown> | undefined;
        if (cq) {
          const flags: string[] = [];
          if (cq.hasTests) flags.push("Tests");
          if (cq.hasCI) flags.push("CI/CD");
          if (cq.hasTypeScript) flags.push("TypeScript");
          if (cq.hasDocker) flags.push("Docker");
          if (flags.length) lines.push(`  Quality: ${flags.join(", ")}`);
        }
      }
      return lines.join("\n");
    },
  },

  deepRepoAnalysis: {
    system: `You are a SENIOR software architect and tech lead with 15+ years of experience reviewing code for hiring decisions. You are analyzing a GitHub repository to help a developer present this project on their CV/resume.

Your analysis must be DEEP, SPECIFIC, and EXPERT-LEVEL. Do NOT give generic or surface-level observations. Actually look at the code structure, dependencies, and patterns to provide insights a hiring manager would find impressive.

CRITICAL RULES:
- Respond with ONLY a valid JSON object. No markdown fences, no explanation text.
- "cvReadyDescription" MUST be in FIRST PERSON ("I developed...", "I built...", "I designed..."). This goes directly on the developer's CV.
- Be SPECIFIC — mention actual framework names, versions, patterns, and architecture decisions you observe.
- "detectedSkills" must be concrete technical skills (e.g. "React 19 with Server Components", "PostgreSQL with pgvector", "BullMQ job queues", "JWT authentication") NOT generic ones like "JavaScript" or "coding".
- "strengths" should highlight things that would impress a hiring manager.
- "improvements" should be actionable senior-level suggestions, not obvious things.

Required JSON shape:
{
  "projectSummary": "3-4 sentences: What this project IS, what PROBLEM it solves, who it's FOR, and what makes it technically interesting. Be specific about features and capabilities.",
  "architectureAnalysis": "Detailed analysis of code organization: design patterns used (MVC, hexagonal, microservices, etc.), module structure, separation of concerns, data flow, state management approach. Mention specific directories and their roles.",
  "techStackAssessment": "Expert assessment of technology choices: why they work well together, how modern/production-ready the stack is, any notable integrations or advanced usage patterns.",
  "complexityLevel": "simple | medium | complex",
  "detectedSkills": ["List 10-20 SPECIFIC technical skills demonstrated. Include framework names with versions if detectable, specific libraries, patterns (e.g. 'Repository Pattern', 'Event-driven architecture'), cloud services, databases, protocols, etc."],
  "strengths": ["5-7 impressive aspects: code quality practices, architecture decisions, advanced features, scalability patterns, security measures, testing approach, CI/CD, documentation quality"],
  "improvements": ["4-6 senior-level actionable suggestions: performance optimizations, security hardening, scalability improvements, code quality enhancements, missing best practices"],
  "cvReadyDescription": "3-5 sentences in FIRST PERSON that would look EXCELLENT on a senior developer's CV. Highlight the most impressive technical achievements. Example: 'I architected and developed a full-stack real-time collaborative platform using React 19 and Node.js, implementing WebSocket-based synchronization and Redis pub/sub for cross-instance communication. The system handles concurrent editing with operational transformation and serves 500+ daily active users with <100ms latency. I designed a microservices architecture with BullMQ job queues for background processing, achieving 99.9% uptime in production.'"
}`,
    buildPrompt: (repoData: {
      name: string;
      description: string | null;
      languages: { language: string; percentage: number }[];
      topics: string[];
      fileTree: { totalFiles: number; totalDirectories: number; filesByExtension: Record<string, number>; configFiles: string[]; projectType: string; keyDirectories: string[] };
      dependencies: { source: string; dependencies: Record<string, string>; devDependencies: Record<string, string> } | null;
      readmeContent: string | null;
      sourceSnippets: { path: string; content: string }[];
      commitCount: number;
      contributors: number;
      stars: number;
      hasTests: boolean;
      hasCI: boolean;
      hasDocker: boolean;
    }) => {
      const lines: string[] = [];
      lines.push(`# Repository: ${repoData.name}`);
      if (repoData.description) lines.push(`Description: ${repoData.description}`);
      lines.push(`Stats: ${repoData.stars} stars, ${repoData.commitCount} commits, ${repoData.contributors} contributors`);
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
        const deps = Object.entries(repoData.dependencies.dependencies);
        if (deps.length) {
          lines.push(`### Production Dependencies (${deps.length} packages):`);
          for (const [name, ver] of deps.slice(0, 40)) {
            lines.push(`  - ${name}@${ver}`);
          }
        }
        const devDeps = Object.entries(repoData.dependencies.devDependencies);
        if (devDeps.length) {
          lines.push(`### Dev Dependencies (${devDeps.length} packages):`);
          for (const [name, ver] of devDeps.slice(0, 30)) {
            lines.push(`  - ${name}@${ver}`);
          }
        }
        lines.push("");
      }

      // Quality indicators
      lines.push("## Engineering Practices");
      lines.push(`Testing: ${repoData.hasTests ? "YES" : "NO"}`);
      lines.push(`CI/CD: ${repoData.hasCI ? "YES" : "NO"}`);
      lines.push(`Docker: ${repoData.hasDocker ? "YES" : "NO"}`);
      if (repoData.topics.length) lines.push(`Topics/Tags: ${repoData.topics.join(", ")}`);
      lines.push("");

      // README
      if (repoData.readmeContent) {
        lines.push("## README Content");
        lines.push(repoData.readmeContent.slice(0, 4000));
        lines.push("");
      }

      // Source code snippets — more context
      if (repoData.sourceSnippets.length) {
        lines.push("## Key Source Files (analyze code patterns, architecture, quality)");
        for (const s of repoData.sourceSnippets) {
          lines.push(`### ${s.path}`);
          lines.push("```");
          lines.push(s.content.slice(0, 2500));
          lines.push("```");
          lines.push("");
        }
      }

      return lines.join("\n");
    },
  },
} as const;
