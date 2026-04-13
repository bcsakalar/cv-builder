// ═══════════════════════════════════════════════════════════
// AI API Service
// ═══════════════════════════════════════════════════════════

import { api } from "@/lib/api";
import { createAuthenticatedEventSource } from "@/lib/authenticated-event-source";
import { API_BASE_URL } from "@/lib/constants";

export interface ATSResult {
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface CVReviewResult {
  overallScore: number;
  sections: { name: string; score: number; feedback: string }[];
  strengths: string[];
  improvements: string[];
  summary: string;
}

export interface JobMatchResult {
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  keywordGaps: string[];
  suggestions: string[];
  summary: string;
}

export interface TailorResult {
  suggestedSummary: string;
  skillsToAdd: string[];
  skillsToHighlight: string[];
  experienceTips: { company: string; suggestion: string }[];
  overallStrategy: string;
}

export interface AIHealthResult {
  ollama: string;
  model: string;
  modelAvailable: boolean;
  availableModels: string[];
}

export const aiApi = {
  async health(): Promise<AIHealthResult> {
    const res = await api.get("/ai/health");
    return res.data.data;
  },

  async generateSummary(cvId: string): Promise<string> {
    const res = await api.post(`/ai/summary/${cvId}`);
    return res.data.data.summary;
  },

  async improveExperience(description: string, jobTitle: string, company: string): Promise<string> {
    const res = await api.post("/ai/improve-experience", { description, jobTitle, company });
    return res.data.data.improved;
  },

  async improveProject(name: string, description: string, technologies: string[]): Promise<string> {
    const res = await api.post("/ai/improve-project", { name, description, technologies });
    return res.data.data.improved;
  },

  async suggestSkills(cvId: string): Promise<string[]> {
    const res = await api.post(`/ai/suggest-skills/${cvId}`);
    return res.data.data.skills;
  },

  async atsCheck(cvId: string): Promise<ATSResult> {
    const res = await api.post(`/ai/ats-check/${cvId}`);
    return res.data.data;
  },

  async generateCoverLetter(cvId: string, jobDescription?: string): Promise<string> {
    const res = await api.post(`/ai/cover-letter/${cvId}`, { jobDescription });
    return res.data.data.coverLetter;
  },

  async reviewCV(cvId: string): Promise<CVReviewResult> {
    const res = await api.post(`/ai/review/${cvId}`);
    return res.data.data;
  },

  async jobMatch(cvId: string, jobDescription: string): Promise<JobMatchResult> {
    const res = await api.post(`/ai/job-match/${cvId}`, { jobDescription });
    return res.data.data;
  },

  async tailorCV(cvId: string, jobDescription: string): Promise<TailorResult> {
    const res = await api.post(`/ai/tailor/${cvId}`, { jobDescription });
    return res.data.data;
  },

  async githubProfileSummary(): Promise<string> {
    const res = await api.post("/ai/github-summary");
    return res.data.data.summary;
  },

  /**
   * SSE-based summary streaming. Returns an EventSource.
   * Caller should listen for "message" events and close when done.
   */
  createSummaryStream(cvId: string): EventSource {
    return createAuthenticatedEventSource(`${API_BASE_URL}/ai/summary/${cvId}/stream`);
  },
};
