// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecruiterWorkbench } from "./RecruiterWorkbench";

const createJobMutateAsync = vi.fn();
const uploadBatchMutateAsync = vi.fn();
const reEvaluateMutate = vi.fn();

vi.mock("@/hooks/useRecruiter", () => ({
  useRecruiterJobs: () => ({
    data: [
      {
        id: "job-1",
        title: "Senior Backend Engineer",
        company: "CvBuilder",
        location: "Remote",
        locale: "en",
        description: "Hiring a backend engineer with TypeScript, Node.js, PostgreSQL, and cloud delivery experience.",
        mustHaveSkills: ["TypeScript", "Node.js", "PostgreSQL"],
        niceToHaveSkills: ["Redis", "Docker"],
        minimumYearsExperience: 5,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        batchCount: 1,
        candidateCount: 1,
        latestBatchStatus: "COMPLETED",
      },
    ],
    isLoading: false,
  }),
  useCreateRecruiterJob: () => ({
    mutateAsync: createJobMutateAsync,
    isPending: false,
  }),
  useRecruiterJob: () => ({
    data: {
      id: "job-1",
      title: "Senior Backend Engineer",
      company: "CvBuilder",
      location: "Remote",
      locale: "en",
      description: "Hiring a backend engineer with TypeScript, Node.js, PostgreSQL, and cloud delivery experience.",
      mustHaveSkills: ["TypeScript", "Node.js", "PostgreSQL"],
      niceToHaveSkills: ["Redis", "Docker"],
      minimumYearsExperience: 5,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      batchCount: 1,
      candidateCount: 1,
      latestBatchStatus: "COMPLETED",
      batches: [
        {
          id: "batch-1",
          status: "COMPLETED",
          totalFiles: 1,
          processedFiles: 1,
          successfulFiles: 1,
          failedFiles: 0,
          lastError: null,
          completedAt: "2026-01-01T00:05:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:05:00.000Z",
        },
      ],
    },
  }),
  useRecruiterBatch: () => ({
    data: {
      id: "batch-1",
      jobId: "job-1",
      status: "COMPLETED",
      totalFiles: 1,
      processedFiles: 1,
      successfulFiles: 1,
      failedFiles: 0,
      lastError: null,
      completedAt: "2026-01-01T00:05:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:05:00.000Z",
      documents: [
        {
          id: "doc-1",
          originalFileName: "jane-doe.pdf",
          storedFileName: "stored-jane-doe.pdf",
          mimeType: "application/pdf",
          filePath: "/tmp/jane-doe.pdf",
          fileSize: 1024,
          extractionStatus: "EXTRACTED",
          parseError: null,
          processedAt: "2026-01-01T00:04:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:04:00.000Z",
        },
      ],
    },
  }),
  useRecruiterCandidates: () => ({
    data: {
      items: [
        {
          id: "candidate-1",
          fullName: "Jane Doe",
          headline: "Senior Backend Engineer",
          email: "jane@example.com",
          yearsOfExperience: 6,
          completenessScore: 90,
          topSkills: ["TypeScript", "Node.js", "PostgreSQL"],
          brokenLinkCount: 0,
          accessibleLinkCount: 2,
          updatedAt: "2026-01-01T00:04:30.000Z",
          evaluation: {
            id: "eval-1",
            overallScore: 88,
            mustHaveScore: 95,
            keywordScore: 86,
            experienceScore: 90,
            readabilityScore: 82,
            linkQualityScore: 80,
            riskPenalty: 4,
            recommendation: "STRONG_MATCH",
            missingKeywords: [],
            missingHardSkills: [],
            matchedKeywords: ["Docker"],
            matchedHardSkills: ["TypeScript", "Node.js", "PostgreSQL"],
            matchEvidence: [
              { term: "Node.js", source: "mustHave", evidence: "Built Node.js services with PostgreSQL." },
            ],
            strengths: ["Strong TypeScript backend experience"],
            riskFlags: [],
            shortSummary: "High-confidence shortlist candidate.",
            explanation: "Strong alignment with the role benchmark.",
            evaluatedAt: "2026-01-01T00:04:30.000Z",
            createdAt: "2026-01-01T00:04:30.000Z",
            updatedAt: "2026-01-01T00:04:30.000Z",
          },
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
      },
    },
    isLoading: false,
  }),
  useRecruiterCandidate: () => ({
    data: {
      id: "candidate-1",
      jobId: "job-1",
      batchId: "batch-1",
      documentId: "doc-1",
      fullName: "Jane Doe",
      headline: "Senior Backend Engineer",
      email: "jane@example.com",
      phone: "+90 555 123 45 67",
      location: "Istanbul",
      yearsOfExperience: 6,
      summary: "Senior backend engineer focused on TypeScript systems.",
      topSkills: ["TypeScript", "Node.js", "PostgreSQL"],
      completenessScore: 90,
      missingFields: [],
      rawTextSnippet: "Jane Doe\nSenior Backend Engineer\nTypeScript Node.js PostgreSQL",
      createdAt: "2026-01-01T00:04:30.000Z",
      updatedAt: "2026-01-01T00:04:30.000Z",
      document: {
        id: "doc-1",
        originalFileName: "jane-doe.pdf",
        storedFileName: "stored-jane-doe.pdf",
        mimeType: "application/pdf",
        filePath: "/tmp/jane-doe.pdf",
        fileSize: 1024,
        extractionStatus: "EXTRACTED",
        parseError: null,
        processedAt: "2026-01-01T00:04:00.000Z",
        extractedTextPreview: "Jane Doe\nSenior Backend Engineer\nTypeScript Node.js PostgreSQL",
        extractedTextLength: 64,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:04:00.000Z",
      },
      links: [
        {
          id: "link-1",
          url: "https://github.com/janedoe",
          normalizedUrl: "https://github.com/janedoe",
          host: "github.com",
          linkType: "GITHUB",
          inspectionStatus: "COMPLETED",
          statusCode: 200,
          finalUrl: "https://github.com/janedoe",
          title: "Jane Doe · GitHub",
          description: "GitHub profile",
          accessible: true,
          responseTimeMs: 120,
          error: null,
          createdAt: "2026-01-01T00:04:00.000Z",
          updatedAt: "2026-01-01T00:04:00.000Z",
        },
      ],
      evaluation: {
        id: "eval-1",
        overallScore: 88,
        mustHaveScore: 95,
        keywordScore: 86,
        experienceScore: 90,
        readabilityScore: 82,
        linkQualityScore: 80,
        riskPenalty: 4,
        recommendation: "STRONG_MATCH",
        missingKeywords: [],
        missingHardSkills: [],
        matchedKeywords: ["Docker"],
        matchedHardSkills: ["TypeScript", "Node.js", "PostgreSQL"],
        matchEvidence: [
          { term: "Node.js", source: "mustHave", evidence: "Built Node.js services with PostgreSQL." },
        ],
        strengths: ["Strong TypeScript backend experience"],
        riskFlags: [],
        shortSummary: "High-confidence shortlist candidate.",
        explanation: "Strong alignment with the role benchmark.",
        evaluatedAt: "2026-01-01T00:04:30.000Z",
        createdAt: "2026-01-01T00:04:30.000Z",
        updatedAt: "2026-01-01T00:04:30.000Z",
      },
    },
  }),
  useCreateRecruiterBatch: () => ({
    mutateAsync: uploadBatchMutateAsync,
    isPending: false,
  }),
  useReEvaluateCandidate: () => ({
    mutate: reEvaluateMutate,
    isPending: false,
  }),
}));

describe("RecruiterWorkbench", () => {
  it("renders candidate insights and supports manual re-scoring", async () => {
    const user = userEvent.setup();

    render(<RecruiterWorkbench />);

    expect(screen.getByText("High-volume candidate review workspace")).toBeInTheDocument();
    expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0);
    expect(screen.getByText("High-confidence shortlist candidate.")).toBeInTheDocument();
    expect(screen.getByText("Matched hard skills")).toBeInTheDocument();
    expect(screen.getByText("Match evidence from CV text")).toBeInTheDocument();
    expect(screen.getByText(/Extracted text: 64 characters/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /re-score candidate/i }));

    expect(reEvaluateMutate).toHaveBeenCalledWith({ force: true });
  });
});
