// ═══════════════════════════════════════════════════════════
// CV Repository — Prisma data access layer
// ═══════════════════════════════════════════════════════════

import { prisma } from "../../lib/prisma";
import type { Prisma } from "@prisma/client";

const CV_WITH_RELATIONS = {
  personalInfo: true,
  summary: true,
  experiences: { orderBy: { orderIndex: "asc" as const } },
  educations: { orderBy: { orderIndex: "asc" as const } },
  skills: { orderBy: { orderIndex: "asc" as const } },
  projects: { orderBy: { orderIndex: "asc" as const } },
  certifications: { orderBy: { orderIndex: "asc" as const } },
  languages: { orderBy: { orderIndex: "asc" as const } },
  volunteerExperiences: { orderBy: { orderIndex: "asc" as const } },
  publications: { orderBy: { orderIndex: "asc" as const } },
  awards: { orderBy: { orderIndex: "asc" as const } },
  references: { orderBy: { orderIndex: "asc" as const } },
  hobbies: { orderBy: { orderIndex: "asc" as const } },
  customSections: { orderBy: { orderIndex: "asc" as const } },
  template: true,
} satisfies Prisma.CVInclude;

export const cvRepository = {
  async create(data: Prisma.CVCreateInput) {
    return prisma.cV.create({
      data,
      include: CV_WITH_RELATIONS,
    });
  },

  async findAll(userId: string) {
    return prisma.cV.findMany({
      where: { userId },
      include: {
        template: true,
        personalInfo: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.cV.findUnique({
      where: { id },
      include: CV_WITH_RELATIONS,
    });
  },

  async findByIdForUser(id: string, userId: string) {
    return prisma.cV.findFirst({
      where: { id, userId },
      include: CV_WITH_RELATIONS,
    });
  },

  async findBySlug(slug: string) {
    return prisma.cV.findUnique({
      where: { slug },
      include: CV_WITH_RELATIONS,
    });
  },

  async update(id: string, data: Prisma.CVUpdateInput) {
    return prisma.cV.update({
      where: { id },
      data,
      include: CV_WITH_RELATIONS,
    });
  },

  async delete(id: string) {
    return prisma.cV.delete({
      where: { id },
    });
  },

  async updateSectionOrder(id: string, sectionOrder: string[]) {
    return prisma.cV.update({
      where: { id },
      data: { sectionOrder },
    });
  },

  async updateTheme(id: string, themeConfig: Record<string, unknown>) {
    return prisma.cV.update({
      where: { id },
      data: { themeConfig: themeConfig as Prisma.InputJsonValue },
    });
  },

  async count(userId: string) {
    return prisma.cV.count({ where: { userId } });
  },

  // ── Personal Info ────────────────────────────────────

  async upsertPersonalInfo(cvId: string, data: Prisma.PersonalInfoCreateWithoutCvInput) {
    return prisma.personalInfo.upsert({
      where: { cvId },
      create: { ...data, cv: { connect: { id: cvId } } },
      update: data,
    });
  },

  async getPersonalInfo(cvId: string) {
    return prisma.personalInfo.findUnique({ where: { cvId } });
  },

  // ── Summary ──────────────────────────────────────────

  async upsertSummary(cvId: string, data: { content: string; aiGenerated: boolean }) {
    return prisma.summary.upsert({
      where: { cvId },
      create: { ...data, cv: { connect: { id: cvId } } },
      update: data,
    });
  },

  async getSummary(cvId: string) {
    return prisma.summary.findUnique({ where: { cvId } });
  },

  // ── Experience ───────────────────────────────────────

  async createExperience(cvId: string, data: Prisma.ExperienceCreateWithoutCvInput) {
    return prisma.experience.create({
      data: { ...data, cv: { connect: { id: cvId } } },
    });
  },

  async updateExperience(id: string, data: Prisma.ExperienceUpdateInput) {
    return prisma.experience.update({ where: { id }, data });
  },

  async deleteExperience(id: string) {
    return prisma.experience.delete({ where: { id } });
  },

  // ── Education ────────────────────────────────────────

  async createEducation(cvId: string, data: Prisma.EducationCreateWithoutCvInput) {
    return prisma.education.create({
      data: { ...data, cv: { connect: { id: cvId } } },
    });
  },

  async updateEducation(id: string, data: Prisma.EducationUpdateInput) {
    return prisma.education.update({ where: { id }, data });
  },

  async deleteEducation(id: string) {
    return prisma.education.delete({ where: { id } });
  },

  // ── Skill ────────────────────────────────────────────

  async createSkill(cvId: string, data: Prisma.SkillCreateWithoutCvInput) {
    return prisma.skill.create({
      data: { ...data, cv: { connect: { id: cvId } } },
    });
  },

  async updateSkill(id: string, data: Prisma.SkillUpdateInput) {
    return prisma.skill.update({ where: { id }, data });
  },

  async deleteSkill(id: string) {
    return prisma.skill.delete({ where: { id } });
  },

  // ── Project ──────────────────────────────────────────

  async createProject(cvId: string, data: Prisma.ProjectCreateWithoutCvInput) {
    return prisma.project.create({
      data: { ...data, cv: { connect: { id: cvId } } },
    });
  },

  async updateProject(id: string, data: Prisma.ProjectUpdateInput) {
    return prisma.project.update({ where: { id }, data });
  },

  async deleteProject(id: string) {
    return prisma.project.delete({ where: { id } });
  },

  // ── Certification ────────────────────────────────────

  async createCertification(cvId: string, data: Prisma.CertificationCreateWithoutCvInput) {
    return prisma.certification.create({
      data: { ...data, cv: { connect: { id: cvId } } },
    });
  },

  async updateCertification(id: string, data: Prisma.CertificationUpdateInput) {
    return prisma.certification.update({ where: { id }, data });
  },

  async deleteCertification(id: string) {
    return prisma.certification.delete({ where: { id } });
  },

  // ── Language ─────────────────────────────────────────

  async createLanguage(cvId: string, data: Prisma.LanguageCreateWithoutCvInput) {
    return prisma.language.create({
      data: { ...data, cv: { connect: { id: cvId } } },
    });
  },

  async updateLanguage(id: string, data: Prisma.LanguageUpdateInput) {
    return prisma.language.update({ where: { id }, data });
  },

  async deleteLanguage(id: string) {
    return prisma.language.delete({ where: { id } });
  },

  // ── Volunteer Experience ─────────────────────────────

  async createVolunteerExperience(cvId: string, data: Prisma.VolunteerExperienceCreateWithoutCvInput) {
    return prisma.volunteerExperience.create({
      data: { ...data, cv: { connect: { id: cvId } } },
    });
  },

  async updateVolunteerExperience(id: string, data: Prisma.VolunteerExperienceUpdateInput) {
    return prisma.volunteerExperience.update({ where: { id }, data });
  },

  async deleteVolunteerExperience(id: string) {
    return prisma.volunteerExperience.delete({ where: { id } });
  },

  // ── Publication ──────────────────────────────────────

  async createPublication(cvId: string, data: Prisma.PublicationCreateWithoutCvInput) {
    return prisma.publication.create({
      data: { ...data, cv: { connect: { id: cvId } } },
    });
  },

  async updatePublication(id: string, data: Prisma.PublicationUpdateInput) {
    return prisma.publication.update({ where: { id }, data });
  },

  async deletePublication(id: string) {
    return prisma.publication.delete({ where: { id } });
  },

  // ── Award ────────────────────────────────────────────

  async createAward(cvId: string, data: Prisma.AwardCreateWithoutCvInput) {
    return prisma.award.create({
      data: { ...data, cv: { connect: { id: cvId } } },
    });
  },

  async updateAward(id: string, data: Prisma.AwardUpdateInput) {
    return prisma.award.update({ where: { id }, data });
  },

  async deleteAward(id: string) {
    return prisma.award.delete({ where: { id } });
  },

  // ── Reference ────────────────────────────────────────

  async createReference(cvId: string, data: Prisma.ReferenceCreateWithoutCvInput) {
    return prisma.reference.create({
      data: { ...data, cv: { connect: { id: cvId } } },
    });
  },

  async updateReference(id: string, data: Prisma.ReferenceUpdateInput) {
    return prisma.reference.update({ where: { id }, data });
  },

  async deleteReference(id: string) {
    return prisma.reference.delete({ where: { id } });
  },

  // ── Hobby ────────────────────────────────────────────

  async createHobby(cvId: string, data: Prisma.HobbyCreateWithoutCvInput) {
    return prisma.hobby.create({
      data: { ...data, cv: { connect: { id: cvId } } },
    });
  },

  async updateHobby(id: string, data: Prisma.HobbyUpdateInput) {
    return prisma.hobby.update({ where: { id }, data });
  },

  async deleteHobby(id: string) {
    return prisma.hobby.delete({ where: { id } });
  },

  // ── Custom Section ──────────────────────────────────

  async createCustomSection(cvId: string, data: Prisma.CustomSectionCreateWithoutCvInput) {
    return prisma.customSection.create({
      data: { ...data, cv: { connect: { id: cvId } } },
    });
  },

  async updateCustomSection(id: string, data: Prisma.CustomSectionUpdateInput) {
    return prisma.customSection.update({ where: { id }, data });
  },

  async deleteCustomSection(id: string) {
    return prisma.customSection.delete({ where: { id } });
  },
};
