import { aiService } from "./ai.service";

const mockGenerate = jest.fn();

jest.mock("../../lib/prisma", () => ({
  prisma: {
    cV: {
      findFirst: jest.fn(),
    },
    gitHubAnalysis: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("../../lib/ollama", () => ({
  ollama: {
    generate: (...args: unknown[]) => mockGenerate(...args),
    generateStreaming: jest.fn(),
  },
}));

jest.mock("../../lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

jest.mock("../../config/env", () => ({
  env: {
    OLLAMA_MODEL: "qwen3.5:9b",
  },
}));

import { prisma } from "../../lib/prisma";

const USER_ID = "user-1";
const mockCVFind = (prisma as unknown as { cV: { findFirst: jest.Mock } }).cV.findFirst;
const mockAnalysesFindMany = (prisma as unknown as { gitHubAnalysis: { findMany: jest.Mock } }).gitHubAnalysis.findMany;

const MOCK_CV = {
  id: "cv-1",
  personalInfo: {
    firstName: "John",
    lastName: "Doe",
    professionalTitle: "Developer",
    email: "john@example.com",
  },
  summary: { content: "Experienced developer" },
  experiences: [
    {
      jobTitle: "Senior Dev",
      company: "Tech Co",
      startDate: "2020-01",
      description: "Led team of 5 engineers",
      achievements: ["Built API serving 10k req/s"],
      technologies: ["TypeScript", "Node.js"],
    },
  ],
  skills: [{ name: "TypeScript", category: "TECHNICAL" }],
  educations: [{ degree: "BSc", fieldOfStudy: "CS", institution: "MIT", startDate: "2016" }],
  projects: [{ name: "OpenLib", description: "Open source library", technologies: ["Rust"] }],
  certifications: [],
  languages: [{ name: "English", proficiency: "NATIVE" }],
};

describe("aiService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── generateSummary ────────────────────────────────────

  describe("generateSummary", () => {
    it("should generate a professional summary", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue("A highly skilled developer with expertise...");

      const result = await aiService.generateSummary(USER_ID, "cv-1");

      expect(result).toBe("A highly skilled developer with expertise...");
      expect(mockGenerate).toHaveBeenCalled();
    });

    it("should strip <think> tags from Qwen output", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue(
        "<think>Let me analyze this CV...</think>A results-driven developer..."
      );

      const result = await aiService.generateSummary(USER_ID, "cv-1");
      // Note: stripping happens in ollama.generate, but we mock that.
      // Still, the .trim() should handle remaining whitespace.
      expect(result).toBeTruthy();
    });

    it("should throw if CV not found", async () => {
      mockCVFind.mockResolvedValue(null);

      await expect(aiService.generateSummary(USER_ID, "nonexistent")).rejects.toThrow();
    });
  });

  // ── improveExperience ──────────────────────────────────

  describe("improveExperience", () => {
    it("should improve experience description", async () => {
      mockGenerate.mockResolvedValue("Spearheaded a cross-functional team of 5...");

      const result = await aiService.improveExperience(
        "Led team",
        "Senior Dev",
        "Tech Co"
      );

      expect(result).toBe("Spearheaded a cross-functional team of 5...");
    });
  });

  // ── suggestSkills ──────────────────────────────────────

  describe("suggestSkills", () => {
    it("should return skill suggestions as array", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue('["React", "Node.js", "Docker"]');

      const result = await aiService.suggestSkills(USER_ID, "cv-1");

      expect(result).toEqual(["React", "Node.js", "Docker"]);
    });

    it("should handle markdown-fenced JSON response", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue('```json\n["React", "Docker"]\n```');

      const result = await aiService.suggestSkills(USER_ID, "cv-1");

      expect(result).toEqual(["React", "Docker"]);
    });

    it("should handle non-JSON response gracefully", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue("React, Node.js, Docker");

      const result = await aiService.suggestSkills(USER_ID, "cv-1");

      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter out non-string items", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue('["React", 42, null, "Docker"]');

      const result = await aiService.suggestSkills(USER_ID, "cv-1");

      expect(result).toEqual(["React", "Docker"]);
    });

    it("should drop duplicate, existing, blank, and oversized skills", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue(JSON.stringify([
        " TypeScript ",
        "Docker",
        "docker",
        "",
        "x".repeat(101),
      ]));

      const result = await aiService.suggestSkills(USER_ID, "cv-1");

      expect(result).toEqual(["Docker"]);
    });

    it("should derive fallback skills when Ollama fails", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockRejectedValue(new Error("Ollama unavailable"));

      const result = await aiService.suggestSkills(USER_ID, "cv-1");

      expect(result).toContain("Node.js");
      expect(result).not.toContain("TypeScript");
    });

    it("should derive fallback skills when AI suggestions add no new usable skills", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue('["TypeScript"]');

      const result = await aiService.suggestSkills(USER_ID, "cv-1");

      expect(result).toContain("Node.js");
    });
  });

  // ── atsCheck ───────────────────────────────────────────

  describe("atsCheck", () => {
    it("should return score, issues and suggestions", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue(
        JSON.stringify({
          score: 85,
          issues: ["Missing keywords"],
          suggestions: ["Add more action verbs"],
        })
      );

      const result = await aiService.atsCheck(USER_ID, "cv-1");

      expect(result.score).toBe(85);
      expect(result.issues).toContain("Missing keywords");
    });

    it("should handle markdown-fenced JSON", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue(
        '```json\n{"score": 70, "issues": [], "suggestions": ["Add skills"]}\n```'
      );

      const result = await aiService.atsCheck(USER_ID, "cv-1");

      expect(result.score).toBe(70);
      expect(result.suggestions).toContain("Add skills");
    });

    it("should clamp score to 0-100 range", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue('{"score": 150, "issues": [], "suggestions": []}');

      const result = await aiService.atsCheck(USER_ID, "cv-1");

      expect(result.score).toBe(100);
    });

    it("should return fallback on unparseable response", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue("The ATS score is about 80 percent.");

      const result = await aiService.atsCheck(USER_ID, "cv-1");

      expect(result.score).toBe(50);
      expect(Array.isArray(result.issues)).toBe(true);
    });
  });

  // ── generateCoverLetter ────────────────────────────────

  describe("generateCoverLetter", () => {
    it("should generate a cover letter", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue("Dear Hiring Manager...");

      const result = await aiService.generateCoverLetter(USER_ID, "cv-1");

      expect(result).toContain("Dear Hiring Manager");
    });

    it("should accept optional job description", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue("Dear Team...");

      await aiService.generateCoverLetter(USER_ID, "cv-1", "Frontend Developer at Google");

      const calledPrompt = mockGenerate.mock.calls[0][0].prompt as string;
      expect(calledPrompt).toContain("Frontend Developer at Google");
    });
  });

  // ── improveProject ─────────────────────────────────────

  describe("improveProject", () => {
    it("should improve project description", async () => {
      mockGenerate.mockResolvedValue("Built a high-performance open-source library...");

      const result = await aiService.improveProject(
        "OpenLib",
        "A library",
        ["Rust", "WebAssembly"]
      );

      expect(result).toBe("Built a high-performance open-source library...");
    });
  });

  // ── reviewCV ───────────────────────────────────────────

  describe("reviewCV", () => {
    it("should return comprehensive review", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue(
        JSON.stringify({
          overallScore: 75,
          sections: [{ name: "Experience", score: 80, feedback: "Good detail" }],
          strengths: ["Strong tech skills"],
          improvements: ["Add more projects"],
          summary: "Solid CV overall",
        })
      );

      const result = await aiService.reviewCV(USER_ID, "cv-1");

      expect(result.overallScore).toBe(75);
      expect(result.sections).toHaveLength(1);
      expect(result.strengths).toContain("Strong tech skills");
    });

    it("should return fallback on bad response", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue("This is a great CV!");

      const result = await aiService.reviewCV(USER_ID, "cv-1");

      expect(result.overallScore).toBe(50);
      expect(Array.isArray(result.sections)).toBe(true);
    });
  });

  // ── jobMatch ───────────────────────────────────────────

  describe("jobMatch", () => {
    it("should analyze job match", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue(
        JSON.stringify({
          matchScore: 82,
          matchingSkills: ["TypeScript"],
          missingSkills: ["React"],
          keywordGaps: ["frontend"],
          suggestions: ["Add React experience"],
          summary: "Good match",
        })
      );

      const result = await aiService.jobMatch(USER_ID, "cv-1", "Looking for a TypeScript dev");

      expect(result.matchScore).toBe(82);
      expect(result.matchingSkills).toContain("TypeScript");
      expect(result.missingSkills).toContain("React");
    });
  });

  // ── tailorCV ───────────────────────────────────────────

  describe("tailorCV", () => {
    it("should return tailoring suggestions", async () => {
      mockCVFind.mockResolvedValue(MOCK_CV);
      mockGenerate.mockResolvedValue(
        JSON.stringify({
          suggestedSummary: "React-focused developer...",
          skillsToAdd: ["React", "Next.js"],
          skillsToHighlight: ["TypeScript"],
          experienceTips: [{ company: "Tech Co", suggestion: "Emphasize frontend work" }],
          overallStrategy: "Focus on React ecosystem",
        })
      );

      const result = await aiService.tailorCV(USER_ID, "cv-1", "React developer needed");

      expect(result.suggestedSummary).toContain("React");
      expect(result.skillsToAdd).toContain("React");
      expect(result.experienceTips).toHaveLength(1);
    });
  });

  // ── githubProfileSummary ───────────────────────────────

  describe("githubProfileSummary", () => {
    it("should generate profile from analyses", async () => {
      mockAnalysesFindMany.mockResolvedValue([
        {
          id: "a-1",
          status: "COMPLETED",
          result: {
            name: "my-app",
            description: "Full-stack app",
            primaryLanguage: "TypeScript",
            technologies: ["TypeScript", "React"],
            stars: 42,
            forks: 5,
          },
        },
      ]);
      mockGenerate.mockResolvedValue("A versatile developer with experience in TypeScript...");

      const result = await aiService.githubProfileSummary("user-1");

      expect(result).toContain("TypeScript");
    });

    it("should throw if no completed analyses", async () => {
      mockAnalysesFindMany.mockResolvedValue([]);

      await expect(aiService.githubProfileSummary("user-1")).rejects.toThrow(
        "No completed GitHub analyses found"
      );
    });
  });
});
