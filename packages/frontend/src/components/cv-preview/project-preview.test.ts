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
