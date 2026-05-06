// @vitest-environment jsdom

import type {
  AIArtifact,
  AIArtifactApplyResult,
  AIATSCheckResponse,
  AIHealthResult,
  AISummaryGenerationResult,
} from "@cvbuilder/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIAssistPanel } from "./AIAssistPanel";

const summaryMutate = vi.fn();
const applyMutate = vi.fn();
const dismissMutate = vi.fn();

let historyData: AIArtifact[] = [];
let summaryData: AISummaryGenerationResult | undefined;
let atsData: AIATSCheckResponse | undefined;
let applyData: AIArtifactApplyResult | undefined;
let dismissData: AIArtifact | undefined;

const healthData: AIHealthResult = {
  provider: "ollama",
  ollama: "connected",
  ready: true,
  readinessIssues: [],
  model: "qwen3.5:9b",
  modelAvailable: true,
  availableModels: ["qwen3.5:9b"],
};

function createIdleMutation<TData>(data?: TData) {
  return {
    data,
    isPending: false,
    mutate: vi.fn(),
    reset: vi.fn(),
  };
}

function buildSummaryArtifact(overrides?: Partial<AIArtifact<string>>): AIArtifact<string> {
  return {
    id: "artifact-summary-current",
    tool: "summary",
    status: "ready",
    title: "Professional summary draft",
    cvId: "cv-1",
    targetSection: "summary",
    input: null,
    output: "Generated summary content",
    summary: "Generated summary content",
    provider: "ollama",
    model: "qwen3.5:9b",
    locale: "en",
    error: null,
    createdAt: "2026-04-12T10:00:00.000Z",
    updatedAt: "2026-04-12T10:00:00.000Z",
    appliedAt: null,
    dismissedAt: null,
    ...overrides,
  };
}

vi.mock("@/hooks/useAI", () => ({
  useAIHealth: () => ({
    data: healthData,
    isLoading: false,
  }),
  useAIArtifacts: () => ({
    data: historyData,
    isLoading: false,
  }),
  useApplyAIArtifact: () => ({
    data: applyData,
    isPending: false,
    mutate: applyMutate,
    reset: vi.fn(),
  }),
  useDismissAIArtifact: () => ({
    data: dismissData,
    isPending: false,
    mutate: dismissMutate,
    reset: vi.fn(),
  }),
  useGenerateSummary: () => ({
    data: summaryData,
    isPending: false,
    mutate: summaryMutate,
    reset: vi.fn(),
  }),
  useStreamingSummary: () => ({
    text: "",
    isStreaming: false,
    error: null,
    startStream: vi.fn(),
    reset: vi.fn(),
  }),
  useSuggestSkills: () => createIdleMutation(),
  useATSCheck: () => createIdleMutation(atsData),
  useGenerateCoverLetter: () => createIdleMutation(),
  useReviewCV: () => createIdleMutation(),
  useJobMatch: () => createIdleMutation(),
  useTailorCV: () => createIdleMutation(),
}));

describe("AIAssistPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    historyData = [];
    summaryData = undefined;
    atsData = undefined;
    applyData = undefined;
    dismissData = undefined;
  });

  it("shows applied status for the current summary artifact after apply succeeds", async () => {
    const user = userEvent.setup();
    const summaryArtifact = buildSummaryArtifact();

    summaryData = {
      summary: "Generated summary content",
      artifact: summaryArtifact,
    };
    applyData = {
      artifact: {
        ...summaryArtifact,
        status: "applied",
        appliedAt: "2026-04-12T10:05:00.000Z",
        updatedAt: "2026-04-12T10:05:00.000Z",
      },
      actions: [{ type: "summary_updated", message: "Summary applied" }],
    };

    render(<AIAssistPanel cvId="cv-1" />);

    await user.click(screen.getByTestId("ai-tab-summary"));

    expect(screen.getByTestId("ai-current-artifact-status")).toHaveTextContent("Applied");
    expect(screen.queryByRole("button", { name: /Apply to CV/i })).not.toBeInTheDocument();
  });

  it("does not let an older applied artifact override a newly generated summary", async () => {
    const user = userEvent.setup();
    const currentArtifact = buildSummaryArtifact({
      id: "artifact-summary-current",
      output: "Newest summary content",
      summary: "Newest summary content",
    });
    const previouslyAppliedArtifact = buildSummaryArtifact({
      id: "artifact-summary-previous",
      status: "applied",
      output: "Previously applied summary",
      summary: "Previously applied summary",
      appliedAt: "2026-04-12T09:55:00.000Z",
      updatedAt: "2026-04-12T09:55:00.000Z",
    });

    summaryData = {
      summary: "Newest summary content",
      artifact: currentArtifact,
    };
    applyData = {
      artifact: previouslyAppliedArtifact,
      actions: [{ type: "summary_updated", message: "Previous summary applied" }],
    };
    historyData = [previouslyAppliedArtifact];

    render(<AIAssistPanel cvId="cv-1" />);

    await user.click(screen.getByTestId("ai-tab-summary"));

    expect(screen.getByTestId("ai-current-artifact-status")).toHaveTextContent("Ready");
    expect(screen.getByRole("button", { name: /Apply to CV/i })).toBeInTheDocument();
  });

  it("renders ATS enrichment details when available", async () => {
    const user = userEvent.setup();

    atsData = {
      score: 81,
      issues: ["Summary is slightly generic"],
      suggestions: ["Add quantified project impact"],
      keywordGaps: ["Docker"],
      hardSkillGaps: ["PostgreSQL"],
      sectionScores: [{ sectionId: "projects", score: 68, reason: "Needs more measurable highlights" }],
      recruiterReadability: {
        score: 74,
        averageSentenceLength: 16.2,
        metricCoverage: 41,
        actionVerbUsage: 66,
        notes: ["Bullets are readable but could use more metrics."],
      },
      fixChecklist: [
        {
          id: "projects-boost",
          label: "Improve the projects section",
          reason: "Needs more measurable highlights",
          priority: "medium",
          sectionId: "projects",
        },
      ],
      artifact: buildSummaryArtifact({ id: "artifact-ats", tool: "ats", title: "ATS review" }) as never,
    };

    render(<AIAssistPanel cvId="cv-1" />);

    await user.click(screen.getByTestId("ai-tab-ats"));

    expect(screen.getByText(/Keyword gaps/i)).toBeInTheDocument();
    expect(screen.getByText("Docker")).toBeInTheDocument();
    expect(screen.getByText(/Fix this checklist/i)).toBeInTheDocument();
    expect(screen.getByText(/Improve the projects section/i)).toBeInTheDocument();
  });
});