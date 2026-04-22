// ═══════════════════════════════════════════════════════════
// AI Controller — request handling layer
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from "express";
import { requireAuthUser } from "../../middleware/auth";
import { sendSuccess } from "../../utils/api-response";
import { aiService } from "./ai.service";
import { artifactListQuerySchema } from "./ai.schema";

/** Extract locale from Accept-Language header */
function getLocale(req: Request): string {
  const header = req.headers["accept-language"];
  const locale = typeof header === "string" ? header.split(",")[0]?.split("-")[0]?.trim() : undefined;
  return locale ?? "en";
}

function currentUserId(req: Request): string {
  return requireAuthUser(req).userId;
}

export const aiController = {
  async health(_req: Request, res: Response) {
    const health = await aiService.getHealth();
    sendSuccess(res, health);
  },

  async listArtifacts(req: Request, res: Response) {
    const { cvId, tool, limit } = artifactListQuerySchema.parse(req.query);
    const artifacts = await aiService.listArtifacts(currentUserId(req), {
      cvId,
      tool,
      limit,
    });
    sendSuccess(res, artifacts);
  },

  async applyArtifact(req: Request, res: Response) {
    const artifactId = req.params.artifactId as string;
    const result = await aiService.applyArtifact(currentUserId(req), artifactId);
    sendSuccess(res, result);
  },

  async dismissArtifact(req: Request, res: Response) {
    const artifactId = req.params.artifactId as string;
    const artifact = await aiService.dismissArtifact(currentUserId(req), artifactId);
    sendSuccess(res, artifact);
  },

  async generateSummary(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    const summary = await aiService.generateSummary(currentUserId(req), cvId, getLocale(req));
    sendSuccess(res, summary);
  },

  async generateSummaryStream(req: Request, res: Response) {
    const cvId = req.params.cvId as string;

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

  async improveExperience(req: Request, res: Response) {
    const { description, jobTitle, company } = req.body as { description: string; jobTitle: string; company: string };
    const improved = await aiService.improveExperience(currentUserId(req), description, jobTitle, company, getLocale(req));
    sendSuccess(res, improved);
  },

  async suggestSkills(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    const skills = await aiService.suggestSkills(currentUserId(req), cvId, getLocale(req));
    sendSuccess(res, skills);
  },

  async atsCheck(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    const { jobDescription } = req.body as { jobDescription?: string };
    const result = await aiService.atsCheck(currentUserId(req), cvId, { locale: getLocale(req), jobDescription });
    sendSuccess(res, result);
  },

  async generateCoverLetter(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    const { jobDescription } = req.body as { jobDescription?: string };
    const coverLetter = await aiService.generateCoverLetter(currentUserId(req), cvId, jobDescription, getLocale(req));
    sendSuccess(res, coverLetter);
  },

  async improveProject(req: Request, res: Response) {
    const { name, description, technologies } = req.body as { name: string; description: string; technologies: string[] };
    const improved = await aiService.improveProject(currentUserId(req), name, description, technologies, getLocale(req));
    sendSuccess(res, improved);
  },

  async reviewCV(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    const review = await aiService.reviewCV(currentUserId(req), cvId, getLocale(req));
    sendSuccess(res, review);
  },

  async jobMatch(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    const { jobDescription } = req.body as { jobDescription: string };
    const result = await aiService.jobMatch(currentUserId(req), cvId, jobDescription, getLocale(req));
    sendSuccess(res, result);
  },

  async tailorCV(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    const { jobDescription } = req.body as { jobDescription: string };
    const result = await aiService.tailorCV(currentUserId(req), cvId, jobDescription, getLocale(req));
    sendSuccess(res, result);
  },

  async githubProfileSummary(req: Request, res: Response) {
    const summary = await aiService.githubProfileSummary(currentUserId(req), getLocale(req));
    sendSuccess(res, summary);
  },
};
