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

  it("shows a repository link and falls back to technologies as skills for GitHub projects without detected skills", () => {
    const result = buildPreviewProject({
      name: "CvBuilder",
      isFromGitHub: true,
      technologies: ["TypeScript", "React"],
      githubUrl: "https://github.com/mock-dev/cvbuilder",
    }, "en");

    expect(result.repositoryUrl).toBe("https://github.com/mock-dev/cvbuilder");
    expect(result.signalLine).toBe("github.com/mock-dev/cvbuilder");
    // The standalone technology line is suppressed for GitHub projects, but the
    // skills line MUST render (regression guard for the "no skills" bug).
    expect(result.technologies).toEqual([]);
    expect(result.skills).toEqual(["TypeScript", "React"]);
  });

  it("renders the AI-detected deep skills for GitHub projects when available", () => {
    const result = buildPreviewProject({
      name: "CvBuilder",
      isFromGitHub: true,
      technologies: ["TypeScript", "React"],
      githubUrl: "https://github.com/mock-dev/cvbuilder",
      githubRepoData: {
        detectedSkills: ["JWT authentication", "BullMQ job queues", "Monorepo architecture"],
        isPrivate: false,
      },
    }, "en");

    // Deep skills take precedence over the surface technology list.
    expect(result.skills).toEqual(["JWT authentication", "BullMQ job queues", "Monorepo architecture"]);
    expect(result.isFromGitHub).toBe(true);
  });

  it("exposes public/private visibility from githubRepoData.isPrivate", () => {
    const publicProject = buildPreviewProject({
      name: "PublicRepo",
      isFromGitHub: true,
      githubUrl: "https://github.com/mock-dev/public",
      githubRepoData: { isPrivate: false },
    }, "en");
    expect(publicProject.visibility).toBe("public");

    const privateProject = buildPreviewProject({
      name: "PrivateRepo",
      isFromGitHub: true,
      githubRepoData: { isPrivate: true },
    }, "en");
    expect(privateProject.visibility).toBe("private");
  });

  it("keeps the technology line and reports no visibility for manual projects", () => {
    const result = buildPreviewProject({
      name: "Manual Project",
      isFromGitHub: false,
      technologies: ["Figma", "Photoshop"],
    }, "en");

    expect(result.technologies).toEqual(["Figma", "Photoshop"]);
    expect(result.visibility).toBeNull();
    expect(result.isFromGitHub).toBe(false);
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
