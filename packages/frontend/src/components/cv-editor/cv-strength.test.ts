import { describe, expect, it } from "vitest";
import type { CVDetail } from "@/services/cv.api";
import { computeCVStrength } from "./cv-strength";

function makeCV(overrides: Partial<CVDetail> = {}): CVDetail {
  return {
    id: "cv-1",
    title: "Test CV",
    slug: "test-cv",
    status: "DRAFT",
    locale: "en",
    isAtsOptimized: false,
    sectionOrder: [],
    themeConfig: {},
    templateId: "t-1",
    createdAt: "",
    updatedAt: "",
    template: { id: "t-1", name: "Modern", slug: "modern" },
    personalInfo: null,
    summary: null,
    coverLetter: null,
    experiences: [],
    educations: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    volunteerExperiences: [],
    publications: [],
    awards: [],
    references: [],
    hobbies: [],
    customSections: [],
    ...overrides,
  };
}

describe("computeCVStrength", () => {
  it("scores an empty CV at 0 / low", () => {
    const result = computeCVStrength(makeCV());
    expect(result.score).toBe(0);
    expect(result.level).toBe("low");
    expect(result.completedCount).toBe(0);
    expect(result.checks.every((c) => !c.done)).toBe(true);
  });

  it("weights sum to exactly 100 for a fully complete CV", () => {
    const result = computeCVStrength(
      makeCV({
        personalInfo: {
          firstName: "Alex",
          lastName: "Doe",
          professionalTitle: "Engineer",
          email: "a@b.com",
          phone: "+1 555",
          website: "https://a.dev",
        },
        summary: { id: "s", aiGenerated: false, content: "x".repeat(220) },
        experiences: [
          { id: "e1", description: "Led a team and improved performance by 40% across 12 services." },
        ],
        educations: [{ id: "ed1" }],
        skills: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }],
        projects: [{ id: "p1" }],
        languages: [{ id: "l1" }],
      } as Partial<CVDetail>),
    );
    expect(result.score).toBe(100);
    expect(result.level).toBe("high");
    expect(result.completedCount).toBe(result.totalCount);
  });

  it("flags quantified achievements only when metrics are present", () => {
    const withMetrics = computeCVStrength(
      makeCV({ experiences: [{ id: "e", description: "Cut costs by 30%." }] } as Partial<CVDetail>),
    );
    const withoutMetrics = computeCVStrength(
      makeCV({ experiences: [{ id: "e", description: "Helped the team ship faster." }] } as Partial<CVDetail>),
    );
    expect(withMetrics.checks.find((c) => c.id === "quantified")?.done).toBe(true);
    expect(withoutMetrics.checks.find((c) => c.id === "quantified")?.done).toBe(false);
  });

  it("requires at least 5 skills for the skills check", () => {
    const four = computeCVStrength(makeCV({ skills: [{}, {}, {}, {}] } as Partial<CVDetail>));
    const five = computeCVStrength(makeCV({ skills: [{}, {}, {}, {}, {}] } as Partial<CVDetail>));
    expect(four.checks.find((c) => c.id === "skills")?.done).toBe(false);
    expect(five.checks.find((c) => c.id === "skills")?.done).toBe(true);
  });
});
