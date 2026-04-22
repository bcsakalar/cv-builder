// ═══════════════════════════════════════════════════════════
// CV Controller — Request handling layer
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from "express";
import { requireAuthUser } from "../../middleware/auth";
import { cvService } from "./cv.service";
import { sendSuccess, sendCreated, sendNoContent } from "../../utils/api-response";

// Express 5 params can be string | string[] | undefined; Zod validation guarantees string
function param(req: Request, key: string): string {
  return req.params[key] as string;
}

function currentUserId(req: Request): string {
  return requireAuthUser(req).userId;
}

export const cvController = {
  // ── CV CRUD ────────────────────────────────────────────

  async create(req: Request, res: Response) {
    const cv = await cvService.create(currentUserId(req), req.body);
    sendCreated(res, cv, "CV created successfully");
  },

  async getAll(req: Request, res: Response) {
    const cvs = await cvService.getAll(currentUserId(req));
    sendSuccess(res, cvs, "CVs retrieved successfully");
  },

  async getById(req: Request, res: Response) {
    const cv = await cvService.getById(currentUserId(req), param(req, "id"));
    sendSuccess(res, cv, "CV retrieved successfully");
  },

  async update(req: Request, res: Response) {
    const cv = await cvService.update(currentUserId(req), param(req, "id"), req.body);
    sendSuccess(res, cv, "CV updated successfully");
  },

  async remove(req: Request, res: Response) {
    await cvService.remove(currentUserId(req), param(req, "id"));
    sendNoContent(res);
  },

  async clone(req: Request, res: Response) {
    const cv = await cvService.clone(currentUserId(req), param(req, "id"), req.body);
    sendCreated(res, cv, "CV variant created successfully");
  },

  async updateSectionOrder(req: Request, res: Response) {
    const cv = await cvService.updateSectionOrder(currentUserId(req), param(req, "id"), req.body.sectionOrder);
    sendSuccess(res, cv, "Section order updated");
  },

  async updateTheme(req: Request, res: Response) {
    const cv = await cvService.updateTheme(currentUserId(req), param(req, "id"), req.body.themeConfig);
    sendSuccess(res, cv, "Theme updated");
  },

  // ── Personal Info ──────────────────────────────────────

  async upsertPersonalInfo(req: Request, res: Response) {
    const result = await cvService.upsertPersonalInfo(currentUserId(req), param(req, "cvId"), req.body);
    sendSuccess(res, result, "Personal info saved");
  },

  // ── Summary ────────────────────────────────────────────

  async upsertSummary(req: Request, res: Response) {
    const result = await cvService.upsertSummary(currentUserId(req), param(req, "cvId"), req.body);
    sendSuccess(res, result, "Summary saved");
  },

  async upsertCoverLetter(req: Request, res: Response) {
    const result = await cvService.upsertCoverLetter(currentUserId(req), param(req, "cvId"), req.body);
    sendSuccess(res, result, "Cover letter saved");
  },

  // ── Experience ─────────────────────────────────────────

  async addExperience(req: Request, res: Response) {
    const result = await cvService.addExperience(currentUserId(req), param(req, "cvId"), req.body);
    sendCreated(res, result, "Experience added");
  },

  async updateExperience(req: Request, res: Response) {
    const result = await cvService.updateExperience(currentUserId(req), param(req, "cvId"), param(req, "id"), req.body);
    sendSuccess(res, result, "Experience updated");
  },

  async removeExperience(req: Request, res: Response) {
    await cvService.removeExperience(currentUserId(req), param(req, "cvId"), param(req, "id"));
    sendNoContent(res);
  },

  // ── Education ──────────────────────────────────────────

  async addEducation(req: Request, res: Response) {
    const result = await cvService.addEducation(currentUserId(req), param(req, "cvId"), req.body);
    sendCreated(res, result, "Education added");
  },

  async updateEducation(req: Request, res: Response) {
    const result = await cvService.updateEducation(currentUserId(req), param(req, "cvId"), param(req, "id"), req.body);
    sendSuccess(res, result, "Education updated");
  },

  async removeEducation(req: Request, res: Response) {
    await cvService.removeEducation(currentUserId(req), param(req, "cvId"), param(req, "id"));
    sendNoContent(res);
  },

  // ── Skills ─────────────────────────────────────────────

  async addSkill(req: Request, res: Response) {
    const result = await cvService.addSkill(currentUserId(req), param(req, "cvId"), req.body);
    sendCreated(res, result, "Skill added");
  },

  async updateSkill(req: Request, res: Response) {
    const result = await cvService.updateSkill(currentUserId(req), param(req, "cvId"), param(req, "id"), req.body);
    sendSuccess(res, result, "Skill updated");
  },

  async removeSkill(req: Request, res: Response) {
    await cvService.removeSkill(currentUserId(req), param(req, "cvId"), param(req, "id"));
    sendNoContent(res);
  },

  // ── Projects ───────────────────────────────────────────

  async addProject(req: Request, res: Response) {
    const result = await cvService.addProject(currentUserId(req), param(req, "cvId"), req.body);
    sendCreated(res, result, "Project added");
  },

  async updateProject(req: Request, res: Response) {
    const result = await cvService.updateProject(currentUserId(req), param(req, "cvId"), param(req, "id"), req.body);
    sendSuccess(res, result, "Project updated");
  },

  async removeProject(req: Request, res: Response) {
    await cvService.removeProject(currentUserId(req), param(req, "cvId"), param(req, "id"));
    sendNoContent(res);
  },

  // ── Certifications ─────────────────────────────────────

  async addCertification(req: Request, res: Response) {
    const result = await cvService.addCertification(currentUserId(req), param(req, "cvId"), req.body);
    sendCreated(res, result, "Certification added");
  },

  async updateCertification(req: Request, res: Response) {
    const result = await cvService.updateCertification(currentUserId(req), param(req, "cvId"), param(req, "id"), req.body);
    sendSuccess(res, result, "Certification updated");
  },

  async removeCertification(req: Request, res: Response) {
    await cvService.removeCertification(currentUserId(req), param(req, "cvId"), param(req, "id"));
    sendNoContent(res);
  },

  // ── Languages ──────────────────────────────────────────

  async addLanguage(req: Request, res: Response) {
    const result = await cvService.addLanguage(currentUserId(req), param(req, "cvId"), req.body);
    sendCreated(res, result, "Language added");
  },

  async updateLanguage(req: Request, res: Response) {
    const result = await cvService.updateLanguage(currentUserId(req), param(req, "cvId"), param(req, "id"), req.body);
    sendSuccess(res, result, "Language updated");
  },

  async removeLanguage(req: Request, res: Response) {
    await cvService.removeLanguage(currentUserId(req), param(req, "cvId"), param(req, "id"));
    sendNoContent(res);
  },

  // ── Volunteer Experience ───────────────────────────────

  async addVolunteerExperience(req: Request, res: Response) {
    const result = await cvService.addVolunteerExperience(currentUserId(req), param(req, "cvId"), req.body);
    sendCreated(res, result, "Volunteer experience added");
  },

  async updateVolunteerExperience(req: Request, res: Response) {
    const result = await cvService.updateVolunteerExperience(currentUserId(req), param(req, "cvId"), param(req, "id"), req.body);
    sendSuccess(res, result, "Volunteer experience updated");
  },

  async removeVolunteerExperience(req: Request, res: Response) {
    await cvService.removeVolunteerExperience(currentUserId(req), param(req, "cvId"), param(req, "id"));
    sendNoContent(res);
  },

  // ── Publications ───────────────────────────────────────

  async addPublication(req: Request, res: Response) {
    const result = await cvService.addPublication(currentUserId(req), param(req, "cvId"), req.body);
    sendCreated(res, result, "Publication added");
  },

  async updatePublication(req: Request, res: Response) {
    const result = await cvService.updatePublication(currentUserId(req), param(req, "cvId"), param(req, "id"), req.body);
    sendSuccess(res, result, "Publication updated");
  },

  async removePublication(req: Request, res: Response) {
    await cvService.removePublication(currentUserId(req), param(req, "cvId"), param(req, "id"));
    sendNoContent(res);
  },

  // ── Awards ─────────────────────────────────────────────

  async addAward(req: Request, res: Response) {
    const result = await cvService.addAward(currentUserId(req), param(req, "cvId"), req.body);
    sendCreated(res, result, "Award added");
  },

  async updateAward(req: Request, res: Response) {
    const result = await cvService.updateAward(currentUserId(req), param(req, "cvId"), param(req, "id"), req.body);
    sendSuccess(res, result, "Award updated");
  },

  async removeAward(req: Request, res: Response) {
    await cvService.removeAward(currentUserId(req), param(req, "cvId"), param(req, "id"));
    sendNoContent(res);
  },

  // ── References ─────────────────────────────────────────

  async addReference(req: Request, res: Response) {
    const result = await cvService.addReference(currentUserId(req), param(req, "cvId"), req.body);
    sendCreated(res, result, "Reference added");
  },

  async updateReference(req: Request, res: Response) {
    const result = await cvService.updateReference(currentUserId(req), param(req, "cvId"), param(req, "id"), req.body);
    sendSuccess(res, result, "Reference updated");
  },

  async removeReference(req: Request, res: Response) {
    await cvService.removeReference(currentUserId(req), param(req, "cvId"), param(req, "id"));
    sendNoContent(res);
  },

  // ── Hobbies ────────────────────────────────────────────

  async addHobby(req: Request, res: Response) {
    const result = await cvService.addHobby(currentUserId(req), param(req, "cvId"), req.body);
    sendCreated(res, result, "Hobby added");
  },

  async updateHobby(req: Request, res: Response) {
    const result = await cvService.updateHobby(currentUserId(req), param(req, "cvId"), param(req, "id"), req.body);
    sendSuccess(res, result, "Hobby updated");
  },

  async removeHobby(req: Request, res: Response) {
    await cvService.removeHobby(currentUserId(req), param(req, "cvId"), param(req, "id"));
    sendNoContent(res);
  },

  // ── Custom Sections ────────────────────────────────────

  async addCustomSection(req: Request, res: Response) {
    const result = await cvService.addCustomSection(currentUserId(req), param(req, "cvId"), req.body);
    sendCreated(res, result, "Custom section added");
  },

  async updateCustomSection(req: Request, res: Response) {
    const result = await cvService.updateCustomSection(currentUserId(req), param(req, "cvId"), param(req, "id"), req.body);
    sendSuccess(res, result, "Custom section updated");
  },

  async removeCustomSection(req: Request, res: Response) {
    await cvService.removeCustomSection(currentUserId(req), param(req, "cvId"), param(req, "id"));
    sendNoContent(res);
  },
};
