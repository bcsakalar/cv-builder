// @vitest-environment jsdom

import type { GitHubProjectImportPreview } from "@cvbuilder/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportToCV } from "./ImportToCV";

const previewMutate = vi.fn();
const importMutate = vi.fn();
const bulkImportMutate = vi.fn();
let previewData: GitHubProjectImportPreview | undefined;

vi.mock("@/hooks/useCV", () => ({
  useGetCVs: () => ({
    data: [{ id: "cv-1", title: "Senior CV" }],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useGitHub", () => ({
  useImportPreview: () => ({
    mutate: previewMutate,
    isPending: false,
    data: previewData,
  }),
  useImportToCV: () => ({
    mutate: importMutate,
    isPending: false,
  }),
  useBulkImportToCV: () => ({
    mutate: bulkImportMutate,
    isPending: false,
  }),
}));

const importPreview: GitHubProjectImportPreview = {
  analysisId: "analysis-1",
  repoFullName: "mock-dev/platform-repo",
  draft: {
    name: "platform-repo",
    description: "Built a full-stack workflow platform with a strong testing and delivery setup.",
    role: "Full-Stack Developer",
    technologies: ["TypeScript", "React", "PostgreSQL", "Playwright"],
    url: "https://github.com/mock-dev/platform-repo",
    githubUrl: "https://github.com/mock-dev/platform-repo",
    startDate: "2025-01-01T00:00:00.000Z",
    endDate: "2026-04-10T00:00:00.000Z",
    highlights: [
      "Led architecture across frontend and backend modules",
      "Maintained automated quality gates and CI/CD workflows",
    ],
    isFromGitHub: true,
    githubRepoData: {
      stars: 42,
      forks: 7,
      watchers: 11,
      language: "TypeScript",
      languageStats: { TypeScript: 82, SQL: 10, CSS: 8 },
      commitCount: 128,
      userCommitCount: 96,
      openIssues: 3,
      topics: ["automation", "developer-tools"],
      license: "MIT",
      projectType: "fullstack",
      qualityScore: 84,
      contributorCount: 2,
      frameworks: ["React", "Express"],
      databases: ["PostgreSQL"],
      uiLibraries: ["Tailwind CSS"],
      testingTools: ["Playwright", "Vitest"],
      buildTools: ["Vite"],
      linters: ["ESLint"],
      hasTests: true,
      hasCI: true,
      hasDocker: true,
      hasTypeScript: true,
    },
  },
  dependencyInfo: {
    frameworks: ["React", "Express"],
    databases: ["PostgreSQL"],
    uiLibraries: ["Tailwind CSS"],
    testingTools: ["Playwright", "Vitest"],
    buildTools: ["Vite"],
    linters: ["ESLint"],
  },
};

describe("ImportToCV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    previewData = undefined;
  });

  it("starts preview flow before importing a single repository", async () => {
    const user = userEvent.setup();

    render(<ImportToCV analysisIds={["analysis-1"]} />);

    await user.selectOptions(screen.getByTestId("github-import-cv-select"), "cv-1");
    await user.click(screen.getByTestId("github-import-review-button"));

    expect(previewMutate).toHaveBeenCalledWith(
      "analysis-1",
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it("submits reviewed project overrides from the import panel", async () => {
    const user = userEvent.setup();
    previewData = importPreview;

    render(<ImportToCV analysisIds={["analysis-1"]} />);

    await user.selectOptions(screen.getByTestId("github-import-cv-select"), "cv-1");

    expect(await screen.findByTestId("github-import-review")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Project Name"));
    await user.type(screen.getByLabelText("Project Name"), "Reviewed Platform");
    await user.clear(screen.getByLabelText("Role"));
    await user.type(screen.getByLabelText("Role"), "Lead Full-Stack Developer");
    await user.clear(screen.getByLabelText("Project Description"));
    await user.type(screen.getByLabelText("Project Description"), "Balanced project summary for recruiter and CTO review.");
    await user.clear(screen.getByLabelText("Technologies"));
    await user.type(screen.getByLabelText("Technologies"), "TypeScript, React, PostgreSQL");
    await user.clear(screen.getByLabelText("Highlights"));
    await user.type(screen.getByLabelText("Highlights"), "Led architecture across modules{enter}Shipped CI/CD automation");

    await user.click(screen.getByTestId("github-import-button"));

    expect(importMutate).toHaveBeenCalledWith({
      cvId: "cv-1",
      analysisId: "analysis-1",
      projectOverrides: {
        name: "Reviewed Platform",
        role: "Lead Full-Stack Developer",
        description: "Balanced project summary for recruiter and CTO review.",
        technologies: ["TypeScript", "React", "PostgreSQL"],
        highlights: ["Led architecture across modules", "Shipped CI/CD automation"],
      },
    }, expect.any(Object));
  });

  it("keeps bulk import as a direct action", async () => {
    const user = userEvent.setup();

    render(<ImportToCV analysisIds={["analysis-1", "analysis-2"]} />);

    await user.selectOptions(screen.getByTestId("github-import-cv-select"), "cv-1");
    await user.click(screen.getByTestId("github-import-button"));

    expect(bulkImportMutate).toHaveBeenCalledWith({
      cvId: "cv-1",
      analysisIds: ["analysis-1", "analysis-2"],
    }, expect.any(Object));
  });
});