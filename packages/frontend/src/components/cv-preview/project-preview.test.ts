import { describe, expect, it } from "vitest";
import { buildPreviewProject } from "./project-preview";

describe("buildPreviewProject", () => {
  it("hides GitHub-imported date and project-type metadata when no explicit role is set", () => {
    const result = buildPreviewProject({
      name: "CvBuilder",
      description: "AI-powered CV builder",
      isFromGitHub: true,
      startDate: "2025-01",
      endDate: "2026-04",
      githubRepoData: {
        projectType: "monorepo",
      },
    }, "en");

    expect(result.metaLine).toBeNull();
  });

  it("keeps explicit role metadata for GitHub-imported projects", () => {
    const result = buildPreviewProject({
      name: "CvBuilder",
      role: "Lead Engineer",
      isFromGitHub: true,
      startDate: "2025-01",
      endDate: "2026-04",
    }, "en");

    expect(result.metaLine).toBe("Lead Engineer");
  });

  it("shows repository link instead of technologies for public GitHub projects", () => {
    const result = buildPreviewProject({
      name: "CvBuilder",
      isFromGitHub: true,
      technologies: ["TypeScript", "React"],
      githubUrl: "https://github.com/mock-dev/cvbuilder",
    }, "en");

    expect(result.repositoryUrl).toBe("https://github.com/mock-dev/cvbuilder");
    expect(result.signalLine).toBe("github.com/mock-dev/cvbuilder");
    expect(result.technologies).toEqual([]);
  });

  it("falls back to the full GitHub AI description for previously truncated imports", () => {
    const fullDescription = "Designed and implemented a local-first TypeScript CLI for job discovery, scraping, and application assistance with SQLite, Playwright, and Ollama integration.";

    const result = buildPreviewProject({
      name: "Scraper",
      description: "Designed and implemented a local-first TypeScript CLI for job discovery, scraping, and application assistance with SQLite, Playwright, and Ollama inte...",
      isFromGitHub: true,
      githubRepoData: {
        cvReadyDescription: fullDescription,
      },
    }, "en");

    expect(result.description).toBe(fullDescription);
  });

  it("preserves date metadata for manually entered projects", () => {
    const result = buildPreviewProject({
      name: "Manual Project",
      role: "Consultant",
      startDate: "2024-02",
      endDate: "2024-08",
      isFromGitHub: false,
    }, "en");

    expect(result.metaLine).toContain("Consultant");
    expect(result.metaLine).toContain("2024");
  });
});
