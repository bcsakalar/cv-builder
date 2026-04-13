// ═══════════════════════════════════════════════════════════
// GitHub Controller — Request handling layer
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from "express";
import Redis from "ioredis";
import { env } from "../../config/env";
import { requireAuthUser } from "../../middleware/auth";
import { githubService } from "./github.service";
import { connectGitHubSchema, analyzeRepoSchema, importToCVSchema, bulkImportToCVSchema } from "./github.schema";
import { sendCreated, sendSuccess } from "../../utils/api-response";
import { ApiError } from "../../utils/api-error";
import { progressChannel } from "../../workers/github-analysis.worker";
import { logger } from "../../lib/logger";

function currentUserId(req: Request): string {
  return requireAuthUser(req).userId;
}

export const githubController = {
  async connect(req: Request, res: Response) {
    const { token } = connectGitHubSchema.parse(req.body);
    const result = await githubService.connect(currentUserId(req), token);
    sendSuccess(res, result);
  },

  async disconnect(req: Request, res: Response) {
    await githubService.disconnect(currentUserId(req));
    sendSuccess(res, { disconnected: true });
  },

  async status(req: Request, res: Response) {
    const result = await githubService.getConnectionStatus(currentUserId(req));
    sendSuccess(res, result);
  },

  async repos(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const perPage = Number(req.query.perPage) || 30;
    const repos = await githubService.getRepos(currentUserId(req), page, perPage);
    sendSuccess(res, repos);
  },

  async repoDetails(req: Request, res: Response) {
    const owner = req.params.owner as string;
    const repo = req.params.repo as string;
    if (!owner || !repo) throw ApiError.badRequest("owner and repo are required");

    const details = await githubService.getRepoDetails(currentUserId(req), `${owner}/${repo}`);
    sendSuccess(res, details);
  },

  async analyze(req: Request, res: Response) {
    const { repoFullName } = analyzeRepoSchema.parse(req.body);
    const header = req.headers["accept-language"];
    const locale = typeof header === "string" ? header.split(",")[0]?.split("-")[0]?.trim() : "en";
    const analysis = await githubService.createAnalysis(currentUserId(req), repoFullName, locale);
    sendCreated(res, analysis);
  },

  async getAnalyses(req: Request, res: Response) {
    const analyses = await githubService.getAnalyses(currentUserId(req));
    sendSuccess(res, analyses);
  },

  async getAnalysis(req: Request, res: Response) {
    const id = req.params.id as string;
    if (!id) throw ApiError.badRequest("id is required");

    const analysis = await githubService.getAnalysis(currentUserId(req), id);
    sendSuccess(res, analysis);
  },

  async importToCV(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    if (!cvId) throw ApiError.badRequest("cvId is required");
    const { analysisId } = importToCVSchema.parse(req.body);
    const project = await githubService.importToCV(currentUserId(req), cvId, analysisId);
    sendCreated(res, project);
  },

  async bulkImportToCV(req: Request, res: Response) {
    const cvId = req.params.cvId as string;
    if (!cvId) throw ApiError.badRequest("cvId is required");
    const { analysisIds } = bulkImportToCVSchema.parse(req.body);
    const projects = await githubService.bulkImportToCV(currentUserId(req), cvId, analysisIds);
    sendCreated(res, projects);
  },

  /**
   * SSE endpoint — streams real-time progress events for a GitHub analysis.
   * Uses Redis Pub/Sub to receive events from the BullMQ worker.
   */
  async streamAnalysis(req: Request, res: Response) {
    const id = req.params.id as string;
    if (!id) throw ApiError.badRequest("id is required");

    // Verify analysis exists
    const analysis = await githubService.getAnalysis(currentUserId(req), id);

    // If already done, send final state and close
    if (analysis.status === "COMPLETED") {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      res.write(`data: ${JSON.stringify({ stage: "completed", progress: 100, message: "Analysis complete!" })}\n\n`);
      res.end();
      return;
    }
    if (analysis.status === "FAILED") {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      res.write(
        `data: ${JSON.stringify({ stage: "failed", progress: 0, message: analysis.error ?? "Analysis failed" })}\n\n`
      );
      res.end();
      return;
    }

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Create a dedicated Redis subscriber (can't reuse the main client)
    const subscriber = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    await subscriber.connect();

    const channel = progressChannel(id);

    const onMessage = (_ch: string, message: string) => {
      res.write(`data: ${message}\n\n`);

      // Auto-close on terminal states
      try {
        const parsed = JSON.parse(message);
        if (parsed.stage === "completed" || parsed.stage === "failed") {
          cleanup();
        }
      } catch {
        // ignore parse errors
      }
    };

    await subscriber.subscribe(channel);
    subscriber.on("message", onMessage);

    // Safety timeout — close after 5 minutes if analysis hangs
    const timeout = setTimeout(() => {
      res.write(
        `data: ${JSON.stringify({ stage: "failed", progress: 0, message: "Analysis timed out" })}\n\n`
      );
      cleanup();
    }, 5 * 60 * 1000);

    let cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timeout);
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.disconnect();
      res.end();
    }

    // Clean up on client disconnect
    req.on("close", cleanup);
    req.on("error", cleanup);

    // Send initial state
    res.write(
      `data: ${JSON.stringify({
        stage: analysis.status === "PROCESSING" ? "starting" : "starting",
        progress: analysis.status === "PROCESSING" ? 5 : 0,
        message: "Connecting to analysis stream...",
      })}\n\n`
    );

    logger.info("SSE stream opened for analysis", { analysisId: id });
  },
};
