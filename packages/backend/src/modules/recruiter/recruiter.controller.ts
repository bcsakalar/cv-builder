import type { Request, Response } from "express";
import { requireAuthUser } from "../../middleware/auth";
import { sendCreated, sendSuccess } from "../../utils/api-response";
import { recruiterService } from "./recruiter.service";

function param(req: Request, key: string): string {
  return req.params[key] as string;
}

function currentUserId(req: Request): string {
  return requireAuthUser(req).userId;
}

function uploadedFiles(req: Request): Express.Multer.File[] {
  return Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
}

export const recruiterController = {
  async createJob(req: Request, res: Response) {
    const job = await recruiterService.createJob(currentUserId(req), req.body);
    sendCreated(res, job, "Recruiter job created successfully");
  },

  async listJobs(req: Request, res: Response) {
    const jobs = await recruiterService.listJobs(currentUserId(req));
    sendSuccess(res, jobs, "Recruiter jobs retrieved successfully");
  },

  async getJob(req: Request, res: Response) {
    const job = await recruiterService.getJob(currentUserId(req), param(req, "jobId"));
    sendSuccess(res, job, "Recruiter job retrieved successfully");
  },

  async createBatch(req: Request, res: Response) {
    const batch = await recruiterService.createBatch(currentUserId(req), param(req, "jobId"), uploadedFiles(req));
    sendCreated(res, batch, "Candidate batch uploaded successfully");
  },

  async getBatch(req: Request, res: Response) {
    const batch = await recruiterService.getBatch(currentUserId(req), param(req, "batchId"));
    sendSuccess(res, batch, "Candidate batch retrieved successfully");
  },

  async listCandidates(req: Request, res: Response) {
    const result = await recruiterService.listCandidates(currentUserId(req), param(req, "jobId"), req.query as never);
    sendSuccess(res, result, "Candidates retrieved successfully");
  },

  async exportCandidatesCsv(req: Request, res: Response) {
    const jobId = param(req, "jobId");
    const csv = await recruiterService.exportCandidatesCsv(currentUserId(req), jobId);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="candidates-${jobId}.csv"`);
    res.status(200).send(csv);
  },

  async getCandidate(req: Request, res: Response) {
    const candidate = await recruiterService.getCandidate(currentUserId(req), param(req, "candidateId"));
    sendSuccess(res, candidate, "Candidate retrieved successfully");
  },

  async reEvaluateCandidate(req: Request, res: Response) {
    const candidate = await recruiterService.reEvaluateCandidate(currentUserId(req), param(req, "candidateId"));
    sendSuccess(res, candidate, "Candidate re-evaluated successfully");
  },

  async updateCandidateMetadata(req: Request, res: Response) {
    const candidate = await recruiterService.updateCandidateMetadata(
      currentUserId(req),
      param(req, "candidateId"),
      req.body
    );
    sendSuccess(res, candidate, "Candidate metadata updated");
  },

  async compareCandidates(req: Request, res: Response) {
    const candidates = await recruiterService.compareCandidates(currentUserId(req), req.body.candidateIds);
    sendSuccess(res, candidates, "Candidates compared");
  },
};
