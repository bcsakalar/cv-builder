// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CVDetail } from "@/services/cv.api";
import { ExperienceSection } from "./ExperienceSection";

const addExperienceMutate = vi.fn();
const updateExperienceMutate = vi.fn();
const removeExperienceMutate = vi.fn();

vi.mock("@/hooks/useCV", () => ({
  useSectionMutation: () => ({
    addExperience: { mutate: addExperienceMutate },
    updateExperience: { mutate: updateExperienceMutate },
    removeExperience: { mutate: removeExperienceMutate },
  }),
}));

vi.mock("@/hooks/useAI", () => ({
  useImproveExperience: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

afterEach(() => {
  cleanup();
});

const cv: CVDetail = {
  id: "cv-1",
  title: "Test CV",
  slug: "test-cv",
  status: "DRAFT",
  locale: "en",
  isAtsOptimized: false,
  sectionOrder: [],
  themeConfig: {},
  templateId: "template-1",
  createdAt: "2026-04-12T00:00:00.000Z",
  updatedAt: "2026-04-12T00:00:00.000Z",
  template: { id: "template-1", name: "Modern", slug: "modern-minimal" },
  personalInfo: null,
  summary: null,
  coverLetter: null,
  experiences: [
    {
      id: "exp-1",
      jobTitle: "Automation Engineer",
      company: "CvBuilder QA Lab",
      companyDescription: null,
      location: "Remote",
      startDate: "2025-01",
      endDate: null,
      isCurrent: false,
      description: "Built end-to-end browser coverage.",
      achievements: [],
      technologies: [],
      orderIndex: 0,
    },
  ],
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
};

describe("ExperienceSection", () => {
  it("exposes an accessible delete action", () => {
    render(<ExperienceSection cv={cv} />);

    expect(screen.getByRole("button", { name: "Delete Automation Engineer experience" })).toBeDefined();
  });

  it("binds field labels to inputs when editing an experience", async () => {
    const user = userEvent.setup();

    render(<ExperienceSection cv={cv} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect((screen.getByLabelText("Job Title") as HTMLInputElement).value).toBe("Automation Engineer");
    expect((screen.getByLabelText("Company") as HTMLInputElement).value).toBe("CvBuilder QA Lab");
    expect((screen.getByLabelText("Location") as HTMLInputElement).value).toBe("Remote");
    expect((screen.getByLabelText("Description") as HTMLTextAreaElement).value).toBe("Built end-to-end browser coverage.");
  });
});