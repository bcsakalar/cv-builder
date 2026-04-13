// ═══════════════════════════════════════════════════════════
// CV Service — Business logic layer
// ═══════════════════════════════════════════════════════════

import { cvRepository } from "./cv.repository";
import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { generateSlug } from "../../utils/helpers";
import { cacheDelete, cacheGet, cacheSet } from "../../lib/redis";
import { prisma } from "../../lib/prisma";
import { DEFAULT_SECTION_ORDER } from "@cvbuilder/shared";
import { DEFAULT_THEME_CONFIG } from "@cvbuilder/shared";
import type {
  CreateCVInput,
  UpdateCVInput,
  PersonalInfoInput,
  SummaryInput,
  ExperienceInput,
  EducationInput,
  SkillInput,
  ProjectInput,
  CertificationInput,
  LanguageInput,
  VolunteerExperienceInput,
  PublicationInput,
  AwardInput,
  ReferenceInput,
  HobbyInput,
  CustomSectionInput,
} from "./cv.schema";

function cacheKey(userId: string, id: string): string {
  return `cv:${userId}:${id}`;
}

export const cvService = {
  // ── CV CRUD ────────────────────────────────────────────

  async create(userId: string, input: CreateCVInput) {
    const slug = generateSlug(input.title);

    // Resolve templateId: accept both UUID and slug
    let templateId = input.templateId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId);
    if (!isUUID) {
      const template = await prisma.template.findFirst({ where: { slug: templateId } });
      if (!template) throw ApiError.notFound("Template");
      templateId = template.id;
    }

    const cv = await cvRepository.create({
      title: input.title,
      slug,
      status: "DRAFT",
      locale: input.locale ?? "en",
      isAtsOptimized: false,
      sectionOrder: DEFAULT_SECTION_ORDER,
      themeConfig: DEFAULT_THEME_CONFIG,
      user: { connect: { id: userId } },
      template: { connect: { id: templateId } },
    });

    return cv;
  },

  async getAll(userId: string) {
    return cvRepository.findAll(userId);
  },

  async getById(userId: string, id: string) {
    const cached = await cacheGet(cacheKey(userId, id));
    if (cached) return cached;

    const cv = await cvRepository.findByIdForUser(id, userId);
    if (!cv) throw ApiError.notFound("CV");

    await cacheSet(cacheKey(userId, id), cv, 600);
    return cv;
  },

  async update(userId: string, id: string, input: UpdateCVInput) {
    const existing = await cvRepository.findByIdForUser(id, userId);
    if (!existing) throw ApiError.notFound("CV");

    const cv = await cvRepository.update(id, {
      ...(input.title && { title: input.title }),
      ...(input.status && { status: input.status }),
      ...(input.templateId && { template: { connect: { id: input.templateId } } }),
      ...(input.locale && { locale: input.locale }),
      ...(input.isAtsOptimized !== undefined && { isAtsOptimized: input.isAtsOptimized }),
    });

    await cacheDelete(cacheKey(userId, id));
    return cv;
  },

  async remove(userId: string, id: string) {
    const existing = await cvRepository.findByIdForUser(id, userId);
    if (!existing) throw ApiError.notFound("CV");

    await cvRepository.delete(id);
    await cacheDelete(cacheKey(userId, id));
  },

  async updateSectionOrder(userId: string, id: string, sectionOrder: string[]) {
    const existing = await cvRepository.findByIdForUser(id, userId);
    if (!existing) throw ApiError.notFound("CV");

    const result = await cvRepository.updateSectionOrder(id, sectionOrder);
    await cacheDelete(cacheKey(userId, id));
    return result;
  },

  async updateTheme(userId: string, id: string, themeConfig: Record<string, unknown>) {
    const existing = await cvRepository.findByIdForUser(id, userId);
    if (!existing) throw ApiError.notFound("CV");

    const mergedConfig = {
      ...(existing.themeConfig as Record<string, unknown>),
      ...themeConfig,
    };

    const result = await cvRepository.updateTheme(id, mergedConfig);
    await cacheDelete(cacheKey(userId, id));
    return result;
  },

  // ── Personal Info ──────────────────────────────────────

  async upsertPersonalInfo(userId: string, cvId: string, input: PersonalInfoInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.upsertPersonalInfo(cvId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  // ── Summary ────────────────────────────────────────────

  async upsertSummary(userId: string, cvId: string, input: SummaryInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.upsertSummary(cvId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  // ── Experience ─────────────────────────────────────────

  async addExperience(userId: string, cvId: string, input: ExperienceInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.createExperience(cvId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async updateExperience(userId: string, cvId: string, experienceId: string, input: ExperienceInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.updateExperience(experienceId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async removeExperience(userId: string, cvId: string, experienceId: string) {
    await this.ensureCVAccess(userId, cvId);
    await cvRepository.deleteExperience(experienceId);
    await cacheDelete(cacheKey(userId, cvId));
  },

  // ── Education ──────────────────────────────────────────

  async addEducation(userId: string, cvId: string, input: EducationInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.createEducation(cvId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async updateEducation(userId: string, cvId: string, educationId: string, input: EducationInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.updateEducation(educationId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async removeEducation(userId: string, cvId: string, educationId: string) {
    await this.ensureCVAccess(userId, cvId);
    await cvRepository.deleteEducation(educationId);
    await cacheDelete(cacheKey(userId, cvId));
  },

  // ── Skills ─────────────────────────────────────────────

  async addSkill(userId: string, cvId: string, input: SkillInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.createSkill(cvId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async updateSkill(userId: string, cvId: string, skillId: string, input: SkillInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.updateSkill(skillId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async removeSkill(userId: string, cvId: string, skillId: string) {
    await this.ensureCVAccess(userId, cvId);
    await cvRepository.deleteSkill(skillId);
    await cacheDelete(cacheKey(userId, cvId));
  },

  // ── Projects ───────────────────────────────────────────

  async addProject(userId: string, cvId: string, input: ProjectInput) {
    await this.ensureCVAccess(userId, cvId);
    const { githubRepoData, ...rest } = input;
    const result = await cvRepository.createProject(cvId, {
      ...rest,
      githubRepoData: githubRepoData === null
        ? Prisma.DbNull
        : (githubRepoData as Prisma.InputJsonValue),
    });
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async updateProject(userId: string, cvId: string, projectId: string, input: ProjectInput) {
    await this.ensureCVAccess(userId, cvId);
    const { githubRepoData, ...rest } = input;
    const result = await cvRepository.updateProject(projectId, {
      ...rest,
      githubRepoData: githubRepoData === null
        ? Prisma.DbNull
        : (githubRepoData as Prisma.InputJsonValue),
    });
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async removeProject(userId: string, cvId: string, projectId: string) {
    await this.ensureCVAccess(userId, cvId);
    await cvRepository.deleteProject(projectId);
    await cacheDelete(cacheKey(userId, cvId));
  },

  // ── Certifications ─────────────────────────────────────

  async addCertification(userId: string, cvId: string, input: CertificationInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.createCertification(cvId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async updateCertification(userId: string, cvId: string, certId: string, input: CertificationInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.updateCertification(certId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async removeCertification(userId: string, cvId: string, certId: string) {
    await this.ensureCVAccess(userId, cvId);
    await cvRepository.deleteCertification(certId);
    await cacheDelete(cacheKey(userId, cvId));
  },

  // ── Languages ──────────────────────────────────────────

  async addLanguage(userId: string, cvId: string, input: LanguageInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.createLanguage(cvId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async updateLanguage(userId: string, cvId: string, langId: string, input: LanguageInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.updateLanguage(langId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async removeLanguage(userId: string, cvId: string, langId: string) {
    await this.ensureCVAccess(userId, cvId);
    await cvRepository.deleteLanguage(langId);
    await cacheDelete(cacheKey(userId, cvId));
  },

  // ── Volunteer Experience ───────────────────────────────

  async addVolunteerExperience(userId: string, cvId: string, input: VolunteerExperienceInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.createVolunteerExperience(cvId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async updateVolunteerExperience(userId: string, cvId: string, volId: string, input: VolunteerExperienceInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.updateVolunteerExperience(volId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async removeVolunteerExperience(userId: string, cvId: string, volId: string) {
    await this.ensureCVAccess(userId, cvId);
    await cvRepository.deleteVolunteerExperience(volId);
    await cacheDelete(cacheKey(userId, cvId));
  },

  // ── Publications ───────────────────────────────────────

  async addPublication(userId: string, cvId: string, input: PublicationInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.createPublication(cvId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async updatePublication(userId: string, cvId: string, pubId: string, input: PublicationInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.updatePublication(pubId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async removePublication(userId: string, cvId: string, pubId: string) {
    await this.ensureCVAccess(userId, cvId);
    await cvRepository.deletePublication(pubId);
    await cacheDelete(cacheKey(userId, cvId));
  },

  // ── Awards ─────────────────────────────────────────────

  async addAward(userId: string, cvId: string, input: AwardInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.createAward(cvId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async updateAward(userId: string, cvId: string, awardId: string, input: AwardInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.updateAward(awardId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async removeAward(userId: string, cvId: string, awardId: string) {
    await this.ensureCVAccess(userId, cvId);
    await cvRepository.deleteAward(awardId);
    await cacheDelete(cacheKey(userId, cvId));
  },

  // ── References ─────────────────────────────────────────

  async addReference(userId: string, cvId: string, input: ReferenceInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.createReference(cvId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async updateReference(userId: string, cvId: string, refId: string, input: ReferenceInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.updateReference(refId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async removeReference(userId: string, cvId: string, refId: string) {
    await this.ensureCVAccess(userId, cvId);
    await cvRepository.deleteReference(refId);
    await cacheDelete(cacheKey(userId, cvId));
  },

  // ── Hobbies ────────────────────────────────────────────

  async addHobby(userId: string, cvId: string, input: HobbyInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.createHobby(cvId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async updateHobby(userId: string, cvId: string, hobbyId: string, input: HobbyInput) {
    await this.ensureCVAccess(userId, cvId);
    const result = await cvRepository.updateHobby(hobbyId, input);
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async removeHobby(userId: string, cvId: string, hobbyId: string) {
    await this.ensureCVAccess(userId, cvId);
    await cvRepository.deleteHobby(hobbyId);
    await cacheDelete(cacheKey(userId, cvId));
  },

  // ── Custom Sections ────────────────────────────────────

  async addCustomSection(userId: string, cvId: string, input: CustomSectionInput) {
    await this.ensureCVAccess(userId, cvId);
    const { content, ...rest } = input;
    const result = await cvRepository.createCustomSection(cvId, {
      ...rest,
      content: content as Prisma.InputJsonValue,
    });
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async updateCustomSection(userId: string, cvId: string, sectionId: string, input: CustomSectionInput) {
    await this.ensureCVAccess(userId, cvId);
    const { content, ...rest } = input;
    const result = await cvRepository.updateCustomSection(sectionId, {
      ...rest,
      content: content as Prisma.InputJsonValue,
    });
    await cacheDelete(cacheKey(userId, cvId));
    return result;
  },

  async removeCustomSection(userId: string, cvId: string, sectionId: string) {
    await this.ensureCVAccess(userId, cvId);
    await cvRepository.deleteCustomSection(sectionId);
    await cacheDelete(cacheKey(userId, cvId));
  },

  // ── Helpers ────────────────────────────────────────────

  async ensureCVAccess(userId: string, cvId: string) {
    const cv = await cvRepository.findByIdForUser(cvId, userId);
    if (!cv) throw ApiError.notFound("CV");
    return cv;
  },
};
