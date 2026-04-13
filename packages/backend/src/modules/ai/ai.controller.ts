// ═══════════════════════════════════════════════════════════
// AI Controller — Request handling layer
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from "express";
import { aiService } from "./ai.service";
import { sendSuccess } from "../../utils/api-response";
import { ApiError } from "../../utils/api-error";
import { requireAuthUser } from "../../middleware/auth";
import { z } from "zod";
import { checkOllamaHealth, checkModelAvailable, getAvailableModels } from "../../lib/ollama";
import { ollamaConfig } from "../../config/ollama";

// ── Validation schemas ───────────────────────────────────

const improveSchema = z.object({
  description: z.string().min(1),
  jobTitle: z.string().min(1),
  company: z.string().min(1),
});

const improveProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  technologies: z.array(z.string()).default([]),
});

const coverLetterSchema = z.object({
  jobDescription: z.string().optional(),
});

const jobMatchSchema = z.object({
  jobDescription: z.string().min(10, "Job description must be at least 10 characters"),
});

const tailorSchema = z.object({
  jobDescription: z.string().min(10, "Job description must be at least 10 characters"),
});

/** Extract locale from Accept-Language header */
function getLocale(req: Request): string {
  const header = req.headers["accept-language"];
  // Take only the primary locale code (e.g. "tr" from "tr,en;q=0.9")
  const locale = typeof header === "string" ? header.split(",")[0]?.split("-")[0]?.trim() : undefined;
  return locale ?? "en";
}

function currentUserId(req: Request): string {
  return requireAuthUser(req).userId;
}

export const aiController = {
  // ── Health ─────────────────────────────────────────────

  async health(_req: Request, res: Response) {
    const [ollamaUp, modelReady, models] = await Promise.all([
      checkOllamaHealth(),
      checkModelAvailable(ollamaConfig.defaultModel),
      getAvailableModels(),
    ]);

    sendSuccess(res, {
      ollama: ollamaUp ? "connected" : "unavailable",
      model: ollamaConfig.defaultModel,
      modelAvailable: modelReady,
      availableModels: models,
    });
  },

  // ── Summary ────────────────────────────────────────────

  async generateSummary(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    if (!cvId) throw ApiError.badRequest("cvId is required");

    const summary = await aiService.generateSummary(currentUserId(req), cvId, getLocale(req));
    sendSuccess(res, { summary });
  },

  async generateSummaryStream(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    if (!cvId) throw ApiError.badRequest("cvId is required");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      await aiService.generateSummaryStreaming(currentUserId(req), cvId, (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }, getLocale(req));
      res.write("data: [DONE]\n\n");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    }
    res.end();
  },

  // ── Experience ─────────────────────────────────────────

  async improveExperience(req: Request, res: Response) {
    const { description, jobTitle, company } = improveSchema.parse(req.body);
    const improved = await aiService.improveExperience(description, jobTitle, company, getLocale(req));
    sendSuccess(res, { improved });
  },

  // ── Skills ─────────────────────────────────────────────

  async suggestSkills(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    if (!cvId) throw ApiError.badRequest("cvId is required");

    const skills = await aiService.suggestSkills(currentUserId(req), cvId, getLocale(req));
    sendSuccess(res, { skills });
  },

  // ── ATS ────────────────────────────────────────────────

  async atsCheck(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    if (!cvId) throw ApiError.badRequest("cvId is required");

    const result = await aiService.atsCheck(currentUserId(req), cvId, getLocale(req));
    sendSuccess(res, result);
  },

  // ── Cover Letter ───────────────────────────────────────

  async generateCoverLetter(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    if (!cvId) throw ApiError.badRequest("cvId is required");

    const { jobDescription } = coverLetterSchema.parse(req.body);
    const coverLetter = await aiService.generateCoverLetter(currentUserId(req), cvId, jobDescription, getLocale(req));
    sendSuccess(res, { coverLetter });
  },

  // ── Improve Project ────────────────────────────────────

  async improveProject(req: Request, res: Response) {
    const { name, description, technologies } = improveProjectSchema.parse(req.body);
    const improved = await aiService.improveProject(name, description, technologies, getLocale(req));
    sendSuccess(res, { improved });
  },

  // ── CV Review ──────────────────────────────────────────

  async reviewCV(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    if (!cvId) throw ApiError.badRequest("cvId is required");

    const review = await aiService.reviewCV(currentUserId(req), cvId, getLocale(req));
    sendSuccess(res, review);
  },

  // ── Job Match ──────────────────────────────────────────

  async jobMatch(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    if (!cvId) throw ApiError.badRequest("cvId is required");

    const { jobDescription } = jobMatchSchema.parse(req.body);
    const result = await aiService.jobMatch(currentUserId(req), cvId, jobDescription, getLocale(req));
    sendSuccess(res, result);
  },

  // ── Tailor CV ──────────────────────────────────────────

  async tailorCV(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    if (!cvId) throw ApiError.badRequest("cvId is required");

    const { jobDescription } = tailorSchema.parse(req.body);
    const result = await aiService.tailorCV(currentUserId(req), cvId, jobDescription, getLocale(req));
    sendSuccess(res, result);
  },

  // ── GitHub Profile Summary ─────────────────────────────

  async githubProfileSummary(req: Request, res: Response) {
    const summary = await aiService.githubProfileSummary(currentUserId(req), getLocale(req));
    sendSuccess(res, { summary });
  },
};
