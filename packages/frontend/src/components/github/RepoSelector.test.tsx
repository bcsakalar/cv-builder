// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepoSelector } from "./RepoSelector";

const analyzeMutate = vi.fn();

vi.mock("@/hooks/useGitHub", () => ({
  useGitHubRepos: () => ({
    data: [
      {
        id: 1,
        fullName: "mock-dev/demo-repo",
        name: "demo-repo",
        description: "TypeScript repo",
        language: "TypeScript",
        stars: 12,
        forks: 3,
        url: "https://github.com/mock-dev/demo-repo",
        updatedAt: "2026-04-20T00:00:00.000Z",
        topics: ["typescript"],
        fitScore: 87,
        fitReasons: ["TypeScript stack"],
        recommended: true,
      },
    ],
    isLoading: false,
  }),
  useAnalyzeRepo: () => ({
    mutate: analyzeMutate,
    isPending: false,
  }),
}));

vi.mock("./AnalysisProgress", () => ({
  AnalysisProgress: () => null,
}));

vi.mock("@/stores/app.store", () => ({
  useAppStore: (selector: (state: { locale: "en" | "tr" }) => unknown) => selector({ locale: "en" }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

describe("RepoSelector", () => {
  beforeEach(() => {
    analyzeMutate.mockClear();
  });

  it("submits the selected analysis locale with the repo", async () => {
    const user = userEvent.setup();

    render(<RepoSelector />);

    await user.selectOptions(screen.getByTestId("github-analysis-language-select"), "tr");
    await user.click(screen.getByTestId("github-analyze-1"));

    expect(analyzeMutate).toHaveBeenCalledWith(
      { repoFullName: "mock-dev/demo-repo", locale: "tr" },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });
});