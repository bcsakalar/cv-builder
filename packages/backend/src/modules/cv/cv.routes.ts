// ═══════════════════════════════════════════════════════════
// CV Routes
// ═══════════════════════════════════════════════════════════

import { Router } from "express";
import { z } from "zod";
import { cvController } from "./cv.controller";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware/async-handler";
import {
  createCVSchema,
  updateCVSchema,
  updateThemeSchema,
  updateSectionOrderSchema,
  cloneCVSchema,
  cvIdParamSchema,
  personalInfoSchema,
  summarySchema,
  coverLetterSchema,
  experienceSchema,
  educationSchema,
  skillSchema,
  projectSchema,
  certificationSchema,
  languageSchema,
  volunteerExperienceSchema,
  publicationSchema,
  awardSchema,
  referenceSchema,
  hobbySchema,
  customSectionSchema,
} from "./cv.schema";

const router = Router();

const cvIdParam = z.object({ cvId: z.string().uuid() });
const sectionIdParam = z.object({ cvId: z.string().uuid(), id: z.string().uuid() });

// ── CV CRUD ──────────────────────────────────────────────

router.post(
  "/",
  validate({ body: createCVSchema }),
  asyncHandler(cvController.create)
);

router.get(
  "/",
  asyncHandler(cvController.getAll)
);

router.get(
  "/:id",
  validate({ params: cvIdParamSchema }),
  asyncHandler(cvController.getById)
);

router.put(
  "/:id",
  validate({ params: cvIdParamSchema, body: updateCVSchema }),
  asyncHandler(cvController.update)
);

router.delete(
  "/:id",
  validate({ params: cvIdParamSchema }),
  asyncHandler(cvController.remove)
);

router.post(
  "/:id/clone",
  validate({ params: cvIdParamSchema, body: cloneCVSchema }),
  asyncHandler(cvController.clone)
);

router.patch(
  "/:id/section-order",
  validate({ params: cvIdParamSchema, body: updateSectionOrderSchema }),
  asyncHandler(cvController.updateSectionOrder)
);

router.patch(
  "/:id/theme",
  validate({ params: cvIdParamSchema, body: updateThemeSchema }),
  asyncHandler(cvController.updateTheme)
);

// ── Personal Info ────────────────────────────────────────

router.put(
  "/:cvId/personal-info",
  validate({ params: cvIdParam, body: personalInfoSchema }),
  asyncHandler(cvController.upsertPersonalInfo)
);

// ── Summary ──────────────────────────────────────────────

router.put(
  "/:cvId/summary",
  validate({ params: cvIdParam, body: summarySchema }),
  asyncHandler(cvController.upsertSummary)
);

router.put(
  "/:cvId/cover-letter",
  validate({ params: cvIdParam, body: coverLetterSchema }),
  asyncHandler(cvController.upsertCoverLetter)
);

// ── Experience ───────────────────────────────────────────

router.post(
  "/:cvId/experiences",
  validate({ params: cvIdParam, body: experienceSchema }),
  asyncHandler(cvController.addExperience)
);

router.put(
  "/:cvId/experiences/:id",
  validate({ params: sectionIdParam, body: experienceSchema }),
  asyncHandler(cvController.updateExperience)
);

router.delete(
  "/:cvId/experiences/:id",
  validate({ params: sectionIdParam }),
  asyncHandler(cvController.removeExperience)
);

// ── Education ────────────────────────────────────────────

router.post(
  "/:cvId/educations",
  validate({ params: cvIdParam, body: educationSchema }),
  asyncHandler(cvController.addEducation)
);

router.put(
  "/:cvId/educations/:id",
  validate({ params: sectionIdParam, body: educationSchema }),
  asyncHandler(cvController.updateEducation)
);

router.delete(
  "/:cvId/educations/:id",
  validate({ params: sectionIdParam }),
  asyncHandler(cvController.removeEducation)
);

// ── Skills ───────────────────────────────────────────────

router.post(
  "/:cvId/skills",
  validate({ params: cvIdParam, body: skillSchema }),
  asyncHandler(cvController.addSkill)
);

router.put(
  "/:cvId/skills/:id",
  validate({ params: sectionIdParam, body: skillSchema }),
  asyncHandler(cvController.updateSkill)
);

router.delete(
  "/:cvId/skills/:id",
  validate({ params: sectionIdParam }),
  asyncHandler(cvController.removeSkill)
);

// ── Projects ─────────────────────────────────────────────

router.post(
  "/:cvId/projects",
  validate({ params: cvIdParam, body: projectSchema }),
  asyncHandler(cvController.addProject)
);

router.put(
  "/:cvId/projects/:id",
  validate({ params: sectionIdParam, body: projectSchema }),
  asyncHandler(cvController.updateProject)
);

router.delete(
  "/:cvId/projects/:id",
  validate({ params: sectionIdParam }),
  asyncHandler(cvController.removeProject)
);

// ── Certifications ───────────────────────────────────────

router.post(
  "/:cvId/certifications",
  validate({ params: cvIdParam, body: certificationSchema }),
  asyncHandler(cvController.addCertification)
);

router.put(
  "/:cvId/certifications/:id",
  validate({ params: sectionIdParam, body: certificationSchema }),
  asyncHandler(cvController.updateCertification)
);

router.delete(
  "/:cvId/certifications/:id",
  validate({ params: sectionIdParam }),
  asyncHandler(cvController.removeCertification)
);

// ── Languages ────────────────────────────────────────────

router.post(
  "/:cvId/languages",
  validate({ params: cvIdParam, body: languageSchema }),
  asyncHandler(cvController.addLanguage)
);

router.put(
  "/:cvId/languages/:id",
  validate({ params: sectionIdParam, body: languageSchema }),
  asyncHandler(cvController.updateLanguage)
);

router.delete(
  "/:cvId/languages/:id",
  validate({ params: sectionIdParam }),
  asyncHandler(cvController.removeLanguage)
);

// ── Volunteer Experience ──────────────────────────────────

router.post(
  "/:cvId/volunteer-experiences",
  validate({ params: cvIdParam, body: volunteerExperienceSchema }),
  asyncHandler(cvController.addVolunteerExperience)
);

router.put(
  "/:cvId/volunteer-experiences/:id",
  validate({ params: sectionIdParam, body: volunteerExperienceSchema }),
  asyncHandler(cvController.updateVolunteerExperience)
);

router.delete(
  "/:cvId/volunteer-experiences/:id",
  validate({ params: sectionIdParam }),
  asyncHandler(cvController.removeVolunteerExperience)
);

// ── Publications ─────────────────────────────────────────

router.post(
  "/:cvId/publications",
  validate({ params: cvIdParam, body: publicationSchema }),
  asyncHandler(cvController.addPublication)
);

router.put(
  "/:cvId/publications/:id",
  validate({ params: sectionIdParam, body: publicationSchema }),
  asyncHandler(cvController.updatePublication)
);

router.delete(
  "/:cvId/publications/:id",
  validate({ params: sectionIdParam }),
  asyncHandler(cvController.removePublication)
);

// ── Awards ───────────────────────────────────────────────

router.post(
  "/:cvId/awards",
  validate({ params: cvIdParam, body: awardSchema }),
  asyncHandler(cvController.addAward)
);

router.put(
  "/:cvId/awards/:id",
  validate({ params: sectionIdParam, body: awardSchema }),
  asyncHandler(cvController.updateAward)
);

router.delete(
  "/:cvId/awards/:id",
  validate({ params: sectionIdParam }),
  asyncHandler(cvController.removeAward)
);

// ── References ───────────────────────────────────────────

router.post(
  "/:cvId/references",
  validate({ params: cvIdParam, body: referenceSchema }),
  asyncHandler(cvController.addReference)
);

router.put(
  "/:cvId/references/:id",
  validate({ params: sectionIdParam, body: referenceSchema }),
  asyncHandler(cvController.updateReference)
);

router.delete(
  "/:cvId/references/:id",
  validate({ params: sectionIdParam }),
  asyncHandler(cvController.removeReference)
);

// ── Hobbies ──────────────────────────────────────────────

router.post(
  "/:cvId/hobbies",
  validate({ params: cvIdParam, body: hobbySchema }),
  asyncHandler(cvController.addHobby)
);

router.put(
  "/:cvId/hobbies/:id",
  validate({ params: sectionIdParam, body: hobbySchema }),
  asyncHandler(cvController.updateHobby)
);

router.delete(
  "/:cvId/hobbies/:id",
  validate({ params: sectionIdParam }),
  asyncHandler(cvController.removeHobby)
);

// ── Custom Sections ──────────────────────────────────────

router.post(
  "/:cvId/custom-sections",
  validate({ params: cvIdParam, body: customSectionSchema }),
  asyncHandler(cvController.addCustomSection)
);

router.put(
  "/:cvId/custom-sections/:id",
  validate({ params: sectionIdParam, body: customSectionSchema }),
  asyncHandler(cvController.updateCustomSection)
);

router.delete(
  "/:cvId/custom-sections/:id",
  validate({ params: sectionIdParam }),
  asyncHandler(cvController.removeCustomSection)
);

export { router as cvRoutes };
