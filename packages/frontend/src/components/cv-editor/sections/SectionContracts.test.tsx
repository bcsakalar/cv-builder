// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CVDetail } from "@/services/cv.api";
import { CertificationsSection } from "./CertificationsSection";
import { LanguagesSection } from "./LanguagesSection";
import { PublicationsSection } from "./PublicationsSection";
import { AwardsSection } from "./AwardsSection";
import { ReferencesSection } from "./ReferencesSection";

const certificationAdd = vi.fn();
const certificationRemove = vi.fn();
const languageAdd = vi.fn();
const languageRemove = vi.fn();
const publicationAdd = vi.fn();
const publicationRemove = vi.fn();
const awardAdd = vi.fn();
const awardRemove = vi.fn();
const referenceAdd = vi.fn();
const referenceRemove = vi.fn();

vi.mock("@/hooks/useCV", () => ({
  useSectionMutation: () => ({
    certification: {
      add: { mutate: certificationAdd },
      remove: { mutate: certificationRemove },
    },
    language: {
      add: { mutate: languageAdd },
      remove: { mutate: languageRemove },
    },
    publication: {
      add: { mutate: publicationAdd },
      remove: { mutate: publicationRemove },
    },
    award: {
      add: { mutate: awardAdd },
      remove: { mutate: awardRemove },
    },
    reference: {
      add: { mutate: referenceAdd },
      remove: { mutate: referenceRemove },
    },
  }),
}));

const buildCv = (overrides?: Partial<CVDetail>): CVDetail => {
  const { coverLetter, ...restOverrides } = overrides ?? {};

  return {
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
    coverLetter: coverLetter ?? null,
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
    ...restOverrides,
  };
};

describe("CV section contract alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("maps certification fields to backend payload names", async () => {
    const user = userEvent.setup();

    render(<CertificationsSection cv={buildCv()} />);

    await user.type(screen.getByLabelText("Certification Name"), "AWS Certified Developer");
    await user.type(screen.getByLabelText("Issuing Organization"), "Amazon Web Services");
    await user.type(screen.getByLabelText("Issue Date"), "2024-01-01");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(certificationAdd).toHaveBeenCalledWith({
      name: "AWS Certified Developer",
      issuingOrganization: "Amazon Web Services",
      issueDate: "2024-01-01",
      expirationDate: null,
      credentialId: null,
      credentialUrl: null,
      orderIndex: 0,
    }, expect.any(Object));
  });

  it("submits backend language proficiency enums", async () => {
    const user = userEvent.setup();

    render(<LanguagesSection cv={buildCv()} />);

    await user.type(screen.getByLabelText("Language"), "English");
    await user.selectOptions(screen.getByLabelText("Proficiency"), "FULL_PROFESSIONAL");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(languageAdd).toHaveBeenCalledWith({
      name: "English",
      proficiency: "FULL_PROFESSIONAL",
      orderIndex: 0,
    }, expect.any(Object));
  });

  it("normalizes publication aliases and blank optionals", async () => {
    const user = userEvent.setup();

    render(<PublicationsSection cv={buildCv()} />);

    await user.type(screen.getByLabelText("Title"), "Reliable Automation at Scale");
    await user.type(screen.getByLabelText("Publisher"), "QA Weekly");
    await user.type(screen.getByLabelText("Publish Date"), "2024-05-01");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(publicationAdd).toHaveBeenCalledWith({
      title: "Reliable Automation at Scale",
      publisher: "QA Weekly",
      date: "2024-05-01",
      url: null,
      description: null,
      orderIndex: 0,
    }, expect.any(Object));
  });

  it("requires award issuer and date before mutate", async () => {
    const user = userEvent.setup();

    render(<AwardsSection cv={buildCv()} />);

    await user.type(screen.getByLabelText("Award Title"), "Engineering Excellence Award");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(awardAdd).not.toHaveBeenCalled();
  });

  it("maps reference title and clears blank contact fields", async () => {
    const user = userEvent.setup();

    render(<ReferencesSection cv={buildCv()} />);

    await user.type(screen.getByLabelText("Full Name"), "Jane Doe");
    await user.type(screen.getByLabelText("Company"), "CvBuilder");
    await user.type(screen.getByLabelText("Position"), "Engineering Manager");
    await user.type(screen.getByLabelText("Relationship"), "Former manager");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(referenceAdd).toHaveBeenCalledWith({
      name: "Jane Doe",
      title: "Engineering Manager",
      company: "CvBuilder",
      email: null,
      phone: null,
      relationship: "Former manager",
      orderIndex: 0,
    }, expect.any(Object));
  });
});