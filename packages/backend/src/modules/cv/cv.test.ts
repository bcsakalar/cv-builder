// ═══════════════════════════════════════════════════════════
// CV Service Unit Tests
// ═══════════════════════════════════════════════════════════

import { cvService } from "./cv.service";
import { cvRepository } from "./cv.repository";
import { ApiError } from "../../utils/api-error";

// Mock dependencies
jest.mock("./cv.repository");
jest.mock("../../lib/redis", () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDelete: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../config/env", () => ({
  env: {
    DATABASE_URL: "postgresql://localhost/test",
    REDIS_URL: "redis://localhost:6379",
    JWT_SECRET: "test-secret",
    ENCRYPTION_KEY: "0".repeat(64),
    NODE_ENV: "test",
    UPLOAD_DIR: "./uploads",
  },
}));
jest.mock("../../lib/prisma", () => ({
  prisma: {},
}));

const mockRepo = cvRepository as jest.Mocked<typeof cvRepository>;
const USER_ID = "00000000-0000-0000-0000-000000000001";

const MOCK_CV = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Test CV",
  slug: "test-cv-abc123",
  status: "DRAFT" as const,
  locale: "en",
  isAtsOptimized: false,
  sectionOrder: ["personalInfo", "summary", "experience"],
  themeConfig: { primaryColor: "#2563eb" },
  userId: "00000000-0000-0000-0000-000000000001",
  templateId: "22222222-2222-2222-2222-222222222222",
  createdAt: new Date(),
  updatedAt: new Date(),
  personalInfo: null,
  summary: null,
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
  template: { id: "22222222-2222-2222-2222-222222222222", name: "Modern" },
};

describe("cvService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a CV with generated slug", async () => {
      mockRepo.create.mockResolvedValue(MOCK_CV as never);

      const result = await cvService.create(USER_ID, {
        title: "My Resume",
        templateId: "22222222-2222-2222-2222-222222222222",
        locale: "en",
      });

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(MOCK_CV);
    });
  });

  describe("getAll", () => {
    it("should return all CVs for the user", async () => {
      mockRepo.findAll.mockResolvedValue([MOCK_CV] as never);

      const result = await cvService.getAll(USER_ID);

      expect(mockRepo.findAll).toHaveBeenCalledWith(USER_ID);
      expect(result).toHaveLength(1);
    });
  });

  describe("getById", () => {
    it("should return a CV by id", async () => {
      mockRepo.findByIdForUser.mockResolvedValue(MOCK_CV as never);

      const result = await cvService.getById(USER_ID, MOCK_CV.id);

      expect(result).toEqual(MOCK_CV);
    });

    it("should throw NotFound if CV doesn't exist", async () => {
      mockRepo.findByIdForUser.mockResolvedValue(null);

      await expect(cvService.getById(USER_ID, "nonexistent")).rejects.toThrow(ApiError);
    });
  });

  describe("update", () => {
    it("should update a CV", async () => {
      mockRepo.findByIdForUser.mockResolvedValue(MOCK_CV as never);
      mockRepo.update.mockResolvedValue({ ...MOCK_CV, title: "Updated" } as never);

      const result = await cvService.update(USER_ID, MOCK_CV.id, { title: "Updated" });

      expect(result.title).toBe("Updated");
    });

    it("should throw NotFound if CV doesn't exist", async () => {
      mockRepo.findByIdForUser.mockResolvedValue(null);

      await expect(
        cvService.update(USER_ID, "nonexistent", { title: "x" })
      ).rejects.toThrow(ApiError);
    });
  });

  describe("remove", () => {
    it("should delete a CV", async () => {
      mockRepo.findByIdForUser.mockResolvedValue(MOCK_CV as never);
      mockRepo.delete.mockResolvedValue(MOCK_CV as never);

      await cvService.remove(USER_ID, MOCK_CV.id);

      expect(mockRepo.delete).toHaveBeenCalledWith(MOCK_CV.id);
    });

    it("should throw NotFound if CV doesn't exist", async () => {
      mockRepo.findByIdForUser.mockResolvedValue(null);

      await expect(cvService.remove(USER_ID, "nonexistent")).rejects.toThrow(ApiError);
    });
  });

  describe("updateSectionOrder", () => {
    it("should update section order", async () => {
      mockRepo.findByIdForUser.mockResolvedValue(MOCK_CV as never);
      mockRepo.updateSectionOrder.mockResolvedValue(MOCK_CV as never);

      const order = ["summary", "experience", "education"];
      await cvService.updateSectionOrder(USER_ID, MOCK_CV.id, order);

      expect(mockRepo.updateSectionOrder).toHaveBeenCalledWith(MOCK_CV.id, order);
    });
  });

  describe("section CRUD - Experience", () => {
    it("should add an experience", async () => {
      mockRepo.findByIdForUser.mockResolvedValue(MOCK_CV as never);
      mockRepo.createExperience.mockResolvedValue({ id: "exp-1" } as never);

      const result = await cvService.addExperience(USER_ID, MOCK_CV.id, {
        title: "My Resume",
        templateId: "22222222-2222-2222-2222-222222222222",
        locale: "en",
        jobTitle: "Developer",
        company: "Acme",
        startDate: "2023-01",
        achievements: [],
        technologies: [],
        description: "",
        location: "",
        endDate: null,
        isCurrent: false,
        orderIndex: 0,
      });

      expect(result).toEqual({ id: "exp-1" });
    });

    it("should update an experience", async () => {
      mockRepo.findByIdForUser.mockResolvedValue(MOCK_CV as never);
      mockRepo.updateExperience.mockResolvedValue({ id: "exp-1", jobTitle: "Senior Dev" } as never);

      const result = await cvService.updateExperience(USER_ID, MOCK_CV.id, "exp-1", {
        jobTitle: "Senior Dev",
        company: "Acme",
        startDate: "2023-01",
        achievements: [],
        technologies: [],
        description: "",
        location: "",
        endDate: null,
        isCurrent: false,
        orderIndex: 0,
      });

      expect(result.jobTitle).toBe("Senior Dev");
    });

    it("should remove an experience", async () => {
      mockRepo.findByIdForUser.mockResolvedValue(MOCK_CV as never);
      mockRepo.deleteExperience.mockResolvedValue(undefined as never);

      await cvService.removeExperience(USER_ID, MOCK_CV.id, "exp-1");

      expect(mockRepo.deleteExperience).toHaveBeenCalledWith("exp-1");
    });
  });

  describe("section CRUD - Education", () => {
    it("should add an education", async () => {
      mockRepo.findByIdForUser.mockResolvedValue(MOCK_CV as never);
      mockRepo.createEducation.mockResolvedValue({ id: "edu-1" } as never);

      const result = await cvService.addEducation(USER_ID, MOCK_CV.id, {
        degree: "BS",
        fieldOfStudy: "CS",
        institution: "MIT",
        startDate: "2019-09",
        relevantCoursework: [],
        achievements: [],
        location: "",
        endDate: null,
        gpa: null,
        orderIndex: 0,
      });

      expect(result).toEqual({ id: "edu-1" });
    });
  });

  describe("section CRUD - Skill", () => {
    it("should add a skill", async () => {
      mockRepo.findByIdForUser.mockResolvedValue(MOCK_CV as never);
      mockRepo.createSkill.mockResolvedValue({ id: "skill-1" } as never);

      const result = await cvService.addSkill(USER_ID, MOCK_CV.id, {
        name: "TypeScript",
        category: "TECHNICAL",
        proficiencyLevel: "EXPERT",
        yearsOfExperience: 5,
        orderIndex: 0,
      });

      expect(result).toEqual({ id: "skill-1" });
    });
  });

  describe("upsertPersonalInfo", () => {
    it("should upsert personal info", async () => {
      mockRepo.findByIdForUser.mockResolvedValue(MOCK_CV as never);
      mockRepo.upsertPersonalInfo.mockResolvedValue({ id: "pi-1" } as never);

      const result = await cvService.upsertPersonalInfo(USER_ID, MOCK_CV.id, {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        professionalTitle: "",
        phone: "",
        city: "",
        country: "",
        zipCode: "",
        dateOfBirth: null,
        nationality: null,
        website: null,
        linkedIn: null,
        github: null,
        twitter: null,
        stackoverflow: null,
        medium: null,
        behance: null,
        dribbble: null,
        profilePhotoUrl: null,
        address: null,
      });

      expect(result).toEqual({ id: "pi-1" });
    });
  });
});
